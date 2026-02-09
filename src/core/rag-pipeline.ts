import pino from "pino";
import { db } from "../db/client.js";
import { queries } from "../db/schema.js";
import { getCache, queryCacheKey, setCache } from "./cache.js";
import { assembleContext } from "./context-assembler.js";
import { createConversation, getConversationHistory } from "./conversation.js";
import { FALLBACK_LLM_DOWN, FALLBACK_RETRIEVAL_DOWN } from "./fallbacks.js";
import { getLLMProvider } from "./llm/llm-factory.js";
import { buildConversationMessages, buildUserPrompt, SYSTEM_PROMPT_SWEDISH_TAX } from "./prompts.js";
import { rerankChunks } from "./reranker.js";
import { retrieveChunks } from "./retriever.js";
import type { AssembledContext, RAGOptions, RAGResponse, RAGTimings, RankedChunk, RetrievedChunk, SourceCitation } from "./types.js";

const logger = pino({ name: "rag-pipeline" });

function buildEmptyResponse(answer: string, conversationId?: string): RAGResponse {
	return {
		answer,
		citations: [],
		retrievedChunks: [],
		rankedChunks: [],
		context: { chunks: [], contextText: "", totalTokens: 0, droppedCount: 0 },
		timings: { retrievalMs: 0, rerankMs: 0, assemblyMs: 0, generationMs: 0, totalMs: 0 },
		conversationId,
	};
}

export async function executeRAGQuery(
	question: string,
	options?: RAGOptions,
): Promise<RAGResponse> {
	// Check cache (skip for conversations — answers depend on history)
	if (!options?.conversationId) {
		const cacheKey = queryCacheKey(question, {
			topK: options?.topK,
			filters: options?.filters as Record<string, unknown> | undefined,
		});
		const cached = await getCache<RAGResponse>(cacheKey);
		if (cached) {
			logger.info({ question: question.slice(0, 80) }, "Cache hit");
			return { ...cached, cached: true };
		}
	}

	const timings: RAGTimings = {
		retrievalMs: 0,
		rerankMs: 0,
		assemblyMs: 0,
		generationMs: 0,
		totalMs: 0,
	};
	const totalStart = performance.now();

	// Resolve conversation
	let conversationId = options?.conversationId;
	if (!conversationId) {
		try {
			conversationId = await createConversation(options?.userId);
		} catch (err) {
			logger.error({ err }, "Failed to create conversation");
		}
	}

	// 1. Retrieve chunks
	let retrievedChunks: RetrievedChunk[];
	try {
		const retrievalStart = performance.now();
		retrievedChunks = await retrieveChunks(question, {
			topK: options?.topK,
			filters: options?.filters,
		});
		timings.retrievalMs = Math.round(performance.now() - retrievalStart);
	} catch (err) {
		logger.error({ err }, "Retrieval failed — returning fallback");
		timings.totalMs = Math.round(performance.now() - totalStart);
		return buildEmptyResponse(FALLBACK_RETRIEVAL_DOWN, conversationId);
	}

	// 2. Rerank (graceful degradation: skip reranking on failure)
	let rankedChunks: RankedChunk[];
	try {
		const rerankStart = performance.now();
		rankedChunks = await rerankChunks(
			question,
			retrievedChunks,
			options?.rerankerTopN,
		);
		timings.rerankMs = Math.round(performance.now() - rerankStart);
	} catch (err) {
		logger.warn({ err }, "Reranker failed — using vector scores");
		rankedChunks = retrievedChunks.map((c) => ({ ...c, rerankScore: c.score }));
	}

	// 3. Assemble context
	let context: AssembledContext;
	try {
		const assemblyStart = performance.now();
		context = assembleContext(rankedChunks, options?.tokenBudget);
		timings.assemblyMs = Math.round(performance.now() - assemblyStart);
	} catch (err) {
		logger.error({ err }, "Context assembly failed");
		context = { chunks: [], contextText: "", totalTokens: 0, droppedCount: 0 };
	}

	// 5. Build citations (before LLM so we can return them even on LLM failure)
	// Deduplicate by documentId — keep the chunk with the highest rerank score per document
	const citationsByDoc = new Map<string, SourceCitation>();
	for (const chunk of context.chunks) {
		const existing = citationsByDoc.get(chunk.documentId);
		if (!existing || chunk.rerankScore > existing.relevanceScore) {
			citationsByDoc.set(chunk.documentId, {
				chunkId: chunk.id,
				documentId: chunk.documentId,
				title: (chunk.metadata.title as string) ?? "Utan titel",
				sourceUrl: (chunk.metadata.sourceUrl as string) ?? null,
				section: (chunk.metadata.section as string) ?? null,
				relevanceScore: chunk.rerankScore,
			});
		}
	}
	const citations: SourceCitation[] = [...citationsByDoc.values()];

	// 4. Generate answer
	let answerContent: string;
	let usage: Record<string, number> | undefined;
	let llmName = "unknown";
	let llmModel = "unknown";
	try {
		const generationStart = performance.now();
		const llm = getLLMProvider();
		llmName = llm.name;
		llmModel = llm.model;
		const contextText =
			context.contextText || "Inga relevanta källor hittades i databasen.";

		// Build messages with conversation history
		const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
			{ role: "system", content: SYSTEM_PROMPT_SWEDISH_TAX },
		];

		if (options?.conversationId) {
			try {
				const history = await getConversationHistory(options.conversationId);
				messages.push(...buildConversationMessages(history));
			} catch (err) {
				logger.warn({ err }, "Failed to fetch conversation history");
			}
		}

		messages.push({ role: "user", content: buildUserPrompt(question, contextText) });

		const result = await llm.complete({
			messages,
			temperature: options?.temperature,
		});
		answerContent = result.content;
		usage = result.usage as unknown as Record<string, number>;
		timings.generationMs = Math.round(performance.now() - generationStart);
	} catch (err) {
		logger.error({ err }, "LLM generation failed — returning fallback with citations");
		answerContent = FALLBACK_LLM_DOWN;
		timings.generationMs = 0;
	}

	timings.totalMs = Math.round(performance.now() - totalStart);

	logger.info(
		{
			question: question.slice(0, 80),
			conversationId,
			retrieved: retrievedChunks.length,
			reranked: rankedChunks.length,
			contextChunks: context.chunks.length,
			provider: llmName,
			model: llmModel,
			timings,
		},
		"RAG query completed",
	);

	// 6. Log query to PostgreSQL
	let queryId: string | undefined;
	try {
		const [inserted] = await db
			.insert(queries)
			.values({
				question,
				answer: answerContent,
				conversationId,
				userId: options?.userId,
				sourceChunkIds: context.chunks.map((c) => c.id),
				metadata: {
					provider: llmName,
					model: llmModel,
					timings,
					usage,
				},
			})
			.returning({ id: queries.id });
		queryId = inserted?.id;
	} catch (err) {
		logger.error({ err }, "Failed to log query");
	}

	const response: RAGResponse = {
		answer: answerContent,
		citations,
		retrievedChunks,
		rankedChunks,
		context,
		timings,
		conversationId,
		queryId,
	};

	// Cache the result (only for non-conversation queries, skip on fallback answers)
	if (!options?.conversationId && answerContent !== FALLBACK_LLM_DOWN) {
		const cacheKey = queryCacheKey(question, {
			topK: options?.topK,
			filters: options?.filters as Record<string, unknown> | undefined,
		});
		setCache(cacheKey, response).catch((err) =>
			logger.warn({ err }, "Failed to cache response"),
		);
	}

	return response;
}

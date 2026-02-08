import pino from "pino";
import { db } from "../db/client.js";
import { queries } from "../db/schema.js";
import { getCache, queryCacheKey, setCache } from "./cache.js";
import { assembleContext } from "./context-assembler.js";
import { createConversation, getConversationHistory } from "./conversation.js";
import { getLLMProvider } from "./llm/llm-factory.js";
import { buildConversationMessages, buildUserPrompt, SYSTEM_PROMPT_SWEDISH_TAX } from "./prompts.js";
import { rerankChunks } from "./reranker.js";
import { retrieveChunks } from "./retriever.js";
import type { RAGOptions, RAGResponse, RAGTimings, SourceCitation } from "./types.js";

const logger = pino({ name: "rag-pipeline" });

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
		conversationId = await createConversation(options?.userId);
	}

	// 1. Retrieve chunks
	const retrievalStart = performance.now();
	const retrievedChunks = await retrieveChunks(question, {
		topK: options?.topK,
		filters: options?.filters,
	});
	timings.retrievalMs = Math.round(performance.now() - retrievalStart);

	// 2. Rerank
	const rerankStart = performance.now();
	const rankedChunks = await rerankChunks(
		question,
		retrievedChunks,
		options?.rerankerTopN,
	);
	timings.rerankMs = Math.round(performance.now() - rerankStart);

	// 3. Assemble context
	const assemblyStart = performance.now();
	const context = assembleContext(rankedChunks, options?.tokenBudget);
	timings.assemblyMs = Math.round(performance.now() - assemblyStart);

	// 4. Generate answer
	const generationStart = performance.now();
	const llm = getLLMProvider();
	const contextText =
		context.contextText || "Inga relevanta källor hittades i databasen.";

	// Build messages with conversation history
	const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
		{ role: "system", content: SYSTEM_PROMPT_SWEDISH_TAX },
	];

	if (options?.conversationId) {
		const history = await getConversationHistory(options.conversationId);
		messages.push(...buildConversationMessages(history));
	}

	messages.push({ role: "user", content: buildUserPrompt(question, contextText) });

	const result = await llm.complete({
		messages,
		temperature: options?.temperature,
	});
	timings.generationMs = Math.round(performance.now() - generationStart);

	// 5. Build citations
	const citations: SourceCitation[] = context.chunks.map((chunk) => ({
		chunkId: chunk.id,
		documentId: chunk.documentId,
		title: (chunk.metadata.title as string) ?? "Utan titel",
		sourceUrl: (chunk.metadata.sourceUrl as string) ?? null,
		section: (chunk.metadata.section as string) ?? null,
		relevanceScore: chunk.rerankScore,
	}));

	timings.totalMs = Math.round(performance.now() - totalStart);

	logger.info(
		{
			question: question.slice(0, 80),
			conversationId,
			retrieved: retrievedChunks.length,
			reranked: rankedChunks.length,
			contextChunks: context.chunks.length,
			provider: llm.name,
			model: llm.model,
			timings,
		},
		"RAG query completed",
	);

	// 6. Log query to PostgreSQL (fire-and-forget)
	db.insert(queries)
		.values({
			question,
			answer: result.content,
			conversationId,
			userId: options?.userId,
			sourceChunkIds: context.chunks.map((c) => c.id),
			metadata: {
				provider: llm.name,
				model: llm.model,
				timings,
				usage: result.usage,
			},
		})
		.catch((err) => logger.error({ err }, "Failed to log query"));

	const response: RAGResponse = {
		answer: result.content,
		citations,
		retrievedChunks,
		rankedChunks,
		context,
		timings,
		conversationId,
	};

	// Cache the result (only for non-conversation queries)
	if (!options?.conversationId) {
		const cacheKey = queryCacheKey(question, {
			topK: options?.topK,
			filters: options?.filters as Record<string, unknown> | undefined,
		});
		await setCache(cacheKey, response);
	}

	return response;
}

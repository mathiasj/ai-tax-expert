import { integer, jsonb, numeric, pgEnum, pgTable, text, timestamp, uuid, varchar, uniqueIndex } from "drizzle-orm/pg-core";

export const documentSourceEnum = pgEnum("document_source", [
	"skatteverket",
	"lagrummet",
	"riksdagen",
	"manual",
]);

export const docTypeEnum = pgEnum("doc_type", [
	"stallningstagande",
	"handledning",
	"proposition",
	"sou",
	"rattsfallsnotis",
	"rattsfallsreferat",
	"ovrigt",
]);

export const audienceEnum = pgEnum("audience", [
	"allman",
	"foretag",
	"specialist",
]);

export const refreshPolicyEnum = pgEnum("refresh_policy", [
	"once",
	"weekly",
	"monthly",
	"quarterly",
]);

export const sourceStatusEnum = pgEnum("source_status", [
	"active",
	"paused",
	"failed",
]);

export const documentStatusEnum = pgEnum("document_status", [
	"pending",
	"downloading",
	"parsing",
	"chunking",
	"embedding",
	"indexed",
	"failed",
]);

export const documents = pgTable("documents", {
	id: uuid("id").primaryKey().defaultRandom(),
	title: varchar("title", { length: 500 }).notNull(),
	source: documentSourceEnum("source").notNull(),
	sourceUrl: text("source_url"),
	filePath: text("file_path"),
	status: documentStatusEnum("status").notNull().default("pending"),
	metadata: jsonb("metadata").$type<Record<string, unknown>>(),
	errorMessage: text("error_message"),
	docType: docTypeEnum("doc_type"),
	audience: audienceEnum("audience"),
	taxArea: varchar("tax_area", { length: 100 }),
	refreshPolicy: refreshPolicyEnum("refresh_policy").notNull().default("once"),
	contentHash: varchar("content_hash", { length: 64 }),
	lastCheckedAt: timestamp("last_checked_at"),
	supersededById: uuid("superseded_by_id"),
	supersededAt: timestamp("superseded_at"),
	supersededNote: text("superseded_note"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const chunks = pgTable("chunks", {
	id: uuid("id").primaryKey().defaultRandom(),
	documentId: uuid("document_id")
		.notNull()
		.references(() => documents.id, { onDelete: "cascade" }),
	content: text("content").notNull(),
	chunkIndex: integer("chunk_index").notNull(),
	qdrantPointId: uuid("qdrant_point_id"),
	metadata: jsonb("metadata").$type<Record<string, unknown>>(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
	id: uuid("id").primaryKey().defaultRandom(),
	email: varchar("email", { length: 255 }).unique(),
	name: varchar("name", { length: 255 }),
	passwordHash: text("password_hash"),
	role: varchar("role", { length: 50 }).notNull().default("user"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const conversations = pgTable("conversations", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: uuid("user_id").references(() => users.id),
	title: varchar("title", { length: 500 }),
	metadata: jsonb("metadata").$type<Record<string, unknown>>(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const queries = pgTable("queries", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: uuid("user_id").references(() => users.id),
	conversationId: uuid("conversation_id").references(() => conversations.id),
	question: text("question").notNull(),
	answer: text("answer"),
	sourceChunkIds: uuid("source_chunk_ids").array(),
	metadata: jsonb("metadata").$type<Record<string, unknown>>(),
	feedbackRating: integer("feedback_rating"),
	feedbackComment: text("feedback_comment"),
	feedbackAt: timestamp("feedback_at"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sources = pgTable("sources", {
	id: uuid("id").primaryKey().defaultRandom(),
	url: text("url").notNull().unique(),
	source: documentSourceEnum("source").notNull(),
	label: varchar("label", { length: 255 }),
	status: sourceStatusEnum("status").notNull().default("active"),
	lastScrapedAt: timestamp("last_scraped_at"),
	lastError: text("last_error"),
	metadata: jsonb("metadata").$type<Record<string, unknown>>(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const evaluationRuns = pgTable("evaluation_runs", {
	id: uuid("id").primaryKey().defaultRandom(),
	totalQuestions: integer("total_questions").notNull(),
	avgRelevance: numeric("avg_relevance", { precision: 5, scale: 4 }).notNull(),
	avgFaithfulness: numeric("avg_faithfulness", { precision: 5, scale: 4 }).notNull(),
	avgCitationAccuracy: numeric("avg_citation_accuracy", { precision: 5, scale: 4 }).notNull(),
	avgKeywordCoverage: numeric("avg_keyword_coverage", { precision: 5, scale: 4 }).notNull(),
	avgRetrievalMs: numeric("avg_retrieval_ms", { precision: 10, scale: 2 }).notNull(),
	avgTotalMs: numeric("avg_total_ms", { precision: 10, scale: 2 }).notNull(),
	byCategory: jsonb("by_category").$type<Record<string, unknown>>().notNull(),
	byDifficulty: jsonb("by_difficulty").$type<Record<string, unknown>>().notNull(),
	results: jsonb("results").$type<unknown[]>().notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});

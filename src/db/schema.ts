import { integer, jsonb, pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const documentSourceEnum = pgEnum("document_source", [
	"skatteverket",
	"lagrummet",
	"riksdagen",
	"manual",
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
	createdAt: timestamp("created_at").notNull().defaultNow(),
});

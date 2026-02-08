import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../config/env.js";
import * as schema from "./schema.js";

const connection = postgres(env.DATABASE_URL);

export const db = drizzle(connection, { schema });
export type Database = typeof db;

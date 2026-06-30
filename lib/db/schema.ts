import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
  vector,
} from "drizzle-orm/pg-core";
import { authUsers, authenticatedRole } from "drizzle-orm/supabase";

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Owner. Defaults to the signed-in user (auth.uid()); FK to Supabase auth.users.
    userId: uuid("user_id")
      .notNull()
      .default(sql`auth.uid()`)
      .references(() => authUsers.id, { onDelete: "cascade" }),
    filename: text("filename").notNull(),
    filePath: text("file_path").notNull(),
    status: text("status").default("processing"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("documents_user_id_idx").on(table.userId),
    // RLS: a user may only touch their own documents.
    pgPolicy("documents_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`(select auth.uid()) = ${table.userId}`,
    }),
    pgPolicy("documents_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`(select auth.uid()) = ${table.userId}`,
    }),
    pgPolicy("documents_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`(select auth.uid()) = ${table.userId}`,
      withCheck: sql`(select auth.uid()) = ${table.userId}`,
    }),
    pgPolicy("documents_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`(select auth.uid()) = ${table.userId}`,
    }),
  ],
);

export const chunks = pgTable(
  "chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 768 }), // native!
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    // HNSW cosine index, defined right in the schema
    index("chunks_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
    // RLS: ownership flows through the parent document.
    pgPolicy("chunks_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`exists (select 1 from ${documents} d where d.id = ${table.documentId} and d.user_id = (select auth.uid()))`,
    }),
    pgPolicy("chunks_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`exists (select 1 from ${documents} d where d.id = ${table.documentId} and d.user_id = (select auth.uid()))`,
    }),
    pgPolicy("chunks_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`exists (select 1 from ${documents} d where d.id = ${table.documentId} and d.user_id = (select auth.uid()))`,
      withCheck: sql`exists (select 1 from ${documents} d where d.id = ${table.documentId} and d.user_id = (select auth.uid()))`,
    }),
    pgPolicy("chunks_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`exists (select 1 from ${documents} d where d.id = ${table.documentId} and d.user_id = (select auth.uid()))`,
    }),
  ],
);

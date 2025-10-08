import { jsonb, pgTable, text } from "drizzle-orm/pg-core"

export const profile = pgTable("profile", {
    id: text("id").primaryKey(),
    metadata: jsonb("metadata")
})
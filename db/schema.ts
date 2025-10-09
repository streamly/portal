import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core"

export const profiles = pgTable("profiles", {
    id: text("id").primaryKey(),
    firstname: text("firstname"),
    lastname: text("lastname"),
    position: text("position"),
    company: text("company"),
    industry: text("industry"),
    phone: text("phone"),
    email: text("email"),
    url: text("url"),
    about: text("about"),
    avatar: text("avatar"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
})

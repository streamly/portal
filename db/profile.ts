import { eq } from "drizzle-orm"
import { db } from "./connection.js"
import { profile } from "./schema.js"

export async function upsertProfile(userId: string, metadata: object) {
    const existing = await db.select().from(profile).where(eq(profile.id, userId))

    if (existing.length > 0) {
        await db.update(profile).set({ metadata }).where(eq(profile.id, userId))
    } else {
        await db.insert(profile).values({ id: userId, metadata })
    }
}

export async function getProfile(userId: string) {
    const result = await db.select().from(profile).where(eq(profile.id, userId))
    return result.length > 0 ? result[0] : null
}
import { eq } from "drizzle-orm"
import { db } from "./connection.js"
import { profiles } from "./schema.js"

export interface ProfileMetadata {
    firstname?: string
    lastname?: string
    position?: string
    company?: string
    industry?: string
    phone?: string
    email?: string
    url?: string
    about?: string
    avatar?: string
    createdAt?: string
    updatedAt?: string
    [key: string]: any
}

function normalizeValue(value: string | null | undefined) {
    return value ?? undefined
}

export async function upsertProfile(userId: string, metadata: ProfileMetadata) {
    const now = new Date()
    const existing = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, userId))

    const values = {
        firstname: metadata.firstname ?? null,
        lastname: metadata.lastname ?? null,
        position: metadata.position ?? null,
        company: metadata.company ?? null,
        industry: metadata.industry ?? null,
        phone: metadata.phone ?? null,
        email: metadata.email ?? null,
        url: metadata.url ?? null,
        about: metadata.about ?? null,
        avatar: metadata.avatar ?? null,
        metadata,
        updatedAt: now,
    }

    if (existing.length > 0) {
        await db.update(profiles).set(values).where(eq(profiles.id, userId))
    } else {
        await db.insert(profiles).values({
            id: userId,
            createdAt: metadata.createdAt ? new Date(metadata.createdAt) : now,
            ...values,
        })
    }
}

export async function getProfile(userId: string): Promise<ProfileMetadata | null> {
    const result = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1)
    if (result.length === 0) return null

    const profile = result[0]
    const timestamps: ProfileMetadata = {
        createdAt: profile.createdAt ? new Date(profile.createdAt).toISOString() : undefined,
        updatedAt: profile.updatedAt ? new Date(profile.updatedAt).toISOString() : undefined,
    }

    const base: ProfileMetadata = {
        firstname: normalizeValue(profile.firstname),
        lastname: normalizeValue(profile.lastname),
        position: normalizeValue(profile.position),
        company: normalizeValue(profile.company),
        industry: normalizeValue(profile.industry),
        phone: normalizeValue(profile.phone),
        email: normalizeValue(profile.email),
        url: normalizeValue(profile.url),
        about: normalizeValue(profile.about),
        avatar: normalizeValue(profile.avatar),
    }

    return {
        ...base,
        ...(profile.metadata as ProfileMetadata | null | undefined ?? {}),
        ...timestamps,
    }
}

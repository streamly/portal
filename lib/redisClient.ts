import { createClient } from "redis"
import type { z } from "zod"
import { UserMetadataSchema } from "./schemas.js"

type UserMetadata = z.infer<typeof UserMetadataSchema>

const REDIS_URL = process.env.REDIS_URL!
const redis = createClient({ url: REDIS_URL })
let isConnected = false

async function connectClient() {
    if (!isConnected) {
        await redis.connect()
        isConnected = true
    }
}

export interface PortalCacheData {
    id: string
    branded: boolean
    name: string
    description: string
    filter: string
    sort: string
    createdAt: string
    updatedAt: string
}

export async function getPortalData(domain: string) {
    await connectClient()
    const dataStr = await redis.hGet("portals", domain)
    if (!dataStr) return null

    try {
        return JSON.parse(dataStr) as PortalCacheData
    } catch (err) {
        console.error(`Failed to parse portal data for domain=${domain}:`, err)
        return null
    }
}

export async function setProfileData(userId: string, metadata: UserMetadata) {
    await connectClient()
    const existing = await getProfileData(userId)
    const now = new Date().toISOString()

    const payload = {
        ...(existing || {}),
        ...metadata,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
    }

    console.log('User profile data cache', payload)

    await redis.set(`profile:${userId}`, JSON.stringify(payload))
    return payload
}

export async function getProfileData(userId: string) {
    await connectClient()
    const dataStr = await redis.get(`profile:${userId}`)
    if (!dataStr) return null

    try {
        return JSON.parse(dataStr)
    } catch (err) {
        console.error(`Failed to parse profile data for userId=${userId}:`, err)
        return null
    }
}
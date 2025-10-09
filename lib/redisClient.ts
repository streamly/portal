import { createClient } from 'redis'

const REDIS_URL = process.env.REDIS_URL!
const redis = createClient({ url: REDIS_URL })
let isConnected = false

async function connectClient() {
    if (!isConnected) {
        await redis.connect()
        isConnected = true
    }
}

export async function getPortalData(domain: string) {
    await connectClient()

    const dataStr = await redis.hGet("portals", domain)
    if (!dataStr) return null

    try {
        return JSON.parse(dataStr) as ProfileCacheData
    } catch (err) {
        console.error(`Failed to parse portal data for domain=${domain}:`, err)
        return null
    }
}

export interface ProfileCacheData {
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

export async function setProfileData(userId: string, metadata: Record<string, any>): Promise<ProfileCacheData> {
    await connectClient()
    const existing = await getProfileData(userId)
    const now = new Date().toISOString()
    const payload: ProfileCacheData = {
        ...(existing || {}),
        ...metadata,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
    }
    await redis.set(`profile:${userId}`, JSON.stringify(payload))
    return payload
}

export async function getProfileData(userId: string): Promise<ProfileCacheData | null> {
    await connectClient()
    const dataStr = await redis.get(`profile:${userId}`)
    if (!dataStr) {
        return null
    }
    try {
        return JSON.parse(dataStr)
    } catch (err) {
        console.error(`Failed to parse profile data for userId=${userId}:`, err)
        return null
    }
}

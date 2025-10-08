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
        return JSON.parse(dataStr)
    } catch (err) {
        console.error(`Failed to parse portal data for domain=${domain}:`, err)
        return null
    }
}

export async function setProfileData(userId: string, metadata: object) {
    await connectClient()
    await redis.set(`profile:${userId}`, JSON.stringify(metadata))
}

export async function getProfileData(userId: string) {
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
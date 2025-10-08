import { VercelRequest, VercelResponse } from '@vercel/node'
import { upsertProfile } from "../db/profile.js"
import { updateUserMetadata } from "../lib/authgearClient.js"
import { setProfileData } from "../lib/redisClient.js"

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" })
    }

    try {
        const { userId, metadata } = req.body
        if (!userId || !metadata) {
            return res.status(400).json({ error: "Missing userId or metadata" })
        }

        await updateUserMetadata(userId, metadata)
        await setProfileData(userId, metadata)
        await upsertProfile(userId, metadata)

        return res.status(200).json({ success: true })
    } catch (err: any) {
        console.error("updateProfile error:", err)
        return res.status(500).json({ error: err?.message || "Internal server error" })
    }
}
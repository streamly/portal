import type { VercelRequest, VercelResponse } from "@vercel/node"
import { updateUserMetadata } from "../lib/authgearAdminClient.js"
import { AuthgearError, verifyAuthgearUser } from "../lib/authgearAuth.js"
import { UserMetadataSchema } from "../lib/schemas.js"
import { setProfileData } from '../lib/redisClient.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" })
    }

    try {
        const decoded = await verifyAuthgearUser(req.headers.authorization)
        const userId = decoded.sub
        if (!userId) {
            return res.status(401).json({ error: "Missing user ID in token" })
        }

        const metadataInput = req.body
        if (!metadataInput || typeof metadataInput !== "object") {
            return res.status(400).json({ error: "Missing metadata" })
        }

        console.log("Metadata", metadataInput)

        const parsed = UserMetadataSchema.safeParse(metadataInput)

        if (!parsed.success) {
            console.warn("Invalid metadata:", parsed.error.flatten().fieldErrors)

            return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() })
        }

        const sanitized = parsed.data

        await updateUserMetadata(userId, sanitized)
        try {
            await setProfileData(userId, sanitized)
        } catch (error) {
            console.error('Failed to update profile data cache', error)
        }


        return res.status(200).json({ success: true })
    } catch (err: any) {
        if (err instanceof AuthgearError) {
            return res.status(401).json({ error: err.code, message: err.message })
        }

        console.error("updateProfile error:", err)
        return res.status(500).json({ error: "Internal server error" })
    }
}
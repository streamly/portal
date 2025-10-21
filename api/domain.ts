import type { VercelRequest, VercelResponse } from "@vercel/node"
import { serialize } from "cookie"
import { getPortalData } from "../lib/redisClient.js"
import { generatePortalScopedKey } from "../lib/typesenseClient.js"
import { formatViewerId } from "../lib/utils.js"

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const startedAt = new Date().toISOString()
    console.log(`Domain handler started at ${startedAt}`)

    try {
        const host = req.headers["x-forwarded-host"] as string | undefined
        console.log("Incoming request headers:", req.headers)
        console.log("Detected host:", host)

        if (!host) {
            console.warn("Forwarded host header is missing")
            return res.status(400).json({ error: "Forwarded host not found" })
        }

        const domain = host.split(":")[0]
        console.log(`Parsed domain: ${domain}`)

        const portalData = await getPortalData(domain)
        if (!portalData) {
            console.warn(`No portal found in Redis for domain: ${domain}`)
            return res.status(404).json({ error: `Portal not found for domain: ${domain}` })
        }

        console.log("Fetched portal data:", portalData)

        // Generate scoped Typesense API key
        const filterField = portalData.filter
        const sortBy = portalData.sort
        const scopedKey = generatePortalScopedKey(filterField, sortBy)

        console.log("Generated scoped Typesense key (truncated):", scopedKey.slice(0, 10) + "...")

        const clientIp =
            (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
            req.socket?.remoteAddress ||
            "unknown"
        console.log("Detected client IP:", clientIp)

        const viewerId = formatViewerId(clientIp)
        console.log("Generated viewerId:", viewerId)

        // Set cookie
        const cookieStr = serialize("apiKey", scopedKey, {
            path: "/",
            sameSite: "lax",
            secure: true,
            maxAge: 3600, // 1 hour
        })
        res.setHeader("Set-Cookie", cookieStr)
        console.log("Set cookie for apiKey")

        // Send response
        console.log("Sending response:", {
            id: portalData.id,
            name: portalData.name,
            description: portalData.description,
            viewerId,
        })

        return res.status(200).json({
            id: portalData.id,
            name: portalData.name,
            description: portalData.description,
            viewerId,
        })
    } catch (err: any) {
        console.error("Domain handler error:", err)
        return res.status(500).json({ error: "Internal Server Error", details: err.message })
    }
}
import type { VercelRequest, VercelResponse } from "@vercel/node"
import { serialize } from "cookie"
import { exchangeCodeForTokens, fetchUserProfile } from "../lib/authgearClient.js"

const NONCE_COOKIE_NAME = "auth_nonce"

interface DecodedState {
    domain: string
    referral: string
}

function decodeState(value: string): DecodedState {
    try {
        const decoded = Buffer.from(value, "base64").toString("utf8")
        const payload = JSON.parse(decoded)
        if (payload && typeof payload === "object" && payload.domain) {
            return {
                domain: String(payload.domain).trim(),
                referral: payload.referral ? String(payload.referral) : "",
            }
        }
    } catch (err) {
        console.warn("Failed to decode OAuth state payload as base64 JSON", err)
    }

    const [rawDomain, ...rest] = value.split(":")
    return {
        domain: rawDomain?.trim() ?? "",
        referral: rest.join(":"),
    }
}

function buildRedirectUrl(domain: string, query: VercelRequest["query"]) {
    const params = new URLSearchParams()
    Object.entries(query).forEach(([key, value]) => {
        if (Array.isArray(value)) value.forEach(v => params.append(key, v))
        else if (value !== undefined) params.append(key, String(value))
    })
    return `https://${domain}/api/profile?${params.toString()}`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        const { code, state } = req.query
        if (!state || typeof state !== "string") return res.status(400).send("Missing state")

        const { domain, referral } = decodeState(state)
        if (!domain) return res.status(400).send("Invalid state domain")

        const normalizedDomain = domain.split(":")[0]?.toLowerCase()
        if (!normalizedDomain) return res.status(400).send("Invalid state domain")

        const referralFromQuery = typeof req.query.referral === "string" ? req.query.referral : ""
        const referralId = referral || referralFromQuery

        const host = req.headers.host || ""
        const AUTHGEAR_HOSTS = ["go.auth.moi", "auth.moi"]

        if (AUTHGEAR_HOSTS.some(h => host.endsWith(h))) {
            const redirectUrl = buildRedirectUrl(normalizedDomain, req.query)
            return res.redirect(302, redirectUrl)
        }

        if (!code || typeof code !== "string") return res.status(400).send("Missing code")

        const tokens = await exchangeCodeForTokens(code)
        const profile = await fetchUserProfile(tokens.accessToken)
        const { sub: userId, given_name, family_name, email } = profile

        const baseCookieOptions = {
            path: "/",
            httpOnly: false,
            sameSite: "lax" as const,
            secure: true,
            maxAge: 60 * 60 * 24 * 30,
        }

        const cookies = [
            serialize("userId", userId, baseCookieOptions),
            serialize("firstname", given_name || "", baseCookieOptions),
            serialize("lastname", family_name || "", baseCookieOptions),
            serialize("email", email || "", baseCookieOptions),
            serialize("referral", referralId || "", baseCookieOptions),
            serialize("profileComplete", given_name && family_name ? "1" : "0", baseCookieOptions),
            serialize(NONCE_COOKIE_NAME, "", { ...baseCookieOptions, maxAge: 0 }),
        ]

        res.setHeader("Set-Cookie", cookies)

        const redirectTo = typeof req.query.redirect === "string" && req.query.redirect.startsWith("/")
            ? req.query.redirect
            : "/dev"

        return res.redirect(302, redirectTo)
    } catch (error: any) {
        console.error("Authgear /api/profile error:", error)
        return res.status(500).send("Internal Server Error")
    }
}

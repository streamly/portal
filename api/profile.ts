import type { VercelRequest, VercelResponse } from "@vercel/node"
import { serialize } from "cookie"
import { exchangeCodeForTokens, fetchUserByEmail, fetchUserProfile } from "../lib/authgearClient.js"

const NONCE_COOKIE_NAME = "auth_nonce"
const AUTHGEAR_HOSTS = ["go.auth.moi", "auth.moi"]

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

        if (AUTHGEAR_HOSTS.some(h => host.endsWith(h))) {
            const redirectUrl = buildRedirectUrl(normalizedDomain, req.query)
            return res.redirect(302, redirectUrl)
        }

        if (!code || typeof code !== "string") return res.status(400).send("Missing code")

        const tokens = await exchangeCodeForTokens(code)
        const profile = await fetchUserProfile(tokens.accessToken)

        if (!profile.email) {
            console.error('User email is missing')
            return res.status(500).send("Internal Server Error")
        }

        const user = await fetchUserByEmail(profile.email)

        if (!user) {
            console.error('User not found')
            return res.status(500).send("Internal Server Error")
        }

        const { id: userId, standardAttributes, customAttributes } = user

        console.log("Received user profile", profile)
        console.log("Received user", user)

        const firstname = standardAttributes?.given_name || ""
        const lastname = standardAttributes?.family_name || ""
        const email = standardAttributes?.email || ""
        const website = standardAttributes?.website || ""

        const industry = customAttributes?.industry || ""
        const position = customAttributes?.position || ""
        const organization = customAttributes?.organization || ""
        const about = customAttributes?.about || ""

        const referralCookie = referralId || ""
        const profileComplete = firstname && lastname ? "1" : "0"

        const baseCookieOptions = {
            path: "/",
            httpOnly: false,
            sameSite: "lax" as const,
            secure: true,
            maxAge: 60 * 60 * 24 * 30, // 30 days
        }

        const cookies = [
            serialize("userId", userId, baseCookieOptions),
            serialize("firstname", firstname, baseCookieOptions),
            serialize("lastname", lastname, baseCookieOptions),
            serialize("email", email, baseCookieOptions),
            serialize("url", website, baseCookieOptions),
            serialize("industry", industry, baseCookieOptions),
            serialize("position", position, baseCookieOptions),
            serialize("organization", organization, baseCookieOptions),
            serialize("about", about, baseCookieOptions),
            serialize("referral", referralCookie, baseCookieOptions),
            serialize("profileComplete", profileComplete, baseCookieOptions),
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

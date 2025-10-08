import type { VercelRequest, VercelResponse } from "@vercel/node"
import cookie from "cookie"
import { exchangeCodeForTokens, fetchUserProfile } from "../lib/authgearClient.js"

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        const { code, state, referral } = req.query
        if (!code || typeof code !== "string") return res.status(400).send("Missing code")
        if (!state || typeof state !== "string") return res.status(400).send("Missing state")

        const [domain, referralId] = state.split(":")

        if (req.headers.host?.includes("go.auth.moi")) {
            const redirectUrl = `https://${domain}/api/profile?code=${code}&referral=${referralId || ""}`
            return res.redirect(302, redirectUrl)
        }

        const tokens = await exchangeCodeForTokens(code)
        const profile = await fetchUserProfile(tokens.accessToken)
        const { sub: userId, given_name, family_name } = profile

        const cookies = [
            cookie.serialize("userId", userId, { path: "/", httpOnly: false, sameSite: "lax", secure: true }),
            cookie.serialize("firstname", given_name || "", { path: "/", httpOnly: false, sameSite: "lax", secure: true }),
            cookie.serialize("lastname", family_name || "", { path: "/", httpOnly: false, sameSite: "lax", secure: true }),
            cookie.serialize("referral", referralId || (referral as string) || "", { path: "/", httpOnly: false, sameSite: "lax", secure: true }),
        ]

        res.setHeader("Set-Cookie", cookies)
        const redirectTo = given_name && family_name ? "/" : "/?profile=complete"
        return res.redirect(302, redirectTo)
    } catch (error: any) {
        console.error("Authgear /api/profile error:", error)
        return res.status(500).send("Internal Server Error")
    }
}
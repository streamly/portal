import { VercelRequest, VercelResponse } from "@vercel/node"
import { parse, serialize } from "cookie"
import { getProfile, ProfileMetadata } from "../db/profile.js"
import { updateUserMetadata } from "../lib/authgearClient.js"
import { getProfileData } from "../lib/redisClient.js"
import { UserMetadataSchema } from "../lib/validation.js"

const NONCE_COOKIE_NAME = "auth_nonce"
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

// -------------------- Helpers --------------------

function resolveDomain(req: VercelRequest): string {
    const host = (req.headers["x-forwarded-host"] as string) || req.headers.host || ""
    return host.split(":")[0]
}

function mergeProfiles(...profiles: Array<ProfileMetadata | null | undefined>): ProfileMetadata {
    return profiles.filter(Boolean).reduce<ProfileMetadata>((acc, profile) => {
        for (const [key, val] of Object.entries(profile!)) {
            if (val != null && val !== "") acc[key as keyof ProfileMetadata] = val
        }
        return acc
    }, {})
}

function isProfileComplete(meta: ProfileMetadata) {
    return Boolean(meta.firstname && meta.lastname)
}

// -------------------- Main Handler --------------------

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const cookies = parse(req.headers.cookie || "")
    const userId: string = cookies.userId || req.body?.userId

    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" })
    }

    if (req.method !== "GET" && req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" })
    }

    console.log('userId', userId)

    try {
        // -------------------- GET --------------------
        if (req.method === "GET") {
            const [redisProfile, dbProfile] = await Promise.all([
                getProfileData(userId).catch(() => null),
                getProfile(userId).catch(() => null),
            ])

            const cookieProfile: ProfileMetadata = {
                firstname: cookies.firstname,
                lastname: cookies.lastname,
                email: cookies.email,
            }

            const merged = mergeProfiles(cookieProfile, dbProfile, redisProfile)
            return res.status(200).json({ profile: merged })
        }

        // -------------------- POST (update) --------------------
        const metadataInput = req.body?.metadata
        if (!metadataInput || typeof metadataInput !== "object")
            return res.status(400).json({ error: "Missing metadata" })

        console.log('Metadata', metadataInput)

        const parsed = UserMetadataSchema.safeParse(metadataInput)
        if (!parsed.success) {
            console.warn("Invalid metadata:", parsed.error.flatten().fieldErrors)
            return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() })
        }

        const sanitized = parsed.data

        // Update Authgear + cache + DB
        await updateUserMetadata(userId, sanitized)
        // const cacheRecord = await setProfileData(userId, sanitized)
        // await upsertProfile(userId, cacheRecord)

        // -------------------- Set All Cookies --------------------
        const domain = resolveDomain(req)
        const profileComplete = isProfileComplete(sanitized) ? "1" : "0"
        const referralCookie = cookies.referral || ""

        const {
            firstname = "",
            lastname = "",
            email = "",
            url = "",
            industry = "",
            position = "",
            company = "",
            about = "",
        } = sanitized

        const baseOptions = {
            path: "/",
            sameSite: "lax" as const,
            secure: true,
            httpOnly: false,
            maxAge: COOKIE_MAX_AGE,
            domain,
        }

        const cookiePayload = [
            serialize("userId", userId, baseOptions),
            serialize("firstname", firstname, baseOptions),
            serialize("lastname", lastname, baseOptions),
            serialize("email", email, baseOptions),
            serialize("url", url, baseOptions),
            serialize("industry", industry, baseOptions),
            serialize("position", position, baseOptions),
            serialize("organization", company, baseOptions),
            serialize("about", about, baseOptions),
            serialize("referral", referralCookie, baseOptions),
            serialize("profileComplete", profileComplete, baseOptions),
            serialize(NONCE_COOKIE_NAME, "", { ...baseOptions, maxAge: 0 }),
        ]

        res.setHeader("Set-Cookie", cookiePayload)
        return res.status(200).json({ success: true })
    } catch (err: any) {
        console.error("updateProfile error:", err)
        return res.status(500).json({ error: "Internal server error" })
    }
}
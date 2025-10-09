import { VercelRequest, VercelResponse } from "@vercel/node"
import { parse, serialize } from "cookie"
import { upsertProfile, getProfile, ProfileMetadata } from "../db/profile.js"
import { updateUserMetadata } from "../lib/authgearClient.js"
import { getProfileData, setProfileData } from "../lib/redisClient.js"

const ALLOWED_FIELDS = [
    "firstname",
    "lastname",
    "position",
    "company",
    "industry",
    "phone",
    "email",
    "url",
    "about",
    "avatar",
] as const

function sanitizeMetadata(input: Record<string, unknown>): ProfileMetadata {
    const metadata: ProfileMetadata = {}
    for (const key of ALLOWED_FIELDS) {
        const value = input[key]
        if (value === undefined || value === null) continue
        if (typeof value === "string") {
            metadata[key] = value.trim()
        } else {
            metadata[key] = value as any
        }
    }
    return metadata
}

function resolveDomain(req: VercelRequest) {
    const headerHost = (req.headers["x-forwarded-host"] as string) || req.headers.host || ""
    return headerHost.split(":")[0]
}

function buildCookie(name: string, value: string, domain: string) {
    return serialize(name, value, {
        path: "/",
        sameSite: "lax",
        secure: true,
        httpOnly: false,
        maxAge: 60 * 60 * 24 * 30,
        domain,
    })
}

function isProfileComplete(metadata: ProfileMetadata) {
    return Boolean(metadata.firstname && metadata.lastname)
}

function mergeProfiles(...profiles: Array<ProfileMetadata | null | undefined>): ProfileMetadata {
    return profiles.filter(Boolean).reduce<ProfileMetadata>((acc, profile) => {
        for (const [key, value] of Object.entries(profile!)) {
            if (value !== undefined && value !== null && value !== "") {
                acc[key as keyof ProfileMetadata] = value
            }
        }
        return acc
    }, {})
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.log("Incoming request:", req.method, req.url)
    const cookies = parse(req.headers.cookie || "")
    console.log("Parsed cookies:", cookies)
    const userIdFromCookie = cookies.userId
    const userIdFromBody = typeof req.body?.userId === "string" ? req.body.userId : undefined
    const userId = userIdFromCookie || userIdFromBody
    console.log("Resolved userId:", userId)

    if (!userId) {
        console.warn("Unauthorized access - missing userId")
        return res.status(401).json({ error: "Unauthorized" })
    }

    if (userIdFromBody && userIdFromCookie && userIdFromBody !== userIdFromCookie) {
        console.warn("Forbidden - mismatched userId")
        return res.status(403).json({ error: "Forbidden" })
    }

    if (req.method === "GET") {
        console.log("Fetching profile for userId:", userId)
        try {
            const redisProfile = await getProfileData(userId)
            console.log("Redis profile:", redisProfile)
            const dbProfile = await getProfile(userId)
            console.log("DB profile:", dbProfile)
            const cookieProfile: ProfileMetadata = {
                firstname: cookies.firstname,
                lastname: cookies.lastname,
                email: cookies.email,
            }
            const profile = mergeProfiles(cookieProfile, dbProfile, redisProfile)
            console.log("Merged profile:", profile)
            return res.status(200).json({ profile })
        } catch (err: any) {
            console.error("getProfile error:", err)
            return res.status(500).json({ error: "Internal server error" })
        }
    }

    if (req.method !== "POST") {
        console.warn("Method not allowed:", req.method)
        return res.status(405).json({ error: "Method not allowed" })
    }

    try {
        console.log("Processing profile update for userId:", userId)
        const metadataInput = req.body?.metadata
        console.log("Incoming metadata:", metadataInput)
        if (!metadataInput || typeof metadataInput !== "object") {
            console.warn("Missing metadata in request")
            return res.status(400).json({ error: "Missing metadata" })
        }

        const sanitized = sanitizeMetadata(metadataInput as Record<string, unknown>)
        console.log("Sanitized metadata:", sanitized)

        if (!sanitized.firstname || !sanitized.lastname) {
            console.warn("Incomplete profile data - missing firstname or lastname")
            return res.status(400).json({ error: "Firstname and lastname are required" })
        }

        if (!sanitized.email && cookies.email) {
            sanitized.email = cookies.email
        }

        console.log("Updating Authgear metadata for user:", userId)
        await updateUserMetadata(userId, sanitized as Record<string, any>)

        console.log("Updating Redis cache")
        const cacheRecord = await setProfileData(userId, sanitized as Record<string, any>)

        console.log("Upserting into DB")
        await upsertProfile(userId, cacheRecord)

        const domain = resolveDomain(req)
        console.log("Resolved domain:", domain)

        if (domain) {
            const profileCompleteValue = isProfileComplete(sanitized) ? "1" : "0"
            console.log("Profile complete:", profileCompleteValue)
            const cookiePayload = [
                buildCookie("firstname", sanitized.firstname!, domain),
                buildCookie("lastname", sanitized.lastname!, domain),
                buildCookie("profileComplete", profileCompleteValue, domain),
            ]
            if (sanitized.email) {
                cookiePayload.push(buildCookie("email", sanitized.email, domain))
            }
            console.log("Setting cookies:", cookiePayload)
            res.setHeader("Set-Cookie", cookiePayload)
        }

        console.log("Profile update complete for userId:", userId)
        return res.status(200).json({ success: true, profile: cacheRecord })
    } catch (err: any) {
        console.error("updateProfile error:", err)
        return res.status(500).json({ error: "Internal server error" })
    }
}

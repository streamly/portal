export interface PortalConfig {
    id: string
    name: string
    description: string
    branded: boolean
    apiKey: string
    viewerId: string
    referral?: string
}

let portalConfig: PortalConfig | null = null

async function setReferralCookie(referral: string) {
    await window.cookieStore.set({
        name: "referral",
        value: referral,
        path: "/",
        sameSite: "lax"
    })
}

async function getReferralCookie(): Promise<string | undefined> {
    const cookie = await window.cookieStore.get("referral")
    return cookie ? cookie.value : undefined
}

async function getReferral(): Promise<string | undefined> {
    const params = new URLSearchParams(window.location.search)
    const referralFromUrl = params.get("referral")

    if (referralFromUrl) {
        await setReferralCookie(referralFromUrl)

        return referralFromUrl
    }

    const referralFromCookie = await getReferralCookie()
    
    return referralFromCookie
}

export async function fetchPortalConfig() {
    const res = await fetch("/api/domain", { credentials: "include" })
    if (!res.ok) {
        throw new Error(`Domain fetch failed: ${res.status}`)
    }
    const data = await res.json()

    const referral = await getReferral()

    portalConfig = {
        id: data.id,
        name: data.name,
        description: data.description,
        branded: data.branded,
        apiKey: data.apiKey,
        viewerId: data.viewerId,
        referral
    }

    return portalConfig
}

export function getPortalConfig() {
    if (!portalConfig) {
        throw new Error("Portal config is not fetched")
    }
    return portalConfig
}
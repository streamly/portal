import md5 from 'md5'

export interface DecodedAuthState {
    domain: string
    referral: string
    nonce?: string
}

export function formatViewerId(viewerId: string) {
    return md5(viewerId)
}

export function decodeAuthState(value: string): DecodedAuthState {
    try {
        const decoded = Buffer.from(value, 'base64').toString('utf8')
        const payload = JSON.parse(decoded)
        if (payload && typeof payload === 'object' && payload.domain) {
            return {
                domain: String(payload.domain).trim(),
                referral: payload.referral ? String(payload.referral) : '',
                nonce: payload.nonce ? String(payload.nonce) : undefined,
            }
        }
    } catch (err) {
        console.warn('Failed to decode OAuth state payload as base64 JSON', err)
    }

    const [rawDomain, ...rest] = value.split(':')
    return {
        domain: rawDomain?.trim() ?? '',
        referral: rest.join(':'),
    }
}

export function buildPortalProfileRedirectUrl(
    domain: string,
    query: Record<string, string | string[] | undefined>
) {
    const params = new URLSearchParams()
    Object.entries(query).forEach(([key, value]) => {
        if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v))
        } else if (value !== undefined) {
            params.append(key, String(value))
        }
    })
    return `https://${domain}/api/profile?${params.toString()}`
}

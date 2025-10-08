import axios, { AxiosInstance } from "axios"

const AUTHGEAR_ENDPOINT = process.env.AUTHGEAR_ENDPOINT as string
const AUTHGEAR_CLIENT_ID = process.env.AUTHGEAR_CLIENT_ID as string
const AUTHGEAR_CLIENT_SECRET = process.env.AUTHGEAR_CLIENT_SECRET as string
const AUTHGEAR_ADMIN_API_KEY = process.env.AUTHGEAR_ADMIN_API_KEY as string
const BASE_URL = process.env.BASE_URL as string

export interface AuthgearTokens {
    accessToken: string
    refreshToken?: string
    idToken?: string
    expiresIn?: number
}

export interface AuthgearProfile {
    sub: string
    email?: string
    email_verified?: boolean
    phone_number?: string
    name?: string
    [key: string]: any
}

const authgearClient: AxiosInstance = axios.create({
    baseURL: AUTHGEAR_ENDPOINT,
    timeout: 5000,
})

export async function exchangeCodeForTokens(code: string): Promise<AuthgearTokens> {
    try {
        const redirectUri = `${BASE_URL}/api/profile`
        const res = await authgearClient.post(
            "/oauth2/token",
            new URLSearchParams({
                grant_type: "authorization_code",
                code,
                client_id: AUTHGEAR_CLIENT_ID,
                client_secret: AUTHGEAR_CLIENT_SECRET,
                redirect_uri: redirectUri,
            }).toString(),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        )

        const data = res.data
        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            idToken: data.id_token,
            expiresIn: data.expires_in,
        }
    } catch (err: any) {
        const msg = err.response?.data || err.message
        throw new Error(`Token exchange failed: ${JSON.stringify(msg)}`)
    }
}

export async function refreshTokens(refreshToken: string): Promise<AuthgearTokens> {
    try {
        const res = await authgearClient.post(
            "/oauth2/token",
            new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: refreshToken,
                client_id: AUTHGEAR_CLIENT_ID,
                client_secret: AUTHGEAR_CLIENT_SECRET,
            })
        )
        const data = res.data
        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            idToken: data.id_token,
            expiresIn: data.expires_in,
        }
    } catch (err: any) {
        const msg = err.response?.data || err.message
        throw new Error(`Token refresh failed: ${JSON.stringify(msg)}`)
    }
}

export async function fetchUserProfile(accessToken: string): Promise<AuthgearProfile> {
    try {
        const res = await authgearClient.get<AuthgearProfile>("/oauth2/userinfo", {
            headers: { Authorization: `Bearer ${accessToken}` },
        })
        return res.data
    } catch (err: any) {
        const msg = err.response?.data || err.message
        throw new Error(`Failed to fetch user profile: ${JSON.stringify(msg)}`)
    }
}

export async function updateUserMetadata(userId: string, metadata: Record<string, any>) {
    try {
        const res = await authgearClient.patch(
            `/api/admin/users/${userId}/metadata`,
            { metadata },
            {
                headers: {
                    Authorization: `Bearer ${AUTHGEAR_ADMIN_API_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        )
        return res.data
    } catch (err: any) {
        const msg = err.response?.data || err.message
        throw new Error(`Authgear metadata update failed: ${JSON.stringify(msg)}`)
    }
}
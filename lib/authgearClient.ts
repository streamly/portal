import axios, { AxiosInstance } from "axios"
import { createSign } from "crypto"

// ---------------------- ENV CONSTANTS ----------------------

const AUTHGEAR_ENDPOINT = process.env.VITE_AUTHGEAR_ENDPOINT as string
const AUTHGEAR_CLIENT_ID = process.env.VITE_AUTHGEAR_CLIENT_ID as string
const AUTHGEAR_CLIENT_SECRET = process.env.AUTHGEAR_CLIENT_SECRET as string
const AUTHGEAR_ADMIN_KEY_ID = process.env.AUTHGEAR_ADMIN_KEY_ID as string
const AUTHGEAR_ADMIN_PRIVATE_KEY_PEM = process.env.AUTHGEAR_ADMIN_PRIVATE_KEY_PEM
const AUTHGEAR_PROJECT_ID = process.env.AUTHGEAR_PROJECT_ID as string
const AUTHGEAR_ADMIN_GRAPHQL_ENDPOINT = process.env.AUTHGEAR_ADMIN_GRAPHQL_ENDPOINT as string
const BASE_URL = process.env.BASE_URL as string

// ---------------------- INTERFACES ----------------------

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

interface AuthgearUser {
    id: string
    standardAttributes: {
        email: string
        given_name: string,
        family_name: string,
        website: string
    }
    customAttributes: {
        industry: string
        position: string
        organization: string
        about: string
    }
}

interface UserAttributes {
    standardAttributes: Record<string, any>
    customAttributes: Record<string, any>
}

interface UpdatePayload {
    firstname?: string
    lastname?: string
    phone?: string
    url?: string
    about?: string
    [key: string]: any
}

// ---------------------- SETUP ----------------------

const authgearClient: AxiosInstance = axios.create({
    baseURL: AUTHGEAR_ENDPOINT,
    timeout: 5000,
})

let cachedAdminToken: { token: string; expiresAt: number } | null = null

// ---------------------- HELPERS ----------------------

function toBase64Url(input: Buffer | string): string {
    const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input)
    return buffer
        .toString("base64")
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
}

function loadAdminPrivateKey(): string {
    if (!AUTHGEAR_ADMIN_PRIVATE_KEY_PEM)
        throw new Error("AUTHGEAR_ADMIN_PRIVATE_KEY_PEM is not configured")

    return AUTHGEAR_ADMIN_PRIVATE_KEY_PEM.replace(/\\n/g, "\n").trim()
}

function generateAdminJwt(): string {
    if (!AUTHGEAR_PROJECT_ID || !AUTHGEAR_ADMIN_KEY_ID)
        throw new Error("Authgear Admin key or project ID missing")

    const privateKey = loadAdminPrivateKey()
    const now = Math.floor(Date.now() / 1000)
    const exp = now + 5 * 60 // valid for 5 min

    const header = { alg: "RS256", typ: "JWT", kid: AUTHGEAR_ADMIN_KEY_ID }
    const payload = { aud: [AUTHGEAR_PROJECT_ID], iat: now, exp }

    const signingInput = `${toBase64Url(JSON.stringify(header))}.${toBase64Url(JSON.stringify(payload))}`
    const signature = createSign("RSA-SHA256").update(signingInput).sign(privateKey)
    const token = `${signingInput}.${toBase64Url(signature)}`

    cachedAdminToken = { token, expiresAt: exp }
    return token
}

function getAdminJwt(): string {
    const now = Math.floor(Date.now() / 1000)
    if (cachedAdminToken && cachedAdminToken.expiresAt - 30 > now) {
        return cachedAdminToken.token
    }
    return generateAdminJwt()
}

function toAuthgearNodeId(uuid: string): string {
    return toBase64Url(`User:${uuid}`)
}

// ---------------------- UNIVERSAL ADMIN REQUEST ----------------------

export async function authgearAdminRequest<T>(
    query: string,
    variables?: Record<string, any>
): Promise<T> {
    try {
        const res = await axios.post(
            AUTHGEAR_ADMIN_GRAPHQL_ENDPOINT,
            { query, variables },
            {
                headers: {
                    Authorization: `Bearer ${getAdminJwt()}`,
                    "Content-Type": "application/json",
                },
            }
        )

        if (res.data.errors?.length) {
            throw new Error(`GraphQL Error: ${JSON.stringify(res.data.errors)}`)
        }

        return res.data.data as T
    } catch (err: any) {
        const msg = err.response?.data || err.message
        throw new Error(`Authgear Admin request failed: ${JSON.stringify(msg)}`)
    }
}

// ---------------------- OAUTH ----------------------

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

        const d = res.data

        console.log('Exchanged tokens', res.data)
        return {
            accessToken: d.access_token,
            refreshToken: d.refresh_token,
            idToken: d.id_token,
            expiresIn: d.expires_in,
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
        const d = res.data
        return {
            accessToken: d.access_token,
            refreshToken: d.refresh_token,
            idToken: d.id_token,
            expiresIn: d.expires_in,
        }
    } catch (err: any) {
        const msg = err.response?.data || err.message
        throw new Error(`Token refresh failed: ${JSON.stringify(msg)}`)
    }
}

// ---------------------- USER QUERIES ----------------------

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

export async function fetchUserById(userId: string): Promise<AuthgearUser | null> {
    const nodeId = Buffer.from(`User:${userId}`).toString('base64url')

    const query = `
    query ($id: ID!) {
      node(id: $id) {
        id
        ... on User {
          standardAttributes
          customAttributes
        }
      }
    }
    `

    const data = await authgearAdminRequest<{ node?: AuthgearUser }>(query, { id: nodeId })

    return data.node ?? null
}

// ---------------------- MAPPERS ----------------------

export function mapUpdatesToAuthgear(updates: UpdatePayload) {
    const standard: Record<string, any> = {}
    const custom: Record<string, any> = {}

    for (const [key, value] of Object.entries(updates)) {
        if (["firstname", "lastname", "phone", "url"].includes(key)) {
            if (key === "firstname") standard["given_name"] = value
            else if (key === "lastname") standard["family_name"] = value
            else if (key === "phone") standard["phone_number"] = value
            else if (key === "url") standard["website"] = value
        } else {
            custom[key] = value
        }
    }

    return { standard, custom }
}

export function mergeAttributes(
    existing: UserAttributes,
    updates: ReturnType<typeof mapUpdatesToAuthgear>
): UserAttributes {
    return {
        standardAttributes: { ...existing.standardAttributes, ...updates.standard },
        customAttributes: { ...existing.customAttributes, ...updates.custom },
    }
}

// ---------------------- MUTATIONS ----------------------

export async function pushUserAttributes(userId: string, attributes: UserAttributes) {
    const mutation = `
    mutation UpdateUser(
      $userID: ID!
      $standardAttributes: UserStandardAttributes
      $customAttributes: UserCustomAttributes
    ) {
      updateUser(
        input: {
          userID: $userID
          standardAttributes: $standardAttributes
          customAttributes: $customAttributes
        }
      ) {
        user { id }
      }
    }
  `

    const data = await authgearAdminRequest<{ updateUser: { user: any } }>(mutation, {
        userID: userId,
        standardAttributes: attributes.standardAttributes,
        customAttributes: attributes.customAttributes,
    })

    return data.updateUser?.user || null
}

export async function updateUserMetadata(userId: string, updates: Record<string, any>) {
    const user = await fetchUserById(userId)

    if (!user) {
        throw new Error('User not found')
    }

    console.log('User for update', user)
    try {
        if ("email" in updates) delete updates.email

        const standardAttributes = {
            ...user.standardAttributes,
            given_name: updates.firstname ?? user.standardAttributes?.given_name ?? "",
            family_name: updates.lastname ?? user.standardAttributes?.family_name ?? "",
            website: updates.url ?? user.standardAttributes?.website,
        }

        const customAttributes = {
            ...user.customAttributes,
            industry: updates.industry ?? user.customAttributes?.industry ?? "",
            position: updates.position ?? user.customAttributes?.position ?? "",
            organization: updates.company ?? user.customAttributes?.organization ?? "",
            about: updates.about ?? user.customAttributes?.about,
        }

        const attributes = { standardAttributes, customAttributes }

        return await pushUserAttributes(user.id, attributes)
    } catch (err: any) {
        const msg = err.response?.data || err.message
        throw new Error(`Authgear metadata update failed: ${JSON.stringify(msg)}`)
    }
}
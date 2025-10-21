import jwt, { type JwtPayload } from "jsonwebtoken"
import jwksClient from "jwks-rsa"

const AUTHGEAR_ENDPOINT = process.env.VITE_AUTHGEAR_ENDPOINT as string

let cachedIssuer: string | null = null
let cachedClient: ReturnType<typeof jwksClient> | null = null

async function getDiscovery() {
    const res = await fetch(`${AUTHGEAR_ENDPOINT}/.well-known/openid-configuration`)
    if (!res.ok) throw new Error("Failed to fetch OIDC discovery")
    return res.json() as Promise<{ issuer: string; jwks_uri: string }>
}

async function getJwksClient() {
    if (cachedClient && cachedIssuer) return { client: cachedClient, issuer: cachedIssuer }
    const { issuer, jwks_uri } = await getDiscovery()
    cachedIssuer = issuer
    cachedClient = jwksClient({ jwksUri: jwks_uri })
    return { client: cachedClient, issuer: cachedIssuer }
}

function getKeyFromJwks(client: ReturnType<typeof jwksClient>) {
    return (header: any, callback: (err: Error | null, key?: string) => void) => {
        client.getSigningKey(header.kid, (err, key) => {
            if (err) return callback(err)
            callback(null, key?.getPublicKey())
        })
    }
}

export class AuthgearError extends Error {
    code: string
    constructor(code: string, message?: string) {
        super(message || code)
        this.name = "AuthgearError"
        this.code = code
    }
}

export async function verifyAuthgearUser(authHeader?: string): Promise<JwtPayload> {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new AuthgearError("NO_TOKEN", "Missing or invalid Authorization header")
    }
    const token = authHeader.slice("Bearer ".length).trim()

    const { client, issuer } = await getJwksClient()
    const getKey = getKeyFromJwks(client)

    try {
        const payload = await new Promise<JwtPayload>((resolve, reject) => {
            jwt.verify(
                token,
                getKey,
                { algorithms: ["RS256"], issuer },
                (err, decoded) => {
                    if (err) {
                        if (err.name === "TokenExpiredError") reject(new AuthgearError("EXPIRED_TOKEN", "Authgear token expired"))
                        else reject(new AuthgearError("INVALID_TOKEN", "Authgear token invalid"))
                        return
                    }
                    resolve(decoded as JwtPayload)
                }
            )
        })
        return payload
    } catch (e) {
        if (e instanceof AuthgearError) throw e
        throw new AuthgearError("INVALID_TOKEN", "Authgear verification failed")
    }
}
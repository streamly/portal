import Authgear, { PromptOption, SessionState, type UserInfo } from '@authgear/web'

const authgearClient = Authgear
let user: UserInfo
let configured = false
let authInProgress = sessionStorage.getItem("authInProgress") === "true"

export function getClient() {
    return authgearClient
}

export async function configureClient() {
    if (!configured) {
        await authgearClient.configure({
            endpoint: import.meta.env.VITE_AUTHGEAR_ENDPOINT!,
            clientID: import.meta.env.VITE_AUTHGEAR_CLIENT_ID!,
        })
        configured = true
    }
}

export async function initAuth() {
    await configureClient()

    if (isUserAuthenticated()) {
        user = await authgearClient.fetchUserInfo()
    }
}

export function isUserAuthenticated() {
    const client = getClient()
    return client.sessionState === SessionState.Authenticated
}

export function getUserInfo() {
    if (!isUserAuthenticated()) {
        throw new Error('User is not authenticated')
    }

    return user
}

export async function getToken() {
    if (!isUserAuthenticated()) {
        throw new Error('User is not authenticated')
    }
    const client = getClient()
    await client.refreshAccessTokenIfNeeded()
    return client.accessToken!
}

export async function startSignIn() {
    if (authInProgress) {
        return
    }

    authInProgress = true
    const client = getClient()
    const redirectURI = `${window.location.origin}/after-signin`
    try {
        await client.startAuthentication({
            redirectURI,
            prompt: PromptOption.Login,
        })

        authInProgress = false
    } catch (err) {
        authInProgress = false
        throw err
    }
}

export async function signOut() {
    if (authInProgress) {
        return
    }
    authInProgress = true
    const client = getClient()
    try {
        await client.logout({
            force: true,
            redirectURI: window.location.href,
        })
    } catch (err) {
        authInProgress = false
        throw err
    }
    window.location.reload()
}

export async function completeSignIn() {
    const client = getClient()
    const data = await client.finishAuthentication()
    authInProgress = false
    return data
}

export async function requireAuth() {
    if (isUserAuthenticated()) {
        return true
    }

    await startSignIn()

    return false
}

export function getMissingProfileFields(): string[] {
    if (!user) {
        throw new Error('User is not authenticated')
    }

    const custom = user.customAttributes ?? {}

    const required = {
        firstname: user.givenName,
        lastname: user.familyName,
        email: user.email,
        phone: custom.phone,
        position: custom.position,
        company: custom.company,
        industry: custom.industry,
    }

    return Object.entries(required)
        .filter(([_, value]) => typeof value !== "string" || value.trim() === "")
        .map(([key]) => key)
}

export function checkIfUserHasCompleteProfile() {
    return getMissingProfileFields().length === 0
}

export function redirectToProfile() {
    return window.location.href = "/profile"
}

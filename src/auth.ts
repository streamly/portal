import Authgear, { PromptOption, SessionState } from '@authgear/web'

const authgearClient = Authgear
let configured = false
let authInProgress = false // #TODO fix case when user returns to the page

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

export function isUserAuthenticated() {
    const client = getClient()
    return client.sessionState === SessionState.Authenticated
}

export function getUserInfo() {
    if (!isUserAuthenticated()) {
        throw new Error('User is not authenticated')
    }
    
    const client = getClient()

    return client.fetchUserInfo()
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
    const redirectURI = `${window.location.origin}/dev/after-signin`
    try {
        await client.startAuthentication({
            redirectURI,
            prompt: PromptOption.Login,
        })
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
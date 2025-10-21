import Authgear, { PromptOption, SessionState } from '@authgear/web'


const authgearClient = Authgear
let configured = false

console.log('Evn', import.meta.env.VITE_AUTHGEAR_CLIENT_ID!, import.meta.env.VITE_AUTHGEAR_ENDPOINT!)


export async function getClient() {
    if (!configured) {
        await authgearClient.configure({
            endpoint: import.meta.env.VITE_AUTHGEAR_ENDPOINT!,
            clientID: import.meta.env.VITE_AUTHGEAR_CLIENT_ID!
        })

        configured = true
    }

    return authgearClient
}


export async function isUserAuthenticated() {
    const client = await getClient()

    console.log('session state', client.sessionState)

    if (client.sessionState === SessionState.Authenticated) {
        return true
    }

    return false
}


export async function getUserInfo() {
    const isAuthenticated = await isUserAuthenticated()

    if (!isAuthenticated) {
        throw new Error('User is not authenticated')
    }

    const client = await getClient()
    const user = await client.fetchUserInfo()

    return user
}


export async function getToken() {
    const isAuthenticated = await isUserAuthenticated()

    if (!isAuthenticated) {
        throw new Error('User is not authenticated')
    }
    
    const client = await getClient()

    await client.refreshAccessTokenIfNeeded()

    return authgearClient.accessToken!
}


export async function startSignIn() {
    const client = await getClient()
    const redirectURI = `${window.location.origin}/dev/after-signin`

    await client.startAuthentication({
        redirectURI,
        prompt: PromptOption.Login,

    })
}

export async function signOut() {
    const client = await getClient()

    await client.logout()
}


export async function completeSignIn() {
    const client = await getClient()

    return client.finishAuthentication()
}

export async function requireAuth() {
    const authenticated = await isUserAuthenticated()
    if (authenticated) return true

    await startSignIn()
    return false
}
import { completeSignIn, configureClient } from './auth'

document.addEventListener("DOMContentLoaded", async () => {
    await configureClient()
    const result = await completeSignIn()

    console.log('Auth result', result, result.userInfo)

    const redirectUrl = window.location.origin + "/dev"
    window.location.href = redirectUrl
})

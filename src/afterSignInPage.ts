import { completeSignIn } from './auth'

document.addEventListener("DOMContentLoaded", async () => {
    const result = await completeSignIn()

    console.log('Auth result', result, result.userInfo)

    const redirectUrl = window.location.origin + "/dev"
    window.location.href = redirectUrl
})

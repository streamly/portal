import {
    checkIfUserHasCompleteProfile,
    completeSignIn,
    configureClient,
    initAuth,
    redirectToProfile
} from '../auth'

function redirectToMainPage() {
    window.location.href = window.location.origin
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await configureClient()
        const result = await completeSignIn()
        await initAuth()

        console.log('Auth result', result, result?.userInfo)

        if (checkIfUserHasCompleteProfile()) {
            redirectToMainPage()
        } else {
            redirectToProfile()
        }
    } catch (error) {
        console.error('Sign-in failed:', error)
        const errorBox = document.getElementById('error-message')
        if (errorBox) errorBox.classList.add('visible')
        setTimeout(() => redirectToMainPage(), 3000)
    }
})
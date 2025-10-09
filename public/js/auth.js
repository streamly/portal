import { openProfileModal } from "./profileModal.js"

const AUTH_BASE_URL = "https://go.auth.moi"
const AUTH_LOGOUT_BASE_URL = "https://auth.me"
const AUTH_CLIENT_ID = "30f8795364f04abf"
const AUTH_SCOPES = "openid offline_access profile email"
const AUTH_REDIRECT_URI = `https://auth.moi/api/profile`
const RETURN_TO_KEY = "portal:return-to"
const PENDING_CONTEXT_KEY = "portal:pending-context"
const STATE_SESSION_KEY = "portal:auth-state-nonce"
const NONCE_COOKIE_NAME = "auth_nonce"

function parseCookies() {
  return document.cookie.split("; ").reduce((acc, part) => {
    if (!part) return acc
    const [key, ...valueParts] = part.split("=")
    const value = valueParts.join("=")
    if (!key) return acc
    acc[decodeURIComponent(key)] = decodeURIComponent(value || "")
    return acc
  }, /** @type {Record<string, string>} */ ({}))
}

function getCookie(name) {
  const cookies = parseCookies()
  return cookies[name] ?? null
}

function generateNonce() {
  try {
    if (window.crypto?.getRandomValues) {
      const arr = new Uint8Array(16)
      window.crypto.getRandomValues(arr)
      return Array.from(arr, byte => byte.toString(16).padStart(2, "0")).join("")
    }
  } catch (err) {
    console.warn("Crypto random generation failed, falling back to Math.random", err)
  }

  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("")
}

function rememberNonce(nonce) {
  try {
    sessionStorage.setItem(STATE_SESSION_KEY, nonce)
  } catch (err) {
    console.warn("Unable to persist auth state nonce:", err)
  }

  try {
    document.cookie = `${NONCE_COOKIE_NAME}=${encodeURIComponent(nonce)}; path=/; max-age=600; SameSite=Lax; Secure`
  } catch (err) {
    console.warn("Unable to persist nonce cookie:", err)
  }
}

function clearStoredNonce() {
  try {
    sessionStorage.removeItem(STATE_SESSION_KEY)
  } catch (err) {
    console.warn("Unable to clear auth state nonce:", err)
  }
}

function buildState() {
  const domain = window.location.hostname
  const referral = getCookie("referral") || ""
  const nonce = generateNonce()
  rememberNonce(nonce)

  const payload = {
    v: 1,
    domain,
    referral,
    nonce,
  }

  try {
    return btoa(JSON.stringify(payload))
  } catch (err) {
    console.warn("Failed to encode auth state payload, falling back to legacy format:", err)
    return `${domain}:${referral}`
  }
}

function buildAuthUrl() {
  const state = encodeURIComponent(buildState())
  const redirectUri = encodeURIComponent(AUTH_REDIRECT_URI)
  return (
    `${AUTH_BASE_URL}/oauth2/authorize` +
    `?client_id=${AUTH_CLIENT_ID}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(AUTH_SCOPES)}` +
    `&state=${state}` +
    `&redirect_uri=${redirectUri}`
  )
}

function persistReturnLocation() {
  try {
    sessionStorage.setItem(RETURN_TO_KEY, window.location.href)
  } catch (err) {
    console.warn("Unable to persist return location:", err)
  }
}

function persistPendingContext(context) {
  if (!context) return
  try {
    sessionStorage.setItem(PENDING_CONTEXT_KEY, JSON.stringify(context))
  } catch (err) {
    console.warn("Unable to persist pending context:", err)
  }
}

function consumePendingContext() {
  try {
    const raw = sessionStorage.getItem(PENDING_CONTEXT_KEY)
    if (!raw) return null
    sessionStorage.removeItem(PENDING_CONTEXT_KEY)
    return JSON.parse(raw)
  } catch (err) {
    console.warn("Unable to read pending context:", err)
    return null
  }
}

function consumeReturnLocation() {
  try {
    const href = sessionStorage.getItem(RETURN_TO_KEY)
    if (!href) return null
    sessionStorage.removeItem(RETURN_TO_KEY)
    return href
  } catch (err) {
    console.warn("Unable to read return location:", err)
    return null
  }
}

export function isLoggedIn() {
  return Boolean(getCookie("userId"))
}

export function getUserInfoFromCookies() {
  return {
    userId: getCookie("userId"),
    firstname: getCookie("firstname"),
    lastname: getCookie("lastname"),
    email: getCookie("email"),
    referral: getCookie("referral"),
    profileComplete: getCookie("profileComplete"),
  }
}

export function startAuthFlow(context) {
  persistReturnLocation()
  if (context) persistPendingContext(context)
  window.location.href = buildAuthUrl()
}

export function requireAuth(context) {
  if (isLoggedIn()) {
    return true
  }
  startAuthFlow(context)
  return false
}

function handleSignOut() {
  const domain = window.location.hostname
  const redirect = `https://${domain}`
  const logoutUrl = `${AUTH_LOGOUT_BASE_URL}/logout?redirect_uri=${encodeURIComponent(redirect)}`
  window.location.href = logoutUrl
}

function updateNavbar() {
  const { firstname, lastname } = getUserInfoFromCookies()
  const loggedIn = isLoggedIn()
  const navUserName = document.getElementById("navUserName")
  
  if (navUserName) {
    const fullName = [firstname, lastname].filter(Boolean).join(" ")
    navUserName.textContent = fullName
    navUserName.classList.toggle("d-none", !loggedIn || !fullName)
  }

  const signInButtons = document.querySelectorAll('[data-action="signin"].btn')
  signInButtons.forEach(btn => {
    btn.classList.toggle("d-none", loggedIn)
  })

  const signOutItems = document.querySelectorAll('[data-action="signout"]')
  signOutItems.forEach(item => {
    item.textContent = loggedIn ? "Sign Out" : "Sign In"
  })
}

function resumePendingActionIfNeeded() {
  if (!isLoggedIn()) return
  const context = consumePendingContext()
  if (!context) return
  setTimeout(() => {
    document.dispatchEvent(new CustomEvent("auth:resume", { detail: context }))
  }, 100)
}

function redirectIfReturnLocationMismatch() {
  if (!isLoggedIn()) return
  const href = consumeReturnLocation()
  if (!href) return
  if (href !== window.location.href) {
    try {
      const current = new URL(window.location.href)
      const target = new URL(href)
      if (current.pathname === target.pathname && current.search === target.search) {
        return
      }
    } catch (_) {
      // ignore parsing issues
    }
    window.history.replaceState({}, "", href)
  }
}

function maybeForceProfileCompletion() {
  const { profileComplete, firstname, lastname } = getUserInfoFromCookies()
  const needsProfile = !firstname || !lastname || profileComplete === "0"
  if (!needsProfile) return
  openProfileModal({ force: true })
}

function handleActionClick(event) {
  const target = event.target instanceof Element ? event.target : null
  if (!target) return
  const actionElement = target.closest("[data-action]")
  if (!actionElement) return
  const action = actionElement.getAttribute("data-action")
  if (!action) return

  if (["signin", "signout", "profile", "settings"].includes(action)) {
    event.preventDefault()
  }

  switch (action) {
    case "signin":
      startAuthFlow()
      break
    case "signout":
      if (isLoggedIn()) {
        handleSignOut()
      } else {
        startAuthFlow()
      }
      break
    case "profile":
      if (isLoggedIn()) {
        openProfileModal()
      } else {
        startAuthFlow({ action: "open-profile" })
      }
      break
    case "settings":
      if (isLoggedIn()) {
        window.location.href = `${AUTH_BASE_URL}/settings`
      } else {
        startAuthFlow({ action: "open-settings" })
      }
      break
    default:
      break
  }
}

function handleAuthResume(event) {
  const { detail } = event
  if (!detail || typeof detail !== "object") return
  const { action, payload } = detail

  switch (action) {
    case "open-profile":
      openProfileModal({ force: true })
      break
    case "open-video":
      if (payload?.id) {
        const url = new URL(window.location.href)
        url.searchParams.set("v", payload.id)
        window.location.href = url.toString()
      }
      break
    case "submit-contact":
      document.dispatchEvent(new CustomEvent("contact:enable", { detail: payload || {} }))
      break
    default:
      break
  }
}

export function initAuth() {
  updateNavbar()
  maybeForceProfileCompletion()
  resumePendingActionIfNeeded()
  redirectIfReturnLocationMismatch()

  document.addEventListener("click", handleActionClick)
  document.addEventListener("auth:resume", handleAuthResume)

  document.addEventListener("auth:updated", () => {
    updateNavbar()
    maybeForceProfileCompletion()
    clearStoredNonce()
  })
}

export function notifyAuthUpdated() {
  document.dispatchEvent(new CustomEvent("auth:updated"))
}

export function markPendingAction(context) {
  persistPendingContext(context)
}

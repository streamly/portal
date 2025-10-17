// @ts-nocheck
import { openProfileModal } from "./profileModal"

const AUTH_BASE_URL = "https://go.auth.moi"
const AUTH_CLIENT_ID = "30f8795364f04abf"
const AUTH_SCOPES = "openid offline_access profile email"
const AUTH_REDIRECT_URI = `https://auth.moi/api/profile`
const RETURN_TO_KEY = "portal:return-to"
const PENDING_CONTEXT_KEY = "portal:pending-context"
const STATE_SESSION_KEY = "portal:auth-state-nonce"
const NONCE_COOKIE_NAME = "auth_nonce"

// ---------------- Cookie Helpers (using Cookie Store API) ----------------

async function getCookie(name) {
  try {
    const cookie = await cookieStore.get(name)
    return cookie?.value ?? null
  } catch {
    return null
  }
}



// ---------------- Nonce & State Management ----------------

function generateNonce() {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr, b => b.toString(16).padStart(2, "0")).join("")
}

async function rememberNonce(nonce) {
  sessionStorage.setItem(STATE_SESSION_KEY, nonce)
  await setCookie(NONCE_COOKIE_NAME, nonce, 600)
}

function clearStoredNonce() {
  sessionStorage.removeItem(STATE_SESSION_KEY)
}

function buildState() {
  const domain = window.location.hostname
  return btoa(JSON.stringify({
    v: 1,
    domain,
    referral: "",
    nonce: generateNonce(),
  }))
}

// ---------------- Auth Flow ----------------

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

export async function isLoggedIn() {
  return Boolean(await getCookie("userId"))
}

export async function getUserInfoFromCookies() {
  const fields = ["userId", "firstname", "lastname", "email", "referral", "profileComplete"]
  const result = {}
  for (const f of fields) {
    result[f] = (await getCookie(f)) || ""
  }
  return result
}

export function startAuthFlow(context) {
  sessionStorage.setItem(RETURN_TO_KEY, window.location.href)
  if (context) sessionStorage.setItem(PENDING_CONTEXT_KEY, JSON.stringify(context))
  window.location.href = buildAuthUrl()
}

export async function requireAuth(context) {
  if (await isLoggedIn()) return true
  startAuthFlow(context)
  return false
}

function handleSignOut() {
  console.log("Clicked signout")

  const cookieNames = [
    "userId",
    "firstname",
    "lastname",
    "email",
    "url",
    "industry",
    "position",
    "organization",
    "about",
    "referral",
    "profileComplete",
    "auth_nonce",
  ]

  const expire = "Thu, 01 Jan 1970 00:00:00 GMT"

  for (const name of cookieNames) {
    // Clear default path
    document.cookie = `${name}=; Path=/; Expires=${expire}; Secure; SameSite=Lax`

    // Clear possible domain-scoped cookie
    const hostname = location.hostname
    const parts = hostname.split(".")
    if (parts.length > 1) {
      const rootDomain = parts.slice(-2).join(".")
      document.cookie = `${name}=; Domain=.${rootDomain}; Path=/; Expires=${expire}; Secure; SameSite=Lax`
    }
  }

  console.info("All cookies cleared.")

  setTimeout(() => window.location.reload(), 200)
}

// ---------------- UI Updates ----------------

async function updateNavbar() {
  const { firstname, lastname } = await getUserInfoFromCookies()
  const loggedIn = await isLoggedIn()
  const navUserName = document.getElementById("navUserName")

  if (navUserName) {
    const fullName = [firstname, lastname].filter(Boolean).join(" ")
    navUserName.textContent = decodeURIComponent(fullName)
    navUserName.classList.toggle("d-none", !loggedIn || !fullName)
  }

  document.querySelectorAll('[data-action="signin"].btn')
    .forEach(btn => btn.classList.toggle("d-none", loggedIn))
  document.querySelectorAll('[data-action="signout"]')
    .forEach(item => item.textContent = loggedIn ? "Sign Out" : "Sign In")
}

// ---------------- Event Handling ----------------

function handleActionClick(event) {
  const target = event.target.closest("[data-action]")
  if (!target) return
  const action = target.getAttribute("data-action")
  if (!action) return

  event.preventDefault()

  switch (action) {
    case "signin": startAuthFlow(); break
    case "signout": handleSignOut(); break
    case "profile": openProfileModal(); break
    case "settings":
      window.location.href = `${AUTH_BASE_URL}/settings`
      break
    default: break
  }
}

// ---------------- Init ----------------

export async function initAuth() {
  await updateNavbar()
  document.addEventListener("click", handleActionClick)
  document.addEventListener("auth:updated", updateNavbar)
  clearStoredNonce()
}

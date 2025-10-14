import { updateProfile } from "./services/profileService.js"
import { getCookieValue, isUserLoggedIn } from "./utils.js"

const PROFILE_FIELDS = [
  "firstname",
  "lastname",
  "position",
  "company",
  "industry",
  "phone",
  "email",
  "url",
  "about",
]

let modalInstance = null
let formElement = null
let saveButton = null
let currentProfile = null
let isSubmitting = false

async function loadProfileFromCookies() {
  const profile = {}
  for (const field of PROFILE_FIELDS) {
    profile[field] = (await getCookieValue(field)) || ""
  }

  profile.userId = (await getCookieValue("userId")) || ""
  profile.referral = (await getCookieValue("referral")) || ""
  profile.profileComplete = (await getCookieValue("profileComplete")) || "0"

  return profile
}

function ensureModal() {
  if (!modalInstance) {
    const el = document.getElementById("profileModal")
    if (!el) throw new Error("Profile modal element not found")
    modalInstance = new mdb.Modal(el, { backdrop: "static" })
  }
  return modalInstance
}

function ensureForm() {
  if (!formElement) {
    formElement = document.getElementById("userProfile")
    if (!formElement) throw new Error("Profile form not found")

    saveButton = formElement.querySelector("button[type=submit]")
    if (window.Parsley && typeof window.Parsley.addValidator === "function") {
      $(formElement).parsley()
    }

    formElement.addEventListener("submit", submitProfile)
  }
}

function disableForm(disabled) {
  if (!formElement) return
  formElement.querySelectorAll("input, textarea, select, button").forEach(el => (el.disabled = disabled))
  if (saveButton) {
    saveButton.disabled = disabled
    saveButton.textContent = disabled ? "Saving..." : "Save"
  }
}

function fillForm(profile) {
  if (!formElement) return
  PROFILE_FIELDS.forEach(field => {
    const input = formElement.querySelector(`[name="${field}"]`)
    if (input && (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement)) {
      input.value = profile?.[field] || ""
    }
  })
}

function gatherFormData() {
  const data = {}
  PROFILE_FIELDS.forEach(field => {
    const input = formElement?.querySelector(`[name="${field}"]`)
    let value = input?.value?.trim?.() ?? ""
    // optional fields should be undefined if empty
    if ((field === "url" || field === "about") && value.length === 0) {
      value = undefined
    }
    data[field] = value
  })
  return data
}

async function submitProfile(event) {
  event.preventDefault()
  if (!formElement || isSubmitting || !(await isUserLoggedIn())) return

  const parsley = $(formElement).parsley?.()
  if (parsley && !parsley.isValid()) {
    parsley.validate()
    return
  }

  const metadata = gatherFormData()
  if (!metadata.firstname || !metadata.lastname) {
    alert("First name and Last name are required")
    return
  }

  disableForm(true)
  isSubmitting = true

  try {
    const payload = await updateProfile(metadata)

    Object.entries(metadata).forEach(([key, value]) => {
      if (value === undefined) return
      document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax; Secure`
    })

    currentProfile = payload?.profile || metadata
    fillForm(currentProfile)

    alert("Profile updated successfully")
    document.dispatchEvent(new CustomEvent("auth:updated"))
    ensureModal().hide()
  } catch (err) {
    console.error(err)
    alert(err.message || "Unable to save profile")
  } finally {
    isSubmitting = false
    disableForm(false)
  }
}

export async function openProfileModal(options = {}) {
  if (!(await isUserLoggedIn())) {
    console.warn("Ignoring profile modal open request – user not logged in")
    return
  }

  try {
    ensureForm()
  } catch (err) {
    console.error(err)
    return
  }

  const cookieProfile = await loadProfileFromCookies()
  currentProfile = { ...cookieProfile }

  fillForm(currentProfile)
  ensureModal().show()
}

export function initProfileModal() {
  try {
    ensureForm()
  } catch (err) {
    console.warn("Profile modal init skipped:", err.message)
  }
}
import { isUserLoggedIn, getCookieValue } from "./utils.js"
import { fetchProfileData, updateProfile } from "./services/profileService.js"

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
  const [firstname, lastname, email] = await Promise.all([
    getCookieValue("firstname"),
    getCookieValue("lastname"),
    getCookieValue("email"),
  ])

  return {
    firstname: firstname || "",
    lastname: lastname || "",
    email: email || "",
  }
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
  formElement.querySelectorAll("input, textarea, select, button").forEach(el => {
    el.disabled = disabled
  })

  if (saveButton) {
    saveButton.disabled = disabled
    saveButton.textContent = disabled ? "Saving..." : "Save"
  }
}

function fillForm(profile) {
  if (!formElement) return
  PROFILE_FIELDS.forEach((field) => {
    const input = formElement.querySelector(`[name="${field}"]`)
    if (!input) return
    const value = profile?.[field] || ""
    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement) {
      input.value = value
    }
  })
}

async function fetchProfile() {
  if (!(await isUserLoggedIn())) return
  try {
    const remoteProfile = await fetchProfileData()
    if (remoteProfile) {
      const cookieProfile = await loadProfileFromCookies()
      currentProfile = { ...cookieProfile, ...remoteProfile }
      fillForm(currentProfile)
    }
  } catch (err) {
    console.error("Failed to load profile:", err)
  }
}

function gatherFormData() {
  const metadata = {}
  PROFILE_FIELDS.forEach((field) => {
    const input = formElement?.querySelector(`[name="${field}"]`)
    if (!input) return
    const value = input.value?.trim?.() ?? ""
    metadata[field] = value
  })
  return metadata
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

  if (!currentProfile || options.force) {
    const cookieProfile = await loadProfileFromCookies()
    if (!currentProfile || options.force) {
      currentProfile = { ...(currentProfile || {}), ...cookieProfile }
    }
  }

  fillForm(currentProfile)
  const modal = ensureModal()
  modal.show()

  if (!currentProfile || options.force) {
    await fetchProfile()
  }
}

export function initProfileModal() {
  try {
    ensureForm()
  } catch (err) {
    console.warn("Profile modal init skipped:", err.message)
  }
}

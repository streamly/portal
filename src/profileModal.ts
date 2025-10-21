import $ from "jquery"
// @ts-expect-error
import * as mdb from "mdb-ui-kit"
import "parsleyjs"
import { getUserInfo } from "./auth"
import { updateProfile } from "./services/profileService"

type UserProfile = {
  firstname: string
  lastname: string
  position?: string
  company?: string
  industry?: string
  phone?: string
  email: string
  url?: string
}

const PROFILE_FIELDS = [
  "firstname",
  "lastname",
  "position",
  "company",
  "industry",
  "phone",
  "email",
  "url",
] as const

let modalInstance: any = null
let formElement: HTMLFormElement | null = null
let saveButton: HTMLButtonElement | null = null
let currentProfile: UserProfile | null = null
let isSubmitting = false

async function fetchAuthgearProfile(): Promise<UserProfile> {
  const userInfo = await getUserInfo()

  const custom = userInfo.customAttributes ?? {}

  return {
    firstname: userInfo.givenName || "",
    lastname: userInfo.familyName || "",
    email: userInfo.email || "",
    phone: custom.phone as string || "",
    url: userInfo.website || "",
    position: custom.position as string || "",
    company: custom.company as string || "",
    industry: custom.industry as string || "",
  }
}

function ensureModal(): any {
  if (!modalInstance) {
    const el = document.getElementById("profileModal")
    if (!el) throw new Error("Profile modal element not found")
    modalInstance = new mdb.Modal(el, { backdrop: "static" })
  }
  return modalInstance
}

function ensureForm(): void {
  if (!formElement) {
    const el = document.getElementById("userProfile")
    if (!el) throw new Error("Profile form not found")
    formElement = el as HTMLFormElement
    saveButton = formElement.querySelector("button[type=submit]")

    // @ts-expect-error
    $(formElement).parsley()
    formElement.addEventListener("submit", submitProfile)
  }
}

function disableForm(disabled: boolean): void {
  if (!formElement) return
  formElement
    .querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement>(
      "input, textarea, select, button"
    )
    .forEach(el => (el.disabled = disabled))
  if (saveButton) {
    saveButton.disabled = disabled
    saveButton.textContent = disabled ? "Saving..." : "Save"
  }
}

function fillForm(profile: UserProfile): void {
  if (!formElement) {
    return
  }
  PROFILE_FIELDS.forEach(field => {
    const input = formElement?.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      `[name="${field}"]`
    )
    if (input) {
      input.value = profile[field as keyof UserProfile] || ""
    }
  })
}

function gatherFormData(): UserProfile {
  const data: Partial<UserProfile> = {}

  PROFILE_FIELDS.forEach(field => {
    const input = formElement?.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      `[name="${field}"]`
    )
    let value = input?.value?.trim?.() ?? ""
    if (field === "url" && value.length === 0) {
      value = undefined as any
    }
    data[field] = value as any
  })

  return data as UserProfile
}

async function submitProfile(event: SubmitEvent): Promise<void> {
  event.preventDefault()
  if (!formElement || isSubmitting) return

  // @ts-expect-error
  const parsley = $(formElement).parsley?.()
  if (parsley && !parsley.isValid()) {
    parsley.validate()
    return
  }

  const metadata = gatherFormData()
  disableForm(true)
  isSubmitting = true

  try {
    const payload = await updateProfile(metadata)
    currentProfile = payload?.profile || metadata

    if (!currentProfile) {
      throw new Error('Missing new profile data')
    }

    fillForm(currentProfile)

    document.dispatchEvent(new CustomEvent("auth:updated"))
    ensureModal().hide()
  } catch (err: any) {
    console.error(err)
    alert(err.message || "Unable to save profile")
  } finally {
    isSubmitting = false
    disableForm(false)
  }
}

export async function openProfileModal(): Promise<void> {
  try {
    ensureForm()
    const profile = await fetchAuthgearProfile()
    console.log('Profile to fill', profile)

    fillForm(profile)
    ensureModal().show()
  } catch (err) {
    console.error("Failed to open profile modal:", err)
    alert("Unable to load user profile. Please sign in again.")
  }
}

export function initProfileModal(): void {
  try {
    ensureForm()
  } catch (err: any) {
    console.warn("Profile modal init skipped:", err.message)
  }
}
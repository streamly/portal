import { getUserInfo, isUserAuthenticated, signOut, startSignIn } from "./auth"
import { openProfileModal } from "./profileModal"

async function updateNavbar() {
  const loggedIn = isUserAuthenticated()
  const navUserName = document.getElementById("navUserName")

  if (navUserName) {
    navUserName.textContent = ""
    navUserName.classList.add("d-none")
  }

  document.querySelectorAll('[data-action="signin"].btn')
    .forEach(btn => btn.classList.toggle("d-none", loggedIn))

  document.querySelectorAll('.dropdown.d-inline')
    .forEach(el => el.classList.remove("d-none"))

  document.querySelectorAll('[data-action="profile"], [data-action="settings"], [data-action="signout"], hr.dropdown-divider')
    .forEach(item => item.classList.toggle("d-none", !loggedIn))

  document.querySelectorAll('[data-action="about"].dropdown-item')
    .forEach(item => item.classList.remove("d-none"))

  if (loggedIn) {
    try {
      const user = await getUserInfo()
      if (user && navUserName) {
        const firstname = user.givenName || ""
        const lastname = user.familyName || ""
        const fullName = [firstname, lastname].filter(Boolean).join(" ")
        navUserName.textContent = decodeURIComponent(fullName)
        navUserName.classList.toggle("d-none", !fullName)
      }
    } catch (err) {
      console.error("[Auth] Failed to fetch user info:", err)
    }
  }
}

function handleActionClick(event: any) {
  const target = event?.target?.closest("[data-action]")
  if (!target) return

  const action = target.getAttribute("data-action")
  if (!action) return

  event.preventDefault()

  switch (action) {
    case "signin":
      startSignIn()
      break
    case "signout":
      signOut().then(() => document.dispatchEvent(new CustomEvent("auth:updated")))
      break
    case "profile":
      openProfileModal()
      break
    default:
      break
  }
}

export async function initAuthUi() {
  await updateNavbar()
  document.addEventListener("click", handleActionClick)
  document.addEventListener("auth:updated", updateNavbar)

  const loggedIn = await isUserAuthenticated()
  if (loggedIn) {
    const user = await getUserInfo()
    console.log("User:", user)
  } else {
    console.log("User not signed in")
  }
}
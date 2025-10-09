export async function getCookieValue(name) {
  if (window.cookieStore?.get) {
    try {
      const cookie = await window.cookieStore.get(name)
      if (cookie?.value != null) {
        try {
          return decodeURIComponent(cookie.value)
        } catch (err) {
          console.warn("Failed to decode cookieStore value:", err)
          return cookie.value
        }
      }
      return null
    } catch (err) {
      console.warn("cookieStore.get failed:", err)
    }
  }

  const match = document.cookie
    .split("; ")
    .find(part => part.startsWith(`${name}=`))
  if (!match) return null

  const [, rawValue = ""] = match.split("=")
  try {
    return decodeURIComponent(rawValue)
  } catch (err) {
    console.warn("Failed to decode document cookie value:", err)
    return rawValue
  }
}

export async function hasCookie(name) {
  return Boolean(await getCookieValue(name))
}

export async function isUserLoggedIn() {
  return hasCookie("userId")
}

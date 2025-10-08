import { initSearch } from "./search.js"
import { initVideoModalUi } from "./videoModalUi.js"
import { initVideoPlayer } from "./videoPlayer.js"
import { initVideoTracking } from "./videoTracking.js"

let portalConfig = null

async function initPortalConfig() {
  try {
    const res = await fetch("/api/domain", { credentials: "include" })
    if (!res.ok) throw new Error(`Domain fetch failed: ${res.status}`)
    const data = await res.json()

    const cookieStore = window.cookieStore || null
    let apiKey = null

    if (cookieStore) {
      const cookie = await cookieStore.get("apiKey")
      apiKey = cookie?.value || null
    } else {
      apiKey = document.cookie
        .split("; ")
        .find(row => row.startsWith("apiKey="))
        ?.split("=")[1] || null
    }

    const { id, name, description, viewerId, branded } = data
    portalConfig = { id, name, description, viewerId, apiKey, branded: !!branded }

    document.title = name
    $(".portal-logo").attr({ src: "bizilla-red.svg", title: name, alt: name })
    $(".portal-name").text(name)
    $(".portal-description").text(description || "")
    $("#add").toggle(!portalConfig.branded)
  } catch (err) {
    console.error("Failed to load portal config:", err)
  }
}

initPortalConfig()

document.addEventListener("DOMContentLoaded", async () => {
  while (!portalConfig) {
    await new Promise(res => setTimeout(res, 50))
  }

  initSearch(portalConfig)
  const player = initVideoPlayer({ branded: portalConfig.branded })
  initVideoModalUi(player)
  initVideoTracking(player)
})
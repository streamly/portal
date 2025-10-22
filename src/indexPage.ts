import "boxicons/css/boxicons.min.css"
import 'instantsearch.css/themes/satellite.css'
import "instantsearch.js"
import $ from "jquery"
import "mdb-ui-kit/css/mdb.min.css"

import { initAuthUi } from "./authUi"
import { initProfileModal } from "./profileModal"
import { initSearch } from "./search"
import { initVideoContactUi } from "./videoContactUi"
import { initVideoModalUi } from "./videoModalUi"
import { initVideoPlayer } from "./videoPlayer"
import { initVideoTracking } from "./videoTracking"

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
        $(".portal-logo").attr({ src: `https://img.syndinet.com/${id}`, title: name, alt: name })
        $(".portal-name").text(name)
        $(".portal-description").text(description || "")
        $("#add").toggle(!portalConfig.branded)
    } catch (err) {
        console.error("Failed to load portal config:", err)
    }
}

initPortalConfig()

document.addEventListener("DOMContentLoaded", async () => {
    initAuthUi()
    initProfileModal()
    initVideoContactUi()

    while (!portalConfig) {
        await new Promise(res => setTimeout(res, 50))
    }

    console.log('portal', portalConfig)

    initSearch(portalConfig)
    const player = initVideoPlayer({ branded: portalConfig.branded })
    initVideoModalUi(player)
    initVideoTracking(player)
})

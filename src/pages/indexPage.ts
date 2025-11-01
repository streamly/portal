import "boxicons/css/boxicons.min.css"
import 'instantsearch.css/themes/satellite.css'
import "instantsearch.js"
import $ from "jquery"
import "mdb-ui-kit/css/mdb.min.css"
import "../styles/index.css"

import { initAuth } from '../auth'
import { initVideoPlayerTracker } from '../newRelic'
import { initSearch } from "../search"
import { fetchPortalConfig, type PortalConfig } from "../services/portalService"
import { initAboutModalUi } from '../ui/aboutModalUi'
import { initAuthUi } from "../ui/authUi"
import { initVideoContactUi } from "../ui/videoContactUi"
import { initVideoModalUi } from "../ui/videoModalUi"
import { getPlayer } from '../videoPlayer'


function updateFavicon(url: string): void {
    document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]').forEach(el => el.remove())

    const link = document.createElement("link")
    link.rel = "icon"
    link.type = "image/png"
    link.href = url
    document.head.appendChild(link)
}

function initPortalConfigUi(portal: PortalConfig) {
    document.title = portal.name

    const logoUrl = `https://img.syndinet.com/${portal.id}`
    $(".portal-logo").attr({ src: logoUrl, title: portal.name, alt: portal.name })
    $(".portal-name").text(portal.name)
    $(".portal-description").text(portal.description)
    $("#add").toggle(!portal.branded)
    updateFavicon(logoUrl)
}

document.addEventListener("DOMContentLoaded", async () => {
    const [portal] = await Promise.all([
        fetchPortalConfig(),
        initAuth()
    ])

    console.log('Portal configuration', portal)

    initAuthUi()
    initVideoContactUi()
    initPortalConfigUi(portal)
    initSearch(portal.apiKey)
    initVideoModalUi()
    initAboutModalUi()

    const player = getPlayer()

    initVideoPlayerTracker(player)
})
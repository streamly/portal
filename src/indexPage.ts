import "boxicons/css/boxicons.min.css"
import 'instantsearch.css/themes/satellite.css'
import "instantsearch.js"
import $ from "jquery"
import "mdb-ui-kit/css/mdb.min.css"

import { initAboutModalUi } from './aboutModalUi'
import { configureClient } from './auth'
import { initAuthUi } from "./authUi"
import { initProfileModal } from "./profileModal"
import { initSearch } from "./search"
import { fetchPortalConfig, type PortalConfig } from "./services/portalService"
import { initVideoContactUi } from "./videoContactUi"
import { initVideoModalUi } from "./videoModalUi"


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
        configureClient()
    ])

    initAuthUi()
    initProfileModal()
    initVideoContactUi()
    initPortalConfigUi(portal)
    initSearch(portal.apiKey)
    initVideoModalUi()
    initAboutModalUi()
})
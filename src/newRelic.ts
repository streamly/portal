import { BrowserAgent } from "@newrelic/browser-agent/loaders/browser-agent"
import { getUserInfo, isUserAuthenticated } from './auth'
import { getPortalConfig } from './services/portalService'
import type { VideoHit } from './types'
import { getUserUUID } from './utils'
// @ts-expect-error
import VideojsTracker from '@newrelic/video-videojs'
import type Player from 'video.js/dist/types/player'


interface ActionData {
    uuid: string | null
    userId?: string | null
    referral?: string | null
    guid: string
    aid?: string | null
    videoId: string
    videoCompany?: string | null
    videoTitle?: string | null
    gated?: boolean
    hostUrl: string
    hostDescription: string
    hostName: string
}

export interface VideoPlayActionData extends ActionData {
    branded: boolean
    trial?: number | null
    billing?: number | null
    score?: number | null
    plan?: number | null
    videoPosition?: number | null
    ranking?: number | null
}

export interface ContactActionData extends ActionData {
    message?: string | null
    userFirstname?: string | null
    userLastname?: string | null
    userEmail?: string | null
    userPhone?: string | null
}

// @ts-expect-error
window.NREUM = window.NREUM || {}
// @ts-expect-error
window.NREUM.debug = true

export const newrelicAgent = new BrowserAgent({
    init: {
        distributed_tracing: { enabled: true },
        privacy: { cookies_enabled: true },
        ajax: { deny_list: ["bam.nr-data.net"] }
    },
    loader_config: {
        accountID: "3796945",
        trustKey: "3796945",
        agentID: "1134427048",
        licenseKey: "NRJS-1a688493c87fd896c70",
        applicationID: "1134427048",
    },
    info: {
        beacon: "bam.nr-data.net",
        errorBeacon: "bam.nr-data.net",
        licenseKey: "NRJS-1a688493c87fd896c70",
        applicationID: "1134427048",
        sa: 1,
    }
})

// @ts-expect-error
window.newrelic = newrelicAgent

let tracker = new VideojsTracker(null, {
    heartbeat: 5000
})

export function initVideoPlayerTracker(player: Player) {
    tracker.setPlayer(player)

    // @ts-expect-error
    nrvideo.Core.addTracker(tracker)

    // @ts-expect-error
    console.log('keys', Object.getOwnPropertyNames(nrvideo.Core), Object.getOwnPropertyNames(nrvideo))

    tracker.onDownload(() => {
        console.log('Download event')
    })
}

function updateVideoPlayerTrackerCustomData(customData: VideoPlayActionData) {
    tracker.customData = customData
}

async function buildBaseActionData(videoData: VideoHit) {
    const isAuthenticated = isUserAuthenticated()
    const portalConfig = getPortalConfig()
    const uuid = await getUserUUID()
    const guid = crypto.randomUUID()

    const base: ActionData = {
        uuid,
        guid,
        referral: portalConfig.referral,
        aid: videoData.uid,
        videoId: videoData.id,
        videoTitle: videoData.title,
        videoCompany: videoData.channel,
        gated: Boolean(videoData.gated),
        hostUrl: window.location.origin,
        hostDescription: portalConfig.description,
        hostName: portalConfig.name,
    }

    if (isAuthenticated) {
        const user = getUserInfo()
        console.log('user info', user)
        base.userId = user.sub
        return {
            ...base,
            userFirstname: user.givenName,
            userLastname: user.familyName,
            userCompany: user.customAttributes.company as string,
            userPosition: user.customAttributes.position as string,
            userIndustry: user.customAttributes.industry as string,
            userEmail: user.email,
            userPhone: user.customAttributes.phone as string | null,
        }
    }

    return base
}

export async function trackVideoPlay(videoData: VideoHit) {
    const base = await buildBaseActionData(videoData)

    const actionData: VideoPlayActionData = {
        ...base,
        branded: getPortalConfig().branded,
        billing: videoData.billing,
        score: videoData.score,
        videoPosition: videoData.__position,
        ranking: videoData.ranking,
    }

    newrelicAgent.addPageAction("PLAY", actionData)
    updateVideoPlayerTrackerCustomData(actionData)
    console.log("Adding page action PLAY", actionData, videoData)
}

export async function trackContactSubmit(videoData: VideoHit, message?: string) {
    const base = await buildBaseActionData(videoData)

    const actionData: ContactActionData = {
        ...base,
        message: message?.trim() || undefined,
    }

    newrelicAgent.addPageAction("CONTACT", actionData)
    console.log("Adding page action CONTACT", actionData)
}
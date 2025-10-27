import { BrowserAgent } from "@newrelic/browser-agent/loaders/browser-agent"
import { getUserInfo, isUserAuthenticated } from './auth'
import { getPortalConfig } from './services/portalService'
import type { VideoHit } from './types'
import { getUserUUID } from './utils'
// @ts-expect-error
import VideojsTracker from '@newrelic/video-videojs'
import type Player from 'video.js/dist/types/player'


export interface VideoPlayActionData {
    branded: boolean
    referral?: string | null
    pid?: string | null
    uuid: string | null
    guid: string
    aid?: string | null
    vid: string
    title: string
    company: string
    trial?: number | null
    billing?: number | null
    score?: number | null
    plan?: number | null
    gated?: boolean
    position?: number | null
    ranking?: number | null
}

interface ContactActionData {
    uuid: string | null
    pid: string | null
    gated: boolean,
    referral?: string | null
    guid: string
    aid?: string | null
    vid: string
    company?: string | null
    title?: string | null
    message?: string | null
    firstname?: string | null
    lastname?: string | null
    email?: string | null
    phone?: string | null
}


export const newrelicAgent = new BrowserAgent({
    init: {
        distributed_tracing: { enabled: true },
        privacy: { cookies_enabled: true },
        ajax: { deny_list: ["bam.nr-data.net"] },
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
    },
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

export async function trackVideoPlay(videoData: VideoHit) {
    const isAuthenticated = isUserAuthenticated()
    let pid: string | null = null

    if (isAuthenticated) {
        const user = await getUserInfo()
        pid = user.sub // user id
    }

    const portalConfig = getPortalConfig()
    const uuid = await getUserUUID()
    const guid = crypto.randomUUID()
    const actionData: VideoPlayActionData = {
        branded: portalConfig.branded,
        referral: portalConfig.referral,
        pid,
        uuid,
        guid,
        aid: videoData.uid,
        vid: videoData.id,
        title: videoData.title,
        company: videoData.channel,
        // trial: data.trial,
        billing: videoData.billing,
        score: videoData.score,
        gated: Boolean(videoData.gated),
        // plan: parseInt(String(data.plan || "0")),
        position: videoData.__position,
        ranking: videoData.ranking,
    }

    newrelicAgent.addPageAction("PLAY", actionData)
    updateVideoPlayerTrackerCustomData(actionData)
    console.log('Adding page action PLAY', actionData, videoData)
}

export async function trackContactSubmit(videoData: VideoHit, message?: string) {
    const portalConfig = getPortalConfig()
    const uuid = await getUserUUID()
    const guid = crypto.randomUUID()
    const isAuthenticated = isUserAuthenticated()

    const actionData: ContactActionData = {
        uuid,
        pid: null,
        referral: portalConfig.referral,
        guid,
        aid: videoData.uid,
        vid: videoData.id,
        company: videoData.channel,
        title: videoData.title,
        gated: Boolean(videoData.gated),
        message
    }

    if (isAuthenticated) {
        const user = await getUserInfo()
        actionData.pid = user.sub // user id
        actionData.firstname = user.givenName
        actionData.lastname = user.familyName
        actionData.email = user.email
        actionData.phone = user.customAttributes.phone as string || null
    }

    newrelicAgent.addPageAction("CONTACT", actionData)

    console.log('Adding page action CONTACT', actionData, videoData)
}


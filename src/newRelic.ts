import { BrowserAgent } from "@newrelic/browser-agent/loaders/browser-agent"
import { getUserInfo, isUserAuthenticated } from './auth'
import { getPortalConfig } from './services/portalService'
import type { VideoHit } from './types'
import { getUserUUID } from './utils'


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
    const actionData = {
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
        // plan: parseInt(String(data.plan || "0")),
        position: videoData.__position,
        ranking: videoData.ranking,
    }

    newrelicAgent.addPageAction("PLAY", actionData)
    console.log('Adding page action PLAY', actionData, videoData)
}


interface ContactActionData {
    uuid: string | null
    pid: string | null
    referral?: string | null
    guid: string
    aid?: string | null
    vid: string
    company?: string | null
    title?: string | null
    message?: string | null
    userFirstname?: string | null
    userLastname?: string | null
    userEmail?: string | null
    userPhone?: string | null
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
        message
    }

    if (isAuthenticated) {
        const user = await getUserInfo()
        console.log('User info', user)
        actionData.pid = user.sub // user id
        actionData.userFirstname = user.givenName
        actionData.userLastname = user.familyName
        actionData.userEmail = user.email
        actionData.userPhone = user.customAttributes.phone as string || null
    }

    newrelicAgent.addPageAction("CONTACT", actionData)

    console.log('Adding page action CONTACT', actionData, videoData)
}

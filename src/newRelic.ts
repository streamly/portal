import { BrowserAgent } from "@newrelic/browser-agent/loaders/browser-agent"

new BrowserAgent({
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
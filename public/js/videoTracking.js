function trackPlayEvent(data, player) {
  const tracker = player.newrelic?.()
  if (tracker) {
    Object.assign(tracker.customData, {
      branded: data.branded,
      referral: data.referral,
      pid: data.pid,
      uuid: data.uuid,
      guid: String(data.guid),
      cid: String(data.cid),
      aid: String(data.uid),
      vid: String(data.id),
      billing: parseInt(data.billing) || 0,
      score: parseInt(data.score) || 0,
      plan: parseInt(data.plan) || 0,
      trial: parseInt(data.trial) || 0,
      position: data.position || 0,
      visibility: parseInt(data.visibility) || 0,
      ranking: parseInt(data.ranking) || 0,
    })
  }

  newrelic?.addPageAction?.("PLAY", {
    branded: data.branded,
    referral: data.referral,
    pid: data.pid,
    uuid: data.uuid,
    guid: data.guid,
    aid: String(data.uid),
    vid: String(data.id),
    title: decodeURIComponent(data.title || ""),
    company: decodeURIComponent(data.channel || ""),
    trial: parseInt(data.trial) || 0,
    billing: parseInt(data.billing) || 0,
    score: parseInt(data.score) || 0,
    plan: parseInt(data.plan) || 0,
    position: data.position || 0,
    ranking: parseInt(data.ranking) || 0,
  })
}

export function initVideoTracking(player) {
  document.addEventListener("video:play", e => {
    const data = e.detail
    trackPlayEvent(data, player)
  })
}
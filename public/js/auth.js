function redirectToAuth() {
  const domain = window.location.hostname
  const referral =
    document.cookie
      .split("; ")
      .find(c => c.startsWith("referral="))
      ?.split("=")[1] || ""

  const clientId = "e7ab426f685c6cba"
  const redirectUri = encodeURIComponent("https://go.auth.moi/api/profile")
  const state = `${domain}:${referral}`

  window.location.href =
    `https://go.auth.moi/oauth2/authorize` +
    `?client_id=${clientId}` +
    `&response_type=code` +
    `&scope=openid+offline_access+profile+email` +
    `&state=${state}` +
    `&redirect_uri=${redirectUri}`
}
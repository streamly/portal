import CryptoJS from 'crypto-js'


let UUID: string | null = null


export async function getUserUUID() {
  if (UUID) {
    return UUID
  }

  try {
    const res = await fetch("https://api.ipify.org?format=json")
    if (!res.ok) throw new Error("Failed to fetch IP")

    const { ip } = await res.json()
    if (!ip) return null

    const hash = CryptoJS.MD5(ip).toString(CryptoJS.enc.Hex)

    UUID = hash

    return hash
  } catch (err) {
    console.error("Failed to get IP hash:", err)
    return null
  }
}
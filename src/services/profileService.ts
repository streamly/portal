import { getToken } from "../auth"

export async function updateProfile(metadata: Record<string, string>) {
  const token = await getToken()

  const res = await fetch("/api/user", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
    body: JSON.stringify(metadata),
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new Error(errBody.error || "Profile update failed")
  }

  return res.json().then(parsed => parsed.data)
}
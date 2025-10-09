export async function fetchProfileData() {
  const res = await fetch("/api/user", { credentials: "include" })
  if (!res.ok) throw new Error(`Profile fetch failed: ${res.status}`)
  const data = await res.json()
  return data?.profile || null
}

export async function updateProfile(metadata) {
  const res = await fetch("/api/user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ metadata }),
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new Error(errBody.error || "Profile update failed")
  }

  return res.json()
}

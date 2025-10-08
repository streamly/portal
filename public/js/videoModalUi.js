import { getVideo } from "./videoData.js"
import { pauseVideo } from './videoPlayer.js'

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return "0 minutes"
  const minutes = Math.round(seconds / 60)
  return `${minutes} minute${minutes !== 1 ? "s" : ""}`
}

function formatUnixTimestamp(timestamp) {
  const date = new Date(timestamp * 1000)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  const h = String(date.getHours()).padStart(2, "0")
  const min = String(date.getMinutes()).padStart(2, "0")
  return `${y}-${m}-${d} ${h}:${min}`
}

export function initVideoModalUi() {
  $(document).on("click", ".play", function () {
    const { id } = $(this).data()
    const data = getVideo(id)
    if (!data) {
      console.warn("No video found for id:", id)
      return
    }

    const modal = new mdb.Modal(document.getElementById("videoModal"))
    modal.show()

    $(".video-title").text(data.title || "")
    $(".video-description").text(data.description || "")
    $(".video-channel").text(data.channel || "")
    $(".video-people").text(data.people || "N/A")
    $(".video-duration").text(formatDuration(data.duration))
    $(".video-created").text(formatUnixTimestamp(data.created))

    document.dispatchEvent(new CustomEvent("video:open", { detail: data }))
  })

  $("#videoModal").on("hidden.bs.modal", function () {
    pauseVideo()
    $(document).attr("title", document.querySelector(".portal-name")?.textContent || "Syndinet")
  })
}
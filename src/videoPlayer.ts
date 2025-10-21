import videojs from 'video.js'
import 'video.js/dist/video-js.min.css'
import { getVideo } from "./videoData"
import $ from 'jquery'

const player = videojs("player", { autoplay: true, muted: false, controls: true })

export function initVideoPlayer() {
  $(document).on("click", ".play", function () {
    const { id } = $(this).data()
    const data = getVideo(id)
    if (!data) {
      console.warn("Video not found for id:", id)
      return
    }

    const title = decodeURIComponent(data.title || "Untitled")
    const channel = decodeURIComponent(data.channel || "Unknown")

    $(document).attr("title", `${title} - ${channel}`)

    player.src({
      src: `https://cdn.tubie.cx/${data.id}/playlist.m3u8`,
      type: "application/x-mpegURL",
    })

    player.play()?.catch(err => console.warn("Autoplay blocked:", err))

    document.dispatchEvent(new CustomEvent("tracking:play", { detail: data }))
  })

  return player
}


export function pauseVideo() {
  player.pause()
}

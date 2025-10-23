import videojs from 'video.js'
import 'video.js/dist/video-js.min.css'
import type { VideoHit } from './types'

const player = videojs('player', {
  autoplay: true,
  muted: false,
  controls: true,
})

export function loadVideo(data: VideoHit) {
  if (!data?.id) return

  const title = decodeURIComponent(data.title || 'Untitled')
  const channel = decodeURIComponent(data.channel || 'Unknown')
  document.title = `${title} - ${channel}`

  player.src({
    src: `https://cdn.tubie.cx/${data.id}/playlist.m3u8`,
    type: 'application/x-mpegURL',
  })

  player.play()?.catch(err => console.warn('Autoplay blocked:', err))
  document.dispatchEvent(new CustomEvent('tracking:play', { detail: data }))
}

export function pauseVideo() {
  player.pause()
}

export function stopVideo() {
  try {
    player.pause()
    player.currentTime(0)
    player.reset()
    player.tech(false)
  } catch (err) {
    console.error('Failed to stop video:', err)
  }
}

export function getPlayer() {
  return player
}
import { type VideoHit } from './types'

const videoStore = new Map<string, VideoHit>()

export function saveVideo(hit: VideoHit) {
  if (!hit || !hit.id) return
  videoStore.set(hit.id, hit)
}

export function saveVideos(hits: VideoHit[]) {
  console.log('Video hits', hits)
  hits.forEach(saveVideo)
}

export function getVideo(id: string) {
  return videoStore.get(id)
}

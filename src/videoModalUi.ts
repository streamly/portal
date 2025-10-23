import $ from 'jquery'
import { isUserAuthenticated, requireAuth } from './auth'
import type { VideoHit } from './types'
import { getVideo } from './videoData'
import { loadVideo, stopVideo } from './videoPlayer'
// @ts-expect-error
import * as mdb from 'mdb-ui-kit'

const modalElement = document.getElementById('videoModal') as HTMLElement
const modal = new mdb.Modal(modalElement)

function formatDuration(seconds: number) {
  if (!seconds || seconds <= 0) return '0 minutes'
  const minutes = Math.round(seconds / 60)
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`
}

function formatUnixTimestamp(timestamp: number) {
  const date = new Date(timestamp * 1000)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${h}:${min}`
}

function updateContactFormState() {
  const loggedIn = isUserAuthenticated()
  const $form = $('#contactForm')
  const $message = $form.find('#message')
  const $send = $form.find('#send')
  const $signin = $form.find("[data-action='signin']")

  $message.css({
    resize: 'none',
  })

  if (loggedIn) {
    $message
      .prop('disabled', false)
      .val('')
      .attr('placeholder', 'Enter your message')
    $send.show()
    $signin.hide()
  } else {
    $message
      .prop('disabled', true)
      .val('Please sign in to contact us')
    $send.hide()
    $signin
      .text('Sign In')
      .addClass('btn btn-secondary shadow-none')
      .show()
  }
}

export function initVideoModalUi() {
  $(document).on('click', '.play', async function () {
    const id = $(this).data('id') as string
    const isAuthenticated = isUserAuthenticated()
    const data = getVideo(id) as VideoHit | undefined
    if (!data) {
      console.warn('No video found for id:', id)
      return
    }

    if (data.gated && !isAuthenticated) {
      console.log('Video is gated')
      requireAuth()
      return
    }

    modal.show()

    $('.video-title').text(data.title || '')
    $('.video-description').text(data.description || '')
    $('.video-channel').text(data.channel || '')
    $('.video-people').text(data.people?.join(', ') || 'N/A')
    $('.video-duration').text(formatDuration(data.duration))
    $('.video-created').text(formatUnixTimestamp(data.created))

    updateContactFormState()
    loadVideo(data)

    document.dispatchEvent(new CustomEvent('video:open', { detail: data }))
  })

  modalElement.addEventListener('hide.mdb.modal', () => {
    stopVideo()
    document.title = document.querySelector('.portal-name')?.textContent || ''
  })

  $(document).on('click', '.jumbotron-play', function () {
    $('.play').first().trigger('click')
  })
}
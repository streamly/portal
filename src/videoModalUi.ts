import $ from 'jquery'
import { isUserAuthenticated, requireAuth } from './auth'
import type { VideoHit } from './types'
import { getVideo } from './videoData'
import { loadVideo, stopVideo } from './videoPlayer'
// @ts-expect-error
import * as mdb from 'mdb-ui-kit'
import { trackContactSubmit, trackVideoPlay } from './newRelic'

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

function updateContactFormState(videoData: VideoHit) {
  const loggedIn = isUserAuthenticated()
  const $form = $('#contactForm')
  const $message = $form.find('#message')
  const $send = $form.find('#send')
  const $signin = $form.find("[data-action='signin']")

  $message.css({ resize: 'none' })

  if (loggedIn) {
    $message
      .prop('disabled', false)
      .val('')
      .attr('placeholder', 'Enter your message')

    $send.show()
    $signin.hide()

    $form.off('submit').on('submit', function (e) {
      e.preventDefault()

      // @ts-expect-error — Parsley is attached via jQuery
      const parsley = $(this).parsley?.({ errorsMessagesDisabled: true })
      if (parsley && !parsley.isValid()) {
        parsley.validate()
        return
      }

      const message = $.trim($message.val() as string)
      if (!message) return

      trackContactSubmit(videoData, message)

      $message.prop('disabled', true).val('Your message has been sent. Thank you!')
      $send.prop('disabled', true)
      $signin.hide()
    })
  } else {
    $message
      .prop('disabled', true)
      .val('Please sign in to contact us')
      .attr('placeholder', '')
      .css('color', '#6c757d')

    $send.hide()

    $signin
      .off('click')
      .on('click', async function (e) {
        e.preventDefault()
        await requireAuth()
      })
      .text('Sign In')
      .removeClass()
      .addClass('btn btn-link shadow-none')
      .show()
  }
}

export function initVideoModalUi() {
  $(document).on('click', '.play', async function () {
    const id = $(this).data('id') as string
    const isAuthenticated = isUserAuthenticated()
    const videoData = getVideo(id) as VideoHit | undefined
    if (!videoData) {
      console.warn('No video found for id:', id)
      return
    }

    if (videoData.gated && !isAuthenticated) {
      console.log('Video is gated')
      requireAuth()
      return
    }

    await trackVideoPlay(videoData)

    modal.show()

    $('.video-title').text(videoData.title || '')
    $('.video-description').text(videoData.description || '')
    $('.video-channel').text(videoData.channel || '')
    $('.video-people').text(videoData.people?.join(', ') || 'N/A')
    $('.video-duration').text(formatDuration(videoData.duration))
    $('.video-created').text(formatUnixTimestamp(videoData.created))

    updateContactFormState(videoData)
    loadVideo(videoData)

    if (isAuthenticated) {
      trackContactSubmit(videoData)
    }

    document.dispatchEvent(new CustomEvent('video:open', { detail: videoData }))
  })

  modalElement.addEventListener('hide.mdb.modal', () => {
    stopVideo()
    document.title = document.querySelector('.portal-name')?.textContent || ''
  })

  $(document).on('click', '.jumbotron-play', function () {
    $('.play').first().trigger('click')
  })
}
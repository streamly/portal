import instantsearch from 'instantsearch.js'
import * as widgets from 'instantsearch.js/es/widgets'
import $ from 'jquery'
import TypesenseInstantSearchAdapter from 'typesense-instantsearch-adapter'
import { type VideoHit } from './types'
import { saveVideo, saveVideos } from "./videoData"


async function getCookieValue(name: string) {
  try {
    const cookie = await cookieStore.get(name)
    return cookie?.value || null
  } catch (err) {
    console.error("Failed to read cookie via cookieStore:", err)
    return null
  }
}

function decodeHTMLEntities(str = "") {
  const textarea = document.createElement("textarea")
  textarea.innerHTML = str
  return textarea.value
}

function duration(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

function getTimestamps() {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000
  return {
    today,
    yesterday: today - 86400,
    startOfWeek: today - now.getDay() * 86400,
    startOfMonth: new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000,
  }
}

function renderHit(hit: VideoHit) {
  const template = document.getElementById("video-hit-template") as HTMLTemplateElement
  if (!template) {
    return ""
  }

  const clone = template.content.firstElementChild?.cloneNode(true) as HTMLElement

  if (!clone) {
    console.error("Missing template node")
    return ""
  }

  for (const [key, value] of Object.entries(hit)) {
    const val = Array.isArray(value) ? value.join("; ") : value
    clone.setAttribute(`data-${key}`, encodeURIComponent(String(val ?? "")))
  }

  const title = decodeHTMLEntities(hit.title || "")
  clone.querySelector("h6")!.textContent = title
  clone.querySelector("h6")!.title = title

  const thumb = clone.querySelector(".thumbnail-container")!
  thumb.setAttribute("alt", title)
  thumb.setAttribute("title", title);
  (thumb.querySelector(".thumbnail-background") as HTMLElement).style.backgroundImage = `url('https://img.syndinet.com/${hit.id}')`

  clone.querySelector(".duration")!.textContent = duration(hit.duration)

  const channelList = Array.isArray(hit.channel) ? hit.channel.join("; ") : (hit.channel || "")
  clone.querySelector(".channel-list")!.textContent = channelList

  const gatedEl = clone.querySelector(".gated")!
  if (hit.gated) {
    gatedEl.remove()
  }

  return clone.outerHTML
}

function updateJumbotron(hit: VideoHit) {
  $(".jumbotron-image").css({
    background:
      `linear-gradient(to right,rgba(0,0,0,0.95) 0%,rgba(0,0,0,0.4) 40%,rgba(0,0,0,0.1) 65%,rgba(255,255,255,0) 100%),` +
      `url('https://img.syndinet.com/${hit.id}') no-repeat center center`,
    "background-size": "cover",
  })
  $(".jumbotron-channel").text(hit.channel)
  $(".jumbotron-title").text(hit.title)
  $(".jumbotron-description").text(hit.description)
  $(".jumbotron-duration").text(duration(hit.duration))
}

function autoLoadMoreObserver() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
          const btn = entry.target as HTMLButtonElement
          if (!btn.disabled && btn.offsetParent !== null) {
            btn.click()
          }
        }
      })
    },
    { threshold: [0.5] }
  )

  const watchLoadMoreButton = () => {
    const btn = document.querySelector(".ais-InfiniteHits-loadMore")
    if (btn) {
      observer.observe(btn)
    } else {
      setTimeout(watchLoadMoreButton, 300)
    }
  }

  watchLoadMoreButton()
}

export async function initSearch() {
  const apiKey = await getCookieValue("apiKey")
  if (!apiKey) {
    console.error("Missing apiKey cookie — cannot initialize search")
    return
  }

  const { today, yesterday, startOfWeek, startOfMonth } = getTimestamps()

  const adapter = new TypesenseInstantSearchAdapter({
    server: {
      apiKey,
      nodes: [{ host: "t1.tubie.cx", port: 443, protocol: "https" }],
    },
    additionalSearchParameters: {
      query_by: "title,company,people,description,tags",
    },
  })

  const search = instantsearch({
    indexName: "videos",
    searchClient: adapter.searchClient,
    routing: false,
    searchFunction(helper) {
      if (helper.state.page === 0) window.scrollTo({ top: 0, behavior: "auto" })
      helper.search()
    },
  })

  search.addWidgets([
    widgets.configure({
      hitsPerPage: 12
    }),
    widgets.searchBox({
      container: "#searchbox",
      placeholder: "Search",
      autofocus: true,
      showReset: true,
      showSubmit: true,
    }),

    widgets.refinementList({
      container: "#channel-filter",
      attribute: "channel",
      searchable: true,
      searchablePlaceholder: "Search companies",
      limit: 30,
      templates: {
        item(data) {
          return `<label><input type="checkbox" ${data.isRefined ? "checked" : ""
            } /> ${decodeHTMLEntities(data.label)} (${data.count})</label>`
        },
      },
    }),

    widgets.numericMenu({
      container: "#duration-filter",
      attribute: "duration",
      items: [
        { label: "Any" },
        { label: "Under 4 minutes", start: 1, end: 239 },
        { label: "4 - 20 minutes", start: 240, end: 1199 },
        { label: "Over 20 minutes", start: 1200 },
      ],
    }),

    widgets.numericMenu({
      container: "#created-filter",
      attribute: "created",
      items: [
        { label: "All", start: 0 },
        { label: "Today", start: today },
        { label: "Yesterday", start: yesterday, end: today },
        { label: "This Week", start: startOfWeek },
        { label: "This Month", start: startOfMonth },
      ],
    }),

    widgets.infiniteHits({
      container: "#hits",
      transformItems(items) {
        saveVideos(items)
        return items.map((item, index) => ({
          ...item,
          resultPosition: index + 1,
        }))
      },
      templates: {
        item(hit) {
          if (hit.__position === 1) {
            // @ts-expect-error
            updateJumbotron(hit)
          }
          saveVideo(hit)
          // @ts-expect-error
          return renderHit(hit)
        },
      },
    }),
  ])

  search.start()

  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.get("v")) {
    const v = urlParams.get("v")
    search!.helper!.setQuery("").setQueryParameter("filters", `id:${v}`).search()
    setTimeout(() => {
      $("#videoModal").data("shared", 1)
      $(".play").first().trigger("click")
    }, 1000)
  }

  $(document).on("click", "#reload", () => search!.helper!.setQuery("").search())
  $(document).on("click", "#clear", (e) => {
    e.preventDefault()
    search!.helper!.clearRefinements().search()
  })

  autoLoadMoreObserver()
}
import $ from 'jquery'
import "parsleyjs"
import { isUserAuthenticated, requireAuth } from './auth'


function ensureSessionKey() {
  if (!sessionStorage.getItem("UUID")) {
    sessionStorage.setItem("UUID", crypto.randomUUID())
  }
}

function enableContactForm() {
  $("#message").prop("disabled", false)
  $("#message").focus()
}

export function initVideoContactUi() {
  $(document).on("click", "#contact", async function (event) {
    if (!(await isUserAuthenticated())) {
      event.preventDefault()

      return
    }

    ensureSessionKey()
    enableContactForm()

  })

  $(document).on("submit", "#contactForm", async function (event) {
    event.preventDefault()

    await requireAuth()

    const form = $(this)
    if (!form.length) {
      console.warn("Contact form not found")
      return
    }


    // @ts-expect-error
    if (form.parsley().isValid()) {
      alert("Your message was sent. Thank you!")
      form[0].reset()
      $(".offcanvas.show .btn-close").trigger("click")
      form.removeData("token")
    } else {
      $(".parsley-error").css("border", "1px solid red")
    }
  })

  document.addEventListener("contact:enable", async function () {
    if (!(await isUserAuthenticated())) {
      enableContactForm()
    }
  })
}

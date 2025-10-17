// @ts-nocheck
import { isLoggedIn, requireAuth } from "./auth"
import $ from 'jquery'

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
  $(document).on("click", "#contact", function (event) {
    if (!isLoggedIn()) {
      event.preventDefault()
      requireAuth({ action: "submit-contact" })
      return
    }

    ensureSessionKey()
    enableContactForm()

    const token = CryptoJS.AES.encrypt($(this).data("guid"), sessionStorage.getItem("UUID")).toString()
    $("#contactForm").data("token", token)
  })

  $(document).on("submit", "#contactForm", function (event) {
    event.preventDefault()
    if (!isLoggedIn()) {
      requireAuth({ action: "submit-contact" })
      return
    }

    const form = $(this)
    if (!form.length) {
      console.warn("Contact form not found")
      return
    }

    if (form.parsley().isValid()) {
      newrelic?.addPageAction?.("CONTACT", {
        message: $.trim($("#message").val()),
      })
      alert("Your message was sent. Thank you!")
      form[0].reset()
      $(".offcanvas.show .btn-close").trigger("click")
      form.removeData("token")
    } else {
      $(".parsley-error").css("border", "1px solid red")
      alert("Please complete all fields.")
    }
  })

  document.addEventListener("contact:enable", () => {
    if (isLoggedIn()) enableContactForm()
  })
}

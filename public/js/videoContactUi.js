export function initVideoContactUi() {
  $(document).on("click", "#contact", function () {
    if (!sessionStorage.getItem("UUID")) {
      sessionStorage.setItem("UUID", crypto.randomUUID())
    }
    const token = CryptoJS.AES.encrypt($(this).data("guid"), sessionStorage.getItem("UUID")).toString()
    $("#send").data("token", token)
  })

  $(document).on("click", "#send", function () {
    const form = $("#contact")
    if (form.parsley().isValid()) {
      newrelic?.addPageAction?.("CONTACT", {
        message: $.trim($("#message").val()),
      })
      alert("Your message was sent. Thank you!")
      $("#contactForm")[0].reset()
      $(".offcanvas.show .btn-close").trigger("click")
      $("#send").removeData("token")
    } else {
      $(".parsley-error").css("border", "1px solid red")
      alert("Please complete all fields.")
    }
  })
}
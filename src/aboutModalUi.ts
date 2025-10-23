import $ from 'jquery'
// @ts-expect-error
import * as mdb from 'mdb-ui-kit'

const aboutModalElement = document.getElementById('aboutModal')!
const aboutModal = new mdb.Modal(aboutModalElement)

export function initAboutModalUi() {
  $(document).on('click', "[data-action='about']", function (event) {
    event.preventDefault()
    aboutModal.show()
    document.dispatchEvent(new CustomEvent('about:open'))
  })

  aboutModalElement.addEventListener('hide.mdb.modal', () => {
    document.dispatchEvent(new CustomEvent('about:close'))
  })
}
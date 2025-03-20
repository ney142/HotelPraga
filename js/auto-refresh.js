// Script para refrescar automáticamente las páginas
document.addEventListener("DOMContentLoaded", () => {
  // Configurar el tiempo de recarga (2 minutos = 120000 ms)
  const refreshTime = 120000

  // Guardar la posición de desplazamiento actual
  let scrollPosition = 0

  // Función para guardar el estado actual antes de recargar
  function saveCurrentState() {
    // Guardar la posición de desplazamiento
    scrollPosition = window.scrollY

    // Guardar la posición en sessionStorage
    sessionStorage.setItem("scrollPosition", scrollPosition)

    // Guardar cualquier dato de formulario no guardado
    const forms = document.querySelectorAll("form")
    forms.forEach((form, index) => {
      const formData = new FormData(form)
      const formDataObj = {}

      for (const [key, value] of formData.entries()) {
        formDataObj[key] = value
      }

      if (Object.keys(formDataObj).length > 0) {
        sessionStorage.setItem(`formData_${index}`, JSON.stringify(formDataObj))
      }
    })

    // Recargar la página
    window.location.reload()
  }

  // Función para restaurar el estado después de recargar
  function restoreState() {
    // Restaurar la posición de desplazamiento
    const savedPosition = sessionStorage.getItem("scrollPosition")
    if (savedPosition) {
      window.scrollTo(0, Number.parseInt(savedPosition))
      sessionStorage.removeItem("scrollPosition")
    }

    // Restaurar datos de formulario
    const forms = document.querySelectorAll("form")
    forms.forEach((form, index) => {
      const savedFormData = sessionStorage.getItem(`formData_${index}`)
      if (savedFormData) {
        const formDataObj = JSON.parse(savedFormData)

        for (const key in formDataObj) {
          const input = form.elements[key]
          if (input) {
            input.value = formDataObj[key]
          }
        }

        sessionStorage.removeItem(`formData_${index}`)
      }
    })
  }

  // Configurar el temporizador para recargar la página
  const refreshTimer = setTimeout(saveCurrentState, refreshTime)

  // Restaurar el estado si es necesario
  restoreState()

  // Reiniciar el temporizador si el usuario interactúa con la página
  const resetTimer = () => {
    clearTimeout(refreshTimer)
    setTimeout(saveCurrentState, refreshTime)
  }

  // Eventos que reinician el temporizador
  document.addEventListener("click", resetTimer)
  document.addEventListener("keypress", resetTimer)
  document.addEventListener("scroll", resetTimer)
  document.addEventListener("mousemove", resetTimer)
})


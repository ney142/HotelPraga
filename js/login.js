document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm")

  // Inicializar usuarios predeterminados si no existen
  initializeDefaultUsers()

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault()

    const username = document.getElementById("username").value
    const password = document.getElementById("password").value

    // Obtener todos los usuarios
    const users = JSON.parse(localStorage.getItem("users") || "[]")

    // Buscar usuario que coincida
    const user = users.find((u) => u.username === username && u.password === password)

    if (user) {
      // Guardar datos de usuario en localStorage
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
        }),
      )

      // Redirigir al dashboard
      window.location.href = "dashboard.html"
    } else {
      // Mostrar mensaje de error
      alert("Credenciales inválidas. Por favor, verifique su usuario y contraseña.")
    }
  })

  // Función para inicializar usuarios predeterminados
  function initializeDefaultUsers() {
    let users = JSON.parse(localStorage.getItem("users") || "[]")

    // Si no hay usuarios, crear los predeterminados
    if (users.length === 0) {
      users = [
        {
          id: "admin123",
          username: "admin",
          password: "admin123456",
          name: "Administrador",
          email: "admin@hotel.com",
          role: "admin",
        },
        {
          id: "admin456",
          username: "administrador",
          password: "Corra1012*",
          name: "Administrador Principal",
          email: "administrador@hotel.com",
          role: "admin",
        },
        {
          id: "recep123",
          username: "recepcionista1",
          password: "recepcionista123",
          name: "Recepcionista",
          email: "recepcion@hotel.com",
          role: "recepcionista",
        },
      ]

      localStorage.setItem("users", JSON.stringify(users))
    } else {
      // Verificar si ya existe el usuario "administrador"
      const adminExists = users.some((user) => user.username === "administrador")

      // Si no existe, agregarlo
      if (!adminExists) {
        users.push({
          id: "admin456",
          username: "administrador",
          password: "Corra1012*",
          name: "Administrador Principal",
          email: "administrador@hotel.com",
          role: "admin",
        })

        localStorage.setItem("users", JSON.stringify(users))
      }
    }
  }
})


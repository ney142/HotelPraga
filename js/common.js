document.addEventListener("DOMContentLoaded", () => {
  // Check if user is logged in
  const user = JSON.parse(localStorage.getItem("user") || "{}")

  // If no user and not on login page, redirect to login
  if (!user.name && !window.location.href.includes("index.html")) {
    window.location.href = "index.html"
    return
  }

  // User menu toggle
  const userMenuTrigger = document.getElementById("userMenuTrigger")
  const userMenu = document.getElementById("userMenu")

  if (userMenuTrigger && userMenu) {
    // Update user info in the menu
    const userNameElement = userMenu.querySelector(".user-name")
    const userEmailElement = userMenu.querySelector(".user-email")
    const userRoleElement = userMenu.querySelector(".user-role")

    if (userNameElement) userNameElement.textContent = user.name || "Usuario"
    if (userEmailElement) userEmailElement.textContent = user.email || "usuario@hotel.com"
    if (userRoleElement) userRoleElement.textContent = user.role === "admin" ? "Administrador" : "Recepcionista"

    // Toggle menu on click
    userMenuTrigger.addEventListener("click", () => {
      userMenu.classList.toggle("show")
    })

    // Close menu when clicking outside
    document.addEventListener("click", (e) => {
      if (!userMenuTrigger.contains(e.target) && !userMenu.contains(e.target)) {
        userMenu.classList.remove("show")
      }
    })
  }

  // Logout functionality
  const logoutBtn = document.querySelector(".logout-btn")
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault()
      localStorage.removeItem("user")
      window.location.href = "index.html"
    })
  }

  // Mobile menu
  const mobileMenuBtn = document.querySelector(".mobile-menu-btn")
  if (mobileMenuBtn) {
    const sidebar = document.querySelector(".sidebar")
    mobileMenuBtn.addEventListener("click", () => {
      sidebar.classList.toggle("show-mobile")
    })
  }

  // Tab functionality
  const tabTriggers = document.querySelectorAll(".tab-trigger")
  if (tabTriggers.length > 0) {
    tabTriggers.forEach((trigger) => {
      trigger.addEventListener("click", function () {
        // Remove active class from all triggers and contents
        document.querySelectorAll(".tab-trigger").forEach((t) => t.classList.remove("active"))
        document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"))

        // Add active class to clicked trigger
        this.classList.add("active")

        // Show corresponding content
        const tabId = this.getAttribute("data-tab")
        document.getElementById(tabId).classList.add("active")
      })
    })
  }

  // Notificaciones
  const notificationBadge = document.getElementById("notificationBadge")
  const notificationsPanel = document.getElementById("notificationsPanel")
  const closeNotifications = document.getElementById("closeNotifications")
  const notificationsList = document.getElementById("notificationsList")
  const notificationCount = document.getElementById("notificationCount")

  // Actualizar contador de notificaciones
  function updateNotificationBadge() {
    const notifications = JSON.parse(localStorage.getItem("notifications") || "[]")
    const unreadCount = notifications.filter((n) => !n.read).length
    if (notificationCount) {
      notificationCount.textContent = unreadCount
      notificationCount.style.display = unreadCount > 0 ? "flex" : "none"
    }
  }

  // Agregar función para reiniciar notificaciones cuando un inquilino paga
  // Añadir esta función después de la función updateNotificationBadge
  function resetTenantNotification(tenantId) {
    if (!tenantId) return

    // Obtener la lista de inquilinos notificados
    const notifiedTenants = JSON.parse(localStorage.getItem("notifiedTenants") || "[]")

    // Eliminar este inquilino de la lista de notificados
    const updatedNotifiedTenants = notifiedTenants.filter((id) => id !== tenantId)

    // Guardar la lista actualizada
    localStorage.setItem("notifiedTenants", JSON.stringify(updatedNotifiedTenants))

    // También eliminar cualquier notificación existente para este inquilino
    const notifications = JSON.parse(localStorage.getItem("notifications") || "[]")
    const updatedNotifications = notifications.filter((n) => !(n.type === "payment" && n.relatedId === tenantId))

    if (notifications.length !== updatedNotifications.length) {
      localStorage.setItem("notifications", JSON.stringify(updatedNotifications))
      updateNotificationBadge()
    }
  }

  // Modificar la función para cargar notificaciones en el panel
  function loadNotifications() {
    if (!notificationsList) return

    const notifications = JSON.parse(localStorage.getItem("notifications") || "[]")
    notificationsList.innerHTML = ""

    if (notifications.length === 0) {
      notificationsList.innerHTML = '<div class="empty-state">No hay notificaciones</div>'
      return
    }

    // Ordenar notificaciones por fecha (más recientes primero)
    notifications.sort((a, b) => new Date(b.date) - new Date(a.date))

    // Agrupar notificaciones por tipo
    const groupedNotifications = {
      payment: [],
      checkout: [],
      system: [],
    }

    notifications.forEach((notification) => {
      // Verificar si la notificación tiene un relatedId y si ese objeto aún existe
      if (notification.relatedId) {
        if (notification.type === "payment") {
          // Verificar si el inquilino aún existe
          const tenants = JSON.parse(localStorage.getItem("tenants") || "[]")
          const tenantExists = tenants.some((t) => t.id === notification.relatedId && !t.hasPaid)

          if (!tenantExists) {
            // Si el inquilino ya no existe o ya pagó, no mostrar la notificación
            return
          }
        } else if (notification.type === "checkout") {
          // Verificar si el visitante aún existe
          const visitors = JSON.parse(localStorage.getItem("visitors") || "[]")
          const visitorExists = visitors.some((v) => v.id === notification.relatedId)

          // Si el visitante ya no existe, no mostrar la notificación
          if (!visitorExists) {
            return
          }
        }
      }

      if (groupedNotifications[notification.type]) {
        groupedNotifications[notification.type].push(notification)
      } else {
        groupedNotifications.system.push(notification)
      }
    })

    // Crear secciones para cada tipo de notificación
    const sections = [
      { type: "payment", title: "Pagos Pendientes", icon: "fa-money-bill-wave" },
      { type: "checkout", title: "Reservas Vencidas", icon: "fa-calendar-times" },
      { type: "system", title: "Sistema", icon: "fa-cog" },
    ]

    // Agregar botones de acción en la parte superior
    const actionButtons = document.createElement("div")
    actionButtons.className = "notification-actions"
    actionButtons.innerHTML = `
  <button class="btn btn-outline delete-read-notifications">
    <i class="fa-solid fa-trash"></i> Borrar leídas
  </button>
  <button class="btn btn-outline delete-all-notifications">
    <i class="fa-solid fa-trash-alt"></i> Borrar todas
  </button>
`
    notificationsList.appendChild(actionButtons)

    // Agregar separador
    const separator = document.createElement("div")
    separator.className = "notification-separator"
    notificationsList.appendChild(separator)

    sections.forEach((section) => {
      const notifications = groupedNotifications[section.type]
      if (notifications && notifications.length > 0) {
        // Crear encabezado de sección
        const sectionHeader = document.createElement("div")
        sectionHeader.className = "notification-section-header"
        sectionHeader.innerHTML = `
      <i class="fa-solid ${section.icon}"></i>
      <h3>${section.title} (${notifications.length})</h3>
    `
        notificationsList.appendChild(sectionHeader)

        // Agregar notificaciones de esta sección
        notifications.forEach((notification) => {
          const notificationItem = document.createElement("div")
          notificationItem.className = `notification-item ${notification.type} ${notification.read ? "read" : "unread"}`
          notificationItem.dataset.id = notification.id

          const date = new Date(notification.date)

          notificationItem.innerHTML = `
        <div class="notification-message">${notification.message}</div>
        <div class="notification-date">${date.toLocaleDateString()} ${date.toLocaleTimeString()}</div>
        <button class="notification-mark-read" data-id="${notification.id}" title="Marcar como leída">
          <i class="fa-solid fa-check"></i>
        </button>
        <button class="notification-delete" data-id="${notification.id}" title="Eliminar notificación">
          <i class="fa-solid fa-times"></i>
        </button>
      `

          notificationsList.appendChild(notificationItem)
        })
      }
    })

    // Agregar eventos para marcar como leídas
    document.querySelectorAll(".notification-mark-read").forEach((button) => {
      button.addEventListener("click", function (e) {
        e.stopPropagation()
        const notificationId = this.dataset.id
        markNotificationAsRead(notificationId)
      })
    })

    // Agregar eventos para eliminar notificaciones
    document.querySelectorAll(".notification-delete").forEach((button) => {
      button.addEventListener("click", function (e) {
        e.stopPropagation()
        const notificationId = this.dataset.id
        deleteNotification(notificationId)
      })
    })

    // Agregar evento para borrar todas las notificaciones leídas
    document.querySelector(".delete-read-notifications").addEventListener("click", () => {
      deleteReadNotifications()
    })

    // Agregar evento para borrar todas las notificaciones
    document.querySelector(".delete-all-notifications").addEventListener("click", () => {
      if (confirm("¿Está seguro de que desea eliminar todas las notificaciones?")) {
        deleteAllNotifications()
      }
    })

    // Agregar botón para marcar todas como leídas
    if (notifications.filter((n) => !n.read).length > 0) {
      const markAllButton = document.createElement("button")
      markAllButton.className = "btn btn-outline mark-all-read"
      markAllButton.innerHTML = '<i class="fa-solid fa-check-double"></i> Marcar todas como leídas'
      markAllButton.addEventListener("click", markAllNotificationsAsRead)
      notificationsList.appendChild(markAllButton)
    }
  }

  // Función para eliminar una notificación específica
  function deleteNotification(id) {
    const notifications = JSON.parse(localStorage.getItem("notifications") || "[]")

    // Encontrar la notificación antes de eliminarla
    const notificationToDelete = notifications.find((n) => n.id == id)

    // Eliminar la notificación
    const updatedNotifications = notifications.filter((n) => n.id != id)
    localStorage.setItem("notifications", JSON.stringify(updatedNotifications))

    // Si es una notificación de checkout, actualizar la lista de visitantes notificados
    if (notificationToDelete && notificationToDelete.type === "checkout" && notificationToDelete.relatedId) {
      // No eliminar de la lista de notificados para evitar que se regenere
      // Solo marcamos como leída para que no aparezca de nuevo
    }

    // Actualizar UI
    updateNotificationBadge()
    loadNotifications()

    // Mostrar mensaje de confirmación
    showToast("Notificación eliminada", "success")
  }

  // Función para eliminar todas las notificaciones leídas
  function deleteReadNotifications() {
    const notifications = JSON.parse(localStorage.getItem("notifications") || "[]")

    // Filtrar notificaciones leídas antes de eliminarlas
    const readNotifications = notifications.filter((n) => n.read)
    const unreadNotifications = notifications.filter((n) => !n.read)

    // Guardar solo las no leídas
    localStorage.setItem("notifications", JSON.stringify(unreadNotifications))

    // Actualizar UI
    updateNotificationBadge()
    loadNotifications()

    // Mostrar mensaje de confirmación
    showToast("Notificaciones leídas eliminadas", "success")
  }

  // Función para eliminar todas las notificaciones
  function deleteAllNotifications() {
    // Obtener todas las notificaciones antes de eliminarlas
    const notifications = JSON.parse(localStorage.getItem("notifications") || "[]")

    // Vaciar las notificaciones
    localStorage.setItem("notifications", JSON.stringify([]))

    // Actualizar UI
    updateNotificationBadge()
    loadNotifications()

    // Mostrar mensaje de confirmación
    showToast("Todas las notificaciones han sido eliminadas", "success")
  }

  // Función para mostrar un toast de confirmación
  function showToast(message, type = "info") {
    const toast = document.createElement("div")
    toast.className = `toast ${type}`
    toast.innerHTML = message
    document.body.appendChild(toast)

    // Eliminar el toast después de 3 segundos
    setTimeout(() => {
      toast.remove()
    }, 3000)
  }

  // Función para marcar todas las notificaciones como leídas
  function markAllNotificationsAsRead() {
    const notifications = JSON.parse(localStorage.getItem("notifications") || "[]")

    notifications.forEach((notification) => {
      notification.read = true
    })

    localStorage.setItem("notifications", JSON.stringify(notifications))

    // Actualizar UI
    updateNotificationBadge()
    loadNotifications()

    // Mostrar mensaje de confirmación
    showToast("Todas las notificaciones han sido marcadas como leídas", "success")
  }

  // Marcar notificación como leída
  function markNotificationAsRead(id) {
    const notifications = JSON.parse(localStorage.getItem("notifications") || "[]")
    const index = notifications.findIndex((n) => n.id == id)

    if (index !== -1) {
      notifications[index].read = true
      localStorage.setItem("notifications", JSON.stringify(notifications))

      // Actualizar UI
      updateNotificationBadge()
      loadNotifications()
    }
  }

  // Función para limpiar notificaciones antiguas
  function cleanupOldNotifications() {
    const notifications = JSON.parse(localStorage.getItem("notifications") || "[]")
    const currentTime = new Date().getTime()
    const oneWeekInMs = 7 * 24 * 60 * 60 * 1000 // 7 días en milisegundos
    const oneDayInMs = 24 * 60 * 60 * 1000 // 1 día en milisegundos

    // Filtrar notificaciones:
    // - Mantener todas las no leídas
    // - Eliminar leídas con más de 1 día de antigüedad
    // - Eliminar cualquier notificación con más de 1 semana de antigüedad
    const filteredNotifications = notifications.filter((notification) => {
      const notificationTime = new Date(notification.date).getTime()
      const age = currentTime - notificationTime

      // Mantener notificaciones no leídas con menos de una semana
      if (!notification.read && age < oneWeekInMs) {
        return true
      }

      // Mantener notificaciones leídas con menos de un día
      if (notification.read && age < oneDayInMs) {
        return true
      }

      return false
    })

    // Si se eliminaron notificaciones, actualizar localStorage
    if (filteredNotifications.length < notifications.length) {
      localStorage.setItem("notifications", JSON.stringify(filteredNotifications))
      updateNotificationBadge()
    }
  }

  // Ejecutar limpieza de notificaciones al cargar la página
  cleanupOldNotifications()

  // Configurar intervalo para limpiar notificaciones antiguas cada hora
  setInterval(cleanupOldNotifications, 60 * 60 * 1000)

  // Abrir panel de notificaciones
  if (notificationBadge) {
    notificationBadge.addEventListener("click", () => {
      loadNotifications()
      notificationsPanel.classList.add("show")
    })
  }

  // Cerrar panel de notificaciones
  if (closeNotifications) {
    closeNotifications.addEventListener("click", () => {
      notificationsPanel.classList.remove("show")
    })
  }

  // Actualizar contador de notificaciones al cargar la página
  updateNotificationBadge()

  // Crear usuario (solo para administradores)
  const createUserBtn = document.getElementById("createUserBtn")
  const createUserModal = document.getElementById("createUserModal")
  const closeUserModal = document.getElementById("closeUserModal")
  const createUserForm = document.getElementById("createUserForm")

  // Mostrar/ocultar botón de crear usuario según el rol
  if (createUserBtn) {
    // Solo mostrar para administradores
    if (user.role !== "admin") {
      createUserBtn.style.display = "none"
    } else {
      createUserBtn.addEventListener("click", () => {
        if (createUserModal) {
          createUserModal.style.display = "block"
        }
      })
    }
  }

  // Cerrar modal de crear usuario
  if (closeUserModal) {
    closeUserModal.addEventListener("click", () => {
      if (createUserModal) {
        createUserModal.style.display = "none"
      }
    })
  }

  // Formulario de crear usuario
  if (createUserForm) {
    createUserForm.addEventListener("submit", (e) => {
      e.preventDefault()

      const formData = new FormData(createUserForm)
      const newUser = {
        id: Date.now(),
        username: formData.get("username"),
        password: formData.get("password"), // En una aplicación real, esto debería encriptarse
        name: formData.get("name"),
        email: formData.get("email"),
        role: formData.get("role"),
      }

      // Guardar usuario en localStorage
      const users = JSON.parse(localStorage.getItem("users") || "[]")
      users.push(newUser)
      localStorage.setItem("users", JSON.stringify(users))

      // Cerrar modal y mostrar mensaje
      if (createUserModal) {
        createUserModal.style.display = "none"
      }

      alert(`Usuario ${newUser.username} creado correctamente`)
      createUserForm.reset()
    })
  }

  // Verificar y actualizar el estado de las habitaciones basado en las fechas de checkout
  // Mejorar la función checkRoomStatus para que actualice correctamente el estado de las habitaciones
  function checkRoomStatus() {
    const now = new Date()
    const storedVisitors = JSON.parse(localStorage.getItem("visitors") || "[]")
    const storedRooms = JSON.parse(localStorage.getItem("rooms") || "[]")

    let roomsUpdated = false

    storedVisitors.forEach((visitor) => {
      const checkOutDate = new Date(visitor.checkOut)
      if (checkOutDate < now) {
        // La reserva ha vencido, actualizar estado de la habitación
        const roomIndex = storedRooms.findIndex((r) => r.number === visitor.roomNumber)
        if (roomIndex !== -1 && storedRooms[roomIndex].status === "occupied") {
          // Verificar si el ocupante coincide con este visitante
          if (storedRooms[roomIndex].occupant === visitor.name) {
            storedRooms[roomIndex].status = "available"
            storedRooms[roomIndex].occupant = null
            roomsUpdated = true
            console.log(`Habitación ${visitor.roomNumber} liberada: reserva de ${visitor.name} ha vencido`)
          }
        }
      }
    })

    if (roomsUpdated) {
      localStorage.setItem("rooms", JSON.stringify(storedRooms))
      console.log("Estado de habitaciones actualizado desde common.js")
    }
  }

  // Ejecutar verificación al cargar la página
  checkRoomStatus()

  // Configurar intervalo para verificar el estado de las habitaciones cada minuto
  setInterval(checkRoomStatus, 60000)

  // Agregar estilos CSS para notificaciones leídas/no leídas y secciones
  const style = document.createElement("style")
  style.textContent = `
  .notification-item.unread {
    border-left: 3px solid #ef4444;
    background-color: rgba(239, 68, 68, 0.1);
  }
  .notification-item.read {
    opacity: 0.7;
  }
  .notification-mark-read {
    position: absolute;
    top: 5px;
    right: 5px;
    background: none;
    border: none;
    color: var(--gold);
    cursor: pointer;
  }
  .notification-item {
    position: relative;
    padding-right: 25px;
    margin-bottom: 10px;
    border-radius: 4px;
    padding: 10px;
    background-color: #111;
  }
  .notification-section-header {
    display: flex;
    align-items: center;
    margin: 15px 0 10px 0;
    padding-bottom: 5px;
    border-bottom: 1px solid rgba(var(--gold), 0.3);
  }
  .notification-section-header i {
    margin-right: 10px;
    color: var(--gold);
  }
  .notification-section-header h3 {
    font-size: 14px;
    font-weight: 600;
    color: var(--light-gray);
    margin: 0;
  }
  .mark-all-read {
    width: 100%;
    margin-top: 15px;
    font-size: 12px;
  }
  .toast {
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 10px 20px;
    border-radius: 4px;
    color: white;
    z-index: 1000;
    animation: fadeIn 0.3s, fadeOut 0.3s 2.7s;
  }
  .toast.success {
    background-color: #10b981;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeOut {
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(20px); }
  }
  .notification-actions {
    display: flex;
    gap: 10px;
    margin-bottom: 10px;
    justify-content: flex-end;
  }
  .notification-separator {
    border-bottom: 1px solid rgba(var(--gold), 0.3);
    margin-bottom: 10px;
  }
  .notification-delete {
    position: absolute;
    top: 5px;
    right: 30px;
    background: none;
    border: none;
    color: var(--gold);
    cursor: pointer;
  }
`
  document.head.appendChild(style)
})

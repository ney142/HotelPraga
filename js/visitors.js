document.addEventListener("DOMContentLoaded", () => {
  // Load data from localStorage
  let visitors = JSON.parse(localStorage.getItem("visitors") || "[]")
  const rooms = JSON.parse(localStorage.getItem("rooms") || "[]")

  // DOM elements
  const visitorForm = document.getElementById("visitorForm")
  const floorSelect = document.getElementById("floor")
  const roomSelect = document.getElementById("roomNumber")
  const visitorsTable = document.getElementById("visitorsTable")
  const emptyVisitors = document.getElementById("emptyVisitors")

  // Initialize the visitors table
  updateVisitorsTable()

  // Reemplazar completamente el evento de cambio del selector de pisos con esta versión mejorada
  floorSelect.addEventListener("change", function () {
    const selectedFloor = Number.parseInt(this.value)

    // Obtener las habitaciones actualizadas directamente desde localStorage
    const currentRooms = JSON.parse(localStorage.getItem("rooms") || "[]")

    // Limpiar y deshabilitar el selector de habitaciones inicialmente
    roomSelect.innerHTML = ""
    roomSelect.disabled = true

    // Si no hay piso seleccionado, mostrar mensaje predeterminado
    if (!selectedFloor) {
      roomSelect.innerHTML = '<option value="">Seleccione piso primero</option>'
      return
    }

    // Filtrar habitaciones disponibles para el piso seleccionado
    const availableRooms = currentRooms.filter((room) => room.floor === selectedFloor && room.status === "available")

    console.log(`Piso ${selectedFloor}: Encontradas ${availableRooms.length} habitaciones disponibles`)

    // Si no hay habitaciones disponibles, mostrar mensaje
    if (availableRooms.length === 0) {
      roomSelect.innerHTML = '<option value="">No hay habitaciones disponibles en este piso</option>'
      return
    }

    // Agregar opción predeterminada
    roomSelect.innerHTML = '<option value="">Seleccione habitación</option>'

    // Agregar opciones de habitaciones disponibles
    availableRooms.forEach((room) => {
      const option = document.createElement("option")
      option.value = room.number
      option.textContent = `Habitación ${room.number} (${room.type})`
      roomSelect.appendChild(option)
    })

    // Habilitar el selector de habitaciones
    roomSelect.disabled = false
  })

  // Form submit event
  visitorForm.addEventListener("submit", function (e) {
    e.preventDefault()

    // Get form data
    const formData = new FormData(this)
    const visitorData = {
      id: visitors.length > 0 ? Math.max(...visitors.map((v) => v.id)) + 1 : 1,
      name: formData.get("name"),
      documentId: formData.get("documentId"),
      phone: formData.get("phone"),
      roomNumber: formData.get("roomNumber"),
      checkIn: formData.get("checkIn"),
      checkOut: formData.get("checkOut"),
      payment: Number.parseFloat(formData.get("payment")) || 0,
      createdAt: new Date().toISOString(),
    }

    // Add visitor to array
    visitors.push(visitorData)

    // Update room status
    const roomIndex = rooms.findIndex((room) => room.number === visitorData.roomNumber)
    if (roomIndex !== -1) {
      rooms[roomIndex].status = "occupied"
      rooms[roomIndex].occupant = visitorData.name
      localStorage.setItem("rooms", JSON.stringify(rooms))
    }

    // Save to localStorage
    localStorage.setItem("visitors", JSON.stringify(visitors))

    // Update table
    updateVisitorsTable()

    // Reset form
    this.reset()
    roomSelect.innerHTML = '<option value="">Seleccione piso primero</option>'
    roomSelect.disabled = true

    // Show success message
    alert("Visitante registrado correctamente")

    // Verificar reservas vencidas
    checkExpiredReservations()
  })

  function updateVisitorsTable() {
    // Get visitors from localStorage
    visitors = JSON.parse(localStorage.getItem("visitors") || "[]")

    // Check if there are visitors
    if (visitors.length === 0) {
      if (visitorsTable) visitorsTable.style.display = "none"
      if (emptyVisitors) emptyVisitors.style.display = "flex"
      return
    }

    // Show table and hide empty state
    if (visitorsTable) visitorsTable.style.display = "table"
    if (emptyVisitors) emptyVisitors.style.display = "none"

    // Clear table body
    const tableBody = visitorsTable.querySelector("tbody")
    tableBody.innerHTML = ""

    // Add visitors to table
    visitors.forEach((visitor) => {
      const row = document.createElement("tr")

      // Format dates
      const checkInDate = new Date(visitor.checkIn).toLocaleString()
      const checkOutDate = new Date(visitor.checkOut).toLocaleString()

      row.innerHTML = `
        <td>${visitor.id}</td>
        <td>${visitor.name}</td>
        <td>${visitor.documentId}</td>
        <td>${visitor.phone}</td>
        <td>${visitor.roomNumber}</td>
        <td>${checkInDate}</td>
        <td>${checkOutDate}</td>
        <td class="font-medium" style="color: var(--gold)">$${visitor.payment.toFixed(2)}</td>
        <td>
          <button class="btn btn-outline" style="padding: 0.25rem; width: 2rem; height: 2rem;" onclick="printInvoice(${visitor.id})">
            <i class="fa-solid fa-print"></i>
          </button>
        </td>
      `

      tableBody.appendChild(row)
    })
  }

  // Función para verificar reservas vencidas
  function checkExpiredReservations() {
    const now = new Date()
    const notifications = JSON.parse(localStorage.getItem("notifications") || "[]")
    let hasNewNotifications = false

    // Crear un conjunto de IDs de reservas que ya tienen notificaciones
    // Esto incluye tanto notificaciones activas como las que fueron eliminadas
    const notifiedVisitorIds = new Set()

    // Obtener IDs de visitantes que ya han sido notificados
    const notifiedVisitors = JSON.parse(localStorage.getItem("notifiedVisitors") || "[]")
    notifiedVisitors.forEach((id) => notifiedVisitorIds.add(id))

    visitors.forEach((visitor) => {
      const checkOutDate = new Date(visitor.checkOut)
      if (checkOutDate < now) {
        // Verificar si ya existe una notificación para esta reserva o si ya fue notificada antes
        const existingNotification = notifications.find((n) => n.type === "checkout" && n.relatedId === visitor.id)
        const wasNotifiedBefore = notifiedVisitorIds.has(visitor.id)

        if (!existingNotification && !wasNotifiedBefore) {
          // Crear nueva notificación solo si nunca ha sido notificada
          notifications.push({
            id: Date.now() + Math.random(),
            type: "checkout",
            message: `La reserva de ${visitor.name} ha vencido`,
            date: now.toISOString(),
            relatedId: visitor.id,
            read: false,
          })

          // Agregar a la lista de visitantes notificados
          notifiedVisitors.push(visitor.id)
          hasNewNotifications = true
        }

        // Actualizar estado de la habitación
        const roomIndex = rooms.findIndex((room) => room.number === visitor.roomNumber)
        if (roomIndex !== -1 && rooms[roomIndex].status === "occupied") {
          rooms[roomIndex].status = "available"
          rooms[roomIndex].occupant = null
          localStorage.setItem("rooms", JSON.stringify(rooms))
        }
      }
    })

    if (hasNewNotifications) {
      localStorage.setItem("notifications", JSON.stringify(notifications))
      localStorage.setItem("notifiedVisitors", JSON.stringify(notifiedVisitors))
      updateNotificationBadge()
    }
  }

  // Función para actualizar el contador de notificaciones
  function updateNotificationBadge() {
    const notifications = JSON.parse(localStorage.getItem("notifications") || "[]")
    const badge = document.getElementById("notificationCount")
    if (badge) {
      badge.textContent = notifications.length
      badge.style.display = notifications.length > 0 ? "flex" : "none"
    }
  }

  // Modificar la función printInvoice para generar un archivo TXT en lugar de PDF
  window.printInvoice = (id) => {
    const visitor = visitors.find((v) => v.id === id)
    if (!visitor) return

    // Crear contenido del recibo en formato texto plano
    const receiptContent = `
==============================================
                HOTEL ADMIN
            RECIBO DE VISITANTE
==============================================

INFORMACIÓN DEL VISITANTE
-------------------------
Nombre: ${visitor.name}
Documento: ${visitor.documentId}
Teléfono: ${visitor.phone}

DETALLES DE ESTANCIA
-------------------
Habitación: ${visitor.roomNumber}
Fecha de Ingreso: ${new Date(visitor.checkIn).toLocaleString()}
Fecha de Salida: ${new Date(visitor.checkOut).toLocaleString()}

==============================================
TOTAL A PAGAR: $${visitor.payment.toFixed(2)}
==============================================

Gracias por su visita. ¡Esperamos verle de nuevo pronto!

Recibo generado el ${new Date().toLocaleString()}
==============================================
`

    // Crear un blob con el contenido del texto
    const blob = new Blob([receiptContent], { type: "text/plain" })

    // Crear un URL para el blob
    const url = URL.createObjectURL(blob)

    // Crear un enlace para descargar el archivo
    const a = document.createElement("a")
    a.href = url
    a.download = `Recibo_${visitor.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.txt`

    // Añadir el enlace al documento y hacer clic en él
    document.body.appendChild(a)
    a.click()

    // Limpiar
    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 0)
  }

  // Función para exportar a Excel
  window.exportToExcel = () => {
    if (!visitors.length) {
      alert("No hay datos para exportar")
      return
    }

    // Preparar datos para exportar
    const dataToExport = visitors.map((visitor) => ({
      ID: visitor.id,
      Nombre: visitor.name,
      Documento: visitor.documentId,
      Teléfono: visitor.phone,
      Habitación: visitor.roomNumber,
      "Fecha de Ingreso": new Date(visitor.checkIn).toLocaleString(),
      "Fecha de Salida": new Date(visitor.checkOut).toLocaleString(),
      Pago: visitor.payment,
    }))

    // Crear tabla HTML para exportar
    let html = "<table>"

    // Encabezados
    html += "<tr>"
    for (const key in dataToExport[0]) {
      html += `<th>${key}</th>`
    }
    html += "</tr>"

    // Datos
    dataToExport.forEach((row) => {
      html += "<tr>"
      for (const key in row) {
        html += `<td>${row[key]}</td>`
      }
      html += "</tr>"
    })

    html += "</table>"

    // Crear un elemento temporal
    const tempElement = document.createElement("div")
    tempElement.innerHTML = html

    // Crear un libro de Excel
    const wb = XLSX.utils.table_to_book(tempElement.querySelector("table"))

    // Guardar como archivo Excel
    XLSX.writeFile(wb, "Visitantes.xlsx")

    alert("Exportación completada")
  }

  // Agregar una función de depuración para verificar el estado de las habitaciones
  function debugRooms() {
    const allRooms = JSON.parse(localStorage.getItem("rooms") || "[]")
    console.log("Total de habitaciones:", allRooms.length)

    // Agrupar por piso
    const roomsByFloor = {}
    allRooms.forEach((room) => {
      if (!roomsByFloor[room.floor]) {
        roomsByFloor[room.floor] = { total: 0, available: 0 }
      }
      roomsByFloor[room.floor].total++
      if (room.status === "available") {
        roomsByFloor[room.floor].available++
      }
    })

    console.log("Habitaciones por piso:", roomsByFloor)
  }

  // Verificar reservas vencidas al cargar la página
  checkExpiredReservations()
  updateNotificationBadge()

  // Ejecutar la función de depuración al cargar la página
  debugRooms()

  // Añadir función para agregar filtros
  function addFilterContainer() {
    const tableContainer = visitorsTable.closest(".table-container")
    let filterContainer = tableContainer.querySelector(".search-filter-container")

    if (!filterContainer) {
      filterContainer = document.createElement("div")
      filterContainer.className = "search-filter-container"
      filterContainer.innerHTML = `
        <div class="search-box">
          <input type="text" id="visitorSearch" placeholder="Buscar visitante...">
          <button class="search-button"><i class="fa-solid fa-search"></i></button>
        </div>
        <div class="filter-dropdowns">
          <select id="roomFilter" class="filter-select">
            <option value="all">Todas las habitaciones</option>
            <option value="1">Piso 1</option>
            <option value="2">Piso 2</option>
            <option value="3">Piso 3</option>
            <option value="4">Piso 4</option>
          </select>
          <select id="dateFilter" class="filter-select">
            <option value="all">Todas las fechas</option>
            <option value="today">Hoy</option>
            <option value="week">Esta semana</option>
            <option value="month">Este mes</option>
          </select>
        </div>
      `
      tableContainer.insertBefore(filterContainer, visitorsTable)

      // Agregar eventos a los filtros
      const searchInput = document.getElementById("visitorSearch")
      const roomFilter = document.getElementById("roomFilter")
      const dateFilter = document.getElementById("dateFilter")

      searchInput.addEventListener("input", filterVisitors)
      roomFilter.addEventListener("change", filterVisitors)
      dateFilter.addEventListener("change", filterVisitors)
    }
  }

  // Función para filtrar visitantes
  function filterVisitors() {
    const searchTerm = document.getElementById("visitorSearch").value.toLowerCase()
    const roomFilter = document.getElementById("roomFilter").value
    const dateFilter = document.getElementById("dateFilter").value

    const rows = document.querySelectorAll("#visitorsTable tbody tr")
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay())

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

    rows.forEach((row) => {
      const name = row.cells[1].textContent.toLowerCase()
      const room = row.cells[4].textContent.trim()
      const floorPrefix = room.charAt(0)
      const dateStr = row.cells[5].textContent // Fecha de ingreso
      const date = new Date(dateStr)

      const matchesSearch = name.includes(searchTerm)
      const matchesRoom = roomFilter === "all" || floorPrefix === roomFilter

      // Filtrar por fecha
      let matchesDate = true
      if (dateFilter === "today") {
        matchesDate = date >= today
      } else if (dateFilter === "week") {
        matchesDate = date >= weekStart
      } else if (dateFilter === "month") {
        matchesDate = date >= monthStart
      }

      if (matchesSearch && matchesRoom && matchesDate) {
        row.style.display = ""
      } else {
        row.style.display = "none"
      }
    })

    // Mostrar mensaje si no hay resultados
    const visibleRows = document.querySelectorAll('#visitorsTable tbody tr:not([style*="display: none"])')
    const emptyResults = document.getElementById("emptyResults")

    if (visibleRows.length === 0) {
      if (!emptyResults) {
        const tableContainer = document.querySelector(".table-container")
        const noResultsDiv = document.createElement("div")
        noResultsDiv.id = "emptyResults"
        noResultsDiv.className = "empty-state"
        noResultsDiv.textContent = "No se encontraron visitantes con los filtros seleccionados"
        tableContainer.appendChild(noResultsDiv)
      } else {
        emptyResults.style.display = "flex"
      }
      visitorsTable.style.display = "none"
    } else {
      if (emptyResults) {
        emptyResults.style.display = "none"
      }
      visitorsTable.style.display = "table"
    }
  }

  // Modificar la función updateVisitorsTable para agregar los filtros
  const originalUpdateVisitorsTable = updateVisitorsTable
  updateVisitorsTable = () => {
    originalUpdateVisitorsTable()

    // Añadir los filtros después de cargar la tabla
    addFilterContainer()
  }

  // Ejecutar inmediatamente para la carga inicial
  updateVisitorsTable()
})

/* global XLSX */
// Esta línea indica que XLSX es una variable global, evitando el error de redeclaración


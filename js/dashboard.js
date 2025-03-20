document.addEventListener("DOMContentLoaded", () => {
  // Load data from localStorage or initialize if not exists
  const visitors = JSON.parse(localStorage.getItem("visitors") || "[]")
  const tenants = JSON.parse(localStorage.getItem("tenants") || "[]")
  const rooms = JSON.parse(localStorage.getItem("rooms") || "[]")
  const expenses = JSON.parse(localStorage.getItem("expenses") || "[]")

  // If rooms are empty, initialize with default data
  if (rooms.length === 0) {
    initializeRooms()
  } else {
    // Verificar si ya existen habitaciones del piso 4
    const hasFourthFloor = rooms.some((room) => room.floor === 4)

    // Si no existen, añadir las habitaciones del piso 4
    if (!hasFourthFloor) {
      addFourthFloor()
    }
  }

  // Update dashboard stats
  updateDashboardStats()

  // Actualizar cada minuto
  setInterval(updateDashboardStats, 60000)

  function initializeRooms() {
    const defaultRooms = []

    // Create rooms for 4 floors
    for (let floor = 1; floor <= 4; floor++) {
      for (let room = 1; room <= 10; room++) {
        // Modificado a 10 habitaciones por piso
        const roomNumber = `${floor}${room < 10 ? "0" : ""}${room}`
        let roomType = "Individual"

        // Assign room types
        if (room % 3 === 0) {
          roomType = "Suite"
        } else if (room % 2 === 0) {
          roomType = "Doble"
        }

        // Calculate price based on floor and type
        let price = 80 // Base price for Individual
        if (roomType === "Doble") price = 120
        if (roomType === "Suite") price = 200

        // Increase price for higher floors
        price += (floor - 1) * 10

        defaultRooms.push({
          id: defaultRooms.length + 1,
          number: roomNumber,
          floor: floor,
          type: roomType,
          status: "available",
          occupant: null,
          pricePerNight: price,
        })
      }
    }

    // Save to localStorage
    localStorage.setItem("rooms", JSON.stringify(defaultRooms))
  }

  // Función para añadir habitaciones del piso 4 si no existen
  function addFourthFloor() {
    const existingRooms = JSON.parse(localStorage.getItem("rooms") || "[]")
    const newRooms = []

    // Obtener el ID más alto existente
    const maxId = existingRooms.length > 0 ? Math.max(...existingRooms.map((r) => r.id)) : 0

    // Crear habitaciones para el piso 4
    for (let room = 1; room <= 10; room++) {
      const roomNumber = `4${room < 10 ? "0" : ""}${room}`
      let roomType = "Individual"

      // Assign room types
      if (room % 3 === 0) {
        roomType = "Suite"
      } else if (room % 2 === 0) {
        roomType = "Doble"
      }

      // Calculate price based on floor and type
      let price = 80 // Base price for Individual
      if (roomType === "Doble") price = 120
      if (roomType === "Suite") price = 200

      // Increase price for higher floors (piso 4)
      price += 3 * 10

      newRooms.push({
        id: maxId + newRooms.length + 1,
        number: roomNumber,
        floor: 4,
        type: roomType,
        status: "available",
        occupant: null,
        pricePerNight: price,
      })
    }

    // Añadir las nuevas habitaciones a las existentes
    const updatedRooms = [...existingRooms, ...newRooms]

    // Guardar en localStorage
    localStorage.setItem("rooms", JSON.stringify(updatedRooms))

    // Mostrar notificación
    const notifications = JSON.parse(localStorage.getItem("notifications") || "[]")
    notifications.push({
      id: Date.now() + Math.random(),
      type: "system",
      message: "Se han añadido 10 nuevas habitaciones en el piso 4",
      date: new Date().toISOString(),
      read: false,
    })
    localStorage.setItem("notifications", JSON.stringify(notifications))

    // Actualizar contador de notificaciones
    const badge = document.getElementById("notificationCount")
    if (badge) {
      const unreadCount = notifications.filter((n) => !n.read).length
      badge.textContent = unreadCount
      badge.style.display = unreadCount > 0 ? "flex" : "none"
    }
  }

  function updateDashboardStats() {
    // Get active visitors (those whose checkout date hasn't passed)
    const activeVisitors = visitors.filter((visitor) => {
      const checkOut = new Date(visitor.checkOut)
      return checkOut > new Date()
    })

    // Get active tenants (those who haven't been marked as contract cancelled)
    const activeTenants = tenants.filter((tenant) => !tenant.contractCancelled)

    // Get stats elements
    const visitorsElement = document.querySelector(".stats-grid .stat-value:nth-of-type(1)")
    const tenantsElement = document.querySelector(".stats-grid .stat-value:nth-of-type(2)")
    const roomsElement = document.querySelector(".stats-grid .stat-value:nth-of-type(3)")
    const expensesElement = document.querySelector(".stats-grid .stat-value:nth-of-type(4)")

    // Get rooms data
    const availableRooms = rooms.filter((room) => room.status === "available")

    // Update stats
    if (visitorsElement) visitorsElement.textContent = activeVisitors.length
    if (tenantsElement) tenantsElement.textContent = activeTenants.length
    if (roomsElement) roomsElement.textContent = availableRooms.length

    // Calculate total expenses for current month
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()

    // Obtener nombre del mes actual
    const monthNames = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ]
    const currentMonthName = monthNames[currentMonth]

    const monthlyExpenses = expenses
      .filter((expense) => {
        const expenseDate = new Date(expense.date)
        return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear
      })
      .reduce((total, expense) => total + Number.parseFloat(expense.amount), 0)

    if (expensesElement) {
      // Actualizar con el nombre del mes y el total
      expensesElement.textContent = `$${monthlyExpenses.toFixed(2)}`

      // Agregar el nombre del mes como un elemento adicional
      const expensesCard = expensesElement.closest(".stat-card")
      const monthElement = expensesCard.querySelector(".current-month")

      if (!monthElement) {
        const monthSpan = document.createElement("span")
        monthSpan.className = "current-month"
        monthSpan.style.fontSize = "0.75rem"
        monthSpan.style.display = "block"
        monthSpan.style.textAlign = "center"
        monthSpan.style.marginTop = "0.25rem"
        monthSpan.textContent = currentMonthName
        expensesElement.parentNode.appendChild(monthSpan)
      } else {
        monthElement.textContent = currentMonthName
      }
    }

    // Update room occupancy progress bar
    const progressBar = document.querySelector(".progress")
    const percentageElement = document.querySelector(".percentage")

    if (progressBar && percentageElement && rooms.length > 0) {
      const occupancyRate = Math.round(((rooms.length - availableRooms.length) / rooms.length) * 100)
      progressBar.style.width = `${occupancyRate}%`
      percentageElement.textContent = `${occupancyRate}%`

      // Update room stats
      const occupiedElement = document.querySelector(".room-stats .room-stat:nth-child(1) .room-stat-value")
      const availableElement = document.querySelector(".room-stats .room-stat:nth-child(2) .room-stat-value")

      if (occupiedElement) occupiedElement.textContent = `${rooms.length - availableRooms.length} habitaciones`
      if (availableElement) availableElement.textContent = `${availableRooms.length} habitaciones`
    }

    // Update recent activity
    updateRecentActivity(activeVisitors, activeTenants)
  }

  function updateRecentActivity(activeVisitors, activeTenants) {
    const recentActivityContainer = document.querySelector(".dashboard-grid .card:nth-child(1) .card-content")
    if (!recentActivityContainer) return

    // Combine recent visitors and tenants
    const allActivity = [
      ...activeVisitors.map((v) => ({
        type: "visitor",
        id: v.id,
        name: v.name,
        room: v.roomNumber,
        date: new Date(v.createdAt),
      })),
      ...activeTenants.map((t) => ({
        type: "tenant",
        id: t.id,
        name: t.name,
        room: t.roomNumber,
        date: new Date(t.createdAt),
      })),
    ]

    // Sort by date (most recent first) and take top 5
    const recentActivity = allActivity.sort((a, b) => b.date - a.date).slice(0, 5)

    if (recentActivity.length === 0) {
      recentActivityContainer.innerHTML = '<div class="empty-state">No hay actividad reciente</div>'
      return
    }

    // Create table for recent activity
    const table = document.createElement("table")
    table.className = "data-table"

    // Create table header
    const thead = document.createElement("thead")
    thead.innerHTML = `
      <tr>
        <th>Tipo</th>
        <th>Nombre</th>
        <th>Habitación</th>
        <th>Fecha</th>
      </tr>
    `
    table.appendChild(thead)

    // Create table body
    const tbody = document.createElement("tbody")

    recentActivity.forEach((activity) => {
      const row = document.createElement("tr")
      row.innerHTML = `
        <td>${activity.type === "visitor" ? "Visitante" : "Inquilino"}</td>
        <td>${activity.name}</td>
        <td>${activity.room}</td>
        <td>${activity.date.toLocaleDateString()}</td>
      `
      tbody.appendChild(row)
    })

    table.appendChild(tbody)

    // Clear and update container
    recentActivityContainer.innerHTML = ""
    recentActivityContainer.appendChild(table)
  }

  // Verificar y actualizar el estado de las habitaciones basado en las fechas de checkout
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
      console.log("Estado de habitaciones actualizado desde dashboard.js")
      
      // Actualizar las estadísticas del dashboard si estamos en esa página
      updateDashboardStats();
    }
  }

  // Ejecutar verificación al cargar la página
  checkRoomStatus()

  // Configurar intervalo para verificar el estado de las habitaciones cada minuto
  setInterval(checkRoomStatus, 60000)

  // Verificar si es un nuevo mes y reiniciar contadores si es necesario
  function checkNewMonth() {
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()

    // Obtener la última fecha de reinicio
    const lastReset = localStorage.getItem("lastMonthlyReset")

    if (lastReset) {
      const lastResetDate = new Date(lastReset)
      const lastResetMonth = lastResetDate.getMonth()
      const lastResetYear = lastResetDate.getFullYear()

      // Si estamos en un mes diferente al último reinicio
      if (currentMonth !== lastResetMonth || currentYear !== lastResetYear) {
        // Guardar los datos del mes anterior antes de reiniciar
        saveMonthlyData(lastResetMonth, lastResetYear)

        // Actualizar la fecha de último reinicio
        localStorage.setItem("lastMonthlyReset", currentDate.toISOString())
      }
    } else {
      // Primera ejecución, establecer la fecha de reinicio
      localStorage.setItem("lastMonthlyReset", currentDate.toISOString())
    }
  }

  // Guardar datos mensuales para informes históricos
  function saveMonthlyData(month, year) {
    const monthlyData = {
      month,
      year,
      visitors: JSON.parse(localStorage.getItem("visitors") || "[]").filter((v) => {
        const date = new Date(v.createdAt)
        return date.getMonth() === month && date.getFullYear() === year
      }),
      tenants: JSON.parse(localStorage.getItem("tenants") || "[]").filter((t) => {
        const date = new Date(t.createdAt)
        return date.getMonth() === month && date.getFullYear() === year
      }),
      expenses: JSON.parse(localStorage.getItem("expenses") || "[]").filter((e) => {
        const date = new Date(e.date)
        return date.getMonth() === month && date.getFullYear() === year
      }),
      shifts: JSON.parse(localStorage.getItem("shifts") || "[]").filter((s) => {
        const date = new Date(s.date)
        return date.getMonth() === month && date.getFullYear() === year
      }),
    }

    // Calcular estadísticas mensuales
    const totalVisitors = monthlyData.visitors.length
    const totalTenants = monthlyData.tenants.length
    const visitorRevenue = monthlyData.visitors.reduce((total, v) => total + v.payment, 0)
    const tenantRevenue = monthlyData.tenants.reduce((total, t) => total + t.payment, 0)
    const totalRevenue = visitorRevenue + tenantRevenue
    const totalExpenses = monthlyData.expenses.reduce((total, e) => total + e.amount, 0)
    const netProfit = totalRevenue - totalExpenses

    // Agregar estadísticas al objeto
    monthlyData.stats = {
      totalVisitors,
      totalTenants,
      visitorRevenue,
      tenantRevenue,
      totalRevenue,
      totalExpenses,
      netProfit,
    }

    // Guardar datos históricos
    const historicalData = JSON.parse(localStorage.getItem("historicalData") || "[]")

    // Verificar si ya existe un registro para este mes/año
    const existingIndex = historicalData.findIndex((h) => h.month === month && h.year === year)

    if (existingIndex >= 0) {
      historicalData[existingIndex] = monthlyData
    } else {
      historicalData.push(monthlyData)
    }

    localStorage.setItem("historicalData", JSON.stringify(historicalData))
  }

  // Verificar nuevo mes al cargar
  checkNewMonth()

  // Verificar nuevo mes cada día a medianoche
  const now = new Date()
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const timeToMidnight = tomorrow - now

  setTimeout(() => {
    checkNewMonth()
    // Después de la primera ejecución, programar cada 24 horas
    setInterval(checkNewMonth, 24 * 60 * 60 * 1000)
  }, timeToMidnight)
})

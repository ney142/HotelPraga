document.addEventListener("DOMContentLoaded", () => {
  // Load rooms from localStorage or initialize if not exists
  let rooms = JSON.parse(localStorage.getItem("rooms") || "[]")

  if (rooms.length === 0) {
    initializeRooms()
    rooms = JSON.parse(localStorage.getItem("rooms") || "[]")
  } else {
    // Verificar si ya existen habitaciones del piso 4
    const hasFourthFloor = rooms.some((room) => room.floor === 4)

    // Si no existen, añadir las habitaciones del piso 4
    if (!hasFourthFloor) {
      addFourthFloor()
      rooms = JSON.parse(localStorage.getItem("rooms") || "[]")
    }
  }

  // Update room stats
  updateRoomStats()

  // Load rooms for each floor
  loadRoomsByFloor(1)

  // Tab click event
  const tabTriggers = document.querySelectorAll(".tab-trigger")
  tabTriggers.forEach((trigger) => {
    trigger.addEventListener("click", function () {
      const floor = this.getAttribute("data-tab").replace("floor", "")
      loadRoomsByFloor(Number.parseInt(floor))
    })
  })

  function initializeRooms() {
    const defaultRooms = []

    // Create rooms for 4 floors (modificado para incluir el piso 4)
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

  function updateRoomStats() {
    const totalRoomsElement = document.getElementById("totalRooms")
    const availableRoomsElement = document.getElementById("availableRooms")
    const occupiedRoomsElement = document.getElementById("occupiedRooms")

    if (totalRoomsElement && availableRoomsElement && occupiedRoomsElement) {
      const totalRooms = rooms.length
      const availableRooms = rooms.filter((room) => room.status === "available").length
      const occupiedRooms = totalRooms - availableRooms

      totalRoomsElement.textContent = totalRooms
      availableRoomsElement.textContent = availableRooms
      occupiedRoomsElement.textContent = occupiedRooms
    }
  }

  function loadRoomsByFloor(floor) {
    const roomsContainer = document.getElementById(`floor${floor}Rooms`)
    if (!roomsContainer) return

    // Clear container
    roomsContainer.innerHTML = ""

    // Filter rooms by floor
    const floorRooms = rooms.filter((room) => room.floor === floor)

    // Create room cards
    floorRooms.forEach((room) => {
      const roomCard = document.createElement("div")
      roomCard.className = `card room-card ${room.status}`

      const statusText = room.status === "available" ? "Disponible" : "Ocupada"
      const statusClass = room.status === "available" ? "available" : "occupied"

      roomCard.innerHTML = `
        <div class="room-card-header">
          <h3 class="room-number">Habitación ${room.number}</h3>
          <span class="room-status-badge ${statusClass}">${statusText}</span>
        </div>
        <p class="room-type">${room.type}</p>
        ${room.occupant ? `<p class="room-occupant">Ocupante: ${room.occupant}</p>` : ""}
      `

      roomsContainer.appendChild(roomCard)
    })
  }

  // Verificar y actualizar el estado de las habitaciones basado en las fechas de checkout
  function checkRoomStatus() {
    const now = new Date()
    const storedVisitors = JSON.parse(localStorage.getItem("visitors") || "[]")
    let roomsUpdated = false

    storedVisitors.forEach((visitor) => {
      const checkOutDate = new Date(visitor.checkOut)
      if (checkOutDate < now) {
        // La reserva ha vencido, actualizar estado de la habitación
        const roomIndex = rooms.findIndex((r) => r.number === visitor.roomNumber)
        if (roomIndex !== -1 && rooms[roomIndex].status === "occupied") {
          // Verificar si el ocupante coincide con este visitante
          if (rooms[roomIndex].occupant === visitor.name) {
            rooms[roomIndex].status = "available"
            rooms[roomIndex].occupant = null
            roomsUpdated = true
            console.log(`Habitación ${visitor.roomNumber} liberada: reserva de ${visitor.name} ha vencido`)
          }
        }
      }
    })

    if (roomsUpdated) {
      localStorage.setItem("rooms", JSON.stringify(rooms))
      console.log("Estado de habitaciones actualizado desde rooms.js")
      
      // Actualizar la visualización de las habitaciones si estamos en la página de habitaciones
      if (typeof updateRoomStats === 'function') {
        updateRoomStats();
        
        // Recargar la visualización del piso actual
        const activeTab = document.querySelector('.tab-trigger.active');
        if (activeTab) {
          const floor = activeTab.getAttribute('data-tab').replace('floor', '');
          loadRoomsByFloor(parseInt(floor));
        }
      }
    }
  }

  // Ejecutar verificación al cargar la página
  checkRoomStatus()

  // Configurar intervalo para verificar el estado de las habitaciones cada minuto
  setInterval(checkRoomStatus, 60000)

  // Agregar una función para verificar la integridad de los datos de las habitaciones
  function verifyRoomsData() {
    let rooms = JSON.parse(localStorage.getItem("rooms") || "[]")

    // Verificar si hay habitaciones
    if (rooms.length === 0) {
      console.warn("No hay habitaciones en localStorage. Inicializando...")
      initializeRooms()
      rooms = JSON.parse(localStorage.getItem("rooms") || "[]")
    }

    // Verificar si hay habitaciones con datos incorrectos
    const invalidRooms = rooms.filter(
      (room) => typeof room.floor !== "number" || !room.number || !room.status || !room.type,
    )

    if (invalidRooms.length > 0) {
      console.warn("Se encontraron habitaciones con datos incorrectos:", invalidRooms)
      // Corregir las habitaciones con datos incorrectos
      rooms = rooms.map((room) => {
        if (typeof room.floor !== "number") {
          room.floor = Number.parseInt(room.floor) || Number.parseInt(room.number.charAt(0)) || 1
        }
        if (!room.status) {
          room.status = "available"
        }
        if (!room.type) {
          room.type = "Individual"
        }
        return room
      })

      // Guardar las habitaciones corregidas
      localStorage.setItem("rooms", JSON.stringify(rooms))
      console.log("Habitaciones corregidas y guardadas.")
    }

    // Verificar si hay habitaciones para cada piso
    const floors = [1, 2, 3, 4]
    floors.forEach((floor) => {
      const floorRooms = rooms.filter((room) => room.floor === floor)
      if (floorRooms.length === 0) {
        console.warn(`No hay habitaciones para el piso ${floor}. Agregando...`)
        addRoomsForFloor(floor)
      }
    })

    console.log("Verificación de datos de habitaciones completada.")
  }

  // Función para agregar habitaciones para un piso específico
  function addRoomsForFloor(floor) {
    const rooms = JSON.parse(localStorage.getItem("rooms") || "[]")
    const newRooms = []

    // Obtener el ID más alto existente
    const maxId = rooms.length > 0 ? Math.max(...rooms.map((r) => r.id)) : 0

    // Crear habitaciones para el piso
    for (let room = 1; room <= 10; room++) {
      const roomNumber = `${floor}${room < 10 ? "0" : ""}${room}`
      let roomType = "Individual"

      // Asignar tipos de habitación
      if (room % 3 === 0) {
        roomType = "Suite"
      } else if (room % 2 === 0) {
        roomType = "Doble"
      }

      // Calcular precio basado en el piso y tipo
      let price = 80 // Precio base para Individual
      if (roomType === "Doble") price = 120
      if (roomType === "Suite") price = 200

      // Aumentar precio para pisos más altos
      price += (floor - 1) * 10

      newRooms.push({
        id: maxId + newRooms.length + 1,
        number: roomNumber,
        floor: floor,
        type: roomType,
        status: "available",
        occupant: null,
        pricePerNight: price,
      })
    }

    // Añadir las nuevas habitaciones a las existentes
    const updatedRooms = [...rooms, ...newRooms]

    // Guardar en localStorage
    localStorage.setItem("rooms", JSON.stringify(updatedRooms))

    console.log(`Se agregaron ${newRooms.length} habitaciones para el piso ${floor}.`)
  }

  // Ejecutar la verificación al cargar la página
  setTimeout(verifyRoomsData, 500)
})

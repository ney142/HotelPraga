document.addEventListener("DOMContentLoaded", () => {
  // Load data from localStorage
  let tenants = JSON.parse(localStorage.getItem("tenants") || "[]")
  const rooms = JSON.parse(localStorage.getItem("rooms") || "[]")

  // DOM elements
  const tenantForm = document.getElementById("tenantForm")
  const floorSelect = document.getElementById("floor")
  const roomSelect = document.getElementById("roomNumber")
  const tenantsTable = document.getElementById("tenantsTable")
  const emptyTenants = document.getElementById("emptyTenants")

  // Eliminar el grupo de estado de pago del formulario
  const paymentStatusGroup = document.querySelector(".form-group:has(#paymentStatus)")
  if (paymentStatusGroup) {
    paymentStatusGroup.remove()
  }

  // Initialize the tenants table
  updateTenantsTable()

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
  tenantForm.addEventListener("submit", function (e) {
    e.preventDefault()

    // Get form data
    const formData = new FormData(this)

    // Corregir el manejo de la fecha para evitar problemas de zona horaria
    const paymentDateInput = formData.get("paymentDate")
    let paymentDate

    if (paymentDateInput) {
      // Crear fecha a partir del input, que está en formato YYYY-MM-DD
      // y asegurarnos de que se mantenga la fecha correcta independientemente de la zona horaria
      const dateParts = paymentDateInput.split("-")
      paymentDate = new Date(
        Number.parseInt(dateParts[0]), // año
        Number.parseInt(dateParts[1]) - 1, // mes (0-11)
        Number.parseInt(dateParts[2]), // día
      )
    } else {
      paymentDate = new Date()
    }

    const tenantData = {
      id: tenants.length > 0 ? Math.max(...tenants.map((t) => t.id)) + 1 : 1,
      name: formData.get("name"),
      documentId: formData.get("documentId"),
      phone: formData.get("phone"),
      roomNumber: formData.get("roomNumber"),
      paymentDate: paymentDate.toISOString().split("T")[0], // Guardar solo la parte de la fecha YYYY-MM-DD
      payment: Number.parseFloat(formData.get("payment")),
      hasPaid: false,
      createdAt: new Date().toISOString(),
    }

    // Add tenant to array
    tenants.push(tenantData)

    // Update room status
    const roomIndex = rooms.findIndex((room) => room.number === tenantData.roomNumber)
    if (roomIndex !== -1) {
      rooms[roomIndex].status = "occupied"
      rooms[roomIndex].occupant = tenantData.name
      localStorage.setItem("rooms", JSON.stringify(rooms))
    }

    // Save to localStorage
    localStorage.setItem("tenants", JSON.stringify(tenants))

    // Update table
    updateTenantsTable()

    // Reset form
    this.reset()
    roomSelect.innerHTML = '<option value="">Seleccione piso primero</option>'
    roomSelect.disabled = true

    // Show success message
    alert("Inquilino registrado correctamente")

    // Verificar pagos pendientes y crear notificaciones
    checkOverduePayments()
  })

  // Modificar la función updateTenantsTable para mejorar la tabla de registros de inquilinos
  function updateTenantsTable() {
    // Get tenants from localStorage
    tenants = JSON.parse(localStorage.getItem("tenants") || "[]")

    // Check if there are tenants
    if (tenants.length === 0) {
      if (tenantsTable) tenantsTable.style.display = "none"
      if (emptyTenants) emptyTenants.style.display = "flex"
      return
    }

    // Show table and hide empty state
    if (tenantsTable) tenantsTable.style.display = "table"
    if (emptyTenants) emptyTenants.style.display = "none"

    // Clear table body
    const tableBody = tenantsTable.querySelector("tbody")
    tableBody.innerHTML = ""

    // Get current user role
    const user = JSON.parse(localStorage.getItem("user") || "{}")
    const isAdmin = user.role === "admin"

    // Get current date for payment date validation
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Reset time to start of day for comparison

    // Agregar filtros y búsqueda
    const tableContainer = tenantsTable.closest(".table-container")
    let filterContainer = tableContainer.querySelector(".filter-container")

    // Actualizar las opciones del filtro de estado para incluir contratos cancelados
    // Buscar donde se crea el filterContainer y modificar el HTML:

    if (!filterContainer) {
      filterContainer = document.createElement("div")
      filterContainer.className = "filter-container"
      filterContainer.innerHTML = `
  <div class="search-box">
    <input type="text" id="tenantSearch" placeholder="Buscar inquilino...">
    <i class="fa-solid fa-search"></i>
  </div>
  <div class="filter-options">
    <select id="statusFilter">
      <option value="all">Todos los estados</option>
      <option value="active">Contratos activos</option>
      <option value="cancelled">Contratos cancelados</option>
      <option value="paid">Pagados</option>
      <option value="pending">Pendientes</option>
    </select>
    <select id="floorFilter">
      <option value="all">Todos los pisos</option>
      <option value="1">Piso 1</option>
      <option value="2">Piso 2</option>
      <option value="3">Piso 3</option>
      <option value="4">Piso 4</option>
    </select>
  </div>
`
      tableContainer.insertBefore(filterContainer, tenantsTable)

      // Agregar eventos a los filtros
      const searchInput = document.getElementById("tenantSearch")
      const statusFilter = document.getElementById("statusFilter")
      const floorFilter = document.getElementById("floorFilter")

      searchInput.addEventListener("input", filterTenants)
      statusFilter.addEventListener("change", filterTenants)
      floorFilter.addEventListener("change", filterTenants)
    }

    // Add tenants to table
    tenants.forEach((tenant) => {
      // Obtener la fecha de pago del inquilino
      // Corregir el manejo de la fecha para evitar problemas de zona horaria
      let paymentDateValue

      if (typeof tenant.paymentDate === "string") {
        if (tenant.paymentDate.includes("T")) {
          // Si es formato ISO completo
          paymentDateValue = new Date(tenant.paymentDate)
        } else {
          // Si es formato YYYY-MM-DD
          const dateParts = tenant.paymentDate.split("-")
          paymentDateValue = new Date(
            Number.parseInt(dateParts[0]), // año
            Number.parseInt(dateParts[1]) - 1, // mes (0-11)
            Number.parseInt(dateParts[2]), // día
          )
        }
      } else {
        paymentDateValue = new Date(tenant.paymentDate)
      }

      // Verificar si hoy es el día de pago mensual (mismo día del mes)
      const isSameDayOfMonth = today.getDate() === paymentDateValue.getDate()

      // Si es el mismo día del mes y el inquilino ya había pagado, reiniciar a pendiente
      if (isSameDayOfMonth && tenant.hasPaid) {
        // Solo reiniciar si no es el mismo mes y año (para evitar reiniciar el mismo mes)
        const isSameMonthAndYear =
          today.getMonth() === paymentDateValue.getMonth() && today.getFullYear() === paymentDateValue.getFullYear()

        if (!isSameMonthAndYear) {
          tenant.hasPaid = false
          tenant.paymentReceipt = null // Clear payment receipt

          // Actualizar la fecha de pago al mes actual
          const newPaymentDate = new Date(today)
          // Mantener el mismo día del mes
          newPaymentDate.setDate(paymentDateValue.getDate())
          // Si el día no existe en el mes actual (ej. 31 de febrero), se ajustará automáticamente
          tenant.paymentDate = newPaymentDate.toISOString().split("T")[0] // Guardar solo YYYY-MM-DD

          // Save changes to localStorage
          localStorage.setItem("tenants", JSON.stringify(tenants))

          // Create notification for payment due
          const notifications = JSON.parse(localStorage.getItem("notifications") || "[]")
          notifications.push({
            id: Date.now() + Math.random(),
            type: "payment",
            message: `El inquilino ${tenant.name} tiene un pago pendiente del mes actual`,
            date: today.toISOString(),
            relatedId: tenant.id,
            read: false,
          })
          localStorage.setItem("notifications", JSON.stringify(notifications))
          updateNotificationBadge()
        }
      }

      const row = document.createElement("tr")
      // Agregar el atributo data-contract-cancelled a la fila para aplicar estilos
      row.dataset.id = tenant.id
      row.dataset.name = tenant.name.toLowerCase()
      row.dataset.status = tenant.hasPaid ? "paid" : "pending"
      row.dataset.floor = tenant.roomNumber.charAt(0)
      row.dataset.contractCancelled = tenant.contractCancelled ? "true" : "false"

      // Format date - Corregir el formato de fecha para mostrar la fecha correcta
      let paymentDate

      if (typeof tenant.paymentDate === "string") {
        if (tenant.paymentDate.includes("T")) {
          // Si es formato ISO completo
          const date = new Date(tenant.paymentDate)
          paymentDate = `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`
        } else {
          // Si es formato YYYY-MM-DD
          const dateParts = tenant.paymentDate.split("-")
          paymentDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
        }
      } else {
        const date = new Date(tenant.paymentDate)
        paymentDate = `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`
      }

      // Verificar si la fecha de pago está próxima (dentro de 5 días)
      const paymentDueDate = new Date(paymentDateValue)
      const daysUntilPayment = Math.ceil((paymentDueDate - today) / (1000 * 60 * 60 * 24))
      const isPaymentSoon = !tenant.hasPaid && daysUntilPayment >= 0 && daysUntilPayment <= 5
      const isPaymentOverdue = !tenant.hasPaid && daysUntilPayment < 0

      // Create action buttons with better styling
      let actionButtons = ""

      // Si el contrato está cancelado, mostrar solo el botón de imprimir
      if (tenant.contractCancelled) {
        // Solo mostrar botón de imprimir
        actionButtons += `
  <button class="btn btn-outline" title="Imprimir recibo" onclick="printInvoice(${tenant.id})">
    <i class="fa-solid fa-print"></i>
  </button>`
      } else {
        // Toggle payment status button (solo visible si no está pagado Y tiene comprobante)
        if (!tenant.hasPaid) {
          // Si tiene comprobante, mostrar botón de confirmar pago activo
          if (tenant.paymentReceipt) {
            actionButtons += `
      <button class="btn btn-outline toggle-payment" title="Confirmar pago" data-id="${tenant.id}">
        <i class="fa-solid fa-check"></i>
      </button>`
          } else {
            // Si no tiene comprobante, mostrar botón deshabilitado
            actionButtons += `
      <button class="btn btn-outline" title="Suba el comprobante primero" disabled style="opacity: 0.5; cursor: not-allowed;">
        <i class="fa-solid fa-check"></i>
      </button>`
          }
        }

        // Upload receipt button (solo visible si no está pagado)
        if (!tenant.hasPaid) {
          actionButtons += `
    <label class="btn btn-outline" title="Subir comprobante" style="cursor: pointer;">
      <i class="fa-solid fa-upload"></i>
      <input type="file" class="payment-receipt" data-id="${tenant.id}" accept="image/*" style="display: none;">
    </label>`
        }

        // View receipt button (solo visible si existe un comprobante)
        if (tenant.paymentReceipt) {
          actionButtons += `
    <button class="btn btn-outline view-receipt" title="Ver comprobante" data-receipt="${tenant.id}">
      <i class="fa-solid fa-image"></i>
    </button>`
        }

        // Print invoice button (siempre visible)
        actionButtons += `
  <button class="btn btn-outline" title="Imprimir recibo" onclick="printInvoice(${tenant.id})">
    <i class="fa-solid fa-print"></i>
  </button>`

        // Cancel contract button (solo para administradores y si el contrato no está cancelado)
        if (isAdmin && !tenant.contractCancelled) {
          actionButtons += `
    <button class="btn btn-outline cancel-contract" title="Cancelar contrato" data-id="${tenant.id}">
      <i class="fa-solid fa-ban"></i>
    </button>`
        }
      }

      // Agregar clase para resaltar filas con pagos próximos o vencidos
      let rowClass = ""
      if (isPaymentOverdue) rowClass = "payment-overdue"
      else if (isPaymentSoon) rowClass = "payment-soon"

      row.className = rowClass

      // También necesitamos modificar la visualización de la fila para mostrar claramente que el contrato está cancelado
      // Buscar la parte donde se crea la celda de estado y modificarla así:

      // Modificar la celda de estado para mostrar si el contrato está cancelado
      let statusText = ""
      let statusClass = ""

      if (tenant.contractCancelled) {
        statusText = "Contrato cancelado"
        statusClass = "cancelled"
      } else {
        statusText = tenant.hasPaid ? "Pagado" : "Pendiente"
        statusClass = tenant.hasPaid ? "paid" : "pending"
      }

      row.innerHTML = `
    <td>${tenant.id}</td>
    <td>${tenant.name}</td>
    <td>${tenant.documentId}</td>
    <td>${tenant.phone}</td>
    <td>${tenant.roomNumber}</td>
    <td>
      ${paymentDate}
      ${isPaymentSoon && !tenant.contractCancelled ? `<span class="payment-badge soon">Próximo</span>` : ""}
      ${isPaymentOverdue && !tenant.contractCancelled ? `<span class="payment-badge overdue">Vencido</span>` : ""}
    </td>
    <td class="font-medium" style="color: var(--gold)">$${tenant.payment.toFixed(2)}</td>
    <td>
      <span class="payment-status ${statusClass}">
        ${statusText}
      </span>
    </td>
    <td>
      <div class="action-buttons" style="display: flex; flex-wrap: nowrap; gap: 5px; justify-content: center;">
        ${actionButtons}
      </div>
    </td>
  `

      tableBody.appendChild(row)
    })

    // Add event listeners for payment status toggle
    document.querySelectorAll(".toggle-payment").forEach((button) => {
      button.addEventListener("click", function () {
        const tenantId = Number(this.getAttribute("data-id"))
        togglePaymentStatus(tenantId)
      })
    })

    // Add event listeners for payment receipt upload
    document.querySelectorAll(".payment-receipt").forEach((input) => {
      input.addEventListener("change", function () {
        const tenantId = Number(this.getAttribute("data-id"))
        handlePaymentReceiptUpload(this.files[0], tenantId)
      })
    })

    // Add event listeners for viewing receipts
    document.querySelectorAll(".view-receipt").forEach((button) => {
      button.addEventListener("click", function () {
        const tenantId = Number(this.getAttribute("data-receipt"))
        viewPaymentReceipt(tenantId)
      })
    })

    // Add event listeners for cancelling contracts (admin only)
    document.querySelectorAll(".cancel-contract").forEach((button) => {
      button.addEventListener("click", function () {
        const tenantId = Number(this.getAttribute("data-id"))
        cancelContract(tenantId)
      })
    })
  }

  // Función para filtrar inquilinos
  // Modificar la función filterTenants para incluir filtrado por estado de contrato
  function filterTenants() {
    const searchTerm = document.getElementById("tenantSearch").value.toLowerCase()
    const statusFilter = document.getElementById("statusFilter").value
    const floorFilter = document.getElementById("floorFilter").value

    const rows = document.querySelectorAll("#tenantsTable tbody tr")

    rows.forEach((row) => {
      const name = row.dataset.name
      const status = row.dataset.status
      const floor = row.dataset.floor
      const contractCancelled = row.dataset.contractCancelled === "true"

      // Si el filtro de estado es "cancelled", mostrar solo los cancelados
      // Si es "active", mostrar solo los activos
      let matchesStatus = true
      if (statusFilter === "cancelled") {
        matchesStatus = contractCancelled
      } else if (statusFilter === "active") {
        matchesStatus = !contractCancelled
      } else if (statusFilter === "paid") {
        matchesStatus = status === "paid" && !contractCancelled
      } else if (statusFilter === "pending") {
        matchesStatus = status === "pending" && !contractCancelled
      }

      const matchesSearch = name.includes(searchTerm)
      const matchesFloor = floorFilter === "all" || floor === floorFilter

      if (matchesSearch && matchesStatus && matchesFloor) {
        row.style.display = ""
      } else {
        row.style.display = "none"
      }
    })

    // Mostrar mensaje si no hay resultados
    const visibleRows = document.querySelectorAll('#tenantsTable tbody tr:not([style*="display: none"])')
    const emptyResults = document.getElementById("emptyResults")

    if (visibleRows.length === 0) {
      if (!emptyResults) {
        const tableContainer = document.querySelector(".table-container")
        const noResultsDiv = document.createElement("div")
        noResultsDiv.id = "emptyResults"
        noResultsDiv.className = "empty-state"
        noResultsDiv.textContent = "No se encontraron inquilinos con los filtros seleccionados"
        tableContainer.appendChild(noResultsDiv)
      } else {
        emptyResults.style.display = "flex"
      }
      tenantsTable.style.display = "none"
    } else {
      if (emptyResults) {
        emptyResults.style.display = "none"
      }
      tenantsTable.style.display = "table"
    }
  }

  // Agregar estilos para la tabla mejorada
  const tableStyles = document.createElement("style")
  tableStyles.textContent = `
  .filter-container {
    display: flex;
    justify-content: space-between;
    margin-bottom: 15px;
    flex-wrap: wrap;
    gap: 10px;
  }
  
  .search-box {
    position: relative;
    flex: 1;
    min-width: 200px;
  }
  
  .search-box input {
    width: 100%;
    padding: 8px 30px 8px 10px;
    border-radius: 4px;
    border: 1px solid rgba(var(--gold), 0.3);
    background-color: #222;
    color: white;
  }
  
  .search-box i {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--gold);
  }
  
  .filter-options {
    display: flex;
    gap: 10px;
  }
  
  .filter-options select {
    padding: 8px;
    border-radius: 4px;
    border: 1px solid rgba(var(--gold), 0.3);
    background-color: #222;
    color: white;
  }
  
  .payment-badge {
    display: inline-block;
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 10px;
    margin-left: 5px;
    font-weight: bold;
  }
  
  .payment-badge.soon {
    background-color: #f59e0b;
    color: black;
  }
  
  .payment-badge.overdue {
    background-color: #ef4444;
    color: white;
  }
  
  tr.payment-overdue {
    background-color: rgba(239, 68, 68, 0.1);
  }
  
  tr.payment-soon {
    background-color: rgba(245, 158, 11, 0.1);
  }
`
  document.head.appendChild(tableStyles)

  function togglePaymentStatus(id) {
    const tenantIndex = tenants.findIndex((t) => t.id === id)
    if (tenantIndex === -1) return

    // Cambiar estado de pago
    tenants[tenantIndex].hasPaid = !tenants[tenantIndex].hasPaid

    // Guardar cambios
    localStorage.setItem("tenants", JSON.stringify(tenants))

    // Actualizar tabla
    updateTenantsTable()

    // Mostrar mensaje
    alert(`Estado de pago actualizado para ${tenants[tenantIndex].name}`)

    // Verificar pagos pendientes
    checkOverduePayments()
  }

  // Modificar la función handlePaymentReceiptUpload para que no marque como pagado automáticamente
  function handlePaymentReceiptUpload(file, tenantId) {
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const tenantIndex = tenants.findIndex((t) => t.id === tenantId)
      if (tenantIndex !== -1) {
        // Solo guardar el comprobante, no cambiar el estado de pago
        tenants[tenantIndex].paymentReceipt = e.target.result
        localStorage.setItem("tenants", JSON.stringify(tenants))
        updateTenantsTable()
        alert("Comprobante de pago subido correctamente. Ahora puede confirmar el pago.")
      }
    }
    reader.readAsDataURL(file)
  }

  function viewPaymentReceipt(tenantId) {
    const tenant = tenants.find((t) => t.id === tenantId)
    if (!tenant || !tenant.paymentReceipt) return

    // Crear modal para visualizar el recibo
    const modal = document.createElement("div")
    modal.className = "modal"
    modal.style.display = "block"
    modal.innerHTML = `
      <div class="modal-content">
        <span class="modal-close">&times;</span>
        <img src="${tenant.paymentReceipt}" alt="Comprobante de pago" style="max-width: 100%; height: auto;">
      </div>
    `

    document.body.appendChild(modal)

    // Cerrar modal al hacer clic en X
    modal.querySelector(".modal-close").onclick = () => {
      modal.remove()
    }

    // Cerrar modal al hacer clic fuera de la imagen
    modal.onclick = (event) => {
      if (event.target === modal) {
        modal.remove()
      }
    }
  }

  // Modificar la función cancelContract para mostrar un mensaje más claro
  function cancelContract(tenantId) {
    if (
      !confirm(
        "¿Está seguro de que desea cancelar el contrato? Esta acción liberará la habitación y no se puede deshacer.",
      )
    ) {
      return
    }

    const tenantIndex = tenants.findIndex((t) => t.id === tenantId)
    if (tenantIndex === -1) return

    const tenant = tenants[tenantIndex]

    // Marcar contrato como cancelado
    tenant.contractCancelled = true

    // Liberar habitación
    const roomIndex = rooms.findIndex((r) => r.number === tenant.roomNumber)
    if (roomIndex !== -1) {
      rooms[roomIndex].status = "available"
      rooms[roomIndex].occupant = null
    }

    // Guardar cambios
    localStorage.setItem("tenants", JSON.stringify(tenants))
    localStorage.setItem("rooms", JSON.stringify(rooms))

    // Actualizar tabla
    updateTenantsTable()

    // Mostrar notificación
    showToast(`Contrato cancelado para ${tenant.name}. La habitación ${tenant.roomNumber} está disponible.`, "success")
  }

  // Agregar función showToast si no existe
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

  // Función para verificar pagos pendientes
  function checkOverduePayments() {
    const today = new Date()
    const notifications = JSON.parse(localStorage.getItem("notifications") || "[]")
    let hasNewNotifications = false

    tenants.forEach((tenant) => {
      if (!tenant.contractCancelled && !tenant.hasPaid) {
        // Corregir el manejo de la fecha para evitar problemas de zona horaria
        let paymentDate

        if (typeof tenant.paymentDate === "string") {
          if (tenant.paymentDate.includes("T")) {
            // Si es formato ISO completo
            paymentDate = new Date(tenant.paymentDate)
          } else {
            // Si es formato YYYY-MM-DD
            const dateParts = tenant.paymentDate.split("-")
            paymentDate = new Date(
              Number.parseInt(dateParts[0]), // año
              Number.parseInt(dateParts[1]) - 1, // mes (0-11)
              Number.parseInt(dateParts[2]), // día
            )
          }
        } else {
          paymentDate = new Date(tenant.paymentDate)
        }

        if (paymentDate <= today) {
          // Verificar si ya existe una notificación para este inquilino
          const existingNotification = notifications.find((n) => n.type === "payment" && n.relatedId === tenant.id)

          if (!existingNotification) {
            // Crear nueva notificación
            notifications.push({
              id: Date.now() + Math.random(),
              type: "payment",
              message: `El inquilino ${tenant.name} tiene un pago pendiente`,
              date: today.toISOString(),
              relatedId: tenant.id,
              read: false,
            })
            hasNewNotifications = true
          }
        }
      }
    })

    if (hasNewNotifications) {
      localStorage.setItem("notifications", JSON.stringify(notifications))
      updateNotificationBadge()
      playNotificationSound()
    }
  }

  // Función para reproducir sonido de notificación
  function playNotificationSound() {
    try {
      const audio = new Audio("sounds/notification.mp3")
      audio.play()
    } catch (error) {
      console.error("Error al reproducir sonido de notificación:", error)
    }
  }

  // Función para actualizar el contador de notificaciones
  function updateNotificationBadge() {
    const notifications = JSON.parse(localStorage.getItem("notifications") || "[]")
    const unreadCount = notifications.filter((n) => !n.read).length
    const badge = document.getElementById("notificationCount")
    if (badge) {
      badge.textContent = unreadCount
      badge.style.display = unreadCount > 0 ? "flex" : "none"
    }
  }

  // Modificar la función printInvoice para generar un archivo TXT en lugar de PDF
  window.printInvoice = (id) => {
    const tenant = tenants.find((t) => t.id === id)
    if (!tenant) return

    // Corregir el manejo de la fecha para la factura
    let paymentDateStr

    if (typeof tenant.paymentDate === "string") {
      if (tenant.paymentDate.includes("T")) {
        // Si es formato ISO completo
        const date = new Date(tenant.paymentDate)
        paymentDateStr = `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`
      } else {
        // Si es formato YYYY-MM-DD
        const dateParts = tenant.paymentDate.split("-")
        paymentDateStr = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
      }
    } else {
      const date = new Date(tenant.paymentDate)
      paymentDateStr = `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`
    }

    // Crear contenido del recibo en formato texto plano
    const receiptContent = `
==============================================
                HOTEL ADMIN
            RECIBO DE INQUILINO
==============================================

INFORMACIÓN DEL INQUILINO
-------------------------
Nombre: ${tenant.name}
Documento: ${tenant.documentId}
Teléfono: ${tenant.phone}

DETALLES DE CONTRATO
-------------------
Habitación: ${tenant.roomNumber}
Fecha de Pago: ${paymentDateStr}
Estado de Pago: ${tenant.hasPaid ? "PAGADO" : "PENDIENTE"}

==============================================
TOTAL A PAGAR: $${tenant.payment.toFixed(2)}
==============================================

Gracias por elegir nuestro hotel.
¡Esperamos que su estancia sea placentera!

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
    a.download = `Recibo_${tenant.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.txt`

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
    if (!tenants.length) {
      alert("No hay datos para exportar")
      return
    }

    // Preparar datos para exportar
    const dataToExport = tenants.map((tenant) => {
      // Corregir el formato de fecha para Excel
      let paymentDateStr

      if (typeof tenant.paymentDate === "string") {
        if (tenant.paymentDate.includes("T")) {
          // Si es formato ISO completo
          const date = new Date(tenant.paymentDate)
          paymentDateStr = `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`
        } else {
          // Si es formato YYYY-MM-DD
          const dateParts = tenant.paymentDate.split("-")
          paymentDateStr = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
        }
      } else {
        const date = new Date(tenant.paymentDate)
        paymentDateStr = `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`
      }

      return {
        ID: tenant.id,
        Nombre: tenant.name,
        Documento: tenant.documentId,
        Teléfono: tenant.phone,
        Habitación: tenant.roomNumber,
        "Fecha de Pago": paymentDateStr,
        Pago: tenant.payment,
        Estado: tenant.hasPaid ? "Pagado" : "Pendiente",
        Contrato: tenant.contractCancelled ? "Cancelado" : "Activo",
      }
    })

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
    /* global XLSX */
    let XLSX
    if (typeof require == "function") XLSX = require("xlsx")

    if (typeof XLSX != "undefined" && XLSX != null) {
      const wb = XLSX.utils.table_to_book(tempElement.querySelector("table"))

      // Guardar como archivo Excel
      XLSX.writeFile(wb, "Inquilinos.xlsx")

      alert("Exportación completada")
    } else {
      alert("La librería XLSX no está disponible. Por favor, asegúrese de que esté correctamente importada.")
    }
  }

  // Verificar pagos pendientes al cargar la página
  checkOverduePayments()
  updateNotificationBadge()

  // Verificar diariamente si hay fechas de pago que coincidan con la fecha actual
  setInterval(() => {
    updateTenantsTable() // Esto ejecutará la verificación de fechas de pago
  }, 60000) // Verificar cada minuto
})


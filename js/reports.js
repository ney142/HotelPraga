/* global XLSX */
document.addEventListener("DOMContentLoaded", () => {
  // Load data from localStorage
  let reports = JSON.parse(localStorage.getItem("reports") || "[]")

  // DOM elements
  const reportForm = document.getElementById("reportForm")
  const reportsTable = document.getElementById("reportsTable")
  const emptyReports = document.getElementById("emptyReports")
  const reportDetailsModal = document.getElementById("reportDetailsModal")
  const closeReportDetailsModal = document.getElementById("closeReportDetailsModal")
  const reportDetailsContent = document.getElementById("reportDetailsContent")

  // Initialize the reports table
  updateReportsTable()

  // Add filter container to the table
  addFilterContainer()

  // Form submit event
  reportForm.addEventListener("submit", function (e) {
    e.preventDefault()

    // Get form data
    const formData = new FormData(this)

    // Handle image upload
    const imageFile = formData.get("reportImage")
    let imageData = null

    if (imageFile && imageFile.size > 0) {
      const reader = new FileReader()
      reader.onload = (event) => {
        imageData = event.target.result

        // Create report object
        const reportData = {
          id: reports.length > 0 ? Math.max(...reports.map((r) => r.id)) + 1 : 1,
          title: formData.get("title"),
          location: formData.get("location"),
          roomNumber: formData.get("roomNumber") || "N/A",
          priority: formData.get("priority"),
          description: formData.get("description"),
          image: imageData,
          status: "Pendiente",
          createdAt: new Date().toISOString(),
          completedAt: null,
          completedBy: null,
        }

        // Add report to array
        reports.push(reportData)

        // Save to localStorage
        localStorage.setItem("reports", JSON.stringify(reports))

        // Update table
        updateReportsTable()

        // Reset form
        this.reset()

        // Show success message
        alert("Reporte registrado correctamente")
      }
      reader.readAsDataURL(imageFile)
    } else {
      // Create report object without image
      const reportData = {
        id: reports.length > 0 ? Math.max(...reports.map((r) => r.id)) + 1 : 1,
        title: formData.get("title"),
        location: formData.get("location"),
        roomNumber: formData.get("roomNumber") || "N/A",
        priority: formData.get("priority"),
        description: formData.get("description"),
        image: null,
        status: "Pendiente",
        createdAt: new Date().toISOString(),
        completedAt: null,
        completedBy: null,
      }

      // Add report to array
      reports.push(reportData)

      // Save to localStorage
      localStorage.setItem("reports", JSON.stringify(reports))

      // Update table
      updateReportsTable()

      // Reset form
      this.reset()

      // Show success message
      alert("Reporte registrado correctamente")
    }
  })

  // Close report details modal
  if (closeReportDetailsModal) {
    closeReportDetailsModal.addEventListener("click", () => {
      reportDetailsModal.style.display = "none"
    })
  }

  // Close modal when clicking outside
  window.addEventListener("click", (e) => {
    if (e.target === reportDetailsModal) {
      reportDetailsModal.style.display = "none"
    }
  })

  function updateReportsTable() {
    // Get reports from localStorage
    reports = JSON.parse(localStorage.getItem("reports") || "[]")

    // Check if there are reports
    if (reports.length === 0) {
      if (reportsTable) reportsTable.style.display = "none"
      if (emptyReports) emptyReports.style.display = "flex"
      return
    }

    // Show table and hide empty state
    if (reportsTable) reportsTable.style.display = "table"
    if (emptyReports) emptyReports.style.display = "none"

    // Clear table body
    const tableBody = reportsTable.querySelector("tbody")
    tableBody.innerHTML = ""

    // Get current user role
    const user = JSON.parse(localStorage.getItem("user") || "{}")
    const isAdmin = user.role === "admin"

    // Add reports to table
    reports.forEach((report) => {
      const row = document.createElement("tr")

      // Add data attributes for filtering
      row.dataset.id = report.id
      row.dataset.title = report.title.toLowerCase()
      row.dataset.location = report.location.toLowerCase()
      row.dataset.priority = report.priority.toLowerCase()
      row.dataset.status = report.status.toLowerCase()

      // Format date
      const createdDate = new Date(report.createdAt)
      const formattedDate = `${createdDate.toLocaleDateString()} ${createdDate.toLocaleTimeString()}`

      // Create status badge
      const statusClass = report.status === "Pendiente" ? "pending" : "completed"

      // Create action buttons
      let actionButtons = ""

      if (report.status === "Pendiente") {
        // If pending, show complete button
        actionButtons += `
          <button class="btn btn-outline complete-report" title="Marcar como realizado" data-id="${report.id}">
            <i class="fa-solid fa-check"></i>
          </button>
        `
      }

      // Always show view details button
      actionButtons += `
        <button class="btn btn-outline view-report" title="Ver detalles" data-id="${report.id}">
          <i class="fa-solid fa-eye"></i>
        </button>
      `

      // Always show print button
      actionButtons += `
        <button class="btn btn-outline" title="Imprimir reporte" onclick="printReport(${report.id})">
          <i class="fa-solid fa-print"></i>
        </button>
      `

      row.innerHTML = `
        <td>${report.id}</td>
        <td>${report.title}</td>
        <td>${report.location}</td>
        <td>${report.roomNumber}</td>
        <td>
          <span class="priority-badge ${report.priority.toLowerCase()}">${report.priority}</span>
        </td>
        <td>${formattedDate}</td>
        <td>
          <span class="status-badge ${statusClass}">${report.status}</span>
        </td>
        <td>
          <div class="action-buttons" style="display: flex; flex-wrap: nowrap; gap: 5px; justify-content: center;">
            ${actionButtons}
          </div>
        </td>
      `

      tableBody.appendChild(row)
    })

    // Add event listeners for complete report buttons
    document.querySelectorAll(".complete-report").forEach((button) => {
      button.addEventListener("click", function () {
        const reportId = Number(this.getAttribute("data-id"))
        completeReport(reportId)
      })
    })

    // Add event listeners for view report buttons
    document.querySelectorAll(".view-report").forEach((button) => {
      button.addEventListener("click", function () {
        const reportId = Number(this.getAttribute("data-id"))
        viewReportDetails(reportId)
      })
    })
  }

  // Modificar la función addFilterContainer para que coincida con el estilo de los inquilinos
  function addFilterContainer() {
    const tableContainer = reportsTable.closest(".table-container")
    let filterContainer = tableContainer.querySelector(".filter-container")

    if (!filterContainer) {
      // Crear un nuevo contenedor de filtro con el estilo mejorado
      filterContainer = document.createElement("div")
      filterContainer.className = "search-filter-container"

      filterContainer.innerHTML = `
      <div class="search-box">
        <input type="text" id="reportSearch" placeholder="Buscar reporte...">
        <button class="search-button"><i class="fa-solid fa-search"></i></button>
      </div>
      <div class="filter-dropdowns">
        <select id="statusFilter" class="filter-select">
          <option value="all">Todos los estados</option>
          <option value="pendiente">Pendientes</option>
          <option value="realizado">Realizados</option>
        </select>
        <select id="priorityFilter" class="filter-select">
          <option value="all">Todas las prioridades</option>
          <option value="alta">Alta</option>
          <option value="media">Media</option>
          <option value="baja">Baja</option>
        </select>
        <select id="locationFilter" class="filter-select">
          <option value="all">Todas las ubicaciones</option>
          <option value="habitación">Habitación</option>
          <option value="pasillo">Pasillo</option>
          <option value="recepción">Recepción</option>
          <option value="baño">Baño</option>
          <option value="cocina">Cocina</option>
          <option value="área común">Área común</option>
          <option value="otro">Otro</option>
        </select>
      </div>
    `
      tableContainer.insertBefore(filterContainer, reportsTable)

      // Add event listeners to filters
      const searchInput = document.getElementById("reportSearch")
      const statusFilter = document.getElementById("statusFilter")
      const priorityFilter = document.getElementById("priorityFilter")
      const locationFilter = document.getElementById("locationFilter")

      searchInput.addEventListener("input", filterReports)
      statusFilter.addEventListener("change", filterReports)
      priorityFilter.addEventListener("change", filterReports)
      locationFilter.addEventListener("change", filterReports)
    }
  }

  function filterReports() {
    const searchTerm = document.getElementById("reportSearch").value.toLowerCase()
    const statusFilter = document.getElementById("statusFilter").value
    const priorityFilter = document.getElementById("priorityFilter").value
    const locationFilter = document.getElementById("locationFilter").value

    const rows = document.querySelectorAll("#reportsTable tbody tr")

    rows.forEach((row) => {
      const title = row.dataset.title
      const status = row.dataset.status
      const priority = row.dataset.priority
      const location = row.dataset.location

      const matchesSearch = title.includes(searchTerm)
      const matchesStatus = statusFilter === "all" || status === statusFilter
      const matchesPriority = priorityFilter === "all" || priority === priorityFilter
      const matchesLocation = locationFilter === "all" || location === locationFilter

      if (matchesSearch && matchesStatus && matchesPriority && matchesLocation) {
        row.style.display = ""
      } else {
        row.style.display = "none"
      }
    })

    // Show message if no results
    const visibleRows = document.querySelectorAll('#reportsTable tbody tr:not([style*="display: none"])')
    const emptyResults = document.getElementById("emptyResults")

    if (visibleRows.length === 0) {
      if (!emptyResults) {
        const tableContainer = document.querySelector(".table-container")
        const noResultsDiv = document.createElement("div")
        noResultsDiv.id = "emptyResults"
        noResultsDiv.className = "empty-state"
        noResultsDiv.textContent = "No se encontraron reportes con los filtros seleccionados"
        tableContainer.appendChild(noResultsDiv)
      } else {
        emptyResults.style.display = "flex"
      }
      reportsTable.style.display = "none"
    } else {
      if (emptyResults) {
        emptyResults.style.display = "none"
      }
      reportsTable.style.display = "table"
    }
  }

  function completeReport(id) {
    if (!confirm("¿Está seguro de que desea marcar este reporte como realizado?")) {
      return
    }

    const reportIndex = reports.findIndex((r) => r.id === id)
    if (reportIndex === -1) return

    // Get current user
    const user = JSON.parse(localStorage.getItem("user") || "{}")
    const userName = user.name || "Usuario"

    // Update report status
    reports[reportIndex].status = "Realizado"
    reports[reportIndex].completedAt = new Date().toISOString()
    reports[reportIndex].completedBy = userName

    // Save to localStorage
    localStorage.setItem("reports", JSON.stringify(reports))

    // Update table
    updateReportsTable()

    // Show success message
    showToast("Reporte marcado como realizado", "success")

    // Create notification
    const notifications = JSON.parse(localStorage.getItem("notifications") || "[]")
    notifications.push({
      id: Date.now() + Math.random(),
      type: "system",
      message: `El reporte "${reports[reportIndex].title}" ha sido marcado como realizado por ${userName}`,
      date: new Date().toISOString(),
      read: false,
    })
    localStorage.setItem("notifications", JSON.stringify(notifications))
    updateNotificationBadge()
  }

  function viewReportDetails(id) {
    const report = reports.find((r) => r.id === id)
    if (!report) return

    // Format dates
    const createdDate = new Date(report.createdAt).toLocaleString()
    let completedDate = "No completado"
    if (report.completedAt) {
      completedDate = new Date(report.completedAt).toLocaleString()
    }

    // Create content
    let content = `
      <div class="report-details">
        <div class="report-header">
          <h3>${report.title}</h3>
          <span class="status-badge ${report.status === "Pendiente" ? "pending" : "completed"}">${report.status}</span>
        </div>
        
        <div class="report-info">
          <div class="info-row">
            <span class="info-label">Ubicación:</span>
            <span class="info-value">${report.location}</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">Habitación:</span>
            <span class="info-value">${report.roomNumber}</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">Prioridad:</span>
            <span class="info-value">
              <span class="priority-badge ${report.priority.toLowerCase()}">${report.priority}</span>
            </span>
          </div>
          
          <div class="info-row">
            <span class="info-label">Fecha de creación:</span>
            <span class="info-value">${createdDate}</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">Fecha de resolución:</span>
            <span class="info-value">${completedDate}</span>
          </div>
          
          ${
            report.completedBy
              ? `
          <div class="info-row">
            <span class="info-label">Resuelto por:</span>
            <span class="info-value">${report.completedBy}</span>
          </div>
          `
              : ""
          }
        </div>
        
        <div class="report-description">
          <h4>Descripción:</h4>
          <p>${report.description}</p>
        </div>
    `

    // Add image if available
    if (report.image) {
      content += `
        <div class="report-image">
          <h4>Imagen:</h4>
          <img src="${report.image}" alt="Imagen del reporte" style="max-width: 100%; max-height: 300px;">
        </div>
      `
    }

    // Add actions
    content += `
        <div class="report-actions" style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
    `

    if (report.status === "Pendiente") {
      content += `
          <button class="btn btn-primary complete-report-modal" data-id="${report.id}">
            Marcar como realizado
          </button>
      `
    }

    content += `
          <button class="btn btn-outline" onclick="printReport(${report.id})">
            Imprimir reporte
          </button>
        </div>
      </div>
    `

    // Set content and show modal
    reportDetailsContent.innerHTML = content
    reportDetailsModal.style.display = "block"

    // Add event listener to complete button in modal
    const completeButton = reportDetailsContent.querySelector(".complete-report-modal")
    if (completeButton) {
      completeButton.addEventListener("click", function () {
        const reportId = Number(this.getAttribute("data-id"))
        completeReport(reportId)
        reportDetailsModal.style.display = "none"
      })
    }
  }

  // Function to update notification badge
  function updateNotificationBadge() {
    const notifications = JSON.parse(localStorage.getItem("notifications") || "[]")
    const unreadCount = notifications.filter((n) => !n.read).length
    const badge = document.getElementById("notificationCount")
    if (badge) {
      badge.textContent = unreadCount
      badge.style.display = unreadCount > 0 ? "flex" : "none"
    }
  }

  // Function to show toast message
  function showToast(message, type = "info") {
    const toast = document.createElement("div")
    toast.className = `toast ${type}`
    toast.innerHTML = message
    document.body.appendChild(toast)

    // Remove toast after 3 seconds
    setTimeout(() => {
      toast.remove()
    }, 3000)
  }

  // Print report function
  window.printReport = (id) => {
    const report = reports.find((r) => r.id === id)
    if (!report) return

    // Format dates
    const createdDate = new Date(report.createdAt).toLocaleString()
    let completedDate = "No completado"
    if (report.completedAt) {
      completedDate = new Date(report.completedAt).toLocaleString()
    }

    // Create content
    const reportContent = `
      <html>
      <head>
        <title>Reporte #${report.id} - ${report.title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 20px; }
          .report-title { color: #d4af37; font-size: 24px; margin-bottom: 5px; }
          .report-subtitle { font-size: 16px; margin-bottom: 20px; }
          .info-section { margin-bottom: 20px; }
          .info-title { font-weight: bold; margin-bottom: 5px; }
          .info-row { display: flex; margin-bottom: 5px; }
          .info-label { width: 150px; font-weight: bold; }
          .info-value { flex: 1; }
          .priority-badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
          .priority-badge.alta { background-color: #ef4444; color: white; }
          .priority-badge.media { background-color: #f59e0b; color: white; }
          .priority-badge.baja { background-color: #10b981; color: white; }
          .status-badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
          .status-badge.pending { background-color: #f59e0b; color: white; }
          .status-badge.completed { background-color: #10b981; color: white; }
          .description { margin-top: 20px; }
          .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="report-title">Hotel Admin</h1>
          <p class="report-subtitle">Reporte de Novedad #${report.id}</p>
        </div>
        
        <div class="info-section">
          <h2 class="info-title">Información del Reporte</h2>
          <div class="info-row">
            <span class="info-label">Título:</span>
            <span class="info-value">${report.title}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Ubicación:</span>
            <span class="info-value">${report.location}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Habitación:</span>
            <span class="info-value">${report.roomNumber}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Prioridad:</span>
            <span class="info-value">
              <span class="priority-badge ${report.priority.toLowerCase()}">${report.priority}</span>
            </span>
          </div>
          <div class="info-row">
            <span class="info-label">Estado:</span>
            <span class="info-value">
              <span class="status-badge ${report.status === "Pendiente" ? "pending" : "completed"}">${report.status}</span>
            </span>
          </div>
          <div class="info-row">
            <span class="info-label">Fecha de creación:</span>
            <span class="info-value">${createdDate}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Fecha de resolución:</span>
            <span class="info-value">${completedDate}</span>
          </div>
          ${
            report.completedBy
              ? `
          <div class="info-row">
            <span class="info-label">Resuelto por:</span>
            <span class="info-value">${report.completedBy}</span>
          </div>
          `
              : ""
          }
        </div>
        
        <div class="description">
          <h2 class="info-title">Descripción</h2>
          <p>${report.description}</p>
        </div>
        
        <div class="footer">
          <p>Reporte generado el ${new Date().toLocaleString()}</p>
          <p>Sistema de Administración Hotelera</p>
        </div>
      </body>
      </html>
    `

    // Create a new window for printing
    const printWindow = window.open("", "_blank")
    printWindow.document.write(reportContent)
    printWindow.document.close()

    // Wait for styles to load and then print
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 500)
  }

  // Function to export to Excel
  window.exportToExcel = () => {
    if (!reports.length) {
      alert("No hay datos para exportar")
      return
    }

    // Prepare data for export
    const dataToExport = reports.map((report) => ({
      ID: report.id,
      Título: report.title,
      Ubicación: report.location,
      Habitación: report.roomNumber,
      Prioridad: report.priority,
      "Fecha de Creación": new Date(report.createdAt).toLocaleString(),
      Estado: report.status,
      "Fecha de Resolución": report.completedAt ? new Date(report.completedAt).toLocaleString() : "No completado",
      "Resuelto por": report.completedBy || "N/A",
    }))

    // Create HTML table for export
    let html = "<table>"

    // Headers
    html += "<tr>"
    for (const key in dataToExport[0]) {
      html += `<th>${key}</th>`
    }
    html += "</tr>"

    // Data
    dataToExport.forEach((row) => {
      html += "<tr>"
      for (const key in row) {
        html += `<td>${row[key]}</td>`
      }
      html += "</tr>"
    })

    html += "</table>"

    // Create a temporary element
    const tempElement = document.createElement("div")
    tempElement.innerHTML = html

    // Create an Excel workbook
    const wb = XLSX.utils.table_to_book(tempElement.querySelector("table"))

    // Save as Excel file
    XLSX.writeFile(wb, "Reportes_Novedades.xlsx")

    alert("Exportación completada")
  }

  // Add styles for report details
  const reportStyles = document.createElement("style")
  reportStyles.textContent = `
    .report-details {
      padding: 10px;
    }
    
    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    
    .report-header h3 {
      margin: 0;
      color: var(--gold);
    }
    
    .report-info {
      margin-bottom: 20px;
    }
    
    .info-row {
      display: flex;
      margin-bottom: 10px;
    }
    
    .info-label {
      width: 150px;
      font-weight: bold;
    }
    
    .info-value {
      flex: 1;
    }
    
    .report-description h4,
    .report-image h4 {
      color: var(--gold);
      margin-bottom: 10px;
    }
    
    .priority-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
    }
    
    .priority-badge.alta {
      background-color: #ef4444;
      color: white;
    }
    
    .priority-badge.media {
      background-color: #f59e0b;
      color: white;
    }
    
    .priority-badge.baja {
      background-color: #10b981;
      color: white;
    }
    
    .status-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
    }
    
    .status-badge.pending {
      background-color: #f59e0b;
      color: white;
    }
    
    .status-badge.completed {
      background-color: #10b981;
      color: white;
    }
  `
  document.head.appendChild(reportStyles)
})


// Hotel Admin Statistics Module
// Enhanced with report generation, printing, month filtering, and shift management

// Modificar la función para cargar datos según el mes seleccionado
// Agregar después de la inicialización de variables globales (al principio del archivo)

// Variables globales para el control de mes y año
let currentMonth = new Date().getMonth()
let currentYear = new Date().getFullYear()
let currentShift = {
  id: generateShiftId(),
  startTime: new Date(),
  endTime: null,
  income: 0,
  transactions: [],
}
let shiftHistory = []



// Cargar datos cuando el documento esté listo
document.addEventListener("DOMContentLoaded", () => {
  // Cargar datos desde localStorage
  const visitors = JSON.parse(localStorage.getItem("visitors") || "[]")
  const tenants = JSON.parse(localStorage.getItem("tenants") || "[]")
  const rooms = JSON.parse(localStorage.getItem("rooms") || "[]")
  const expenses = JSON.parse(localStorage.getItem("expenses") || "[]")
  const shifts = JSON.parse(localStorage.getItem("shifts") || "[]")
  const historicalData = JSON.parse(localStorage.getItem("historicalData") || "[]")

  // Elementos del DOM
  const monthSelect = document.getElementById("month")
  const yearSelect = document.getElementById("year")
  const generateReportBtn = document.getElementById("generateReport")
  const printReportBtn = document.getElementById("printReport")
  const endShiftBtn = document.getElementById("endShift")
  const shiftsTable = document.getElementById("shiftsTable")
  const emptyShifts = document.getElementById("emptyShifts")

  // Establecer mes y año actuales
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth() + 1 // getMonth() devuelve 0-11
  const currentYear = currentDate.getFullYear()

  // Seleccionar mes y año actuales en los selectores
  if (monthSelect) monthSelect.value = currentMonth.toString()
  if (yearSelect) yearSelect.value = currentYear.toString()

  // Initialize when document is ready
  loadShiftData()

  // Initialize date selector with current month/year
  initializeDateSelector()

  // Set up event listeners
  setupEventListeners()

  // Load initial data for current month
  updateMonthlyStats()
  updateShiftsTable()

  // Evento de clic en el botón de generar informe
  if (generateReportBtn) {
    generateReportBtn.addEventListener("click", () => {
      updateMonthlyStats()
      exportToExcel()
    })
  }

  // Evento de clic en el botón de imprimir informe
  if (printReportBtn) {
    printReportBtn.addEventListener("click", () => {
      printMonthlyReport()
    })
  }

  // Evento de clic en el botón de finalizar turno
  if (endShiftBtn) {
    endShiftBtn.addEventListener("click", () => {
      endCurrentShift()
    })
  }

  // Cambio de mes o año
  if (monthSelect) {
    monthSelect.addEventListener("change", updateMonthlyStats)
  }

  if (yearSelect) {
    yearSelect.addEventListener("change", updateMonthlyStats)
  }

  function updateMonthlyStats() {
    // Obtener mes y año seleccionados
    const month = Number.parseInt(monthSelect.value) - 1 // Convertir a 0-11 para JavaScript
    const year = Number.parseInt(yearSelect.value)

    // Verificar si hay datos históricos para el mes/año seleccionado
    const historicalMonth = historicalData.find((h) => h.month === month && h.year === year)

    let totalRevenue = 0,
      totalExpensesAmount = 0,
      netProfit = 0
    let totalVisitors = 0,
      occupancyRate = 0,
      activeTenants = 0

    if (historicalMonth) {
      // Usar datos históricos
      totalRevenue = historicalMonth.stats.totalRevenue
      totalExpensesAmount = historicalMonth.stats.totalExpenses
      netProfit = historicalMonth.stats.netProfit
      totalVisitors = historicalMonth.stats.totalVisitors || 0
      activeTenants = historicalMonth.stats.totalTenants || 0

      // Calcular tasa de ocupación (estimación)
      occupancyRate = Math.round((totalVisitors / (rooms.length * 30)) * 100)
      if (occupancyRate > 100) occupancyRate = 100
    } else {
      // Si no hay datos históricos o es el mes actual, calcular en tiempo real
      // Filtrar datos por mes y año
      const monthVisitors = filterByMonthYear(visitors, month, year)
      const monthTenants = filterByMonthYear(tenants, month, year)
      const monthExpenses = filterByMonthYear(expenses, month, year)

      // Calcular estadísticas
      totalVisitors = monthVisitors.length
      activeTenants = monthTenants.length

      // Calcular tasa de ocupación
      const totalRooms = rooms.length
      const occupiedRooms = rooms.filter((room) => room.status === "occupied").length
      occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0

      // Calcular ingresos
      const visitorRevenue = monthVisitors.reduce((total, visitor) => total + (visitor.payment || 0), 0)
      const tenantRevenue = monthTenants.reduce((total, tenant) => total + (tenant.payment || 0), 0)
      totalRevenue = visitorRevenue + tenantRevenue

      // Calcular gastos
      totalExpensesAmount = monthExpenses.reduce((total, expense) => total + (expense.amount || 0), 0)

      // Calcular beneficio
      netProfit = totalRevenue - totalExpensesAmount
    }

    // Actualizar elementos del DOM
    const totalRevenueElement = document.getElementById("totalRevenue")
    const totalExpensesElement = document.getElementById("totalExpenses")
    const netProfitElement = document.getElementById("netProfit")
    const totalVisitorsElement = document.getElementById("totalVisitors")
    const occupancyRateElement = document.getElementById("occupancyRate")
    const activeTenantsElement = document.getElementById("activeTenants")

    if (totalRevenueElement) totalRevenueElement.textContent = `$${totalRevenue.toFixed(2)}`
    if (totalExpensesElement) totalExpensesElement.textContent = `$${totalExpensesAmount.toFixed(2)}`
    if (netProfitElement) netProfitElement.textContent = `$${netProfit.toFixed(2)}`

    // Estos elementos pueden no existir en todas las versiones del HTML
    if (totalVisitorsElement) totalVisitorsElement.textContent = totalVisitors
    if (occupancyRateElement) occupancyRateElement.textContent = `${occupancyRate}%`
    if (activeTenantsElement) activeTenantsElement.textContent = activeTenants
  }

  function filterByMonthYear(data, month, year) {
    return data.filter((item) => {
      const date = new Date(item.createdAt || item.date)
      return date.getMonth() === month && date.getFullYear() === year
    })
  }

  function endCurrentShift() {
    // Obtener usuario actual
    const user = JSON.parse(localStorage.getItem("user") || "{}")

    // Crear nuevo turno
    const newShift = {
      id: shifts.length > 0 ? Math.max(...shifts.map((s) => s.id)) + 1 : 1,
      date: new Date().toISOString(),
      shift: getShiftName(),
      employee: user.name || "Usuario",
      visitors: countTodayVisitors(),
      revenue: calculateTodayRevenue(),
    }

    // Añadir turno al array
    const updatedShifts = [...shifts, newShift]

    // Guardar en localStorage
    localStorage.setItem("shifts", JSON.stringify(updatedShifts))

    // Actualizar tabla
    updateShiftsTable()

    // Mostrar mensaje de éxito
    alert("Turno finalizado correctamente")
  }

  function getShiftName() {
    const hour = new Date().getHours()
    if (hour >= 6 && hour < 14) return "Mañana"
    if (hour >= 14 && hour < 22) return "Tarde"
    return "Noche"
  }

  function countTodayVisitors() {
    const today = new Date().toDateString()
    return visitors.filter((visitor) => new Date(visitor.createdAt).toDateString() === today).length
  }

  function calculateTodayRevenue() {
    const today = new Date().toDateString()

    const visitorRevenue = visitors
      .filter((visitor) => new Date(visitor.createdAt).toDateString() === today)
      .reduce((total, visitor) => total + (visitor.payment || 0), 0)

    const tenantRevenue = tenants
      .filter((tenant) => new Date(tenant.createdAt).toDateString() === today)
      .reduce((total, tenant) => total + (tenant.payment || 0), 0)

    return visitorRevenue + tenantRevenue
  }

  function updateShiftsTable() {
    // Obtener turnos desde localStorage
    const updatedShifts = JSON.parse(localStorage.getItem("shifts") || "[]")

    // Verificar si hay turnos
    if (updatedShifts.length === 0) {
      if (shiftsTable) shiftsTable.style.display = "none"
      if (emptyShifts) emptyShifts.style.display = "flex"
      return
    }

    // Mostrar tabla y ocultar estado vacío
    if (shiftsTable) shiftsTable.style.display = "table"
    if (emptyShifts) emptyShifts.style.display = "none"

    // Limpiar cuerpo de la tabla
    const tableBody = shiftsTable.querySelector("tbody")
    if (tableBody) {
      tableBody.innerHTML = ""

      // Añadir turnos a la tabla
      updatedShifts.forEach((shift) => {
        const row = document.createElement("tr")

        // Formatear fecha
        const shiftDate = new Date(shift.date).toLocaleDateString()

        row.innerHTML = `
          <td>${shiftDate}</td>
          <td>${shift.shift}</td>
          <td>${shift.employee}</td>
          <td>${shift.visitors}</td>
          <td class="font-medium" style="color: var(--gold)">$${shift.revenue.toFixed(2)}</td>
          <td>
            <button class="btn btn-outline" style="padding: 0.25rem; width: 2rem; height: 2rem;" onclick="printShiftReport(${shift.id})">
              <i class="fa-solid fa-print"></i>
            </button>
          </td>
        `

        tableBody.appendChild(row)
      })
    }
  }

  // Función para imprimir informe mensual
  function printMonthlyReport() {
    // Obtener mes y año seleccionados
    const month = Number.parseInt(monthSelect.value) - 1 // Convertir a 0-11 para JavaScript
    const year = Number.parseInt(yearSelect.value)

    // Obtener nombre del mes
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
    const monthName = monthNames[month]

    // Obtener estadísticas actuales
    const totalRevenue = document.getElementById("totalRevenue").textContent
    const totalExpenses = document.getElementById("totalExpenses").textContent
    const netProfit = document.getElementById("netProfit").textContent

    // Estos elementos pueden no existir en todas las versiones del HTML
    const totalVisitors = document.getElementById("totalVisitors")?.textContent || "0"
    const occupancyRate = document.getElementById("occupancyRate")?.textContent || "0%"
    const activeTenants = document.getElementById("activeTenants")?.textContent || "0"

    // Crear contenido del informe
    const reportContent = `
      <html>
      <head>
        <title>Informe Mensual - ${monthName} ${year}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 20px; }
          .report-title { color: #d4af37; font-size: 24px; margin-bottom: 5px; }
          .report-subtitle { font-size: 16px; margin-bottom: 20px; }
          .info-section { margin-bottom: 20px; }
          .info-title { font-weight: bold; margin-bottom: 15px; }
          .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px; }
          .stat-card { border: 1px solid #d4af37; border-radius: 5px; padding: 10px; }
          .stat-title { font-size: 14px; color: #666; margin-bottom: 5px; }
          .stat-value { font-size: 18px; font-weight: bold; color: #d4af37; }
          .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="report-title">Hotel Admin</h1>
          <p class="report-subtitle">Informe Mensual - ${monthName} ${year}</p>
        </div>
        
        <div class="info-section">
          <h2 class="info-title">Estadísticas Mensuales</h2>
 
          <div class="stats-grid">
            <div class="stat-card">
              <p class="stat-title">Ingresos Totales</p>
              <p class="stat-value">${totalRevenue}</p>
            </div>
            
            <div class="stat-card">
              <p class="stat-title">Gastos Totales</p>
              <p class="stat-value">${totalExpenses}</p>
            </div>
            
            <div class="stat-card">
              <p class="stat-title">Beneficio Neto</p>
              <p class="stat-value">${netProfit}</p>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <p>Informe generado el ${new Date().toLocaleString()}</p>
          <p>Sistema de Administración Hotelera</p>
        </div>
      </body>
      </html>
    `

    // Crear una ventana nueva para imprimir
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(reportContent)
      printWindow.document.close()

      // Esperar a que los estilos se carguen y luego imprimir
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 500)
    } else {
      alert("Por favor, permita las ventanas emergentes para imprimir el informe.")
    }
  }

  // Función para exportar a Excel
  function exportToExcel() {
    // Obtener mes y año seleccionados
    const month = Number.parseInt(monthSelect.value) - 1 // Convertir a 0-11 para JavaScript
    const year = Number.parseInt(yearSelect.value)

    // Verificar si hay datos históricos para el mes/año seleccionado
    const historicalMonth = historicalData.find((h) => h.month === month && h.year === year)

    let totalVisitors, activeTenants, occupancyRate, totalRevenue, totalExpensesAmount, netProfit

    if (historicalMonth) {
      // Usar datos históricos
      totalVisitors = historicalMonth.stats.totalVisitors || 0
      activeTenants = historicalMonth.stats.totalTenants || 0
      totalRevenue = historicalMonth.stats.totalRevenue
      totalExpensesAmount = historicalMonth.stats.totalExpenses
      netProfit = historicalMonth.stats.netProfit

      // Calcular tasa de ocupación (estimación)
      occupancyRate = Math.round((totalVisitors / (rooms.length * 30)) * 100)
      if (occupancyRate > 100) occupancyRate = 100
    } else {
      // Si no hay datos históricos o es el mes actual, usar los valores actuales
      const totalVisitorsElement = document.getElementById("totalVisitors")
      const occupancyRateElement = document.getElementById("occupancyRate")
      const activeTenantsElement = document.getElementById("activeTenants")

      totalVisitors = totalVisitorsElement ? Number.parseInt(totalVisitorsElement.textContent) : 0
      occupancyRate = occupancyRateElement ? occupancyRateElement.textContent : "0%"
      activeTenants = activeTenantsElement ? Number.parseInt(activeTenantsElement.textContent) : 0

      totalRevenue = Number.parseFloat(
        document.getElementById("totalRevenue").textContent.replace("$", "").replace(",", ""),
      )
      totalExpensesAmount = Number.parseFloat(
        document.getElementById("totalExpenses").textContent.replace("$", "").replace(",", ""),
      )
      netProfit = Number.parseFloat(document.getElementById("netProfit").textContent.replace("$", "").replace(",", ""))
    }

    // Obtener nombre del mes
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
    const monthName = monthNames[month]

    // Preparar datos para exportar
    const dataToExport = [

      { Categoría: "Ingresos Totales", Valor: totalRevenue },
      { Categoría: "Gastos Totales", Valor: totalExpensesAmount },
      { Categoría: "Beneficio Neto", Valor: netProfit },
    ]

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

    // Declare XLSX before using it
    let XLSX

    // Verificar si XLSX está definido
    if (typeof XLSX === "undefined") {
      // Cargar XLSX si no está disponible
      const script = document.createElement("script")
      script.src = "https://unpkg.com/xlsx/dist/xlsx.full.min.js"
      script.onload = () => {
        XLSX = window.XLSX
        const wb = XLSX.utils.table_to_book(tempElement.querySelector("table"))

        // Guardar como archivo Excel
        XLSX.writeFile(wb, `Informe_${monthName}_${year}.xlsx`)

        alert("Informe generado correctamente")
      }
      document.head.appendChild(script)
    } else {
      // XLSX ya está disponible
      const wb = XLSX.utils.table_to_book(tempElement.querySelector("table"))

      // Guardar como archivo Excel
      XLSX.writeFile(wb, `Informe_${monthName}_${year}.xlsx`)

      alert("Informe generado correctamente")
    }
  }
})

// Initialize the month/year selector
function initializeDateSelector() {
  const monthSelector = document.getElementById("month-selector")
  const yearSelector = document.getElementById("year-selector")

  if (monthSelector && yearSelector) {
    // Poblar selector de mes
    const months = [
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

    months.forEach((month, index) => {
      const option = document.createElement("option")
      option.value = index
      option.textContent = month
      monthSelector.appendChild(option)
    })

    // Poblar selector de año (año actual y 5 años atrás)
    const currentYear = new Date().getFullYear()
    for (let year = currentYear; year >= currentYear - 5; year--) {
      const option = document.createElement("option")
      option.value = year
      option.textContent = year
      yearSelector.appendChild(option)
    }

    // Establecer mes y año actual como seleccionados
    monthSelector.value = new Date().getMonth()
    yearSelector.value = currentYear
  }
}

// Set up all event listeners
function setupEventListeners() {
  // Listener para cambio de mes
  const monthSelector = document.getElementById("month-selector")
  if (monthSelector) {
    monthSelector.addEventListener("change", function () {
      currentMonth = Number.parseInt(this.value)
      loadMonthData(currentMonth, currentYear)
    })
  }

  // Listener para cambio de año
  const yearSelector = document.getElementById("year-selector")
  if (yearSelector) {
    yearSelector.addEventListener("change", function () {
      currentYear = Number.parseInt(this.value)
      loadMonthData(currentMonth, currentYear)
    })
  }

  // Generate report button
  const generateReportBtn = document.getElementById("generate-report-btn")
  if (generateReportBtn) {
    generateReportBtn.addEventListener("click", generateReport)
  }

  // Print report button
  const printReportBtn = document.getElementById("print-report-btn")
  if (printReportBtn) {
    printReportBtn.addEventListener("click", printReport)
  }

  // End shift button
  const endShiftBtn = document.getElementById("end-shift-btn")
  if (endShiftBtn) {
    endShiftBtn.addEventListener("click", endCurrentShift)
  }

  // Botón para ver historial de turnos
  const viewHistoryBtn = document.getElementById("view-history-btn")
  if (viewHistoryBtn) {
    viewHistoryBtn.addEventListener("click", viewShiftHistory)
  }
}

// Load data for the selected month and year
function loadMonthData(month, year) {
  // Limpiar datos previos
  clearDisplayedData()

  // Obtener datos para el mes y año seleccionados
  const data = fetchDataForMonth(month, year)

  // Mostrar los datos
  displayMonthData(data)

  // Actualizar estadísticas de resumen
  updateSummaryStatistics(data)
}

// Clear all displayed data to prepare for new data
function clearDisplayedData() {
  const dataContainer = document.getElementById("statistics-data")
  if (dataContainer) {
    dataContainer.innerHTML = ""
  }

  const summaryContainer = document.getElementById("statistics-summary")
  if (summaryContainer) {
    summaryContainer.innerHTML = ""
  }
}

// Fetch data for a specific month and year
function fetchDataForMonth(month, year) {
  // En una aplicación real, esto obtendría datos de un servidor o base de datos
  // Por ahora, simularemos con localStorage o datos de prueba

  // Intentar obtener datos de localStorage
  const storageKey = `hotel_data_${year}_${month}`
  const storedData = localStorage.getItem(storageKey)

  if (storedData) {
    return JSON.parse(storedData)
  } else {
    // Devolver datos de prueba si no hay nada almacenado
    return generateMockDataForMonth(month, year)
  }
}

// Generate mock data for testing
function generateMockDataForMonth(month, year) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const data = {
    occupancy: [],
    revenue: [],
    expenses: [],
  }

  // Generar datos diarios para el mes
  for (let day = 1; day <= daysInMonth; day++) {
    // Ocupación aleatoria entre 40% y 95%
    const occupancy = Math.floor(Math.random() * 55) + 40

    // Ingresos basados en ocupación (entre $50-200 por habitación ocupada, asumiendo 100 habitaciones)
    const revenuePerRoom = Math.floor(Math.random() * 150) + 50
    const revenue = Math.floor((occupancy / 100) * 100 * revenuePerRoom)

    // Gastos (aproximadamente 40-60% de los ingresos)
    const expenseRatio = (Math.random() * 20 + 40) / 100
    const expenses = Math.floor(revenue * expenseRatio)

    data.occupancy.push({
      date: new Date(year, month, day),
      value: occupancy,
    })

    data.revenue.push({
      date: new Date(year, month, day),
      value: revenue,
    })

    data.expenses.push({
      date: new Date(year, month, day),
      value: expenses,
    })
  }

  return data
}

// Display the data for the selected month
function displayMonthData(data) {
  const dataContainer = document.getElementById("statistics-data")
  if (!dataContainer) return

  // Crear una tabla para mostrar los datos
  const table = document.createElement("table")
  table.className = "statistics-table"

  // Crear encabezado de tabla
  const thead = document.createElement("thead")
  const headerRow = document.createElement("tr")
  ;["Fecha", "Ocupación (%)", "Ingresos ($)", "Gastos ($)", "Beneficio ($)"].forEach((headerText) => {
    const th = document.createElement("th")
    th.textContent = headerText
    headerRow.appendChild(th)
  })

  thead.appendChild(headerRow)
  table.appendChild(thead)

  // Crear cuerpo de tabla
  const tbody = document.createElement("tbody")

  // Asumiendo que data.occupancy, data.revenue, y data.expenses tienen la misma longitud
  for (let i = 0; i < data.occupancy.length; i++) {
    const row = document.createElement("tr")

    // Fecha
    const dateCell = document.createElement("td")
    const date = new Date(data.occupancy[i].date)
    dateCell.textContent = date.toLocaleDateString()
    row.appendChild(dateCell)

    // Ocupación
    const occupancyCell = document.createElement("td")
    occupancyCell.textContent = data.occupancy[i].value + "%"
    row.appendChild(occupancyCell)

    // Ingresos
    const revenueCell = document.createElement("td")
    revenueCell.textContent = "$" + data.revenue[i].value.toLocaleString()
    row.appendChild(revenueCell)

    // Gastos
    const expensesCell = document.createElement("td")
    expensesCell.textContent = "$" + data.expenses[i].value.toLocaleString()
    row.appendChild(expensesCell)

    // Beneficio
    const profitCell = document.createElement("td")
    const profit = data.revenue[i].value - data.expenses[i].value
    profitCell.textContent = "$" + profit.toLocaleString()
    profitCell.className = profit >= 0 ? "profit-positive" : "profit-negative"
    row.appendChild(profitCell)

    tbody.appendChild(row)
  }

  table.appendChild(tbody)
  dataContainer.appendChild(table)
}

// Update summary statistics
function updateSummaryStatistics(data) {
  const summaryContainer = document.getElementById("statistics-summary")
  if (!summaryContainer) return

  // Calcular estadísticas de resumen
  let totalOccupancy = 0
  let totalRevenue = 0
  let totalExpenses = 0

  data.occupancy.forEach((item) => (totalOccupancy += item.value))
  data.revenue.forEach((item) => (totalRevenue += item.value))
  data.expenses.forEach((item) => (totalExpenses += item.value))

  const avgOccupancy = totalOccupancy / data.occupancy.length
  const totalProfit = totalRevenue - totalExpenses

  // Crear elementos de resumen
  summaryContainer.innerHTML = `
        <div class="summary-card">
            <h3>Ocupación Promedio</h3>
            <p>${avgOccupancy.toFixed(2)}%</p>
        </div>
        <div class="summary-card">
            <h3>Ingresos Totales</h3>
            <p>$${totalRevenue.toLocaleString()}</p>
        </div>
        <div class="summary-card">
            <h3>Gastos Totales</h3>
            <p>$${totalExpenses.toLocaleString()}</p>
        </div>
        <div class="summary-card">
            <h3>Beneficio Total</h3>
            <p class="${totalProfit >= 0 ? "profit-positive" : "profit-negative"}">
                $${totalProfit.toLocaleString()}
            </p>
        </div>
    `
}

// Generate a report based on current data
function generateReport() {
  // Obtener los datos actuales
  const data = fetchDataForMonth(currentMonth, currentYear)

  // Crear un contenedor para el informe
  const reportContainer = document.getElementById("report-container")
  if (!reportContainer) return

  // Limpiar informe anterior
  reportContainer.innerHTML = ""

  // Crear encabezado del informe
  const reportHeader = document.createElement("div")
  reportHeader.className = "report-header"

  const months = [
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

  reportHeader.innerHTML = `
        <h2>Informe de Rendimiento Mensual</h2>
        <h3>${months[currentMonth]} ${currentYear}</h3>
        <p>Generado el: ${new Date().toLocaleString()}</p>
    `

  reportContainer.appendChild(reportHeader)

  // Añadir estadísticas de resumen
  const summarySection = document.createElement("div")
  summarySection.className = "report-section"

  let totalOccupancy = 0
  let totalRevenue = 0
  let totalExpenses = 0

  data.occupancy.forEach((item) => (totalOccupancy += item.value))
  data.revenue.forEach((item) => (totalRevenue += item.value))
  data.expenses.forEach((item) => (totalExpenses += item.value))

  const avgOccupancy = totalOccupancy / data.occupancy.length
  const totalProfit = totalRevenue - totalExpenses

  summarySection.innerHTML = `
        <h3>Resumen Mensual</h3>
        <table class="report-table">
            <tr>
                <td>Ocupación Promedio:</td>
                <td>${avgOccupancy.toFixed(2)}%</td>
            </tr>
            <tr>
                <td>Ingresos Totales:</td>
                <td>$${totalRevenue.toLocaleString()}</td>
            </tr>
            <tr>
                <td>Gastos Totales:</td>
                <td>$${totalExpenses.toLocaleString()}</td>
            </tr>
            <tr>
                <td>Beneficio Total:</td>
                <td>$${totalProfit.toLocaleString()}</td>
            </tr>
        </table>
    `

  reportContainer.appendChild(summarySection)

  // Añadir datos detallados
  const detailsSection = document.createElement("div")
  detailsSection.className = "report-section"
  detailsSection.innerHTML = "<h3>Rendimiento Diario</h3>"

  // Crear una tabla para datos diarios
  const table = document.createElement("table")
  table.className = "report-table"

  // Encabezado de tabla
  const thead = document.createElement("thead")
  const headerRow = document.createElement("tr")
  ;["Fecha", "Ocupación (%)", "Ingresos ($)", "Gastos ($)", "Beneficio ($)"].forEach((headerText) => {
    const th = document.createElement("th")
    th.textContent = headerText
    headerRow.appendChild(th)
  })

  thead.appendChild(headerRow)
  table.appendChild(thead)

  // Cuerpo de tabla
  const tbody = document.createElement("tbody")

  for (let i = 0; i < data.occupancy.length; i++) {
    const row = document.createElement("tr")

    // Fecha
    const dateCell = document.createElement("td")
    const date = new Date(data.occupancy[i].date)
    dateCell.textContent = date.toLocaleDateString()
    row.appendChild(dateCell)

    // Ocupación
    const occupancyCell = document.createElement("td")
    occupancyCell.textContent = data.occupancy[i].value + "%"
    row.appendChild(occupancyCell)

    // Ingresos
    const revenueCell = document.createElement("td")
    revenueCell.textContent = "$" + data.revenue[i].value.toLocaleString()
    row.appendChild(revenueCell)

    // Gastos
    const expensesCell = document.createElement("td")
    expensesCell.textContent = "$" + data.expenses[i].value.toLocaleString()
    row.appendChild(expensesCell)

    // Beneficio
    const profitCell = document.createElement("td")
    const profit = data.revenue[i].value - data.expenses[i].value
    profitCell.textContent = "$" + profit.toLocaleString()
    row.appendChild(profitCell)

    tbody.appendChild(row)
  }

  table.appendChild(tbody)
  detailsSection.appendChild(table)
  reportContainer.appendChild(detailsSection)

  // Mostrar el contenedor del informe
  reportContainer.style.display = "block"

  // Desplazarse al informe
  reportContainer.scrollIntoView({ behavior: "smooth" })
}

// Print the current report
function printReport() {
  // Primero asegurarse de que tenemos un informe generado
  const reportContainer = document.getElementById("report-container")
  if (!reportContainer || reportContainer.innerHTML === "") {
    alert("Por favor, genere un informe primero.")
    return
  }

  // Crear una nueva ventana para imprimir
  const printWindow = window.open("", "_blank")

  // Obtener el nombre del hotel o usar uno predeterminado
  const hotelName = document.getElementById("hotel-name")?.textContent || "Hotel Admin"

  // Crear el contenido para imprimir
  printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${hotelName} - Informe Mensual</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 20px;
                }
                .report-header {
                    text-align: center;
                    margin-bottom: 20px;
                }
                .report-section {
                    margin-bottom: 30px;
                }
                .report-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                }
                .report-table th, .report-table td {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                }
                .report-table th {
                    background-color: #f2f2f2;
                }
                .report-table tr:nth-child(even) {
                    background-color: #f9f9f9;
                }
                @media print {
                    .no-print {
                        display: none;
                    }
                }
            </style>
        </head>
        <body>
            ${reportContainer.innerHTML}
            <div class="no-print">
                <button onclick="window.print()">Imprimir Informe</button>
                <button onclick="window.close()">Cerrar</button>
            </div>
            <script>
                // Auto imprimir
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                    }, 500);
                };
            </script>
        </body>
        </html>
    `)

  printWindow.document.close()
}

// Shift Management Functions

// Generate a unique ID for a shift
function generateShiftId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5).toUpperCase()
}

// Load shift data from localStorage
function loadShiftData() {
  const savedCurrentShift = localStorage.getItem("current_shift")
  const savedShiftHistory = localStorage.getItem("shift_history")

  if (savedCurrentShift) {
    currentShift = JSON.parse(savedCurrentShift)
  }

  if (savedShiftHistory) {
    shiftHistory = JSON.parse(savedShiftHistory)
  }
}

// Save shift data to localStorage
function saveShiftData() {
  localStorage.setItem("current_shift", JSON.stringify(currentShift))
  localStorage.setItem("shift_history", JSON.stringify(shiftHistory))
}

// Update the shift status display
function updateShiftStatus() {
  const shiftStatusElement = document.getElementById("current-shift-status")
  if (!shiftStatusElement) return

  const startTime = new Date(currentShift.startTime)

  shiftStatusElement.innerHTML = `
        <div class="shift-info">
            <h3>Turno Actual</h3>
            <p>ID: ${currentShift.id}</p>
            <p>Iniciado: ${startTime.toLocaleString()}</p>
            <p>Duración: ${formatShiftDuration(startTime)}</p>
            <p>Ingresos Actuales: $${currentShift.income.toLocaleString()}</p>
            <p>Transacciones: ${currentShift.transactions.length}</p>
        </div>
    `
}

// Format the duration of a shift
function formatShiftDuration(startTime) {
  const now = new Date()
  const diffMs = now - new Date(startTime)

  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

  return `${hours}h ${minutes}m`
}

// End the current shift and show summary
function endCurrentShift() {
  // Establecer hora de finalización
  currentShift.endTime = new Date()

  // Calcular estadísticas finales
  const shiftDuration = currentShift.endTime - new Date(currentShift.startTime)
  const durationHours = shiftDuration / (1000 * 60 * 60)

  // Añadir al historial de turnos
  shiftHistory.push({ ...currentShift })

  // Mostrar resumen del turno
  showShiftSummary(currentShift)

  // Iniciar un nuevo turno
  currentShift = {
    id: generateShiftId(),
    startTime: new Date(),
    endTime: null,
    income: 0,
    transactions: [],
  }

  // Guardar en localStorage
  saveShiftData()

  // Actualizar la visualización
  updateShiftStatus()
}

// Show shift summary when a shift ends
function showShiftSummary(shift) {
  const summaryContainer = document.getElementById("shift-summary-container")
  if (!summaryContainer) return

  // Calcular duración del turno
  const startTime = new Date(shift.startTime)
  const endTime = new Date(shift.endTime)
  const diffMs = endTime - startTime

  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

  // Crear contenido del resumen
  summaryContainer.innerHTML = `
        <div class="shift-summary">
            <h2>Turno Finalizado</h2>
            <div class="summary-content">
                <p><strong>ID del Turno:</strong> ${shift.id}</p>
                <p><strong>Hora de Inicio:</strong> ${startTime.toLocaleString()}</p>
                <p><strong>Hora de Finalización:</strong> ${endTime.toLocaleString()}</p>
                <p><strong>Duración:</strong> ${hours}h ${minutes}m</p>
                <p><strong>Ingresos Totales:</strong> $${shift.income.toLocaleString()}</p>
                <p><strong>Transacciones Totales:</strong> ${shift.transactions.length}</p>
            </div>
            <button id="close-summary-btn" class="btn">Cerrar</button>
        </div>
    `

  // Mostrar el resumen
  summaryContainer.style.display = "block"

  // Añadir event listener al botón de cerrar
  document.getElementById("close-summary-btn").addEventListener("click", () => {
    summaryContainer.style.display = "none"
  })
}

// Add a transaction to the current shift
function addTransaction(amount, type, description) {
  const transaction = {
    id: generateTransactionId(),
    timestamp: new Date(),
    amount: amount,
    type: type,
    description: description,
  }

  currentShift.transactions.push(transaction)
  currentShift.income += amount

  // Guardar en localStorage
  saveShiftData()

  // Actualizar la visualización
  updateShiftStatus()

  return transaction
}

// Generate a unique ID for a transaction
function generateTransactionId() {
  return "TRX-" + Math.random().toString(36).substr(2, 9).toUpperCase()
}

// View shift history
function viewShiftHistory() {
  const historyContainer = document.getElementById("shift-history-container")
  if (!historyContainer) return

  // Limpiar contenido previo
  historyContainer.innerHTML = ""

  // Crear encabezado
  const header = document.createElement("div")
  header.className = "history-header"
  header.innerHTML = `
        <h2>Historial de Turnos</h2>
        <button id="close-history-btn" class="btn">Cerrar</button>
    `
  historyContainer.appendChild(header)

  // Añadir event listener al botón de cerrar
  header.querySelector("#close-history-btn").addEventListener("click", () => {
    historyContainer.style.display = "none"
  })

  // Crear tabla para historial de turnos
  const table = document.createElement("table")
  table.className = "history-table"

  // Encabezado de tabla
  const thead = document.createElement("thead")
  const headerRow = document.createElement("tr")
  ;[
    "ID del Turno",
    "Hora de Inicio",
    "Hora de Finalización",
    "Duración",
    "Ingresos",
    "Transacciones",
    "Acciones",
  ].forEach((headerText) => {
    const th = document.createElement("th")
    th.textContent = headerText
    headerRow.appendChild(th)
  })

  thead.appendChild(headerRow)
  table.appendChild(thead)

  // Cuerpo de tabla
  const tbody = document.createElement("tbody")

  // Ordenar turnos por hora de finalización (más recientes primero)
  const sortedShifts = [...shiftHistory].sort((a, b) => {
    return new Date(b.endTime) - new Date(a.endTime)
  })

  sortedShifts.forEach((shift) => {
    const row = document.createElement("tr")

    // ID del Turno
    const idCell = document.createElement("td")
    idCell.textContent = shift.id
    row.appendChild(idCell)

    // Hora de Inicio
    const startCell = document.createElement("td")
    startCell.textContent = new Date(shift.startTime).toLocaleString()
    row.appendChild(startCell)

    // Hora de Finalización
    const endCell = document.createElement("td")
    endCell.textContent = new Date(shift.endTime).toLocaleString()
    row.appendChild(endCell)

    // Duración
    const durationCell = document.createElement("td")
    const diffMs = new Date(shift.endTime) - new Date(shift.startTime)
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    durationCell.textContent = `${hours}h ${minutes}m`
    row.appendChild(durationCell)

    // Ingresos
    const incomeCell = document.createElement("td")
    incomeCell.textContent = "$" + shift.income.toLocaleString()
    row.appendChild(incomeCell)

    // Transacciones
    const transactionsCell = document.createElement("td")
    transactionsCell.textContent = shift.transactions.length
    row.appendChild(transactionsCell)

    // Acciones
    const actionsCell = document.createElement("td")
    const viewButton = document.createElement("button")
    viewButton.className = "btn-small"
    viewButton.textContent = "Ver Detalles"
    viewButton.addEventListener("click", () => viewShiftDetails(shift))
    actionsCell.appendChild(viewButton)
    row.appendChild(actionsCell)

    tbody.appendChild(row)
  })

  table.appendChild(tbody)
  historyContainer.appendChild(table)

  // Mostrar el contenedor de historial
  historyContainer.style.display = "block"
}

// View details of a specific shift
function viewShiftDetails(shift) {
  const detailsContainer = document.getElementById("shift-details-container")
  if (!detailsContainer) return

  // Limpiar contenido previo
  detailsContainer.innerHTML = ""

  // Crear encabezado
  const header = document.createElement("div")
  header.className = "details-header"
  header.innerHTML = `
        <h2>Detalles del Turno</h2>
        <button id="close-details-btn" class="btn">Cerrar</button>
    `
  detailsContainer.appendChild(header)

  // Añadir event listener al botón de cerrar
  header.querySelector("#close-details-btn").addEventListener("click", () => {
    detailsContainer.style.display = "none"
  })

  // Crear sección de información del turno
  const infoSection = document.createElement("div")
  infoSection.className = "details-section"

  const startTime = new Date(shift.startTime)
  const endTime = new Date(shift.endTime)
  const diffMs = endTime - startTime

  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

  infoSection.innerHTML = `
        <h3>Información del Turno</h3>
        <p><strong>ID del Turno:</strong> ${shift.id}</p>
        <p><strong>Hora de Inicio:</strong> ${startTime.toLocaleString()}</p>
        <p><strong>Hora de Finalización:</strong> ${endTime.toLocaleString()}</p>
        <p><strong>Duración:</strong> ${hours}h ${minutes}m</p>
        <p><strong>Ingresos Totales:</strong> $${shift.income.toLocaleString()}</p>
        <p><strong>Transacciones Totales:</strong> ${shift.transactions.length}</p>
    `

  detailsContainer.appendChild(infoSection)

  // Crear sección de transacciones
  const transactionsSection = document.createElement("div")
  transactionsSection.className = "details-section"
  transactionsSection.innerHTML = "<h3>Transacciones</h3>"

  if (shift.transactions.length === 0) {
    transactionsSection.innerHTML += "<p>No hay transacciones registradas para este turno.</p>"
  } else {
    // Crear tabla para transacciones
    const table = document.createElement("table")
    table.className = "details-table"

    // Encabezado de tabla
    const thead = document.createElement("thead")
    const headerRow = document.createElement("tr")
    ;["ID de Transacción", "Hora", "Monto", "Tipo", "Descripción"].forEach((headerText) => {
      const th = document.createElement("th")
      th.textContent = headerText
      headerRow.appendChild(th)
    })

    thead.appendChild(headerRow)
    table.appendChild(thead)

    // Cuerpo de tabla
    const tbody = document.createElement("tbody")

    shift.transactions.forEach((transaction) => {
      const row = document.createElement("tr")

      // ID de Transacción
      const idCell = document.createElement("td")
      idCell.textContent = transaction.id
      row.appendChild(idCell)

      // Hora
      const timeCell = document.createElement("td")
      timeCell.textContent = new Date(transaction.timestamp).toLocaleString()
      row.appendChild(timeCell)

      // Monto
      const amountCell = document.createElement("td")
      amountCell.textContent = "$" + transaction.amount.toLocaleString()
      row.appendChild(amountCell)

      // Tipo
      const typeCell = document.createElement("td")
      typeCell.textContent = transaction.type
      row.appendChild(typeCell)

      // Descripción
      const descCell = document.createElement("td")
      descCell.textContent = transaction.description
      row.appendChild(descCell)

      tbody.appendChild(row)
    })

    table.appendChild(tbody)
    transactionsSection.appendChild(table)
  }

  detailsContainer.appendChild(transactionsSection)

  // Mostrar el contenedor de detalles
  detailsContainer.style.display = "block"
}

// Export functions for use in other modules
window.hotelStatistics = {
  generateReport,
  printReport,
  addTransaction,
  endCurrentShift,
  viewShiftHistory,
}

// Función global para imprimir informe de turno
window.printShiftReport = (id) => {
  // Obtener el turno específico
  const shifts = JSON.parse(localStorage.getItem("shifts") || "[]")
  const shift = shifts.find((s) => s.id === id)

  if (!shift) return

  // Crear contenido del informe
  const reportContent = `
    <html>
    <head>
      <title>Informe de Turno #${shift.id}</title>
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
        .total-section { margin-top: 20px; text-align: right; }
        .total-label { font-weight: bold; font-size: 18px; }
        .total-value { font-size: 18px; color: #d4af37; }
        .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 class="report-title">Hotel Admin</h1>
        <p class="report-subtitle">Informe de Turno</p>
      </div>
      
      <div class="info-section">
        <h2 class="info-title">Información del Turno</h2>
        <div class="info-row">
          <span class="info-label">Fecha:</span>
          <span class="info-value">${new Date(shift.date).toLocaleDateString()}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Turno:</span>
          <span class="info-value">${shift.shift}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Empleado:</span>
          <span class="info-value">${shift.employee}</span>
        </div>
      </div>
      
      <div class="info-section">
        <h2 class="info-title">Estadísticas</h2>
        <div class="info-row">
          <span class="info-label">Visitantes:</span>
          <span class="info-value">${shift.visitors}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Ingresos:</span>
          <span class="info-value">$${shift.revenue.toFixed(2)}</span>
        </div>
      </div>
      
      <div class="footer">
        <p>Informe generado el ${new Date().toLocaleString()}</p>
      </div>
    </body>
    </html>
  `

  // Crear una ventana nueva para imprimir
  const printWindow = window.open("", "_blank")
  if (printWindow) {
    printWindow.document.write(reportContent)
    printWindow.document.close()

    // Esperar a que los estilos se carguen y luego imprimir
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 500)
  } else {
    alert("Por favor, permita las ventanas emergentes para imprimir el informe.")
  }
}


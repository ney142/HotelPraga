// Agregar filtros de búsqueda a la tabla de gastos
document.addEventListener("DOMContentLoaded", () => {
  // Load data from localStorage
  let expenses = JSON.parse(localStorage.getItem("expenses") || "[]")

  // DOM elements
  const expenseForm = document.getElementById("expenseForm")
  const expensesTable = document.getElementById("expensesTable")
  const emptyExpenses = document.getElementById("emptyExpenses")

  // Crear modal para visualización de imágenes
  const modal = document.createElement("div")
  modal.className = "modal"
  modal.id = "receiptModal"
  modal.innerHTML = `
  <div class="modal-content">
    <span class="modal-close" id="closeReceiptModal">&times;</span>
    <img class="modal-content" id="receiptImage">
  </div>
`
  document.body.appendChild(modal)

  const modalImg = document.getElementById("receiptImage")
  const closeBtn = document.getElementById("closeReceiptModal")

  // Corregir el evento de cierre
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      modal.style.display = "none"
    })
  }

  // También cerrar al hacer clic fuera de la imagen
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none"
    }
  })

  // Initialize the expenses table
  updateExpensesTable()

  // Form submit event
  expenseForm.addEventListener("submit", function (e) {
    e.preventDefault()

    // Get form data
    const formData = new FormData(this)

    // Manejar la imagen del recibo
    const receiptFile = formData.get("receipt")
    const receiptUrl = "/placeholder.svg?height=100&width=100" // Imagen por defecto

    if (receiptFile && receiptFile.size > 0) {
      // Si hay un archivo, crear una URL para él
      const reader = new FileReader()
      reader.onload = (event) => {
        // Cuando la lectura esté completa, crear un nuevo gasto con la imagen
        const expenseData = {
          id: expenses.length > 0 ? Math.max(...expenses.map((e) => e.id)) + 1 : 1,
          name: formData.get("name"),
          amount: Number.parseFloat(formData.get("amount")),
          date: formData.get("date"),
          expenseType: formData.get("expenseType"),
          notes: formData.get("notes") || "",
          receipt: event.target.result, // Guardar la imagen como base64
          createdAt: new Date().toISOString(),
        }

        // Add expense to array
        expenses.push(expenseData)

        // Save to localStorage
        localStorage.setItem("expenses", JSON.stringify(expenses))

        // Update table
        updateExpensesTable()

        // Reset form
        expenseForm.reset()

        // Show success message
        alert("Gasto registrado correctamente")
      }
      reader.readAsDataURL(receiptFile)
    } else {
      // Si no hay archivo, crear el gasto con la imagen por defecto
      const expenseData = {
        id: expenses.length > 0 ? Math.max(...expenses.map((e) => e.id)) + 1 : 1,
        name: formData.get("name"),
        amount: Number.parseFloat(formData.get("amount")),
        date: formData.get("date"),
        expenseType: formData.get("expenseType"),
        notes: formData.get("notes") || "",
        receipt: receiptUrl,
        createdAt: new Date().toISOString(),
      }

      // Add expense to array
      expenses.push(expenseData)

      // Save to localStorage
      localStorage.setItem("expenses", JSON.stringify(expenses))

      // Update table
      updateExpensesTable()

      // Reset form
      this.reset()

      // Show success message
      alert("Gasto registrado correctamente")
    }
  })

  function updateExpensesTable() {
    // Get expenses from localStorage
    expenses = JSON.parse(localStorage.getItem("expenses") || "[]")

    // Check if there are expenses
    if (expenses.length === 0) {
      if (expensesTable) expensesTable.style.display = "none"
      if (emptyExpenses) emptyExpenses.style.display = "flex"
      return
    }

    // Show table and hide empty state
    if (expensesTable) expensesTable.style.display = "table"
    if (emptyExpenses) emptyExpenses.style.display = "none"

    // Clear table body
    const tableBody = expensesTable.querySelector("tbody")
    tableBody.innerHTML = ""

    // Add expenses to table
    expenses.forEach((expense) => {
      const row = document.createElement("tr")

      // Format date
      const expenseDate = new Date(expense.date).toLocaleDateString()

      row.innerHTML = `
        <td>${expense.id}</td>
        <td>${expense.name}</td>
        <td class="font-medium" style="color: var(--gold)">$${expense.amount.toFixed(2)}</td>
        <td>${expenseDate}</td>
        <td>${expense.expenseType || "N/A"}</td>
        <td>${expense.notes}</td>
        <td>
          <button class="btn btn-outline view-receipt" style="padding: 0.25rem; width: 2rem; height: 2rem;" data-receipt="${expense.id}">
            <i class="fa-solid fa-image"></i>
          </button>
        </td>
      `

      tableBody.appendChild(row)
    })

    // Agregar eventos a los botones de visualización de recibos
    document.querySelectorAll(".view-receipt").forEach((button) => {
      button.addEventListener("click", function () {
        const expenseId = this.getAttribute("data-receipt")
        const expense = expenses.find((e) => e.id == expenseId)

        if (expense && expense.receipt) {
          const modal = document.getElementById("receiptModal")
          const modalImg = document.getElementById("receiptImage")

          if (modal && modalImg) {
            modal.style.display = "block"
            modalImg.src = expense.receipt
          }
        }
      })
    })
  }

  // Agregar función para exportar a Excel
  window.exportToExcel = () => {
    if (!expenses.length) {
      alert("No hay datos para exportar")
      return
    }

    // Preparar datos para exportar
    const dataToExport = expenses.map((expense) => ({
      ID: expense.id,
      Nombre: expense.name,
      Monto: expense.amount,
      Fecha: new Date(expense.date).toLocaleDateString(),
      Notas: expense.notes,
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
    let XLSX
    // @ts-ignore
    if (typeof XLSX == "undefined") XLSX = null
    if (XLSX != null) {
      const wb = XLSX.utils.table_to_book(tempElement.querySelector("table"))

      // Guardar como archivo Excel
      // @ts-ignore
      XLSX.writeFile(wb, "Gastos.xlsx")

      alert("Exportación completada")
    } else {
      alert("Por favor, asegúrese de que la librería XLSX está correctamente importada.")
    }
  }

  // Agregar botón de exportación a Excel
  const cardHeader = document.querySelector(".card:nth-child(3) .card-header")
  if (cardHeader) {
    const exportButton = document.createElement("button")
    exportButton.className = "btn btn-outline"
    exportButton.innerHTML = '<i class="fa-solid fa-file-excel"></i> Exportar a Excel'
    exportButton.onclick = window.exportToExcel
    cardHeader.appendChild(exportButton)
  }

  // Agregar esta función después de la inicialización de la tabla
  function addFilterContainer() {
    const tableContainer = expensesTable.closest(".table-container")
    let filterContainer = tableContainer.querySelector(".search-filter-container")

    if (!filterContainer) {
      filterContainer = document.createElement("div")
      filterContainer.className = "search-filter-container"
      filterContainer.innerHTML = `
        <div class="search-box">
          <input type="text" id="expenseSearch" placeholder="Buscar gasto...">
          <button class="search-button"><i class="fa-solid fa-search"></i></button>
        </div>
        <div class="filter-dropdowns">
          <select id="typeFilter" class="filter-select">
            <option value="all">Todos los tipos</option>
            <option value="servicios">Servicios</option>
            <option value="productos">Productos</option>
            <option value="novedades">Novedades</option>
          </select>
          <select id="dateFilter" class="filter-select">
            <option value="all">Todas las fechas</option>
            <option value="today">Hoy</option>
            <option value="week">Esta semana</option>
            <option value="month">Este mes</option>
          </select>
        </div>
      `
      tableContainer.insertBefore(filterContainer, expensesTable)

      // Agregar eventos a los filtros
      const searchInput = document.getElementById("expenseSearch")
      const typeFilter = document.getElementById("typeFilter")
      const dateFilter = document.getElementById("dateFilter")

      searchInput.addEventListener("input", filterExpenses)
      typeFilter.addEventListener("change", filterExpenses)
      dateFilter.addEventListener("change", filterExpenses)
    }
  }

  // Función para filtrar gastos
  function filterExpenses() {
    const searchTerm = document.getElementById("expenseSearch").value.toLowerCase()
    const typeFilter = document.getElementById("typeFilter").value
    const dateFilter = document.getElementById("dateFilter").value

    const rows = document.querySelectorAll("#expensesTable tbody tr")
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay())

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

    rows.forEach((row) => {
      const name = row.cells[1].textContent.toLowerCase()
      const type = row.cells[4].textContent.toLowerCase()
      const dateStr = row.cells[3].textContent
      const dateParts = dateStr.split("/")
      // Asumimos formato DD/MM/YYYY
      const date = new Date(dateParts[2], dateParts[1] - 1, dateParts[0])

      const matchesSearch = name.includes(searchTerm)
      const matchesType = typeFilter === "all" || type === typeFilter

      // Filtrar por fecha
      let matchesDate = true
      if (dateFilter === "today") {
        matchesDate = date >= today && date < new Date(today.getTime() + 86400000)
      } else if (dateFilter === "week") {
        matchesDate = date >= weekStart
      } else if (dateFilter === "month") {
        matchesDate = date >= monthStart
      }

      if (matchesSearch && matchesType && matchesDate) {
        row.style.display = ""
      } else {
        row.style.display = "none"
      }
    })

    // Mostrar mensaje si no hay resultados
    const visibleRows = document.querySelectorAll('#expensesTable tbody tr:not([style*="display: none"])')
    const emptyResults = document.getElementById("emptyResults")

    if (visibleRows.length === 0) {
      if (!emptyResults) {
        const tableContainer = document.querySelector(".table-container")
        const noResultsDiv = document.createElement("div")
        noResultsDiv.id = "emptyResults"
        noResultsDiv.className = "empty-state"
        noResultsDiv.textContent = "No se encontraron gastos con los filtros seleccionados"
        tableContainer.appendChild(noResultsDiv)
      } else {
        emptyResults.style.display = "flex"
      }
      expensesTable.style.display = "none"
    } else {
      if (emptyResults) {
        emptyResults.style.display = "none"
      }
      expensesTable.style.display = "table"
    }
  }

  // Modificar la función updateExpensesTable para agregar filtros después de actualizar
  const originalUpdateExpensesTable = updateExpensesTable
  updateExpensesTable = () => {
    originalUpdateExpensesTable()

    // Añadir los filtros después de cargar la tabla
    addFilterContainer()
  }

  // Ejecutar inmediatamente para la carga inicial
  updateExpensesTable()
})


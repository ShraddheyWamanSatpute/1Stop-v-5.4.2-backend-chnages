import jsPDF from "jspdf"

type TableData = {
  headers: string[]
  rows: string[][]
}

const sanitizeCell = (value: string): string => value.replace(/\s+/g, " ").trim()

const getTableData = (container: HTMLElement | null): TableData | null => {
  if (!container) return null

  const table = container.querySelector("table")
  if (!table) return null

  const headers = Array.from(table.querySelectorAll("thead th"))
    .map((cell) => sanitizeCell(cell.textContent || ""))
    .filter(Boolean)

  const rows = Array.from(table.querySelectorAll("tbody tr"))
    .map((row) =>
      Array.from(row.querySelectorAll("td"))
        .map((cell) => sanitizeCell(cell.textContent || ""))
        .filter((cell, index, allCells) => index < allCells.length || Boolean(cell)),
    )
    .filter((row) => row.some(Boolean))

  if (!headers.length && !rows.length) return null

  return { headers, rows }
}

const triggerDownload = (contents: BlobPart, filename: string, mimeType: string): void => {
  const blob = new Blob([contents], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const escapeCsvValue = (value: string): string => `"${value.replace(/"/g, '""')}"`

export const exportReportContainerToCsv = (
  container: HTMLElement | null,
  filename: string,
): boolean => {
  const tableData = getTableData(container)
  if (!tableData) return false

  const csvLines = [
    tableData.headers.map(escapeCsvValue).join(","),
    ...tableData.rows.map((row) => row.map(escapeCsvValue).join(",")),
  ]

  triggerDownload(csvLines.join("\n"), filename, "text/csv;charset=utf-8;")
  return true
}

export const exportReportContainerToPdf = (
  container: HTMLElement | null,
  title: string,
  filename: string,
): boolean => {
  const tableData = getTableData(container)
  if (!tableData) return false

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 40
  const lineHeight = 18
  let y = margin

  doc.setFontSize(16)
  doc.text(title, margin, y)
  y += 28

  doc.setFontSize(10)

  const writeLine = (line: string) => {
    const wrapped = doc.splitTextToSize(line, pageWidth - margin * 2)
    wrapped.forEach((segment: string) => {
      if (y > pageHeight - margin) {
        doc.addPage()
        y = margin
      }
      doc.text(segment, margin, y)
      y += lineHeight
    })
  }

  writeLine(tableData.headers.join(" | "))
  y += 4

  tableData.rows.forEach((row) => {
    writeLine(row.join(" | "))
  })

  doc.save(filename)
  return true
}

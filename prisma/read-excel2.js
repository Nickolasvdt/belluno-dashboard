const XLSX = require('xlsx')
const path = require('path')

const BASE = 'C:\\Users\\nicko\\OneDrive\\Área de Trabalho\\BELLUNO\\'

function readSheet(wb, sheetName) {
  const ws = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' })
  console.log(`\n--- Sheet: ${sheetName} ---`)
  rows.slice(0, 20).forEach((row, i) => {
    const clean = row.filter(c => c !== '').join(' | ')
    if (clean) console.log(`  Row ${i}: ${clean}`)
  })
}

const wb = XLSX.readFile(path.join(BASE, 'Fechamento.xlsx'))

// Print a selection of sheets - recent months
const recent = ['OUTUBRO 2025', 'NOVEMBRO 2025', 'DEZEMBRO 2025', 'JANEIRO 2026', 'FEVEREIRO 2026', 'MARÇO 2026', 'ABRIL 2026', 'MAIO 2026']
for (const s of recent) {
  if (wb.SheetNames.includes(s)) readSheet(wb, s)
}

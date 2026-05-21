const XLSX = require('xlsx')
const path = require('path')

const BASE = 'C:\\Users\\nicko\\OneDrive\\Área de Trabalho\\BELLUNO\\'

function readFile(name) {
  const wb = XLSX.readFile(path.join(BASE, name))
  console.log(`\n=== ${name} ===`)
  console.log('Sheets:', wb.SheetNames)
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' })
    console.log(`\n--- Sheet: ${sheetName} ---`)
    // Print first 10 rows
    rows.slice(0, 15).forEach((row, i) => console.log(`Row ${i}:`, JSON.stringify(row)))
  }
}

readFile('CONTROLE DE CAIXA.xlsx')
readFile('Fechamento.xlsx')

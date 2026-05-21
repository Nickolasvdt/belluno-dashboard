const XLSX = require('xlsx')
const { PrismaClient } = require('@prisma/client')
const path = require('path')

const prisma = new PrismaClient()
const BASE = 'C:\\Users\\nicko\\OneDrive\\Área de Trabalho\\BELLUNO\\'

// Map month names → number
const MONTH_MAP = {
  'JANEIRO':1,'FEVEREIRO':2,'MARÇO':3,'MARCO':3,'ABRIL':4,'MAIO':5,'JUNHO':6,
  'JULHO':7,'AGOSTO':8,'SETEMBRO':9,'OUTUBRO':10,'NOVEMBRO':11,'DEZEMBRO':12,
}

// Parse Excel date serial to JS Date
function excelSerialToDate(serial) {
  if (!serial || typeof serial !== 'number') return null
  // Excel serial: 1 = Jan 1 1900; offset -25569 for Unix epoch
  const ms = Math.round((serial - 25569) * 86400 * 1000)
  const d = new Date(ms)
  // Validate range
  if (d.getFullYear() < 2020 || d.getFullYear() > 2030) return null
  d.setHours(12, 0, 0, 0)
  return d
}

function parseMoney(val) {
  if (val === null || val === undefined || val === '') return 0
  if (typeof val === 'number') return Math.round(val * 100) / 100
  const s = String(val).trim()
  if (!s || s === '-' || s === 'x' || s === 'X' || s.match(/^-?R?\$?\s*-+\s*$/) || s === 'R$ -' || s === ' R$ -   ') return 0
  const negative = s.startsWith('-')
  // Spreadsheet uses US format: comma = thousands separator, dot = decimal
  const clean = s.replace(/[R$\s]/g, '').replace(/-/g, '').replace(/,/g, '')
  const v = parseFloat(clean)
  return isNaN(v) ? 0 : Math.round((negative ? -v : v) * 100) / 100
}

function parseDay(dayVal, month, year) {
  if (dayVal === null || dayVal === undefined || dayVal === '') return null

  // Excel date serial → direct conversion
  if (typeof dayVal === 'number') {
    const d = excelSerialToDate(dayVal)
    if (d) { d.setHours(12, 0, 0, 0); return d }
    // Maybe it's just a day number (1-31)
    if (dayVal >= 1 && dayVal <= 31) return new Date(year, month - 1, dayVal, 12)
    return null
  }

  const s = String(dayVal).trim()
  if (!s) return null

  // M/D/YY or M/D/YYYY
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (mdy) {
    const [, mm, dd, yy] = mdy.map(Number)
    const y = yy < 100 ? 2000 + yy : yy
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null
    return new Date(y, mm - 1, dd, 12)
  }

  // "day-MonthAbbr" like "5-Sep", "25-Oct", "3-Mar"
  const dm = s.match(/^(\d{1,2})-[A-Za-z]+$/)
  if (dm) return new Date(year, month - 1, parseInt(dm[1]), 12)

  // "day-Sep" or "day-Oct" etc.
  const dm2 = s.match(/^(\d{1,2})[/-][A-Za-z]+/)
  if (dm2) return new Date(year, month - 1, parseInt(dm2[1]), 12)

  // Just a number
  const num = parseInt(s)
  if (!isNaN(num) && num >= 1 && num <= 31) return new Date(year, month - 1, num, 12)

  return null
}

// Parse "OUTUBRO 2025", "FEVEREIRO" → { month, year }
// For sheets without year, use defaultYear
function sheetNameToMonthYear(name, defaultYear = 2024) {
  const upper = name.toUpperCase().replace(/\./g, '').trim()
  const parts = upper.split(/\s+/)

  let month = null, year = defaultYear
  for (const p of parts) {
    if (MONTH_MAP[p]) month = MONTH_MAP[p]
    const y = parseInt(p)
    if (y >= 2024 && y <= 2030) year = y
  }
  if (!month) return null
  return { month, year }
}

// ─── CAIXA ───────────────────────────────────────────────────────────────────

async function importCaixa() {
  console.log('\n📦 Importando CONTROLE DE CAIXA...')
  const existing = await prisma.cashFlow.count()
  if (existing > 0) {
    console.log(`  ⚠️  Já existem ${existing} registros de caixa. Pulando.`)
    return
  }

  // Use raw:false so date strings come as formatted text
  const wb = XLSX.readFile(path.join(BASE, 'CONTROLE DE CAIXA.xlsx'))
  let total = 0

  for (const sheetName of wb.SheetNames) {
    const my = sheetNameToMonthYear(sheetName, null)
    if (!my) { console.log(`  ⏭️  ${sheetName}`); continue }

    const ws = wb.Sheets[sheetName]
    // raw:false to get formatted date strings (so "5-Sep" stays as text, not serial)
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' })

    // Find header row
    let headerRow = -1
    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      if (rows[i] && rows[i].some(c => String(c).trim().toUpperCase() === 'DIA')) {
        headerRow = i; break
      }
    }
    if (headerRow < 0) { console.log(`  ⚠️  Sem header: ${sheetName}`); continue }

    const dataRows = rows.slice(headerRow + 1)
    const records = []

    for (const row of dataRows) {
      if (!row || !row[0]) continue
      const date = parseDay(row[0], my.month, my.year)
      if (!date) continue

      const si = parseMoney(row[1])
      const en = parseMoney(row[2])
      const sa = parseMoney(row[3])
      const fech = parseMoney(row[4])

      const fechamento = fech !== 0 ? fech : Math.round((si + en - sa) * 100) / 100

      records.push({ date, saldoInicial: si, entradas: en, saidas: sa, fechamento, diferenca: null })
    }

    if (records.length > 0) {
      await prisma.cashFlow.createMany({ data: records })
      total += records.length
      console.log(`  ✅ ${sheetName}: ${records.length}`)
    } else {
      console.log(`  ⚠️  ${sheetName}: 0 (sem dados válidos)`)
    }
  }
  console.log(`  Total: ${total} registros de caixa`)
}

// ─── VENDAS ───────────────────────────────────────────────────────────────────

// 2026 format: DIA | SEMANA | BRUTO | A VISTA | STONE | PIX | IFOOD | 99FOOD | KEETA | TICKET | PLUXEE | ALELO | VR | PIZZAS
async function parseVendas2026(wb, sheetName, month, year) {
  const ws = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' })
  const records = []

  for (const row of rows.slice(2)) {
    if (!row[0]) continue
    const date = parseDay(row[0], month, year)
    if (!date) continue
    const brutoStr = row[2]
    if (brutoStr && typeof brutoStr === 'string' && !brutoStr.includes('R$') && brutoStr.trim()) {
      const lower = brutoStr.toLowerCase()
      if (lower.includes('fechad') || lower.includes('recesso') || lower.includes('folga')) {
        records.push({ date, avista:0, debito:0, credito:0, pix:0, ifood:0, outros:0, taxas:0, pizzas:0, observacao: brutoStr.trim().slice(0, 200) })
        continue
      }
      continue // skip header-like rows
    }

    const avista = parseMoney(row[3])
    const debito = parseMoney(row[4])   // STONE
    const pix = parseMoney(row[5])      // TUNA(PIX)
    const ifood = parseMoney(row[6])    // IFOOD
    const f99 = parseMoney(row[7])      // 99FOOD
    const keeta = parseMoney(row[8])    // KEETA
    const ticket = parseMoney(row[9])   // TICKET
    const pluxee = parseMoney(row[10])  // PLUXEE
    const alelo = parseMoney(row[11])   // ALELO
    const vr = parseMoney(row[12])      // VR
    const credito = Math.round((ticket + pluxee + alelo + vr) * 100) / 100
    const bruto = parseMoney(row[2])
    const totalIdentificado = Math.round((avista + debito + credito + pix + ifood + f99 + keeta) * 100) / 100
    const ajusteBruto = bruto > 0 ? Math.max(0, Math.round((bruto - totalIdentificado) * 100) / 100) : 0
    const outros = Math.round((f99 + keeta + ajusteBruto) * 100) / 100
    const pizzas = parseInt(row[13]) || 0

    records.push({ date, avista, debito, credito, pix, ifood, outros, taxas:0, pizzas, observacao: null })
  }
  return records
}

// 2025 Oct-Dec format: DIA | SEMANA | BRUTO | A VISTA | DEBITO | CREDITO | PIX | IFOOD | PIZZAS | ...
async function parseVendas2025Late(wb, sheetName, month, year) {
  const ws = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' })
  const records = []

  for (const row of rows.slice(2)) {
    if (!row[0]) continue
    const date = parseDay(row[0], month, year)
    if (!date) continue

    const brutoStr = String(row[2] || '')
    if (brutoStr && !brutoStr.includes('R$') && brutoStr.trim()) {
      const lower = brutoStr.toLowerCase()
      if (lower.includes('total') || lower.includes('soraya') || lower.includes('priscila')
          || lower.includes('will') || lower.includes('fechad') || lower.includes('folga')) continue
    }

    const avista = parseMoney(row[3])
    const debito = parseMoney(row[4])   // DEBITO (Stone)
    const credito = parseMoney(row[5])  // CREDITO (VR)
    const pix = parseMoney(row[6])      // TUNA(PIX)
    const ifood = parseMoney(row[7])    // IFOOD
    const pizzas = parseInt(row[8]) || 0

    const bruto = parseMoney(row[2])
    const totalIdentificado = Math.round((avista + debito + credito + pix + ifood) * 100) / 100
    const outros = bruto > 0 ? Math.max(0, Math.round((bruto - totalIdentificado) * 100) / 100) : 0
    if (bruto === 0 && totalIdentificado === 0) continue

    records.push({ date, avista, debito, credito, pix, ifood, outros, taxas:0, pizzas, observacao: null })
  }
  return records
}

// Generic/flexible parser for 2024 and early 2025
async function parseVendasGeneric(wb, sheetName, month, year) {
  const ws = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' })
  const records = []

  // Find header row
  let headerRow = -1
  for (let i = 0; i < Math.min(rows.length, 4); i++) {
    if (rows[i] && rows[i].some(c => String(c).trim().toUpperCase() === 'DIA')) {
      headerRow = i; break
    }
  }
  if (headerRow < 0) return records

  const headers = rows[headerRow].map(h => String(h).trim().toUpperCase())
  // Day is at col 1 (index 1), values at cols 3-5
  const colBruto = headers.findIndex(h => h.includes('BRUTO') || h.includes('VENDA'))
  const colLiquido = headers.findIndex(h => h.includes('LIQUID'))
  const colPizzas = headers.findIndex(h => h.includes('PIZZA'))
  const colIfood = headers.findIndex(h => h.includes('IFOOD') || h.includes('FOOD'))

  for (const row of rows.slice(headerRow + 1)) {
    if (!row) continue
    // Day is at col 1
    const dayVal = row[1]
    if (!dayVal || !String(dayVal).trim()) continue
    const date = parseDay(dayVal, month, year)
    if (!date) continue

    let valor = 0
    if (colLiquido >= 0 && parseMoney(row[colLiquido]) > 0) valor = parseMoney(row[colLiquido])
    else if (colBruto >= 0 && parseMoney(row[colBruto]) > 0) valor = parseMoney(row[colBruto])
    else valor = parseMoney(row[3]) // fallback col D

    if (valor === 0) continue

    const ifood = colIfood >= 0 ? parseMoney(row[colIfood]) : 0
    const pizzas = colPizzas >= 0 ? (parseInt(row[colPizzas]) || 0) : 0

    records.push({ date, avista: valor, debito:0, credito:0, pix:0, ifood, outros:0, taxas:0, pizzas, observacao: '(importado)' })
  }
  return records
}

// Parse funcionarios from 2025 Oct-Dec (cols 9-11)
async function parseFuncionarios2025Late(wb, sheetName, month, year) {
  const ws = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' })
  const records = []

  for (const row of rows.slice(2)) {
    if (!row) continue
    const nome = String(row[9] || '').trim()
    if (!nome || nome.toUpperCase() === 'NOME' || nome.toUpperCase().startsWith('TOTAL')) continue
    const valor = parseMoney(row[11])
    if (valor <= 0) continue
    const semana = String(row[10] || '').trim() || null
    records.push({ date: new Date(year, month - 1, 1, 12), nome, semana, valor })
  }
  return records
}

// Parse contas fixas from 2025 Oct-Dec (cols 12-15)
async function parseContas2025Late(wb, sheetName, month, year) {
  const ws = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' })
  const records = []

  for (const row of rows.slice(2)) {
    if (!row) continue
    const despesa = String(row[13] || '').trim()
    if (!despesa || despesa.toUpperCase() === 'DESPESA' || despesa.toUpperCase().startsWith('TOTAL')) continue
    const valor = parseMoney(row[14])
    if (valor <= 0) continue
    const pago = String(row[15] || '').trim().toUpperCase() === 'OK'
    const diaRaw = row[12]
    const dia = typeof diaRaw === 'number' ? diaRaw : parseInt(diaRaw) || null
    records.push({
      date: new Date(year, month - 1, dia || 1, 12),
      despesa,
      valor,
      pago,
      diaVencimento: dia && dia >= 1 && dia <= 31 ? dia : null,
    })
  }
  return records
}

// Parse contas fixas from 2024 generic format (cols 10-13)
async function parseContas2024(wb, sheetName, month, year) {
  const ws = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' })
  const records = []

  // Find header row
  let headerRow = -1
  for (let i = 0; i < 4; i++) {
    if (rows[i] && rows[i].some(c => String(c).trim().toUpperCase() === 'DIA')) { headerRow = i; break }
  }
  if (headerRow < 0) return records

  const headers = rows[headerRow].map(h => String(h).trim().toUpperCase())
  // Find "CONTAS FIXAS" section - look for "DESPESA" column
  const colDespesa = headers.findIndex(h => h === 'DESPESA')
  if (colDespesa < 0) return records
  const colDia = colDespesa - 1
  const colCusto = colDespesa + 1
  const colPg = colDespesa + 2

  for (const row of rows.slice(headerRow + 1)) {
    if (!row) continue
    const despesa = String(row[colDespesa] || '').trim()
    if (!despesa || despesa.toUpperCase().startsWith('TOTAL')) continue
    const valor = parseMoney(row[colCusto])
    if (valor <= 0) continue
    const pago = String(row[colPg] || '').trim().toUpperCase() === 'OK'
    const diaRaw = row[colDia]
    const dia = typeof diaRaw === 'number' ? diaRaw : parseInt(diaRaw) || null
    records.push({
      date: new Date(year, month - 1, dia || 1, 12),
      despesa,
      valor,
      pago,
      diaVencimento: dia && dia >= 1 && dia <= 31 ? dia : null,
    })
  }
  return records
}

async function parseFuncionarios2024(wb, sheetName, month, year) {
  const ws = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' })
  const records = []

  let headerRow = -1
  for (let i = 0; i < 4; i++) {
    if (rows[i] && rows[i].some(c => String(c).trim().toUpperCase() === 'DIA')) { headerRow = i; break }
  }
  if (headerRow < 0) return records

  const headers = rows[headerRow].map(h => String(h).trim().toUpperCase())
  const colNome = headers.findIndex(h => h === 'NOME')
  if (colNome < 0) return records
  const colSemana = colNome + 1
  const colCusto = colNome + 2

  for (const row of rows.slice(headerRow + 1)) {
    if (!row) continue
    const nome = String(row[colNome] || '').trim().replace(/\s+/g, ' ')
    if (!nome || nome.toUpperCase().startsWith('TOTAL') || nome.toUpperCase() === 'NOME') continue
    const valor = parseMoney(row[colCusto])
    if (valor <= 0) continue
    const semana = String(row[colSemana] || '').trim() || null
    records.push({ date: new Date(year, month - 1, 1, 12), nome, semana, valor })
  }
  return records
}

async function importFechamento() {
  console.log('\n📦 Importando FECHAMENTO...')

  const [ev, ef, ec, ei] = await Promise.all([
    prisma.venda.count(), prisma.funcionario.count(),
    prisma.contaFixa.count(), prisma.insumo.count(),
  ])
  const doVendas = ev === 0, doFunc = ef === 0, doContas = ec === 0

  if (!doVendas && !doFunc && !doContas) {
    console.log(`  ⚠️  Dados já existem (${ev} vendas, ${ef} func, ${ec} contas). Pulando.`)
    return
  }

  const wb = XLSX.readFile(path.join(BASE, 'Fechamento.xlsx'))
  const SKIP = ['LISTA COMPRAS', 'CADASTRO MOTO', 'PRECIFICAÇÃO']
  let tv = 0, tf = 0, tc = 0

  // 2024 sheets: FEVEREIRO, MARÇO, ..., DEZEMBRO (no year in name)
  const SHEETS_2024 = ['FEVEREIRO','MARÇO','MARCO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO']

  for (const sheetName of wb.SheetNames) {
    if (SKIP.includes(sheetName)) continue

    let my = sheetNameToMonthYear(sheetName, null)

    // Handle 2024 sheets (no year)
    if (!my) {
      const upper = sheetName.toUpperCase().replace(/\./g, '').trim()
      if (MONTH_MAP[upper]) my = { month: MONTH_MAP[upper], year: 2024 }
      else { console.log(`  ⏭️  Pulando: ${sheetName}`); continue }
    }

    const { month, year } = my
    const is2026 = year === 2026
    const is2025Late = year === 2025 && month >= 10
    const is2024 = year === 2024
    const isEarly2025 = year === 2025 && month < 10

    try {
      if (doVendas) {
        let records = []
        if (is2026) records = await parseVendas2026(wb, sheetName, month, year)
        else if (is2025Late) records = await parseVendas2025Late(wb, sheetName, month, year)
        else records = await parseVendasGeneric(wb, sheetName, month, year)

        if (records.length > 0) {
          await prisma.venda.createMany({ data: records })
          tv += records.length
          console.log(`  ✅ Vendas ${sheetName}: ${records.length}`)
        }
      }

      if (doFunc && (is2025Late || is2024)) {
        const records = is2025Late
          ? await parseFuncionarios2025Late(wb, sheetName, month, year)
          : await parseFuncionarios2024(wb, sheetName, month, year)
        if (records.length > 0) {
          await prisma.funcionario.createMany({ data: records })
          tf += records.length
        }
      }

      if (doContas && (is2025Late || is2024)) {
        const records = is2025Late
          ? await parseContas2025Late(wb, sheetName, month, year)
          : await parseContas2024(wb, sheetName, month, year)
        if (records.length > 0) {
          await prisma.contaFixa.createMany({ data: records })
          tc += records.length
        }
      }
    } catch (err) {
      console.log(`  ⚠️  Erro em ${sheetName}: ${err.message}`)
    }
  }

  console.log(`  Total Vendas: ${tv} | Funcionários: ${tf} | Contas Fixas: ${tc}`)
}

async function main() {
  console.log('🚀 Importando dados das planilhas...')
  try {
    await importCaixa()
    await importFechamento()
    console.log('\n✅ Concluído!')
  } catch (err) {
    console.error('\n❌ Erro:', err)
    throw err
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(e => { console.error(e); process.exit(1) })

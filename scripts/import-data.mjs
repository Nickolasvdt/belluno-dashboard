// scripts/import-data.mjs
// Run: node scripts/import-data.mjs
import { PrismaClient } from '@prisma/client'
import XLSX from 'xlsx'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const prisma = new PrismaClient()

// ─── Helpers ─────────────────────────────────────────────────────────────────

function xlDate(serial) {
  if (!serial || typeof serial !== 'number' || serial < 1000) return null
  return new Date(Date.UTC(1899, 11, 30) + serial * 86400000)
}

function dayToDate(day, year, month) {
  const d = typeof day === 'string' ? parseInt(day) : day
  if (!d || isNaN(d) || d < 1 || d > 31) return null
  return new Date(Date.UTC(year, month - 1, d))
}

function toNum(v) {
  if (typeof v === 'number' && !isNaN(v)) return v
  return 0
}

function isValidNum(v) { return typeof v === 'number' && !isNaN(v) && v > 0 }

function startOfMonth(year, month) {
  return new Date(Date.UTC(year, month - 1, 1))
}
function endOfMonth(year, month) {
  return new Date(Date.UTC(year, month, 0, 23, 59, 59))
}

const MONTH_MAP = {
  'JANEIRO': 1, 'FEVEREIRO': 2, 'MARCO': 3, 'ABRIL': 4, 'MAIO': 5, 'JUNHO': 6,
  'JULHO': 7, 'AGOSTO': 8, 'SETEMBRO': 9, 'OUTUBRO': 10, 'NOVEMBRO': 11, 'DEZEMBRO': 12
}

function normalizeMonth(name) {
  return name.toUpperCase()
    .replace(/[ÀÁÂÃÄ]/g, 'A').replace(/[ÇÃ]/g, 'C').replace(/[ÉÊ]/g, 'E')
    .replace(/[ÍÎ]/g, 'I').replace(/[ÓÔÕ]/g, 'O').replace(/[ÚÛ]/g, 'U')
    .replace(/\./g, '').trim()
}

function parseSheetName(sheetName) {
  const parts = sheetName.trim().split(/\s+/)
  const monthRaw = normalizeMonth(parts[0])
  const month = MONTH_MAP[monthRaw]
  if (!month) return null
  let year = 2024
  if (parts[1] && /^\d{4}$/.test(parts[1])) year = parseInt(parts[1])
  return { month, year }
}

function isFechado(v) {
  if (typeof v !== 'string') return false
  const u = v.toUpperCase()
  return u.includes('FECHA') || u.includes('RECESSO') || u.includes('FOLGA') || u.includes('FERIADO')
}

// ─── Skip sheets ──────────────────────────────────────────────────────────────

const SKIP_SHEETS = ['LISTA COMPRAS', 'CADASTRO MOTO', 'PRECIFICAÇÃO']

// ─── Detect format ────────────────────────────────────────────────────────────
// old2024: row[1][3] === 'VENDAS'  (cols: dia=1, semana=2, total=3, pizzas=4, func:6-8, contas:10-12, insumos:14-16)
// medium:  row[0][0] === null && row[1][3] === 'BRUTO'  (cols: dia=1, bruto=3, avista=4, ..., pizzas=9, func:11-13, contas:15-18)
// new2026: row[0][0] !== null  (cols: dia=0, bruto=2, avista=3, ..., pizzas=13; func from row~64; insumos/contas from row~117)

function detectFormat(data) {
  const r0 = data[0] || []
  if (r0[0] != null && typeof r0[0] !== 'undefined' && r0[0] !== '') return 'new2026'
  const r1 = data[1] || []
  if (r1[3] === 'VENDAS') return 'old2024'
  return 'medium'
}

// ─── Month exists check ───────────────────────────────────────────────────────

async function monthHasVendas(year, month) {
  const count = await prisma.venda.count({
    where: { date: { gte: startOfMonth(year, month), lte: endOfMonth(year, month) } }
  })
  return count > 0
}

async function monthHasFunc(year, month) {
  const count = await prisma.funcionario.count({
    where: { date: { gte: startOfMonth(year, month), lte: endOfMonth(year, month) } }
  })
  return count > 0
}

async function monthHasContas(year, month) {
  const count = await prisma.contaFixa.count({
    where: { date: { gte: startOfMonth(year, month), lte: endOfMonth(year, month) } }
  })
  return count > 0
}

async function monthHasInsumos(year, month) {
  const count = await prisma.insumo.count({
    where: { date: { gte: startOfMonth(year, month), lte: endOfMonth(year, month) } }
  })
  return count > 0
}

// ─── Import VENDAS ────────────────────────────────────────────────────────────

async function importVendasOld(data, year, month) {
  const rows = []
  for (let i = 2; i < data.length; i++) {
    const row = data[i]
    if (!row || row.length < 4) continue
    const dateVal = row[1]
    const date = xlDate(dateVal)
    if (!date) continue
    const vendas = row[3]
    if (isFechado(vendas)) continue
    if (typeof vendas !== 'number' || vendas <= 0) continue
    const pizzas = typeof row[4] === 'number' ? row[4] : 0
    rows.push({ date, avista: 0, debito: 0, credito: 0, pix: 0, ifood: 0, outros: vendas, taxas: 0, pizzas: Math.floor(pizzas) })
  }
  if (rows.length > 0) {
    await prisma.venda.createMany({ data: rows })
    console.log(`  Vendas (old): ${rows.length} registros`)
  }
}

async function importVendasMedium(data, year, month) {
  const rows = []
  for (let i = 2; i < data.length; i++) {
    const row = data[i]
    if (!row || row.length < 4) continue
    const dateVal = row[1]
    if (typeof dateVal === 'string' && dateVal.toUpperCase().includes('TOTAL')) break
    const date = xlDate(dateVal)
    if (!date) continue
    const bruto = row[3]
    if (isFechado(bruto) || (typeof bruto === 'string' && bruto.toUpperCase().includes('TOTAL'))) continue
    if (typeof bruto !== 'number' || bruto <= 0) continue
    const avista = toNum(row[4])
    const debito = toNum(row[5])
    const credito = toNum(row[6])
    const pix = toNum(row[7])
    const ifood = toNum(row[8])
    const pizzas = typeof row[9] === 'number' ? row[9] : 0
    const sumKnown = avista + debito + credito + pix + ifood
    const outros = Math.max(0, Math.round((bruto - sumKnown) * 100) / 100)
    rows.push({ date, avista, debito, credito, pix, ifood, outros, taxas: 0, pizzas: Math.floor(pizzas) })
  }
  if (rows.length > 0) {
    await prisma.venda.createMany({ data: rows })
    console.log(`  Vendas (medium): ${rows.length} registros`)
  }
}

async function importVendasNew2026(data, year, month) {
  const rows = []
  for (let i = 2; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[0]) continue
    if (typeof row[0] === 'string' && row[0].toUpperCase().includes('TOTAL')) break
    const date = xlDate(row[0])
    if (!date) continue
    const bruto = row[2]
    // Check if closed (text in col 3)
    if (typeof row[3] === 'string' && row[3].toUpperCase().includes('FECHA')) continue
    if (typeof bruto !== 'number' || bruto <= 0) continue
    const avista = toNum(row[3])
    const debito = toNum(row[4])  // STONE
    const pix = toNum(row[5])    // TUNA/PIX
    const ifood = toNum(row[6])
    const outros99 = toNum(row[7]) + toNum(row[8])  // 99FOOD + KEETA
    const credito = toNum(row[9]) + toNum(row[10]) + toNum(row[11]) + toNum(row[12])  // TICKET+PLUXEE+ALELO+VR
    const pizzas = typeof row[13] === 'number' ? row[13] : 0
    const sumKnown = avista + debito + pix + ifood + outros99 + credito
    const outros = Math.max(0, Math.round((bruto - sumKnown) * 100) / 100)
    rows.push({ date, avista, debito, credito, pix, ifood, outros: outros + outros99, taxas: 0, pizzas: Math.floor(pizzas) })
  }
  if (rows.length > 0) {
    await prisma.venda.createMany({ data: rows })
    console.log(`  Vendas (2026): ${rows.length} registros`)
  }
}

// ─── Import FUNCIONARIOS ──────────────────────────────────────────────────────

async function importFuncOld(data, year, month) {
  const rows = []
  for (let i = 2; i < data.length; i++) {
    const row = data[i]
    if (!row) continue
    const dateVal = row[6]
    const nome = row[7]
    const valor = row[8]
    if (!nome || typeof nome !== 'string' || nome.toUpperCase() === 'TOTAL') continue
    if (!isValidNum(valor)) continue
    const date = xlDate(dateVal) || startOfMonth(year, month)
    rows.push({ date, nome, semana: null, valor })
  }
  if (rows.length > 0) {
    await prisma.funcionario.createMany({ data: rows })
    console.log(`  Funcionários (old): ${rows.length} registros`)
  }
}

async function importFuncMedium(data, year, month) {
  const rows = []
  const firstDay = startOfMonth(year, month)
  for (let i = 2; i < data.length; i++) {
    const row = data[i]
    if (!row) continue
    const nome = row[11]
    const semana = row[12]
    const valor = row[13]
    if (!nome || typeof nome !== 'string') continue
    if (nome.toUpperCase().includes('TOTAL') || nome.toUpperCase().includes('REPASSE') || nome.toUpperCase().includes('DIARIA')) continue
    if (!isValidNum(valor)) continue
    const semanaStr = typeof semana === 'string' ? semana : null
    rows.push({ date: firstDay, nome, semana: semanaStr, valor })
  }
  if (rows.length > 0) {
    await prisma.funcionario.createMany({ data: rows })
    console.log(`  Funcionários (medium): ${rows.length} registros`)
  }
}

async function importFuncNew2026(data, year, month) {
  const rows = []
  const firstDay = startOfMonth(year, month)
  let inSection = false
  for (let i = 60; i < Math.min(data.length, 120); i++) {
    const row = data[i]
    if (!row) continue
    if (!inSection) {
      if (row[0] === 'NOME' && row[1] === 'SEMANA' && row[2] === 'VALOR') {
        inSection = true
        continue
      }
      continue
    }
    if (typeof row[0] === 'string' && row[0] === 'TOTAL COLABORADORES') break
    const nome = row[0]
    const semana = row[1]
    const valor = row[2]
    // Only include rows where nome is a non-empty string and semana starts with "SEMANA"
    if (typeof nome !== 'string' || !nome.trim()) continue
    if (typeof semana !== 'string' || !semana.toUpperCase().startsWith('SEMANA')) continue
    if (!isValidNum(valor)) continue
    rows.push({ date: firstDay, nome: nome.trim(), semana, valor })
  }
  if (rows.length > 0) {
    await prisma.funcionario.createMany({ data: rows })
    console.log(`  Funcionários (2026): ${rows.length} registros`)
  }
}

// ─── Import CONTAS FIXAS ──────────────────────────────────────────────────────

async function importContasOld(data, year, month) {
  const rows = []
  for (let i = 2; i < data.length; i++) {
    const row = data[i]
    if (!row) continue
    const dateVal = row[10]
    const despesa = row[11]
    const custo = row[12]
    if (!despesa || typeof despesa !== 'string' || despesa.toUpperCase() === 'TOTAL') continue
    if (!isValidNum(custo)) continue
    const date = xlDate(dateVal) || startOfMonth(year, month)
    rows.push({ date, despesa, valor: custo, pago: true, diaVencimento: null })
  }
  if (rows.length > 0) {
    await prisma.contaFixa.createMany({ data: rows })
    console.log(`  Contas (old): ${rows.length} registros`)
  }
}

async function importContasMedium(data, year, month) {
  const rows = []
  for (let i = 2; i < data.length; i++) {
    const row = data[i]
    if (!row) continue
    const diaVal = row[15]
    const despesa = row[16]
    const custo = row[17]
    const pg = row[18]
    if (!despesa || typeof despesa !== 'string') continue
    if (despesa.toUpperCase() === 'TOTAL' || despesa.toUpperCase() === 'DESPESA') continue
    if (!isValidNum(custo)) continue
    const dia = typeof diaVal === 'number' ? diaVal : null
    const date = dayToDate(dia, year, month) || startOfMonth(year, month)
    const pago = typeof pg === 'string' && pg.toUpperCase() === 'OK'
    rows.push({ date, despesa, valor: custo, pago, diaVencimento: dia && dia <= 31 ? dia : null })
  }
  if (rows.length > 0) {
    await prisma.contaFixa.createMany({ data: rows })
    console.log(`  Contas (medium): ${rows.length} registros`)
  }
}

async function importContasNew2026(data, year, month) {
  const rows = []
  // Find row with "CONTAS FIXAS" header (around row 117)
  let contasStart = -1
  for (let i = 115; i < Math.min(data.length, 130); i++) {
    const row = data[i]
    if (row && row.some(v => v === 'CONTAS FIXAS')) {
      contasStart = i + 2 // skip to data rows (after header)
      break
    }
  }
  if (contasStart < 0) return

  for (let i = contasStart; i < Math.min(data.length, 165); i++) {
    const row = data[i]
    if (!row) continue
    const diaVal = row[10]
    const despesa = row[11]
    const custo = row[12]
    const pg = row[13]
    if (!despesa || typeof despesa !== 'string') continue
    if (despesa.toUpperCase() === 'TOTAL' || despesa.toUpperCase() === 'DESPESA' || despesa.toUpperCase() === 'PG?') continue
    if (!isValidNum(custo)) continue
    let dia = null
    if (typeof diaVal === 'number' && diaVal >= 1 && diaVal <= 31) dia = diaVal
    else if (typeof diaVal === 'string') {
      const n = parseInt(diaVal)
      if (!isNaN(n) && n >= 1 && n <= 31) dia = n
    }
    const date = dia ? dayToDate(dia, year, month) || startOfMonth(year, month) : startOfMonth(year, month)
    const pago = typeof pg === 'string' && pg.toUpperCase().includes('OK')
    rows.push({ date, despesa, valor: custo, pago, diaVencimento: dia })
  }
  if (rows.length > 0) {
    await prisma.contaFixa.createMany({ data: rows })
    console.log(`  Contas (2026): ${rows.length} registros`)
  }
}

// ─── Import INSUMOS ───────────────────────────────────────────────────────────

async function importInsumosOld(data, year, month) {
  const rows = []
  for (let i = 2; i < data.length; i++) {
    const row = data[i]
    if (!row) continue
    const dateVal = row[14]
    const fornecedor = row[15]
    const valor = row[16]
    if (!fornecedor || typeof fornecedor !== 'string') continue
    if (fornecedor.toUpperCase() === 'TOTAL' || fornecedor.toUpperCase().startsWith('REPASSE')) continue
    if (!isValidNum(valor)) continue
    const date = xlDate(dateVal) || startOfMonth(year, month)
    rows.push({ date, fornecedor, valor })
  }
  if (rows.length > 0) {
    await prisma.insumo.createMany({ data: rows })
    console.log(`  Insumos (old): ${rows.length} registros`)
  }
}

async function importInsumosNew2026(data, year, month) {
  // Suppliers in 2026 format: PMG (cols 0,1), Sacolão (cols 3,4), CristauLat (cols 0,1 after row 126),
  // Atacado (cols 3,4 after row 126), JMW (cols 0,1 after row 137), Mega G (cols 3,4 after row 137), Repasses (col 0,1 after 147)
  const rows = []

  let sectionStart = -1
  for (let i = 115; i < Math.min(data.length, 125); i++) {
    const row = data[i]
    if (row && row[0] === 'PMG') { sectionStart = i; break }
  }
  if (sectionStart < 0) return

  // Parse sections sequentially
  const sections = []
  let i = sectionStart
  while (i < data.length && i < sectionStart + 50) {
    const row = data[i]
    if (!row || !row.some(v => v != null)) { i++; continue }
    // New supplier section header
    if (typeof row[0] === 'string' && !row[0].includes('TOTAL') && row[0] !== 'Dia') {
      const leftName = row[0]
      const rightName = row[3]
      sections.push({ name: leftName, col: 0, startRow: i + 2 })
      if (rightName && typeof rightName === 'string' && !rightName.includes('TOTAL') && rightName !== 'Valor') {
        sections.push({ name: rightName, col: 3, startRow: i + 2 })
      }
    }
    i++
  }

  // For each section, parse data rows between its header and the next section
  // Simpler approach: scan all rows in the insumos area and collect (date, valor) pairs per column group
  const colGroups = [
    { name: '', col: 0, rows: [] },
    { name: '', col: 3, rows: [] },
  ]
  let currentColNames = ['', '']

  for (let ri = sectionStart; ri < Math.min(data.length, sectionStart + 60); ri++) {
    const row = data[ri]
    if (!row) continue
    const v0 = row[0], v3 = row[3]

    // Detect section headers
    if (typeof v0 === 'string' && v0 !== 'Dia' && v0 !== 'TOTAL:' && !v0.startsWith('TOTAL')) {
      if (v0 !== 'Repasses' || true) currentColNames[0] = v0
    }
    if (typeof v3 === 'string' && v3 !== 'Dia' && v3 !== 'TOTAL:' && !v3.startsWith('TOTAL')) {
      currentColNames[1] = v3
    }

    // Collect data: left group (col0=date, col1=value)
    if (isValidNum(v0) && v0 > 1000 && isValidNum(row[1])) {
      const date = xlDate(v0)
      if (date && currentColNames[0]) {
        rows.push({ date, fornecedor: currentColNames[0], valor: row[1] })
      }
    }
    // Right group (col3=date, col4=value)
    if (isValidNum(v3) && v3 > 1000 && isValidNum(row[4])) {
      const date = xlDate(v3)
      if (date && currentColNames[1]) {
        rows.push({ date, fornecedor: currentColNames[1], valor: row[4] })
      }
    }
  }

  if (rows.length > 0) {
    await prisma.insumo.createMany({ data: rows })
    console.log(`  Insumos (2026): ${rows.length} registros`)
  }
}

// ─── Import CASHFLOW ──────────────────────────────────────────────────────────

async function importCashFlowSheet(data, year, month) {
  let inserted = 0
  for (let i = 2; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[0]) continue
    const dayVal = row[0]
    let date
    if (typeof dayVal === 'number' && dayVal < 100) {
      date = dayToDate(dayVal, year, month)
    } else {
      date = xlDate(dayVal)
    }
    if (!date) continue
    const saldoInicial = toNum(row[1])
    const entradas = toNum(row[2])
    const saidas = toNum(row[3])
    const fechamento = toNum(row[4])
    if (fechamento === 0 && entradas === 0 && saidas === 0) continue
    const diferenca = typeof row[5] === 'number' ? row[5] : null

    // Check if exists for this date
    const existing = await prisma.cashFlow.findFirst({ where: { date } })
    if (existing) {
      await prisma.cashFlow.update({ where: { id: existing.id }, data: { saldoInicial, entradas, saidas, fechamento, diferenca } })
    } else {
      await prisma.cashFlow.create({ data: { date, saldoInicial, entradas, saidas, fechamento, diferenca } })
    }
    inserted++
  }
  if (inserted > 0) console.log(`  CashFlow: ${inserted} registros`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Iniciando importação...\n')

  // ── Fechamento.xlsx ──────────────────────────────────────────────────────────
  const fechPath = join(__dirname, '..', '..', 'Fechamento.xlsx')
  const fechWb = XLSX.readFile(fechPath)

  for (const sheetName of fechWb.SheetNames) {
    if (SKIP_SHEETS.includes(sheetName)) continue
    const parsed = parseSheetName(sheetName)
    if (!parsed) continue
    const { year, month } = parsed

    const ws = fechWb.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
    const fmt = detectFormat(data)

    console.log(`[${sheetName}] (${year}/${month.toString().padStart(2,'0')}) formato: ${fmt}`)

    // Vendas
    if (!(await monthHasVendas(year, month))) {
      if (fmt === 'old2024') await importVendasOld(data, year, month)
      else if (fmt === 'medium') await importVendasMedium(data, year, month)
      else await importVendasNew2026(data, year, month)
    } else {
      console.log('  Vendas: já existem, pulando.')
    }

    // Funcionários
    if (!(await monthHasFunc(year, month))) {
      if (fmt === 'old2024') await importFuncOld(data, year, month)
      else if (fmt === 'medium') await importFuncMedium(data, year, month)
      else await importFuncNew2026(data, year, month)
    } else {
      console.log('  Funcionários: já existem, pulando.')
    }

    // Contas Fixas
    if (!(await monthHasContas(year, month))) {
      if (fmt === 'old2024') await importContasOld(data, year, month)
      else if (fmt === 'medium') await importContasMedium(data, year, month)
      else await importContasNew2026(data, year, month)
    } else {
      console.log('  Contas: já existem, pulando.')
    }

    // Insumos
    if (!(await monthHasInsumos(year, month))) {
      if (fmt === 'old2024') await importInsumosOld(data, year, month)
      else if (fmt === 'new2026') await importInsumosNew2026(data, year, month)
      // medium format: insumos mostly not filled in xlsx, skip
    } else {
      console.log('  Insumos: já existem, pulando.')
    }
  }

  // ── Controle de Caixa.xlsx ───────────────────────────────────────────────────
  console.log('\n─── Controle de Caixa ───')
  const caixaPath = join(__dirname, '..', '..', 'CONTROLE DE CAIXA.xlsx')
  const caixaWb = XLSX.readFile(caixaPath)

  for (const sheetName of caixaWb.SheetNames) {
    const parsed = parseSheetName(sheetName)
    if (!parsed) continue
    const { year, month } = parsed
    const ws = caixaWb.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
    console.log(`[${sheetName}] (${year}/${month.toString().padStart(2,'0')})`)
    await importCashFlowSheet(data, year, month)
  }

  console.log('\nImportação concluída!')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())

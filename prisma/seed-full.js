const path = require('path');
const fs = require('fs');

// ATENCAO: este seed limpa e recria CashFlow, Venda, Funcionario, ContaFixa e Insumo.
// Carrega .env manualmente sem depender do modulo dotenv
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const MONTHS = {
  JANEIRO: 1,
  FEVEREIRO: 2,
  MARCO: 3,
  ABRIL: 4,
  MAIO: 5,
  JUNHO: 6,
  JULHO: 7,
  AGOSTO: 8,
  SETEMBRO: 9,
  OUTUBRO: 10,
  NOVEMBRO: 11,
  DEZEMBRO: 12,
};

const CONTROLE_PATH = path.join(__dirname, '..', '..', 'CONTROLE DE CAIXA.xlsx');
const FECHAMENTO_PATH = path.join(__dirname, '..', '..', 'Fechamento.xlsx');

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

function excelSerialToDate(serial) {
  return new Date((serial - 25569) * 86400 * 1000);
}

function extractMonthYear(sheetName) {
  const normalized = normalizeText(sheetName);
  const monthKey = Object.keys(MONTHS).find((name) => normalized.includes(name));
  const yearMatch = normalized.match(/\b(20\d{2})\b/);

  if (!monthKey || !yearMatch) {
    return null;
  }

  return {
    month: MONTHS[monthKey],
    year: Number(yearMatch[1]),
  };
}

function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === '';
}

function toNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.getTime();
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || /^[xX]$/.test(trimmed)) {
    return null;
  }

  const cleaned = trimmed
    .replace(/R\$/gi, '')
    .replace(/\s/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');

  if (!cleaned || cleaned === '-' || cleaned === '.' || cleaned === '-.') {
    return null;
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function money(value, fallback = 0) {
  const parsed = toNumber(value);
  return parsed === null ? fallback : parsed;
}

function intValue(value, fallback = 0) {
  const parsed = toNumber(value);
  return parsed === null ? fallback : Math.trunc(parsed);
}

function validDate(date) {
  return date instanceof Date && !Number.isNaN(date.getTime());
}

function dateFromDayCell(dayCell, year, month, options = {}) {
  const { forceDayNumber = false } = options;

  if (dayCell instanceof Date && validDate(dayCell)) {
    return dayCell;
  }

  const parsed = toNumber(dayCell);
  if (parsed !== null) {
    if (!forceDayNumber && parsed > 100) {
      return excelSerialToDate(parsed);
    }

    if (parsed >= 1 && parsed <= 31) {
      return new Date(Date.UTC(year, month - 1, Math.trunc(parsed)));
    }
  }

  if (typeof dayCell === 'string') {
    const trimmed = dayCell.trim();
    const dateMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
    if (dateMatch) {
      const day = Number(dateMatch[1]);
      const detectedMonth = Number(dateMatch[2]);
      const detectedYear = dateMatch[3]
        ? Number(dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3])
        : year;

      if (day >= 1 && day <= 31 && detectedMonth >= 1 && detectedMonth <= 12) {
        return new Date(Date.UTC(detectedYear, detectedMonth - 1, day));
      }
    }
  }

  return null;
}

function rowsFromSheet(sheet) {
  return XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: true,
    blankrows: true,
  });
}

function warn(message) {
  console.warn(`[warn] ${message}`);
}

function parseControleCashFlow() {
  const cashFlows = [];

  if (!fs.existsSync(CONTROLE_PATH)) {
    warn(`Arquivo nao encontrado: ${CONTROLE_PATH}`);
    return cashFlows;
  }

  const workbook = XLSX.readFile(CONTROLE_PATH);

  for (const sheetName of workbook.SheetNames) {
    const parsedSheet = extractMonthYear(sheetName);
    if (!parsedSheet) {
      warn(`CONTROLE: ignorando aba sem mes/ano reconhecido: ${sheetName}`);
      continue;
    }

    const { year, month } = parsedSheet;
    const rows = rowsFromSheet(workbook.Sheets[sheetName]);

    for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
      try {
        const row = rows[rowIndex] || [];
        const dia = row[0];
        const saldoInicial = money(row[1]);
        const entradas = money(row[2]);
        const saidas = money(row[3]);
        const fechamento = money(row[4]);
        const diferenca = toNumber(row[5]);

        if (fechamento === 0 && saldoInicial === 0 && entradas === 0 && saidas === 0) {
          continue;
        }

        const forceDayNumber = year === 2025 && (month === 7 || month === 8);
        const date = dateFromDayCell(dia, year, month, { forceDayNumber });

        if (!validDate(date)) {
          warn(`CONTROLE ${sheetName} linha ${rowIndex + 1}: data invalida (${dia}); linha ignorada`);
          continue;
        }

        cashFlows.push({
          date,
          saldoInicial,
          entradas,
          saidas,
          fechamento,
          diferenca,
          observacao: null,
        });
      } catch (error) {
        warn(`CONTROLE ${sheetName} linha ${rowIndex + 1}: ${error.message}`);
      }
    }
  }

  return cashFlows;
}

function isClosedWeek(value) {
  return normalizeText(value).includes('FECHADO');
}

function isTotalCell(value) {
  return normalizeText(value).startsWith('TOTAL');
}

function textIsXOrBlank(value) {
  return isBlank(value) || normalizeText(value) === 'X';
}

function parseVendas(rows, sheetName, year, month) {
  const vendas = [];

  for (let rowIndex = 2; rowIndex <= 33 && rowIndex < rows.length; rowIndex += 1) {
    try {
      const row = rows[rowIndex] || [];
      const dia = row[0];
      const semana = row[1];
      const bruto = money(row[2], 0);

      if (isTotalCell(dia) || isClosedWeek(semana) || bruto === 0 || isBlank(row[2])) {
        continue;
      }

      const date = dateFromDayCell(dia, year, month);
      if (!validDate(date)) {
        warn(`VENDAS ${sheetName} linha ${rowIndex + 1}: data invalida (${dia}); linha ignorada`);
        continue;
      }

      const avistaRaw = row[3];
      const avistaNumber = toNumber(avistaRaw);
      const debito = money(row[4]);
      let pix = money(row[5]);
      const ifood = money(row[6]);
      const outros = [7, 8, 9, 10, 11, 12].reduce((total, col) => total + money(row[col]), 0);
      let avista = 0;

      if (avistaNumber !== null && avistaNumber > 0) {
        avista = avistaNumber;
        if (pix === 0) {
          pix = Math.max(bruto - avista, 0);
        }
      } else if (textIsXOrBlank(avistaRaw)) {
        avista = 0;
        if (pix === 0 && bruto > 0) {
          pix = bruto;
        }
      }

      vendas.push({
        date,
        avista,
        debito,
        credito: 0,
        pix,
        ifood,
        outros,
        taxas: 0,
        pizzas: intValue(row[13]),
        observacao: null,
      });
    } catch (error) {
      warn(`VENDAS ${sheetName} linha ${rowIndex + 1}: ${error.message}`);
    }
  }

  return vendas;
}

function weekToDay(semana) {
  const normalized = normalizeText(semana);
  const match = normalized.match(/[1-5]/);
  const week = match ? Number(match[0]) : null;

  return {
    1: 1,
    2: 8,
    3: 15,
    4: 22,
    5: 29,
  }[week] || null;
}

function parseFuncionarios(rows, sheetName, year, month) {
  const funcionarios = [];

  for (let rowIndex = 65; rowIndex <= 113 && rowIndex < rows.length; rowIndex += 1) {
    try {
      const row = rows[rowIndex] || [];
      const nome = isBlank(row[0]) ? '' : String(row[0]).trim();
      const valor = money(row[2], 0);

      if (!nome || valor <= 0) {
        continue;
      }

      const day = weekToDay(row[1]);
      if (!day) {
        warn(`FUNCIONARIOS ${sheetName} linha ${rowIndex + 1}: semana invalida (${row[1]}); linha ignorada`);
        continue;
      }

      funcionarios.push({
        date: new Date(Date.UTC(year, month - 1, day)),
        nome,
        semana: isBlank(row[1]) ? null : String(row[1]).trim(),
        valor,
      });
    } catch (error) {
      warn(`FUNCIONARIOS ${sheetName} linha ${rowIndex + 1}: ${error.message}`);
    }
  }

  return funcionarios;
}

function labelCandidate(value) {
  if (isBlank(value) || typeof value === 'number' || value instanceof Date) {
    return null;
  }

  const text = String(value).trim();
  const normalized = normalizeText(text);
  if (
    !text ||
    normalized === 'DIA' ||
    normalized === 'DATA' ||
    normalized === 'VALOR' ||
    normalized === 'CUSTO' ||
    normalized === 'PG' ||
    normalized === 'OK' ||
    normalized === 'X' ||
    normalized === 'NOME' ||
    normalized === 'SEMANA' ||
    normalized === 'DESPESA' ||
    normalized.startsWith('TOTAL')
  ) {
    return null;
  }

  if (/^\d{1,2}([/-]\d{1,2})?([/-]\d{2,4})?$/.test(text)) {
    return null;
  }

  return text;
}

function findFornecedor(rows, rowIndex, dayCol, valueCol) {
  const localStart = Math.max(0, rowIndex - 12);

  for (let scanRow = rowIndex - 1; scanRow >= localStart; scanRow -= 1) {
    const row = rows[scanRow] || [];
    const dayLabel = labelCandidate(row[dayCol]);
    const valueLabel = labelCandidate(row[valueCol]);

    if (dayLabel) {
      return dayLabel;
    }

    if (valueLabel) {
      return valueLabel;
    }
  }

  for (let scanRow = 115; scanRow <= 120 && scanRow < rows.length; scanRow += 1) {
    const row = rows[scanRow] || [];
    const dayLabel = labelCandidate(row[dayCol]);
    const valueLabel = labelCandidate(row[valueCol]);

    if (dayLabel) {
      return dayLabel;
    }

    if (valueLabel) {
      return valueLabel;
    }
  }

  return `Fornecedor_col${dayCol}`;
}

function parseInsumos(rows, sheetName, year, month) {
  const insumos = [];
  const pairs = [
    [0, 1],
    [2, 3],
    [4, 5],
    [6, 7],
  ];

  for (let rowIndex = 117; rowIndex <= 160 && rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] || [];

    for (const [dayCol, valueCol] of pairs) {
      try {
        const valor = money(row[valueCol], 0);
        const dayCell = row[dayCol];

        if (valor <= 0 || isTotalCell(dayCell)) {
          continue;
        }

        const parsedDate = dateFromDayCell(dayCell, year, month);
        const date = validDate(parsedDate) ? parsedDate : new Date(Date.UTC(year, month - 1, 1));

        insumos.push({
          date,
          fornecedor: findFornecedor(rows, rowIndex, dayCol, valueCol),
          valor,
        });
      } catch (error) {
        warn(`INSUMOS ${sheetName} linha ${rowIndex + 1} colunas ${dayCol}/${valueCol}: ${error.message}`);
      }
    }
  }

  return insumos;
}

function parseContasFixas(rows, sheetName, year, month) {
  const contasFixas = [];

  for (let rowIndex = 118; rowIndex <= 132 && rowIndex < rows.length; rowIndex += 1) {
    try {
      const row = rows[rowIndex] || [];
      const despesa = isBlank(row[11]) ? '' : String(row[11]).trim();

      if (!despesa || isTotalCell(despesa)) {
        continue;
      }

      const diaVencimentoNumber = toNumber(row[10]);
      const diaVencimento =
        diaVencimentoNumber !== null && diaVencimentoNumber >= 1 && diaVencimentoNumber <= 31
          ? Math.trunc(diaVencimentoNumber)
          : null;

      contasFixas.push({
        date: new Date(Date.UTC(year, month - 1, 1)),
        despesa,
        valor: money(row[12], 0),
        pago: normalizeText(row[13]) === 'OK',
        diaVencimento,
      });
    } catch (error) {
      warn(`CONTAS FIXAS ${sheetName} linha ${rowIndex + 1}: ${error.message}`);
    }
  }

  return contasFixas;
}

function parseFechamento() {
  const result = {
    vendas: [],
    funcionarios: [],
    contasFixas: [],
    insumos: [],
  };

  if (!fs.existsSync(FECHAMENTO_PATH)) {
    warn(`Arquivo nao encontrado: ${FECHAMENTO_PATH}`);
    return result;
  }

  const workbook = XLSX.readFile(FECHAMENTO_PATH);

  for (const sheetName of workbook.SheetNames) {
    const parsedSheet = extractMonthYear(sheetName);
    if (!parsedSheet) {
      warn(`FECHAMENTO: ignorando aba sem mes/ano reconhecido: ${sheetName}`);
      continue;
    }

    const { year, month } = parsedSheet;
    const rows = rowsFromSheet(workbook.Sheets[sheetName]);

    result.vendas.push(...parseVendas(rows, sheetName, year, month));
    result.funcionarios.push(...parseFuncionarios(rows, sheetName, year, month));
    result.insumos.push(...parseInsumos(rows, sheetName, year, month));
    result.contasFixas.push(...parseContasFixas(rows, sheetName, year, month));
  }

  return result;
}

async function createMany(delegate, data) {
  if (!data.length) {
    return { count: 0 };
  }

  return delegate.createMany({ data });
}

async function main() {
  const cashFlows = parseControleCashFlow();
  const fechamento = parseFechamento();

  console.log('Registros parseados:');
  console.log(`CashFlow: ${cashFlows.length}`);
  console.log(`Venda: ${fechamento.vendas.length}`);
  console.log(`Funcionario: ${fechamento.funcionarios.length}`);
  console.log(`ContaFixa: ${fechamento.contasFixas.length}`);
  console.log(`Insumo: ${fechamento.insumos.length}`);

  await prisma.cashFlow.deleteMany();
  await prisma.venda.deleteMany();
  await prisma.funcionario.deleteMany();
  await prisma.contaFixa.deleteMany();
  await prisma.insumo.deleteMany();

  const inserted = {
    CashFlow: await createMany(prisma.cashFlow, cashFlows),
    Venda: await createMany(prisma.venda, fechamento.vendas),
    Funcionario: await createMany(prisma.funcionario, fechamento.funcionarios),
    ContaFixa: await createMany(prisma.contaFixa, fechamento.contasFixas),
    Insumo: await createMany(prisma.insumo, fechamento.insumos),
  };

  console.log('Registros inseridos:');
  console.log(`CashFlow: ${inserted.CashFlow.count}`);
  console.log(`Venda: ${inserted.Venda.count}`);
  console.log(`Funcionario: ${inserted.Funcionario.count}`);
  console.log(`ContaFixa: ${inserted.ContaFixa.count}`);
  console.log(`Insumo: ${inserted.Insumo.count}`);

  const finalCounts = {
    CashFlow: await prisma.cashFlow.count(),
    Venda: await prisma.venda.count(),
    Funcionario: await prisma.funcionario.count(),
    ContaFixa: await prisma.contaFixa.count(),
    Insumo: await prisma.insumo.count(),
  };

  console.log('Contagem final no banco:');
  console.log(`CashFlow: ${finalCounts.CashFlow}`);
  console.log(`Venda: ${finalCounts.Venda}`);
  console.log(`Funcionario: ${finalCounts.Funcionario}`);
  console.log(`ContaFixa: ${finalCounts.ContaFixa}`);
  console.log(`Insumo: ${finalCounts.Insumo}`);
}

main()
  .catch((error) => {
    console.error('[erro] Seed full falhou:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

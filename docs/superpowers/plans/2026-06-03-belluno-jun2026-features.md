# Belluno Jun 2026 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar FechamentoDia, Colaboradores, Aba Semana, fusão Hoje+Caixa e filtro de funcionário conforme spec `docs/superpowers/specs/2026-06-03-belluno-features-design.md`.

**Architecture:** A página `/` torna-se um server component que faz role-split: ADMIN vê `HojeAdmin` (client component com 4 blocos), CAIXA vê `HojeCaixa` (client component espelho do antigo /caixa). A rota `/caixa` é deletada. Dois novos modelos Prisma (`FechamentoDia`, `Colaborador`) e seis novas rotas de API sustentam as features.

**Tech Stack:** Next.js 14, Prisma ORM, PostgreSQL (prod)/SQLite (dev), TypeScript, Tailwind CSS, next-auth, date-fns.

**Sem framework de testes:** verificação via curl para APIs e browser para UI. Cada checkpoint tem comando curl ou instrução de browser.

---

## Mapa de arquivos

| Ação | Arquivo |
|------|---------|
| Modificar | `prisma/schema.prisma` |
| Criar | `app/api/fechamento-dia/route.ts` |
| Criar | `app/api/fechamento-dia/[id]/route.ts` |
| Criar | `app/api/colaboradores/route.ts` |
| Criar | `app/api/colaboradores/[id]/route.ts` |
| Criar | `app/api/hoje/route.ts` |
| Criar | `app/api/semana/route.ts` |
| Criar | `components/HojeAdmin.tsx` |
| Criar | `components/HojeCaixa.tsx` |
| Criar | `components/ColaboradoresSection.tsx` |
| Criar | `app/(dashboard)/semana/page.tsx` |
| Modificar | `app/(dashboard)/page.tsx` |
| Modificar | `app/(dashboard)/usuarios/page.tsx` |
| Modificar | `app/(dashboard)/fechamento/page.tsx` |
| Modificar | `components/QuickAddFAB.tsx` |
| Modificar | `components/DashboardShell.tsx` |
| Modificar | `components/BottomNav.tsx` |
| Deletar | `app/(dashboard)/caixa/page.tsx` |

---

## Task 1: Schema — adicionar FechamentoDia e Colaborador (CP-01)

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Abrir `prisma/schema.prisma` e adicionar os dois modelos ao final do arquivo (após o modelo `Insumo`):**

```prisma
model FechamentoDia {
  id        Int      @id @default(autoincrement())
  date      DateTime @unique
  avista    Float    @default(0)
  ifood     Float    @default(0)
  noventa9  Float    @default(0)
  keeta     Float    @default(0)
  extra     Float    @default(0)
  pizzas    Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([date])
}

model Colaborador {
  id        Int      @id @default(autoincrement())
  nome      String   @unique
  ativo     Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

- [ ] **Rodar a migration:**

```bash
cd pizzaria-dashboard
npx prisma migrate dev --name add_fechamento_dia_colaborador
```

Saída esperada: `Your database is now in sync with your schema.`

- [ ] **Verificar que o Prisma Client foi regenerado:**

```bash
npx prisma generate
```

- [ ] **Commit:**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(schema): add FechamentoDia and Colaborador models"
```

---

## Task 2: API /api/fechamento-dia (CP-02)

**Files:**
- Create: `app/api/fechamento-dia/route.ts`
- Create: `app/api/fechamento-dia/[id]/route.ts`

- [ ] **Criar `app/api/fechamento-dia/route.ts`:**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function r2(n: number) { return Math.round(n * 100) / 100 }

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const mes  = parseInt(searchParams.get('mes') ?? '0')
    const ano  = parseInt(searchParams.get('ano') ?? '0')

    if (date) {
      const d     = new Date(date + 'T00:00:00')
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate())
      const end   = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)
      const item  = await prisma.fechamentoDia.findFirst({ where: { date: { gte: start, lte: end } } })
      return NextResponse.json(item ?? null)
    }

    if (mes && ano) {
      const items = await prisma.fechamentoDia.findMany({
        where: { date: { gte: new Date(ano, mes - 1, 1), lte: new Date(ano, mes, 0, 23, 59, 59) } },
        orderBy: { date: 'asc' },
      })
      return NextResponse.json(items)
    }

    return NextResponse.json([])
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar fechamento' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  try {
    const { date, avista, ifood, noventa9, keeta, extra, pizzas } = await request.json()
    const item = await prisma.fechamentoDia.create({
      data: {
        date:     new Date(date + 'T00:00:00'),
        avista:   r2(parseFloat(avista)   || 0),
        ifood:    r2(parseFloat(ifood)    || 0),
        noventa9: r2(parseFloat(noventa9) || 0),
        keeta:    r2(parseFloat(keeta)    || 0),
        extra:    r2(parseFloat(extra)    || 0),
        pizzas:   parseInt(pizzas)        || 0,
      },
    })
    return NextResponse.json(item, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao criar fechamento' }, { status: 500 })
  }
}
```

- [ ] **Criar `app/api/fechamento-dia/[id]/route.ts`:**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function r2(n: number) { return Math.round(n * 100) / 100 }

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  try {
    const { date, avista, ifood, noventa9, keeta, extra, pizzas } = await request.json()
    const item = await prisma.fechamentoDia.update({
      where: { id: parseInt(params.id) },
      data: {
        date:     new Date(date + 'T00:00:00'),
        avista:   r2(parseFloat(avista)   || 0),
        ifood:    r2(parseFloat(ifood)    || 0),
        noventa9: r2(parseFloat(noventa9) || 0),
        keeta:    r2(parseFloat(keeta)    || 0),
        extra:    r2(parseFloat(extra)    || 0),
        pizzas:   parseInt(pizzas)        || 0,
      },
    })
    return NextResponse.json(item)
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar fechamento' }, { status: 500 })
  }
}
```

- [ ] **Verificar com o servidor rodando (`npm run dev`):**

```bash
curl -s http://localhost:3000/api/fechamento-dia?date=2026-06-03 \
  -H "Cookie: next-auth.session-token=<token>" | cat
# Esperado: null (sem registro ainda)
```

- [ ] **Commit:**

```bash
git add app/api/fechamento-dia/
git commit -m "feat(api): add /api/fechamento-dia GET/POST/PUT"
```

---

## Task 3: API /api/colaboradores (CP-03)

**Files:**
- Create: `app/api/colaboradores/route.ts`
- Create: `app/api/colaboradores/[id]/route.ts`

- [ ] **Criar `app/api/colaboradores/route.ts`:**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  try {
    const { searchParams } = new URL(request.url)
    const ativoParam = searchParams.get('ativo')
    const where = ativoParam !== null ? { ativo: ativoParam === 'true' } : {}
    const colaboradores = await prisma.colaborador.findMany({ where, orderBy: { nome: 'asc' } })
    return NextResponse.json(colaboradores)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar colaboradores' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 403 })
  try {
    const { nome } = await request.json()
    if (!nome?.trim()) return NextResponse.json({ error: 'Nome obrigatorio' }, { status: 400 })
    const colaborador = await prisma.colaborador.create({ data: { nome: nome.trim() } })
    return NextResponse.json(colaborador, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao criar colaborador' }, { status: 500 })
  }
}
```

- [ ] **Criar `app/api/colaboradores/[id]/route.ts`:**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 403 })
  try {
    const body = await request.json()
    const data: { nome?: string; ativo?: boolean } = {}
    if (body.nome !== undefined) data.nome = body.nome.trim()
    if (body.ativo !== undefined) data.ativo = body.ativo
    const colaborador = await prisma.colaborador.update({ where: { id: parseInt(params.id) }, data })
    return NextResponse.json(colaborador)
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar colaborador' }, { status: 500 })
  }
}
```

- [ ] **Verificar:**

```bash
curl -s -X POST http://localhost:3000/api/colaboradores \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<token>" \
  -d '{"nome":"João Silva"}' | cat
# Esperado: {"id":1,"nome":"João Silva","ativo":true,...}
```

- [ ] **Commit:**

```bash
git add app/api/colaboradores/
git commit -m "feat(api): add /api/colaboradores GET/POST/PUT"
```

---

## Task 4: API /api/hoje (CP-06 prep)

**Files:**
- Create: `app/api/hoje/route.ts`

- [ ] **Criar `app/api/hoje/route.ts`:**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function r2(n: number) { return Math.round(n * 100) / 100 }
function weekOf(date: Date) { return Math.min(Math.ceil(new Date(date).getDate() / 7), 4) }

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  try {
    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get('date') ?? new Date().toISOString().slice(0, 10)
    const mes = parseInt(searchParams.get('mes') ?? String(new Date().getMonth() + 1))
    const ano = parseInt(searchParams.get('ano') ?? String(new Date().getFullYear()))

    const d = new Date(dateStr + 'T00:00:00')
    const todayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const todayEnd   = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)
    const monthStart = new Date(ano, mes - 1, 1)
    const monthEnd   = new Date(ano, mes, 0, 23, 59, 59)

    const [vendas, fechamentos, insumos, funcionarios, contas, fechamentoDia, caixaHoje] =
      await Promise.all([
        prisma.venda.findMany({ where: { date: { gte: monthStart, lte: monthEnd } } }),
        prisma.fechamentoDia.findMany({ where: { date: { gte: monthStart, lte: monthEnd } } }),
        prisma.insumo.findMany({ where: { date: { gte: monthStart, lte: monthEnd } } }),
        prisma.funcionario.findMany({ where: { date: { gte: monthStart, lte: monthEnd } } }),
        prisma.contaFixa.findMany({ where: { date: { gte: monthStart, lte: monthEnd } } }),
        prisma.fechamentoDia.findFirst({ where: { date: { gte: todayStart, lte: todayEnd } } }),
        prisma.cashFlow.findFirst({ where: { date: { gte: todayStart, lte: todayEnd } } }),
      ])

    const receitaVendas = r2(vendas.reduce((s, v) =>
      r2(s + v.avista + v.debito + v.credito + v.pix + v.ifood + v.outros - v.taxas), 0))
    const receitaFechs  = r2(fechamentos.reduce((s, f) =>
      r2(s + f.avista + f.ifood + f.noventa9 + f.keeta + f.extra), 0))
    const receita  = r2(receitaVendas + receitaFechs)
    const despesas = r2(
      insumos.reduce((s, i) => r2(s + i.valor), 0) +
      funcionarios.reduce((s, f) => r2(s + f.valor), 0) +
      contas.reduce((s, c) => r2(s + c.valor), 0)
    )
    const resultado = r2(receita - despesas)
    const pizzas = vendas.reduce((s, v) => s + v.pizzas, 0) +
                   fechamentos.reduce((s, f) => s + f.pizzas, 0)

    const pendentes = contas
      .filter(c => !c.pago)
      .sort((a, b) => (a.diaVencimento ?? 99) - (b.diaVencimento ?? 99))
      .slice(0, 5)

    const weeklyData = [1, 2, 3, 4].map(w => {
      const wV = vendas.filter(v => weekOf(v.date) === w)
      const wF = fechamentos.filter(f => weekOf(f.date) === w)
      const wI = insumos.filter(i => weekOf(i.date) === w)
      const wFu = funcionarios.filter(f => weekOf(f.date) === w)
      const wC = contas.filter(c => weekOf(c.date) === w)
      const rec = r2(
        wV.reduce((s, v) => r2(s + v.avista + v.debito + v.credito + v.pix + v.ifood + v.outros - v.taxas), 0) +
        wF.reduce((s, f) => r2(s + f.avista + f.ifood + f.noventa9 + f.keeta + f.extra), 0)
      )
      const desp = r2(
        wI.reduce((s, i) => r2(s + i.valor), 0) +
        wFu.reduce((s, f) => r2(s + f.valor), 0) +
        wC.reduce((s, c) => r2(s + c.valor), 0)
      )
      return { label: `S${w}`, receita: rec, despesas: desp }
    })

    return NextResponse.json({ resultado: { receita, despesas, resultado, pizzas }, fechamentoDia: fechamentoDia ?? null, caixaHoje: caixaHoje ?? null, pendentes, weeklyData })
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })
  }
}
```

- [ ] **Verificar:**

```bash
curl -s "http://localhost:3000/api/hoje?date=2026-06-03&mes=6&ano=2026" \
  -H "Cookie: next-auth.session-token=<token>" | cat
# Esperado: JSON com campos resultado, fechamentoDia, caixaHoje, pendentes, weeklyData
```

- [ ] **Commit:**

```bash
git add app/api/hoje/
git commit -m "feat(api): add /api/hoje with monthly totals including FechamentoDia"
```

---

## Task 5: API /api/semana (CP-11)

**Files:**
- Create: `app/api/semana/route.ts`

- [ ] **Criar `app/api/semana/route.ts`:**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function r2(n: number) { return Math.round(n * 100) / 100 }
function weekOf(date: Date) { return Math.min(Math.ceil(new Date(date).getDate() / 7), 4) as 1|2|3|4 }
function semanaFromField(s: string | null | undefined, date: Date): 1|2|3|4 {
  if (!s) return weekOf(date)
  const m = s.trim().match(/(\d+)/)
  const n = m ? parseInt(m[1]) : 0
  return (n >= 1 && n <= 4 ? n : weekOf(date)) as 1|2|3|4
}

type WeekMap = { avista: number; ifood: number; noventa9: number; keeta: number; extra: number; debito: number; credito: number; pix: number; outros: number }
const emptyWeek = (): WeekMap => ({ avista: 0, ifood: 0, noventa9: 0, keeta: 0, extra: 0, debito: 0, credito: 0, pix: 0, outros: 0 })

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 403 })
  try {
    const { searchParams } = new URL(request.url)
    const mes = parseInt(searchParams.get('mes') ?? '0')
    const ano = parseInt(searchParams.get('ano') ?? '0')
    if (!mes || !ano) return NextResponse.json({ error: 'mes e ano obrigatorios' }, { status: 400 })

    const where = { date: { gte: new Date(ano, mes - 1, 1), lte: new Date(ano, mes, 0, 23, 59, 59) } }
    const [fechamentos, vendasInd, funcs] = await Promise.all([
      prisma.fechamentoDia.findMany({ where }),
      prisma.venda.findMany({ where }),
      prisma.funcionario.findMany({ where, orderBy: { nome: 'asc' } }),
    ])

    const wv: Record<number, WeekMap> = { 1: emptyWeek(), 2: emptyWeek(), 3: emptyWeek(), 4: emptyWeek() }
    for (const f of fechamentos) {
      const w = weekOf(f.date)
      wv[w].avista   = r2(wv[w].avista   + f.avista)
      wv[w].ifood    = r2(wv[w].ifood    + f.ifood)
      wv[w].noventa9 = r2(wv[w].noventa9 + f.noventa9)
      wv[w].keeta    = r2(wv[w].keeta    + f.keeta)
      wv[w].extra    = r2(wv[w].extra    + f.extra)
    }
    for (const v of vendasInd) {
      const w = weekOf(v.date)
      wv[w].avista  = r2(wv[w].avista  + v.avista)
      wv[w].ifood   = r2(wv[w].ifood   + v.ifood)
      wv[w].debito  = r2(wv[w].debito  + v.debito)
      wv[w].credito = r2(wv[w].credito + v.credito)
      wv[w].pix     = r2(wv[w].pix     + v.pix)
      wv[w].outros  = r2(wv[w].outros  + v.outros)
    }

    const vendas = [1, 2, 3, 4].map(w => {
      const d = wv[w]
      const total = r2(d.avista + d.ifood + d.noventa9 + d.keeta + d.extra + d.debito + d.credito + d.pix + d.outros)
      return { semana: w, ...d, total }
    })

    const funcMap: Record<string, { nome: string; s: Record<number, number> }> = {}
    for (const f of funcs) {
      const w = semanaFromField(f.semana, f.date)
      if (!funcMap[f.nome]) funcMap[f.nome] = { nome: f.nome, s: { 1: 0, 2: 0, 3: 0, 4: 0 } }
      funcMap[f.nome].s[w] = r2(funcMap[f.nome].s[w] + f.valor)
    }
    const funcionarios = Object.values(funcMap).map(f => ({
      nome: f.nome,
      sem1: f.s[1], sem2: f.s[2], sem3: f.s[3], sem4: f.s[4],
      total: r2(f.s[1] + f.s[2] + f.s[3] + f.s[4]),
    }))

    return NextResponse.json({ vendas, funcionarios })
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar dados da semana' }, { status: 500 })
  }
}
```

- [ ] **Verificar:**

```bash
curl -s "http://localhost:3000/api/semana?mes=6&ano=2026" \
  -H "Cookie: next-auth.session-token=<token>" | cat
# Esperado: { vendas: [...4 semanas...], funcionarios: [...] }
```

- [ ] **Commit:**

```bash
git add app/api/semana/
git commit -m "feat(api): add /api/semana with weekly breakdown by channel and employee"
```

---

## Task 6: ColaboradoresSection component (CP-04)

**Files:**
- Create: `components/ColaboradoresSection.tsx`

- [ ] **Criar `components/ColaboradoresSection.tsx`:**

```tsx
'use client'

import { useState, useEffect } from 'react'
import BottomSheet from './BottomSheet'

type Colaborador = { id: number; nome: string; ativo: boolean }

const inp = 'w-full px-3.5 py-2.5 border border-cream-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 dark:text-white rounded-xl text-sm placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/50 transition-all'

export default function ColaboradoresSection() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [nome, setNome] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function carregar() {
    const data = await fetch('/api/colaboradores').then(r => r.json())
    setColaboradores(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    setSubmitting(true)
    try {
      await fetch('/api/colaboradores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome }),
      })
      setNome('')
      setOpen(false)
      await carregar()
    } finally { setSubmitting(false) }
  }

  async function toggleAtivo(c: Colaborador) {
    await fetch(`/api/colaboradores/${c.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !c.ativo }),
    })
    await carregar()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-semibold text-xl text-ink dark:text-gray-100">Colaboradores</h2>
        <button
          onClick={() => { setNome(''); setOpen(true) }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent text-white hover:bg-accent-dark transition-all active:scale-95"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Adicionar
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-12 rounded-xl"/>)}</div>
      ) : colaboradores.length === 0 ? (
        <div className="bg-white dark:bg-[#171411] rounded-2xl border border-dashed border-cream-300 dark:border-zinc-700 p-8 text-center shadow-sm">
          <p className="text-sm text-gray-400 dark:text-zinc-500">Nenhum colaborador cadastrado</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#171411] rounded-2xl border border-cream-200 dark:border-white/[0.06] divide-y divide-cream-200 dark:divide-white/[0.04] overflow-hidden shadow-sm">
          {colaboradores.map(c => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3.5">
              <span className={`w-2 h-2 rounded-full shrink-0 ${c.ativo ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-zinc-600'}`} />
              <p className={`flex-1 text-sm font-medium ${c.ativo ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400 dark:text-zinc-500'}`}>
                {c.nome}
              </p>
              <button
                onClick={() => toggleAtivo(c)}
                className="text-xs px-2.5 py-1 rounded-lg border border-cream-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 hover:border-accent/40 hover:text-accent transition-colors font-medium"
              >
                {c.ativo ? 'Desativar' : 'Reativar'}
              </button>
            </div>
          ))}
        </div>
      )}

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Novo Colaborador">
        <form onSubmit={handleAdd} className="space-y-3.5">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-zinc-500 mb-1.5 block">Nome</label>
            <input
              type="text" required value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Nome do colaborador"
              className={inp}
              autoFocus
            />
          </div>
          <button type="submit" disabled={submitting || !nome.trim()}
            className="w-full py-3 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-accent-dark disabled:opacity-50 transition-all active:scale-[0.99]">
            {submitting ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      </BottomSheet>
    </div>
  )
}
```

- [ ] **Atualizar `app/(dashboard)/usuarios/page.tsx`** para importar e renderizar o componente abaixo da tabela de usuários:

```tsx
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import ColaboradoresSection from '@/components/ColaboradoresSection'

export default async function UsuariosPage() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') redirect('/')

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, username: true, role: true, lastLogin: true },
  })

  return (
    <div className="min-w-0 space-y-8">
      <div>
        <h2 className="font-display font-semibold text-xl text-ink dark:text-gray-100 mb-5">Usuários</h2>
        <div className="bg-white dark:bg-[#171411] rounded-2xl border border-cream-200 dark:border-white/[0.06] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[480px] divide-y divide-cream-200 dark:divide-white/[0.04]">
              <thead className="bg-cream-50 dark:bg-zinc-900/60">
                <tr>
                  <th className="px-5 py-3 text-left font-mono text-[10px] text-mute uppercase tracking-[0.14em]">Usuário</th>
                  <th className="px-5 py-3 text-left font-mono text-[10px] text-mute uppercase tracking-[0.14em]">Perfil</th>
                  <th className="px-5 py-3 text-left font-mono text-[10px] text-mute uppercase tracking-[0.14em]">Último login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-200 dark:divide-white/[0.04]">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-cream-50/60 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4 text-sm font-medium text-ink dark:text-gray-100">{user.username}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        user.role === 'ADMIN'
                          ? 'bg-accent/10 dark:bg-accent/15 text-accent'
                          : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-mute dark:text-zinc-500 whitespace-nowrap">
                      {user.lastLogin
                        ? format(new Date(user.lastLogin), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                        : 'Nunca'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ColaboradoresSection />
    </div>
  )
}
```

- [ ] **Verificar no browser:** Abrir `/usuarios` — deve aparecer seção "Colaboradores" com botão "+ Adicionar". Clicar em adicionar → BottomSheet abre → digitar nome → salvar → colaborador aparece na lista.

- [ ] **Commit:**

```bash
git add components/ColaboradoresSection.tsx app/(dashboard)/usuarios/page.tsx
git commit -m "feat: add Colaboradores section to Usuarios page with CRUD"
```

---

## Task 7: Formulários de funcionário → select (CP-05)

**Files:**
- Modify: `components/QuickAddFAB.tsx`
- Modify: `app/(dashboard)/fechamento/page.tsx`

Nos dois componentes: substituir o `<input type="text">` do campo "Nome" (funcionário) por um `<select>` populado com colaboradores ativos via `GET /api/colaboradores?ativo=true`.

- [ ] **Em `components/QuickAddFAB.tsx`:**

1. Adicionar estado e fetch de colaboradores:

```tsx
// Adicionar ao topo do componente (após as declarações de estado existentes):
const [colaboradores, setColaboradores] = useState<{ id: number; nome: string }[]>([])

useEffect(() => {
  fetch('/api/colaboradores?ativo=true')
    .then(r => r.json())
    .then(data => { if (Array.isArray(data)) setColaboradores(data) })
    .catch(() => {})
}, [])
```

2. Substituir o bloco `{cat === 'funcionario' && (` — trocar o `<input>` de Nome por:

```tsx
{cat === 'funcionario' && (
  <>
    <div>
      <label className="text-xs font-medium text-mute dark:text-zinc-500 mb-1.5 block">Funcionário</label>
      <select
        required value={descricao}
        onChange={e => setDescricao(e.target.value)}
        className={inp}
      >
        <option value="">Selecionar funcionário...</option>
        {colaboradores.map(c => (
          <option key={c.id} value={c.nome}>{c.nome}</option>
        ))}
      </select>
    </div>
    <CurrencyInput label="Valor" value={valor} onChange={setValor} required />
    <div>
      <label className="text-xs font-medium text-mute dark:text-zinc-500 mb-1.5 block">Semana</label>
      <input type="text" value={semana} onChange={e => setSemana(e.target.value)} placeholder="Semana 1" className={inp} />
    </div>
  </>
)}
```

- [ ] **Em `app/(dashboard)/fechamento/page.tsx`:**

1. Adicionar estado `colaboradores` e fetch no `fetchAll` (ou useEffect separado):

```tsx
// Adicionar ao estado existente:
const [colaboradores, setColaboradores] = useState<{ id: number; nome: string }[]>([])

// Adicionar useEffect separado (não misturar com fetchAll para não recarregar colaboradores a cada mudança de mês):
useEffect(() => {
  fetch('/api/colaboradores?ativo=true')
    .then(r => r.json())
    .then(data => { if (Array.isArray(data)) setColaboradores(data) })
    .catch(() => {})
}, [])
```

2. Substituir os dois blocos de `<input type="text">` para "Nome" (funcionário) nos formulários (tab `funcionarios` e tab `feed` funcionário):

```tsx
{/* Tab funcionarios — trocar input de nome */}
{tab === 'funcionarios' && (
  <>
    <div>
      <label className="text-xs font-medium text-gray-500 dark:text-zinc-500 mb-1.5 block">Funcionário</label>
      <select required value={nome} onChange={e => setNome(e.target.value)} className={inp}>
        <option value="">Selecionar funcionário...</option>
        {colaboradores.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
      </select>
    </div>
    <CurrencyInput label="Valor" value={valor} onChange={setValor} required />
    <div>
      <label className="text-xs font-medium text-gray-500 dark:text-zinc-500 mb-1.5 block">Semana</label>
      <input type="text" value={semana} onChange={e => setSemana(e.target.value)} placeholder="Semana 1" className={inp} />
    </div>
  </>
)}
```

```tsx
{/* Feed — funcionário (edição e novo) — trocar input de nome */}
{tab === 'feed' && (editItem?.tipo === 'funcionario' || (!editItem && feedCat === 'funcionario')) && (
  <>
    <div>
      <label className="text-xs font-medium text-gray-500 dark:text-zinc-500 mb-1.5 block">Funcionário</label>
      <select required value={nome} onChange={e => setNome(e.target.value)} className={inp}>
        <option value="">Selecionar funcionário...</option>
        {colaboradores.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
      </select>
    </div>
    <CurrencyInput label="Valor" value={valor} onChange={setValor} required />
    <div>
      <label className="text-xs font-medium text-gray-500 dark:text-zinc-500 mb-1.5 block">Semana</label>
      <input type="text" value={semana} onChange={e => setSemana(e.target.value)} placeholder="Semana 1" className={inp} />
    </div>
  </>
)}
```

- [ ] **Verificar no browser:** Abrir FAB → Funcionário → campo deve ser um `<select>` com os colaboradores cadastrados na Task 6.

- [ ] **Commit:**

```bash
git add components/QuickAddFAB.tsx app/(dashboard)/fechamento/page.tsx
git commit -m "feat: replace employee name input with colaborador select in all forms"
```

---

## Task 8: HojeAdmin component (CP-06 + CP-07)

**Files:**
- Create: `components/HojeAdmin.tsx`

- [ ] **Criar `components/HojeAdmin.tsx`** (componente client com os 4 blocos):

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import BottomSheet from './BottomSheet'
import CurrencyInput from './CurrencyInput'
import WeeklyBarChart from './WeeklyBarChart'
import type { WeekData } from './WeeklyBarChart'
import Link from 'next/link'

type FechamentoDia = { id: number; date: string; avista: number; ifood: number; noventa9: number; keeta: number; extra: number; pizzas: number }
type CaixaHoje     = { id: number; date: string; saldoInicial: number; entradas: number; saidas: number; fechamento: number; observacao: string | null }
type Pendente      = { id: number; despesa: string; valor: number; diaVencimento: number | null }
type Resultado     = { receita: number; despesas: number; resultado: number; pizzas: number }

function r2(n: number) { return Math.round(n * 100) / 100 }
function fmt(v: number) { return v.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }

const inp = 'w-full px-3.5 py-2.5 border border-cream-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 dark:text-white rounded-xl text-sm placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/50 transition-all'

export default function HojeAdmin() {
  const now    = new Date()
  const today  = format(now, 'yyyy-MM-dd')
  const mes    = now.getMonth() + 1
  const ano    = now.getFullYear()
  const label  = format(now, "EEEE, dd 'de' MMMM", { locale: ptBR })

  const [loading, setLoading]           = useState(true)
  const [resultado, setResultado]       = useState<Resultado>({ receita: 0, despesas: 0, resultado: 0, pizzas: 0 })
  const [fechamentoDia, setFechamentoDia] = useState<FechamentoDia | null>(null)
  const [caixaHoje, setCaixaHoje]       = useState<CaixaHoje | null>(null)
  const [pendentes, setPendentes]       = useState<Pendente[]>([])
  const [weeklyData, setWeeklyData]     = useState<WeekData[]>([])

  // FechamentoDia form
  const [editingFD, setEditingFD]   = useState(false)
  const [fdAvista, setFdAvista]     = useState(0)
  const [fdIfood, setFdIfood]       = useState(0)
  const [fdNoventa9, setFdNoventa9] = useState(0)
  const [fdKeeta, setFdKeeta]       = useState(0)
  const [fdExtra, setFdExtra]       = useState(0)
  const [fdPizzas, setFdPizzas]     = useState(0)
  const [submittingFD, setSubmittingFD] = useState(false)

  // Caixa form
  const [caixaOpen, setCaixaOpen]       = useState(false)
  const [editCaixaId, setEditCaixaId]   = useState<number | null>(null)
  const [cxSaldoInicial, setCxSaldoInicial] = useState(0)
  const [cxEntradas, setCxEntradas]     = useState(0)
  const [cxSaidas, setCxSaidas]         = useState(0)
  const [cxObs, setCxObs]               = useState('')
  const [submittingCx, setSubmittingCx] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetch(`/api/hoje?date=${today}&mes=${mes}&ano=${ano}`).then(r => r.json())
      setResultado(data.resultado)
      setFechamentoDia(data.fechamentoDia)
      setCaixaHoje(data.caixaHoje)
      setPendentes(Array.isArray(data.pendentes) ? data.pendentes : [])
      setWeeklyData(Array.isArray(data.weeklyData) ? data.weeklyData : [])
    } finally { setLoading(false) }
  }, [today, mes, ano])

  useEffect(() => { load() }, [load])

  function startEditFD() {
    if (fechamentoDia) {
      setFdAvista(fechamentoDia.avista); setFdIfood(fechamentoDia.ifood)
      setFdNoventa9(fechamentoDia.noventa9); setFdKeeta(fechamentoDia.keeta)
      setFdExtra(fechamentoDia.extra); setFdPizzas(fechamentoDia.pizzas)
    } else {
      setFdAvista(0); setFdIfood(0); setFdNoventa9(0); setFdKeeta(0); setFdExtra(0); setFdPizzas(0)
    }
    setEditingFD(true)
  }

  async function saveFD(e: React.FormEvent) {
    e.preventDefault(); setSubmittingFD(true)
    try {
      const body = { date: today, avista: fdAvista, ifood: fdIfood, noventa9: fdNoventa9, keeta: fdKeeta, extra: fdExtra, pizzas: fdPizzas }
      if (fechamentoDia) {
        await fetch(`/api/fechamento-dia/${fechamentoDia.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      } else {
        await fetch('/api/fechamento-dia', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      }
      setEditingFD(false); await load()
    } finally { setSubmittingFD(false) }
  }

  function openCaixa() {
    if (caixaHoje) {
      setEditCaixaId(caixaHoje.id); setCxSaldoInicial(caixaHoje.saldoInicial)
      setCxEntradas(caixaHoje.entradas); setCxSaidas(caixaHoje.saidas); setCxObs(caixaHoje.observacao ?? '')
    } else {
      setEditCaixaId(null); setCxSaldoInicial(0); setCxEntradas(0); setCxSaidas(0); setCxObs('')
    }
    setCaixaOpen(true)
  }

  async function saveCaixa(e: React.FormEvent) {
    e.preventDefault(); setSubmittingCx(true)
    try {
      const fechamento = r2(cxSaldoInicial + cxEntradas - cxSaidas)
      const body = { date: today, saldoInicial: cxSaldoInicial, entradas: cxEntradas, saidas: cxSaidas, fechamento, observacao: cxObs }
      if (editCaixaId) {
        await fetch(`/api/caixa/${editCaixaId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      } else {
        await fetch('/api/caixa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      }
      setCaixaOpen(false); await load()
    } finally { setSubmittingCx(false) }
  }

  const fdTotal     = r2(fdAvista + fdIfood + fdNoventa9 + fdKeeta + fdExtra)
  const isPositive  = resultado.resultado >= 0
  const cxFechamento = r2(cxSaldoInicial + cxEntradas - cxSaidas)

  return (
    <div className="space-y-5">

      {/* Bloco 1 — Fechamento do Dia */}
      <div className="bg-white dark:bg-[#171411] rounded-2xl border border-cream-200 dark:border-white/[0.06] overflow-hidden shadow-sm">
        <div className="px-5 pt-4 pb-3 flex items-start justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400 dark:text-zinc-500">Fechamento do Dia</p>
            <p className="text-xs text-gray-500 dark:text-zinc-400 capitalize mt-0.5">{label}</p>
          </div>
          {fechamentoDia && !editingFD && (
            <button onClick={startEditFD}
              className="text-xs text-accent font-semibold px-3 py-1.5 rounded-full border border-accent/25 hover:bg-accent/5 transition-colors">
              Editar
            </button>
          )}
        </div>

        {loading ? (
          <div className="px-5 pb-5 space-y-2">
            {[1,2,3].map(i => <div key={i} className="skeleton h-10 rounded-xl"/>)}
          </div>
        ) : !fechamentoDia || editingFD ? (
          <form onSubmit={saveFD} className="px-5 pb-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <CurrencyInput label="À Vista" value={fdAvista} onChange={setFdAvista} />
              <CurrencyInput label="iFood" value={fdIfood} onChange={setFdIfood} />
              <CurrencyInput label="99food" value={fdNoventa9} onChange={setFdNoventa9} />
              <CurrencyInput label="Keeta" value={fdKeeta} onChange={setFdKeeta} />
            </div>
            <CurrencyInput label="Extra" value={fdExtra} onChange={setFdExtra} />
            <div className="flex items-center justify-between px-4 py-3 bg-cream-100 dark:bg-zinc-800/60 rounded-xl">
              <p className="text-sm text-gray-500 dark:text-zinc-400">Total do Dia</p>
              <p className="text-lg font-display font-bold text-gray-800 dark:text-gray-100">R$&nbsp;{fmt(fdTotal)}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-zinc-500 mb-1.5 block">Pizzas</label>
              <input type="number" min="0" value={fdPizzas} onChange={e => setFdPizzas(parseInt(e.target.value) || 0)} className={inp} />
            </div>
            <div className="flex gap-2">
              {editingFD && (
                <button type="button" onClick={() => setEditingFD(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-cream-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400">
                  Cancelar
                </button>
              )}
              <button type="submit" disabled={submittingFD}
                className="flex-1 py-2.5 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-accent-dark disabled:opacity-50 transition-all active:scale-[0.99]">
                {submittingFD ? 'Salvando...' : 'Salvar Fechamento'}
              </button>
            </div>
          </form>
        ) : (
          <div className="px-5 pb-5">
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { label: 'À Vista',  value: fechamentoDia.avista },
                { label: 'iFood',    value: fechamentoDia.ifood },
                { label: '99food',   value: fechamentoDia.noventa9 },
                { label: 'Keeta',    value: fechamentoDia.keeta },
                { label: 'Extra',    value: fechamentoDia.extra },
                { label: 'Pizzas',   value: null, count: fechamentoDia.pizzas },
              ].map(s => (
                <div key={s.label} className="px-3 py-2.5 bg-cream-100 dark:bg-zinc-800/60 rounded-xl">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-500 mb-0.5">{s.label}</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {s.count !== undefined ? s.count : `R$ ${fmt(s.value ?? 0)}`}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between px-4 py-3 bg-cream-100 dark:bg-zinc-800/60 rounded-xl">
              <p className="text-sm text-gray-500 dark:text-zinc-400">Total do Dia</p>
              <p className="text-lg font-display font-bold text-gray-800 dark:text-gray-100">
                R$&nbsp;{fmt(r2(fechamentoDia.avista + fechamentoDia.ifood + fechamentoDia.noventa9 + fechamentoDia.keeta + fechamentoDia.extra))}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bloco 2 — Caixa do Dia */}
      <div className="bg-white dark:bg-[#171411] rounded-2xl border border-cream-200 dark:border-white/[0.06] overflow-hidden shadow-sm">
        <div className="px-5 pt-4 pb-3 flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400 dark:text-zinc-500">Caixa do Dia</p>
          {caixaHoje ? (
            <button onClick={openCaixa}
              className="text-xs text-accent font-semibold px-3 py-1.5 rounded-full border border-accent/25 hover:bg-accent/5 transition-colors">
              Editar
            </button>
          ) : (
            <button onClick={openCaixa}
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-accent text-white hover:bg-accent-dark transition-colors">
              Registrar Caixa
            </button>
          )}
        </div>

        {loading ? (
          <div className="px-5 pb-4"><div className="skeleton h-10 rounded-xl"/></div>
        ) : caixaHoje ? (
          <div className="grid grid-cols-3 border-t border-cream-200 dark:border-white/[0.05] divide-x divide-cream-200 dark:divide-white/[0.05] mb-3">
            {[
              { label: 'Inicial',  value: fmt(caixaHoje.saldoInicial), color: 'text-gray-600 dark:text-gray-300' },
              { label: 'Entradas', value: `+${fmt(caixaHoje.entradas)}`, color: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Saídas',   value: `−${fmt(caixaHoje.saidas)}`,  color: 'text-accent' },
            ].map(s => (
              <div key={s.label} className="px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-500 mb-0.5">{s.label}</p>
                <p className={`text-sm font-semibold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-5 pb-4 text-sm text-gray-400 dark:text-zinc-500">Caixa ainda não registrado hoje.</p>
        )}
      </div>

      {/* Bloco 3 — Resultado do Mês */}
      {loading ? (
        <div className="skeleton h-28 rounded-2xl" />
      ) : (
        <div className={`rounded-2xl p-5 ${isPositive ? 'bg-emerald-700' : 'bg-accent'}`}>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/60 mb-1">Resultado do mês</p>
          <p className="font-display font-semibold text-[clamp(28px,6vw,38px)] tracking-tight text-white leading-none mb-2">
            {isPositive ? '+' : '–'}&nbsp;R$&nbsp;{fmt(Math.abs(resultado.resultado))}
          </p>
          <p className="text-xs text-white/70">
            Receita&nbsp;<span className="font-semibold text-white">R$&nbsp;{fmt(resultado.receita)}</span>
            &nbsp;·&nbsp;
            Despesas&nbsp;<span className="font-semibold text-white/80">R$&nbsp;{fmt(resultado.despesas)}</span>
            {resultado.pizzas > 0 && <>&nbsp;·&nbsp;<span className="font-semibold text-white">{resultado.pizzas}</span> pizzas</>}
          </p>
        </div>
      )}

      {/* Bloco 4 — Gráfico semanal + contas pendentes */}
      {!loading && (
        <>
          <div>
            <div className="flex items-center gap-3 mb-3">
              <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-mute">Semanas do mês</p>
              <div className="flex items-center gap-2.5">
                <span className="flex items-center gap-1 text-[10px] text-mute"><span className="w-2 h-2 rounded-sm bg-emerald-600 inline-block" /> Receita</span>
                <span className="flex items-center gap-1 text-[10px] text-mute"><span className="w-2 h-2 rounded-sm bg-accent inline-block" /> Despesas</span>
              </div>
            </div>
            <WeeklyBarChart data={weeklyData} />
          </div>

          {pendentes.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-mute">Contas Pendentes</p>
                <Link href="/fechamento" className="text-xs text-accent font-medium hover:underline underline-offset-2">Ver todas →</Link>
              </div>
              <div className="bg-white dark:bg-[#171411] rounded-2xl border border-cream-200 dark:border-white/[0.06] divide-y divide-cream-200 dark:divide-white/[0.04] overflow-hidden shadow-sm">
                {pendentes.map(c => (
                  <div key={c.id} className="flex items-center justify-between px-4 py-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink dark:text-gray-100 truncate">{c.despesa}</p>
                        {c.diaVencimento && <p className="font-mono text-[10px] text-mute">dia {c.diaVencimento}</p>}
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-ink dark:text-gray-100 shrink-0 ml-3">R$ {fmt(c.valor)}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Caixa BottomSheet */}
      <BottomSheet open={caixaOpen} onClose={() => setCaixaOpen(false)} title={editCaixaId ? 'Editar Caixa' : 'Registrar Caixa'}>
        <form onSubmit={saveCaixa} className="space-y-3.5">
          <CurrencyInput label="Saldo Inicial" value={cxSaldoInicial} onChange={setCxSaldoInicial} />
          <div className="grid grid-cols-2 gap-3">
            <CurrencyInput label="Entradas" value={cxEntradas} onChange={setCxEntradas} />
            <CurrencyInput label="Saídas" value={cxSaidas} onChange={setCxSaidas} />
          </div>
          <div className="px-4 py-3 bg-cream-100 dark:bg-zinc-800/60 rounded-xl flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-zinc-400">Fechamento calculado</p>
            <p className="text-lg font-display font-bold text-gray-800 dark:text-gray-100">R$&nbsp;{fmt(cxFechamento)}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-zinc-500 mb-1.5 block">Observação (opcional)</label>
            <input type="text" value={cxObs} onChange={e => setCxObs(e.target.value)} className={inp} />
          </div>
          <button type="submit" disabled={submittingCx}
            className="w-full py-3 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-accent-dark disabled:opacity-50 transition-all active:scale-[0.99]">
            {submittingCx ? 'Salvando...' : editCaixaId ? 'Atualizar' : 'Salvar'}
          </button>
        </form>
      </BottomSheet>
    </div>
  )
}
```

- [ ] **Commit:**

```bash
git add components/HojeAdmin.tsx
git commit -m "feat: add HojeAdmin component with FechamentoDia and Caixa blocks"
```

---

## Task 9: HojeCaixa component (CP-09)

**Files:**
- Create: `components/HojeCaixa.tsx`

- [ ] **Criar `components/HojeCaixa.tsx`** (espelho do antigo `/caixa/page.tsx`, só com caixa):

```tsx
'use client'

import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import BottomSheet from './BottomSheet'
import CurrencyInput from './CurrencyInput'

type CashFlow = { id: number; date: string; saldoInicial: number; entradas: number; saidas: number; fechamento: number; diferenca: number | null; observacao: string | null }

function r2(n: number) { return Math.round(n * 100) / 100 }
function fmt(v: number) { return v.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }

const inp = 'w-full px-3.5 py-2.5 border border-cream-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 dark:text-white rounded-xl text-sm placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/50 transition-all'

export default function HojeCaixa() {
  const [registros, setRegistros]     = useState<CashFlow[]>([])
  const [loading, setLoading]         = useState(true)
  const [open, setOpen]               = useState(false)
  const [editId, setEditId]           = useState<number | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [submitting, setSubmitting]   = useState(false)

  const today = format(new Date(), 'yyyy-MM-dd')
  const [date, setDate]               = useState(today)
  const [saldoInicial, setSaldoInicial] = useState(0)
  const [entradas, setEntradas]       = useState(0)
  const [saidas, setSaidas]           = useState(0)
  const [observacao, setObservacao]   = useState('')

  async function carregar() {
    try {
      const data = await fetch('/api/caixa').then(r => r.json())
      setRegistros(Array.isArray(data) ? data : [])
      if (Array.isArray(data) && data.length > 0) setSaldoInicial(data[0].fechamento)
    } finally { setLoading(false) }
  }

  useEffect(() => { carregar() }, [])

  function openNew() {
    setEditId(null); setDate(today)
    setSaldoInicial(registros[0]?.fechamento ?? 0)
    setEntradas(0); setSaidas(0); setObservacao('')
    setOpen(true)
  }

  function openEdit(r: CashFlow) {
    setEditId(r.id); setDate(r.date.slice(0, 10))
    setSaldoInicial(r.saldoInicial); setEntradas(r.entradas)
    setSaidas(r.saidas); setObservacao(r.observacao ?? '')
    setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSubmitting(true)
    try {
      const body = { date, saldoInicial, entradas, saidas, observacao }
      if (editId) {
        await fetch(`/api/caixa/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      } else {
        await fetch('/api/caixa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      }
      setOpen(false); await carregar()
    } finally { setSubmitting(false) }
  }

  async function handleDelete(id: number) {
    await fetch(`/api/caixa/${id}`, { method: 'DELETE' })
    setDeleteConfirm(null); carregar()
  }

  const fechamentoCalc = r2(saldoInicial + entradas - saidas)
  const hoje           = registros[0]
  const temHoje        = hoje && hoje.date.slice(0, 10) === today

  if (loading) return (
    <div className="space-y-4">
      <div className="skeleton h-7 w-24 rounded-lg" />
      <div className="skeleton h-40 rounded-2xl" />
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-display font-semibold text-gray-800 dark:text-gray-100">Caixa</h1>
        {!temHoje && (
          <button onClick={openNew}
            className="px-3.5 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent-dark transition-colors active:scale-[0.98]">
            Registrar hoje
          </button>
        )}
      </div>

      {temHoje ? (
        <div className="bg-white dark:bg-[#171411] rounded-2xl border border-cream-200 dark:border-white/[0.06] overflow-hidden shadow-sm">
          <div className="px-5 pt-4 pb-3 flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400 dark:text-zinc-500 capitalize">
                {format(parseISO(hoje.date.slice(0, 10)), "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-gray-300 dark:text-zinc-600 mt-0.5">Fechamento</p>
            </div>
            <button onClick={() => openEdit(hoje)}
              className="text-xs text-accent font-semibold px-3 py-1.5 rounded-full border border-accent/25 hover:bg-accent/5 transition-colors">
              Editar
            </button>
          </div>
          <div className="px-5 pb-4">
            <p className="font-display font-bold text-[clamp(32px,7vw,44px)] leading-none tracking-tight text-gray-900 dark:text-gray-100">
              R$&nbsp;{fmt(hoje.fechamento)}
            </p>
          </div>
          <div className="grid grid-cols-3 border-t border-cream-200 dark:border-white/[0.05] divide-x divide-cream-200 dark:divide-white/[0.05]">
            {[
              { label: 'Inicial',  value: fmt(hoje.saldoInicial),   color: 'text-gray-600 dark:text-gray-300' },
              { label: 'Entradas', value: `+${fmt(hoje.entradas)}`,  color: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Saídas',   value: `−${fmt(hoje.saidas)}`,    color: 'text-accent' },
            ].map(s => (
              <div key={s.label} className="px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-500 mb-0.5">{s.label}</p>
                <p className={`text-sm font-semibold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#171411] rounded-2xl border border-dashed border-cream-300 dark:border-zinc-700 p-8 text-center shadow-sm">
          <p className="text-sm text-gray-500 dark:text-zinc-400">Sem fechamento para hoje</p>
        </div>
      )}

      {registros.length > (temHoje ? 1 : 0) && (
        <section>
          <p className="font-mono text-[10px] tracking-widest uppercase text-gray-400 dark:text-zinc-500 mb-3">Histórico</p>
          <div className="bg-white dark:bg-[#171411] rounded-2xl border border-cream-200 dark:border-white/[0.06] divide-y divide-cream-200 dark:divide-white/[0.04] overflow-hidden shadow-sm">
            {registros.slice(temHoje ? 1 : 0, 30).map(r => {
              const confirming = deleteConfirm === r.id
              return (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                  {confirming ? (
                    <>
                      <p className="flex-1 text-sm text-gray-600 dark:text-zinc-400">
                        Excluir {format(parseISO(r.date.slice(0, 10)), 'dd/MM', { locale: ptBR })}?
                      </p>
                      <button onClick={() => setDeleteConfirm(null)} className="text-xs px-2.5 py-1.5 rounded-lg border border-cream-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 font-medium">Cancelar</button>
                      <button onClick={() => handleDelete(r.id)} className="text-xs px-2.5 py-1.5 rounded-lg bg-red-500 text-white font-medium">Excluir</button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{format(parseISO(r.date.slice(0, 10)), "dd/MM/yyyy", { locale: ptBR })}</p>
                        <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
                          <span className="text-gray-500 dark:text-zinc-400">{fmt(r.saldoInicial)}</span>
                          <span className="mx-1 text-gray-300 dark:text-zinc-700">·</span>
                          <span className="text-emerald-600 dark:text-emerald-400">+{fmt(r.entradas)}</span>
                          <span className="mx-1 text-gray-300 dark:text-zinc-700">·</span>
                          <span className="text-accent">−{fmt(r.saidas)}</span>
                        </p>
                      </div>
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-100 shrink-0">R$ {fmt(r.fechamento)}</p>
                      <div className="flex gap-0.5 shrink-0">
                        <button onClick={() => openEdit(r)} className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 dark:text-zinc-700 hover:text-accent hover:bg-accent/5 transition-colors">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button onClick={() => setDeleteConfirm(r.id)} className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 dark:text-zinc-700 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/></svg>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      <BottomSheet open={open} onClose={() => setOpen(false)} title={editId ? 'Editar Fechamento' : 'Novo Fechamento'}>
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-zinc-500 mb-1.5 block">Data</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inp} required />
          </div>
          <CurrencyInput label="Saldo Inicial" value={saldoInicial} onChange={setSaldoInicial} required />
          <div className="grid grid-cols-2 gap-3">
            <CurrencyInput label="Entradas" value={entradas} onChange={setEntradas} />
            <CurrencyInput label="Saídas" value={saidas} onChange={setSaidas} />
          </div>
          <div className="px-4 py-3 bg-cream-100 dark:bg-zinc-800/60 rounded-xl flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-zinc-400">Fechamento calculado</p>
            <p className="text-lg font-display font-bold text-gray-800 dark:text-gray-100">R$&nbsp;{fmt(fechamentoCalc)}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-zinc-500 mb-1.5 block">Observação (opcional)</label>
            <input type="text" value={observacao} onChange={e => setObservacao(e.target.value)} className={inp} />
          </div>
          <button type="submit" disabled={submitting || !date.trim()}
            className="w-full py-3 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-accent-dark disabled:opacity-50 transition-all active:scale-[0.99]">
            {submitting ? 'Salvando...' : editId ? 'Atualizar' : 'Salvar'}
          </button>
        </form>
      </BottomSheet>
    </div>
  )
}
```

- [ ] **Commit:**

```bash
git add components/HojeCaixa.tsx
git commit -m "feat: add HojeCaixa simplified component for CAIXA role"
```

---

## Task 10: Hoje page.tsx — role split + nav + delete /caixa (CP-08 + CP-09)

**Files:**
- Modify: `app/(dashboard)/page.tsx`
- Modify: `components/DashboardShell.tsx`
- Modify: `components/BottomNav.tsx`
- Delete: `app/(dashboard)/caixa/page.tsx`

- [ ] **Substituir `app/(dashboard)/page.tsx` inteiro:**

```tsx
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import HojeAdmin from '@/components/HojeAdmin'
import HojeCaixa from '@/components/HojeCaixa'

export default async function HojePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  if (session.user.role === 'CAIXA') {
    return <HojeCaixa />
  }

  return <HojeAdmin />
}
```

- [ ] **Em `components/DashboardShell.tsx`**, substituir o array `navItems`:

```tsx
const navItems: NavItem[] = [
  {
    href: '/', label: 'Hoje', roles: ['ADMIN', 'CAIXA'],
    icon: (a) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" fill={a ? 'currentColor' : 'none'} />
        <polyline points="9,22 9,12 15,12 15,22" stroke={a ? 'white' : 'currentColor'} />
      </svg>
    ),
  },
  {
    href: '/fechamento', label: 'Mês', roles: ['ADMIN'],
    icon: (a) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" fill={a ? 'currentColor' : 'none'} />
        <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" stroke={a ? 'white' : 'currentColor'} />
      </svg>
    ),
  },
  {
    href: '/semana', label: 'Semana', roles: ['ADMIN'],
    icon: (a) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="12" width="4" height="9" rx="1" fill={a ? 'currentColor' : 'none'} />
        <rect x="9" y="7" width="4" height="14" rx="1" fill={a ? 'currentColor' : 'none'} />
        <rect x="16" y="3" width="4" height="18" rx="1" fill={a ? 'currentColor' : 'none'} />
      </svg>
    ),
  },
  {
    href: '/usuarios', label: 'Usuários', roles: ['ADMIN'],
    icon: (a) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="4" fill={a ? 'currentColor' : 'none'} />
        <path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" />
        <path d="M19 10v6m-3-3h6" />
      </svg>
    ),
  },
  {
    href: '/conta', label: 'Conta', roles: ['ADMIN', 'CAIXA'],
    icon: (a) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" fill={a ? 'currentColor' : 'none'} />
        <path d="M4 20c0-3.6 3.6-6.5 8-6.5s8 2.9 8 6.5" />
      </svg>
    ),
  },
]
```

- [ ] **Em `components/BottomNav.tsx`**, substituir `adminTabs` e `caixaTabs`:

```tsx
function IconSemana({ active }: { active: boolean }) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="12" width="4" height="9" rx="1" fill={active ? 'currentColor' : 'none'} />
      <rect x="9" y="7" width="4" height="14" rx="1" fill={active ? 'currentColor' : 'none'} />
      <rect x="16" y="3" width="4" height="18" rx="1" fill={active ? 'currentColor' : 'none'} />
    </svg>
  )
}

const adminTabs = [
  { href: '/',           label: 'Hoje',   Icon: IconHoje },
  { href: '/fechamento', label: 'Mês',    Icon: IconMes },
  { href: '/semana',     label: 'Semana', Icon: IconSemana },
]

const caixaTabs = [
  { href: '/',     label: 'Hoje',  Icon: IconHoje },
  { href: '/conta', label: 'Conta', Icon: IconConta },
]
```

- [ ] **Deletar a página do Caixa:**

```bash
rm pizzaria-dashboard/app/\(dashboard\)/caixa/page.tsx
```

*(As rotas de API `/api/caixa` e `/api/caixa/[id]` permanecem — ainda são usadas pelo HojeAdmin e HojeCaixa.)*

- [ ] **Verificar no browser:**
  - ADMIN: nav deve mostrar Hoje · Mês · Semana
  - CAIXA: nav deve mostrar Hoje · Conta
  - Acessar `/` como ADMIN → HojeAdmin renderiza
  - Acessar `/` como CAIXA → HojeCaixa renderiza
  - Acessar `/caixa` → 404

- [ ] **Commit:**

```bash
git add app/(dashboard)/page.tsx components/DashboardShell.tsx components/BottomNav.tsx
git rm app/\(dashboard\)/caixa/page.tsx
git commit -m "feat: merge Caixa into Hoje page with role-based rendering, update nav, remove /caixa route"
```

---

## Task 11: Cálculo mensal inclui FechamentoDia na aba Mês (CP-10)

**Files:**
- Modify: `app/(dashboard)/fechamento/page.tsx`

- [ ] **Adicionar estado `fechamentosDia` ao componente `MesPage`:**

```tsx
// Adicionar junto aos outros estados:
const [fechamentosDia, setFechamentosDia] = useState<{ avista: number; ifood: number; noventa9: number; keeta: number; extra: number; pizzas: number }[]>([])
```

- [ ] **Adicionar fetch de FechamentoDia no `fetchAll`:**

```tsx
const fetchAll = useCallback(async () => {
  setLoading(true)
  try {
    const qs = `mes=${mes}&ano=${ano}`
    const [v, f, i, c, fd] = await Promise.all([
      fetch(`/api/fechamento/vendas?${qs}`).then(r => r.json()),
      fetch(`/api/fechamento/funcionarios?${qs}`).then(r => r.json()),
      fetch(`/api/fechamento/insumos?${qs}`).then(r => r.json()),
      fetch(`/api/fechamento/contas?${qs}`).then(r => r.json()),
      fetch(`/api/fechamento-dia?${qs}`).then(r => r.json()),
    ])
    setVendas(Array.isArray(v) ? v.sort((a: Venda, b: Venda) => new Date(b.date).getTime() - new Date(a.date).getTime()) : [])
    setFuncionarios(Array.isArray(f) ? f : [])
    setInsumos(Array.isArray(i) ? i : [])
    setContas(Array.isArray(c) ? c.sort((a: Conta, b: Conta) => (a.diaVencimento ?? 99) - (b.diaVencimento ?? 99)) : [])
    setFechamentosDia(Array.isArray(fd) ? fd : [])
  } finally { setLoading(false) }
}, [mes, ano])
```

- [ ] **Atualizar os cálculos de `receita` e `totalPizzas`:**

```tsx
// Substituir as linhas existentes de totalBruto, totalTaxas, receita, totalPizzas:
const totalBruto     = r2(vendas.reduce((s, v) => r2(s + v.avista + v.debito + v.credito + v.pix + v.ifood + v.outros), 0))
const totalTaxas     = r2(vendas.reduce((s, v) => r2(s + v.taxas), 0))
const receitaFechs   = r2(fechamentosDia.reduce((s, f) => r2(s + f.avista + f.ifood + f.noventa9 + f.keeta + f.extra), 0))
const receita        = r2(totalBruto - totalTaxas + receitaFechs)
const totalPizzas    = vendas.reduce((s, v) => s + v.pizzas, 0) +
                       fechamentosDia.reduce((s, f) => s + f.pizzas, 0)
```

- [ ] **Verificar no browser:** Hero card da aba Mês deve refletir os fechamentos diários cadastrados.

- [ ] **Commit:**

```bash
git add app/(dashboard)/fechamento/page.tsx
git commit -m "feat: include FechamentoDia in monthly totals on Mes page"
```

---

## Task 12: Página /semana (CP-12 + CP-13)

**Files:**
- Create: `app/(dashboard)/semana/page.tsx`

- [ ] **Criar `app/(dashboard)/semana/page.tsx`:**

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, addMonths, subMonths, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function r2(n: number) { return Math.round(n * 100) / 100 }
function fmt(v: number) {
  if (v === 0) return '–'
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

type VendaSemana = { semana: number; avista: number; ifood: number; noventa9: number; keeta: number; extra: number; debito: number; credito: number; pix: number; outros: number; total: number }
type FuncSemana  = { nome: string; sem1: number; sem2: number; sem3: number; sem4: number; total: number }

export default function SemanaPage() {
  const [ref, setRef]         = useState(startOfMonth(new Date()))
  const [vendas, setVendas]   = useState<VendaSemana[]>([])
  const [funcs, setFuncs]     = useState<FuncSemana[]>([])
  const [loading, setLoading] = useState(true)

  const mes = ref.getMonth() + 1
  const ano = ref.getFullYear()
  const mesLabel = format(ref, 'MMMM yyyy', { locale: ptBR })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetch(`/api/semana?mes=${mes}&ano=${ano}`).then(r => r.json())
      setVendas(Array.isArray(data.vendas) ? data.vendas : [])
      setFuncs(Array.isArray(data.funcionarios) ? data.funcionarios : [])
    } finally { setLoading(false) }
  }, [mes, ano])

  useEffect(() => { load() }, [load])

  const totalVendas: VendaSemana = {
    semana: 0,
    avista:   r2(vendas.reduce((s, v) => s + v.avista, 0)),
    ifood:    r2(vendas.reduce((s, v) => s + v.ifood, 0)),
    noventa9: r2(vendas.reduce((s, v) => s + v.noventa9, 0)),
    keeta:    r2(vendas.reduce((s, v) => s + v.keeta, 0)),
    extra:    r2(vendas.reduce((s, v) => s + v.extra, 0)),
    debito:   r2(vendas.reduce((s, v) => s + v.debito, 0)),
    credito:  r2(vendas.reduce((s, v) => s + v.credito, 0)),
    pix:      r2(vendas.reduce((s, v) => s + v.pix, 0)),
    outros:   r2(vendas.reduce((s, v) => s + v.outros, 0)),
    total:    r2(vendas.reduce((s, v) => s + v.total, 0)),
  }

  const canalRows: { key: keyof Omit<VendaSemana, 'semana' | 'total'>; label: string }[] = [
    { key: 'avista',   label: 'À Vista' },
    { key: 'ifood',    label: 'iFood' },
    { key: 'noventa9', label: '99food' },
    { key: 'keeta',    label: 'Keeta' },
    { key: 'extra',    label: 'Extra' },
    { key: 'debito',   label: 'Débito' },
    { key: 'credito',  label: 'Crédito' },
    { key: 'pix',      label: 'PIX' },
    { key: 'outros',   label: 'Outros' },
  ]

  const totalFuncs = {
    sem1: r2(funcs.reduce((s, f) => s + f.sem1, 0)),
    sem2: r2(funcs.reduce((s, f) => s + f.sem2, 0)),
    sem3: r2(funcs.reduce((s, f) => s + f.sem3, 0)),
    sem4: r2(funcs.reduce((s, f) => s + f.sem4, 0)),
    total: r2(funcs.reduce((s, f) => s + f.total, 0)),
  }

  const thCls = 'px-3 py-2.5 text-right font-mono text-[10px] uppercase tracking-widest text-gray-400 dark:text-zinc-500 whitespace-nowrap'
  const tdCls = 'px-3 py-2.5 text-right text-xs text-gray-700 dark:text-zinc-300 whitespace-nowrap'
  const tdTotalCls = 'px-3 py-2.5 text-right text-xs font-bold text-gray-800 dark:text-gray-100 whitespace-nowrap'

  return (
    <div className="space-y-6">

      {/* Navegação de mês */}
      <div className="flex items-center justify-between">
        <button onClick={() => setRef(subMonths(ref, 1))}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-cream-100 dark:hover:bg-white/[0.06] text-gray-500 dark:text-zinc-400 transition-colors active:scale-95">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
        </button>
        <h1 className="text-base font-display font-semibold text-gray-800 dark:text-gray-100 capitalize">{mesLabel}</h1>
        <button onClick={() => setRef(addMonths(ref, 1))}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-cream-100 dark:hover:bg-white/[0.06] text-gray-500 dark:text-zinc-400 transition-colors active:scale-95">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9,18 15,12 9,6"/></svg>
        </button>
      </div>

      {/* Card Vendas por Semana */}
      <section>
        <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-mute mb-3">Vendas por Semana</p>
        <div className="bg-white dark:bg-[#171411] rounded-2xl border border-cream-200 dark:border-white/[0.06] shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-5 space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="skeleton h-8 rounded-lg"/>)}</div>
          ) : (
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full min-w-[380px]">
                <thead>
                  <tr className="border-b border-cream-200 dark:border-white/[0.04]">
                    <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-widest text-gray-400 dark:text-zinc-500">Canal</th>
                    <th className={thCls}>Sem 1</th>
                    <th className={thCls}>Sem 2</th>
                    <th className={thCls}>Sem 3</th>
                    <th className={thCls}>Sem 4</th>
                    <th className={thCls}>Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-200 dark:divide-white/[0.04]">
                  {canalRows.filter(c => vendas.some(v => v[c.key] > 0) || totalVendas[c.key] > 0).map(canal => (
                    <tr key={canal.key} className="hover:bg-cream-50/60 dark:hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-zinc-300">{canal.label}</td>
                      {vendas.map(v => <td key={v.semana} className={tdCls}>{fmt(v[canal.key])}</td>)}
                      <td className={tdTotalCls}>{fmt(totalVendas[canal.key])}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-cream-200 dark:border-white/[0.08] bg-cream-50 dark:bg-zinc-900/40">
                    <td className="px-4 py-2.5 text-xs font-bold text-gray-800 dark:text-gray-100">Total</td>
                    {vendas.map(v => <td key={v.semana} className={tdTotalCls}>{fmt(v.total)}</td>)}
                    <td className={`${tdTotalCls} text-emerald-600 dark:text-emerald-400`}>{fmt(totalVendas.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Card Funcionários por Semana */}
      <section>
        <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-mute mb-3">Funcionários por Semana</p>
        <div className="bg-white dark:bg-[#171411] rounded-2xl border border-cream-200 dark:border-white/[0.06] shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-5 space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-8 rounded-lg"/>)}</div>
          ) : funcs.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-gray-400 dark:text-zinc-500">Sem registros de funcionários neste mês</p>
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full min-w-[380px]">
                <thead>
                  <tr className="border-b border-cream-200 dark:border-white/[0.04]">
                    <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-widest text-gray-400 dark:text-zinc-500">Funcionário</th>
                    <th className={thCls}>Sem 1</th>
                    <th className={thCls}>Sem 2</th>
                    <th className={thCls}>Sem 3</th>
                    <th className={thCls}>Sem 4</th>
                    <th className={thCls}>Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-200 dark:divide-white/[0.04]">
                  {funcs.map(f => (
                    <tr key={f.nome} className="hover:bg-cream-50/60 dark:hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-zinc-300">{f.nome}</td>
                      <td className={tdCls}>{fmt(f.sem1)}</td>
                      <td className={tdCls}>{fmt(f.sem2)}</td>
                      <td className={tdCls}>{fmt(f.sem3)}</td>
                      <td className={tdCls}>{fmt(f.sem4)}</td>
                      <td className={tdTotalCls}>{fmt(f.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-cream-200 dark:border-white/[0.08] bg-cream-50 dark:bg-zinc-900/40">
                    <td className="px-4 py-2.5 text-xs font-bold text-gray-800 dark:text-gray-100">Total</td>
                    <td className={tdTotalCls}>{fmt(totalFuncs.sem1)}</td>
                    <td className={tdTotalCls}>{fmt(totalFuncs.sem2)}</td>
                    <td className={tdTotalCls}>{fmt(totalFuncs.sem3)}</td>
                    <td className={tdTotalCls}>{fmt(totalFuncs.sem4)}</td>
                    <td className={`${tdTotalCls} text-accent`}>{fmt(totalFuncs.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </section>

    </div>
  )
}
```

- [ ] **Verificar no browser:** Abrir `/semana` — deve mostrar as duas tabelas com navegação de mês.

- [ ] **Commit:**

```bash
git add app/(dashboard)/semana/
git commit -m "feat: add Semana page with weekly breakdown by channel and employee"
```

---

## Task 13: Filtro por funcionário na aba Mês (CP-14)

**Files:**
- Modify: `app/(dashboard)/fechamento/page.tsx`

- [ ] **Adicionar estado de filtro** junto aos outros estados no `MesPage`:

```tsx
const [funcFiltro, setFuncFiltro] = useState<string>('todos')
```

- [ ] **Adicionar `nomesFunc` computado** (nomes únicos dos funcionários do mês):

```tsx
const nomesFunc = Array.from(new Set(funcionarios.map(f => f.nome))).sort()
```

- [ ] **Adicionar filtro na aba Func.** — inserir logo acima da lista de funcionários (onde está o `{tab === 'funcionarios' && (`):

```tsx
{tab === 'funcionarios' && (
  <>
    {nomesFunc.length > 1 && (
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-gray-500 dark:text-zinc-500 shrink-0">Filtrar:</label>
        <select
          value={funcFiltro}
          onChange={e => setFuncFiltro(e.target.value)}
          className="px-3 py-1.5 border border-cream-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 dark:text-white rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all"
        >
          <option value="todos">Todos</option>
          {nomesFunc.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
    )}
    {/* lista existente de funcionarios filtrada: */}
    {loading ? ( ... ) : funcionariosFiltrados.length === 0 ? ( ... ) : ( lista )}
  </>
)}
```

- [ ] **Criar `funcionariosFiltrados`** derivado de `funcionarios`:

```tsx
const funcionariosFiltrados = funcFiltro === 'todos'
  ? funcionarios
  : funcionarios.filter(f => f.nome === funcFiltro)

const totalFuncFiltrado = r2(funcionariosFiltrados.reduce((s, f) => r2(s + f.valor), 0))
```

- [ ] **Substituir `funcionarios` por `funcionariosFiltrados`** no map da aba Func. e adicionar subtotal quando filtrado:

No bloco que renderiza a lista de funcionários (`funcionarios.map(f => ...)`), substituir por `funcionariosFiltrados.map(f => ...)`.

Adicionar abaixo da lista (quando filtrado):

```tsx
{funcFiltro !== 'todos' && (
  <div className="flex items-center justify-between px-4 py-3 border-t border-cream-200 dark:border-white/[0.05] bg-cream-50 dark:bg-zinc-900/40">
    <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium">Total — {funcFiltro}</p>
    <p className="text-sm font-bold text-accent">R$ {fmt(totalFuncFiltrado)}</p>
  </div>
)}
```

- [ ] **Resetar filtro ao mudar de mês** — adicionar `setFuncFiltro('todos')` no `fetchAll` logo após o `setLoading(true)`:

```tsx
const fetchAll = useCallback(async () => {
  setLoading(true)
  setFuncFiltro('todos')   // ← adicionar esta linha
  try { ... }
```

- [ ] **Verificar no browser:** Aba Mês → Func. → com mais de um funcionário cadastrado, deve aparecer dropdown "Filtrar: Todos / João / Maria". Selecionar um nome → lista e subtotal filtrados.

- [ ] **Commit:**

```bash
git add app/(dashboard)/fechamento/page.tsx
git commit -m "feat: add employee filter to Func tab on Mes page"
```

---

## Self-Review

**Cobertura da spec:**
- CP-01 Schema ✓ Task 1
- CP-02 APIs FechamentoDia ✓ Task 2
- CP-03 APIs Colaboradores ✓ Task 3
- CP-04 Usuários → Colaboradores ✓ Task 6
- CP-05 Forms → select ✓ Task 7
- CP-06 Hoje ADMIN Bloco 1 ✓ Task 8
- CP-07 Hoje ADMIN Bloco 2 ✓ Task 8
- CP-08 Remove /caixa + nav ✓ Task 10
- CP-09 Hoje CAIXA simplificado ✓ Task 9 + 10
- CP-10 Cálculo mensal ✓ Task 11
- CP-11 API /semana ✓ Task 5
- CP-12 Semana vendas ✓ Task 12
- CP-13 Semana funcionários ✓ Task 12
- CP-14 Filtro funcionário ✓ Task 13

**Consistência de tipos:**
- `FechamentoDia` type em HojeAdmin.tsx usa os mesmos campos do modelo Prisma (avista, ifood, noventa9, keeta, extra, pizzas)
- `noventa9` é o campo consistente em todos os arquivos (schema, API, componente, semana)
- `VendaSemana.noventa9` em semana/page.tsx corresponde ao campo retornado pela API /api/semana

**Dependências de execução:**
- Task 1 (schema) DEVE ser concluída antes de qualquer outra
- Tasks 2-5 (APIs) devem ser concluídas antes das Tasks 6-13 (UI)
- Task 6 (ColaboradoresSection) deve preceder Task 7 (forms select)
- Task 8 (HojeAdmin) deve preceder Task 10 (page.tsx role split)
- Task 9 (HojeCaixa) deve preceder Task 10 (page.tsx role split)

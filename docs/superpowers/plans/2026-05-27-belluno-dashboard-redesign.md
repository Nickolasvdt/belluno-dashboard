# Belluno Dashboard — Redesign Completo

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesenhar completamente o visual e UX do painel Belluno — novas fontes (Geist + Bricolage Grotesque), tokens de cor semânticos, FAB global com suporte a Caixa, gráfico semanal na home e tabs com subtotais no fechamento.

**Architecture:** Troca de font stack no `app/layout.tsx`, tokens novos no `tailwind.config.ts`, `QuickAddFAB` aprimorado com tipo Caixa e movido para `DashboardShell` (global), novo componente `WeeklyBarChart`, e reescrita visual de todas as páginas. Nenhuma mudança de API, banco ou rotas.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS 3, Recharts 2 (já instalado), Prisma, date-fns, NextAuth

---

## Mapa de Arquivos

**Modificar:**
- `app/layout.tsx` — trocar fontes
- `tailwind.config.ts` — novos tokens de cor e fontFamily
- `app/globals.css` — variáveis CSS de cor para dark mode
- `components/Providers.tsx` — sem mudança de lógica, apenas verificar
- `components/DashboardShell.tsx` — mover FAB para cá, atualizar estilos
- `components/BottomNav.tsx` — 4 itens ADMIN, atualizar estilos
- `components/QuickAddFAB.tsx` — adicionar tipo Caixa, atualizar estilos
- `components/BottomSheet.tsx` — atualizar estilos menores
- `components/CurrencyInput.tsx` — trocar classes `primary` → `accent`
- `app/(dashboard)/page.tsx` — home: remover FAB, adicionar gráfico, redesenho
- `app/(dashboard)/fechamento/page.tsx` — subtotais nas tabs, remover FAB inline, redesenho
- `app/(dashboard)/caixa/page.tsx` — remover FAB inline, redesenho
- `app/(dashboard)/gastos/page.tsx` — remover FAB inline, redesenho
- `app/(auth)/login/page.tsx` — atualizar estilos
- `app/(dashboard)/conta/page.tsx` — atualizar estilos
- `app/(dashboard)/usuarios/page.tsx` — atualizar estilos

**Criar:**
- `components/WeeklyBarChart.tsx` — Recharts BarChart receita vs despesas por semana

---

## Task 1: Foundation — Fontes e Tailwind

**Files:**
- Modify: `app/layout.tsx`
- Modify: `tailwind.config.ts`
- Modify: `app/globals.css`

- [ ] **Step 1: Atualizar `app/layout.tsx`**

```tsx
import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Providers from '@/components/Providers'

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600'],
  display: 'swap',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500'],
  display: 'swap',
})

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Belluno Dashboard',
  description: 'Sistema de gestão Belluno',
}

export const viewport: Viewport = {
  viewportFit: 'cover',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}` }} />
      </head>
      <body className={`${geist.variable} ${geistMono.variable} ${bricolage.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Atualizar `tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./context/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['var(--font-sans)',    'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)',    'ui-monospace',  'monospace'],
      },
      colors: {
        // Tokens semânticos novos
        ink:          'var(--color-ink)',
        mute:         'var(--color-mute)',
        accent:       '#8B2020',
        'accent-dark':'#6B1515',
        // Aliases para não quebrar código existente
        primary:        '#8B2020',
        'primary-dark': '#6B1515',
        'primary-light':'#fdf0f0',
        secondary:      '#fbbf24',
        cream: {
          50:  '#fefdf8',
          100: '#fdf9ef',
          200: '#ede8df',
          300: '#dfd6c5',
          400: '#c9b88a',
        },
        wood: {
          50:  '#ece2d8',
          100: '#d7c1ad',
          200: '#bc987d',
          300: '#9c7356',
          400: '#7b523d',
          500: '#633b2d',
          600: '#482a22',
          700: '#2d1b16',
        },
        gold: { 400: '#f59e0b', 500: '#d97706' },
        gray: {
          50:  '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
          950: '#0c0a09',
        },
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 3: Atualizar `app/globals.css` — adicionar variáveis CSS para tokens semânticos**

Adicionar no início do arquivo, antes de `@tailwind base`:

```css
:root {
  --color-ink:  #1C1917;
  --color-mute: #78716C;
}
.dark {
  --color-ink:  #F5F5F4;
  --color-mute: #A8A29E;
}
```

O resto do arquivo permanece igual.

- [ ] **Step 4: Verificar compilação TypeScript**

```
cd pizzaria-dashboard
npx tsc --noEmit
```

Esperado: sem erros de tipo.

- [ ] **Step 5: Verificar no browser**

```
npm run dev
```

Abrir `http://localhost:3000/login` — a tipografia deve estar diferente (Geist ao invés de DM Sans).

- [ ] **Step 6: Commit**

```
git add app/layout.tsx tailwind.config.ts app/globals.css
git commit -m "feat: swap font stack to Geist + Bricolage Grotesque + Geist Mono"
```

---

## Task 2: WeeklyBarChart — Novo Componente

**Files:**
- Create: `components/WeeklyBarChart.tsx`

- [ ] **Step 1: Criar `components/WeeklyBarChart.tsx`**

```tsx
'use client'

import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

export type WeekData = {
  label: string
  receita: number
  despesas: number
}

function fmt(v: number) {
  if (v === 0) return 'R$0'
  return v.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  })
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { name: string; value: number; fill: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-zinc-900 border border-cream-200 dark:border-zinc-800 rounded-xl px-3 py-2 shadow-lg">
      <p className="font-mono text-[10px] uppercase tracking-wide text-mute mb-1.5">{label}</p>
      {payload.map(p => (
        <p key={p.name} className="text-xs font-medium" style={{ color: p.fill }}>
          {p.name === 'receita' ? 'Receita' : 'Despesas'}: {fmt(p.value)}
        </p>
      ))}
    </div>
  )
}

export default function WeeklyBarChart({ data }: { data: WeekData[] }) {
  return (
    <ResponsiveContainer width="100%" height={88}>
      <BarChart data={data} barGap={3} barCategoryGap="35%">
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: 'var(--color-mute)', fontFamily: 'var(--font-mono)' }}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: 'rgba(139,32,32,0.04)' }}
        />
        <Bar dataKey="receita" name="receita" radius={[3, 3, 0, 0]} maxBarSize={16}>
          {data.map((_, i) => (
            <Cell key={i} fill="#10b981" />
          ))}
        </Bar>
        <Bar dataKey="despesas" name="despesas" radius={[3, 3, 0, 0]} maxBarSize={16}>
          {data.map((_, i) => (
            <Cell key={i} fill="#8B2020" />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 2: Verificar compilação**

```
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```
git add components/WeeklyBarChart.tsx
git commit -m "feat: add WeeklyBarChart component (Recharts)"
```

---

## Task 3: QuickAddFAB — Adicionar tipo Caixa e atualizar estilos

**Files:**
- Modify: `components/QuickAddFAB.tsx`

- [ ] **Step 1: Reescrever `components/QuickAddFAB.tsx`**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import BottomSheet from './BottomSheet'
import CurrencyInput from './CurrencyInput'

type Cat = 'venda' | 'insumo' | 'funcionario' | 'conta' | 'caixa'

function r2(n: number) { return Math.round(n * 100) / 100 }

const inp = 'w-full px-3.5 py-2.5 border border-cream-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 dark:text-white rounded-xl text-sm placeholder:text-mute dark:placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/50 transition-all'

const CATS: { key: Cat; label: string; icon: React.ReactNode }[] = [
  {
    key: 'venda', label: 'Venda',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 001.99 1.61h9.72a2 2 0 001.97-1.67L23 6H6"/></svg>,
  },
  {
    key: 'insumo', label: 'Insumo',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>,
  },
  {
    key: 'funcionario', label: 'Funcionário',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-3.6 3.6-6.5 8-6.5s8 2.9 8 6.5"/></svg>,
  },
  {
    key: 'conta', label: 'Conta',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>,
  },
  {
    key: 'caixa', label: 'Caixa',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><rect x="2" y="6" width="20" height="13" rx="2"/><line x1="2" y1="11" x2="22" y2="11"/></svg>,
  },
]

export default function QuickAddFAB() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [cat, setCat] = useState<Cat | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const today = format(new Date(), 'yyyy-MM-dd')
  const [date, setDate] = useState(today)
  // shared
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState(0)
  // funcionario
  const [semana, setSemana] = useState('')
  // conta
  const [pago, setPago] = useState(false)
  const [diaVencimento, setDiaVencimento] = useState('')
  // venda
  const [avista, setAvista] = useState(0)
  const [debito, setDebito] = useState(0)
  const [credito, setCredito] = useState(0)
  const [pix, setPix] = useState(0)
  const [ifood, setIfood] = useState(0)
  const [outros, setOutros] = useState(0)
  const [taxas, setTaxas] = useState(0)
  const [pizzas, setPizzas] = useState(0)
  const [obsVenda, setObsVenda] = useState('')
  // caixa
  const [saldoInicial, setSaldoInicial] = useState(0)
  const [entradas, setEntradas] = useState(0)
  const [saidas, setSaidas] = useState(0)
  const [diferenca, setDiferenca] = useState('')
  const [obsCaixa, setObsCaixa] = useState('')

  useEffect(() => {
    if (cat === 'caixa') {
      fetch('/api/caixa')
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) setSaldoInicial(data[0].fechamento)
        })
        .catch(() => {})
    }
  }, [cat])

  function reset() {
    setCat(null)
    setDate(today)
    setDescricao(''); setValor(0); setSemana(''); setPago(false); setDiaVencimento('')
    setAvista(0); setDebito(0); setCredito(0); setPix(0); setIfood(0); setOutros(0)
    setTaxas(0); setPizzas(0); setObsVenda('')
    setSaldoInicial(0); setEntradas(0); setSaidas(0); setDiferenca(''); setObsCaixa('')
  }

  function openModal() { reset(); setOpen(true) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (cat === 'venda') {
        await fetch('/api/fechamento/vendas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, avista, debito, credito, pix, ifood, outros, taxas, pizzas, observacao: obsVenda }) })
      } else if (cat === 'insumo') {
        await fetch('/api/fechamento/insumos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, fornecedor: descricao, valor }) })
      } else if (cat === 'funcionario') {
        await fetch('/api/fechamento/funcionarios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, nome: descricao, semana, valor }) })
      } else if (cat === 'conta') {
        await fetch('/api/fechamento/contas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, despesa: descricao, valor, pago, diaVencimento: diaVencimento ? parseInt(diaVencimento) : null }) })
      } else if (cat === 'caixa') {
        const fechamento = r2(saldoInicial + entradas - saidas)
        await fetch('/api/caixa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, saldoInicial, entradas, saidas, fechamento, diferenca: diferenca !== '' ? parseFloat(diferenca) : null, observacao: obsCaixa }) })
      }
      reset(); setOpen(false); router.refresh()
    } finally { setSubmitting(false) }
  }

  const brutoVenda = r2(avista + debito + credito + pix + ifood + outros)
  const fechamentoCaixa = r2(saldoInicial + entradas - saidas)
  const canSubmit = cat !== null && (cat === 'venda' || cat === 'caixa' || valor > 0)

  return (
    <>
      <button
        onClick={openModal}
        className="fixed bottom-[5.5rem] right-4 md:bottom-6 md:right-6 w-14 h-14 bg-accent text-white rounded-full shadow-lg shadow-accent/30 flex items-center justify-center z-30 hover:bg-accent-dark transition-all active:scale-95"
        aria-label="Adicionar registro"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      <BottomSheet open={open} onClose={() => { setOpen(false); reset() }} title="Novo Registro">

        {/* Passo 1: Seleção de tipo */}
        {cat === null && (
          <div className="grid grid-cols-2 gap-3">
            {CATS.map(c => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCat(c.key)}
                className={`flex flex-col items-center justify-center gap-2.5 py-5 rounded-2xl border border-cream-200 dark:border-zinc-800 bg-cream-50/60 dark:bg-zinc-900/40 text-ink dark:text-gray-200 hover:border-accent/40 hover:bg-accent/5 transition-all ${c.key === 'caixa' ? 'col-span-2 flex-row gap-3 py-4' : ''}`}
              >
                <span className="text-mute dark:text-zinc-400">{c.icon}</span>
                <span className="text-sm font-medium">{c.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Passo 2: Formulário */}
        {cat !== null && (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <button type="button" onClick={() => setCat(null)}
              className="flex items-center gap-1.5 text-xs text-mute hover:text-ink dark:hover:text-gray-200 transition-colors mb-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
              Voltar
            </button>

            <div>
              <label className="text-xs font-medium text-mute dark:text-zinc-500 mb-1.5 block">Data</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inp} />
            </div>

            {(cat === 'insumo' || cat === 'funcionario' || cat === 'conta') && (
              <>
                <div>
                  <label className="text-xs font-medium text-mute dark:text-zinc-500 mb-1.5 block">
                    {cat === 'insumo' ? 'Fornecedor' : cat === 'funcionario' ? 'Nome' : 'Despesa'}
                  </label>
                  <input type="text" required value={descricao} onChange={e => setDescricao(e.target.value)}
                    placeholder={cat === 'insumo' ? 'PMG, Sacolão, CristauLat...' : ''}
                    className={inp} />
                </div>
                <CurrencyInput label="Valor" value={valor} onChange={setValor} required />
              </>
            )}

            {cat === 'funcionario' && (
              <div>
                <label className="text-xs font-medium text-mute dark:text-zinc-500 mb-1.5 block">Semana</label>
                <input type="text" value={semana} onChange={e => setSemana(e.target.value)} placeholder="Semana 1" className={inp} />
              </div>
            )}

            {cat === 'conta' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-mute dark:text-zinc-500 mb-1.5 block">Dia vencimento</label>
                  <input type="number" value={diaVencimento} onChange={e => setDiaVencimento(e.target.value)} placeholder="15" min="1" max="31" className={inp} />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input type="checkbox" id="pago-fab" checked={pago} onChange={e => setPago(e.target.checked)} className="w-4 h-4 accent-[#8B2020]" />
                  <label htmlFor="pago-fab" className="text-sm text-ink dark:text-gray-300 cursor-pointer">Já pago</label>
                </div>
              </div>
            )}

            {cat === 'venda' && (
              <div className="space-y-3.5">
                <div>
                  <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-mute mb-2">Recebimentos</p>
                  <div className="grid grid-cols-2 gap-3">
                    <CurrencyInput label="À Vista"             value={avista}  onChange={setAvista} />
                    <CurrencyInput label="Stone / Débito"      value={debito}  onChange={setDebito} />
                    <CurrencyInput label="Ticket / VR / Alelo" value={credito} onChange={setCredito} />
                    <CurrencyInput label="PIX (Tuna)"          value={pix}     onChange={setPix} />
                  </div>
                </div>
                <div>
                  <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-mute mb-2">Delivery</p>
                  <div className="grid grid-cols-2 gap-3">
                    <CurrencyInput label="iFood"         value={ifood}  onChange={setIfood} />
                    <CurrencyInput label="99Food / Keeta" value={outros} onChange={setOutros} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <CurrencyInput label="Taxas" value={taxas} onChange={setTaxas} />
                  <div>
                    <label className="text-xs font-medium text-mute dark:text-zinc-500 mb-1.5 block">Pizzas</label>
                    <input type="number" value={pizzas || ''} onChange={e => setPizzas(parseInt(e.target.value) || 0)} placeholder="0" className={inp} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-mute dark:text-zinc-500 mb-1.5 block">Observação</label>
                  <input type="text" value={obsVenda} onChange={e => setObsVenda(e.target.value)} placeholder="Ex: Fechado, feriado..." className={inp} />
                </div>
                <div className="flex justify-between items-center px-3.5 py-3 bg-cream-100 dark:bg-zinc-800/60 rounded-xl">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wide text-mute">Bruto</p>
                    <p className="text-sm font-semibold text-ink dark:text-gray-100">R$ {brutoVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-mute"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                  <div className="text-right">
                    <p className="font-mono text-[10px] uppercase tracking-wide text-mute">Líquido</p>
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">R$ {r2(brutoVenda - taxas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>
            )}

            {cat === 'caixa' && (
              <div className="space-y-3.5">
                <CurrencyInput label="Saldo Inicial" value={saldoInicial} onChange={setSaldoInicial} />
                <CurrencyInput label="Entradas" value={entradas} onChange={setEntradas} />
                <CurrencyInput label="Saídas" value={saidas} onChange={setSaidas} />
                <div className="flex justify-between items-center px-3.5 py-3 bg-cream-100 dark:bg-zinc-800/60 rounded-xl">
                  <p className="text-sm font-medium text-mute dark:text-zinc-400">Fechamento calculado</p>
                  <p className="text-base font-semibold text-ink dark:text-gray-100">R$ {fechamentoCaixa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-mute dark:text-zinc-500 mb-1.5 block">Diferença (opcional)</label>
                  <input type="number" step="0.01" value={diferenca} onChange={e => setDiferenca(e.target.value)} placeholder="0,00" className={inp} />
                  <p className="font-mono text-[10px] text-mute mt-1">Diferença entre caixa físico e fechamento calculado</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-mute dark:text-zinc-500 mb-1.5 block">Observação</label>
                  <input type="text" value={obsCaixa} onChange={e => setObsCaixa(e.target.value)} className={inp} />
                </div>
              </div>
            )}

            <button type="submit" disabled={submitting || !canSubmit}
              className="w-full py-3 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-accent-dark disabled:opacity-50 transition-all active:scale-[0.99] mt-1">
              {submitting ? 'Salvando...' : 'Salvar'}
            </button>
          </form>
        )}
      </BottomSheet>
    </>
  )
}
```

- [ ] **Step 2: Atualizar `components/CurrencyInput.tsx` — trocar `primary` por `accent`**

Apenas alterar as duas ocorrências de `primary` na className do input:

```tsx
className="w-full min-w-0 px-3.5 py-2.5 border border-cream-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-800 dark:text-white rounded-xl text-sm placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/50 transition-all"
```

- [ ] **Step 3: Verificar compilação**

```
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```
git add components/QuickAddFAB.tsx components/CurrencyInput.tsx
git commit -m "feat: add Caixa type to QuickAddFAB, update styles to accent tokens"
```

---

## Task 4: DashboardShell + BottomNav — Mover FAB e Redesenho

**Files:**
- Modify: `components/DashboardShell.tsx`
- Modify: `components/BottomNav.tsx`

- [ ] **Step 1: Reescrever `components/DashboardShell.tsx`**

```tsx
'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/context/ThemeContext'
import BottomNav from './BottomNav'
import QuickAddFAB from './QuickAddFAB'

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4.5" fill="currentColor" />
      <line x1="12" y1="2" x2="12" y2="5" /><line x1="12" y1="19" x2="12" y2="22" />
      <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" /><line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
      <line x1="2" y1="12" x2="5" y2="12" /><line x1="19" y1="12" x2="22" y2="12" />
      <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" /><line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  )
}

type NavItem = { href: string; label: string; roles: string[]; icon: (a: boolean) => React.ReactNode }

const navItems: NavItem[] = [
  {
    href: '/', label: 'Hoje', roles: ['ADMIN'],
    icon: (a) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" fill={a ? 'currentColor' : 'none'} />
        <polyline points="9,22 9,12 15,12 15,22" stroke={a ? 'white' : 'currentColor'} />
      </svg>
    ),
  },
  {
    href: '/gastos', label: 'Registros', roles: ['ADMIN'],
    icon: (a) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="3" fill={a ? 'currentColor' : 'none'} />
        <line x1="12" y1="9" x2="12" y2="15" stroke={a ? 'white' : 'currentColor'} />
        <line x1="9" y1="12" x2="15" y2="12" stroke={a ? 'white' : 'currentColor'} />
      </svg>
    ),
  },
  {
    href: '/caixa', label: 'Caixa', roles: ['ADMIN', 'CAIXA'],
    icon: (a) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="13" rx="2" fill={a ? 'currentColor' : 'none'} />
        <line x1="2" y1="11" x2="22" y2="11" stroke={a ? 'white' : 'currentColor'} />
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

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const role = session?.user?.role as string | undefined
  const { theme, toggle } = useTheme()

  const visible = navItems.filter(i => role && i.roles.includes(role))
  const initial = session?.user?.username?.[0]?.toUpperCase() ?? '?'

  return (
    <div className="flex h-dvh bg-[#faf9f6] dark:bg-[#0e0c0a]">

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-[200px] shrink-0 bg-white dark:bg-[#120f0c] border-r border-cream-200 dark:border-white/[0.05] flex-col">
        {/* Brand */}
        <div className="px-5 h-14 flex items-center gap-3 border-b border-cream-200 dark:border-white/[0.05] shrink-0">
          <Image src="/belluno_logo.png" alt="Belluno" width={30} height={30} className="rounded-full shrink-0" unoptimized />
          <div>
            <p className="font-display font-semibold text-[15px] text-accent leading-none tracking-tight">Belluno</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-mute mt-0.5">Pizzaria</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2.5 py-3 space-y-px overflow-y-auto">
          {visible.map(({ href, label, icon }) => {
            const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 relative ${
                  isActive
                    ? 'bg-accent/[0.07] dark:bg-accent/[0.12] text-accent font-medium'
                    : 'text-mute dark:text-zinc-500 font-medium hover:text-ink dark:hover:text-zinc-300 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-[8px] bottom-[8px] w-[2.5px] bg-accent rounded-r-full" />
                )}
                {icon(isActive)}
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-cream-200 dark:border-white/[0.05] shrink-0 space-y-3">
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-7 h-7 rounded-full bg-accent/10 dark:bg-accent/15 flex items-center justify-center text-accent text-[11px] font-bold shrink-0">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-ink dark:text-zinc-300 truncate leading-none">{session?.user?.username}</p>
              <p className="font-mono text-[10px] text-mute capitalize mt-0.5">{role?.toLowerCase()}</p>
            </div>
          </div>
          <div className="flex items-center justify-between px-2">
            <button onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-xs text-mute hover:text-accent font-medium transition-colors">
              Sair
            </button>
            <button onClick={toggle}
              className="flex items-center gap-1.5 text-xs text-mute hover:text-ink dark:hover:text-zinc-400 transition-colors px-2 py-1.5 rounded-md hover:bg-black/[0.04] dark:hover:bg-white/[0.05]">
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
              <span>{theme === 'dark' ? 'Claro' : 'Escuro'}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Content area ── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">

        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 h-[52px] bg-white/90 dark:bg-[#120f0c]/90 backdrop-blur-md border-b border-cream-200 dark:border-white/[0.05] shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-2.5">
            <Image src="/belluno_logo.png" alt="Belluno" width={26} height={26} className="rounded-full" unoptimized />
            <span className="font-display font-semibold text-[14px] text-accent tracking-tight">Belluno</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={toggle}
              className="w-8 h-8 flex items-center justify-center rounded-full text-mute hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition-colors">
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            <Link href="/conta"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-accent/10 dark:bg-accent/15 text-accent text-[11px] font-bold">
              {initial}
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div
            key={pathname}
            className="max-w-screen-md mx-auto px-4 pt-5 md:pb-10 md:px-8 md:pt-8 animate-slide-up"
            style={{ paddingBottom: 'calc(6.5rem + env(safe-area-inset-bottom))' }}
          >
            {children}
          </div>
        </main>

        {/* FAB global — disponível em todas as rotas */}
        <QuickAddFAB />

        <BottomNav />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Reescrever `components/BottomNav.tsx` — 4 itens, estilos atualizados**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

function IconHoje({ active }: { active: boolean }) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" fill={active ? 'currentColor' : 'none'} />
      <polyline points="9,22 9,12 15,12 15,22" stroke={active ? 'white' : 'currentColor'} />
    </svg>
  )
}

function IconRegistro({ active }: { active: boolean }) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="3" fill={active ? 'currentColor' : 'none'} />
      <line x1="12" y1="9" x2="12" y2="15" stroke={active ? 'white' : 'currentColor'} />
      <line x1="9" y1="12" x2="15" y2="12" stroke={active ? 'white' : 'currentColor'} />
    </svg>
  )
}

function IconCaixa({ active }: { active: boolean }) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="13" rx="2" fill={active ? 'currentColor' : 'none'} />
      <line x1="2" y1="11" x2="22" y2="11" stroke={active ? 'white' : 'currentColor'} />
    </svg>
  )
}

function IconMes({ active }: { active: boolean }) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" fill={active ? 'currentColor' : 'none'} />
      <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" stroke={active ? 'white' : 'currentColor'} />
    </svg>
  )
}

function IconConta({ active }: { active: boolean }) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" fill={active ? 'currentColor' : 'none'} />
      <path d="M4 20c0-3.6 3.6-6.5 8-6.5s8 2.9 8 6.5" />
    </svg>
  )
}

const adminTabs = [
  { href: '/',           label: 'Hoje',    Icon: IconHoje },
  { href: '/caixa',      label: 'Caixa',   Icon: IconCaixa },
  { href: '/fechamento', label: 'Mês',     Icon: IconMes },
  { href: '/gastos',     label: 'Gastos',  Icon: IconRegistro },
]

const caixaTabs = [
  { href: '/caixa', label: 'Caixa', Icon: IconCaixa },
  { href: '/conta', label: 'Conta', Icon: IconConta },
]

export default function BottomNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const tabs = session?.user?.role === 'CAIXA' ? caixaTabs : adminTabs

  return (
    <nav
      className="fixed bottom-0 inset-x-0 md:hidden z-40 bg-white/95 dark:bg-[#120f0c]/95 backdrop-blur-md border-t border-cream-200 dark:border-white/[0.05]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex">
        {tabs.map(({ href, label, Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link key={href} href={href}
              className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors relative ${
                isActive ? 'text-accent' : 'text-mute dark:text-zinc-600'
              }`}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-[2px] bg-accent rounded-full" />
              )}
              <Icon active={isActive} />
              <span className="font-mono text-[9px] uppercase tracking-[0.12em]">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
```

- [ ] **Step 3: Verificar compilação e navegação**

```
npx tsc --noEmit
npm run dev
```

Abrir `http://localhost:3000` — verificar: sidebar desktop com nova tipografia, bottom nav mobile com 4 itens, FAB visível em todas as abas.

- [ ] **Step 4: Commit**

```
git add components/DashboardShell.tsx components/BottomNav.tsx
git commit -m "feat: move QuickAddFAB to DashboardShell, redesign nav with new tokens"
```

---

## Task 5: Home — Redesenho Completo

**Files:**
- Modify: `app/(dashboard)/page.tsx`

- [ ] **Step 1: Reescrever `app/(dashboard)/page.tsx`**

```tsx
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'
import WeeklyBarChart from '@/components/WeeklyBarChart'
import type { WeekData } from '@/components/WeeklyBarChart'

function r2(n: number) { return Math.round(n * 100) / 100 }
function fmt(v: number) { return v.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }
function weekOf(date: Date): number { return Math.min(Math.ceil(new Date(date).getDate() / 7), 4) }

export default async function HojePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role === 'CAIXA') redirect('/caixa')

  const now = new Date()
  const start = startOfMonth(now)
  const end   = endOfMonth(now)
  const todayStart = startOfDay(now)
  const todayEnd   = endOfDay(now)

  const [vendas, insumos, funcionarios, contas, vendaHoje, caixaHoje] = await Promise.all([
    prisma.venda.findMany({ where: { date: { gte: start, lte: end } } }),
    prisma.insumo.findMany({ where: { date: { gte: start, lte: end } }, orderBy: { date: 'desc' } }),
    prisma.funcionario.findMany({ where: { date: { gte: start, lte: end } }, orderBy: { date: 'desc' } }),
    prisma.contaFixa.findMany({ where: { date: { gte: start, lte: end } } }),
    prisma.venda.findFirst({ where: { date: { gte: todayStart, lte: todayEnd } } }),
    prisma.cashFlow.findFirst({ where: { date: { gte: todayStart, lte: todayEnd } } }),
  ])

  const bruto    = r2(vendas.reduce((s, v) => r2(s + v.avista + v.debito + v.credito + v.pix + v.ifood + v.outros), 0))
  const taxas    = r2(vendas.reduce((s, v) => r2(s + v.taxas), 0))
  const receita  = r2(bruto - taxas)
  const despesas = r2(
    insumos.reduce((s, i) => r2(s + i.valor), 0) +
    funcionarios.reduce((s, f) => r2(s + f.valor), 0) +
    contas.reduce((s, c) => r2(s + c.valor), 0)
  )
  const resultado = r2(receita - despesas)

  const pendentes = contas
    .filter(c => !c.pago)
    .sort((a, b) => (a.diaVencimento ?? 99) - (b.diaVencimento ?? 99))
    .slice(0, 5)

  type R = { tipo: 'insumo' | 'funcionario'; desc: string; valor: number; date: Date }
  const recent: R[] = [
    ...insumos.slice(0, 4).map(i => ({ tipo: 'insumo' as const, desc: i.fornecedor, valor: i.valor, date: i.date })),
    ...funcionarios.slice(0, 3).map(f => ({ tipo: 'funcionario' as const, desc: f.nome, valor: f.valor, date: f.date })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6)

  const weeklyData: WeekData[] = [1, 2, 3, 4].map(w => {
    const wVendas      = vendas.filter(v => weekOf(v.date) === w)
    const wInsumos     = insumos.filter(i => weekOf(i.date) === w)
    const wFunc        = funcionarios.filter(f => weekOf(f.date) === w)
    const wContas      = contas.filter(c => weekOf(c.date) === w)
    const rec = r2(wVendas.reduce((s, v) => r2(s + v.avista + v.debito + v.credito + v.pix + v.ifood + v.outros - v.taxas), 0))
    const desp = r2(
      wInsumos.reduce((s, i) => r2(s + i.valor), 0) +
      wFunc.reduce((s, f) => r2(s + f.valor), 0) +
      wContas.reduce((s, c) => r2(s + c.valor), 0)
    )
    return { label: `S${w}`, receita: rec, despesas: desp }
  })

  const mesLabel   = format(now, 'MMMM yyyy', { locale: ptBR })
  const isPositive = resultado >= 0

  return (
    <div className="space-y-5">
      {/* Eyebrow mês */}
      <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-mute capitalize">{mesLabel}</p>

      {/* Card resultado */}
      <div className={`rounded-2xl p-5 ${isPositive ? 'bg-emerald-700' : 'bg-accent'}`}>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/60 mb-1">Resultado do mês</p>
        <p className="font-display font-semibold text-[clamp(28px,6vw,38px)] tracking-tight text-white leading-none mb-2">
          {isPositive ? '+' : '–'}&nbsp;R$&nbsp;{fmt(Math.abs(resultado))}
        </p>
        <p className="text-xs text-white/70">
          Receita&nbsp;<span className="font-semibold text-white">R$&nbsp;{fmt(receita)}</span>
          &nbsp;·&nbsp;
          Despesas&nbsp;<span className="font-semibold text-white/80">R$&nbsp;{fmt(despesas)}</span>
        </p>
      </div>

      {/* Status do dia */}
      <div className="flex gap-2">
        {[
          { ok: !!vendaHoje, label: vendaHoje ? 'Venda registrada' : 'Venda pendente' },
          { ok: !!caixaHoje, label: caixaHoje ? 'Caixa fechado' : 'Caixa pendente' },
        ].map(({ ok, label }) => (
          <div key={label} className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium ${
            ok
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200/80 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400'
              : 'bg-amber-50 dark:bg-amber-900/15 border-amber-200/80 dark:border-amber-800/40 text-amber-700 dark:text-amber-400'
          }`}>
            {ok
              ? <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" fill="currentColor" opacity="0.2"/><polyline points="3.5,7 6,9.5 10.5,4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              : <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/><line x1="7" y1="4" x2="7" y2="7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="7" cy="9.5" r="0.75" fill="currentColor"/></svg>
            }
            {label}
          </div>
        ))}
      </div>

      {/* Gráfico semanal */}
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

      {/* Contas pendentes */}
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
                    {c.diaVencimento && (
                      <p className="font-mono text-[10px] text-mute">dia {c.diaVencimento}</p>
                    )}
                  </div>
                </div>
                <p className="text-sm font-semibold text-ink dark:text-gray-100 shrink-0 ml-3">R$ {fmt(c.valor)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Últimos gastos */}
      {recent.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-mute">Gastos Recentes</p>
            <Link href="/gastos" className="text-xs text-accent font-medium hover:underline underline-offset-2">Ver todos →</Link>
          </div>
          <div className="bg-white dark:bg-[#171411] rounded-2xl border border-cream-200 dark:border-white/[0.06] divide-y divide-cream-200 dark:divide-white/[0.04] overflow-hidden shadow-sm">
            {recent.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                    item.tipo === 'insumo'
                      ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                      : 'bg-red-50 dark:bg-red-900/20 text-accent dark:text-red-400'
                  }`}>
                    {item.tipo === 'insumo' ? 'Insumo' : 'Func.'}
                  </span>
                  <p className="text-sm text-ink/80 dark:text-gray-300 truncate">{item.desc}</p>
                </div>
                <p className="text-sm font-semibold text-ink dark:text-gray-100 shrink-0 ml-3">R$ {fmt(item.valor)}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verificar no browser**

`http://localhost:3000` — checar: card de resultado com fundo colorido, gráfico de barras visível, contas e gastos listados corretamente.

- [ ] **Step 3: Commit**

```
git add app/(dashboard)/page.tsx
git commit -m "feat: redesign home page with weekly chart and new tokens"
```

---

## Task 6: Fechamento — Subtotais nas Abas e Redesenho

**Files:**
- Modify: `app/(dashboard)/fechamento/page.tsx`

- [ ] **Step 1: Adicionar `fmtK` helper e subtotais nas tabs**

Adicionar `fmtK` **fora** do componente (sem dependência de estado), logo abaixo de `function fmt`:

```ts
const fmtK = (v: number) =>
  v === 0 ? 'R$0' : v.toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1, style: 'currency', currency: 'BRL' })
```

Remover a constante externa `const TABS`. Dentro do componente, **após** os `const totalFunc`, `totalInsumos`, `totalContas`, `receita`, adicionar:

```ts
const tabs = [
  { key: 'vendas' as Tab,       label: 'Vendas',       sub: fmtK(receita) },
  { key: 'funcionarios' as Tab, label: 'Func.',        sub: fmtK(totalFunc) },
  { key: 'insumos' as Tab,      label: 'Insumos',      sub: fmtK(totalInsumos) },
  { key: 'contas' as Tab,       label: 'Contas',       sub: fmtK(totalContas) },
]
```

Alterar o tab bar para mostrar a sub:

```tsx
<div className="flex bg-cream-100 dark:bg-zinc-900 rounded-xl p-1 gap-1">
  {tabs.map(t => (
    <button key={t.key} onClick={() => setTab(t.key)}
      className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex flex-col items-center gap-0.5 ${
        tab === t.key
          ? 'bg-white dark:bg-zinc-800 text-ink dark:text-gray-100 shadow-sm'
          : 'text-mute dark:text-zinc-500 hover:text-ink dark:hover:text-zinc-300'
      }`}>
      <span>{t.label}</span>
      <span className={`font-mono text-[9px] font-normal ${tab === t.key ? 'text-accent' : 'text-mute dark:text-zinc-600'}`}>{t.sub}</span>
    </button>
  ))}
</div>
```

- [ ] **Step 2: Remover o FAB inline (botão `+` fixo) da página**

Remover o bloco `{/* FAB */}` completo do JSX (linhas com `fixed bottom-[5.5rem]`). O FAB global no DashboardShell já cobre essa função.

- [ ] **Step 3: Atualizar o strip de totais (summary grid)**

Substituir o grid de 2×2 por strip de 4 colunas compacto:

```tsx
<div className="grid grid-cols-4 gap-2">
  {[
    { label: 'Receita', value: receita,   color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Despesas', value: despesas, color: 'text-accent' },
    { label: 'Resultado', value: resultado, color: isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-accent', prefix: isPositive ? '+' : '–' },
    { label: 'Pizzas', value: totalPizzas, color: 'text-ink dark:text-gray-300', isInt: true },
  ].map(s => (
    <div key={s.label} className="bg-white dark:bg-[#171411] rounded-xl border border-cream-200 dark:border-white/[0.06] p-2.5 shadow-sm">
      <p className="font-mono text-[9px] text-mute uppercase tracking-wide mb-1">{s.label}</p>
      <p className={`text-sm font-semibold ${s.color}`}>
        {s.isInt
          ? s.value
          : `${'prefix' in s && s.prefix ? s.prefix : ''}R$ ${fmt(Math.abs(s.value as number))}`
        }
      </p>
    </div>
  ))}
</div>
```

- [ ] **Step 4: Atualizar eyebrows e labels para `font-mono`**

Em todos os `text-[10px] font-semibold uppercase tracking-widest text-gray-400` dentro da página, substituir por `font-mono text-[10px] tracking-[0.14em] uppercase text-mute`.

- [ ] **Step 5: Atualizar botões de editar e excluir para usar `accent`**

Substituir `hover:text-primary hover:bg-primary/5` → `hover:text-accent hover:bg-accent/5` em todos os botões de edição da lista.

Substituir `bg-primary text-white hover:bg-primary-dark` → `bg-accent text-white hover:bg-accent-dark` no botão submit do form.

- [ ] **Step 6: Verificar no browser**

Abrir `/fechamento` — tabs devem mostrar subtotais, strip de totais em 4 colunas, sem FAB duplicado.

- [ ] **Step 7: Commit**

```
git add app/(dashboard)/fechamento/page.tsx
git commit -m "feat: add tab subtotals, redesign fechamento page"
```

---

## Task 7: Caixa — Remover FAB Inline e Redesenho

**Files:**
- Modify: `app/(dashboard)/caixa/page.tsx`

- [ ] **Step 1: Remover o FAB inline**

Remover o bloco `{/* FAB */}` completo (botão `+` fixo). O global FAB no DashboardShell cobre.

- [ ] **Step 2: Atualizar eyebrows e labels**

Substituir `text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-500` → `font-mono text-[10px] tracking-[0.14em] uppercase text-mute`.

- [ ] **Step 3: Atualizar tokens de cor**

Substituir no arquivo inteiro:
- `text-primary` → `text-accent`
- `border-primary` → `border-accent`
- `bg-primary` → `bg-accent`
- `hover:bg-primary-dark` → `hover:bg-accent-dark`
- `ring-primary` → `ring-accent`

- [ ] **Step 4: Atualizar o card de fechamento — tipografia**

No valor grande do fechamento, substituir a classe de fonte:
```tsx
// antes
className="text-4xl font-display font-bold text-gray-900 dark:text-gray-100 mb-5 tracking-tight"
// depois
className="font-display font-semibold text-[clamp(28px,6vw,36px)] tracking-tight text-ink dark:text-gray-100 mb-4 leading-none"
```

- [ ] **Step 5: Verificar no browser**

Abrir `/caixa` — sem FAB duplicado, estilos atualizados.

- [ ] **Step 6: Commit**

```
git add app/(dashboard)/caixa/page.tsx
git commit -m "feat: remove inline FAB, redesign caixa page"
```

---

## Task 8: Gastos — Remover FAB Inline e Redesenho

**Files:**
- Modify: `app/(dashboard)/gastos/page.tsx`

- [ ] **Step 1: Remover o FAB inline**

Remover o bloco `{/* FAB */}` (botão `+` fixo no final do JSX). O global FAB cobre.

- [ ] **Step 2: Atualizar eyebrow do total**

```tsx
// antes
<span className="text-2xl font-display font-bold text-gray-800 dark:text-gray-100">R$ {fmt(total)}</span>
// depois
<span className="font-display font-semibold text-2xl text-ink dark:text-gray-100">R$ {fmt(total)}</span>
```

- [ ] **Step 3: Atualizar pills de filtro**

Substituir a classe do pill ativo de `bg-primary text-white` → `bg-accent text-white`.
Substituir `bg-gray-800 dark:bg-zinc-200 text-white dark:text-zinc-900` → `bg-ink dark:bg-zinc-200 text-white dark:text-zinc-900`.

- [ ] **Step 4: Atualizar badges de tipo**

```tsx
const tipoCls: Record<Tipo, string> = {
  insumo:      'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
  funcionario: 'bg-red-50 dark:bg-red-900/20 text-accent dark:text-red-400',
  conta:       'bg-gray-100 dark:bg-zinc-800 text-mute dark:text-zinc-400',
}
```

Adicionar `font-mono` em todos os badges de tipo:
```tsx
<span className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${tipoCls[e.tipo]}`}>
```

- [ ] **Step 5: Atualizar tokens no form e botão submit**

Substituir `bg-primary` → `bg-accent`, `hover:bg-primary-dark` → `hover:bg-accent-dark`, `ring-primary` → `ring-accent`.

- [ ] **Step 6: Verificar no browser**

Abrir `/gastos` — sem FAB duplicado, filtros e badges com estilos corretos.

- [ ] **Step 7: Commit**

```
git add app/(dashboard)/gastos/page.tsx
git commit -m "feat: remove inline FAB, redesign gastos page"
```

---

## Task 9: Login, Conta e Usuários — Atualização de Estilos

**Files:**
- Modify: `app/(auth)/login/page.tsx`
- Modify: `app/(dashboard)/conta/page.tsx`
- Modify: `app/(dashboard)/usuarios/page.tsx`

- [ ] **Step 1: Atualizar `app/(auth)/login/page.tsx`**

Substituições globais no arquivo:
- `font-display text-[28px] font-bold` → `font-display font-semibold text-[28px]`
- `font-display italic` → `font-mono text-[11px] tracking-[0.14em] uppercase`
- `bg-primary text-white hover:bg-primary-dark` → `bg-accent text-white hover:bg-accent-dark`
- `ring-primary/30 focus:border-primary/60` → `ring-accent/30 focus:border-accent/60`
- O subtítulo "Pizzaria · Gestão" atualizar para:
  ```tsx
  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-mute mt-1.5">Pizzaria · Gestão</p>
  ```

- [ ] **Step 2: Atualizar `app/(dashboard)/conta/page.tsx`**

Substituições globais:
- `text-xl font-display font-semibold` → `font-display font-semibold text-xl`
- `text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500` → `font-mono text-[10px] tracking-[0.14em] uppercase text-mute`
- `bg-primary/10 dark:bg-primary/15 ... text-primary` → `bg-accent/10 dark:bg-accent/15 ... text-accent`
- `bg-primary text-white hover:bg-primary-dark` → `bg-accent text-white hover:bg-accent-dark`
- `ring-primary` → `ring-accent`

- [ ] **Step 3: Atualizar `app/(dashboard)/usuarios/page.tsx`**

Ler o arquivo e aplicar as mesmas substituições:
- `text-primary` → `text-accent`
- `bg-primary` → `bg-accent`
- `hover:bg-primary-dark` → `hover:bg-accent-dark`
- `ring-primary` → `ring-accent`
- Labels uppercase: adicionar `font-mono` e `tracking-[0.14em]`

- [ ] **Step 4: Verificar compilação final**

```
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 5: Teste visual completo**

```
npm run dev
```

Verificar todas as rotas:
- `/login` — logo, formulário, botão
- `/` — home com gráfico
- `/caixa` — sem FAB duplicado
- `/fechamento` — tabs com subtotais
- `/gastos` — filtros e badges
- `/conta` — formulário de senha
- FAB `+` abre modal em qualquer página com os 5 tipos (incluindo Caixa)
- Dark mode: toggle funciona em todas as telas

- [ ] **Step 6: Commit final**

```
git add app/(auth)/login/page.tsx app/(dashboard)/conta/page.tsx app/(dashboard)/usuarios/page.tsx
git commit -m "feat: update login, conta, usuarios to new design tokens"
```

---

## Checklist de Verificação Final

- [ ] Fontes Geist + Bricolage Grotesque + Geist Mono carregam (inspecionar Network no browser)
- [ ] FAB `+` abre tipo-selector com 5 opções em TODAS as abas
- [ ] Tipo "Caixa" no FAB pré-preenche saldo inicial com último fechamento
- [ ] Fechamento: tabs mostram subtotais abreviados (ex: `R$12,4k`)
- [ ] Gráfico semanal aparece na home com barras de receita (verde) e despesas (vermelho)
- [ ] Dark mode funciona em todas as telas
- [ ] Mobile: bottom nav tem 4 itens (Hoje · Caixa · Mês · Gastos)
- [ ] FAB fica acima do bottom nav no mobile (`bottom-[5.5rem]`)
- [ ] `npx tsc --noEmit` passa sem erros

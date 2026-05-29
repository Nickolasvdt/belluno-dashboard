# UX Redesign — Registros, Caixa, Mês Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reformular completamente a UX das telas Registros, Caixa e Mês — melhorando disposição, hierarquia visual, usabilidade e experiência — eliminando a duplicidade entre Registros e Mês.

**Architecture:** Absorver a página /gastos (Registros) dentro de /fechamento como uma nova aba "Feed" (lista cronológica unificada). BottomNav simplifica de 4 para 3 tabs: Hoje | Caixa | Mês. Caixa e Mês recebem redesign completo.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, date-fns, design system Belluno (DM Sans + Playfair Display, palette cream/wine/emerald)

---

## Files

| Arquivo | Ação |
|---|---|
| `app/(dashboard)/fechamento/page.tsx` | Rewrite — adicionar tab Feed + redesign completo |
| `app/(dashboard)/caixa/page.tsx` | Rewrite — redesign completo |
| `app/(dashboard)/gastos/page.tsx` | Redirect → /fechamento |
| `components/BottomNav.tsx` | Remove aba Gastos (3 tabs: Hoje, Caixa, Mês) |
| `components/DashboardShell.tsx` | Remove /gastos do sidebar |
| `app/(dashboard)/page.tsx` | Atualizar link "Ver todos" de /gastos → /fechamento |

---

## CHECKPOINT 1 — Navegação

### Task 1: Simplificar BottomNav para 3 tabs

**Files:** `components/BottomNav.tsx`

- [ ] Remover IconGastos e a aba `{ href: '/gastos', label: 'Gastos', Icon: IconGastos }` do `adminTabs`
- [ ] Resultado: adminTabs = [Hoje, Caixa, Mês] (3 tabs)

### Task 2: Remover /gastos do sidebar

**Files:** `components/DashboardShell.tsx`

- [ ] Remover o navItem `{ href: '/gastos', ... }` do array `navItems`

### Task 3: Redirecionar /gastos

**Files:** `app/(dashboard)/gastos/page.tsx`

- [ ] Substituir conteúdo por `import { redirect } from 'next/navigation'; export default function() { redirect('/fechamento') }`

### Task 4: Atualizar links na Hoje page

**Files:** `app/(dashboard)/page.tsx`

- [ ] Mudar `href="/gastos"` para `href="/fechamento"` no link "Ver todos" de Gastos Recentes

---

## CHECKPOINT 2 — Caixa redesign

### Task 5: Redesign completo da página Caixa

**Files:** `app/(dashboard)/caixa/page.tsx`

**Conceito:**
- Hero card: número grande do fechamento, badges coloridos para entradas/saídas, botão editar no top-right
- Histórico: cada linha tem data proeminente + fechamento à direita + bar de entradas/saídas em baixo
- Empty state: card tracejado com CTA claro

---

## CHECKPOINT 3 — Mês redesign + Feed tab

### Task 6: Redesign completo do Mês + nova aba Feed

**Files:** `app/(dashboard)/fechamento/page.tsx`

**Conceito:**
- 5 tabs: Feed | Vendas | Func. | Insumos | Contas
- Feed tab: lista cronológica de insumos+funcionários+contas do mês, com filtro de categoria (Todos/Insumo/Func./Conta), período (Todos/Hoje/Semana), suporta CRUD
- Summary card: resultado grande + 3 stats (receita, despesas, pizzas)
- Tab bar: scrollable horizontal com valor total por tab
- Cada tab com melhor hierarquia visual

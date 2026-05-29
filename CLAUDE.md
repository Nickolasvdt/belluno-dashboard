# Belluno Pizzaria — Dashboard

## Stack
Next.js 14 · TypeScript · Prisma · PostgreSQL (prod) / SQLite (dev) · NextAuth · Tailwind CSS · Mobile-first

## Roles
- **ADMIN** — acesso total a todas as telas
- **CAIXA** — acesso apenas a `/caixa` e `/conta`

## Rotas
| Rota | Componente | Acesso |
|---|---|---|
| `/` | Hoje — overview mensal: hero resultado, status venda/caixa, gráfico semanas, contas pendentes | ADMIN |
| `/caixa` | Caixa — fechamento diário de caixa | ADMIN + CAIXA |
| `/fechamento` | Mês — fechamento mensal com 5 abas | ADMIN |
| `/usuarios` | Gestão de usuários | ADMIN |
| `/conta` | Trocar senha | ADMIN + CAIXA |
| `/gastos` | Redireciona → `/fechamento` (rota antiga de Registros) | — |

## Design System
- **Fontes:** DM Sans (body via `--font-dm-sans`) + Playfair Display (headings via `--font-display`)
  - Tailwind: `font-sans` → DM Sans, `font-display` → Playfair
- **Paleta:**
  - `accent` / `primary`: `#8B2020` (vinho)
  - `cream-200`: `#ede8df` (bordas/divisores)
  - `cream-100`: `#fdf9ef` (chips/fundo)
  - Page bg light: `#faf9f6` · dark: `#0e0c0a`
  - Card dark: `#171411` · Sidebar dark: `#120f0c`
- **Card padrão:** `bg-white dark:bg-[#171411] rounded-2xl border border-cream-200 dark:border-white/[0.06] shadow-sm`
- **Input padrão:** `w-full px-3.5 py-2.5 border border-cream-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl text-sm focus:ring-1 focus:ring-accent/30`
- **Hero card** (resultado): `rounded-2xl p-5` verde (`bg-emerald-700`) ou vermelho (`bg-accent`) dependendo do sinal
- **BottomNav ativo:** barra `w-5 h-[2px] bg-accent` no topo + `text-accent`
- **FAB:** `bottom-[5.5rem] right-4 md:bottom-6 md:right-6 · bg-accent rounded-full`
- **Animações:** `.animate-slide-up` (page transition) · `.animate-fade-in` · `.animate-scale-in` (modais)

## Cálculo financeiro (IMPORTANTE)
```
Receita Líquida = (avista + debito + credito + pix + ifood + outros) − taxas
Despesas = Funcionários + Insumos + TODAS Contas (pagas + pendentes — regime de competência)
Resultado = Receita Líquida − Despesas
```
**Nunca filtrar contas apenas para pagas nos totais** — o sistema usa contabilidade por competência (accrual).

## Estrutura de dados
- **Venda:** date, avista, debito, credito, pix, ifood, outros, taxas, pizzas, observacao
- **Funcionario:** date, nome, semana, valor
- **Insumo:** date, fornecedor, valor
- **ContaFixa:** date, despesa, valor, pago (bool), diaVencimento
- **CashFlow:** date, saldoInicial, entradas, saidas, fechamento, diferenca, observacao

## Página Hoje (`/`)
- Hero card com resultado do mês (verde/vermelho)
- 2 badges de status: "Venda registrada/pendente" + "Caixa fechado/pendente"
- Gráfico de barras semanal (receita vs despesas por semana do mês) — componente `WeeklyBarChart`
- Lista de contas pendentes (até 5, ordenadas por diaVencimento) com link → `/fechamento`

## Página Caixa (`/caixa`)
- Hero card do fechamento de hoje: data, número grande, row de stats (Inicial / +Entradas / −Saídas)
- Mostra diferença e observação se preenchidos
- Botão "Registrar hoje" no header quando não há registro do dia
- Histórico: data + entradas/saídas coloridas + valor fechamento + edit/delete
- Form em BottomSheet: Data · Saldo Inicial · Entradas · Saídas · [Fechamento calculado] · Diferença · Observação

## Página Mês (`/fechamento`)
**5 abas scrolláveis:** Feed · Vendas · Func. · Insumos · Contas

- **Navegação de mês:** setas ← → com mês/ano centralizado
- **Hero resultado:** card verde/vermelho com resultado + "Receita R$ X · Despesas R$ X · N pizzas"
- **Barra de abas:** cada aba mostra label + subtotal (fmtK format: R$ 2,5k)
  - Feed mostra contagem de registros do mês
- **Aba Feed:** lista cronológica unificada (insumos + funcionários + contas). Filtro de categoria: Todos / Insumo / Func. / Conta. Edição e exclusão inline.
- **Aba Vendas:** data + dia semana + qtd pizzas · valor líquido. Linha secundária só aparece se taxas > 0.
- **Aba Funcionários:** nome + data/semana · valor
- **Aba Insumos:** fornecedor + data · valor
- **Aba Contas:** checkbox pago (toggle direto) + despesa + vencimento · valor. Item riscado quando pago.

## Navegação (BottomNav — mobile)
ADMIN: **Hoje | Caixa | Mês**
CAIXA: **Caixa | Conta**
Desktop: sidebar com mesmos itens

## QuickAddFAB
Botão `+` fixo que abre BottomSheet com 5 categorias: Venda · Insumo · Funcionário · Conta · Caixa. Após salvar, faz `router.refresh()`.

## Componentes compartilhados
- `BottomSheet` — modal deslizante (mobile: bottom, desktop: centered max-w-[480px])
- `CurrencyInput` — input de valor monetário em R$
- `WeeklyBarChart` — gráfico SVG de barras agrupadas (receita vs despesas por semana)
- `DashboardShell` — layout: sidebar desktop + header mobile + BottomNav + FAB
- `BottomNav` — navegação inferior mobile

## Deploy
- **Produção:** Vercel (auto-deploy no push para `master`)
- **Banco prod:** PostgreSQL Vercel
- **Banco dev:** SQLite (`prisma/schema.prisma` — trocar provider para `postgresql` antes de deploy)

## O que foi feito na última sessão (2026-05-28)
1. **Nav simplificada:** BottomNav passou de 4 abas para 3 (removida aba "Gastos/Registros")
2. **`/gastos` removido:** página agora redireciona para `/fechamento`
3. **Caixa redesenhado:** hero card com número grande + stats row coloridos + histórico limpo
4. **Mês redesenhado:** hero card de resultado + 5 abas scrolláveis + aba Feed (absorveu Registros)
5. **Hoje simplificado:** removida seção "Gastos Recentes" (duplicação com Feed) e rótulo de mês
6. **Cortes de ruído visual:** sem ícones nas abas, sem tendência vs ontem no Caixa, sem barra pago/pendente nas Contas, sem filtro de período no Feed, sem rodapés de total/contagem redundantes
7. **`scrollbar-hide` adicionado ao globals.css** para tab bar horizontal sem scrollbar visível

## Próximos pontos em aberto
- Revisar experiência do QuickAddFAB para manter consistência com novo design
- Validar comportamento em mobile real (iOS safe-area-inset)

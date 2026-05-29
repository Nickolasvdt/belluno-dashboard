# Belluno Dashboard — Redesign Completo (A + C Light)

**Data:** 2026-05-27  
**Stack:** Next.js 15 · TypeScript · Tailwind CSS · Prisma (PostgreSQL) · NextAuth

---

## Objetivo

Redesenhar completamente a interface do painel de gestão da Belluno Pizzaria, mantendo toda a funcionalidade existente e adicionando o que falta das planilhas. O foco é: **leve, rotineiro, compacto, objetivo** — máxima usabilidade no celular com entrada de dados fácil de qualquer tela.

---

## Fundação Visual

### Fontes

Trocar DM Sans + Playfair Display pelo sistema novo:

| Variável CSS | Fonte | Pesos | Uso |
|---|---|---|---|
| `--font-display` | Bricolage Grotesque | 400, 600, 700 | Valores grandes, resultado, títulos |
| `--font-sans` | Geist | 400, 500, 600 | Corpo, botões, listas, nav |
| `--font-mono` | Geist Mono | 400, 500 | Eyebrows, badges, labels de categoria, datas |

Instalação: `next/font/google` no `app/layout.tsx`.

### Tokens de Cor (Tailwind `theme.extend.colors`)

```
bg:      #FAF9F6   fundo base (creme quente)
surface: #FFFFFF   cards, sheets, modais
ink:     #1C1917   texto principal
mute:    #78716C   subtextos, labels
accent:  #8B2020   vermelho da marca
accent-dark: #6B1515  hover/pressed
border:  rgba(28,25,23,0.08)  divisores
```

Regras:
- Fundos de seção: `bg`
- Cards e surfaces: `surface` com `border` hairline
- Hero result card: fundo `ink` quando negativo, `emerald-700` quando positivo
- Sem gradientes decorativos
- Dark mode: mantido (`darkMode: 'class'`)

### Escala Tipográfica Aplicada

- **Resultado do mês (display):** `font-display font-semibold text-[clamp(28px,5vw,40px)] tracking-tight`
- **H2 de seção:** `font-display font-semibold text-base tracking-tight`
- **Valor de card:** `font-display font-semibold text-lg`
- **Eyebrow:** `font-mono text-[10px] tracking-[0.16em] uppercase text-mute`
- **Parágrafo/lista:** `font-sans text-sm text-ink`
- **Sublabel/meta:** `font-mono text-[10px] text-mute`
- **Botão primário:** `font-sans text-sm font-medium`

---

## Arquitetura de Telas

### Rotas (sem mudança)

```
/              → Hoje (home)
/fechamento    → Fechamento do Mês
/caixa         → Controle de Caixa
/gastos        → Registros de Gastos
/usuarios      → Gestão de Usuários (ADMIN)
/conta         → Conta do usuário
/login         → Autenticação
```

### Navegação Mobile (BottomNav)

4 itens para ADMIN:
```
[ Hoje ] [ Caixa ] [ Mês ] [ Gastos ]
```
- Conta: acessível via avatar (iniciais) no header mobile
- Usuários: acessível via sidebar desktop e via link em `/conta`

### Navegação Desktop (Sidebar)

Mantém estrutura atual. Atualiza apenas tipografia e tokens de cor.  
Largura: 200px. Itens: Hoje, Registros, Caixa, Mês, Usuários, Conta.

---

## Componente: GlobalAddModal

### Comportamento

- FAB `+` fixo em todas as rotas:
  - Mobile: `fixed bottom-[5.5rem] right-4`
  - Desktop: `fixed bottom-6 right-6`
  - Estilo: `w-14 h-14 bg-accent text-white rounded-full shadow-lg`
- Abre modal em 2 passos:

**Passo 1 — Seleção de tipo** (grid 2×2 + 1 centrado):
```
[ Venda ]      [ Insumo ]
[ Funcionário ] [ Conta ]
      [ Caixa ]
```
Cada opção: ícone + label. Toque seleciona e avança.

**Passo 2 — Formulário**
Carrega o formulário do tipo selecionado. Botão Voltar retorna ao Passo 1.

- Mobile: bottom sheet (desliza de baixo)
- Desktop: modal centralizado com overlay

### Estado

Contexto React: `GlobalModalContext` em `context/GlobalModalContext.tsx`
- `open: boolean`
- `step: 'select' | 'form'`
- `tipo: 'venda' | 'insumo' | 'funcionario' | 'conta' | 'caixa' | null`
- `openModal(tipo?)` — abre direto num tipo ou na seleção
- `closeModal()`

Após submit: chama `router.refresh()` para atualizar dados da página atual.

### Formulários por tipo

Todos os campos existentes são mantidos. Nenhum campo removido.

**Venda:** data, à vista, débito, crédito, PIX (Tuna), iFood, 99Food/Keeta, taxas, pizzas, observação. Preview bruto/líquido calculado em tempo real.

**Insumo:** data, fornecedor, valor.

**Funcionário:** data, nome, valor, semana.

**Conta:** data, despesa, valor, dia de vencimento, pago (checkbox).

**Caixa:** data, saldo inicial, entradas, saídas. Fechamento calculado em tempo real. Diferença (opcional), observação.

---

## Tela: Hoje (/)

### Layout (top → bottom)

```
[eyebrow mono]  MAIO 2026

[Hero result]
  Resultado do mês
  +R$ 4.820,00           ← display grande, cor condicional
  Receita R$ 12.400  ·  Despesas R$ 7.580  ← linha compacta muted

[Status row]  2 pills lado a lado
  ✓ Venda registrada    ✓ Caixa fechado   (ou ⚠ pendente)

[Gráfico semanal]  altura ~88px
  Barras agrupadas por semana: receita (accent/20) vs despesas (accent)
  4 semanas do mês atual. Sem eixos poluídos, apenas valores no hover.

[Seção CONTAS PENDENTES]  + link "Ver todas →"
  Lista slim: nome · dia vencimento · valor
  Máximo 5 itens. Se nenhuma, seção oculta.

[Seção ÚLTIMOS GASTOS]  + link "Ver todos →"
  Lista slim: badge tipo · descrição · valor · data
  Máximo 6 itens.
```

### Dados

Todos os dados já existem na página. Adicionar: dados semanais para o gráfico (agrupar `vendas` e `despesas` por semana do mês via `startOfWeek`/`endOfWeek`).

**Biblioteca de gráfico:** Recharts `^2.12.7` (já instalado). Usar `BarChart` responsivo com `ResponsiveContainer`.

---

## Tela: Fechamento (/fechamento)

### Layout

```
← Maio 2026 →           ← navegação de mês

[Strip de totais — 4 colunas]
Receita Líq.  Despesas  Resultado  Pizzas
R$ 12.400     R$ 7.580  +R$ 4.820   312

[Tab bar — 4 abas com subtotal]
[Vendas R$12.4k] [Func. R$2.1k] [Insumos R$3.2k] [Contas R$2.3k]

[Lista por aba]
── cada item numa linha limpa ──
```

### Subtotal nas abas

Formato: nome + valor abreviado (`.toLocaleString` com `notation: 'compact'`).  
Ex: `Vendas R$12,4k` · `Func. R$2,1k`

### Contas — comportamento especial

- Checkbox para marcar pago/pendente (toggle inline, sem modal)
- Itens pagos: texto riscado + muted
- Ordenados por dia de vencimento

### Todos os campos existentes mantidos

Venda: avista/débito/crédito/PIX/iFood/outros/taxas/pizzas/obs  
Funcionário: nome/semana/valor  
Insumo: fornecedor/valor  
Conta: despesa/valor/pago/diaVencimento

---

## Tela: Caixa (/caixa)

### Layout

```
[Header]  HOJE, 05 DE JUNHO
          + botão Editar (se já existe registro)

[Card fechamento]
  Fechamento
  R$ 1.840,00   ← display grande

  Inicial    +Entradas   −Saídas
  R$1.200    R$890       R$250

  [se houver] Diferença: +R$ 10
  [se houver] Obs: texto

[Se não há registro hoje]
  Card dashed border: "Sem registro para hoje" + botão "Registrar agora"

[Histórico]  últimos 20 registros
  Data  ·  +entradas  ·  −saídas  ·  fechamento  ✏ ✕
```

### Notas

- Saldo inicial do novo registro pré-preenchido com `fechamento` do último registro
- Role CAIXA: vê apenas esta tela e `/conta`

---

## Tela: Gastos — Registros (/gastos)

### Layout

```
[Filtros de período]  pills
  Hoje · Esta semana · Sem. passada · Este mês

[Filtros de categoria]  pills
  Todos · Insumo · Funcionário · Conta

[Total + count]
  R$ 7.580 · 24 registros

[Lista]
  [badge] Descrição              R$ valor   data/meta
                              ✏ ✕
```

### Badge de tipo

- Insumo: `bg-amber-50 text-amber-700`
- Funcionário: `bg-red-50 text-accent`
- Conta: `bg-gray-100 text-mute`

---

## Tela: Usuários (/usuarios) e Conta (/conta)

Mantém funcionalidade existente. Atualiza apenas estilos (tokens, tipografia).

---

## Tela: Login (/login)

Mantém funcionalidade. Redesenha para aplicar novos tokens e tipografia. Logo + form centralizado.

---

## Componentes Reutilizáveis

| Componente | Descrição |
|---|---|
| `GlobalAddModal` | Modal/sheet global de adição, Passo 1 + Passo 2 |
| `QuickAddFAB` | Botão + fixo que abre GlobalAddModal |
| `DashboardShell` | Shell com sidebar + header mobile + BottomNav |
| `BottomNav` | Nav bottom mobile (4 itens ADMIN, 2 CAIXA) |
| `BottomSheet` | Sheet que desliza de baixo (mobile) |
| `CurrencyInput` | Input formatado em R$ |
| `WeeklyBarChart` | Gráfico de barras semanal (Recharts) — novo |

---

## Animações

- Entrada de tela: `animate-slide-up` (já existente)
- Modal abre: `y: 40 → 0, opacity: 0 → 1, duration: 220ms`
- Tabs: transição `200ms ease-out`
- Pills de filtro: `150ms`
- Sem animações desnecessárias

---

## Responsividade

- Mobile: padding `px-4 pt-5`, bottom nav, bottom sheet, FAB acima do nav
- Desktop (`md:`): sidebar 200px, conteúdo centralizado `max-w-2xl mx-auto`, FAB `bottom-6 right-6`, modal centralizado com overlay
- Breakpoint único: `md` (768px)
- Safe area: `env(safe-area-inset-bottom)` no bottom nav e no padding do main

---

## Fora do Escopo

- Relatórios PDF ou exportação
- Notificações push
- Multi-unidade (mais de uma pizzaria)
- Histórico de alterações

# Belluno Pizzaria — Feature Design
**Data:** 2026-06-03  
**Status:** Aprovado

---

## Escopo

Seis mudanças interligadas no dashboard Belluno Pizzaria:

1. **Fusão Hoje + Caixa** — a rota `/caixa` é eliminada; a aba Hoje passa a ser o hub diário
2. **Fechamento do Dia** — novo registro diário de vendas por canal (À Vista / iFood / 99food / Keeta / Extra) + pizzas
3. **Colaboradores** — catálogo de funcionários cadastrados; formulários de funcionário viram `<select>`
4. **Aba Semana** — nova rota `/semana` com vendas por canal e custo por funcionário, tudo dividido pelas 4 semanas do mês
5. **Filtro por funcionário** — filtro na aba Func. da página Mês
6. **Schema** — dois novos modelos: `FechamentoDia` e `Colaborador`

---

## 1. Navegação e Roles

### Nav ADMIN
```
Hoje  |  Mês  |  Semana
```

### Nav CAIXA
```
Hoje  |  Conta
```

A rota `/caixa` é removida. A página `/` renderiza condicionalmente com base em `session.role`:
- **ADMIN** → versão completa (4 blocos descritos abaixo)
- **CAIXA** → versão simplificada: hero card do caixa de hoje (se registrado) + botão "Registrar hoje" / "Editar" + histórico dos últimos 30 dias. Mesmo comportamento da antiga `/caixa`, sem as seções de vendas/resultado/gráfico.

O BottomNav e a sidebar são atualizados para refletir essa navegação.

---

## 2. Aba Hoje — Versão ADMIN

Quatro blocos empilhados, nesta ordem:

### Bloco 1 — Fechamento do Dia (novo)

Card com header mostrando a data de hoje.

**Estado vazio (sem fechamento registrado):**
- Formulário inline (não BottomSheet) com:
  - 4 `CurrencyInput`: À Vista, iFood, 99food, Keeta
  - 1 `CurrencyInput`: Extra (começa zerado; para vendas fora dos canais principais)
  - 1 `<input type="number">`: Pizzas
  - Preview calculado em tempo real: **Total do Dia = À Vista + iFood + 99food + Keeta + Extra**
  - Botão "Salvar Fechamento"

**Estado preenchido (fechamento já registrado):**
- Exibe os valores em modo leitura (grid de canais + total + pizzas)
- Botão "Editar" no header do card abre o form novamente com valores preenchidos

### Bloco 2 — Caixa do Dia (migrado de /caixa)

Card compacto abaixo do Bloco 1.

**Sem registro:** botão "Registrar Caixa" → abre BottomSheet com form atual do caixa (Saldo Inicial / Entradas / Saídas / Fechamento calculado / Observação).

**Com registro:** exibe card atual (Inicial · +Entradas · −Saídas · Fechamento) + botão "Editar" que reabre o BottomSheet.

### Bloco 3 — Resultado do Mês

Hero card verde/vermelho existente (resultado + receita + despesas + pizzas do mês). Sem alterações de comportamento.

### Bloco 4 — Contas Pendentes + Gráfico

Lista de contas pendentes (até 5, ordenadas por diaVencimento) + WeeklyBarChart. Sem alterações.

---

## 3. Schema — Novos Modelos

### FechamentoDia

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
```

- `date` é único: um fechamento por dia
- `noventa9` armazena o valor do canal 99food

### Colaborador

```prisma
model Colaborador {
  id        Int      @id @default(autoincrement())
  nome      String   @unique
  ativo     Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

- Não tem login, senha ou role — é apenas um catálogo de nomes
- `ativo: false` desativa da lista de seleção mas preserva histórico

---

## 4. Cálculo Mensal — Impacto do FechamentoDia

```
Receita Mensal = Σ Venda (registros individuais do mês)
              + Σ FechamentoDia (fechamentos diários do mês)

Pizzas do Mês  = Σ Venda.pizzas + Σ FechamentoDia.pizzas
```

Não há dupla contagem por design: o usuário decide o que registra como venda individual versus fechamento diário. As APIs de `/api/fechamento/vendas` precisam incluir os dados de `FechamentoDia` no total mensal.

### Breakdown por canal (para Aba Semana e panorama geral)

```
totalAvista  = Σ Venda.avista  + Σ FechamentoDia.avista
totalIfood   = Σ Venda.ifood   + Σ FechamentoDia.ifood
totalNoventa9 =                  Σ FechamentoDia.noventa9
totalKeeta   =                   Σ FechamentoDia.keeta
totalExtra   =                   Σ FechamentoDia.extra
totalDebito  = Σ Venda.debito
totalCredito = Σ Venda.credito
totalPix     = Σ Venda.pix
totalOutros  = Σ Venda.outros
```

---

## 5. Colaboradores — Aba Usuários

A página `/usuarios` ganha uma segunda seção abaixo da tabela de usuários do sistema.

### Layout

```
USUÁRIOS DO SISTEMA
  [tabela existente]

──────────────────────────

COLABORADORES               [+ Adicionar]
  João Silva      ● Ativo   [Desativar]
  Maria Souza     ● Ativo   [Desativar]
  Pedro Lima      ○ Inativo [Reativar]
```

### Comportamento

- "+ Adicionar" abre BottomSheet com campo Nome (obrigatório, único)
- "Desativar" / "Reativar" faz toggle em `ativo` sem deletar o registro
- Colaboradores inativos aparecem acinzentados na lista
- Colaboradores inativos **não aparecem** no `<select>` dos formulários de funcionário

### Impacto nos formulários de Funcionário

Nos três lugares onde se digita o nome do funcionário:
1. **QuickAddFAB** (categoria "Funcionário")
2. **Aba Mês → Func.** (form de novo/editar funcionário)
3. **Aba Mês → Feed** (edição de funcionário)

O `<input type="text" name="nome">` é substituído por:

```tsx
<select>
  <option value="">Selecionar funcionário...</option>
  {colaboradores.map(c => (
    <option key={c.id} value={c.nome}>{c.nome}</option>
  ))}
</select>
```

Os colaboradores são carregados via `GET /api/colaboradores` (retorna apenas `ativo: true`).  
O valor salvo no modelo `Funcionario.nome` continua sendo a string do nome (sem foreign key obrigatória), preservando histórico de registros antigos.

---

## 6. Aba Semana — Rota /semana

Acessível apenas para ADMIN. Adicionada ao nav.

### Navegação

Setas ← → para navegar entre meses (igual à aba Mês). Exibe o mês/ano centralizado.

### Card: Vendas por Semana

Tabela com canais nas linhas e semanas nas colunas:

| Canal     | Sem 1 | Sem 2 | Sem 3 | Sem 4 |
|-----------|-------|-------|-------|-------|
| À Vista   | ...   | ...   | ...   | ...   |
| iFood     | ...   | ...   | ...   | ...   |
| 99food    | ...   | ...   | ...   | ...   |
| Keeta     | ...   | ...   | ...   | ...   |
| Extra     | ...   | ...   | ...   | ...   |
| **Total** | ...   | ...   | ...   | ...   |

Fonte dos dados: `FechamentoDia` (principal) + `Venda` (registros individuais, somados por canal).

**Definição de semana por data:**
- Semana 1: dias 1–7
- Semana 2: dias 8–14
- Semana 3: dias 15–21
- Semana 4: dias 22–fim do mês

### Card: Custo de Funcionários por Semana

Tabela com funcionários nas linhas e semanas nas colunas. A semana é determinada pelo campo `semana` do modelo `Funcionario` (ex: "Semana 1"). Registros sem campo `semana` preenchido usam a data para calcular a semana. O mapeamento de texto para número segue o padrão: "Semana 1" → Sem 1, "Semana 2" → Sem 2, etc. (case-insensitive, trim). Valores não reconhecidos são agrupados em "Outros".

| Funcionário | Sem 1 | Sem 2 | Sem 3 | Sem 4 |
|-------------|-------|-------|-------|-------|
| João Silva  | ...   | ...   | ...   | ...   |
| Maria Souza | ...   | ...   | ...   | ...   |
| **Total**   | ...   | ...   | ...   | ...   |

Scroll horizontal no mobile em ambas as tabelas.

---

## 7. Filtro por Funcionário — Aba Mês

Na aba **Func.** da página `/fechamento`, acima da lista de registros:

```
Filtrar: [ Todos ▾ ]
```

- Dropdown com "Todos" + nomes distintos dos funcionários registrados no mês
- Filtra os registros exibidos pelo nome selecionado
- Mostra subtotal dos registros filtrados abaixo da lista
- O filtro é local (client-side, sem nova chamada de API)

---

## 8. APIs Necessárias

| Método | Rota                              | Descrição                                    |
|--------|-----------------------------------|----------------------------------------------|
| GET    | `/api/fechamento-dia`             | Busca fechamento do dia (query: `date`)       |
| POST   | `/api/fechamento-dia`             | Cria fechamento do dia                        |
| PUT    | `/api/fechamento-dia/[id]`        | Atualiza fechamento do dia                    |
| GET    | `/api/colaboradores`              | Lista colaboradores (query: `ativo`)          |
| POST   | `/api/colaboradores`              | Cria colaborador                              |
| PUT    | `/api/colaboradores/[id]`         | Atualiza colaborador (toggle ativo/inativo)   |
| GET    | `/api/semana`                     | Dados da aba Semana (query: `mes`, `ano`)     |
| GET    | `/api/fechamento/vendas` (update) | Incluir FechamentoDia no total mensal         |
| GET    | `/api/hoje`                       | Dados da aba Hoje ADMIN (query: `mes`, `ano`, `date`). Retorna: resultado do mês (`receita`, `despesas`, `resultado`, `pizzas`), fechamento do dia (`FechamentoDia` da data informada ou `null`), caixa do dia (`CashFlow` da data informada ou `null`), contas pendentes (até 5) |

---

## 9. Checkpoints de Implementação

Para permitir retomada exata em caso de interrupção, a implementação segue estes checkpoints em ordem:

| # | Checkpoint | Entregável verificável |
|---|------------|------------------------|
| CP-01 | Migração do schema (FechamentoDia + Colaborador) | `prisma migrate dev` roda sem erro |
| CP-02 | APIs de FechamentoDia (GET/POST/PUT) | Postman/curl retorna 200 |
| CP-03 | APIs de Colaboradores (GET/POST/PUT) | Postman/curl retorna 200 |
| CP-04 | Aba Usuários — seção Colaboradores | CRUD de colaboradores funcional na UI |
| CP-05 | Formulários de funcionário → `<select>` | Select populado com colaboradores ativos |
| CP-06 | Aba Hoje ADMIN — Bloco 1 (Fechamento do Dia) | Salvar/editar fechamento do dia funciona |
| CP-07 | Aba Hoje ADMIN — Bloco 2 (Caixa integrado) | Registrar/editar caixa via BottomSheet funciona |
| CP-08 | Remoção da rota /caixa + nav atualizado | `/caixa` retorna 404; nav correto por role |
| CP-09 | Aba Hoje CAIXA — versão simplificada | Role CAIXA vê apenas form de caixa |
| CP-10 | Cálculo mensal inclui FechamentoDia | Hero card do Mês reflete ambos os modelos |
| CP-11 | API /api/semana | Retorna dados por canal e por funcionário por semana |
| CP-12 | Página /semana — tabela de vendas | Tabela renderizada corretamente |
| CP-13 | Página /semana — tabela de funcionários | Tabela renderizada corretamente |
| CP-14 | Filtro por funcionário na aba Mês | Filtro funcional client-side |

---

## 10. O que NÃO muda

- Modelo `Venda` (registros individuais) — sem alteração de campos
- Modelo `Funcionario` (transações) — `nome` continua sendo string, sem FK obrigatória
- Modelo `CashFlow` — sem alteração
- Lógica de contabilidade por competência nas Contas — sem alteração
- Aba Feed, Insumos, Contas na página Mês — sem alteração
- Role ADMIN continua tendo acesso a todas as telas

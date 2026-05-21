# 🍕 Pizzaria Dashboard

Sistema de gestão para pizzaria com controle de caixa, desenvolvido com Next.js 14 e Prisma.

## 🚀 Tecnologias

- **Next.js 14** (App Router)
- **TypeScript**
- **Prisma ORM**
- **SQLite** (local) / **PostgreSQL** (produção)
- **Tailwind CSS**
- **Recharts** (gráficos)

## 📦 Instalação e Configuração

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar banco de dados

O projeto está configurado para usar SQLite localmente (arquivo `prisma/dev.db`).

Execute os comandos do Prisma:

```bash
# Criar o banco de dados e as tabelas
npm run db:push

# Gerar o Prisma Client
npm run db:generate
```

### 3. Rodar o projeto localmente

```bash
npm run dev
```

Acesse: http://localhost:3000

## 🌐 Deploy na Vercel

### Passo 1: Criar conta na Vercel
- Acesse https://vercel.com
- Faça login com GitHub

### Passo 2: Configurar Postgres na Vercel
1. No dashboard da Vercel, vá em **Storage** → **Create Database**
2. Escolha **Postgres**
3. Escolha a região mais próxima (São Paulo - South America)
4. Clique em **Create**

### Passo 3: Conectar o banco ao projeto
Após criar o banco, a Vercel vai gerar automaticamente as variáveis de ambiente.

**Você NÃO precisa copiar manualmente!** A Vercel conecta automaticamente.

### Passo 4: Fazer Deploy
1. Push seu código para o GitHub
2. Na Vercel, clique em **Import Project**
3. Selecione seu repositório
4. A Vercel detecta automaticamente que é Next.js
5. Clique em **Deploy**

### Passo 5: Configurar o Prisma na Vercel
Depois do primeiro deploy, adicione este comando na configuração de build:

1. Vá em **Settings** → **General**
2. Em **Build & Development Settings**
3. Adicione em **Build Command**:
```bash
prisma generate && prisma db push && next build
```

### Passo 6 (IMPORTANTE): Ajustar o schema do Prisma para produção

Antes de fazer deploy, você precisa mudar o banco de dados de SQLite para PostgreSQL no arquivo `prisma/schema.prisma`:

**Altere de:**
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

**Para:**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Depois faça commit e push para o GitHub. A Vercel vai fazer deploy automaticamente.

## 📱 Funcionalidades Atuais

### ✅ Implementado
- Dashboard com resumo financeiro
- Controle de caixa (CRUD completo)
- Visualização de entradas e saídas
- Cálculo automático de fechamento
- Histórico de registros
- Design responsivo

### 🔜 Próximas Funcionalidades
- Gráficos de evolução do caixa
- Relatórios mensais/anuais
- Gestão de produtos
- Controle de vendas
- Gestão de pedidos
- Sistema de autenticação

## 🗂️ Estrutura do Projeto

```
pizzaria-dashboard/
├── app/
│   ├── api/
│   │   └── caixa/          # API routes para controle de caixa
│   ├── caixa/              # Página de controle de caixa
│   ├── layout.tsx          # Layout principal
│   ├── page.tsx            # Dashboard (página inicial)
│   └── globals.css         # Estilos globais
├── components/             # Componentes React (vazio por enquanto)
├── lib/
│   └── prisma.ts           # Configuração do Prisma Client
├── prisma/
│   └── schema.prisma       # Schema do banco de dados
├── package.json
└── tsconfig.json
```

## 🎯 Como Usar

### Adicionar um novo registro de caixa:
1. Acesse "Controle de Caixa" no menu
2. Preencha os campos do formulário
3. O fechamento é calculado automaticamente
4. Clique em "Adicionar Registro"

### Ver resumo financeiro:
1. Acesse o "Dashboard" (página inicial)
2. Veja os cards com saldo atual, entradas e saídas do mês
3. Veja a tabela com os últimos 5 registros

## 🛠️ Scripts Disponíveis

```bash
npm run dev          # Roda o servidor de desenvolvimento
npm run build        # Faz build para produção
npm run start        # Inicia servidor de produção
npm run db:push      # Sincroniza schema com banco
npm run db:generate  # Gera Prisma Client
npm run db:studio    # Abre Prisma Studio (GUI do banco)
```

## 🔐 Variáveis de Ambiente

### Local (.env)
```env
DATABASE_URL="file:./dev.db"
```

### Produção (Vercel)
A Vercel configura automaticamente quando você cria o banco Postgres:
```env
DATABASE_URL="postgresql://..."
POSTGRES_URL="..."
POSTGRES_PRISMA_URL="..."
# (outras variáveis geradas automaticamente)
```

## 📝 Modelo de Dados

### CashFlow (Controle de Caixa)
```typescript
{
  id: number              // ID único
  date: DateTime          // Data do registro
  saldoInicial: number    // Saldo inicial do dia
  entradas: number        // Total de entradas
  saidas: number          // Total de saídas
  fechamento: number      // Saldo final (calculado)
  diferenca: number?      // Diferença (se houver)
  observacao: string?     // Observações opcionais
  createdAt: DateTime     // Data de criação
  updatedAt: DateTime     // Data de atualização
}
```

## 🎨 Cores do Tema

- **Primary (Vermelho):** #ef4444
- **Secondary (Amarelo):** #fbbf24

## 📧 Suporte

Para dúvidas ou problemas, consulte a documentação oficial:
- [Next.js](https://nextjs.org/docs)
- [Prisma](https://www.prisma.io/docs)
- [Vercel](https://vercel.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

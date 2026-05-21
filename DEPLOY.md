# 🚀 GUIA RÁPIDO DE DEPLOY NA VERCEL

## ⚡ Configuração Manual (O QUE VOCÊ PRECISA FAZER)

### 1. Antes de fazer deploy, altere o banco de dados:

Abra o arquivo `prisma/schema.prisma` e mude:

```prisma
datasource db {
  provider = "sqlite"        # ❌ REMOVER
  url      = env("DATABASE_URL")
}
```

Para:

```prisma
datasource db {
  provider = "postgresql"    # ✅ USAR ESTE
  url      = env("DATABASE_URL")
}
```

### 2. Criar repositório no GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin SEU_REPOSITORIO_GITHUB
git push -u origin main
```

### 3. Deploy na Vercel

1. Acesse https://vercel.com e faça login com GitHub
2. Clique em "Import Project"
3. Selecione seu repositório
4. Clique em "Deploy"

### 4. Criar banco de dados Postgres na Vercel

1. Vá para o projeto na Vercel
2. Clique em "Storage" no menu
3. Clique em "Create Database"
4. Escolha "Postgres"
5. Região: São Paulo (South America)
6. Clique em "Create"

**PRONTO!** A Vercel conecta automaticamente o banco ao projeto.

### 5. Fazer novo deploy (para aplicar o Postgres)

Na Vercel:
1. Vá em "Deployments"
2. Clique nos 3 pontos do último deployment
3. Clique em "Redeploy"

**🎉 SEU DASHBOARD ESTÁ NO AR!**

## 🔍 Verificar se funcionou

1. Acesse o link do Vercel (algo como: `seu-projeto.vercel.app`)
2. Vá em "Controle de Caixa"
3. Adicione um registro de teste
4. Se funcionar, está tudo certo! 🎊

## ⚠️ Problemas Comuns

### Erro de build?
- Verifique se mudou `sqlite` para `postgresql` no schema.prisma
- Verifique se criou o banco Postgres na Vercel

### Página em branco?
- Aguarde 1-2 minutos (primeiro deploy pode demorar)
- Faça refresh (F5)

### Erro ao adicionar registro?
- Verifique se o banco Postgres foi criado
- Tente fazer redeploy

## 📞 Se precisar de ajuda
- Consulte o README.md completo
- Verifique os logs na Vercel (aba "Logs")

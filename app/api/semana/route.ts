import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function round2(n: number) { return Math.round(n * 100) / 100 }
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
      wv[w].avista   = round2(wv[w].avista   + f.avista)
      wv[w].ifood    = round2(wv[w].ifood    + f.ifood)
      wv[w].noventa9 = round2(wv[w].noventa9 + f.noventa9)
      wv[w].keeta    = round2(wv[w].keeta    + f.keeta)
      wv[w].extra    = round2(wv[w].extra    + f.extra)
    }
    for (const v of vendasInd) {
      const w = weekOf(v.date)
      wv[w].avista  = round2(wv[w].avista  + v.avista)
      wv[w].ifood   = round2(wv[w].ifood   + v.ifood)
      wv[w].debito  = round2(wv[w].debito  + v.debito)
      wv[w].credito = round2(wv[w].credito + v.credito)
      wv[w].pix     = round2(wv[w].pix     + v.pix)
      wv[w].outros  = round2(wv[w].outros  + v.outros)
    }

    const vendas = [1, 2, 3, 4].map(w => {
      const d = wv[w]
      const total = round2(d.avista + d.ifood + d.noventa9 + d.keeta + d.extra + d.debito + d.credito + d.pix + d.outros)
      return { semana: w, ...d, total }
    })

    const funcMap: Record<string, { nome: string; s: Record<number, number> }> = {}
    for (const f of funcs) {
      const w = semanaFromField(f.semana, f.date)
      if (!funcMap[f.nome]) funcMap[f.nome] = { nome: f.nome, s: { 1: 0, 2: 0, 3: 0, 4: 0 } }
      funcMap[f.nome].s[w] = round2(funcMap[f.nome].s[w] + f.valor)
    }
    const funcionarios = Object.values(funcMap).map(f => ({
      nome: f.nome,
      sem1: f.s[1], sem2: f.s[2], sem3: f.s[3], sem4: f.s[4],
      total: round2(f.s[1] + f.s[2] + f.s[3] + f.s[4]),
    }))

    return NextResponse.json({ vendas, funcionarios })
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar dados da semana' }, { status: 500 })
  }
}

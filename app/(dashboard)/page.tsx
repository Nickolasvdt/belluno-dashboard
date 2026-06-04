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

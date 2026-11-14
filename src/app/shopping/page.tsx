import { AppShell }    from '@/components/layout/AppShell'
import { ShoppingPage } from '@/components/shopping/ShoppingPage'

export const metadata = { title: 'ショッピング | my coordy♡' }

export default function Page() {
  return (
    <AppShell>
      <ShoppingPage />
    </AppShell>
  )
}

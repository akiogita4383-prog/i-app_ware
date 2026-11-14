import { AppShell }    from '@/components/layout/AppShell'
import { CalendarPage } from '@/components/calendar/CalendarPage'

export const metadata = { title: 'カレンダー | my coordy♡' }

export default function Page() {
  return (
    <AppShell>
      <CalendarPage />
    </AppShell>
  )
}

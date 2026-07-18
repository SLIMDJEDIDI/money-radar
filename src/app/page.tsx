import { getHubDashboardData } from './data';
import MoneyHubApp from '@/components/MoneyHubApp';
import { getPanicLockState, getSession } from '@/lib/auth';

export const revalidate = 0; // Force dynamic rendering on every request to fetch fresh live Supabase data

export default async function Page() {
  const panic = await getPanicLockState();
  const session = await getSession();

  // Absolute data boundary: while locked, NEVER fetch/send operational props to the browser.
  if (panic.isLocked) {
    return (
      <main className="min-h-screen bg-black">
        <MoneyHubApp initialPanicState={{ isLocked: true, emergencyUsername: panic.emergencyUsername, emergencySession: session?.role === 'emergency' }} />
      </main>
    );
  }

  // Normal mode is also private: do not embed financial data in unauthenticated HTML.
  if (!session || session.role === 'emergency') {
    return (
      <main className="min-h-screen bg-black">
        <MoneyHubApp initialPanicState={{ isLocked: false, emergencyUsername: null, emergencySession: false }} />
      </main>
    );
  }

  const data = await getHubDashboardData();
  return (
    <main className="min-h-screen bg-black">
      <MoneyHubApp
        initialPanicState={{ isLocked: false, emergencyUsername: null, emergencySession: false }}
        initialContacts={data.contacts}
        initialAllContacts={data.allContacts}
        initialCurrencies={data.currencies}
        initialActiveCurrencies={data.activeCurrencies}
        initialCategories={data.categories}
        initialTransactions={data.transactions}
        initialReminders={data.reminders}
        initialAuditTrails={data.auditTrails}
        initialUsers={data.users}
        initialMetrics={data.metrics}
        initialTndMovements={data.tndMovements}
        initialTndForecast={data.tndForecast}
        initialTndUpcoming={data.tndUpcoming}
        initialTndDueSoon={data.tndDueSoon}
        initialTndOverdue={data.tndOverdue}
      />
    </main>
  );
}

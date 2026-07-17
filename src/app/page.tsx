import { getHubDashboardData } from './data';
import MoneyHubApp from '@/components/MoneyHubApp';

export const revalidate = 0; // Force dynamic rendering on every request to fetch fresh live Supabase data

export default async function Page() {
  const data = await getHubDashboardData();

  return (
    <main className="min-h-screen bg-black">
      <MoneyHubApp
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

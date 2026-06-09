import { getDashboardData, getRecentMovements } from './data';
import MoneyRadarApp from '@/components/MoneyRadarApp';

export const revalidate = 0; // Dynamic server rendering to fetch live SQLite database data on every load

export default async function Page() {
  const { holders, metrics } = await getDashboardData();
  const initialMovements = await getRecentMovements();

  return (
    <main className="min-h-screen bg-black">
      <MoneyRadarApp
        initialHolders={holders}
        initialMetrics={metrics}
        initialMovements={initialMovements}
      />
    </main>
  );
}

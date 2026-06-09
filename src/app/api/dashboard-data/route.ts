import { NextResponse } from 'next/server';
import { getDashboardData, getRecentMovements } from '../../actions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { holders, metrics } = await getDashboardData();
    const movements = await getRecentMovements();
    
    return NextResponse.json({
      holders,
      metrics,
      movements,
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

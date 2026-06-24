import { NextResponse } from 'next/server';
import { getHubDashboardData } from '../../data';
import { getSession } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // SECURITY: require a valid signed session — this endpoint exposes all data
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await getHubDashboardData();
    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

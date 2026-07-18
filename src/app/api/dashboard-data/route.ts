import { NextResponse } from 'next/server';
import { getHubDashboardData } from '../../data';
import { getSession, getPanicLockState } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // SECURITY: require normal session AND reject all data access during Panic Lock.
    const [session, panic] = await Promise.all([getSession(), getPanicLockState()]);
    if (!session || session.role === 'emergency') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (panic.isLocked) {
      return NextResponse.json({ error: 'Panic Lock active' }, { status: 423 });
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

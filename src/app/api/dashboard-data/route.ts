import { NextResponse } from 'next/server';
import { getHubDashboardData } from '../../data';
import { getSession, getPanicLockState } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // SECURITY: require normal session AND reject all data access during Panic Lock.
    const [session, panic] = await Promise.all([getSession(), getPanicLockState()]);
    if (!session || session.role === 'emergency') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (panic.isLocked) {
      return NextResponse.json({ error: 'Panic Lock active' }, { status: 423 });
    }

    // Journal d'audit étendu — pour une réconciliation de caisse, il faut pouvoir
    // remonter au-delà des 40 dernières lignes et retrouver un mouvement SUPPRIMÉ.
    // Admin uniquement, borné à 1000, et en lecture seule.
    const requested = Number(new URL(request.url).searchParams.get('auditLimit'));
    const auditLimit = session.role === 'admin' && Number.isFinite(requested) && requested > 0
      ? Math.min(Math.trunc(requested), 1000)
      : 40;

    const data = await getHubDashboardData('', auditLimit);
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

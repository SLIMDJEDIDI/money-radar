import { NextResponse } from 'next/server';
import { fetchChinaTrackPayments } from '../../../lib/china-track';
import { getSession, getPanicLockState } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

// CHINA TRACK À PART, ET APRÈS.
//
// Ce flux est un appel HTTP vers une AUTRE application. Tant qu'il vivait dans
// le chargement de la page, MONEY HUB attendait China Track avant d'afficher
// quoi que ce soit : la lenteur (ou la panne) d'une application en gelait une
// autre, pour une information qui ne concerne qu'une section.
//
// Il est maintenant chargé par le navigateur APRÈS l'affichage. La page ne
// dépend plus de China Track pour s'ouvrir ; au pire la section arrive un
// instant plus tard.
export async function GET() {
  try {
    const [session, panic] = await Promise.all([getSession(), getPanicLockState()]);
    // Mêmes barrières que le reste des données DEVISES : admin uniquement.
    if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (panic.isLocked) return NextResponse.json({ error: 'Panic Lock active' }, { status: 423 });

    const chinaTrack = await fetchChinaTrackPayments();
    return NextResponse.json({ success: true, chinaTrack });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

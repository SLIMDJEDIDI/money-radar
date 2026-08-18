/**
 * CHINA TRACK → MONEY HUB : les paiements fournisseurs à venir, en lecture
 * seule. La source de vérité reste CHINA TRACK — un paiement enregistré
 * là-bas disparaît d'ici au prochain chargement, rien n'est ressaisi et rien
 * n'est stocké de ce côté.
 *
 * Config (Vercel, projet money-radar) :
 *  - CHINA_TRACK_FEED_URL   (défaut : le flux de production)
 *  - CHINA_TRACK_FEED_TOKEN (le même secret que PAYMENTS_FEED_TOKEN côté
 *    china-track-pro ; sans lui, la section reste simplement absente)
 */

export type ChinaTrackPayment = {
  orderNo: string;
  supplierName: string;
  productName: string;
  label: string;
  status: 'Late' | 'Upcoming' | 'Partly Paid';
  remainingUsd: number;
  amountUsd: number;
  dueDate: string | null; // YYYY-MM-DD
};

export type ChinaTrackFeed = {
  configured: boolean;
  error: string | null;
  generatedAt: string | null;
  totals: { lateUsd: number; next30Usd: number; totalUsd: number };
  payments: ChinaTrackPayment[];
};

const EMPTY_TOTALS = { lateUsd: 0, next30Usd: 0, totalUsd: 0 };

export async function fetchChinaTrackPayments(): Promise<ChinaTrackFeed> {
  const token = process.env.CHINA_TRACK_FEED_TOKEN;
  const url = process.env.CHINA_TRACK_FEED_URL || 'https://china-track-pro.vercel.app/api/upcoming-payments';

  if (!token) {
    return { configured: false, error: null, generatedAt: null, totals: EMPTY_TOTALS, payments: [] };
  }

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      // Un tableau de bord de trésorerie ne doit jamais rester suspendu à un
      // service externe : 6 s puis on affiche le reste sans CHINA TRACK.
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) {
      return { configured: true, error: `HTTP ${res.status}`, generatedAt: null, totals: EMPTY_TOTALS, payments: [] };
    }
    const data = await res.json();
    return {
      configured: true,
      error: null,
      generatedAt: data.generatedAt ?? null,
      totals: {
        lateUsd: Number(data.totals?.lateUsd) || 0,
        next30Usd: Number(data.totals?.next30Usd) || 0,
        totalUsd: Number(data.totals?.totalUsd) || 0,
      },
      payments: Array.isArray(data.payments) ? data.payments : [],
    };
  } catch (e: any) {
    return { configured: true, error: e?.name === 'TimeoutError' ? 'timeout' : 'unreachable', generatedAt: null, totals: EMPTY_TOTALS, payments: [] };
  }
}

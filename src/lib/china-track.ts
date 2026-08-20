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

export type ChinaTrackDangerous = {
  count: number;
  amountUsd: number;
  soonestArrival: string | null;
  contracts: {
    orderNo: string;
    supplierName: string;
    urgency: 'watch' | 'urgent' | 'critical' | 'overdue';
    daysToArrival: number | null;
    balanceUsd: number;
    outstanding: string[];
    headline: string;
  }[];
};

export type ChinaTrackPayment = {
  orderNo: string;
  /** Marchandises dangereuses : le port ne les garde pas. */
  isDangerousGoods?: boolean;
  supplierName: string;
  productName: string;
  label: string;
  status: 'Late' | 'Upcoming' | 'Partly Paid';
  remainingUsd: number;
  amountUsd: number;
  /** Le fret maritime contenu dans cette echeance. Il se paie, mais ce n'est
   *  PAS ce qui a ete convenu avec l'usine : on l'affiche a part. */
  freightUsd?: number;
  dueDate: string | null; // YYYY-MM-DD
  /** Arrivée prévue du conteneur au port — seulement sur un solde « contre B/L ». */
  arrivalDate?: string | null; // YYYY-MM-DD
  /** D'où vient l'échéance : « before arrival » = marchandises dangereuses. */
  dueSource?: string | null;
};

export type ChinaTrackFeed = {
  configured: boolean;
  error: string | null;
  generatedAt: string | null;
  totals: { lateUsd: number; next30Usd: number; totalUsd: number };
  dangerous: ChinaTrackDangerous;
  payments: ChinaTrackPayment[];
};

const EMPTY_DG: ChinaTrackDangerous = { count: 0, amountUsd: 0, soonestArrival: null, contracts: [] };

const EMPTY_TOTALS = { lateUsd: 0, next30Usd: 0, totalUsd: 0 };

export async function fetchChinaTrackPayments(): Promise<ChinaTrackFeed> {
  const token = process.env.CHINA_TRACK_FEED_TOKEN;
  const url = process.env.CHINA_TRACK_FEED_URL || 'https://china-track-pro.vercel.app/api/upcoming-payments';

  if (!token) {
    return { configured: false, error: null, generatedAt: null, totals: EMPTY_TOTALS, dangerous: EMPTY_DG, payments: [] };
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
      return { configured: true, error: `HTTP ${res.status}`, generatedAt: null, totals: EMPTY_TOTALS, dangerous: EMPTY_DG, payments: [] };
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
      dangerous: {
        count: Number(data.dangerousGoods?.count) || 0,
        amountUsd: Number(data.dangerousGoods?.amountUsd) || 0,
        soonestArrival: data.dangerousGoods?.soonestArrival ?? null,
        contracts: Array.isArray(data.dangerousGoods?.contracts) ? data.dangerousGoods.contracts : [],
      },
      payments: Array.isArray(data.payments) ? data.payments : [],
    };
  } catch (e: any) {
    return { configured: true, error: e?.name === 'TimeoutError' ? 'timeout' : 'unreachable', generatedAt: null, totals: EMPTY_TOTALS, dangerous: EMPTY_DG, payments: [] };
  }
}

// SYNC AUTOMATIQUE D'UN RELEVÉ BIAT (portail MyBIAT Corporate) → compte BANQUE.
//
// Appelé par l'extension Chrome, PAS par un humain connecté : la porte est un
// secret partagé (BANK_SYNC_SECRET, posé sur Vercel), jamais un mot de passe
// banque. La logique d'écriture est celle de importBankStatement : on rejoue
// planImport(), donc seules les lignes absentes sont ajoutées et un second envoi
// n'écrit rien.
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { timingSafeEqual } from 'crypto';
import { prisma } from '../../../lib/db';
import { parseBiatJson, planImport } from '../../../lib/bank-import';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// L'extension parle depuis une origine chrome-extension:// : CORS + préflight.
const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, x-bank-sync-secret',
};

function secretOk(got: string | null): boolean {
  const want = process.env.BANK_SYNC_SECRET || '';
  if (!want || !got) return false;
  const a = Buffer.from(got), b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: Request) {
  try {
    if (!secretOk(req.headers.get('x-bank-sync-secret'))) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: CORS });
    }

    const body = await req.json().catch(() => null);

    // Balise de diagnostic envoyee par l'extension : on la journalise et on sort.
    if (body && body.debug !== undefined) {
      await prisma.hubAuditTrail.create({
        data: {
          entityType: 'BANK', entityId: null, action: 'BANK_SYNC_DEBUG',
          details: `DEBUG ${String(body.debug).slice(0, 60)}${body.extra ? ' | ' + String(body.extra).slice(0, 120) : ''}`,
          modifiedBy: 'auto-sync',
        },
      });
      return NextResponse.json({ success: true, debug: true }, { headers: CORS });
    }

    const accounts: any[] | null = Array.isArray(body?.accounts)
      ? body.accounts
      : (body?.rows ? [{ accountTitle: body.accountTitle, iban: body.iban, rows: body.rows }] : null);
    if (!accounts || !accounts.length) {
      return NextResponse.json({ success: false, error: 'Aucune donnée' }, { status: 400, headers: CORS });
    }

    const bankAccounts = await prisma.hubBankAccount.findMany();
    const results: any[] = [];

    for (const a of accounts) {
      const title = String(a?.accountTitle || '').toUpperCase();

      let statement;
      try { statement = parseBiatJson(a); }
      catch (e: any) { results.push({ account: a?.accountTitle || '?', error: e?.message || 'Illisible' }); continue; }

      // Garde-fou : on n'écrit que dans le compte dont le nom est contenu dans
      // l'intitulé du relevé (VLT MOTORS ne peut pas tomber dans VOLTROP).
      const matches = bankAccounts.filter((acc) => {
        const want = acc.name.replace(/^BIAT\s+/i, '').trim().toUpperCase();
        return want && title.includes(want);
      });
      if (matches.length !== 1) {
        results.push({ account: a?.accountTitle || '?', error: matches.length ? 'Plusieurs comptes correspondent' : 'Compte introuvable dans MONEY HUB' });
        continue;
      }
      const acc = matches[0];

      const written = await prisma.$transaction(async (tx) => {
        const existing = await tx.hubBankMovement.findMany({ where: { accountId: acc.id }, orderBy: { createdAt: 'asc' } });
        if (existing.length === 0) return { skipped: 'solde de départ manquant' as const };
        const openingDay = existing[0].createdAt.toISOString().slice(0, 10);
        const p = planImport(statement.lines, existing, openingDay);
        if (p.toImport.length === 0) return { count: 0, net: 0, openingDay };
        await tx.hubBankMovement.createMany({
          data: p.toImport.map((l) => ({
            accountId: acc.id,
            amount: Math.abs(l.amount),
            type: l.amount > 0 ? 'IN' : 'OUT',
            note: `${l.type} — ${l.description} (réf ${l.ref}) ${l.tag}`,
            performedBy: 'auto-sync',
            isSettled: true,
            scheduledFor: null,
            createdAt: new Date(`${l.date}T12:00:00.000Z`),
          })),
        });
        await tx.hubAuditTrail.create({
          data: {
            entityType: 'BANK', entityId: acc.id, action: 'BANK_SYNC',
            details: `Sync auto BIAT ${acc.name} : ${p.toImport.length} ligne(s), net ${p.net} (après le ${openingDay})`,
            newValue: JSON.stringify(p.toImport.map((l) => ({ date: l.date, amount: l.amount, ref: l.ref, tag: l.tag }))),
            modifiedBy: 'auto-sync',
          },
        });
        return { count: p.toImport.length, net: p.net, openingDay };
      });

      results.push({ account: acc.name, ...written });
    }

    if (results.some((r) => (r.count || 0) > 0)) {
      try { revalidatePath('/'); } catch { /* hors requête de page : sans effet */ }
    }
    return NextResponse.json({ success: true, results }, { headers: CORS });
  } catch {
    return NextResponse.json({ success: false, error: 'Erreur' }, { status: 500, headers: CORS });
  }
}

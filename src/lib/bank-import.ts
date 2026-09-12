// IMPORT D'UN RELEVÉ BIAT (export CSV « DétailsTransactions ») dans un compte BANQUE.
//
// Pur : aucune base, aucun réseau. Le serveur lit le compte, appelle planImport(),
// puis écrit ce que le plan désigne. Les mêmes fonctions servent l'aperçu et
// l'import, donc ce que l'écran annonce est exactement ce qui sera écrit.

export type BankLine = {
  date: string;        // YYYY-MM-DD — date d'opération
  amount: number;      // signé, au millime : + crédit, − débit
  ref: string;         // référence banque (elle se répète : commission + TVA d'une même opération)
  type: string;        // « Commissions », « Virements émis »…
  description: string;
  key: string;         // date|réf|montant — unique sur un relevé réel
  tag: string;         // ⟦B:xxxxxxxx⟧ posé dans la note : c'est lui qui dit « déjà importé »
};

export type ParsedStatement = { iban: string; accountTitle: string; lines: BankLine[] };

export type ExistingMovement = { id: string; type: string; amount: number; note: string | null; createdAt: string | Date };

const round3 = (n: number) => Math.round(n * 1000) / 1000;

// FNV-1a 32 bits : court, stable, suffisant pour distinguer les lignes d'un compte.
function shortHash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((f) => f !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f !== '')) rows.push(row);
  return rows;
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export function parseBiatCsv(text: string): ParsedStatement {
  const rows = parseCsv(text.replace(/^﻿/, ''));
  if (rows.length < 2) throw new Error('Relevé vide');
  const head = rows[0].map(norm);
  // Par NOM de colonne, jamais par position : la banque peut en ajouter une.
  // « Montant » existe deux fois (montant du compte, puis montant en devise) :
  // indexOf prend la première, celle du compte.
  const col = (name: string) => {
    const i = head.indexOf(norm(name));
    if (i < 0) throw new Error(`Colonne « ${name} » introuvable : ce n'est pas un relevé BIAT`);
    return i;
  };
  const cIban = col('Numéro de Compte (IBAN)'), cTitle = col('Intitulé du compte');
  const cAmount = col('Montant'), cDate = col('Date opération'), cType = col('Type opération');
  const cRef = col('Référence'), cDesc = col('Description');

  const lines: BankLine[] = rows.slice(1).map((r, n) => {
    const date = (r[cDate] || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Ligne ${n + 2} : date illisible « ${date} »`);
    const amount = round3(Number(r[cAmount]));
    if (!Number.isFinite(amount) || amount === 0) throw new Error(`Ligne ${n + 2} : montant illisible « ${r[cAmount]} »`);
    const ref = (r[cRef] || '').trim();
    const description = (r[cDesc] || '').replace(/\\n/g, ' · ').replace(/\s+/g, ' ').replace(/[·\s*]+$/, '').trim();
    const key = `${date}|${ref}|${amount.toFixed(3)}`;
    return { date, amount, ref, type: (r[cType] || '').trim(), description, key, tag: `⟦B:${shortHash(key)}⟧` };
  });
  return { iban: (rows[1][cIban] || '').trim(), accountTitle: (rows[1][cTitle] || '').trim(), lines };
}

export type ImportPlan = {
  toImport: BankLine[];
  alreadyImported: BankLine[];
  matchedManual: { line: BankLine; movementId: string }[];
  cancelledPairs: BankLine[];
  beforeOpening: BankLine[];
  /** Saisies à la main, après l'ouverture, qu'aucune ligne du relevé ne justifie. */
  manualUnmatched: ExistingMovement[];
  net: number;
};

const dayOf = (d: string | Date) => (typeof d === 'string' ? d : d.toISOString()).slice(0, 10);
const daysBetween = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) / 86400000;

/**
 * `openingDay` : le jour du solde de départ saisi dans MONEY HUB. Tout ce que la
 * banque a passé CE jour-là ou avant est déjà dans ce solde — on ne le compte
 * pas deux fois.
 */
export function planImport(lines: BankLine[], existing: ExistingMovement[], openingDay: string): ImportPlan {
  const beforeOpening = lines.filter((l) => l.date <= openingDay);
  let pool = lines.filter((l) => l.date > openingDay);

  // 1. Déjà importées : leur marque est dans une note.
  const notes = existing.map((m) => m.note || '').join('\n');
  const alreadyImported = pool.filter((l) => notes.includes(l.tag));
  pool = pool.filter((l) => !notes.includes(l.tag));

  // 2. Saisies à la main (sans marque) : même montant signé, à 4 jours près,
  //    la date la plus proche l'emporte. Le solde de départ ne se rapproche jamais.
  const manual = existing
    .filter((m) => !/⟦B:[0-9a-f]{8}⟧/.test(m.note || '') && dayOf(m.createdAt) > openingDay)
    .sort((a, b) => String(dayOf(a.createdAt)).localeCompare(String(dayOf(b.createdAt))));
  const used = new Set<BankLine>();
  const matchedManual: ImportPlan['matchedManual'] = [];
  const manualUnmatched: ExistingMovement[] = [];
  for (const m of manual) {
    const signed = m.type === 'IN' ? m.amount : -m.amount;
    let best: BankLine | null = null, gap = Infinity;
    for (const l of pool) {
      if (used.has(l) || Math.abs(l.amount - signed) > 0.0005) continue;
      const g = daysBetween(l.date, dayOf(m.createdAt));
      if (g <= 4 && g < gap) { best = l; gap = g; }
    }
    if (best) { used.add(best); matchedManual.push({ line: best, movementId: m.id }); }
    else manualUnmatched.push(m);
  }
  pool = pool.filter((l) => !used.has(l));

  // 3. Blocage / déblocage (ou réservation de chèque) qui s'annulent dans ce
  //    relevé : l'argent n'a jamais bougé, rien à écrire.
  const cancelled = new Set<BankLine>();
  for (const a of pool) {
    if (cancelled.has(a)) continue;
    const b = pool.find((x) => x !== a && !cancelled.has(x) && Math.abs(x.amount + a.amount) < 0.0005 &&
      /blocage|reservation/.test(norm(a.description + ' ' + x.description)));
    if (b) { cancelled.add(a); cancelled.add(b); }
  }
  const toImport = pool.filter((l) => !cancelled.has(l));

  return {
    toImport, alreadyImported, matchedManual, cancelledPairs: [...cancelled], beforeOpening, manualUnmatched,
    net: round3(toImport.reduce((s, l) => s + l.amount, 0)),
  };
}

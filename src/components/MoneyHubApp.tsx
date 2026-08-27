'use client';

import React, { useState, useTransition, useMemo, useEffect, useOptimistic, useCallback, useRef, memo } from 'react';
import MoneyHubLogo from './MoneyHubLogo';
import {
  Plus, ArrowLeftRight, Camera, Search, X, ChevronRight, ChevronLeft, RefreshCw, Clock, ExternalLink, LayoutDashboard, WalletCards, Activity,
  UserPlus, Trash2, Users, Settings, Edit, AlertTriangle, Coins, Calendar, LogOut, Lock, KeyRound,
  Sun, Moon, CheckCircle, DollarSign, History, ArrowUpRight, Bell, CalendarClock, ShieldAlert, ShieldCheck, Siren, Archive, Landmark, Receipt, Undo2
} from 'lucide-react';
// Logo Coffre Fort Administration (remplace l'icône Vault de lucide).
import CoffreIcon from './CoffreIcon';
// Nom affiche des utilisateurs. L'identifiant de connexion, lui, ne change pas.
import { displayUser, displayNamesIn } from '../lib/display-name';
import {
  createContact, updateContact, deleteContact,
  createHubTransaction, deleteHubTransaction,
  createReminder, toggleReminderCompleted, deleteReminder,
  confirmReminderReceived, postponeReminder,
  resetDatabaseToZero, loginUser, logoutUser, getCurrentUser,
  changeUserPassword, createAssistantUser, deleteAssistantUser,
  createTndMovement, deleteTndMovement, settleTndMovement, createTndBatchDisbursement, updateTndMovementNote, createTndReceivable,
  createArchiveMovement, deleteArchiveMovement, settleArchiveMovement, createArchiveBatchDisbursement, updateArchiveMovementNote, ensureArchiveTable, migrateArchivePartnerToLedger, retireArchivePartner, ensureReminderPlannedType,
  transferTreasuryToArchive,
  createPartnerNote, updatePartnerNote, deletePartnerNote, ensurePartnerNoteTable,
  ensureCreditTable, createCredit, updateCredit, setCreditPaid, deleteCredit,
  ensureBankTables, createBankAccount, renameBankAccount, deleteBankAccount,
  createBankMovement, createBankBatchDisbursement, settleBankMovement, updateBankMovementNote, deleteBankMovement,
  activatePanicLock, unlockPanicLock
} from '../app/actions';

const CURRENCY_SYMBOLS: Record<string, string> = { USD: '$', RMB: '¥', EURO: '€', TND: 'DT' };

// Distinctive, stable color per bank account (derived from its id) so each account keeps
// the SAME color everywhere (selector, hero, dashboard) — a strong anti-mistake cue.
const BANK_PALETTES = [
  { key: 'teal',    ring: 'ring-teal-400',    border: 'border-teal-500/60',    borderSoft: 'border-teal-500/25',    text: 'text-teal-300',    bgSoft: 'bg-teal-500/15',    grad: 'from-teal-500/20',    heroFrom: 'from-[#062925]', dot: 'bg-teal-400', solid: 'bg-teal-500' },
  { key: 'sky',     ring: 'ring-sky-400',     border: 'border-sky-500/60',     borderSoft: 'border-sky-500/25',     text: 'text-sky-300',     bgSoft: 'bg-sky-500/15',     grad: 'from-sky-500/20',     heroFrom: 'from-[#082234]', dot: 'bg-sky-400', solid: 'bg-sky-500' },
  { key: 'violet',  ring: 'ring-violet-400',  border: 'border-violet-500/60',  borderSoft: 'border-violet-500/25',  text: 'text-violet-300',  bgSoft: 'bg-violet-500/15',  grad: 'from-violet-500/20',  heroFrom: 'from-[#1e1633]', dot: 'bg-violet-400', solid: 'bg-violet-500' },
  { key: 'amber',   ring: 'ring-amber-400',   border: 'border-amber-500/60',   borderSoft: 'border-amber-500/25',   text: 'text-amber-300',   bgSoft: 'bg-amber-500/15',   grad: 'from-amber-500/20',   heroFrom: 'from-[#2a2109]', dot: 'bg-amber-400', solid: 'bg-amber-500' },
  { key: 'fuchsia', ring: 'ring-fuchsia-400', border: 'border-fuchsia-500/60', borderSoft: 'border-fuchsia-500/25', text: 'text-fuchsia-300', bgSoft: 'bg-fuchsia-500/15', grad: 'from-fuchsia-500/20', heroFrom: 'from-[#2a0f28]', dot: 'bg-fuchsia-400', solid: 'bg-fuchsia-500' },
  { key: 'lime',    ring: 'ring-lime-400',    border: 'border-lime-500/60',    borderSoft: 'border-lime-500/25',    text: 'text-lime-300',    bgSoft: 'bg-lime-500/15',    grad: 'from-lime-500/20',    heroFrom: 'from-[#1a2408]', dot: 'bg-lime-400', solid: 'bg-lime-500' },
  { key: 'orange',  ring: 'ring-orange-400',  border: 'border-orange-500/60',  borderSoft: 'border-orange-500/25',  text: 'text-orange-300',  bgSoft: 'bg-orange-500/15',  grad: 'from-orange-500/20',  heroFrom: 'from-[#2a1608]', dot: 'bg-orange-400', solid: 'bg-orange-500' },
  { key: 'cyan',    ring: 'ring-cyan-400',    border: 'border-cyan-500/60',    borderSoft: 'border-cyan-500/25',    text: 'text-cyan-300',    bgSoft: 'bg-cyan-500/15',    grad: 'from-cyan-500/20',    heroFrom: 'from-[#06272b]', dot: 'bg-cyan-400', solid: 'bg-cyan-500' },
];
const bankPalette = (id: string) => {
  let h = 0;
  for (let i = 0; i < (id || '').length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return BANK_PALETTES[h % BANK_PALETTES.length];
};

// BIAT-branded bank accounts: keep the BIAT logo as a visual bank badge, but do not
// force the word BIAT inside the account name itself.
const BIAT_LOGO_SRC = '/biat-logo.jpg';
const isBiatAccount = (name?: string) => {
  const n = (name || '').trim().toUpperCase();
  return n.includes('BIAT') || n === 'VLT MOTORS' || n === 'VOLTROP INDUSTRIES';
};

// Sentinel prefix (must match TREASURY_ARCHIVE_TAG in actions.ts) marking a Coffre→Archive
// transfer so both journals can highlight these special admin-only movements.
const TREASURY_ARCHIVE_TAG = '⇄ TRANSFERT COFFRE→ARCHIVE';
const isTransferNote = (note?: string) => !!note && note.startsWith(TREASURY_ARCHIVE_TAG);

// Receivable marker (must match TND_RECEIVABLE_TAG in actions.ts): money owed to you,
// visible but excluded from the cash total until recovered.
const TND_RECEIVABLE_TAG = '🔖 À RÉCUPÉRER';
const isReceivableNote = (note?: string) => !!note && note.startsWith(TND_RECEIVABLE_TAG);
const cleanReceivableNote = (note?: string) => (note || '').replace(TND_RECEIVABLE_TAG, '').replace(/^\s*·\s*/, '').trim();

// Le jour civil DE L'UTILISATEUR, "YYYY-MM-DD". `toISOString()` donne le jour UTC :
// entre minuit et 1h du matin en Tunisie il renvoie encore la VEILLE, et le serveur
// classait alors une saisie du jour comme « planifiée » — donc hors du solde du coffre.
// On envoie ce jour au serveur pour qu'il compare deux dates du même fuseau.
const localDayKey = (d: Date = new Date()) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// ---------------------------------------------------------------------------
// JOURNAL D'AUDIT — deux axes de lecture : le COMPTE et le SUJET.
//
// La base ne garde qu'un code technique (« TND_BATCH_OUT ») et une phrase.
// Pour retrouver quelque chose il faut pouvoir dire « le Coffre, les
// suppressions, ce mois-ci » — alors on traduit ce code en deux axes lisibles
// au moment de l'affichage. Aucune donnée n'est réécrite : lecture seule.
// ---------------------------------------------------------------------------
type AuditRow = { entityType?: string; action?: string; details?: string; oldValue?: string; newValue?: string; modifiedBy?: string; createdAt?: string };

const AUDIT_ACCOUNTS: { key: string; label: string; tone: string; match: (a: AuditRow) => boolean }[] = [
  { key: 'coffre', label: 'Coffre', tone: 'blue', match: a => a.entityType === 'TREASURY' || /^TND_/.test(a.action || '') },
  { key: 'banque', label: 'Banque', tone: 'teal', match: a => a.entityType === 'BANK' || /^BANK_/.test(a.action || '') },
  { key: 'archive', label: 'Archive', tone: 'amber', match: a => a.entityType === 'ARCHIVE' || /^ARCH_/.test(a.action || '') },
  { key: 'partenaires', label: 'Partenaires', tone: 'emerald', match: a => ['CONTACT', 'TRANSACTION', 'REMINDER'].includes(a.entityType || '') },
  { key: 'credit', label: 'Crédit', tone: 'rose', match: a => a.entityType === 'CREDIT' || /^CREDIT/.test(a.action || '') },
  { key: 'systeme', label: 'Système', tone: 'neutral', match: () => true },
];
const auditAccountOf = (a: AuditRow) => AUDIT_ACCOUNTS.find(x => x.match(a)) || AUDIT_ACCOUNTS[AUDIT_ACCOUNTS.length - 1];

// L'ordre compte : une suppression d'entrée reste une SUPPRESSION, et un
// transfert n'est ni une entrée ni une sortie ordinaire.
const AUDIT_SUBJECTS: { key: string; label: string; match: (a: AuditRow) => boolean }[] = [
  { key: 'suppression', label: 'Suppressions', match: a => /DELETE|WIPE|RETIRE/.test(a.action || '') },
  { key: 'transfert', label: 'Transferts', match: a => /TRANSFER|MIGRATE/.test(a.action || '') },
  // Une créance est de l'argent qu'on nous DOIT : elle n'entre pas dans le
  // solde. Elle a donc son propre sujet et n'est jamais comptée comme
  // une entrée verte — sinon le journal ferait croire à un encaissement.
  { key: 'creance', label: 'Créances', match: a => /RECEIVABLE/.test(a.action || '') },
  { key: 'entree', label: 'Entrées', match: a => /_IN(_|$)/.test(a.action || '') || /^Entrée/i.test(a.details || '') },
  { key: 'sortie', label: 'Sorties', match: a => /_OUT(_|$)/.test(a.action || '') || /^Sortie/i.test(a.details || '') },
  { key: 'confirmation', label: 'Confirmations', match: a => /SETTLE|RECEIVED|PAID/.test(a.action || '') },
  { key: 'modification', label: 'Modifications', match: a => /EDIT|UPDATE|POSTPON|RENAME/.test(a.action || '') },
  { key: 'creation', label: 'Créations', match: a => /^CREATE|_CREATE/.test(a.action || '') },
  { key: 'acces', label: 'Accès', match: a => /LOGIN|LOGOUT|PANIC|PASSWORD/.test(a.action || '') },
  { key: 'autre', label: 'Autres', match: () => true },
];
const auditSubjectOf = (a: AuditRow) => AUDIT_SUBJECTS.find(x => x.match(a)) || AUDIT_SUBJECTS[AUDIT_SUBJECTS.length - 1];

// Le montant est la seule chose qu'on cherche vraiment dans un journal de
// caisse. Il est fiable dans la copie JSON d'une suppression ; sinon on le
// relit dans la phrase, qui suit toujours les mêmes tournures.
const auditAmountOf = (a: AuditRow): number | null => {
  try { const o = JSON.parse(a.oldValue || 'null'); if (o && typeof o.amount === 'number') return o.amount; } catch { /* pas du JSON */ }
  try {
    const n = JSON.parse(a.newValue || 'null');
    if (Array.isArray(n)) { const t = n.reduce((s: number, x: any) => s + (Number(x?.amount) || 0), 0); if (t > 0) return t; }
  } catch { /* pas du JSON */ }
  const d = String(a.details || '');
  const m = d.match(/\b(?:de|total)\s+([\d]+(?:[.,]\d+)?)/i)
    || d.match(/TND\s*:\s*([\d]+(?:[.,]\d+)?)/i)
    || d.match(/\(([\d]+(?:[.,]\d+)?)\s*(?:IN|OUT)\)/i)
    || d.match(/([\d]+(?:[.,]\d+)?)\s*(?:TND|DT)\b/i);
  if (!m) return null;
  const v = parseFloat(String(m[1]).replace(',', '.'));
  return isFinite(v) && v > 0 ? v : null;
};

const auditFlowOf = (a: AuditRow): 'in' | 'out' | 'del' | null => {
  const act = String(a.action || ''), d = String(a.details || '');
  if (/DELETE|WIPE/.test(act)) return 'del';
  // Une créance ne bouge aucun solde : montant affiché en neutre, jamais en vert.
  if (/RECEIVABLE/.test(act)) return null;
  if (/TRANSFER_ARCHIVE/.test(act) || /^Sortie/i.test(d) || /_OUT(_|$)/.test(act)) return 'out';
  if (/_IN(_|$)|TRANSFER_IN/.test(act) || /^Entrée|^Réception|encaiss/i.test(d)) return 'in';
  return null;
};

const AUDIT_TONES: Record<string, { chip: string; rail: string }> = {
  blue: { chip: 'bg-blue-500/15 border-blue-500/40 text-blue-200', rail: 'bg-blue-500' },
  teal: { chip: 'bg-teal-500/15 border-teal-500/40 text-teal-200', rail: 'bg-teal-500' },
  amber: { chip: 'bg-amber-500/15 border-amber-500/40 text-amber-200', rail: 'bg-amber-500' },
  emerald: { chip: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200', rail: 'bg-emerald-500' },
  rose: { chip: 'bg-rose-500/15 border-rose-500/40 text-rose-200', rail: 'bg-rose-500' },
  neutral: { chip: 'bg-white/5 border-white/15 text-neutral-300', rail: 'bg-neutral-600' },
};

const TYPE_EXPLAIN: Record<string, string> = {
  HELD: "ENCAISSER : tu lui confies de l'argent à garder. Ton argent chez lui AUGMENTE (+).",
  RECEIVABLE: "À RECEVOIR : paiement prévu à une date future. Sert uniquement à créer un rappel — n'affecte aucun solde.",
  PAYABLE: "DÉCAISSER : tu reprends / dépenses de l'argent qu'il garde. Ton argent chez lui DIMINUE (−).",
};

// --- HELPER COMPONENTS ---
const StatCard = memo(({ label, val, type, activeFilter, onClick, style, note, extra }: any) => (
  <div 
    onClick={onClick}
    className={`bg-neutral-900/40 border border-neutral-800 p-4 rounded-2xl cursor-pointer transition-all active:scale-[0.97] hover:border-${style}-500/40 ${activeFilter === type ? `ring-2 ring-${style}-500/50 border-${style}-500/50` : ''}`}
  >
    <p className="text-[10px] font-black text-neutral-300 uppercase tracking-wider">{label}</p>
    <p className={`text-2xl font-black text-${style}-400 mt-2 tracking-tighter break-all leading-none`}>{val}</p>
    {extra && <p className="text-xs font-black text-amber-400 mt-1 tracking-tighter break-all">{extra}</p>}
    <p className={`text-[10px] text-${style}-300 font-black italic uppercase mt-1.5 tracking-tighter`}>{note}</p>
  </div>
));
StatCard.displayName = 'StatCard';

// Action card: no amount — a big tappable button that triggers a movement.
const ActionCard = memo(({ label, note, style, icon, onClick }: any) => (
  <button
    onClick={onClick}
    className={`bg-neutral-900/40 border border-neutral-800 p-4 rounded-2xl cursor-pointer transition-all active:scale-[0.97] hover:border-${style}-500/50 text-left flex flex-col gap-3 min-h-[104px] justify-between`}
  >
    <div className={`h-9 w-9 rounded-xl bg-${style}-500/15 text-${style}-300 flex items-center justify-center`}>{icon}</div>
    <div>
      <p className={`text-[11px] font-black text-${style}-300 uppercase tracking-wider`}>{label}</p>
      <p className="text-[9px] text-neutral-400 font-black italic uppercase mt-1 tracking-tighter">{note}</p>
    </div>
  </button>
));
ActionCard.displayName = 'ActionCard';

const PartnerNotes = memo(({ notes, formatRawCurrency, onAdd, onEdit, onDelete, compact }: any) => {
  const list = notes || [];
  return (
    <div className={`flex flex-col gap-2 ${compact ? '' : 'pt-1'}`}>
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-500 flex items-center gap-1.5"><Bell className="h-3 w-3" /> Notes · hors solde</p>
        {onAdd && <button onClick={(e) => { e.stopPropagation(); onAdd(); }} className="text-[9px] font-black uppercase tracking-widest text-sky-400 hover:text-sky-300 flex items-center gap-1 active:scale-95 transition"><Plus className="h-3 w-3" /> Note</button>}
      </div>
      {list.length === 0 ? (
        <p className="text-[10px] font-bold text-neutral-600 italic">Aucune note.</p>
      ) : list.map((n: any) => {
        const they = n.direction === 'THEY_OWE';
        return (
          <div key={n.id} onClick={(e) => e.stopPropagation()} className={`group/note flex items-start gap-2.5 p-2.5 rounded-xl border ${they ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
            <span className={`mt-0.5 h-6 w-6 shrink-0 rounded-lg flex items-center justify-center text-[10px] ${they ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>{they ? '↙' : '↗'}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[8px] font-black uppercase tracking-widest ${they ? 'text-emerald-400' : 'text-rose-400'}`}>{they ? 'Il me doit' : 'Je lui dois'}</span>
                {n.amount > 0 && <span className="text-[11px] font-black text-white tracking-tighter">{formatRawCurrency(n.amount, n.currencyCode)}</span>}
              </div>
              <p className="text-[11px] font-bold text-neutral-300 leading-snug break-words mt-0.5">{n.text}</p>
            </div>
            {(onEdit || onDelete) && (
              <div className="flex items-center gap-1 shrink-0 opacity-60 group-hover/note:opacity-100 transition">
                {onEdit && <button onClick={(e) => { e.stopPropagation(); onEdit(n); }} className="p-1.5 text-blue-400/70 hover:text-blue-300 rounded-lg transition active:scale-90"><Edit className="h-3.5 w-3.5" /></button>}
                {onDelete && <button onClick={(e) => { e.stopPropagation(); onDelete(n.id); }} className="p-1.5 text-rose-500/40 hover:text-rose-500 rounded-lg transition active:scale-90"><Trash2 className="h-3.5 w-3.5" /></button>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});
PartnerNotes.displayName = 'PartnerNotes';

const ContactCard = memo(({ c, formatUSD, formatRawCurrency, onEdit, onSelect, notes, noteAdjust, onAddNote, onEditNote, onDeleteNote }: any) => {
  const positive = c.netPositionUsd >= 0;
  const hasTnd = (c.heldBalanceTnd || 0) > 0.01;
  const noteUsd = noteAdjust?.usd || 0;
  const hasNoteAdjust = !!noteAdjust?.hasAny && Math.abs(noteUsd) > 0.01;
  const adjustedUsd = c.netPositionUsd + noteUsd;
  const adjPositive = adjustedUsd >= 0;
  const hasActivity = Math.abs(c.netPositionUsd) > 0.01 || c.heldBalanceUsd > 0.01 || c.receivableBalanceUsd > 0.01 || c.payableBalanceUsd > 0.01 || hasTnd || hasNoteAdjust;
  return (
  <div key={c.id} className={`bg-neutral-900 border p-6 rounded-[32px] flex flex-col gap-5 transition shadow-lg animate-fade-up ${hasActivity ? (positive ? 'border-emerald-500/20 hover:border-emerald-500/40' : 'border-rose-500/20 hover:border-rose-500/40') : 'border-neutral-800 hover:border-neutral-600'}`}>
    <div className="flex justify-between items-start gap-3">
      <div onClick={() => onSelect(c)} className="flex items-center gap-4 cursor-pointer group min-w-0 flex-1">
        <span className="text-4xl p-2 bg-neutral-950 border border-neutral-800 rounded-2xl group-hover:scale-110 transition duration-300 shrink-0">{c.emoji}</span>
        <div className="min-w-0">
          <p className="font-black text-white text-2xl uppercase tracking-tighter leading-none truncate">{c.name}</p>
          <p className="text-[11px] text-neutral-400 uppercase font-black tracking-[0.2em] mt-2 truncate">{c.country || 'GLOBAL'}</p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <button onClick={(e) => onEdit(e, c)} className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-blue-400 active:scale-90 transition shadow-md hover:bg-blue-500/10">
          <Edit className="h-5 w-5" />
        </button>
      </div>
    </div>
    <div onClick={() => onSelect(c)} className="cursor-pointer flex flex-col gap-4">
      <div className={`flex items-baseline justify-between rounded-2xl px-4 py-3 border ${(hasNoteAdjust ? adjPositive : positive) ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-300">Mon Argent{hasNoteAdjust ? ' + notes' : ''}</span>
        <div className="flex flex-col items-end">
          <span className={`text-xl font-black tracking-tighter ${(hasNoteAdjust ? adjPositive : positive) ? 'text-emerald-400' : 'text-rose-400'}`}>{formatUSD(hasNoteAdjust ? adjustedUsd : c.netPositionUsd)}</span>
          {hasNoteAdjust && <span className="text-[9px] font-black text-neutral-500 tracking-tighter">réel {formatUSD(c.netPositionUsd)} · notes {noteUsd >= 0 ? '+' : ''}{formatUSD(noteUsd)}</span>}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-[10px] text-center font-black uppercase tracking-tighter">
        <div className="flex flex-col gap-1"><p className="text-neutral-400">Encaissé</p>{c.heldBalanceUsd > 0.01 && <p className="text-emerald-400 font-black text-xs break-all">{formatUSD(c.heldBalanceUsd)}</p>}{hasTnd && <p className="text-amber-400 font-black text-xs break-all">{formatRawCurrency(c.heldBalanceTnd, 'TND')}</p>}{c.heldBalanceUsd <= 0.01 && !hasTnd && <p className="text-emerald-400 font-black text-xs break-all">{formatUSD(0)}</p>}</div>
        <div className="flex flex-col gap-1"><p className="text-neutral-400">Décaissé</p><p className="text-rose-400 font-black text-xs break-all">{formatUSD(c.payableBalanceUsd)}</p></div>
        <div className="flex flex-col gap-1"><p className="text-neutral-400">À recevoir</p><p className="text-blue-400 font-black text-xs break-all">{formatUSD(c.receivableBalanceUsd)}</p></div>
      </div>
    </div>
    <div className="border-t border-neutral-800/70 pt-4">
      <PartnerNotes notes={notes} formatRawCurrency={formatRawCurrency} onAdd={() => onAddNote(c)} onEdit={(n: any) => onEditNote(n, c.name)} onDelete={onDeleteNote} />
    </div>
  </div>
  );
});
ContactCard.displayName = 'ContactCard';

const EmptyState = memo(({ icon, title, subtitle }: any) => (
  <div className="flex flex-col items-center justify-center text-center gap-4 py-20 px-6 animate-fade-up">
    <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-[32px] text-neutral-600 shadow-inner">{icon}</div>
    <p className="text-sm font-black uppercase tracking-widest text-neutral-300">{title}</p>
    <p className="text-xs font-bold text-neutral-500 max-w-xs leading-relaxed">{subtitle}</p>
  </div>
));
EmptyState.displayName = 'EmptyState';

export default function MoneyHubApp({
  initialContacts = [], initialActiveCurrencies = [], initialTransactions = [], initialReminders = [], initialAuditTrails = [], initialUsers = [], initialMetrics = {}, initialCategories = [],
  initialTndMovements = [], initialTndForecast = null, initialTndUpcoming = [], initialTndDueSoon = [], initialTndOverdue = [],
  initialArchiveMovements = [], initialArchiveUpcoming = [], initialArchiveDueSoon = [], initialArchiveOverdue = [],
  initialPartnerNotes = [],
  initialBankAccounts = [], initialBankMovements = [],
  initialCredits = [],
  initialChinaTrack = null,
  initialPanicState = { isLocked: false, emergencyUsername: null, emergencySession: false }
}: any) {
  // --- AUTH & THEME ---
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [panicActivationOpen, setPanicActivationOpen] = useState(false);
  const [panicForm, setPanicForm] = useState({ currentPassword: '', emergencyUsername: '', emergencyPassword: '', emergencyPasswordConfirm: '' });
  const [panicError, setPanicError] = useState('');
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');
  
  useEffect(() => {
    (async () => {
      const cached = localStorage.getItem('hub_session_user');
      if (cached) { try { setCurrentUser(JSON.parse(cached)); } catch {} }
      try {
        const res: any = await getCurrentUser();
        if (res?.authenticated && res.user) {
          setCurrentUser(res.user);
          localStorage.setItem('hub_session_user', JSON.stringify(res.user));
        } else if (res?.authenticated === false) {
          setCurrentUser(null);
          localStorage.removeItem('hub_session_user');
        }
      } catch {}
    })();
  }, []);

  type AppSection = 'dashboard' | 'currencies' | 'contacts' | 'transactions' | 'reminders' | 'history' | 'settings' | 'treasury' | 'archive' | 'banque' | 'credit';
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [activeSection, setActiveSection] = useState<AppSection>('dashboard');
  // Assistants land directly on Treasury (only section they can access) and can never reach ARCHIVE.
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin' && activeSection !== 'treasury' && activeSection !== 'settings' && activeSection !== 'banque') {
      setActiveSection('treasury');
    }
  }, [currentUser, activeSection]);

  // One-time schema/data provisioning (admin only, non-destructive & idempotent).
  // These migrations already ran on production and are safe to skip on every load — we
  // guard with a localStorage flag so a returning admin does NOT pay 4 serial server
  // round-trips + a full refetch on each visit (major perceived-speed win). If they have
  // never run in this browser we run them once, in the background, WITHOUT blocking or
  // double-fetching (SSR already delivered fresh data via page.tsx).
  useEffect(() => {
    if (currentUser?.role !== 'admin') return;
    if (typeof window !== 'undefined' && localStorage.getItem('hub_migrations_done') === '1') return;
    (async () => {
      try {
        await ensureArchiveTable();
        await ensureReminderPlannedType();
        await migrateArchivePartnerToLedger();
        // Only removes the ARCHIVE partner once the ledger already holds the migrated movements.
        await retireArchivePartner();
        localStorage.setItem('hub_migrations_done', '1');
        await refreshHubState();
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.role]);

  // BANQUE tables provisioning — any logged-in user (assistants use Banque too).
  // Idempotent CREATE TABLE IF NOT EXISTS, guarded by a localStorage flag (runs once per browser).
  useEffect(() => {
    if (!currentUser) return;
    // Clé bumpée en v2 : l'ancien drapeau empêchait ensureBankTables() de tourner à
    // nouveau, donc les deux index manquants n'auraient jamais été créés sur un
    // navigateur déjà marqué. Un passage unique de plus, puis plus rien.
    if (typeof window !== 'undefined' && localStorage.getItem('hub_bank_tables_v2_done') === '1') return;
    (async () => {
      try {
        const res: any = await ensureBankTables();
        if (res?.success) { localStorage.setItem('hub_bank_tables_v2_done', '1'); await refreshHubState(); }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // CREDIT table provisioning — idempotent CREATE TABLE IF NOT EXISTS, once per browser.
  // Admin uniquement : l'action exige requireAdmin(), inutile de la déclencher chez un assistant.
  useEffect(() => {
    if (currentUser?.role !== 'admin') return;
    if (typeof window !== 'undefined' && localStorage.getItem('hub_credit_table_done') === '1') return;
    (async () => {
      try {
        const res: any = await ensureCreditTable();
        if (res?.success) { localStorage.setItem('hub_credit_table_done', '1'); await refreshHubState(); }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // --- DATA STATES ---
  const [contacts, setContacts] = useState(initialContacts);
  const [transactions, setTransactions] = useState(initialTransactions.map((t:any) => ({...t, createdAt: new Date(t.createdAt)})));
  const [metrics, setMetrics] = useState(initialMetrics);
  const [auditTrails, setAuditTrails] = useState(initialAuditTrails);
  // Filtres du journal d'audit — compte, sujet, auteur, période, recherche.
  const [auditAccount, setAuditAccount] = useState('all');
  const [auditSubject, setAuditSubject] = useState('all');
  const [auditUserFilter, setAuditUserFilter] = useState('all');
  const [auditPeriod, setAuditPeriod] = useState('all');
  const [auditSearch, setAuditSearch] = useState('');
  // Le tableau de bord n'a besoin que des dernières lignes. La page Audit, elle,
  // doit pouvoir remonter loin : on recharge en profondeur à son ouverture.
  const [auditDeepLoaded, setAuditDeepLoaded] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  // 254 lignes d'un coup font une page interminable. On en montre 50, puis on
  // en redonne 50 à la demande. Toute nouvelle sélection repart du haut.
  const [auditVisible, setAuditVisible] = useState(50);
  const [reminders, setReminders] = useState(initialReminders.map((r:any) => ({...r, dueDate: new Date(r.dueDate)})));
  const [tndMovements, setTndMovements] = useState(initialTndMovements?.map((m:any) => ({...m, createdAt: new Date(m.createdAt), scheduledFor: m.scheduledFor ? new Date(m.scheduledFor) : null })) || []);
  const [tndForecast, setTndForecast] = useState(initialTndForecast);
  const [tndUpcoming, setTndUpcoming] = useState<any[]>((initialTndUpcoming || []).map((m:any) => ({...m, createdAt: new Date(m.createdAt), scheduledFor: m.scheduledFor ? new Date(m.scheduledFor) : null })));
  const [tndDueSoon, setTndDueSoon] = useState<any[]>((initialTndDueSoon || []).map((m:any) => ({...m, createdAt: new Date(m.createdAt), scheduledFor: m.scheduledFor ? new Date(m.scheduledFor) : null })));
  const [tndOverdue, setTndOverdue] = useState<any[]>((initialTndOverdue || []).map((m:any) => ({...m, createdAt: new Date(m.createdAt), scheduledFor: m.scheduledFor ? new Date(m.scheduledFor) : null })));
  const hydrateMovement = (m:any) => ({...m, createdAt: new Date(m.createdAt), scheduledFor: m.scheduledFor ? new Date(m.scheduledFor) : null });
  const [archiveMovements, setArchiveMovements] = useState<any[]>((initialArchiveMovements || []).map(hydrateMovement));
  const [archiveUpcoming, setArchiveUpcoming] = useState<any[]>((initialArchiveUpcoming || []).map(hydrateMovement));
  const [archiveDueSoon, setArchiveDueSoon] = useState<any[]>((initialArchiveDueSoon || []).map(hydrateMovement));
  const [archiveOverdue, setArchiveOverdue] = useState<any[]>((initialArchiveOverdue || []).map(hydrateMovement));
  const [partnerNotes, setPartnerNotes] = useState<any[]>(initialPartnerNotes || []);
  const [noteModal, setNoteModal] = useState<{ open: boolean; contactId?: string; contactName?: string; editId?: string }>({ open: false });
  const [noteForm, setNoteForm] = useState<{ direction: string; amount: string; currencyCode: string; text: string }>({ direction: 'THEY_OWE', amount: '', currencyCode: 'TND', text: '' });
  // BANQUE — named bank accounts + their movements (mirrors treasury, per selected account).
  const [bankAccounts, setBankAccounts] = useState<any[]>(initialBankAccounts || []);
  const [bankMovements, setBankMovements] = useState<any[]>((initialBankMovements || []).map(hydrateMovement));
  const [selectedBankId, setSelectedBankId] = useState<string | null>((initialBankAccounts || [])[0]?.id || null);
  const [bankForm, setBankForm] = useState<{ amount: string; type: string; note: string; scheduledFor?: string }>({ amount: '', type: 'IN', note: '', scheduledFor: '' });
  const [bankBatchItems, setBankBatchItems] = useState<Array<{ amount: string; note: string }>>([{ amount: '', note: '' }]);
  const [bankNoteEdit, setBankNoteEdit] = useState<{ id: string; note: string; amount: number; type: string } | null>(null);
  const [bankNoteEditError, setBankNoteEditError] = useState('');
  const [bankSearch, setBankSearch] = useState('');
  const [bankPeriod, setBankPeriod] = useState<'today' | '7d' | '30d' | 'all'>('all');
  const [bankTypeFilter, setBankTypeFilter] = useState<'all' | 'IN' | 'OUT'>('all');
  // CREDIT — sommes à payer plus tard, sans échéance. Registre 100% indépendant :
  // n'alimente aucun autre total de la plateforme.
  const hydrateCredit = (c: any) => ({ ...c, createdAt: new Date(c.createdAt), paidAt: c.paidAt ? new Date(c.paidAt) : null });
  const [credits, setCredits] = useState<any[]>((initialCredits || []).map(hydrateCredit));
  // CHINA TRACK - paiements fournisseurs a venir (lecture seule, source la-bas).
  const [chinaTrack, setChinaTrack] = useState<any>(initialChinaTrack);
  // Quel contrat CHINA TRACK est déplié (survol souris ou tap sur mobile).
  const [ctOpen, setCtOpen] = useState<string | null>(null);
  // Ancre à rejoindre APRÈS un changement de section : navigateTo() remet le
  // scroll en haut, donc arriver « sur la bonne info » demande un second temps.
  const [pendingAnchor, setPendingAnchor] = useState<string | null>(null);
  const [creditForm, setCreditForm] = useState<{ id?: string; amount: string; beneficiary: string; note: string }>({ amount: '', beneficiary: '', note: '' });
  const [creditError, setCreditError] = useState('');
  const [creditSearch, setCreditSearch] = useState('');
  const [creditView, setCreditView] = useState<'open' | 'paid' | 'all'>('open');
  const [newAccountForm, setNewAccountForm] = useState<{ name: string; currencyCode: string }>({ name: '', currencyCode: 'TND' });
  const [renameAccountId, setRenameAccountId] = useState<string | null>(null);
  const [renameAccountName, setRenameAccountName] = useState('');
  // Ephemeral success/error feedback banner (auto-dismisses).
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);
  const showToast = useCallback((kind: 'success' | 'error', msg: string) => {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 3800);
  }, []);
  // Pending bank action awaiting explicit confirmation (anti-mistake dialog).
  const [bankConfirm, setBankConfirm] = useState<{ accountId: string; accountName: string; currencyCode: string; type: 'IN' | 'OUT'; amount: number; note: string; count?: number; scheduledFor?: string; run: () => void } | null>(null);

  const [optimisticTransactions, addOptimisticTransaction] = useOptimistic(transactions, (state: any, newTx: any) => 
    newTx.action === 'delete' ? state.filter((t:any) => t.id !== newTx.id) : [newTx, ...state]
  );
  const [optimisticContacts, addOptimisticContact] = useOptimistic(contacts, (state: any, newContact: any) => 
    newContact.action === 'delete' ? state.filter((c:any) => c.id !== newContact.id) : [...state, newContact]
  );
  const [optimisticTndMovements, addOptimisticTndMovement] = useOptimistic(tndMovements, (state: any, newM: any) => 
    newM.action === 'delete' ? state.filter((m:any) => m.id !== newM.id) : [newM, ...state]
  );
  const [optimisticArchiveMovements, addOptimisticArchiveMovement] = useOptimistic(archiveMovements, (state: any, newM: any) =>
    newM.action === 'delete' ? state.filter((m:any) => m.id !== newM.id) : [newM, ...state]
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [isPending, startTransition] = useTransition();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  // In the account chooser, which entry is expanded to pick a direction (IN/OUT).
  // 'treasury' | 'archive' | `bank:<accountId>` — bank accounts are per-account.
  const [chooserExpand, setChooserExpand] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [contactFilterType, setContactFilterType] = useState<'ALL' | 'HELD' | 'RECEIVABLE' | 'PAYABLE'>('ALL');
  const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false });
  const [confirmPassword, setConfirmPassword] = useState('');

  const [transactionForm, setTransactionForm] = useState({ 
    contactId: '', amount: '', currencyCode: 'USD', type: 'HELD', category: 'Virement', note: '',
    isPostponed: false, dueDate: '', reminderEmail: '', plannedType: 'RECEIVABLE'
  });
  const [contactForm, setContactForm] = useState({ id: '', name: '', emoji: '👤', country: '', isArchived: false });
  const [postponeTarget, setPostponeTarget] = useState<any>(null);
  const [postponeDate, setPostponeDate] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showTotalTnd, setShowTotalTnd] = useState(false);
  const [drawerTypeFilter, setDrawerTypeFilter] = useState<string | null>(null);
  const [inlineNewPartner, setInlineNewPartner] = useState(false);
  const [inlinePartnerName, setInlinePartnerName] = useState('');
  const [inlinePartnerCountry, setInlinePartnerCountry] = useState('');
  const [tndForm, setTndForm] = useState<{ amount: string; type: string; note: string; scheduledFor?: string }>({ amount: '', type: 'IN', note: '', scheduledFor: '' });
  const [tndBatchItems, setTndBatchItems] = useState<Array<{ amount: string; note: string }>>([{ amount: '', note: '' }]);
  const [transferForm, setTransferForm] = useState<{ amount: string; note: string }>({ amount: '', note: '' });
  const [receivableForm, setReceivableForm] = useState<{ amount: string; note: string }>({ amount: '', note: '' });
  const [tndNoteEdit, setTndNoteEdit] = useState<{ id: string; note: string; amount: number; type: string } | null>(null);
  const [tndNoteEditError, setTndNoteEditError] = useState('');
  // TND Treasury filters
  const [tndSearch, setTndSearch] = useState('');
  const [tndPeriod, setTndPeriod] = useState<'today' | '7d' | '30d' | 'all'>('all');
  const [tndUserFilter, setTndUserFilter] = useState<string>('all');
  const [tndAmountMin, setTndAmountMin] = useState<string>('');
  const [tndAmountMax, setTndAmountMax] = useState<string>('');
  const [tndTypeFilter, setTndTypeFilter] = useState<'all' | 'IN' | 'OUT'>('all');
  // ARCHIVE ledger form + filters (mirror the treasury)
  const [archiveForm, setArchiveForm] = useState<{ amount: string; type: string; note: string; scheduledFor?: string }>({ amount: '', type: 'IN', note: '', scheduledFor: '' });
  const [archiveBatchItems, setArchiveBatchItems] = useState<Array<{ amount: string; note: string }>>([{ amount: '', note: '' }]);
  const [archiveNoteEdit, setArchiveNoteEdit] = useState<{ id: string; note: string; amount: number; type: string } | null>(null);
  const [archiveNoteEditError, setArchiveNoteEditError] = useState('');
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archivePeriod, setArchivePeriod] = useState<'today' | '7d' | '30d' | 'all'>('all');
  const [archiveUserFilter, setArchiveUserFilter] = useState<string>('all');
  const [archiveAmountMin, setArchiveAmountMin] = useState<string>('');
  const [archiveAmountMax, setArchiveAmountMax] = useState<string>('');
  const [archiveTypeFilter, setArchiveTypeFilter] = useState<'all' | 'IN' | 'OUT'>('all');
  // Password management modal
  const [pwdModal, setPwdModal] = useState<{ open: boolean; targetId?: string; targetName?: string; mode?: 'self' | 'admin_reset' }>({ open: false });

  // --- NAVIGATION ---
  const [navStack, setNavStack] = useState<string[]>(['dashboard']);
  const [navPos, setNavPos] = useState(0);
  const canGoBack = navPos > 0;
  const canGoForward = navPos < navStack.length - 1;

  // Va DANS la section, puis descend jusqu'à l'ancre demandée. Sans ce second
  // temps, un clic depuis le Dashboard dépose l'utilisateur en haut de DEVISES,
  // à lui de retrouver le bloc — exactement ce qu'on veut éviter.
  useEffect(() => {
    if (!pendingAnchor) return;
    const id = pendingAnchor;
    const raf = requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setPendingAnchor(null);
    });
    return () => cancelAnimationFrame(raf);
  }, [pendingAnchor, activeSection]);

  const navigateTo = useCallback((section: string) => {
    // Every menu destination opens at its own top, never at the previous screen's scroll position.
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    setActiveSection(section as any);
    setNavStack(prev => {
      if (prev[navPos] === section) return prev;
      const truncated = prev.slice(0, navPos + 1);
      truncated.push(section);
      setNavPos(truncated.length - 1);
      return truncated;
    });
  }, [navPos]);

  // Recharge le journal en profondeur (500 lignes au lieu des 40 du tableau de
  // bord). Réservé à l'administrateur côté serveur ; si l'appel échoue on garde
  // simplement les lignes déjà affichées.
  const loadDeepAudit = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await fetch(`/api/dashboard-data?auditLimit=500&t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.auditTrails)) { setAuditTrails(data.auditTrails); setAuditDeepLoaded(true); }
      }
    } catch { /* on garde l'affichage courant */ }
    finally { setAuditLoading(false); }
  }, []);

  useEffect(() => {
    if (activeSection === 'history' && !auditDeepLoaded && !auditLoading) void loadDeepAudit();
  }, [activeSection, auditDeepLoaded, auditLoading, loadDeepAudit]);

  useEffect(() => { setAuditVisible(50); }, [auditAccount, auditSubject, auditUserFilter, auditPeriod, auditSearch]);

  // Ouvre une section ET descend jusqu'au bloc voulu.
  const goToAnchor = useCallback((section: string, anchorId: string) => {
    setPendingAnchor(anchorId);
    navigateTo(section);
  }, [navigateTo]);

  const closeTopOverlay = useCallback(() => {
    if (tndNoteEdit) { setTndNoteEdit(null); return true; }
    if (archiveNoteEdit) { setArchiveNoteEdit(null); return true; }
    if (postponeTarget) { setPostponeTarget(null); return true; }
    if (confirmModal.isOpen) { setConfirmModal({ isOpen: false }); return true; }
    if (activeModal) { setActiveModal(null); return true; }
    if (showNotifications) { setShowNotifications(false); return true; }
    if (selectedContact) { setSelectedContact(null); setDrawerTypeFilter(null); return true; }
    return false;
  }, [tndNoteEdit, postponeTarget, confirmModal, activeModal, showNotifications, selectedContact]);

  const goBack = useCallback(() => {
    if (closeTopOverlay()) return;
    setNavPos(prev => {
      if (prev <= 0) return prev;
      const next = prev - 1;
      setActiveSection(navStack[next] as any);
      return next;
    });
  }, [closeTopOverlay, navStack]);

  const goForward = useCallback(() => {
    setNavPos(prev => {
      if (prev >= navStack.length - 1) return prev;
      const next = prev + 1;
      setActiveSection(navStack[next] as any);
      return next;
    });
  }, [navStack]);

  useEffect(() => {
    const onPop = (e: any) => { e.preventDefault(); goBack(); window.history.pushState({ hub: true }, ''); };
    window.history.pushState({ hub: true }, '');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [goBack]);

  // fr-FR groups thousands with a narrow no-break space (U+202F) that often renders as
  // no visible gap. Force a normal space so "12000" always shows as "12 000".
  const groupSep = (s: string) => s.replace(/[\u202f\u00a0]/g, ' ');
  const formatUSD = useCallback((val: number) => groupSep(new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)), []);
  const formatRawCurrency = useCallback((val: number, curr: string) => {
    // Tunisian convention: amount first, then DT (e.g. "11 130 DT").
    // Les millimes s'affichent UNIQUEMENT s'il y en a. Arrondir systématiquement au
    // dinar entier cachait une saisie fractionnaire : l'écran et la base pouvaient
    // alors dire deux choses différentes sans que rien ne le signale. Un compte de
    // caisse doit pouvoir être vérifié au millime près.
    if (curr === 'TND') {
      const hasMillimes = Math.abs(val - Math.round(val)) > 0.0005;
      const digits = hasMillimes ? 3 : 0;
      const amount = groupSep(new Intl.NumberFormat('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(val));
      return `${amount} DT`;
    }
    const amount = groupSep(new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(val));
    const symbol = CURRENCY_SYMBOLS[curr] || curr;
    return `${symbol} ${amount}`;
  }, []);

  // Quand la plateforme a relu les donnees pour la derniere fois. Sert a ne
  // pas relancer un chargement complet a chaque fois que l'app repasse devant.
  const lastRefreshRef = useRef<number>(Date.now());

  const refreshHubState = async () => {
    lastRefreshRef.current = Date.now();
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/dashboard-data?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts);
        // Keep an open partner drawer in sync: its balances must reflect newly added
        // operations, not the stale snapshot captured when the drawer was opened.
        setSelectedContact((current: any) => {
          if (!current) return current;
          const fresh = (data.contacts || []).find((c: any) => c.id === current.id)
            || (data.allContacts || []).find((c: any) => c.id === current.id);
          return fresh || current;
        });
        setTransactions(data.transactions.map((t: any) => ({ ...t, createdAt: new Date(t.createdAt) })));
        setMetrics(data.metrics);
        setAuditTrails(data.auditTrails || []);
        setReminders(data.reminders.map((r: any) => ({ ...r, dueDate: new Date(r.dueDate) })));
        const hydrateTnd = (m: any) => ({ ...m, createdAt: new Date(m.createdAt), scheduledFor: m.scheduledFor ? new Date(m.scheduledFor) : null });
        setTndMovements((data.tndMovements || []).map(hydrateTnd));
        setTndForecast(data.tndForecast);
        setTndUpcoming((data.tndUpcoming || []).map(hydrateTnd));
        setTndDueSoon((data.tndDueSoon || []).map(hydrateTnd));
        setTndOverdue((data.tndOverdue || []).map(hydrateTnd));
        setArchiveMovements((data.archiveMovements || []).map(hydrateTnd));
        setArchiveUpcoming((data.archiveUpcoming || []).map(hydrateTnd));
        setArchiveDueSoon((data.archiveDueSoon || []).map(hydrateTnd));
        setArchiveOverdue((data.archiveOverdue || []).map(hydrateTnd));
        setPartnerNotes(data.partnerNotes || []);
        setBankAccounts(data.bankAccounts || []);
        setBankMovements((data.bankMovements || []).map(hydrateTnd));
        setCredits((data.credits || []).map((c: any) => ({ ...c, createdAt: new Date(c.createdAt), paidAt: c.paidAt ? new Date(c.paidAt) : null })));
        setChinaTrack(data.chinaTrack ?? null);
      }
    } catch (e) { console.error(e); }
    finally { setTimeout(() => setIsRefreshing(false), 500); }
  };

  // RETOUR AU PREMIER PLAN = RELECTURE.
  //
  // Le bloc CHINA TRACK vient d'une AUTRE application et n'est jamais stocke
  // ici : il n'existe que le temps d'un chargement. Sur telephone, l'app reste
  // ouverte des heures ; on enregistrait donc un paiement chez CHINA TRACK,
  // on revenait ici, et le montant affiche etait celui d'avant — sans erreur,
  // sans avertissement, juste un chiffre perime sur un ecran d'argent.
  //
  // Une relecture par minute au maximum : rouvrir l'app dix fois de suite ne
  // doit pas declencher dix chargements complets.
  useEffect(() => {
    if (!currentUser) return;
    const wake = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      if (Date.now() - lastRefreshRef.current < 60000) return;
      refreshHubState();
    };
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('focus', wake);
    return () => {
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('focus', wake);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // L'AGE DU CHIFFRE CHINA TRACK, ecrit noir sur blanc.
  // generatedAt est l'heure a laquelle CHINA TRACK a calcule ces montants.
  // Le compteur se reveille toutes les 30 s pour que le texte vieillisse tout
  // seul a l'ecran, meme si personne ne touche a rien.
  const [freshnessTick, setFreshnessTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFreshnessTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);
  const chinaFresh = useMemo(() => {
    void freshnessTick;
    const raw = (chinaTrack as any)?.generatedAt;
    const t = raw ? new Date(raw).getTime() : NaN;
    if (!Number.isFinite(t)) return { label: null as string | null, stale: false };
    const min = Math.max(0, Math.floor((Date.now() - t) / 60000));
    const label = min < 1 ? "a l'instant" : min < 60 ? `il y a ${min} min` : `il y a ${Math.floor(min / 60)} h`;
    return { label, stale: min >= 10 };
  }, [chinaTrack, freshnessTick]);

  // One-time cleanup: remove the word "BIAT" from the two bank account names while keeping
  // the BIAT logo badge as the visual bank identifier.
  useEffect(() => {
    if (!currentUser) return;
    if (typeof window !== 'undefined' && localStorage.getItem('hub_bank_remove_biat_word_done') === '1') return;
    const renamePairs: Record<string, string> = {
      'BIAT VLT MOTORS': 'VLT MOTORS',
      'BIAT VOLTROP INDUSTRIES': 'VOLTROP INDUSTRIES',
    };
    const targets = (bankAccounts || []).filter((a: any) => renamePairs[(a.name || '').trim().toUpperCase()]);
    if (targets.length === 0) return;
    (async () => {
      try {
        for (const target of targets) {
          const fd = new FormData();
          fd.append('id', target.id);
          fd.append('name', renamePairs[(target.name || '').trim().toUpperCase()]);
          await renameBankAccount(fd);
        }
        localStorage.setItem('hub_bank_remove_biat_word_done', '1');
        await refreshHubState();
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, bankAccounts]);

  const openAddNote = (contactId: string, contactName: string) => { setNoteForm({ direction: 'THEY_OWE', amount: '', currencyCode: 'TND', text: '' }); setNoteModal({ open: true, contactId, contactName }); };
  const openEditNote = (n: any, contactName: string) => { setNoteForm({ direction: n.direction, amount: String(n.amount || ''), currencyCode: n.currencyCode || 'TND', text: n.text }); setNoteModal({ open: true, contactId: n.contactId, contactName, editId: n.id }); };
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteForm.text.trim()) return;
    startTransition(async () => {
      const data = new FormData();
      data.append('direction', noteForm.direction);
      data.append('amount', noteForm.amount || '0');
      data.append('currencyCode', noteForm.currencyCode);
      data.append('text', noteForm.text);
      let res: any;
      if (noteModal.editId) { data.append('id', noteModal.editId); res = await updatePartnerNote(data); }
      else { data.append('contactId', noteModal.contactId!); res = await createPartnerNote(data); }
      if (res.success) { setNoteModal({ open: false }); await refreshHubState(); }
      else if (res.code) handleSessionExpired(); else alert(res.error || 'Erreur');
    });
  };
  const handleDeleteNote = (id: string) => {
    setConfirmModal({ isOpen: true, title: 'Supprimer la note ?', description: 'Cette note informelle sera supprimée.', confirmText: 'Supprimer', isDanger: true, onConfirm: async () => { startTransition(async () => { const res: any = await deletePartnerNote(id); if (res.success) await refreshHubState(); else if (res.code) handleSessionExpired(); else alert(res.error); }); } });
  };

  const handleLogout = async () => { try { await logoutUser(); } catch {} setCurrentUser(null); localStorage.removeItem('hub_session_user'); };
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData(); data.append('username', loginForm.username); data.append('password', loginForm.password);
    const res = await loginUser(data);
    if (res.success && res.user) {
      setCurrentUser(res.user);
      localStorage.setItem('hub_session_user', JSON.stringify(res.user));
      // Normal sessions need a server reload to receive authenticated data; emergency goes to its zero-data console.
      window.location.reload();
    } else setLoginError(res.error || 'Identifiants invalides');
  };

  const handleSessionExpired = () => { setActiveModal(null); setCurrentUser(null); localStorage.removeItem('hub_session_user'); alert('Session expirée. Veuillez vous reconnecter.'); };

  const handleActivatePanicLock = async (e: React.FormEvent) => {
    e.preventDefault();
    setPanicError('');
    const fd = new FormData();
    fd.set('currentPassword', panicForm.currentPassword);
    fd.set('emergencyUsername', panicForm.emergencyUsername);
    fd.set('emergencyPassword', panicForm.emergencyPassword);
    fd.set('emergencyPasswordConfirm', panicForm.emergencyPasswordConfirm);
    const res: any = await activatePanicLock(fd);
    if (!res.success) { setPanicError(res.error || 'Activation impossible'); return; }
    // The server already invalidated this very session; purge local identity and load zero-data lock screen.
    localStorage.removeItem('hub_session_user');
    setCurrentUser(null);
    window.location.reload();
  };

  const handleUnlockPanicLock = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError('');
    const fd = new FormData(); fd.set('emergencyPassword', unlockPassword);
    const res: any = await unlockPanicLock(fd);
    if (!res.success) { setUnlockError(res.error || 'Déverrouillage impossible'); return; }
    localStorage.removeItem('hub_session_user');
    window.location.reload();
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const contact = contacts.find((c:any) => c.id === transactionForm.contactId);
    const amount = parseFloat(transactionForm.amount);
    startTransition(async () => {
      // Any PLANNED movement (encaisser / décaisser / rappel simple) is stored as a
      // reminder carrying its plannedType; it only hits the balance when confirmed.
      if (transactionForm.isPostponed) {
        const data = new FormData();
        Object.entries(transactionForm).forEach(([k,v]) => data.append(k, v as any));
        // The planned movement carries its direction (ENCAISSER=HELD / DÉCAISSER=PAYABLE).
        data.set('plannedType', transactionForm.type);
        const res: any = await createReminder(data);
        if (res.success) { setTransactionForm({ ...transactionForm, amount: '', note: '', isPostponed: false }); setActiveModal(null); await refreshHubState(); }
        else if (res.code) handleSessionExpired(); else alert(res.error);
        return;
      }
      addOptimisticTransaction({ id: Math.random().toString(), amount, currencyCode: transactionForm.currencyCode, amountInUsd: amount, contact, type: transactionForm.type, category: transactionForm.category, note: transactionForm.note, createdAt: new Date() });
      const data = new FormData(); Object.entries(transactionForm).forEach(([k,v]) => data.append(k, v as any));
      const res: any = await createHubTransaction(data);
      if (res.success) { 
        setTransactionForm({ ...transactionForm, amount: '', note: '' }); setActiveModal(null); await refreshHubState(); 
      } else if (res.code) handleSessionExpired(); else alert(res.error);
    });
  };


  const handleAddTndMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tndForm.amount || !tndForm.note.trim()) return;
    startTransition(async () => {
      const amount = parseFloat(tndForm.amount);
      const scheduled = (tndForm as any).scheduledFor as string | undefined;
      const isPlanned = !!scheduled;
      // Optimistic entry — planned ones show up as unsettled so they don't inflate the balance
      addOptimisticTndMovement({ id: 'temp-' + Date.now(), amount, type: tndForm.type, note: tndForm.note, performedBy: currentUser.username, createdAt: new Date(), scheduledFor: isPlanned ? new Date(scheduled!) : null, isSettled: !isPlanned });
      const data = new FormData();
      data.append('amount', tndForm.amount);
      data.append('type', tndForm.type);
      data.append('note', tndForm.note);
      if (isPlanned) data.append('scheduledFor', scheduled!);
      data.append('clientToday', localDayKey());
      const res: any = await createTndMovement(data);
      if (res.success) { setTndForm({ amount: '', type: 'IN', note: '' } as any); setActiveModal(null); await refreshHubState(); }
      else if (res.code) handleSessionExpired(); else alert(res.error || 'Erreur');
    });
  };

  const handleTransferToArchive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferForm.amount || !transferForm.note.trim()) return;
    startTransition(async () => {
      const amount = parseFloat(transferForm.amount);
      const data = new FormData();
      data.append('amount', transferForm.amount);
      data.append('note', transferForm.note);
      const res: any = await transferTreasuryToArchive(data);
      if (res.success) { setTransferForm({ amount: '', note: '' }); setActiveModal(null); await refreshHubState(); }
      else if (res.code) handleSessionExpired(); else alert(res.error || 'Erreur');
      void amount;
    });
  };

  const handleAddReceivable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivableForm.amount || !receivableForm.note.trim()) return;
    startTransition(async () => {
      const amount = parseFloat(receivableForm.amount);
      addOptimisticTndMovement({ id: 'temp-recv-' + Date.now(), amount, type: 'IN', note: `${TND_RECEIVABLE_TAG} · ${receivableForm.note}`, performedBy: currentUser.username, createdAt: new Date(), scheduledFor: null, isSettled: false });
      const data = new FormData();
      data.append('amount', receivableForm.amount);
      data.append('note', receivableForm.note);
      const res: any = await createTndReceivable(data);
      if (res.success) { setReceivableForm({ amount: '', note: '' }); setActiveModal(null); await refreshHubState(); }
      else if (res.code) handleSessionExpired(); else alert(res.error || 'Erreur');
    });
  };

  // ---------- BANQUE handlers (mirror Trésorerie, scoped to selectedBankId) ----------
  const handleCreateBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountForm.name.trim()) return;
    startTransition(async () => {
      const data = new FormData();
      data.append('name', newAccountForm.name.trim());
      data.append('currencyCode', newAccountForm.currencyCode);
      const res: any = await createBankAccount(data);
      if (res.success) { const nm = newAccountForm.name.trim(); setNewAccountForm({ name: '', currencyCode: 'TND' }); setActiveModal(null); if (res.account?.id) setSelectedBankId(res.account.id); await refreshHubState(); showToast('success', `Compte « ${nm} » créé`); }
      else if (res.code) handleSessionExpired(); else showToast('error', res.error || 'Erreur');
    });
  };
  const handleRenameBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameAccountId || !renameAccountName.trim()) return;
    startTransition(async () => {
      const data = new FormData();
      data.append('id', renameAccountId);
      data.append('name', renameAccountName.trim());
      const res: any = await renameBankAccount(data);
      if (res.success) { setRenameAccountId(null); setRenameAccountName(''); setActiveModal(null); await refreshHubState(); showToast('success', 'Compte renommé'); }
      else if (res.code) handleSessionExpired(); else showToast('error', res.error || 'Erreur');
    });
  };
  const handleDeleteBankAccount = (id: string, name: string) => {
    setConfirmModal({ isOpen: true, title: 'Supprimer le compte ?', description: `« ${name} » et TOUS ses mouvements seront supprimés définitivement.`, confirmText: 'Supprimer', isDanger: true, onConfirm: async () => { startTransition(async () => { const res: any = await deleteBankAccount(id); if (res.success) { if (selectedBankId === id) setSelectedBankId(bankAccounts.find((a:any) => a.id !== id)?.id || null); await refreshHubState(); showToast('success', `Compte « ${name} » supprimé`); } else if (res.code) handleSessionExpired(); else showToast('error', res.error); }); } });
  };
  // Step 1: validate + open the anti-mistake confirmation dialog (shows account, type, amount).
  const handleAddBankMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBankId || !bankForm.amount || !bankForm.note.trim()) return;
    const acc = bankAccounts.find((a: any) => a.id === selectedBankId);
    if (!acc) { showToast('error', 'Compte introuvable'); return; }
    const amount = parseFloat(bankForm.amount);
    const scheduled = bankForm.scheduledFor || '';
    setBankConfirm({
      accountId: acc.id, accountName: acc.name, currencyCode: acc.currencyCode,
      type: bankForm.type as 'IN' | 'OUT', amount, note: bankForm.note, scheduledFor: scheduled,
      run: () => performAddBankMovement(acc.id, amount, bankForm.type, bankForm.note, scheduled, acc.name),
    });
  };
  // Step 2: actually write it (only after explicit confirmation).
  const performAddBankMovement = (accountId: string, amount: number, type: string, note: string, scheduled: string, accName: string) => {
    startTransition(async () => {
      const isPlanned = !!scheduled;
      setBankMovements(prev => [{ id: 'temp-bank-' + Date.now(), accountId, amount, type, note, performedBy: currentUser.username, createdAt: new Date(), scheduledFor: isPlanned ? new Date(scheduled) : null, isSettled: !isPlanned }, ...prev]);
      const data = new FormData();
      data.append('accountId', accountId);
      data.append('amount', String(amount));
      data.append('type', type);
      data.append('note', note);
      if (isPlanned) data.append('scheduledFor', scheduled);
      data.append('clientToday', localDayKey());
      const res: any = await createBankMovement(data);
      if (res.success) { setBankForm({ amount: '', type: 'IN', note: '', scheduledFor: '' }); setActiveModal(null); setBankConfirm(null); await refreshHubState(); showToast('success', `${type === 'IN' ? 'Entrée' : 'Sortie'} de ${formatRawCurrency(amount, '')}enregistrée · ${accName}`); }
      else if (res.code) handleSessionExpired(); else { setBankConfirm(null); showToast('error', res.error || 'Erreur'); }
    });
  };
  const handleAddBankBatchDisbursement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBankId) return;
    const invalid = bankBatchItems.find(item => !item.note.trim() || !item.amount || Number(item.amount) <= 0);
    if (invalid) { showToast('error', 'Chaque ligne doit avoir un montant positif et une note.'); return; }
    const acc = bankAccounts.find((a: any) => a.id === selectedBankId);
    if (!acc) { showToast('error', 'Compte introuvable'); return; }
    const scheduled = bankForm.scheduledFor || '';
    const validItems = bankBatchItems.map(item => ({ amount: Number(item.amount), note: item.note.trim() }));
    const total = validItems.reduce((s, it) => s + it.amount, 0);
    setBankConfirm({
      accountId: acc.id, accountName: acc.name, currencyCode: acc.currencyCode,
      type: 'OUT', amount: total, note: `${validItems.length} sorties`, count: validItems.length, scheduledFor: scheduled,
      run: () => performAddBankBatch(acc.id, validItems, scheduled, acc.name, total),
    });
  };
  const performAddBankBatch = (accountId: string, validItems: Array<{amount:number;note:string}>, scheduled: string, accName: string, total: number) => {
    startTransition(async () => {
      const data = new FormData();
      data.append('accountId', accountId);
      data.append('items', JSON.stringify(validItems));
      if (scheduled) data.append('scheduledFor', scheduled);
      data.append('clientToday', localDayKey());
      const res: any = await createBankBatchDisbursement(data);
      if (res.success) { setBankBatchItems([{ amount: '', note: '' }]); setBankForm({ amount: '', type: 'OUT', note: '', scheduledFor: '' }); setActiveModal(null); setBankConfirm(null); await refreshHubState(); showToast('success', `${validItems.length} sorties enregistrées · ${accName}`); }
      else if (res.code) handleSessionExpired(); else { setBankConfirm(null); showToast('error', res.error || 'Erreur'); }
    });
  };
  const handleSettleBankMovement = (id: string) => { startTransition(async () => { const res: any = await settleBankMovement(id); if (res.success) { await refreshHubState(); showToast('success', 'Mouvement confirmé'); } else if (res.code) handleSessionExpired(); else showToast('error', res.error || 'Erreur'); }); };
  const handleDeleteBankMovement = (id: string) => { setConfirmModal({ isOpen: true, title: 'Supprimer le mouvement ?', description: 'Ce mouvement bancaire sera supprimé définitivement.', confirmText: 'Supprimer', isDanger: true, onConfirm: async () => { startTransition(async () => { const res: any = await deleteBankMovement(id); if (res.success) { await refreshHubState(); showToast('success', 'Mouvement supprimé'); } else if (res.code) handleSessionExpired(); else showToast('error', res.error); }); } }); };
  const handleSaveBankNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankNoteEdit) return;
    setBankNoteEditError('');
    startTransition(async () => {
      const res: any = await updateBankMovementNote(bankNoteEdit.id, bankNoteEdit.note);
      if (res.success) { setBankNoteEdit(null); await refreshHubState(); showToast('success', 'Note modifiée'); }
      else if (res.code) handleSessionExpired(); else setBankNoteEditError(res.error || 'Erreur');
    });
  };

  const handleAddTndBatchDisbursement = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalid = tndBatchItems.find(item => !item.note.trim() || !item.amount || Number(item.amount) <= 0);
    if (invalid) { alert('Chaque ligne doit avoir un montant positif et une note obligatoire.'); return; }
    startTransition(async () => {
      const scheduled = tndForm.scheduledFor || '';
      const isPlanned = !!scheduled;
      const validItems = tndBatchItems.map(item => ({ amount: Number(item.amount), note: item.note.trim() }));
      // Optimistic rows keep the journal instant; server transaction guarantees all-or-nothing persistence.
      validItems.forEach((item, index) => addOptimisticTndMovement({
        id: `temp-batch-${Date.now()}-${index}`, amount: item.amount, type: 'OUT', note: item.note,
        performedBy: currentUser.username, createdAt: new Date(), scheduledFor: isPlanned ? new Date(scheduled) : null, isSettled: !isPlanned,
      }));
      const data = new FormData();
      data.append('items', JSON.stringify(validItems));
      if (scheduled) data.append('scheduledFor', scheduled);
      data.append('clientToday', localDayKey());
      const res: any = await createTndBatchDisbursement(data);
      if (res.success) {
        setTndBatchItems([{ amount: '', note: '' }]);
        setTndForm({ amount: '', type: 'OUT', note: '', scheduledFor: '' });
        setActiveModal(null);
        await refreshHubState();
      } else if (res.code) handleSessionExpired(); else alert(res.error || 'Erreur');
    });
  };

  const handleSettleTndMovement = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirmer l\'encaissement ?',
      description: 'Ce mouvement sera marqué comme réglé et impactera immédiatement le solde du coffre.',
      confirmText: 'Confirmer',
      onConfirm: async () => {
        setConfirmModal({ isOpen: false });
        startTransition(async () => { await settleTndMovement(id); await refreshHubState(); });
      },
    });
  };

  const handleSaveTndNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tndNoteEdit?.note.trim()) { setTndNoteEditError('La note est obligatoire.'); return; }
    startTransition(async () => {
      const res: any = await updateTndMovementNote(tndNoteEdit.id, tndNoteEdit.note);
      if (res.success) {
        setTndNoteEdit(null);
        setTndNoteEditError('');
        await refreshHubState();
      } else if (res.code) handleSessionExpired(); else setTndNoteEditError(res.error || 'Modification impossible');
    });
  };

  const handleDeleteTndMovement = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Supprimer ce mouvement ?',
      description: 'Ce mouvement du coffre TND sera retiré du journal.',
      confirmText: 'Supprimer',
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal({ isOpen: false });
        startTransition(async () => { addOptimisticTndMovement({ id, action: 'delete' }); await deleteTndMovement(id); await refreshHubState(); });
      },
    });
  };

  // ---------- CREDIT handlers (registre indépendant, sans échéance) ----------
  const handleSaveCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(creditForm.amount);
    if (!isFinite(amount) || amount <= 0) { setCreditError('Montant invalide.'); return; }
    if (!creditForm.beneficiary.trim()) { setCreditError('Le bénéficiaire est obligatoire.'); return; }
    if (!creditForm.note.trim()) { setCreditError('La description est obligatoire.'); return; }
    setCreditError('');
    startTransition(async () => {
      const data = new FormData();
      data.append('amount', creditForm.amount);
      data.append('beneficiary', creditForm.beneficiary.trim());
      data.append('note', creditForm.note.trim());
      const isEdit = !!creditForm.id;
      if (isEdit) data.append('id', creditForm.id as string);
      const res: any = isEdit ? await updateCredit(data) : await createCredit(data);
      if (res?.success) {
        setActiveModal(null);
        setCreditForm({ amount: '', beneficiary: '', note: '' });
        await refreshHubState();
        showToast('success', isEdit ? 'Crédit modifié.' : 'Crédit ajouté.');
      } else {
        setCreditError(res?.error || 'Erreur.');
      }
    });
  };

  // Marquer PAYÉ / annuler — l'entrée reste toujours dans l'historique.
  const handleToggleCreditPaid = (credit: any) => {
    startTransition(async () => {
      const res: any = await setCreditPaid(credit.id, !credit.isPaid);
      if (res?.success) {
        await refreshHubState();
        showToast('success', credit.isPaid ? 'Crédit remis en attente.' : 'Crédit marqué payé.');
      } else {
        showToast('error', res?.error || 'Erreur.');
      }
    });
  };

  const handleDeleteCredit = (id: string, beneficiary: string) => {
    setConfirmModal({
      isOpen: true, isDanger: true, title: 'Supprimer le crédit',
      description: `Le crédit de ${beneficiary} sera définitivement retiré de l'historique. Pour un crédit réglé, préfère « Marquer payé » qui le conserve.`,
      confirmText: 'Supprimer',
      onConfirm: async () => {
        startTransition(async () => {
          const res: any = await deleteCredit(id);
          if (res?.success) { await refreshHubState(); showToast('success', 'Crédit supprimé.'); }
          else showToast('error', res?.error || 'Erreur.');
        });
      },
    });
  };

  // --- ARCHIVE ledger handlers (mirror the treasury) ---
  const handleAddArchiveMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archiveForm.amount || !archiveForm.note.trim()) return;
    startTransition(async () => {
      const amount = parseFloat(archiveForm.amount);
      const scheduled = archiveForm.scheduledFor;
      const isPlanned = !!scheduled;
      addOptimisticArchiveMovement({ id: 'temp-' + Date.now(), amount, type: archiveForm.type, note: archiveForm.note, performedBy: currentUser.username, createdAt: new Date(), scheduledFor: isPlanned ? new Date(scheduled!) : null, isSettled: !isPlanned });
      const data = new FormData();
      data.append('amount', archiveForm.amount);
      data.append('type', archiveForm.type);
      data.append('note', archiveForm.note);
      if (isPlanned) data.append('scheduledFor', scheduled!);
      data.append('clientToday', localDayKey());
      const res: any = await createArchiveMovement(data);
      if (res.success) { setArchiveForm({ amount: '', type: 'IN', note: '', scheduledFor: '' }); setActiveModal(null); await refreshHubState(); }
      else if (res.code) handleSessionExpired(); else alert(res.error || 'Erreur');
    });
  };

  const handleAddArchiveBatchDisbursement = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalid = archiveBatchItems.find(item => !item.note.trim() || !item.amount || Number(item.amount) <= 0);
    if (invalid) { alert('Chaque ligne doit avoir un montant positif et une note obligatoire.'); return; }
    startTransition(async () => {
      const scheduled = archiveForm.scheduledFor || '';
      const isPlanned = !!scheduled;
      const validItems = archiveBatchItems.map(item => ({ amount: Number(item.amount), note: item.note.trim() }));
      validItems.forEach((item, index) => addOptimisticArchiveMovement({
        id: `temp-batch-${Date.now()}-${index}`, amount: item.amount, type: 'OUT', note: item.note,
        performedBy: currentUser.username, createdAt: new Date(), scheduledFor: isPlanned ? new Date(scheduled) : null, isSettled: !isPlanned,
      }));
      const data = new FormData();
      data.append('items', JSON.stringify(validItems));
      if (scheduled) data.append('scheduledFor', scheduled);
      data.append('clientToday', localDayKey());
      const res: any = await createArchiveBatchDisbursement(data);
      if (res.success) {
        setArchiveBatchItems([{ amount: '', note: '' }]);
        setArchiveForm({ amount: '', type: 'OUT', note: '', scheduledFor: '' });
        setActiveModal(null);
        await refreshHubState();
      } else if (res.code) handleSessionExpired(); else alert(res.error || 'Erreur');
    });
  };

  const handleSettleArchiveMovement = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirmer le mouvement ?',
      description: 'Ce mouvement sera marqué comme réglé et impactera immédiatement le solde ARCHIVE.',
      confirmText: 'Confirmer',
      onConfirm: async () => {
        setConfirmModal({ isOpen: false });
        startTransition(async () => { await settleArchiveMovement(id); await refreshHubState(); });
      },
    });
  };

  const handleSaveArchiveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!archiveNoteEdit?.note.trim()) { setArchiveNoteEditError('La note est obligatoire.'); return; }
    startTransition(async () => {
      const res: any = await updateArchiveMovementNote(archiveNoteEdit.id, archiveNoteEdit.note);
      if (res.success) {
        setArchiveNoteEdit(null);
        setArchiveNoteEditError('');
        await refreshHubState();
      } else if (res.code) handleSessionExpired(); else setArchiveNoteEditError(res.error || 'Modification impossible');
    });
  };

  const handleDeleteArchiveMovement = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Supprimer ce mouvement ?',
      description: 'Ce mouvement ARCHIVE sera retiré du journal.',
      confirmText: 'Supprimer',
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal({ isOpen: false });
        startTransition(async () => { addOptimisticArchiveMovement({ id, action: 'delete' }); await deleteArchiveMovement(id); await refreshHubState(); });
      },
    });
  };

  const handleDeleteReminderLoc = (rid: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Supprimer ce rappel ?',
      description: 'Le rappel sera définitivement retiré.',
      confirmText: 'Supprimer',
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal({ isOpen: false });
        await deleteReminder(rid);
        await refreshHubState();
      },
    });
  };

  const handleDeleteAssistantLoc = (uid: string, uname: string) => {
    setConfirmModal({
      isOpen: true,
      title: `Retirer ${uname} ?`,
      description: 'Cet assistant perdra immédiatement son accès à la plateforme.',
      confirmText: 'Retirer',
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal({ isOpen: false });
        await deleteAssistantUser(uid);
        await refreshHubState();
      },
    });
  };

  const handleInlineCreatePartner = () => {
    if (!inlinePartnerName.trim()) return;
    startTransition(async () => {
      const data = new FormData(); data.append('name', inlinePartnerName.trim()); data.append('emoji', '👤'); data.append('country', inlinePartnerCountry.trim());
      const res: any = await createContact(data);
      if (res.success && res.contact) { await refreshHubState(); setTransactionForm(p => ({ ...p, contactId: res.contact.id })); setInlineNewPartner(false); }
      else if (res.code) handleSessionExpired(); else alert(res.error);
    });
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault(); if (!contactForm.name.trim()) return;
    startTransition(async () => {
      const data = new FormData(); Object.entries(contactForm).forEach(([k,v]) => data.append(k, v as any));
      const res: any = await createContact(data);
      if (res.success) { setContactForm({ id: '', name: '', emoji: '👤', country: '', isArchived: false }); setActiveModal(null); await refreshHubState(); }
      else if (res.code) handleSessionExpired(); else alert(res.error);
    });
  };

  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault(); if (!contactForm.id || !contactForm.name) return;
    const data = new FormData(); data.append('contactId', contactForm.id); data.append('name', contactForm.name); data.append('emoji', contactForm.emoji); data.append('country', contactForm.country); data.append('isArchived', contactForm.isArchived ? 'true' : 'false');
    startTransition(async () => { const res: any = await updateContact(data); if (res.success) { setActiveModal(null); await refreshHubState(); } else if (res.code) handleSessionExpired(); else alert(res.error); });
  };

  const handleConfirmReceived = (r: any) => {
    setConfirmModal({
      isOpen: true, title: '✅ Confirmer le mouvement ?',
      description: (() => {
        const pt = r.plannedType || 'RECEIVABLE';
        if (pt === 'HELD') return `Confirmer l'ENCAISSEMENT de ${formatRawCurrency(r.amount, r.currencyCode)} avec ${r.contact?.name} ? Ton argent chez lui augmentera (+).`;
        if (pt === 'PAYABLE') return `Confirmer le DÉCAISSEMENT de ${formatRawCurrency(r.amount, r.currencyCode)} avec ${r.contact?.name} ? Ton argent chez lui diminuera (−).`;
        return `Marquer ce rappel de ${formatRawCurrency(r.amount, r.currencyCode)} (${r.contact?.name}) comme terminé ? Ceci n'affecte aucun solde.`;
      })(),
      confirmText: 'Confirmer',
      onConfirm: async () => { startTransition(async () => { const res: any = await confirmReminderReceived(r.id); if (res.success) await refreshHubState(); else if (res.code) handleSessionExpired(); else alert(res.error); }); }
    });
  };

  const handlePostpone = (r: any) => { setPostponeTarget(r); setPostponeDate(''); };
  const submitPostpone = async () => {
    if (!postponeTarget || !postponeDate) return;
    const target = postponeTarget; setPostponeTarget(null);
    startTransition(async () => { const res: any = await postponeReminder(target.id, postponeDate); if (res.success) await refreshHubState(); else if (res.code) handleSessionExpired(); else alert(res.error); });
  };

  const filteredContacts = useMemo(() => {
    let result = [...optimisticContacts];
    result.sort((a, b) => {
      const aVol = Math.max(Math.abs(a.netPositionUsd), Math.abs(a.heldBalanceUsd), Math.abs(a.receivableBalanceUsd), Math.abs(a.payableBalanceUsd), (a.heldBalanceTnd || 0));
      const bVol = Math.max(Math.abs(b.netPositionUsd), Math.abs(b.heldBalanceUsd), Math.abs(b.receivableBalanceUsd), Math.abs(b.payableBalanceUsd), (b.heldBalanceTnd || 0));
      if (bVol !== aVol) return bVol - aVol;
      return a.name.localeCompare(b.name);
    });
    if (contactFilterType === 'HELD') result = result.filter((c:any) => c.heldBalanceUsd > 0 || (c.heldBalanceTnd || 0) > 0);
    else if (contactFilterType === 'RECEIVABLE') result = result.filter((c:any) => c.receivableBalanceUsd > 0);
    else if (contactFilterType === 'PAYABLE') result = result.filter((c:any) => c.payableBalanceUsd > 0);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c:any) => c.name.toLowerCase().includes(q) || (c.country && c.country.toLowerCase().includes(q)));
    }
    return result;
  }, [optimisticContacts, contactFilterType, searchQuery]);

  // Group informal notes by partner (never counted in any GLOBAL total).
  const notesByContact = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const n of (partnerNotes || [])) { (map[n.contactId] ||= []).push(n); }
    return map;
  }, [partnerNotes]);

  // Per-partner note adjustment. Sign: "Il me doit" (THEY_OWE) = − (he owes me),
  // "Je lui dois" (I_OWE) = +. Amounts converted to USD for the card figure; a raw
  // TND sum is kept for the local line. This affects ONLY the partner card, never the
  // dashboard/global totals (those read real movements from metrics).
  const rateToUsd = useCallback((code: string) => {
    const c = (initialActiveCurrencies || []).find((x: any) => x.code === code);
    return c?.rateToUsd ?? (code === 'USD' ? 1 : code === 'TND' ? 0.32 : code === 'EURO' ? 1.08 : code === 'RMB' ? 0.14 : 1);
  }, [initialActiveCurrencies]);
  const noteAdjustByContact = useMemo(() => {
    const map: Record<string, { usd: number; tnd: number; hasAny: boolean }> = {};
    for (const n of (partnerNotes || [])) {
      const sign = n.direction === 'THEY_OWE' ? -1 : 1;
      const entry = map[n.contactId] || { usd: 0, tnd: 0, hasAny: false };
      entry.usd += sign * (n.amount || 0) * rateToUsd(n.currencyCode || 'TND');
      if ((n.currencyCode || 'TND') === 'TND') entry.tnd += sign * (n.amount || 0);
      entry.hasAny = true;
      map[n.contactId] = entry;
    }
    return map;
  }, [partnerNotes, rateToUsd]);

  const filteredMovements = useMemo(() =>
    optimisticTransactions.filter((t:any) => !searchQuery || t.contact?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || t.note?.toLowerCase().includes(searchQuery.toLowerCase())),
    [optimisticTransactions, searchQuery]
  );

  const getTransactionTypeStyle = (type: string) => {
    switch (type) {
      case 'HELD': return { label: 'ENCAISSÉ', note: 'Argent confié (+)', style: 'emerald' };
      case 'RECEIVABLE': return { label: 'À RECEVOIR', note: 'Paiement prévu', style: 'blue' };
      case 'PAYABLE': return { label: 'DÉCAISSÉ', note: 'Repris / dépensé (−)', style: 'rose' };
      default: return { label: type, note: '', style: 'neutral' };
    }
  };

  const dueReminders = useMemo(() => {
    const end = new Date(); end.setHours(23, 59, 59, 999);
    return reminders.filter((r:any) => !r.isCompleted && new Date(r.dueDate) <= end).sort((a:any, b:any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [reminders]);

  useEffect(() => {
    if (!currentUser) return;
    const tndAlertsCount = currentUser.role === 'admin' ? (tndDueSoon.length + tndOverdue.length) : 0;
    if (dueReminders.length === 0 && tndAlertsCount === 0) return;
    const today = new Date().toDateString();
    if (sessionStorage.getItem('hub_notif_seen') !== today) { setShowNotifications(true); sessionStorage.setItem('hub_notif_seen', today); }
  }, [currentUser, dueReminders.length, tndDueSoon.length, tndOverdue.length]);

  // Reset inline partner creation whenever the operation modal is not open
  useEffect(() => { if (activeModal !== 'add_tx') { setInlineNewPartner(false); setInlinePartnerName(''); setInlinePartnerCountry(''); } }, [activeModal]);

  const handleDeleteTxLoc = (id: string) => { setConfirmModal({ isOpen: true, title: 'Supprimer ?', description: 'Action auditée.', confirmText: 'Supprimer', isDanger: true, onConfirm: async () => { startTransition(async () => { addOptimisticTransaction({ id, action: 'delete' }); await deleteHubTransaction(id); await refreshHubState(); }); } }); };

  const handleOpenEditContact = (e: any, c: any) => { e.stopPropagation(); setContactForm(c); setActiveModal('edit_contact'); };

  // Panic Lock is a separate, zero-data application state. No normal shell, nav, or props render here.
  if (initialPanicState.isLocked) {
    const isEmergency = currentUser?.role === 'emergency';
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 15%, rgba(220,38,38,.24), transparent 36%), radial-gradient(circle at 85% 85%, rgba(127,29,29,.2), transparent 40%)' }} />
        <div className="relative w-full max-w-md bg-neutral-950/90 border border-rose-500/30 rounded-[52px] p-10 flex flex-col gap-8 shadow-2xl shadow-rose-950/40 ring-1 ring-rose-500/10 animate-in zoom-in-95 duration-500">
          <div className="text-center flex flex-col items-center gap-4">
            <div className="h-20 w-20 rounded-[28px] bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-xl shadow-rose-900/30 animate-pulse"><Siren className="h-10 w-10" /></div>
            <div><h1 className="text-2xl font-black uppercase tracking-tight text-white">Panic Lock Actif</h1><p className="text-[10px] text-rose-300 font-black uppercase tracking-[0.22em] mt-2">Accès global suspendu</p></div>
          </div>
          {!isEmergency ? (
            <>
              <div className="p-5 bg-rose-500/5 border border-rose-500/20 rounded-3xl text-center"><p className="text-xs text-neutral-300 font-bold leading-relaxed">Tous les comptes, sessions et accès opérationnels sont bloqués. Seuls les identifiants d’urgence peuvent ouvrir la console de sécurité.</p></div>
              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <input type="text" placeholder="IDENTIFIANT D’URGENCE" required autoComplete="username" className="bg-black border border-rose-900/50 rounded-2xl p-5 text-sm text-white font-black uppercase outline-none focus:border-rose-500 shadow-inner" value={loginForm.username} onChange={e => setLoginForm(p=>({...p, username: e.target.value}))} />
                <input type="password" placeholder="MOT DE PASSE D’URGENCE" required autoComplete="current-password" className="bg-black border border-rose-900/50 rounded-2xl p-5 text-sm text-white font-black outline-none focus:border-rose-500 shadow-inner" value={loginForm.password} onChange={e => setLoginForm(p=>({...p, password: e.target.value}))} />
                <button type="submit" className="py-5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-2xl uppercase text-xs tracking-[0.2em] active:scale-95 transition shadow-xl shadow-rose-900/30">Ouvrir la console</button>
                {(loginError || '') && <p className="text-rose-400 text-[10px] font-black uppercase text-center tracking-widest animate-pulse">{loginError || 'Identifiants d’urgence incorrects'}</p>}
              </form>
            </>
          ) : (
            <>
              <div className="p-5 bg-amber-500/5 border border-amber-500/25 rounded-3xl text-center flex flex-col gap-2"><ShieldAlert className="h-6 w-6 text-amber-400 mx-auto" /><p className="text-xs text-amber-100 font-bold leading-relaxed">Console d’urgence uniquement. Déverrouiller réactive la plateforme, mais tous les utilisateurs devront se reconnecter.</p></div>
              <form onSubmit={handleUnlockPanicLock} className="flex flex-col gap-4">
                <input type="password" placeholder="CONFIRMER LE MOT DE PASSE D’URGENCE" required autoFocus className="bg-black border border-amber-700/50 rounded-2xl p-5 text-sm text-white font-black outline-none focus:border-amber-400 shadow-inner" value={unlockPassword} onChange={e => setUnlockPassword(e.target.value)} />
                <button type="submit" className="py-5 bg-amber-400 hover:bg-amber-300 text-black font-black rounded-2xl uppercase text-xs tracking-[0.2em] active:scale-95 transition shadow-xl shadow-amber-900/20"><ShieldCheck className="inline h-4 w-4 mr-2" /> Désactiver Panic Lock</button>
                {unlockError && <p className="text-rose-400 text-[10px] font-black uppercase text-center tracking-widest animate-pulse">{unlockError}</p>}
              </form>
              <button onClick={handleLogout} className="text-[10px] font-black uppercase tracking-widest text-neutral-600 hover:text-neutral-300">Quitter la console</button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!currentUser) return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-neutral-900/40 border border-neutral-800 rounded-[48px] p-10 flex flex-col gap-8 shadow-2xl animate-in zoom-in-95 duration-500 ring-1 ring-white/10">
        <div className="text-center flex flex-col items-center gap-3">
          <MoneyHubLogo size={176} className="shadow-2xl shadow-emerald-950/20" />
          <p className="text-[10px] text-emerald-300/60 font-black uppercase tracking-[0.28em]">Accès privé</p>
        </div>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input type="text" placeholder="UTILISATEUR" required className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 text-sm text-white font-black uppercase outline-none focus:border-emerald-500/50 shadow-inner" value={loginForm.username} onChange={e => setLoginForm(p=>({...p, username: e.target.value}))} />
          <input type="password" placeholder="MOT DE PASSE" required className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 text-sm text-white font-black uppercase outline-none focus:border-emerald-500/50 shadow-inner" value={loginForm.password} onChange={e => setLoginForm(p=>({...p, password: e.target.value}))} />
          <button type="submit" className="py-5 bg-white text-black font-black rounded-2xl uppercase text-xs tracking-[0.2em] active:scale-95 transition shadow-2xl mt-2">Se Connecter</button>
          {loginError && <p className="text-rose-500 text-[10px] font-black uppercase text-center tracking-widest animate-pulse">{loginError}</p>}
        </form>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen bg-black text-white font-sans selection:bg-emerald-500/30 ${theme}`}>
      <header className="app-safe-top sticky top-0 z-40 bg-black/90 backdrop-blur-2xl border-b border-neutral-900/50 p-4">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          <div className="flex justify-between items-center px-1">
            <div className="flex items-center gap-2.5">
              {currentUser.role === 'admin' && (
                <div className="flex gap-1.5">
                  <button onClick={goBack} disabled={!canGoBack} className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 transition active:scale-90 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
                  <button onClick={goForward} disabled={!canGoForward} className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 transition active:scale-90 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
                </div>
              )}
              <button onClick={() => navigateTo(currentUser.role === 'admin' ? 'dashboard' : 'treasury')} className="cursor-pointer active:scale-95 transition max-[430px]:[&>div>div:last-child]:hidden" aria-label="Accueil Money Hub"><MoneyHubLogo size={42} showWordmark /></button>
            </div>
            <div className="flex gap-2">
              {currentUser.role === 'admin' && (() => {
                const totalAlerts = dueReminders.length + tndDueSoon.length + tndOverdue.length;
                return (
                  <button onClick={() => setShowNotifications(true)} className="relative p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 transition active:scale-90"><Bell className={`h-4 w-4 ${totalAlerts > 0 ? 'text-amber-400' : ''}`} />{totalAlerts > 0 && <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-rose-500 text-white text-[9px] font-black">{totalAlerts}</span>}</button>
                );
              })()}
              <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 transition active:scale-90">{theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
              <button onClick={refreshHubState} className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 transition active:scale-90"><RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} /></button>
              <button onClick={handleLogout} className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 text-rose-500 transition active:scale-90"><LogOut className="h-4 w-4" /></button>
            </div>
          </div>
          {/* « Nouvelle Opération » est proposé à TOUS les rôles : le sélecteur n'affiche que
              les caisses autorisées pour l'utilisateur connecté. Les assistants n'avaient aucun
              point d'entrée et devaient naviguer à la main jusqu'au Coffre ou à la Banque. */}
          <>
            <div className="flex gap-2 px-1">
              <button onClick={() => { setChooserExpand(null); setActiveModal('choose_account'); }} className="flex-1 py-4 bg-emerald-500 text-black font-black uppercase text-xs rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/10 active:scale-[0.98] transition"> <Plus className="h-5 w-5 stroke-[3]" /> Nouvelle Opération </button>
              {currentUser.role === 'admin' && (
                <button onClick={() => setActiveModal('add_contact')} className="px-5 py-4 bg-neutral-900 border border-neutral-800 text-white font-black uppercase text-xs rounded-2xl active:scale-[0.98] transition shadow-md"> <UserPlus className="h-5 w-5" /> </button>
              )}
            </div>
            {currentUser.role === 'admin' && (
              <div className="relative px-1">
                <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                <input type="text" placeholder="Rechercher par nom, note ou montant..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl py-4 pl-12 pr-10 text-sm focus:border-emerald-500/40 transition outline-none text-white shadow-inner" />
              </div>
            )}
          </>
        </div>
      </header>

      <main className="app-main-safe-bottom max-w-4xl mx-auto px-3 pt-3 sm:px-4 sm:pt-4 flex flex-col gap-4 sm:gap-6 animate-fade-up">
        {activeSection === 'dashboard' && (() => {
          const urgentTnd = [...tndOverdue, ...tndDueSoon.filter((m: any) => !tndOverdue.some((o: any) => o.id === m.id))];
          const urgentCount = urgentTnd.length + dueReminders.length;
          const recentAudit = auditTrails.slice(0, 5);
          const activePartners = optimisticContacts.filter((c: any) => Math.abs(c.netPositionUsd) > 0.01 || (c.heldBalanceTnd || 0) > 0.01).length;
          const lastAudit = recentAudit[0];
          // TOTAL TND — every TND cash pool EXCEPT the DEVISES partner positions.
          // Formal = TND bank accounts; Informal = Coffre + Archive.
          const tndBankAccounts = bankAccounts.filter((a: any) => a.currencyCode === 'TND');
          const bankTndTotal = tndBankAccounts.reduce((s: number, a: any) => s + (a.balance || 0), 0);
          const informalTndTotal = (metrics.tndBalance || 0) + (metrics.archiveBalance || 0);
          const grandTndTotal = bankTndTotal + informalTndTotal;
          // CREDIT — dette à payer, volontairement EXCLUE de grandTndTotal ci-dessus.
          // Visible sur le dashboard, mais jamais additionnée à une caisse.
          const creditOpen = credits.filter((c: any) => !c.isPaid);
          const creditDashTotal = creditOpen.reduce((s: number, c: any) => s + (c.amount || 0), 0);
          return (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3 px-1">
                <div><p className="text-[8px] font-black text-emerald-300 uppercase tracking-[0.22em]">Command center</p><h2 className="text-xl font-black tracking-[-0.06em] text-white leading-none mt-0.5">Dashboard</h2></div>
                <button onClick={() => refreshHubState()} aria-label="Actualiser le dashboard" className="shrink-0 p-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-300 hover:text-white active:scale-95 transition"><RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} /></button>
              </div>

              {urgentCount > 0 && (
                <div className="border border-rose-500/30 bg-rose-500/10 rounded-2xl p-4 shadow-lg shadow-rose-950/10">
                  <div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-[9px] font-black text-rose-300 uppercase tracking-[0.18em]">À traiter maintenant</p><p className="text-sm font-black text-white mt-1">{urgentCount} élément{urgentCount > 1 ? 's' : ''} requiert une action</p><p className="text-[10px] text-neutral-400 font-bold mt-1 truncate">{urgentTnd.length > 0 ? `${urgentTnd.length} mouvement${urgentTnd.length > 1 ? 's' : ''} TND` : ''}{urgentTnd.length > 0 && dueReminders.length > 0 ? ' · ' : ''}{dueReminders.length > 0 ? `${dueReminders.length} rappel${dueReminders.length > 1 ? 's' : ''}` : ''}</p></div><button onClick={() => navigateTo(urgentTnd.length > 0 ? 'treasury' : 'reminders')} className="shrink-0 px-3 py-2 rounded-xl bg-rose-500 text-white text-[9px] font-black uppercase tracking-widest active:scale-95 transition">Voir</button></div>
                </div>
              )}

              {/* CARTE PAIEMENTS — conçue pour répondre à quatre questions SANS LIRE :
                  1. « Est-ce qu'il y a des paiements ? »  -> le montant géant, l'élément
                     le plus gros de la carte.
                  2. « Pour quand ? »                      -> une tuile avec un compte à
                     rebours en chiffres (7 J), pas une phrase.
                  3. « Des marchandises dangereuses ? »    -> une tuile dédiée qui répond
                     TOUJOURS, oui en rouge ou non en vert. L'absence de bloc ne serait pas
                     une réponse : on ne saurait pas si c'est « non » ou « pas chargé ».
                  4. « Combien pour ces marchandises ? »   -> le deuxième plus gros chiffre
                     de la carte, dans cette même tuile.

                  L'ancienne version empilait cinq phrases, dont un avertissement rose sur
                  trois lignes et un nom de fournisseur coupé (« SHANDONG JINGPIN E... »).
                  Ici : un chiffre dominant, deux tuiles scannables, et la couleur porte le
                  niveau d'urgence. « Où : section Devises » a sauté — le bouton VOIR le dit
                  déjà, et il emmène directement au bloc. */}
              {chinaTrack && chinaTrack.configured && !chinaTrack.error && ((Array.isArray(chinaTrack.payments) && chinaTrack.payments.length > 0) || (chinaTrack.dangerous?.count ?? 0) > 0) && (() => {
                const rows: any[] = Array.isArray(chinaTrack.payments) ? chinaTrack.payments : [];
                const today = new Date(); today.setHours(0, 0, 0, 0);
                const dueOf = (p: any) => (p.dueDate ? new Date(p.dueDate + 'T00:00:00') : null);
                const isLate = (p: any) => { const d = dueOf(p); return p.status === 'Late' || (!!d && d < today); };
                const sum = (a: any[]) => a.reduce((s, p) => s + (Number(p.remainingUsd) || 0), 0);
                const lateRows = rows.filter(isLate);
                const total = sum(rows);
                const next = [...rows.filter((p) => !isLate(p) && dueOf(p))].sort((a, b) => (dueOf(a)!.getTime() - dueOf(b)!.getTime()))[0];
                const nextDate = next ? dueOf(next) : null;
                const days = nextDate ? Math.round((nextDate.getTime() - today.getTime()) / 86400000) : null;
                const shortDate = (d: Date | null) => (d ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : null);

                const dg = chinaTrack.dangerous || { count: 0, amountUsd: 0, soonestArrival: null, contracts: [] };
                const hasDg = (dg.count ?? 0) > 0;
                // La pire urgence commande la couleur : un conteneur déjà arrivé ne se lit
                // pas comme un autre qui arrive dans trois semaines.
                const rank: any = { watch: 0, urgent: 1, critical: 2, overdue: 3 };
                const worstDg = (dg.contracts || []).reduce((w: string, c: any) => ((rank[c.urgency] ?? 0) > (rank[w] ?? -1) ? c.urgency : w), 'watch');
                const dgHot = worstDg === 'critical' || worstDg === 'overdue';
                const dgArrival = dg.soonestArrival ? shortDate(new Date(dg.soonestArrival + 'T00:00:00')) : null;

                // Bordure de la carte = état le plus grave présent.
                const alarm = lateRows.length > 0 || dgHot;
                return (
                  <button
                    onClick={() => goToAnchor('currencies', 'china-track')}
                    /* Le cadre jaune qui respire est l'IDENTITE de la carte, pas son
                       niveau d'alerte : il dit "cet argent vit dans CHINA TRACK".
                       Les cartes MONEY HUB ont un cadre fixe et discret ; celle-ci
                       bouge lentement, donc l'oeil la separe des autres sans qu'on
                       ait a la lire. L'urgence, elle, reste portee par les tuiles
                       rouges en dessous — un cadre qui changerait aussi de couleur
                       melangerait les deux messages. */
                    className={'china-card w-full text-left rounded-[24px] border-2 p-4 sm:p-5 active:scale-[0.99] transition bg-gradient-to-br ' + (alarm ? 'from-rose-500/12 via-amber-500/5 to-neutral-950' : 'from-amber-500/12 to-neutral-950')}
                  >
                    {/* En-tête : ce que c'est + le bouton, sur une seule ligne. */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 shrink-0 rounded-xl flex items-center justify-center bg-amber-500/20 text-amber-300"><Coins className="h-4 w-4" /></div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-black uppercase tracking-[0.18em] truncate text-amber-300">Paiements fournisseurs</p>
                          {/* Le drapeau est le meme que l'onglet CHINA TRACK dans le
                              navigateur : on reconnait la provenance sans lire. */}
                          <span className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-white/[0.07] border border-white/15 pl-1 pr-2 py-0.5">
                            <img src="/china-track-icon.svg" alt="" aria-hidden="true" className="h-3.5 w-3.5 rounded-[3px] shrink-0" />
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-neutral-300">China Track</span>
                          </span>
                        </div>
                      </div>
                      <span className="shrink-0 self-start px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest bg-amber-500 text-black">Voir</span>
                    </div>

                    {/* LE chiffre. Question 1 répondue d'un coup d'œil. */}
                    <div className="mt-3">
                      <p className="text-3xl sm:text-4xl font-black tracking-tighter text-white leading-none break-words">{formatUSD(total)}</p>
                      <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mt-1">
                        {rows.length > 0 ? `${rows.length} paiement${rows.length > 1 ? 's' : ''} à venir` : 'Aucun échéancier saisi'}
                      </p>
                      {rows.some((p: any) => Number(p.freightUsd) > 0) && (
                        <p className="text-[9px] font-black uppercase tracking-widest text-teal-300/70 mt-1.5">
                          Fret maritime compris · detail dans Devises
                        </p>
                      )}
                      {/* Ce montant vient de CHINA TRACK. Il date du dernier
                          chargement, pas de maintenant : il faut le dire. */}
                      {chinaFresh.label && (
                        <p className={'text-[9px] font-black uppercase tracking-widest mt-1.5 ' + (chinaFresh.stale ? 'text-amber-400' : 'text-neutral-600')}>
                          Chiffres lus {chinaFresh.label}
                        </p>
                      )}
                    </div>

                    {/* Deux tuiles : QUAND, et MARCHANDISES DANGEREUSES. */}
                    <div className="grid grid-cols-2 gap-2.5 mt-4">
                      {/* Q2 — quand ? Un nombre, pas une phrase. */}
                      {lateRows.length > 0 ? (
                        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3">
                          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-rose-300">En retard</p>
                          <p className="text-xl font-black tracking-tighter text-rose-300 leading-none mt-1.5 break-words">{formatUSD(sum(lateRows))}</p>
                          <p className="text-[9px] font-bold text-neutral-400 mt-1">{lateRows.length} paiement{lateRows.length > 1 ? 's' : ''} dépassé{lateRows.length > 1 ? 's' : ''}</p>
                        </div>
                      ) : days !== null ? (
                        <div className={'rounded-2xl border p-3 ' + (days <= 7 ? 'border-amber-500/40 bg-amber-500/10' : 'border-blue-500/30 bg-blue-500/10')}>
                          <p className={'text-[8px] font-black uppercase tracking-[0.2em] ' + (days <= 7 ? 'text-amber-300' : 'text-blue-300')}>Prochain</p>
                          <p className={'text-xl font-black tracking-tighter leading-none mt-1.5 ' + (days <= 7 ? 'text-amber-300' : 'text-blue-300')}>{days <= 0 ? "Aujourd'hui" : `${days} j`}</p>
                          <p className="text-[9px] font-bold text-neutral-400 mt-1">{shortDate(nextDate) || ''}</p>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-neutral-800 bg-white/5 p-3">
                          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-neutral-500">Prochain</p>
                          <p className="text-xl font-black tracking-tighter text-neutral-500 leading-none mt-1.5">—</p>
                          <p className="text-[9px] font-bold text-neutral-500 mt-1">Dates à fixer</p>
                        </div>
                      )}

                      {/* Q3 + Q4 — la tuile répond TOUJOURS, oui comme non. */}
                      {hasDg ? (
                        <div className={'rounded-2xl border p-3 ' + (dgHot ? 'border-rose-500/60 bg-rose-500/15' : 'border-orange-500/40 bg-orange-500/10')}>
                          <p className={'text-[8px] font-black uppercase tracking-[0.2em] flex items-center gap-1 ' + (dgHot ? 'text-rose-300' : 'text-orange-300')}>
                            <AlertTriangle className="h-2.5 w-2.5 shrink-0" /> Dangereuses
                          </p>
                          <p className={'text-xl font-black tracking-tighter leading-none mt-1.5 break-words ' + (dgHot ? 'text-rose-300' : 'text-orange-300')}>{formatUSD(dg.amountUsd)}</p>
                          <p className="text-[9px] font-bold text-neutral-400 mt-1">{dgArrival ? `avant le ${dgArrival}` : "avant l'arrivée"}</p>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-3">
                          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-400/80 flex items-center gap-1">
                            <CheckCircle className="h-2.5 w-2.5 shrink-0" /> Dangereuses
                          </p>
                          <p className="text-xl font-black tracking-tighter text-emerald-400/90 leading-none mt-1.5">Aucune</p>
                          <p className="text-[9px] font-bold text-neutral-500 mt-1">Rien à payer avant arrivée</p>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })()}

              <div className="grid sm:grid-cols-3 gap-2.5">
                <button onClick={() => navigateTo('treasury')} className="text-left p-4 rounded-2xl border border-blue-500/25 bg-gradient-to-br from-blue-500/10 to-neutral-950 hover:border-blue-500/50 active:scale-[0.985] transition shadow-lg shadow-blue-950/10 flex flex-col gap-1.5"><div className="flex justify-between items-center gap-2"><div className="flex items-center gap-2 min-w-0"><div className="h-7 w-7 rounded-lg bg-blue-500/15 text-blue-300 flex items-center justify-center shrink-0"><CoffreIcon className="h-3.5 w-3.5" /></div><p className="text-[9px] font-black text-neutral-300 uppercase tracking-[0.12em] truncate">Coffre Fort Administration</p></div><span className="text-[7px] font-black text-blue-300 uppercase tracking-widest shrink-0">Live·TND</span></div><p className={`text-[26px] leading-none font-black tracking-[-0.07em] ${metrics.tndBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatRawCurrency(metrics.tndBalance || 0, 'TND')}</p><div className="flex flex-wrap gap-x-3 text-[9px] font-black"><span className="text-emerald-400">+ {formatRawCurrency(metrics.tndTodayIn || 0, 'TND')}</span><span className="text-rose-400">− {formatRawCurrency(metrics.tndTodayOut || 0, 'TND')}</span></div></button>
                <button onClick={() => navigateTo('currencies')} className="text-left p-4 rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-neutral-950 hover:border-emerald-500/50 active:scale-[0.985] transition shadow-lg shadow-emerald-950/10 flex flex-col gap-1.5"><div className="flex justify-between items-center gap-2"><div className="flex items-center gap-2 min-w-0"><div className="h-7 w-7 rounded-lg bg-emerald-500/15 text-emerald-300 flex items-center justify-center shrink-0"><WalletCards className="h-3.5 w-3.5" /></div><p className="text-[9px] font-black text-neutral-300 uppercase tracking-[0.12em] truncate">Position Globale USD</p></div><span className="text-[7px] font-black text-emerald-300 uppercase tracking-widest shrink-0">Live·USD</span></div><p className={`text-[26px] leading-none font-black tracking-[-0.07em] ${metrics.netPosition >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatUSD(metrics.netPosition || 0)}</p><div className="flex flex-wrap gap-x-3 text-[9px] font-black"><span className="text-emerald-300">{formatUSD(metrics.totalAvoirs || 0)} encaissé</span><span className="text-neutral-500">{activePartners} actif{activePartners > 1 ? 's' : ''}</span></div></button>
                <button onClick={() => navigateTo('archive')} className="text-left p-4 rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-neutral-950 hover:border-amber-500/50 active:scale-[0.985] transition shadow-lg shadow-amber-950/10 flex flex-col gap-1.5"><div className="flex justify-between items-center gap-2"><div className="flex items-center gap-2 min-w-0"><div className="h-7 w-7 rounded-lg bg-amber-500/15 text-amber-300 flex items-center justify-center shrink-0"><Archive className="h-3.5 w-3.5" /></div><p className="text-[9px] font-black text-neutral-300 uppercase tracking-[0.12em] truncate">Caisse Archive</p></div><span className="text-[7px] font-black text-amber-300 uppercase tracking-widest shrink-0">Live·TND</span></div><p className={`text-[26px] leading-none font-black tracking-[-0.07em] ${(metrics.archiveBalance || 0) >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>{formatRawCurrency(metrics.archiveBalance || 0, 'TND')}</p><div className="flex flex-wrap gap-x-3 text-[9px] font-black"><span className="text-emerald-400">+ {formatRawCurrency(metrics.archiveTodayIn || 0, 'TND')}</span><span className="text-rose-400">− {formatRawCurrency(metrics.archiveTodayOut || 0, 'TND')}</span></div></button>
                {bankAccounts.map((a: any) => (
                  <button key={a.id} onClick={() => { setSelectedBankId(a.id); navigateTo('banque'); }} className="text-left p-4 rounded-2xl border border-teal-500/25 bg-gradient-to-br from-teal-500/10 to-neutral-950 hover:border-teal-500/50 active:scale-[0.985] transition shadow-lg shadow-teal-950/10 flex flex-col gap-1.5"><div className="flex justify-between items-center gap-2"><div className="flex items-center gap-2 min-w-0"><div className="h-7 w-7 rounded-lg bg-teal-500/15 text-teal-300 flex items-center justify-center shrink-0"><Landmark className="h-3.5 w-3.5" /></div><p className="text-[9px] font-black text-neutral-300 uppercase tracking-[0.12em] truncate">{a.name}</p></div><span className="text-[7px] font-black text-teal-300 uppercase tracking-widest shrink-0">Live·{a.currencyCode}</span></div><p className={`text-[26px] leading-none font-black tracking-[-0.07em] ${(a.balance || 0) >= 0 ? 'text-teal-300' : 'text-rose-400'}`}>{formatRawCurrency(a.balance || 0, a.currencyCode)}</p><div className="flex flex-wrap gap-x-3 text-[9px] font-black"><span className="text-emerald-400">+ {formatRawCurrency(a.todayIn || 0, a.currencyCode)}</span><span className="text-rose-400">− {formatRawCurrency(a.todayOut || 0, a.currencyCode)}</span></div></button>
                ))}
                {/* CRÉDIT — dette, pas de la trésorerie. Même format que les autres cartes pour
                    rester repérable, mais couleur rose + tag "hors totaux" pour qu'on ne la lise
                    JAMAIS comme de l'argent disponible. Exclue de Total TND par construction. */}
                <button onClick={() => navigateTo('credit')} className="text-left p-4 rounded-2xl border border-rose-500/25 bg-gradient-to-br from-rose-500/10 to-neutral-950 hover:border-rose-500/50 active:scale-[0.985] transition shadow-lg shadow-rose-950/10 flex flex-col gap-1.5"><div className="flex justify-between items-center gap-2"><div className="flex items-center gap-2 min-w-0"><div className="h-7 w-7 rounded-lg bg-rose-500/15 text-rose-300 flex items-center justify-center shrink-0"><Receipt className="h-3.5 w-3.5" /></div><p className="text-[9px] font-black text-neutral-300 uppercase tracking-[0.12em] truncate">Crédit</p></div><span className="text-[7px] font-black text-rose-300 uppercase tracking-widest shrink-0">Hors totaux</span></div><p className={`text-[26px] leading-none font-black tracking-[-0.07em] ${creditDashTotal > 0 ? 'text-rose-400' : 'text-neutral-500'}`}>{formatRawCurrency(creditDashTotal, 'TND')}</p><div className="flex flex-wrap gap-x-3 text-[9px] font-black"><span className="text-neutral-400">{creditOpen.length} en attente</span>{credits.length - creditOpen.length > 0 && <span className="text-emerald-400">{credits.length - creditOpen.length} payé{credits.length - creditOpen.length > 1 ? 's' : ''}</span>}</div></button>
              </div>

              {/* TOTAL TND — sum of every TND pool except DEVISES partner positions */}
              <div className="flex flex-col gap-0">
                <button
                  onClick={() => setShowTotalTnd(v => !v)}
                  aria-expanded={showTotalTnd}
                  className={`group relative overflow-hidden w-full text-left p-5 sm:p-6 border-2 transition-all active:scale-[0.99] shadow-2xl shadow-indigo-950/20 ${showTotalTnd ? 'rounded-t-[32px] rounded-b-none border-b-0 border-indigo-400/70' : 'rounded-[32px] border-indigo-500/40 hover:border-indigo-400/70'} bg-gradient-to-br from-indigo-500/25 via-violet-500/15 to-blue-600/20`}
                >
                  <div className="absolute -top-8 -right-6 opacity-[0.10] pointer-events-none text-indigo-300"><Coins className="h-40 w-40" /></div>
                  <div className="relative flex items-center gap-4">
                    <div className="h-14 w-14 shrink-0 rounded-2xl bg-indigo-500/25 ring-1 ring-indigo-400/40 flex items-center justify-center text-indigo-200 shadow-lg"><Coins className="h-7 w-7" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.28em]">Total TND · toutes caisses</p>
                      <p className={`text-4xl sm:text-5xl font-black tracking-tighter leading-none mt-1 break-words ${grandTndTotal >= 0 ? 'text-white' : 'text-rose-300'}`}>{formatRawCurrency(grandTndTotal, 'TND')}</p>
                      <p className="text-[9px] font-black text-indigo-300/80 uppercase tracking-widest mt-1.5">Hors devises partenaires · {showTotalTnd ? 'Masquer le détail' : 'Voir le détail'}</p>
                    </div>
                    <ChevronRight className={`h-6 w-6 text-indigo-300 shrink-0 transition-transform duration-200 ${showTotalTnd ? 'rotate-90' : ''}`} />
                  </div>
                </button>
                {showTotalTnd && (
                  <div className="rounded-b-[32px] border-2 border-t-0 border-indigo-400/70 bg-neutral-950/80 p-4 sm:p-5 grid gap-3 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid sm:grid-cols-2 gap-3">
                      {/* Formal — bank accounts */}
                      <div className="p-4 rounded-2xl border border-teal-500/30 bg-gradient-to-br from-teal-500/12 to-neutral-950">
                        <div className="flex items-center gap-2"><div className="h-8 w-8 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0"><Landmark className="h-4 w-4" /></div><div className="min-w-0"><p className="text-[9px] font-black text-teal-300 uppercase tracking-[0.18em]">Argent formel</p><p className="text-[8px] font-black text-neutral-500 uppercase tracking-widest">Comptes banque</p></div></div>
                        <p className={`text-2xl font-black tracking-tighter mt-2.5 ${bankTndTotal >= 0 ? 'text-teal-300' : 'text-rose-400'}`}>{formatRawCurrency(bankTndTotal, 'TND')}</p>
                        <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest mt-1">{tndBankAccounts.length} compte{tndBankAccounts.length > 1 ? 's' : ''} TND</p>
                      </div>
                      {/* Informal — coffre + archive */}
                      <div className="p-4 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/12 to-neutral-950">
                        <div className="flex items-center gap-2"><div className="h-8 w-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0"><CoffreIcon className="h-4 w-4" /></div><div className="min-w-0"><p className="text-[9px] font-black text-amber-300 uppercase tracking-[0.18em]">Argent non formel</p><p className="text-[8px] font-black text-neutral-500 uppercase tracking-widest">Coffre + Archive</p></div></div>
                        <p className={`text-2xl font-black tracking-tighter mt-2.5 ${informalTndTotal >= 0 ? 'text-amber-300' : 'text-rose-400'}`}>{formatRawCurrency(informalTndTotal, 'TND')}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] font-black text-neutral-500 uppercase tracking-widest mt-1"><span>Coffre {formatRawCurrency(metrics.tndBalance || 0, 'TND')}</span><span>Archive {formatRawCurrency(metrics.archiveBalance || 0, 'TND')}</span></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/25">
                      <p className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.2em]">Total général TND</p>
                      <p className={`text-xl font-black tracking-tighter ${grandTndTotal >= 0 ? 'text-white' : 'text-rose-300'}`}>{formatRawCurrency(grandTndTotal, 'TND')}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button onClick={() => navigateTo('treasury')} className="flex items-center gap-2.5 p-3 rounded-2xl border border-neutral-800 bg-neutral-900/35 text-left hover:border-neutral-700 transition"><CalendarClock className="h-4 w-4 text-neutral-500 shrink-0" /><div className="min-w-0"><p className="text-[8px] font-black text-neutral-500 uppercase tracking-widest">Planifiés TND</p><p className="text-sm font-black text-neutral-300">{tndUpcoming.length} <span className="text-[9px] text-neutral-600">mvt</span></p></div></button>
                <button onClick={() => navigateTo('reminders')} className="flex items-center gap-2.5 p-3 rounded-2xl border border-neutral-800 bg-neutral-900/35 text-left hover:border-neutral-700 transition"><CalendarClock className="h-4 w-4 text-neutral-500 shrink-0" /><div className="min-w-0"><p className="text-[8px] font-black text-neutral-500 uppercase tracking-widest">Mvts planifiés</p><p className="text-sm font-black text-neutral-300">{dueReminders.length} <span className="text-[9px] text-neutral-600">à confirmer</span></p></div></button>
              </div>

              <div className="grid lg:grid-cols-[1.1fr_.9fr] gap-3">
                <div className="p-4 sm:p-5 bg-neutral-900/55 border border-neutral-800 rounded-[28px] flex flex-col gap-3"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="h-8 w-8 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center text-emerald-300"><Activity className="h-3.5 w-3.5" /></div><h3 className="text-[10px] font-black text-white uppercase tracking-widest">Dernières actions</h3></div><button onClick={() => navigateTo('history')} className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Audit</button></div><div className="flex flex-col gap-1.5">{recentAudit.length === 0 ? <p className="py-4 text-center text-xs text-neutral-500 font-bold">Aucune action récente.</p> : recentAudit.slice(0, 3).map((a: any) => <div key={a.id} className="flex items-center gap-2.5 p-2.5 bg-black/20 border border-neutral-800/80 rounded-xl"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" /><div className="min-w-0 flex-1"><p className="text-[11px] text-neutral-200 font-bold truncate">{displayNamesIn(a.details) || a.action}</p><p className="text-[9px] text-neutral-600 font-black uppercase mt-0.5">{displayUser(a.modifiedBy)} · {new Date(a.createdAt).toLocaleString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</p></div></div>)}</div></div>
                <div className="p-4 sm:p-5 bg-neutral-900/55 border border-neutral-800 rounded-[28px] flex flex-col gap-3"><div className="flex items-center gap-2"><div className="h-8 w-8 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center text-blue-300"><Users className="h-3.5 w-3.5" /></div><h3 className="text-[10px] font-black text-white uppercase tracking-widest">Vue rapide</h3></div><div className="flex flex-col gap-1.5"><button onClick={() => { setContactFilterType('HELD'); navigateTo('contacts'); }} className="flex items-center justify-between p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl text-left hover:border-emerald-500/40 transition"><span className="text-[11px] font-bold text-neutral-300">Encaissé</span><span className="text-sm font-black text-emerald-300">{formatUSD(metrics.totalAvoirs || 0)}</span></button><button onClick={() => { setContactFilterType('PAYABLE'); navigateTo('contacts'); }} className="flex items-center justify-between p-3 bg-rose-500/5 border border-rose-500/15 rounded-xl text-left hover:border-rose-500/40 transition"><span className="text-[11px] font-bold text-neutral-300">Décaissé</span><span className="text-sm font-black text-rose-400">{formatUSD(metrics.totalPayables || 0)}</span></button><button onClick={() => { setContactFilterType('RECEIVABLE'); navigateTo('contacts'); }} className="flex items-center justify-between p-3 bg-blue-500/5 border border-blue-500/15 rounded-xl text-left hover:border-blue-500/40 transition"><span className="text-[11px] font-bold text-neutral-300">À recevoir</span><span className="text-sm font-black text-blue-400">{formatUSD(metrics.totalReceivables || 0)}</span></button></div>{lastAudit && <p className="text-[9px] text-neutral-600 font-bold">MAJ: {new Date(lastAudit.createdAt).toLocaleString('fr-FR')}</p>}</div>
              </div>
            </div>
          );
        })()}

        {activeSection === 'currencies' && (
          <div className="flex flex-col gap-5">
            <div className={`bg-gradient-to-br from-neutral-900 to-black border p-8 rounded-[48px] shadow-2xl relative overflow-hidden ring-1 ring-white/5 ${metrics.netPosition >= 0 ? 'border-emerald-500/20' : 'border-rose-500/20'}`}>
              <div className={`absolute top-0 right-0 p-8 opacity-[0.07] ${metrics.netPosition >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}><DollarSign className="h-32 w-32" /></div>
              <p className="text-[11px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-2">Vue devises et positions partenaires</p>
              <h2 className={`text-4xl sm:text-6xl font-black tracking-tighter break-words ${metrics.netPosition >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatUSD(metrics.netPosition)}</h2>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-5 pt-5 border-t border-white/5"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /><span className="text-[10px] text-neutral-300 font-black uppercase tracking-widest">Live · USD</span></span><span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">+ Encaissé {formatUSD(metrics.totalAvoirs)}</span>{metrics.totalAvoirsTnd > 0.01 && <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">+ Encaissé {formatRawCurrency(metrics.totalAvoirsTnd, 'TND')}</span>}<span className="text-[10px] font-black uppercase tracking-wider text-rose-400">− Décaissé {formatUSD(metrics.totalPayables)}</span><span className="text-[10px] font-black uppercase tracking-wider text-blue-400">À recevoir {formatUSD(metrics.totalReceivables)}</span></div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <ActionCard label="Encaisser" note="Argent confié (+)" style="emerald" icon={<ArrowUpRight className="h-4 w-4 rotate-180" />} onClick={() => { setTransactionForm({ contactId: '', amount: '', currencyCode: 'USD', type: 'HELD', category: 'Virement', note: '', isPostponed: false, dueDate: '', reminderEmail: '', plannedType: 'RECEIVABLE' }); setActiveModal('add_tx'); }} />
              <ActionCard label="Décaisser" note="Repris / dépensé (−)" style="rose" icon={<ArrowUpRight className="h-4 w-4" />} onClick={() => { setTransactionForm({ contactId: '', amount: '', currencyCode: 'USD', type: 'PAYABLE', category: 'Virement', note: '', isPostponed: false, dueDate: '', reminderEmail: '', plannedType: 'RECEIVABLE' }); setActiveModal('add_tx'); }} />
              <ActionCard label="Planifier un mouvement" note="Date future + rappel" style="amber" icon={<CalendarClock className="h-4 w-4" />} onClick={() => { setTransactionForm({ contactId: '', amount: '', currencyCode: 'USD', type: 'HELD', category: 'Virement', note: '', isPostponed: true, dueDate: '', reminderEmail: '', plannedType: 'HELD' }); setActiveModal('add_tx'); }} />
            </div>
            {/* CHINA TRACK — paiements fournisseurs à venir (USD), en lecture seule.
                La source de vérité est CHINA TRACK : un paiement enregistré là-bas
                disparaît d'ici tout seul, rien n'est ressaisi.

                Totaux recalculés ICI depuis les lignes affichées, en tranches QUI NE
                SE CHEVAUCHENT PAS : en retard + sous 30 jours + plus tard = total.

                Chaque ligne porte elle-même ce qui commande le paiement : le TERME,
                la DATE LIMITE et l'ARRIVÉE du conteneur. Survol (ou tap sur mobile) :
                le contrat se déplie et montre les AUTRES versements encore dus — jamais
                celui de la ligne, qui est déjà écrit au-dessus. */}
            {chinaTrack && chinaTrack.configured && (() => {
              const rows: any[] = Array.isArray(chinaTrack.payments) ? chinaTrack.payments : [];
              const today = new Date(); today.setHours(0, 0, 0, 0);
              const in30 = new Date(today.getTime() + 30 * 86400000);
              const dueOf = (p: any) => (p.dueDate ? new Date(p.dueDate + 'T00:00:00') : null);
              const isLate = (p: any) => { const d = dueOf(p); return p.status === 'Late' || (!!d && d < today); };
              const isSoon = (p: any) => { const d = dueOf(p); return !isLate(p) && !!d && d <= in30; };
              const sum = (a: any[]) => a.reduce((s, p) => s + (Number(p.remainingUsd) || 0), 0);
              const lateRows = rows.filter(isLate);
              const soonRows = rows.filter(isSoon);
              const laterRows = rows.filter((p) => !isLate(p) && !isSoon(p));
              const totalUsd = sum(rows);
              const fmtDate = (d: Date | null) => (d ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'date à fixer');
              // Un solde « contre B/L » se paie quand le conteneur arrive au
              // port : CHINA TRACK envoie cette date, on la montre à côté de
              // l'argent. Sur des marchandises dangereuses, l'échéance est
              // DEUX SEMAINES avant cette arrivée — le port ne les garde pas.
              const arrivalOf = (p: any) => (p.arrivalDate ? new Date(p.arrivalDate + 'T00:00:00') : null);
              const fmtShort = (d: Date | null) => (d ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '');
              const ordered = [...rows].sort((a, b) => {
                const la = isLate(a) ? 0 : 1, lb = isLate(b) ? 0 : 1;
                if (la !== lb) return la - lb;
                const ta = dueOf(a)?.getTime() ?? Infinity, tb = dueOf(b)?.getTime() ?? Infinity;
                if (ta !== tb) return ta - tb;
                // Même jour : le dangereux passe devant, il ne peut pas attendre.
                return (a.isDangerousGoods ? 0 : 1) - (b.isDangerousGoods ? 0 : 1);
              });
              const planOf = (orderNo: string) => rows
                .filter((p) => p.orderNo === orderNo)
                .sort((a, b) => (dueOf(a)?.getTime() ?? Infinity) - (dueOf(b)?.getTime() ?? Infinity));
              // CHINA TRACK ouvre deja un contrat depuis son adresse
              // (?order=CT-1008) : on n'a qu'a fabriquer le lien.
              const ctApp = (chinaTrack as any)?.appUrl || 'https://china-track-pro.vercel.app';
              const ctLink = (orderNo: string) => `${ctApp}/?order=${encodeURIComponent(orderNo)}`;
              // Même cadre jaune qui respire que la carte du tableau de bord :
              // il dit « cet argent vit dans CHINA TRACK ». Le bloc portait une
              // bordure neutre invisible, donc rien ne le séparait des blocs
              // MONEY HUB de la page. L'urgence reste portée par le rouge des
              // marchandises dangereuses — le jaune n'est qu'une provenance.
              return (
              <div id="china-track" className="china-card scroll-mt-4 bg-neutral-900/60 border-2 rounded-[32px] p-6 flex flex-col gap-5 shadow-md">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 shrink-0 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-black shadow-lg"><Coins className="h-5 w-5" /></div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-black text-neutral-300 uppercase tracking-[0.2em]">China Track · Paiements à venir</h3>
                    <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mt-0.5">Fournisseurs USD · saisis dans China Track</p>
                    {/* Rien n'est stocke ici : ces montants datent de la derniere
                        relecture chez China Track, pas de l'instant present. */}
                    {chinaFresh.label && (
                      <p className={'text-[9px] font-black uppercase tracking-widest mt-1 ' + (chinaFresh.stale ? 'text-amber-400' : 'text-neutral-600')}>
                        Chiffres lus {chinaFresh.label}{chinaFresh.stale ? ' · à relire' : ''}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => refreshHubState()}
                    aria-label="Relire les paiements China Track"
                    title="Relire les paiements China Track"
                    className="shrink-0 p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-300 active:scale-90 transition"
                  >
                    <RefreshCw className={'h-4 w-4 ' + (isRefreshing ? 'animate-spin' : '')} />
                  </button>
                </div>

                {/* Marchandises dangereuses : le port ne les garde pas. Le
                    solde ET le telex release doivent etre faits AVANT que le
                    conteneur arrive, sinon la marchandise reste bloquee. */}
                {chinaTrack.dangerous?.count > 0 && (
                  <div className="rounded-[24px] border-2 border-rose-500/40 bg-rose-500/10 p-5 flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-rose-300">
                        &#9888; Marchandises dangereuses · {chinaTrack.dangerous.count} contrat{chinaTrack.dangerous.count > 1 ? 's' : ''}
                      </p>
                      {chinaTrack.dangerous.amountUsd > 0 && (
                        <span className="text-[10px] font-black uppercase tracking-wider text-rose-200 bg-rose-500/20 border border-rose-500/30 rounded-xl px-3 py-1.5">
                          {formatUSD(chinaTrack.dangerous.amountUsd)} à payer avant l&apos;arrivée
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-200/90 leading-relaxed">
                      Le port ne garde pas ces conteneurs. Solde et telex release à finir AVANT l&apos;arrivée
                      {chinaTrack.dangerous.soonestArrival ? ` · le plus proche : ${new Date(chinaTrack.dangerous.soonestArrival + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}` : ''}.
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {chinaTrack.dangerous.contracts.map((c: any) => (
                        <div key={c.orderNo} className="flex items-start gap-3 rounded-2xl bg-black/30 border border-rose-500/20 px-4 py-2.5">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-black text-white uppercase tracking-tight leading-snug break-words">
                              {c.supplierName} <span className="text-[9px] text-rose-300/80 whitespace-nowrap">{c.orderNo}</span>
                            </p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-rose-300/80 mt-0.5 break-words leading-relaxed">{c.headline}</p>
                          </div>
                          {c.balanceUsd > 0 && <p className="text-xs font-black text-rose-300 shrink-0 whitespace-nowrap">{formatUSD(c.balanceUsd)}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {chinaTrack.error ? (
                  <p className="text-[11px] font-black uppercase tracking-widest text-amber-400">China Track injoignable ({chinaTrack.error}) — les montants reviendront au prochain chargement.</p>
                ) : rows.length === 0 ? (
                  <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500">
                    {chinaTrack.dangerous?.count > 0
                      ? 'Aucun échéancier saisi — voir les marchandises dangereuses ci-dessus.'
                      : 'Aucun paiement programmé — tout est réglé côté usines.'}
                  </p>
                ) : (
                  <>
                    <div className="rounded-[24px] border border-white/10 bg-black/30 p-5">
                      <p className="text-[9px] font-black text-neutral-500 uppercase tracking-[0.25em]">Reste à payer · total</p>
                      <p className="text-4xl font-black tracking-tighter text-white leading-none mt-1.5">{formatUSD(totalUsd)}</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3">
                        <span className="text-[9px] font-black uppercase tracking-widest text-neutral-600">dont</span>
                        {lateRows.length > 0 && <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">{formatUSD(sum(lateRows))} en retard · {lateRows.length}</span>}
                        {soonRows.length > 0 && <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">{formatUSD(sum(soonRows))} sous 30 jours · {soonRows.length}</span>}
                        {laterRows.length > 0 && <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">{formatUSD(sum(laterRows))} plus tard · {laterRows.length}</span>}
                      </div>
                    </div>

                    <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest -mb-1">Touche une ligne pour voir les autres versements du contrat</p>

                    <div className="flex flex-col gap-2">
                      {ordered.map((pmt: any, i: number) => {
                        const late = isLate(pmt);
                        const d = dueOf(pmt);
                        const arrival = arrivalOf(pmt);
                        // Une date seule ne dit pas s'il faut bouger. Le délai, si.
                        const daysTo = d ? Math.round((d.getTime() - today.getTime()) / 86400000) : null;
                        const paid = (Number(pmt.amountUsd) || 0) - (Number(pmt.remainingUsd) || 0);
                        const open = ctOpen === pmt.orderNo;
                        const plan = open ? planOf(pmt.orderNo) : [];
                        const planTotal = open ? sum(plan) : 0;
                        // Le versement de la ligne est déjà écrit en entier au-dessus :
                        // le panneau ne montre que les AUTRES.
                        const others = plan.filter((st: any) => !(st.label === pmt.label && st.dueDate === pmt.dueDate));
                        return (
                          <div
                            key={pmt.orderNo + '-' + i}
                            onMouseEnter={() => setCtOpen(pmt.orderNo)}
                            onMouseLeave={() => setCtOpen(null)}
                            onClick={() => setCtOpen(open ? null : pmt.orderNo)}
                            className={'rounded-2xl border transition cursor-pointer ' + (late ? 'bg-rose-500/5 border-rose-500/25' : 'bg-neutral-950/60 border-neutral-800') + (open ? ' ring-1 ring-white/15 border-white/20' : '')}
                          >
                            <div className="flex items-start gap-3 px-4 py-3">
                              {/* La pastille disait la date, et la ligne la redisait en
                                  entier juste à côté. Elle porte donc le COMPTE À REBOURS :
                                  la date dit QUAND, la pastille dit s'il faut bouger. */}
                              <div className={'shrink-0 w-14 text-center rounded-xl py-1.5 border ' + (late ? 'bg-rose-500/15 border-rose-500/30' : 'bg-white/5 border-white/10')}>
                                {daysTo === null ? (
                                  <p className="text-[8px] font-black uppercase tracking-widest text-neutral-500 leading-tight">date à fixer</p>
                                ) : daysTo < 0 ? (<>
                                  <p className="text-[8px] font-black uppercase tracking-widest text-rose-400/90 leading-none">Retard</p>
                                  <p className="text-sm font-black leading-none text-rose-300 mt-1">{-daysTo} j</p>
                                </>) : daysTo === 0 ? (
                                  <p className="text-[9px] font-black uppercase tracking-widest text-amber-300 leading-tight">Aujour<wbr />d&apos;hui</p>
                                ) : (<>
                                  <p className="text-[8px] font-black uppercase tracking-widest text-neutral-500 leading-none">Dans</p>
                                  <p className={'text-sm font-black leading-none mt-1 ' + (daysTo <= 7 ? 'text-amber-300' : 'text-white')}>{daysTo} j</p>
                                </>)}
                              </div>
                              <div className="min-w-0 flex-1">
                                {/* Nom + montant sur la même ligne : le montant garde sa place à
                                    droite, et le nom passe à la ligne au lieu d'être coupé. */}
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-sm font-black text-white uppercase tracking-tight leading-snug break-words min-w-0 flex-1">{pmt.supplierName}</p>
                                  <div className="text-right shrink-0">
                                    <p className={'text-base font-black tracking-tighter whitespace-nowrap ' + (late ? 'text-rose-400' : 'text-white')}>{formatUSD(pmt.remainingUsd)}</p>
                                    {paid > 0.005 && <p className="text-[9px] font-black text-emerald-400/80 uppercase tracking-widest mt-0.5 whitespace-nowrap">déjà payé {formatUSD(paid)}</p>}
                                  </div>
                                </div>
                                {/* Ce qu'on achète : le nom du produit était caché derrière
                                    un clic alors qu'il dit de quoi on parle. */}
                                <p className="text-[10px] font-bold text-neutral-400 break-words mt-1">
                                  <span className="font-black uppercase tracking-widest text-neutral-500">{pmt.orderNo}</span>
                                  {pmt.productName ? <> · {pmt.productName}</> : null}
                                </p>
                                {/* Le contrat, c'est la marchandise. Le fret maritime se paie
                                    avec le solde mais reste un cout separe : on ne le fond pas
                                    dans le montant de l'usine sans le dire. */}
                                {Number(pmt.freightUsd) > 0 && (
                                  <p className="text-[9px] font-black uppercase tracking-widest text-teal-300/80 mt-0.5 break-words leading-relaxed">
                                    Marchandise {formatUSD(pmt.amountUsd - pmt.freightUsd)} + fret maritime {formatUSD(pmt.freightUsd)}
                                  </p>
                                )}
                                {/* LES TROIS FAITS QUI COMMANDENT CE PAIEMENT, nommés, sur
                                    la ligne elle-même. Avant : le terme passait en petit gris
                                    sous le nom, la date limite n'existait que comme pastille
                                    « 26 AOÛT » sans dire ce qu'elle était, et l'arrivée était
                                    collée à la consigne dangereux. */}
                                <div className="mt-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 flex flex-col gap-2 sm:grid sm:grid-cols-[96px_1fr] sm:gap-x-3 sm:gap-y-1.5 sm:items-baseline">
                                  {/* Sur téléphone la valeur n'a que ~165 px : l'étiquette
                                      passe AU-DESSUS. À partir de sm: le sous-bloc disparaît
                                      dans la grille et on retrouve deux colonnes. */}
                                  <div className="sm:contents">
                                    <p className="text-[8px] font-black uppercase tracking-[0.15em] text-neutral-500">Terme</p>
                                    <p className="text-[11px] font-black text-white break-words leading-snug">{pmt.label}</p>
                                  </div>
                                  <div className="sm:contents">
                                    <p className="text-[8px] font-black uppercase tracking-[0.15em] text-neutral-500">À payer avant</p>
                                    <p className={'text-xs font-black break-words leading-snug ' + (late ? 'text-rose-300' : 'text-amber-300')}>{fmtDate(d)}</p>
                                  </div>
                                  {arrival && (
                                    <div className="sm:contents">
                                      <p className="text-[8px] font-black uppercase tracking-[0.15em] text-neutral-500">Arrivée port</p>
                                      <p className="text-[11px] font-black text-neutral-200 break-words leading-snug">{fmtDate(arrival)}</p>
                                    </div>
                                  )}
                                  {pmt.isDangerousGoods && (
                                    <p className="sm:col-span-2 text-[9px] font-black uppercase tracking-widest text-rose-300 leading-relaxed border-t border-rose-500/20 pt-1.5">
                                      &#9888; Le port ne garde pas ce conteneur — tout doit être payé avant l&apos;arrivée.
                                    </p>
                                  )}
                                </div>
                                {/* Le contrat vit dans CHINA TRACK. On donnait son
                                    numero, pas la porte : il fallait aller ouvrir l'autre
                                    application a la main et le retrouver. Le drapeau et le
                                    nom disent OU l'on va, le texte dit CE QU'on ouvre, et
                                    la fleche dit que ca part dans un nouvel onglet. */}
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                  {pmt.isDangerousGoods && (
                                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border text-rose-300 border-rose-500/40 bg-rose-500/15 shrink-0">&#9888; Dangereux</span>
                                  )}
                                  <a
                                    href={ctLink(pmt.orderNo)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    /* La ligne elle-meme se deplie au clic : sans ca, ouvrir
                                       le contrat replierait le panneau au passage. */
                                    onClick={(e) => e.stopPropagation()}
                                    title={`Ouvrir la fiche du contrat ${pmt.orderNo} dans China Track — nouvel onglet`}
                                    className="w-full sm:w-auto sm:ml-auto inline-flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 hover:bg-amber-500/20 hover:border-amber-500/70 active:scale-95 transition"
                                  >
                                    <img src="/china-track-icon.svg" alt="" aria-hidden="true" className="h-3.5 w-3.5 rounded-[3px] shrink-0" />
                                    <span className="text-[8px] font-black uppercase tracking-[0.18em] text-amber-200 whitespace-nowrap">China Track</span>
                                    <span className="text-[8px] font-black uppercase tracking-[0.1em] text-neutral-300 whitespace-nowrap">Voir la fiche du contrat</span>
                                    <ExternalLink className="h-3 w-3 text-amber-300 shrink-0" />
                                  </a>
                                </div>
                              </div>
                            </div>

                            {open && (
                              <div className="border-t border-white/10 px-4 py-3.5 bg-black/40 rounded-b-2xl animate-in fade-in duration-150">
                                {/* La ligne au-dessus dit déjà le terme, la date limite,
                                    l'arrivée et le montant. On ne les réécrit pas : ce
                                    panneau n'ajoute que ce qui n'est pas encore visible. */}
                                {others.length > 0 ? (
                                  <>
                                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                                      <p className="text-[9px] font-black text-neutral-500 uppercase tracking-[0.2em]">
                                        {others.length} autre{others.length > 1 ? 's' : ''} versement{others.length > 1 ? 's' : ''} sur ce contrat
                                      </p>
                                      <p className="text-[10px] font-black text-white uppercase tracking-widest shrink-0">Contrat entier · reste {formatUSD(planTotal)}</p>
                                    </div>
                                    <div className="flex flex-col gap-1 mt-2">
                                      {others.map((st: any, k: number) => {
                                        const sd = dueOf(st);
                                        const stLate = isLate(st);
                                        const stPaid = (Number(st.amountUsd) || 0) - (Number(st.remainingUsd) || 0);
                                        return (
                                          <div key={k} className="flex items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 bg-white/[0.04]">
                                            <div className="min-w-0 flex-1">
                                              <p className={'text-[11px] font-black break-words leading-snug ' + (stLate ? 'text-rose-300' : 'text-neutral-200')}>{st.label}</p>
                                              <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest break-words leading-relaxed">
                                                à payer avant {fmtDate(sd)}
                                                {arrivalOf(st) ? ` · arrivée ${fmtShort(arrivalOf(st))}` : ''}
                                              </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                              <p className={'text-[11px] font-black ' + (stLate ? 'text-rose-300' : 'text-white')}>{formatUSD(st.remainingUsd)}</p>
                                              {stPaid > 0.005 && <p className="text-[9px] font-bold text-emerald-400/70">payé {formatUSD(stPaid)}</p>}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </>
                                ) : (
                                  <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-relaxed">C&apos;est le dernier versement encore dû sur ce contrat.</p>
                                )}
                                <p className="text-[9px] font-bold text-neutral-600 mt-2.5 leading-relaxed">Un solde « contre B/L » est daté sur l&apos;arrivée du conteneur au port ; sur des marchandises dangereuses il tombe deux semaines avant, tout doit être payé et le telex release obtenu avant que la boîte touche le quai. Seuls les versements encore dus apparaissent.</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
              );
            })()}
            <div className="flex flex-col gap-4"><div className="flex justify-between items-center px-1"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-black shadow-lg"><Users className="h-5 w-5" /></div><h3 className="text-xs font-black text-neutral-300 uppercase tracking-[0.2em]">Partenaires actifs</h3></div><button onClick={() => navigateTo('contacts')} className="text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:text-emerald-400 transition">Voir tout</button></div><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{filteredContacts.map((c: any) => { const hasTnd = (c.heldBalanceTnd || 0) > 0.01; const cNotes = notesByContact[c.id] || []; const nAdj = noteAdjustByContact[c.id]; const nUsd = nAdj?.usd || 0; const hasNAdj = !!nAdj?.hasAny && Math.abs(nUsd) > 0.01; const shownUsd = c.netPositionUsd + (hasNAdj ? nUsd : 0); const hasUsd = Math.abs(shownUsd) > 0.01; return <div key={c.id} onClick={() => setSelectedContact(c)} className="bg-neutral-900/60 border border-neutral-800 p-5 rounded-[28px] flex flex-col gap-3 active:scale-[0.99] transition cursor-pointer hover:border-neutral-700 shadow-md"><div className="flex justify-between items-center"><div className="flex items-center gap-4"><span className="text-2xl p-2 bg-neutral-950 border border-neutral-800 rounded-xl">{c.emoji}</span><p className="font-black text-white text-base uppercase tracking-tight">{c.name}</p></div><div className="text-right flex flex-col items-end">{(hasUsd || !hasTnd) && <p className={`text-sm font-black ${shownUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatUSD(shownUsd)}{hasNAdj && <span className="text-[8px] text-neutral-500 ml-1">+notes</span>}</p>}{hasTnd && <p className="text-xs font-black text-amber-400 tracking-tighter">{formatRawCurrency(c.heldBalanceTnd, 'TND')}</p>}</div></div><div className="border-t border-neutral-800/70 pt-3"><PartnerNotes notes={cNotes} formatRawCurrency={formatRawCurrency} onAdd={() => openAddNote(c.id, c.name)} onEdit={(n: any) => openEditNote(n, c.name)} onDelete={handleDeleteNote} compact /></div></div>; })}</div></div>
          </div>
        )}

        {activeSection === 'contacts' && (() => {
          const filterMeta: any = { HELD: { label: 'Encaissé', type: 'HELD', color: 'emerald', cta: 'Enregistrer un encaissement' }, RECEIVABLE: { label: 'À recevoir', type: 'RECEIVABLE', color: 'blue', cta: 'Ajouter une somme à recevoir' }, PAYABLE: { label: 'Décaissé', type: 'PAYABLE', color: 'rose', cta: 'Enregistrer un décaissement' } };
          const meta = contactFilterType !== 'ALL' ? filterMeta[contactFilterType] : null;
          const startOp = (type: string) => { setTransactionForm({ ...transactionForm, type, contactId: '' }); setActiveModal('add_tx'); };
          return (
            <div className="flex flex-col gap-4">
              {meta && <div className={`flex items-center justify-between p-4 rounded-2xl border bg-${meta.color}-500/5 border-${meta.color}-500/20`}><div className="flex items-center gap-2.5 min-w-0"><span className={`text-[10px] font-black uppercase text-${meta.color}-400`}>Filtre: {meta.label}</span><span className="text-[10px] font-black text-neutral-500">· {filteredContacts.length} partenaire(s)</span></div><button onClick={() => setContactFilterType('ALL')} className="text-[10px] font-black text-neutral-400 uppercase">Tout voir ✕</button></div>}
              {meta && filteredContacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center gap-5 py-16 animate-fade-up"><div className={`p-6 bg-${meta.color}-500/5 border border-${meta.color}-500/20 rounded-[32px] text-${meta.color}-400 shadow-inner`}><DollarSign className="h-10 w-10" /></div><p className="text-sm font-black uppercase text-neutral-200">Aucun montant « {meta.label} »</p><button onClick={() => startOp(meta.type)} className={`px-6 py-4 bg-${meta.color}-500 text-black font-black uppercase text-[11px] rounded-2xl shadow-xl active:scale-95 transition tracking-widest`}>+ {meta.cta}</button></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {!meta && <div onClick={() => setActiveModal('add_contact')} className="border border-dashed border-neutral-800 bg-neutral-900/10 p-10 rounded-[40px] flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-neutral-900/30 transition shadow-inner group"><div className="p-4 bg-emerald-500/10 rounded-3xl group-hover:scale-110 transition"><Plus className="h-8 w-8 text-emerald-500" /></div><p className="text-xs font-black uppercase tracking-widest text-neutral-400">Ajouter un Partenaire</p></div>}
                  {meta && <div onClick={() => startOp(meta.type)} className={`border border-dashed border-${meta.color}-500/30 bg-${meta.color}-500/5 p-10 rounded-[40px] flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-${meta.color}-500/10 transition group`}><div className={`p-4 bg-${meta.color}-500/10 rounded-3xl group-hover:scale-110 transition`}><Plus className={`h-8 w-8 text-${meta.color}-400`} /></div><p className="text-xs font-black uppercase tracking-widest text-neutral-300">{meta.cta}</p></div>}
                  {filteredContacts.map((c: any) => <ContactCard key={c.id} c={c} formatUSD={formatUSD} formatRawCurrency={formatRawCurrency} onEdit={handleOpenEditContact} onSelect={setSelectedContact} notes={notesByContact[c.id]} noteAdjust={noteAdjustByContact[c.id]} onAddNote={(ct: any) => openAddNote(ct.id, ct.name)} onEditNote={openEditNote} onDeleteNote={handleDeleteNote} />)}
                </div>
              )}
            </div>
          );
        })()}

        {activeSection === 'treasury' && (() => {
          // Precompute running balance in O(n) — walk oldest→newest to build map
          const balanceById: Record<string, number> = {};
          {
            const ordered = [...optimisticTndMovements].reverse(); // oldest first
            let acc = 0;
            for (const m of ordered) { if (m.isSettled !== false) { acc += (m.type === 'IN' ? m.amount : -m.amount); } balanceById[m.id] = acc; }
          }
          // Filter chain
          const now = Date.now();
          const periodMs = tndPeriod === 'today' ? 86400000 : tndPeriod === '7d' ? 7*86400000 : tndPeriod === '30d' ? 30*86400000 : 0;
          const min = parseFloat(tndAmountMin || '');
          const max = parseFloat(tndAmountMax || '');
          const q = tndSearch.trim().toLowerCase();
          // Receivables ("à récupérer") live in their own section, never in the main journal.
          const receivables = optimisticTndMovements.filter((m: any) => isReceivableNote(m.note) && m.isSettled === false);
          const receivablesTotal = receivables.reduce((s: number, m: any) => s + m.amount, 0);
          const filtered = optimisticTndMovements.filter((m: any) => {
            if (isReceivableNote(m.note) && m.isSettled === false) return false;
            if (tndTypeFilter !== 'all' && m.type !== tndTypeFilter) return false;
            if (tndUserFilter !== 'all' && m.performedBy !== tndUserFilter) return false;
            if (periodMs > 0 && (now - new Date(m.createdAt).getTime()) > periodMs) return false;
            if (!isNaN(min) && m.amount < min) return false;
            if (!isNaN(max) && m.amount > max) return false;
            if (q) {
              const hay = `${m.note || ''} ${m.performedBy || ''} ${displayUser(m.performedBy)} ${m.amount}`.toLowerCase();
              if (!hay.includes(q)) return false;
            }
            return true;
          });
          const uniqueUsers: string[] = Array.from(new Set(optimisticTndMovements.map((m: any) => m.performedBy).filter(Boolean))) as string[];
          const filteredIn = filtered.filter((m:any) => m.type === 'IN').reduce((s:number,m:any) => s+m.amount, 0);
          const filteredOut = filtered.filter((m:any) => m.type === 'OUT').reduce((s:number,m:any) => s+m.amount, 0);
          return (
            <div className="flex flex-col gap-6 pb-20">
              {/* SCHEDULED ALERT BANNER — admin only, appears from J-1 or overdue */}
              {currentUser.role === 'admin' && (tndDueSoon.length > 0 || tndOverdue.length > 0) && (
                <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-orange-500/10 border-2 border-amber-500/40 rounded-[36px] p-6 shadow-2xl shadow-amber-500/10 animate-in slide-in-from-top duration-300">
                  <div className="absolute -top-12 -right-12 opacity-10 pointer-events-none text-amber-400"><Bell className="h-40 w-40" /></div>
                  <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 bg-amber-500/20 rounded-2xl ring-1 ring-amber-500/40 animate-pulse"><Bell className="h-5 w-5 text-amber-300" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-amber-300 uppercase tracking-[0.25em]">Rappel Coffre</p>
                      <h3 className="text-xl font-black text-white leading-tight mt-1">
                        {tndOverdue.length > 0 ? `${tndOverdue.length} mouvement${tndOverdue.length>1?'s':''} en retard` : `${tndDueSoon.length} mouvement${tndDueSoon.length>1?'s':''} prévu${tndDueSoon.length>1?'s':''} sous 24h`}
                      </h3>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {[...tndOverdue, ...tndDueSoon.filter(m => !tndOverdue.some(o => o.id === m.id))].slice(0, 4).map((m: any) => {
                      const isOverdue = m.scheduledFor && new Date(m.scheduledFor).getTime() < Date.now();
                      return (
                        <div key={m.id} className="flex items-center justify-between gap-3 p-3.5 bg-black/40 border border-amber-500/20 rounded-2xl">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={`shrink-0 h-9 w-9 rounded-xl flex items-center justify-center ${m.type === 'IN' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                              {m.type === 'IN' ? <Plus className="h-4 w-4 stroke-[3]" /> : <ArrowUpRight className="h-4 w-4 stroke-[3] rotate-90" />}
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                              <p className="text-sm font-black text-white truncate">{m.note}</p>
                              <p className={`text-[10px] font-black uppercase tracking-widest ${isOverdue ? 'text-rose-300' : 'text-amber-300'}`}>
                                {isOverdue ? '⚠ En retard depuis' : '📅 Prévu'} {m.scheduledFor ? new Date(m.scheduledFor).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <p className={`text-base font-black tracking-tighter ${m.type === 'IN' ? 'text-emerald-400' : 'text-rose-400'}`}>{m.type === 'IN' ? '+' : '-'}{formatRawCurrency(m.amount, 'TND')}</p>
                            <button onClick={() => handleSettleTndMovement(m.id)} className="px-3 py-2 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 transition active:scale-95">Confirmer</button>
                          </div>
                        </div>
                      );
                    })}
                    {(tndDueSoon.length + tndOverdue.length) > 4 && (
                      <p className="text-center text-[10px] font-black text-amber-300 uppercase tracking-widest pt-2">+ {(tndDueSoon.length + tndOverdue.length) - 4} autre{(tndDueSoon.length + tndOverdue.length) - 4 > 1 ? 's' : ''} — voir le journal</p>
                    )}
                  </div>
                </div>
              )}

              {/* HERO — balance + today + forecast */}
              <div className="bg-gradient-to-br from-[#0f172a] to-black border border-blue-500/20 p-8 rounded-[48px] shadow-2xl relative overflow-hidden ring-1 ring-white/5">
                <div className="absolute -top-10 -right-10 opacity-[0.05] pointer-events-none text-blue-400"><CoffreIcon className="h-48 w-48" /></div>
                <p className="text-[11px] font-black text-blue-300 uppercase tracking-[0.3em] mb-2">Coffre TND Disponible</p>
                <h2 className="text-6xl font-black tracking-tighter text-white break-words leading-none">{formatRawCurrency(metrics.tndBalance, 'TND')}</h2>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-7 pt-6 border-t border-white/5">
                  <div className="flex flex-col"><p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Entrées Aujourd'hui</p><p className="text-emerald-400 font-black text-base tracking-tighter">+{formatRawCurrency(metrics.tndTodayIn, 'TND')}</p></div>
                  <div className="flex flex-col"><p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Sorties Aujourd'hui</p><p className="text-rose-400 font-black text-base tracking-tighter">-{formatRawCurrency(metrics.tndTodayOut, 'TND')}</p></div>
                  {(tndUpcoming.length > 0) && (
                    <div className="flex flex-col border-l border-white/10 pl-6">
                      <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Solde Projeté</p>
                      <p className="text-blue-300 font-black text-base tracking-tighter">{formatRawCurrency(metrics.tndBalance + (metrics.tndPendingIn || 0) - (metrics.tndPendingOut || 0), 'TND')}</p>
                      <p className="text-[9px] text-neutral-500 font-black uppercase tracking-widest mt-0.5">{tndUpcoming.length} planifié{tndUpcoming.length>1?'s':''}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* QUICK ACTIONS */}
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => { setTndForm({ amount: '', type: 'IN', note: '' }); setActiveModal('add_tnd'); }} className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-[32px] flex flex-col items-center gap-3 active:scale-95 transition group hover:bg-emerald-500/20"><div className="p-3 bg-emerald-500/20 rounded-2xl group-hover:scale-110 transition"><Plus className="h-6 w-6 text-emerald-400" /></div><p className="text-[10px] font-black uppercase text-emerald-400">Encaisser TND</p></button>
                <button onClick={() => { setTndForm({ amount: '', type: 'OUT', note: '', scheduledFor: '' }); setTndBatchItems([{ amount: '', note: '' }]); setActiveModal('add_tnd'); }} className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-[32px] flex flex-col items-center gap-3 active:scale-95 transition group hover:bg-rose-500/20"><div className="p-3 bg-rose-500/20 rounded-2xl group-hover:scale-110 transition rotate-45"><Plus className="h-6 w-6 text-rose-400" /></div><p className="text-[10px] font-black uppercase text-rose-400">Décaissement</p></button>
              </div>

              {currentUser.role === 'admin' && (
                <button onClick={() => { setTransferForm({ amount: '', note: '' }); setActiveModal('transfer_archive'); }} className="w-full p-5 bg-gradient-to-r from-amber-500/15 to-violet-500/15 border border-amber-500/30 rounded-[28px] flex items-center justify-center gap-3 active:scale-[0.98] transition hover:border-amber-500/60 shadow-lg shadow-amber-950/10"><ArrowLeftRight className="h-5 w-5 text-amber-300" /><p className="text-[11px] font-black uppercase tracking-widest text-amber-200">Transfert Coffre → Archive</p><span className="text-[8px] font-black uppercase tracking-widest text-violet-300 bg-violet-500/15 border border-violet-500/30 px-2 py-0.5 rounded-md">Admin</span></button>
              )}

              {/* CRÉANCES — one connected module: action + list share the same visual container */}
              <div className="relative overflow-hidden rounded-[36px] border-2 border-sky-500/30 bg-gradient-to-br from-sky-500/12 via-sky-500/5 to-cyan-500/10 shadow-2xl shadow-sky-950/10">
                <div className="absolute -top-12 -right-12 opacity-[0.07] pointer-events-none text-sky-400"><Bell className="h-40 w-40" /></div>
                <button onClick={() => { setReceivableForm({ amount: '', note: '' }); setActiveModal('add_receivable'); }} className="relative w-full p-5 flex items-center justify-between gap-4 text-left active:scale-[0.99] transition hover:bg-sky-500/10 border-b border-sky-500/20">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-3 bg-sky-500/20 rounded-2xl ring-1 ring-sky-500/40 shrink-0"><Bell className="h-5 w-5 text-sky-300" /></div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-sky-300 uppercase tracking-[0.25em]">Créances · On me doit de l'argent</p>
                      <p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mt-0.5">Même module que « À récupérer » · hors solde</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="hidden sm:inline-flex text-[8px] font-black uppercase tracking-widest text-sky-300 bg-sky-500/15 border border-sky-500/30 px-2 py-1 rounded-lg">Hors solde</span>
                    <span className="h-9 w-9 rounded-xl bg-white text-black flex items-center justify-center shadow-lg"><Plus className="h-4 w-4 stroke-[3]" /></span>
                  </div>
                </button>

                {/* À RÉCUPÉRER — money owed to you: visible, noted, NOT counted in the balance */}
                {receivables.length > 0 ? (
                  <div className="relative p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="min-w-0"><p className="text-[10px] font-black text-sky-300 uppercase tracking-[0.25em]">À récupérer</p><p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mt-0.5">Total des créances hors solde</p></div>
                      <p className="text-2xl font-black text-sky-300 tracking-tighter shrink-0">{formatRawCurrency(receivablesTotal, 'TND')}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      {receivables.map((m: any) => (
                        <div key={m.id} className="flex items-center justify-between gap-3 p-3.5 bg-black/40 border border-sky-500/20 rounded-2xl">
                          <div className="flex flex-col min-w-0 flex-1">
                            <p className="text-sm font-black text-white truncate">{cleanReceivableNote(m.note)}</p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mt-0.5">{new Date(m.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}{m.performedBy ? ` · ${displayUser(m.performedBy)}` : ''}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <p className="text-base font-black text-sky-300 tracking-tighter">{formatRawCurrency(m.amount, 'TND')}</p>
                            <button onClick={() => { setTndNoteEdit({ id: m.id, note: cleanReceivableNote(m.note), amount: m.amount, type: m.type }); setTndNoteEditError(''); }} className="p-2 text-blue-400/60 hover:text-blue-300 hover:bg-blue-500/10 rounded-xl transition active:scale-90" title="Modifier la note"><Edit className="h-4 w-4" /></button>
                            <button onClick={() => handleSettleTndMovement(m.id)} className="px-3 py-2 bg-emerald-500 text-black rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-400 transition active:scale-95" title="Marquer comme récupéré (ajoute au solde)">✓ Récupéré</button>
                            {currentUser.role === 'admin' && <button onClick={() => handleDeleteTndMovement(m.id)} className="p-2 text-rose-500/30 hover:text-rose-500 transition active:scale-90"><Trash2 className="h-4 w-4" /></button>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="relative px-5 pb-5 pt-4 border-t border-sky-500/10">
                    <p className="text-[10px] font-bold text-neutral-500 text-center">Aucune somme à récupérer. Utilise le bouton au-dessus pour ajouter une créance hors solde.</p>
                  </div>
                )}
              </div>

              {/* SEARCH + FILTERS */}
              <div className="flex flex-col gap-3 p-5 bg-neutral-900/40 border border-neutral-800 rounded-[32px]">
                <div className="relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 pointer-events-none" />
                  <input value={tndSearch} onChange={e => setTndSearch(e.target.value)} placeholder="Rechercher note, montant, utilisateur…" className="w-full pl-12 pr-4 py-3.5 bg-neutral-950 border border-neutral-800 rounded-2xl text-sm text-white outline-none focus:border-blue-500/40" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'today', label: "Aujourd'hui" },
                    { id: '7d', label: '7 jours' },
                    { id: '30d', label: '30 jours' },
                    { id: 'all', label: 'Tout' },
                  ].map(p => (
                    <button key={p.id} onClick={() => setTndPeriod(p.id as any)} className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition ${tndPeriod === p.id ? 'bg-white text-black' : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'}`}>{p.label}</button>
                  ))}
                  <span className="mx-1 border-l border-neutral-800" />
                  {[
                    { id: 'all', label: 'Tous types' },
                    { id: 'IN', label: '+ Entrées' },
                    { id: 'OUT', label: '- Sorties' },
                  ].map(t => (
                    <button key={t.id} onClick={() => setTndTypeFilter(t.id as any)} className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition ${tndTypeFilter === t.id ? 'bg-white text-black' : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'}`}>{t.label}</button>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select value={tndUserFilter} onChange={e => setTndUserFilter(e.target.value)} className="bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-3 text-xs font-black text-white outline-none focus:border-blue-500/40">
                    <option value="all">Tous utilisateurs</option>
                    {uniqueUsers.map(u => <option key={u} value={u}>{displayUser(u)}</option>)}
                  </select>
                  <input type="number" placeholder="Montant min" value={tndAmountMin} onChange={e => setTndAmountMin(e.target.value)} className="bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-3 text-xs font-black text-white outline-none focus:border-blue-500/40" />
                  <input type="number" placeholder="Montant max" value={tndAmountMax} onChange={e => setTndAmountMax(e.target.value)} className="bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-3 text-xs font-black text-white outline-none focus:border-blue-500/40" />
                </div>
                {(tndSearch || tndPeriod !== 'all' || tndUserFilter !== 'all' || tndAmountMin || tndAmountMax || tndTypeFilter !== 'all') && (
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                    <div className="flex items-center gap-5 text-[10px] font-black uppercase tracking-widest">
                      <span className="text-neutral-400">{filtered.length} rés.</span>
                      <span className="text-emerald-400">+{formatRawCurrency(filteredIn, 'TND')}</span>
                      <span className="text-rose-400">-{formatRawCurrency(filteredOut, 'TND')}</span>
                    </div>
                    <button onClick={() => { setTndSearch(''); setTndPeriod('all'); setTndUserFilter('all'); setTndAmountMin(''); setTndAmountMax(''); setTndTypeFilter('all'); }} className="text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-white transition">Réinitialiser</button>
                  </div>
                )}
              </div>

              {/* JOURNAL */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-neutral-900 pb-3 px-1">
                  <h4 className="text-[11px] font-black text-neutral-300 uppercase tracking-[0.25em] flex items-center gap-2"><Clock className="h-4 w-4" /> Journal de Caisse</h4>
                  <span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider">{filtered.length} / {optimisticTndMovements.length}</span>
                </div>
                {filtered.length === 0 && <EmptyState icon={<CoffreIcon className="h-10 w-10" />} title={optimisticTndMovements.length === 0 ? 'Coffre-fort vide' : 'Aucun résultat'} subtitle={optimisticTndMovements.length === 0 ? 'Enregistrez votre premier mouvement.' : 'Essayez de modifier les filtres.'} />}
                <div className="flex flex-col gap-3">
                  {filtered.map((m: any) => {
                    const running = balanceById[m.id] ?? 0;
                    const isPending = m.isSettled === false;
                    const isTransfer = isTransferNote(m.note);
                    const isRecovered = isReceivableNote(m.note);
                    const cleanNote = isTransfer ? m.note.replace(TREASURY_ARCHIVE_TAG, '').replace(/^\s*·\s*/, '').trim() : isRecovered ? cleanReceivableNote(m.note) : m.note;
                    return (
                      <div key={m.id} className={`group relative p-5 pl-6 border rounded-[32px] flex justify-between items-center gap-4 transition ${isTransfer ? 'bg-violet-500/10 border-violet-500/40 hover:border-violet-500/60 ring-1 ring-violet-500/20' : isPending ? 'bg-amber-500/5 border-amber-500/30 hover:border-amber-500/50' : 'bg-neutral-900/40 border-neutral-800 hover:border-neutral-700'}`}>
                        <span className={`absolute left-0 top-6 bottom-6 w-1 rounded-full ${isTransfer ? 'bg-violet-400 shadow-lg' : isPending ? 'bg-amber-400' : m.type === 'IN' ? 'bg-emerald-500 shadow-lg' : 'bg-rose-500'}`} />
                        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isTransfer && <span className="px-2 py-0.5 bg-violet-500/20 border border-violet-500/40 text-violet-200 rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1"><ArrowLeftRight className="h-2.5 w-2.5" /> Transfert Archive</span>}
                            {isRecovered && <span className="px-2 py-0.5 bg-sky-500/20 border border-sky-500/40 text-sky-200 rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1"><Bell className="h-2.5 w-2.5" /> Récupéré</span>}
                            {isPending && <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1"><CalendarClock className="h-2.5 w-2.5" /> Prévu</span>}
                            <p className={`text-sm font-bold leading-tight break-words ${isTransfer ? 'text-violet-100' : isPending ? 'text-amber-100' : 'text-neutral-200'}`}>{cleanNote}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            {isPending && m.scheduledFor ? (
                              <p className="text-[9px] text-amber-400 font-black uppercase flex items-center gap-1"><CalendarClock className="h-3 w-3" /> {new Date(m.scheduledFor).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' })}</p>
                            ) : (
                              <p className="text-[9px] text-neutral-600 font-black uppercase">{new Date(m.createdAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</p>
                            )}
                            {m.performedBy && <p className="text-[9px] text-blue-400 font-black uppercase flex items-center gap-1"><Users className="h-3 w-3" /> {displayUser(m.performedBy)}</p>}
                            {!isPending && <p className="text-[9px] text-neutral-500 font-black uppercase flex items-center gap-1.5"><History className="h-3 w-3" /> Solde: {formatRawCurrency(running, 'TND')}</p>}
                          </div>
                        </div>
                        <div className="text-right shrink-0 flex items-center gap-3">
                          <p className={`text-lg font-black tracking-tighter ${isPending ? 'text-amber-300' : m.type === 'IN' ? 'text-emerald-400' : 'text-rose-400'}`}>{m.type === 'IN' ? '+' : '-'}{formatRawCurrency(m.amount, 'TND')}</p>
                          {isPending && currentUser.role === 'admin' && (
                            <button onClick={() => handleSettleTndMovement(m.id)} className="px-3 py-2 bg-emerald-500 text-black rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-400 transition active:scale-95" title="Confirmer l'encaissement">✓</button>
                          )}
                          <button onClick={() => { setTndNoteEdit({ id: m.id, note: m.note, amount: m.amount, type: m.type }); setTndNoteEditError(''); }} className="p-2 text-blue-400/60 hover:text-blue-300 hover:bg-blue-500/10 rounded-xl transition active:scale-90" title="Modifier uniquement la note"><Edit className="h-4 w-4" /></button>
                          {currentUser.role === 'admin' && <button onClick={() => handleDeleteTndMovement(m.id)} className="p-2 text-rose-500/20 hover:text-rose-500 transition active:scale-90"><Trash2 className="h-4 w-4" /></button>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {activeSection === 'banque' && (() => {
          const account = bankAccounts.find((a: any) => a.id === selectedBankId) || bankAccounts[0] || null;
          const cur = account?.currencyCode || 'TND';
          const accMovements = account ? bankMovements.filter((m: any) => m.accountId === account.id) : [];
          // Running balance oldest→newest
          const balanceById: Record<string, number> = {};
          { const ordered = [...accMovements].reverse(); let acc = 0; for (const m of ordered) { if (m.isSettled !== false) acc += (m.type === 'IN' ? m.amount : -m.amount); balanceById[m.id] = acc; } }
          const settled = accMovements.filter((m: any) => m.isSettled !== false);
          const balance = settled.reduce((s: number, m: any) => s + (m.type === 'IN' ? m.amount : -m.amount), 0);
          const startToday = new Date(); startToday.setHours(0,0,0,0);
          const todayIn = settled.filter((m: any) => m.type === 'IN' && new Date(m.createdAt) >= startToday).reduce((s: number, m: any) => s + m.amount, 0);
          const todayOut = settled.filter((m: any) => m.type === 'OUT' && new Date(m.createdAt) >= startToday).reduce((s: number, m: any) => s + m.amount, 0);
          const pending = accMovements.filter((m: any) => m.isSettled === false && m.scheduledFor);
          const pendingIn = pending.filter((m: any) => m.type === 'IN').reduce((s: number, m: any) => s + m.amount, 0);
          const pendingOut = pending.filter((m: any) => m.type === 'OUT').reduce((s: number, m: any) => s + m.amount, 0);
          const now = Date.now();
          const periodMs = bankPeriod === 'today' ? 86400000 : bankPeriod === '7d' ? 7*86400000 : bankPeriod === '30d' ? 30*86400000 : 0;
          const q = bankSearch.trim().toLowerCase();
          const filtered = accMovements.filter((m: any) => {
            if (bankTypeFilter !== 'all' && m.type !== bankTypeFilter) return false;
            if (periodMs > 0 && (now - new Date(m.createdAt).getTime()) > periodMs) return false;
            if (q) { const hay = `${m.note || ''} ${m.performedBy || ''} ${displayUser(m.performedBy)} ${m.amount}`.toLowerCase(); if (!hay.includes(q)) return false; }
            return true;
          });
          return (
            <div className="flex flex-col gap-6 pb-20">
              <div className="flex items-center justify-between px-1">
                <div><p className="text-[9px] font-black text-teal-300 uppercase tracking-[0.22em]">Command center</p><h2 className="text-2xl font-black tracking-[-0.06em] text-white leading-none mt-0.5 flex items-center gap-2"><Landmark className="h-6 w-6 text-teal-300" /> Banque</h2></div>
                <button onClick={() => { setNewAccountForm({ name: '', currencyCode: 'TND' }); setActiveModal('add_bank_account'); }} className="shrink-0 px-3.5 py-2.5 bg-teal-500/15 border border-teal-500/30 rounded-2xl text-teal-200 text-[10px] font-black uppercase tracking-widest active:scale-95 transition flex items-center gap-1.5"><Plus className="h-4 w-4" /> Compte</button>
              </div>

              {bankAccounts.length === 0 ? (
                <EmptyState icon={<Landmark className="h-10 w-10" />} title="Aucun compte bancaire" subtitle="Crée ton premier compte pour suivre son solde et ses mouvements." />
              ) : (
                <>
                  {/* Account selector — bigger, color-coded chips; active one is unmistakable */}
                  {bankAccounts.length > 1 && (
                    <div className="flex flex-col gap-2">
                      <p className="text-[9px] font-black text-neutral-500 uppercase tracking-[0.2em] px-1 flex items-center gap-1.5"><Landmark className="h-3 w-3" /> Choisir le compte</p>
                      <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1">
                        {bankAccounts.map((a: any) => {
                          const p = bankPalette(a.id); const on = account?.id === a.id;
                          return (
                            <button key={a.id} onClick={() => setSelectedBankId(a.id)} className={`shrink-0 text-left px-4 py-3 rounded-2xl border transition min-w-[150px] relative ${on ? `${p.bgSoft} ${p.border} ring-2 ${p.ring} scale-[1.02] shadow-lg` : 'bg-neutral-900/50 border-neutral-800 hover:border-neutral-700 opacity-70'}`}>
                              <div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${p.dot}`} />{isBiatAccount(a.name) && <img src={BIAT_LOGO_SRC} alt="BIAT" className="h-[1.1em] w-auto rounded-sm shrink-0 bg-white/95 p-px" />}<p className={`text-sm font-black uppercase tracking-tight truncate ${on ? 'text-white' : 'text-neutral-300'}`}>{a.name}</p>{on && <CheckCircle className={`h-3.5 w-3.5 ml-auto ${p.text}`} />}</div>
                              <p className={`text-lg font-black tracking-tighter mt-1 ${(a.balance || 0) >= 0 ? (on ? p.text : 'text-neutral-400') : 'text-rose-400'}`}>{formatRawCurrency(a.balance || 0, a.currencyCode)}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {account && (() => { const p = bankPalette(account.id); return (<>
                  {/* HERO — account name is the biggest element so the active account is unmistakable */}
                  <div className={`bg-gradient-to-br ${p.heroFrom} to-black border-2 ${p.border} p-8 rounded-[48px] shadow-2xl relative overflow-hidden ring-1 ring-white/5`}>
                    <div className={`absolute -top-10 -right-10 opacity-[0.06] pointer-events-none ${p.text}`}><Landmark className="h-48 w-48" /></div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1"><span className={`h-3 w-3 rounded-full ${p.dot}`} /><p className={`text-[10px] font-black ${p.text} uppercase tracking-[0.3em]`}>Compte actif</p></div>
                        <h2 className={`text-4xl sm:text-5xl font-black tracking-tighter break-words leading-[0.95] ${p.text} flex items-center gap-2.5`}>
                          {isBiatAccount(account.name) && <img src={BIAT_LOGO_SRC} alt="BIAT" className="h-[1em] w-auto rounded-md shrink-0 bg-white/95 p-0.5 ring-1 ring-white/20" />}
                          <span className="break-words min-w-0">{account.name}</span>
                        </h2>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => { setRenameAccountId(account.id); setRenameAccountName(account.name); setActiveModal('rename_bank_account'); }} className="p-2 rounded-xl bg-neutral-900/70 border border-neutral-800 text-blue-300 active:scale-90 transition"><Edit className="h-4 w-4" /></button>
                        {currentUser.role === 'admin' && <button onClick={() => handleDeleteBankAccount(account.id, account.name)} className="p-2 rounded-xl bg-neutral-900/70 border border-neutral-800 text-rose-400 active:scale-90 transition"><Trash2 className="h-4 w-4" /></button>}
                      </div>
                    </div>
                    <div className="mt-6"><p className="text-[9px] font-black text-neutral-500 uppercase tracking-[0.25em] mb-1">Solde · {cur}</p><h3 className="text-5xl sm:text-6xl font-black tracking-tighter text-white break-words leading-none">{formatRawCurrency(balance, cur)}</h3></div>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-7 pt-6 border-t border-white/5">
                      <div className="flex flex-col"><p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Entrées Auj.</p><p className="text-emerald-400 font-black text-base tracking-tighter">+{formatRawCurrency(todayIn, cur)}</p></div>
                      <div className="flex flex-col"><p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Sorties Auj.</p><p className="text-rose-400 font-black text-base tracking-tighter">-{formatRawCurrency(todayOut, cur)}</p></div>
                      {pending.length > 0 && (
                        <div className="flex flex-col border-l border-white/10 pl-6"><p className={`text-[9px] font-black ${p.text} uppercase tracking-widest`}>Solde Projeté</p><p className={`${p.text} font-black text-base tracking-tighter`}>{formatRawCurrency(balance + pendingIn - pendingOut, cur)}</p><p className="text-[9px] text-neutral-500 font-black uppercase tracking-widest mt-0.5">{pending.length} planifié{pending.length>1?'s':''}</p></div>
                      )}
                    </div>
                  </div>

                  {/* QUICK ACTIONS */}
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => { setBankForm({ amount: '', type: 'IN', note: '', scheduledFor: '' }); setActiveModal('add_bank'); }} className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-[32px] flex flex-col items-center gap-3 active:scale-95 transition group hover:bg-emerald-500/20"><div className="p-3 bg-emerald-500/20 rounded-2xl group-hover:scale-110 transition"><Plus className="h-6 w-6 text-emerald-400" /></div><p className="text-[10px] font-black uppercase text-emerald-400">Entrée</p></button>
                    <button onClick={() => { setBankForm({ amount: '', type: 'OUT', note: '', scheduledFor: '' }); setBankBatchItems([{ amount: '', note: '' }]); setActiveModal('add_bank'); }} className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-[32px] flex flex-col items-center gap-3 active:scale-95 transition group hover:bg-rose-500/20"><div className="p-3 bg-rose-500/20 rounded-2xl group-hover:scale-110 transition rotate-45"><Plus className="h-6 w-6 text-rose-400" /></div><p className="text-[10px] font-black uppercase text-rose-400">Sortie</p></button>
                  </div>

                  {/* FILTERS */}
                  <div className="flex flex-col gap-3 p-5 bg-neutral-900/40 border border-neutral-800 rounded-[32px]">
                    <div className="relative"><Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 pointer-events-none" /><input value={bankSearch} onChange={e => setBankSearch(e.target.value)} placeholder="Rechercher note, montant…" className="w-full pl-12 pr-4 py-3.5 bg-neutral-950 border border-neutral-800 rounded-2xl text-sm text-white outline-none focus:border-teal-500/40" /></div>
                    <div className="flex flex-wrap gap-2">
                      {[{ id: 'today', label: "Auj." }, { id: '7d', label: '7j' }, { id: '30d', label: '30j' }, { id: 'all', label: 'Tout' }].map(p => (
                        <button key={p.id} onClick={() => setBankPeriod(p.id as any)} className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition ${bankPeriod === p.id ? 'bg-white text-black' : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'}`}>{p.label}</button>
                      ))}
                      <span className="mx-1 border-l border-neutral-800" />
                      {[{ id: 'all', label: 'Tous' }, { id: 'IN', label: '+ Entrées' }, { id: 'OUT', label: '- Sorties' }].map(t => (
                        <button key={t.id} onClick={() => setBankTypeFilter(t.id as any)} className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition ${bankTypeFilter === t.id ? 'bg-white text-black' : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'}`}>{t.label}</button>
                      ))}
                    </div>
                  </div>

                  {/* JOURNAL */}
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-neutral-900 pb-3 px-1"><h4 className="text-[11px] font-black text-neutral-300 uppercase tracking-[0.25em] flex items-center gap-2"><Clock className="h-4 w-4" /> Journal — {account.name}</h4><span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider">{filtered.length} / {accMovements.length}</span></div>
                    {filtered.length === 0 && <EmptyState icon={<Landmark className="h-10 w-10" />} title={accMovements.length === 0 ? 'Compte vide' : 'Aucun résultat'} subtitle={accMovements.length === 0 ? 'Enregistre ton premier mouvement.' : 'Modifie les filtres.'} />}
                    <div className="flex flex-col gap-3">
                      {filtered.map((m: any) => {
                        const running = balanceById[m.id] ?? 0;
                        const isPending = m.isSettled === false;
                        return (
                          <div key={m.id} className={`group relative p-5 pl-6 border rounded-[32px] flex justify-between items-center gap-4 transition ${isPending ? 'bg-amber-500/5 border-amber-500/30 hover:border-amber-500/50' : 'bg-neutral-900/40 border-neutral-800 hover:border-neutral-700'}`}>
                            <span className={`absolute left-0 top-6 bottom-6 w-1 rounded-full ${isPending ? 'bg-amber-400' : m.type === 'IN' ? 'bg-emerald-500 shadow-lg' : 'bg-rose-500'}`} />
                            <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">{isPending && <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1"><CalendarClock className="h-2.5 w-2.5" /> Prévu</span>}<p className={`text-sm font-bold leading-tight break-words ${isPending ? 'text-amber-100' : 'text-neutral-200'}`}>{m.note}</p></div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                {isPending && m.scheduledFor ? (<p className="text-[9px] text-amber-400 font-black uppercase flex items-center gap-1"><CalendarClock className="h-3 w-3" /> {new Date(m.scheduledFor).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' })}</p>) : (<p className="text-[9px] text-neutral-600 font-black uppercase">{new Date(m.createdAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</p>)}
                                {m.performedBy && <p className="text-[9px] text-teal-400 font-black uppercase flex items-center gap-1"><Users className="h-3 w-3" /> {displayUser(m.performedBy)}</p>}
                                {!isPending && <p className="text-[9px] text-neutral-500 font-black uppercase flex items-center gap-1.5"><History className="h-3 w-3" /> Solde: {formatRawCurrency(running, cur)}</p>}
                              </div>
                            </div>
                            <div className="text-right shrink-0 flex items-center gap-3">
                              <p className={`text-lg font-black tracking-tighter ${isPending ? 'text-amber-300' : m.type === 'IN' ? 'text-emerald-400' : 'text-rose-400'}`}>{m.type === 'IN' ? '+' : '-'}{formatRawCurrency(m.amount, cur)}</p>
                              {isPending && <button onClick={() => handleSettleBankMovement(m.id)} className="px-3 py-2 bg-emerald-500 text-black rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-400 transition active:scale-95">✓</button>}
                              <button onClick={() => { setBankNoteEdit({ id: m.id, note: m.note, amount: m.amount, type: m.type }); setBankNoteEditError(''); }} className="p-2 text-blue-400/60 hover:text-blue-300 hover:bg-blue-500/10 rounded-xl transition active:scale-90"><Edit className="h-4 w-4" /></button>
                              {currentUser.role === 'admin' && <button onClick={() => handleDeleteBankMovement(m.id)} className="p-2 text-rose-500/20 hover:text-rose-500 transition active:scale-90"><Trash2 className="h-4 w-4" /></button>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  </>); })()}
                </>
              )}
            </div>
          );
        })()}

        {activeSection === 'credit' && currentUser.role === 'admin' && (() => {
          const openCredits = credits.filter((c: any) => !c.isPaid);
          const paidCredits = credits.filter((c: any) => c.isPaid);
          const creditTotal = openCredits.reduce((s: number, c: any) => s + (c.amount || 0), 0);
          const paidTotal = paidCredits.reduce((s: number, c: any) => s + (c.amount || 0), 0);
          const q = creditSearch.trim().toLowerCase();
          const base = creditView === 'open' ? openCredits : creditView === 'paid' ? paidCredits : credits;
          const filtered = base.filter((c: any) => {
            if (!q) return true;
            return `${c.beneficiary || ''} ${c.note || ''} ${c.amount}`.toLowerCase().includes(q);
          });
          return (
            <div className="flex flex-col gap-6 pb-20">
              <div className="flex items-center justify-between px-1">
                <div><p className="text-[9px] font-black text-rose-300 uppercase tracking-[0.22em]">À payer plus tard</p><h2 className="text-2xl font-black tracking-[-0.06em] text-white leading-none mt-0.5 flex items-center gap-2"><Receipt className="h-6 w-6 text-rose-300" /> Crédit</h2></div>
              </div>

              {/* HERO — le TOTAL CREDIT actif, impossible à manquer. Même structure que le hero
                  Banque / Archive (pastille + libellé + montant géant + ligne de stats). */}
              <div className="bg-gradient-to-br from-[#2a0c14] to-black border-2 border-rose-500/60 p-8 rounded-[48px] shadow-2xl relative overflow-hidden ring-1 ring-white/5">
                <div className="absolute -top-10 -right-10 opacity-[0.06] pointer-events-none text-rose-300"><Receipt className="h-48 w-48" /></div>
                <div className="flex items-center gap-2 mb-1"><span className="h-3 w-3 rounded-full bg-rose-400" /><p className="text-[10px] font-black text-rose-300 uppercase tracking-[0.3em]">Total crédit</p></div>
                <h3 className="text-5xl sm:text-6xl font-black tracking-tighter text-white break-words leading-none mt-3">{formatRawCurrency(creditTotal, 'TND')}</h3>
                <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mt-3">{openCredits.length} crédit{openCredits.length > 1 ? 's' : ''} en attente · sans échéance</p>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-7 pt-6 border-t border-white/5">
                  <div className="flex flex-col"><p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Déjà payé</p><p className="text-emerald-400 font-black text-base tracking-tighter">{formatRawCurrency(paidTotal, 'TND')}</p></div>
                  <div className="flex flex-col"><p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Entrées payées</p><p className="text-neutral-300 font-black text-base tracking-tighter">{paidCredits.length}</p></div>
                  <div className="flex flex-col border-l border-white/10 pl-6"><p className="text-[9px] font-black text-rose-300 uppercase tracking-widest">Indépendant</p><p className="text-[10px] text-neutral-400 font-bold leading-tight max-w-[190px]">N&apos;affecte aucun autre solde ni total.</p></div>
                </div>
              </div>

              {/* QUICK ACTIONS — même traitement que « Encaisser TND » / « Entrée » ailleurs :
                  carte p-6, coin [32px], icône dans un carré qui grossit au survol. Le Crédit n'a
                  qu'un seul sens (on enregistre une dette), donc une seule carte pleine largeur. */}
              <div className="grid grid-cols-1 gap-4">
                <button onClick={() => { setCreditForm({ amount: '', beneficiary: '', note: '' }); setCreditError(''); setActiveModal('add_credit'); }} className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-[32px] flex flex-col items-center gap-3 active:scale-95 transition group hover:bg-rose-500/20"><div className="p-3 bg-rose-500/20 rounded-2xl group-hover:scale-110 transition"><Plus className="h-6 w-6 text-rose-400" /></div><p className="text-[10px] font-black uppercase text-rose-400">Nouveau crédit</p></button>
              </div>

              {/* FILTRES */}
              <div className="flex flex-col gap-3 p-5 bg-neutral-900/40 border border-neutral-800 rounded-[32px]">
                <div className="relative"><Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 pointer-events-none" /><input value={creditSearch} onChange={e => setCreditSearch(e.target.value)} placeholder="Rechercher bénéficiaire, description…" className="w-full pl-12 pr-4 py-3.5 bg-neutral-950 border border-neutral-800 rounded-2xl text-sm text-white outline-none focus:border-rose-500/40" /></div>
                <div className="flex flex-wrap gap-2">
                  {[{ id: 'open', label: `À payer (${openCredits.length})` }, { id: 'paid', label: `Payés (${paidCredits.length})` }, { id: 'all', label: 'Tout' }].map(v => (
                    <button key={v.id} onClick={() => setCreditView(v.id as any)} className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition ${creditView === v.id ? 'bg-white text-black' : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'}`}>{v.label}</button>
                  ))}
                </div>
              </div>

              {/* LISTE */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-neutral-900 pb-3 px-1"><h4 className="text-[11px] font-black text-neutral-300 uppercase tracking-[0.25em] flex items-center gap-2"><Clock className="h-4 w-4" /> Registre crédit</h4><span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider">{filtered.length} / {credits.length}</span></div>
                {filtered.length === 0 && <EmptyState icon={<Receipt className="h-10 w-10" />} title={credits.length === 0 ? 'Aucun crédit' : 'Aucun résultat'} subtitle={credits.length === 0 ? 'Ajoute une somme à payer plus tard.' : 'Modifie la recherche ou le filtre.'} />}
                <div className="flex flex-col gap-3">
                  {filtered.map((c: any) => (
                    <div key={c.id} className={`group relative p-5 pl-6 border rounded-[32px] flex justify-between items-center gap-4 transition ${c.isPaid ? 'bg-neutral-900/30 border-neutral-800/70 opacity-70' : 'bg-rose-500/5 border-rose-500/30 hover:border-rose-500/50'}`}>
                      <span className={`absolute left-0 top-6 bottom-6 w-1 rounded-full ${c.isPaid ? 'bg-emerald-500/60' : 'bg-rose-400'}`} />
                      <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {c.isPaid && <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1"><CheckCircle className="h-2.5 w-2.5" /> Payé</span>}
                          <p className={`text-sm font-black uppercase tracking-tight break-words ${c.isPaid ? 'text-neutral-400 line-through' : 'text-white'}`}>{c.beneficiary}</p>
                        </div>
                        <p className={`text-sm font-bold leading-snug break-words ${c.isPaid ? 'text-neutral-500' : 'text-neutral-300'}`}>{c.note}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <p className="text-[9px] text-neutral-600 font-black uppercase">{new Date(c.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                          {c.createdBy && <p className="text-[9px] text-rose-400/80 font-black uppercase flex items-center gap-1"><Users className="h-3 w-3" /> {displayUser(c.createdBy)}</p>}
                          {c.isPaid && c.paidAt && <p className="text-[9px] text-emerald-400 font-black uppercase flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Payé le {new Date(c.paidAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}{c.paidBy ? ` · ${displayUser(c.paidBy)}` : ''}</p>}
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-2">
                        <p className={`text-lg font-black tracking-tighter ${c.isPaid ? 'text-neutral-500 line-through' : 'text-rose-300'}`}>{formatRawCurrency(c.amount, c.currencyCode || 'TND')}</p>
                        {!c.isPaid ? (
                          <button onClick={() => handleToggleCreditPaid(c)} disabled={isPending} className="px-3 py-2 bg-emerald-500 text-black rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-400 transition active:scale-95 disabled:opacity-40">Payé</button>
                        ) : (
                          <button onClick={() => handleToggleCreditPaid(c)} disabled={isPending} title="Annuler le marquage payé" className="p-2 text-neutral-500 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition active:scale-90 disabled:opacity-40"><Undo2 className="h-4 w-4" /></button>
                        )}
                        {!c.isPaid && <button onClick={() => { setCreditForm({ id: c.id, amount: String(c.amount), beneficiary: c.beneficiary, note: c.note }); setCreditError(''); setActiveModal('add_credit'); }} className="p-2 text-blue-400/60 hover:text-blue-300 hover:bg-blue-500/10 rounded-xl transition active:scale-90"><Edit className="h-4 w-4" /></button>}
                        {currentUser.role === 'admin' && <button onClick={() => handleDeleteCredit(c.id, c.beneficiary)} className="p-2 text-rose-500/20 hover:text-rose-500 transition active:scale-90"><Trash2 className="h-4 w-4" /></button>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {activeSection === 'archive' && currentUser.role === 'admin' && (() => {
          const balanceById: Record<string, number> = {};
          {
            const ordered = [...optimisticArchiveMovements].reverse();
            let acc = 0;
            for (const m of ordered) { if (m.isSettled !== false) { acc += (m.type === 'IN' ? m.amount : -m.amount); } balanceById[m.id] = acc; }
          }
          const now = Date.now();
          const periodMs = archivePeriod === 'today' ? 86400000 : archivePeriod === '7d' ? 7*86400000 : archivePeriod === '30d' ? 30*86400000 : 0;
          const min = parseFloat(archiveAmountMin || '');
          const max = parseFloat(archiveAmountMax || '');
          const q = archiveSearch.trim().toLowerCase();
          const filtered = optimisticArchiveMovements.filter((m: any) => {
            if (archiveTypeFilter !== 'all' && m.type !== archiveTypeFilter) return false;
            if (archiveUserFilter !== 'all' && m.performedBy !== archiveUserFilter) return false;
            if (periodMs > 0 && (now - new Date(m.createdAt).getTime()) > periodMs) return false;
            if (!isNaN(min) && m.amount < min) return false;
            if (!isNaN(max) && m.amount > max) return false;
            if (q) { const hay = `${m.note || ''} ${m.performedBy || ''} ${displayUser(m.performedBy)} ${m.amount}`.toLowerCase(); if (!hay.includes(q)) return false; }
            return true;
          });
          const uniqueUsers: string[] = Array.from(new Set(optimisticArchiveMovements.map((m: any) => m.performedBy).filter(Boolean))) as string[];
          const filteredIn = filtered.filter((m:any) => m.type === 'IN').reduce((s:number,m:any) => s+m.amount, 0);
          const filteredOut = filtered.filter((m:any) => m.type === 'OUT').reduce((s:number,m:any) => s+m.amount, 0);
          return (
            <div className="flex flex-col gap-6 pb-20">
              {(archiveDueSoon.length > 0 || archiveOverdue.length > 0) && (
                <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-orange-500/10 border-2 border-amber-500/40 rounded-[36px] p-6 shadow-2xl shadow-amber-500/10">
                  <div className="flex items-start gap-4 mb-4"><div className="p-3 bg-amber-500/20 rounded-2xl ring-1 ring-amber-500/40 animate-pulse"><Bell className="h-5 w-5 text-amber-300" /></div><div className="flex-1 min-w-0"><p className="text-[10px] font-black text-amber-300 uppercase tracking-[0.25em]">Rappel Archive</p><h3 className="text-xl font-black text-white leading-tight mt-1">{archiveOverdue.length > 0 ? `${archiveOverdue.length} mouvement${archiveOverdue.length>1?'s':''} en retard` : `${archiveDueSoon.length} mouvement${archiveDueSoon.length>1?'s':''} prévu${archiveDueSoon.length>1?'s':''} sous 24h`}</h3></div></div>
                  <div className="flex flex-col gap-2">{[...archiveOverdue, ...archiveDueSoon.filter(m => !archiveOverdue.some(o => o.id === m.id))].slice(0, 4).map((m: any) => { const isOverdue = m.scheduledFor && new Date(m.scheduledFor).getTime() < Date.now(); return (
                    <div key={m.id} className="flex items-center justify-between gap-3 p-3.5 bg-black/40 border border-amber-500/20 rounded-2xl"><div className="flex items-center gap-3 min-w-0 flex-1"><div className={`shrink-0 h-9 w-9 rounded-xl flex items-center justify-center ${m.type === 'IN' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>{m.type === 'IN' ? <Plus className="h-4 w-4 stroke-[3]" /> : <ArrowUpRight className="h-4 w-4 stroke-[3] rotate-90" />}</div><div className="flex flex-col min-w-0 flex-1"><p className="text-sm font-black text-white truncate">{m.note}</p><p className={`text-[10px] font-black uppercase tracking-widest ${isOverdue ? 'text-rose-300' : 'text-amber-300'}`}>{isOverdue ? '⚠ En retard depuis' : '📅 Prévu'} {m.scheduledFor ? new Date(m.scheduledFor).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : ''}</p></div></div><div className="flex items-center gap-2 shrink-0"><p className={`text-base font-black tracking-tighter ${m.type === 'IN' ? 'text-emerald-400' : 'text-rose-400'}`}>{m.type === 'IN' ? '+' : '-'}{formatRawCurrency(m.amount, 'TND')}</p><button onClick={() => handleSettleArchiveMovement(m.id)} className="px-3 py-2 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 transition active:scale-95">Confirmer</button></div></div>
                  ); })}</div>
                </div>
              )}

              <div className="bg-gradient-to-br from-[#1a1206] to-black border border-amber-500/20 p-8 rounded-[48px] shadow-2xl relative overflow-hidden ring-1 ring-white/5">
                <div className="absolute -top-10 -right-10 opacity-[0.05] pointer-events-none text-amber-400"><History className="h-48 w-48" /></div>
                <p className="text-[11px] font-black text-amber-300 uppercase tracking-[0.3em] mb-2">Caisse Archive TND</p>
                <h2 className="text-6xl font-black tracking-tighter text-white break-words leading-none">{formatRawCurrency(metrics.archiveBalance || 0, 'TND')}</h2>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-7 pt-6 border-t border-white/5">
                  <div className="flex flex-col"><p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Entrées Aujourd'hui</p><p className="text-emerald-400 font-black text-base tracking-tighter">+{formatRawCurrency(metrics.archiveTodayIn || 0, 'TND')}</p></div>
                  <div className="flex flex-col"><p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Sorties Aujourd'hui</p><p className="text-rose-400 font-black text-base tracking-tighter">-{formatRawCurrency(metrics.archiveTodayOut || 0, 'TND')}</p></div>
                  {(archiveUpcoming.length > 0) && (
                    <div className="flex flex-col border-l border-white/10 pl-6"><p className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Solde Projeté</p><p className="text-amber-300 font-black text-base tracking-tighter">{formatRawCurrency((metrics.archiveBalance || 0) + (metrics.archivePendingIn || 0) - (metrics.archivePendingOut || 0), 'TND')}</p><p className="text-[9px] text-neutral-500 font-black uppercase tracking-widest mt-0.5">{archiveUpcoming.length} planifié{archiveUpcoming.length>1?'s':''}</p></div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => { setArchiveForm({ amount: '', type: 'IN', note: '', scheduledFor: '' }); setActiveModal('add_archive'); }} className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-[32px] flex flex-col items-center gap-3 active:scale-95 transition group hover:bg-emerald-500/20"><div className="p-3 bg-emerald-500/20 rounded-2xl group-hover:scale-110 transition"><Plus className="h-6 w-6 text-emerald-400" /></div><p className="text-[10px] font-black uppercase text-emerald-400">Encaisser TND</p></button>
                <button onClick={() => { setArchiveForm({ amount: '', type: 'OUT', note: '', scheduledFor: '' }); setArchiveBatchItems([{ amount: '', note: '' }]); setActiveModal('add_archive'); }} className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-[32px] flex flex-col items-center gap-3 active:scale-95 transition group hover:bg-rose-500/20"><div className="p-3 bg-rose-500/20 rounded-2xl group-hover:scale-110 transition rotate-45"><Plus className="h-6 w-6 text-rose-400" /></div><p className="text-[10px] font-black uppercase text-rose-400">Décaissement</p></button>
              </div>

              <div className="flex flex-col gap-3 p-5 bg-neutral-900/40 border border-neutral-800 rounded-[32px]">
                <div className="relative"><Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 pointer-events-none" /><input value={archiveSearch} onChange={e => setArchiveSearch(e.target.value)} placeholder="Rechercher note, montant, utilisateur…" className="w-full pl-12 pr-4 py-3.5 bg-neutral-950 border border-neutral-800 rounded-2xl text-sm text-white outline-none focus:border-amber-500/40" /></div>
                <div className="flex flex-wrap gap-2">
                  {[{ id: 'today', label: "Aujourd'hui" },{ id: '7d', label: '7 jours' },{ id: '30d', label: '30 jours' },{ id: 'all', label: 'Tout' }].map(p => (<button key={p.id} onClick={() => setArchivePeriod(p.id as any)} className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition ${archivePeriod === p.id ? 'bg-white text-black' : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'}`}>{p.label}</button>))}
                  <span className="mx-1 border-l border-neutral-800" />
                  {[{ id: 'all', label: 'Tous types' },{ id: 'IN', label: '+ Entrées' },{ id: 'OUT', label: '- Sorties' }].map(t => (<button key={t.id} onClick={() => setArchiveTypeFilter(t.id as any)} className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition ${archiveTypeFilter === t.id ? 'bg-white text-black' : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'}`}>{t.label}</button>))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select value={archiveUserFilter} onChange={e => setArchiveUserFilter(e.target.value)} className="bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-3 text-xs font-black text-white outline-none focus:border-amber-500/40"><option value="all">Tous utilisateurs</option>{uniqueUsers.map(u => <option key={u} value={u}>{displayUser(u)}</option>)}</select>
                  <input type="number" placeholder="Montant min" value={archiveAmountMin} onChange={e => setArchiveAmountMin(e.target.value)} className="bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-3 text-xs font-black text-white outline-none focus:border-amber-500/40" />
                  <input type="number" placeholder="Montant max" value={archiveAmountMax} onChange={e => setArchiveAmountMax(e.target.value)} className="bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-3 text-xs font-black text-white outline-none focus:border-amber-500/40" />
                </div>
                {(archiveSearch || archivePeriod !== 'all' || archiveUserFilter !== 'all' || archiveAmountMin || archiveAmountMax || archiveTypeFilter !== 'all') && (
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-800"><div className="flex items-center gap-5 text-[10px] font-black uppercase tracking-widest"><span className="text-neutral-400">{filtered.length} rés.</span><span className="text-emerald-400">+{formatRawCurrency(filteredIn, 'TND')}</span><span className="text-rose-400">-{formatRawCurrency(filteredOut, 'TND')}</span></div><button onClick={() => { setArchiveSearch(''); setArchivePeriod('all'); setArchiveUserFilter('all'); setArchiveAmountMin(''); setArchiveAmountMax(''); setArchiveTypeFilter('all'); }} className="text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-white transition">Réinitialiser</button></div>
                )}
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-neutral-900 pb-3 px-1"><h4 className="text-[11px] font-black text-neutral-300 uppercase tracking-[0.25em] flex items-center gap-2"><Clock className="h-4 w-4" /> Journal Archive</h4><span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider">{filtered.length} / {optimisticArchiveMovements.length}</span></div>
                {filtered.length === 0 && <EmptyState icon={<History className="h-10 w-10" />} title={optimisticArchiveMovements.length === 0 ? 'Archive vide' : 'Aucun résultat'} subtitle={optimisticArchiveMovements.length === 0 ? 'Enregistrez votre premier mouvement.' : 'Essayez de modifier les filtres.'} />}
                <div className="flex flex-col gap-3">
                  {filtered.map((m: any) => {
                    const running = balanceById[m.id] ?? 0;
                    const isPending = m.isSettled === false;
                    const isTransfer = isTransferNote(m.note);
                    const cleanNote = isTransfer ? m.note.replace(TREASURY_ARCHIVE_TAG, '').replace(/^\s*·\s*/, '').trim() : m.note;
                    return (
                      <div key={m.id} className={`group relative p-5 pl-6 border rounded-[32px] flex justify-between items-center gap-4 transition ${isTransfer ? 'bg-violet-500/10 border-violet-500/40 hover:border-violet-500/60 ring-1 ring-violet-500/20' : isPending ? 'bg-amber-500/5 border-amber-500/30 hover:border-amber-500/50' : 'bg-neutral-900/40 border-neutral-800 hover:border-neutral-700'}`}>
                        <span className={`absolute left-0 top-6 bottom-6 w-1 rounded-full ${isTransfer ? 'bg-violet-400 shadow-lg' : isPending ? 'bg-amber-400' : m.type === 'IN' ? 'bg-emerald-500 shadow-lg' : 'bg-rose-500'}`} />
                        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">{isTransfer && <span className="px-2 py-0.5 bg-violet-500/20 border border-violet-500/40 text-violet-200 rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1"><ArrowLeftRight className="h-2.5 w-2.5" /> Transfert Coffre</span>}{isPending && <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1"><CalendarClock className="h-2.5 w-2.5" /> Prévu</span>}<p className={`text-sm font-bold leading-tight break-words ${isTransfer ? 'text-violet-100' : isPending ? 'text-amber-100' : 'text-neutral-200'}`}>{cleanNote}</p></div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">{isPending && m.scheduledFor ? (<p className="text-[9px] text-amber-400 font-black uppercase flex items-center gap-1"><CalendarClock className="h-3 w-3" /> {new Date(m.scheduledFor).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' })}</p>) : (<p className="text-[9px] text-neutral-600 font-black uppercase">{new Date(m.createdAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</p>)}{m.performedBy && <p className="text-[9px] text-blue-400 font-black uppercase flex items-center gap-1"><Users className="h-3 w-3" /> {displayUser(m.performedBy)}</p>}{!isPending && <p className="text-[9px] text-neutral-500 font-black uppercase flex items-center gap-1.5"><History className="h-3 w-3" /> Solde: {formatRawCurrency(running, 'TND')}</p>}</div>
                        </div>
                        <div className="text-right shrink-0 flex items-center gap-3">
                          <p className={`text-lg font-black tracking-tighter ${isPending ? 'text-amber-300' : m.type === 'IN' ? 'text-emerald-400' : 'text-rose-400'}`}>{m.type === 'IN' ? '+' : '-'}{formatRawCurrency(m.amount, 'TND')}</p>
                          {isPending && <button onClick={() => handleSettleArchiveMovement(m.id)} className="px-3 py-2 bg-emerald-500 text-black rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-400 transition active:scale-95" title="Confirmer">✓</button>}
                          <button onClick={() => { setArchiveNoteEdit({ id: m.id, note: m.note, amount: m.amount, type: m.type }); setArchiveNoteEditError(''); }} className="p-2 text-blue-400/60 hover:text-blue-300 hover:bg-blue-500/10 rounded-xl transition active:scale-90" title="Modifier uniquement la note"><Edit className="h-4 w-4" /></button>
                          <button onClick={() => handleDeleteArchiveMovement(m.id)} className="p-2 text-rose-500/20 hover:text-rose-500 transition active:scale-90"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {activeSection === 'transactions' && (
          <div className="flex flex-col gap-3">
            {filteredMovements.length === 0 && <EmptyState icon={<ArrowLeftRight className="h-10 w-10" />} title="Aucune opération" subtitle="Utilisez « Nouvelle Opération »." />}
            {filteredMovements.map((t: any) => {
              const st = getTransactionTypeStyle(t.type);
              return (
              <div key={t.id} className="bg-neutral-900 border border-neutral-800 p-5 rounded-3xl flex justify-between items-center shadow-lg hover:border-neutral-700 transition group">
                <div className="flex items-center gap-4"><span className="text-2xl p-2.5 bg-neutral-950 border border-neutral-800 rounded-2xl">{t.contact?.emoji}</span><div><p className="text-base font-black text-white uppercase tracking-tight">{t.contact?.name}</p><p className={`text-[10px] font-black uppercase tracking-widest mt-1 text-${st.style}-400`}>{t.category} · {st.label}</p></div></div>
                <div className="text-right flex items-center gap-4"><div className="flex flex-col gap-0.5"><p className="text-lg font-black text-white tracking-tighter">{formatUSD(t.amountInUsd)}</p><p className="text-[10px] text-neutral-600 font-black uppercase">{t.createdAt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</p></div><button onClick={() => handleDeleteTxLoc(t.id)} className="p-2.5 text-rose-500/40 hover:text-rose-500 active:scale-90 transition rounded-xl"><Trash2 className="h-5 w-5" /></button></div>
              </div>
              );
            })}
          </div>
        )}

        {activeSection === 'reminders' && (
          <div className="flex flex-col gap-8 pb-20">
            <div className="flex justify-between items-center px-1"><div className="flex flex-col gap-1.5"><h2 className="text-2xl font-black text-white uppercase tracking-tighter">Mouvements Planifiés</h2><p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">À confirmer à l'échéance</p></div><button onClick={() => { setTransactionForm({ contactId: '', amount: '', currencyCode: 'USD', type: 'HELD', category: 'Virement', note: '', isPostponed: true, dueDate: '', reminderEmail: '', plannedType: 'HELD' }); setActiveModal('add_tx'); }} className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-500 transition active:scale-90"><Calendar className="h-6 w-6" /></button></div>
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-4"><h3 className="text-xs font-black text-rose-500 uppercase tracking-[0.2em] px-1 flex items-center gap-2 animate-pulse"><AlertTriangle className="h-4 w-4" /> En Retard</h3>
                {reminders.filter((r:any) => !r.isCompleted && new Date(r.dueDate) < new Date(new Date().toDateString())).map((r:any) => (
                  <div key={r.id} className="relative p-5 rounded-[32px] border border-rose-900/50 bg-rose-950/10 flex items-center justify-between gap-4 overflow-hidden"><div className="absolute top-0 bottom-0 left-0 w-1.5 bg-rose-600" /><div className="flex-1 min-w-0"><p className="text-xs font-black text-rose-400 uppercase tracking-widest mb-1 truncate">{r.contact?.name}</p><p className="text-xl font-black text-white tracking-tighter break-words">{formatRawCurrency(r.amount, r.currencyCode)}</p><p className="text-[9px] text-rose-500 uppercase mt-2 font-black tracking-widest uppercase">DÉPASSÉ LE {new Date(r.dueDate).toLocaleDateString()}</p><div className="flex gap-2 mt-3"><button onClick={() => handleConfirmReceived(r)} className="px-3 py-2 rounded-xl bg-emerald-500 text-black text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 active:scale-95 transition"><CheckCircle className="h-3.5 w-3.5" /> Confirmer</button><button onClick={() => handlePostpone(r)} className="px-3 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-amber-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 active:scale-95 transition"><CalendarClock className="h-3.5 w-3.5" /> Reporter</button><button onClick={() => handleDeleteReminderLoc(r.id)} className="px-2.5 py-2 rounded-xl text-rose-500/40 hover:text-rose-500 active:scale-95 transition"><Trash2 className="h-3.5 w-3.5" /></button></div></div></div>
                ))}
              </div>
              <div className="flex flex-col gap-4"><h3 className="text-xs font-black text-neutral-500 uppercase tracking-[0.2em] px-1">Prochaines Échéances</h3>
                {reminders.filter((r:any) => !r.isCompleted && new Date(r.dueDate) >= new Date(new Date().toDateString())).map((r:any) => (
                  <div key={r.id} className="p-5 rounded-[32px] border border-neutral-800 bg-neutral-900/40 flex justify-between items-center gap-3"><div className="flex-1 min-w-0"><p className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-1 truncate">{r.contact?.name}</p><p className="text-xl font-black text-white tracking-tighter break-words">{formatRawCurrency(r.amount, r.currencyCode)}</p><p className="text-[9px] text-amber-500 uppercase mt-2 font-black tracking-widest">ÉCHÉANCE : {new Date(r.dueDate).toLocaleDateString()}</p><div className="flex gap-2 mt-3"><button onClick={() => handleConfirmReceived(r)} className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-emerald-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 active:scale-95 transition hover:bg-emerald-500 hover:text-black"><CheckCircle className="h-3.5 w-3.5" /> Confirmer</button><button onClick={() => handlePostpone(r)} className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-amber-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 active:scale-95 transition"><CalendarClock className="h-3.5 w-3.5" /> Reporter</button><button onClick={() => handleDeleteReminderLoc(r.id)} className="px-2.5 py-2 rounded-xl text-rose-500/40 hover:text-rose-500 active:scale-95 transition"><Trash2 className="h-3.5 w-3.5" /></button></div></div></div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'history' && (() => {
          // Chaque ligne est classée UNE fois, puis les compteurs et la liste
          // se lisent sur la même base — les nombres affichés sur les onglets
          // sont donc toujours ceux de la liste.
          // LA BANQUE N'EST PAS UNE CAISSE, C'EN EST PLUSIEURS.
          // L'argent est déjà séparé par compte dans la section BANQUE ; l'audit
          // doit l'être de la même façon, avec la MÊME couleur par compte, sinon
          // on ne peut pas contrôler VLT MOTORS sans VOLTROP par-dessus.
          // L'écriture d'audit ne porte que l'id du mouvement : on remonte au
          // compte par le mouvement, ou par la copie gardée en cas de suppression.
          const bankAccountIdOf = (a: any): string | null => {
            if (a.entityType !== 'BANK' && !/^BANK_/.test(a.action || '')) return null;
            try { const o = JSON.parse(a.oldValue || 'null'); if (o && o.accountId) return String(o.accountId); } catch { /* pas du JSON */ }
            const m = (bankMovements || []).find((x: any) => x.id === a.entityId);
            if (m) return String(m.accountId);
            // Une action portée par le compte lui-même (création, renommage).
            if ((bankAccounts || []).some((x: any) => x.id === a.entityId)) return String(a.entityId);
            return null;
          };
          // Chaque compte bancaire devient un onglet à part entière, teinté comme
          // sa carte dans BANQUE. Les caisses uniques gardent leur couleur.
          const accountTabs: { key: string; label: string; chip: string; rail: string }[] = [
            { key: 'coffre', label: 'Coffre', ...AUDIT_TONES.blue },
            ...((bankAccounts || []) as any[]).map((acc: any) => {
              const p = bankPalette(acc.id);
              return { key: `bank:${acc.id}`, label: acc.name, chip: `${p.bgSoft} ${p.borderSoft} ${p.text}`, rail: p.solid };
            }),
            { key: 'banque', label: 'Banque (compte retiré)', ...AUDIT_TONES.teal },
            { key: 'credit', label: 'Crédit', ...AUDIT_TONES.rose },
            { key: 'archive', label: 'Archive', ...AUDIT_TONES.amber },
            { key: 'partenaires', label: 'Partenaires', ...AUDIT_TONES.emerald },
            { key: 'systeme', label: 'Système', ...AUDIT_TONES.neutral },
          ];
          const tabByKey = new Map(accountTabs.map(t => [t.key, t]));
          const resolveAccount = (a: any) => {
            const base = auditAccountOf(a);
            if (base.key !== 'banque') return tabByKey.get(base.key)!;
            const id = bankAccountIdOf(a);
            return (id && tabByKey.get(`bank:${id}`)) || tabByKey.get('banque')!;
          };

          type Tagged = { a: any; acct: { key: string; label: string; chip: string; rail: string }; subj: typeof AUDIT_SUBJECTS[number] };
          const tagged: Tagged[] = ((auditTrails || []) as any[]).map((a: any) => ({ a, acct: resolveAccount(a), subj: auditSubjectOf(a) }));
          const periodMs = auditPeriod === 'today' ? 86400000 : auditPeriod === '7d' ? 7 * 86400000 : auditPeriod === '30d' ? 30 * 86400000 : 0;
          const now = Date.now();
          const q = auditSearch.trim().toLowerCase();
          // Les compteurs d'un axe ignorent CE MÊME axe : sinon choisir un
          // compte remettrait tous les autres à zéro et on ne verrait plus où aller.
          const passBase = (t: any) => {
            if (periodMs > 0 && (now - new Date(t.a.createdAt).getTime()) > periodMs) return false;
            if (auditUserFilter !== 'all' && t.a.modifiedBy !== auditUserFilter) return false;
            if (q) {
              const hay = `${t.a.details || ''} ${t.a.action || ''} ${t.acct.label} ${t.subj.label} ${displayUser(t.a.modifiedBy)} ${auditAmountOf(t.a) ?? ''}`.toLowerCase();
              if (!hay.includes(q)) return false;
            }
            return true;
          };
          const byAccount = tagged.filter(t => passBase(t) && (auditSubject === 'all' || t.subj.key === auditSubject));
          const bySubject = tagged.filter(t => passBase(t) && (auditAccount === 'all' || t.acct.key === auditAccount));
          const rows = tagged.filter(t => passBase(t)
            && (auditAccount === 'all' || t.acct.key === auditAccount)
            && (auditSubject === 'all' || t.subj.key === auditSubject));
          const countAcct = (k: string) => k === 'all' ? byAccount.length : byAccount.filter(t => t.acct.key === k).length;
          const countSubj = (k: string) => k === 'all' ? bySubject.length : bySubject.filter(t => t.subj.key === k).length;
          const users: string[] = Array.from(new Set((auditTrails || []).map((a: any) => a.modifiedBy).filter(Boolean)));
          const sumFlow = (f: string) => rows.filter(t => auditFlowOf(t.a) === f).reduce((s, t) => s + (auditAmountOf(t.a) || 0), 0);
          const totalIn = sumFlow('in'), totalOut = sumFlow('out');
          const deletions = rows.filter(t => t.subj.key === 'suppression').length;
          const isFiltered = auditAccount !== 'all' || auditSubject !== 'all' || auditUserFilter !== 'all' || auditPeriod !== 'all' || !!q;

          return (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-4 px-1">
              <div className="min-w-0">
                <h3 className="text-xs font-black text-neutral-500 uppercase tracking-[0.2em]">Journal d&apos;audit</h3>
                <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mt-1">{auditLoading ? 'Chargement…' : `${auditTrails.length} action${auditTrails.length > 1 ? 's' : ''} tracée${auditTrails.length > 1 ? 's' : ''}`}</p>
              </div>
              <button onClick={() => loadDeepAudit()} className="text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:text-emerald-400 transition shrink-0">Actualiser</button>
            </div>

            {/* RECHERCHE — un montant, un nom, un numéro de BL */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-600 pointer-events-none" />
              <input value={auditSearch} onChange={e => setAuditSearch(e.target.value)} placeholder="Chercher un montant, un nom, une note…"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white outline-none focus:border-emerald-500/40 shadow-inner" />
            </div>

            {/* AXE 1 — LE COMPTE. Chaque caisse a déjà sa couleur ailleurs dans
                l'app : on garde la même ici pour qu'un coup d'œil suffise. */}
            <div className="flex flex-col gap-2">
              <p className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em] px-1">Compte</p>
              {/* Les pastilles S'ENROULENT au lieu de défiler : un défilement
                  horizontal sans barre visible cachait la moitié des choix, et
                  on ne peut pas chercher ce qu'on ne voit pas. */}
              <div className="flex flex-wrap gap-2">
                {/* Un choix qui ne donne rien n'est pas un choix : on le retire
                    au lieu de le griser. « Tout » et la sélection en cours
                    restent toujours là, sinon la barre sauterait sous le doigt. */}
                {[{ key: 'all', label: 'Tout', ...AUDIT_TONES.neutral }, ...accountTabs]
                  .filter(t => t.key === 'all' || auditAccount === t.key || countAcct(t.key) > 0)
                  .map(t => {
                    const n = countAcct(t.key); const on = auditAccount === t.key;
                    return (
                      <button key={t.key} onClick={() => setAuditAccount(t.key)}
                        className={`shrink-0 min-h-[44px] max-w-full flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition active:scale-95 ${on ? t.chip + ' ring-1 ring-white/20' : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${t.rail}`} />
                        <span className="truncate">{t.label}</span>
                        <span className="tabular-nums opacity-70 shrink-0">{n}</span>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* AXE 2 — LE SUJET */}
            <div className="flex flex-col gap-2">
              <p className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em] px-1">Sujet</p>
              {/* Les pastilles S'ENROULENT au lieu de défiler : un défilement
                  horizontal sans barre visible cachait la moitié des choix, et
                  on ne peut pas chercher ce qu'on ne voit pas. */}
              <div className="flex flex-wrap gap-2">
                {[{ key: 'all', label: 'Tous' }, ...AUDIT_SUBJECTS]
                  .filter(s => s.key === 'all' || auditSubject === s.key || countSubj(s.key) > 0)
                  .map(s => {
                    const n = countSubj(s.key); const on = auditSubject === s.key;
                    const danger = s.key === 'suppression';
                    return (
                      <button key={s.key} onClick={() => setAuditSubject(s.key)}
                        className={`shrink-0 min-h-[44px] px-3.5 py-2.5 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition active:scale-95 ${on ? (danger ? 'bg-rose-500/20 border-rose-500/50 text-rose-200' : 'bg-white text-black border-white') : `bg-neutral-950 border-neutral-800 hover:border-neutral-700 ${danger ? 'text-rose-300/80' : 'text-neutral-400'}`}`}>
                        {s.label} <span className="tabular-nums opacity-70">{n}</span>
                      </button>
                    );
                  })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select value={auditUserFilter} onChange={e => setAuditUserFilter(e.target.value)} className="bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-3 text-xs font-black text-white outline-none focus:border-emerald-500/40">
                <option value="all">Tous les auteurs</option>
                {users.map(u => <option key={u} value={u}>{displayUser(u)}</option>)}
              </select>
              <select value={auditPeriod} onChange={e => setAuditPeriod(e.target.value)} className="bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-3 text-xs font-black text-white outline-none focus:border-emerald-500/40">
                <option value="all">Toute la période</option>
                <option value="today">Aujourd&apos;hui</option>
                <option value="7d">7 derniers jours</option>
                <option value="30d">30 derniers jours</option>
              </select>
            </div>

            {/* CE QUE LA SÉLECTION REPRÉSENTE — la question d'un contrôle de
                caisse est toujours « combien est entré, combien est sorti ». */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3.5 rounded-2xl border border-neutral-800 bg-neutral-900/50">
              <p className="text-[10px] font-black text-white uppercase tracking-widest">{rows.length} ligne{rows.length > 1 ? 's' : ''}</p>
              {totalIn > 0 && <p className="text-[10px] font-black text-emerald-400 tabular-nums">+ {formatRawCurrency(totalIn, 'TND')}</p>}
              {totalOut > 0 && <p className="text-[10px] font-black text-rose-400 tabular-nums">− {formatRawCurrency(totalOut, 'TND')}</p>}
              {deletions > 0 && <p className="text-[10px] font-black text-rose-300 uppercase tracking-widest">{deletions} suppression{deletions > 1 ? 's' : ''}</p>}
              {isFiltered && (
                <button onClick={() => { setAuditAccount('all'); setAuditSubject('all'); setAuditUserFilter('all'); setAuditPeriod('all'); setAuditSearch(''); }}
                  className="ml-auto text-[9px] font-black text-neutral-400 uppercase tracking-widest hover:text-white transition">Tout effacer</button>
              )}
            </div>

            {/* PAS de hauteur maximale ici. Une liste en colonne flex avec une
                hauteur bornée fait RÉTRÉCIR chaque carte pour tenir dedans :
                avec `overflow-hidden` sur la carte, la description et le
                montant étaient purement et simplement coupés (34 px de haut au
                lieu de 125). La page défile, les cartes gardent leur taille. */}
            <div className="flex flex-col gap-3">
              {rows.length === 0 && (
                <EmptyState icon={<History className="h-10 w-10" />}
                  title={auditTrails.length === 0 ? 'Journal vide' : 'Aucune action ne correspond'}
                  subtitle={auditTrails.length === 0 ? 'Les actions seront tracées ici.' : 'Changez le compte, le sujet ou la période.'} />
              )}
              {rows.slice(0, auditVisible).map(({ a, acct, subj }: any) => {
                const flow = auditFlowOf(a);
                const amt = auditAmountOf(a);
                const rail = flow === 'del' ? 'bg-rose-500' : flow === 'in' ? 'bg-emerald-500' : flow === 'out' ? 'bg-rose-400/70' : acct.rail;
                const amtColor = flow === 'del' ? 'text-rose-300 line-through' : flow === 'in' ? 'text-emerald-400' : flow === 'out' ? 'text-rose-400' : 'text-neutral-300';
                const sign = flow === 'in' ? '+' : flow === 'out' ? '−' : '';
                return (
                  <div key={a.id} className={`shrink-0 relative overflow-hidden p-4 pl-5 rounded-3xl flex flex-col gap-2 shadow-sm border ${flow === 'del' ? 'bg-rose-950/20 border-rose-500/25' : 'bg-neutral-900/60 border-neutral-800'}`}>
                    <span className={`absolute left-0 top-4 bottom-4 w-1 rounded-full ${rail}`} />
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${acct.chip}`}>{acct.label}</span>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${subj.key === 'suppression' ? 'text-rose-300' : 'text-neutral-400'}`}>{subj.label}</span>
                      </div>
                      <p className="text-[9px] text-neutral-400 font-black uppercase shrink-0 tabular-nums">{new Date(a.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <p className="text-[11px] font-bold text-neutral-300 leading-relaxed break-words">{displayNamesIn(a.details) || a.action}</p>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[9px] text-neutral-400 font-black uppercase tracking-wider">Signature · {displayUser(a.modifiedBy)}</p>
                      {amt !== null && <p className={`text-sm font-black tracking-tighter tabular-nums shrink-0 ${amtColor}`}>{sign}{formatRawCurrency(amt, 'TND')}</p>}
                    </div>
                  </div>
                );
              })}
              {rows.length > auditVisible && (
                <button onClick={() => setAuditVisible(v => v + 50)}
                  className="shrink-0 w-full py-4 rounded-2xl border border-neutral-800 bg-neutral-900/50 text-[10px] font-black text-neutral-300 uppercase tracking-widest hover:border-neutral-700 hover:text-white active:scale-[0.99] transition">
                  Voir 50 de plus · {rows.length - auditVisible} restante{rows.length - auditVisible > 1 ? 's' : ''}
                </button>
              )}
            </div>
          </div>
          );
        })()}

        {activeSection === 'settings' && (
          <div className="flex flex-col gap-8">
            {/* CURRENT USER + LOGOUT + CHANGE OWN PASSWORD */}
            <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-[48px] flex justify-between items-center shadow-2xl">
              <div>
                <p className="text-sm font-black text-white uppercase tracking-tighter">{displayUser(currentUser.username)}</p>
                <p className="text-[10px] text-neutral-500 uppercase font-black tracking-[0.2em] mt-1.5">{currentUser.role === 'admin' ? '👑 Administrateur' : '👤 Assistant'}</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setPwdModal({ open: true, mode: 'self', targetId: currentUser.id, targetName: displayUser(currentUser.username) })} className="p-4 bg-neutral-950 text-neutral-300 rounded-3xl border border-neutral-800 transition hover:border-neutral-700 shadow-xl" title="Changer mon mot de passe"><KeyRound className="h-5 w-5" /></button>
                <button onClick={handleLogout} className="p-4 bg-rose-950/20 text-rose-400 rounded-3xl border border-rose-900/40 transition hover:bg-rose-900/40 shadow-xl"><LogOut className="h-6 w-6" /></button>
              </div>
            </div>

            {/* ADMIN-ONLY: user management */}
            {currentUser.role === 'admin' && (
              <>
                <div className="p-8 bg-neutral-900/40 border border-neutral-800 rounded-[40px] shadow-inner flex flex-col gap-6">
                  <div className="flex items-center gap-3 text-emerald-400 border-b border-neutral-800 pb-5"><UserPlus className="h-5 w-5" /><h3 className="text-[10px] font-black uppercase tracking-widest">Nouvel Utilisateur</h3></div>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const fd = new FormData(form);
                    const res: any = await createAssistantUser(fd);
                    if (res.success) { form.reset(); await refreshHubState(); }
                    else alert(res.error || 'Erreur');
                  }} className="flex flex-col gap-4">
                    <input name="username" required minLength={2} placeholder="NOM D'UTILISATEUR" className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 text-sm text-white font-black uppercase outline-none focus:border-emerald-500/50" />
                    <input name="password" type="password" required minLength={4} placeholder="MOT DE PASSE" className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 text-sm text-white font-black outline-none focus:border-emerald-500/50" />
                    <div className="grid grid-cols-2 gap-3 p-1">
                      <label className="cursor-pointer">
                        <input type="radio" name="role" value="assistant" defaultChecked className="peer sr-only" />
                        <div className="p-4 rounded-2xl border-2 border-neutral-800 bg-neutral-950 text-center transition peer-checked:border-emerald-500 peer-checked:bg-emerald-500/10 peer-checked:text-emerald-300">
                          <p className="text-2xl mb-1">👤</p>
                          <p className="text-[10px] font-black uppercase tracking-widest">Assistant</p>
                          <p className="text-[9px] text-neutral-500 mt-1">Coffre seul</p>
                        </div>
                      </label>
                      <label className="cursor-pointer">
                        <input type="radio" name="role" value="admin" className="peer sr-only" />
                        <div className="p-4 rounded-2xl border-2 border-neutral-800 bg-neutral-950 text-center transition peer-checked:border-amber-500 peer-checked:bg-amber-500/10 peer-checked:text-amber-300">
                          <p className="text-2xl mb-1">👑</p>
                          <p className="text-[10px] font-black uppercase tracking-widest">Admin</p>
                          <p className="text-[9px] text-neutral-500 mt-1">Accès total</p>
                        </div>
                      </label>
                    </div>
                    <button type="submit" disabled={isPending} className="py-5 bg-white text-black font-black rounded-2xl uppercase text-[11px] tracking-[0.2em] active:scale-95 transition shadow-2xl disabled:opacity-50">Créer l'utilisateur</button>
                  </form>
                </div>

                <div className="flex flex-col gap-4">
                  <h4 className="text-[11px] font-black text-neutral-400 uppercase tracking-[0.25em] px-1 flex items-center gap-2"><Users className="h-4 w-4" /> Utilisateurs actifs ({initialUsers.length})</h4>
                  <div className="flex flex-col gap-3">
                    {initialUsers.map((u: any) => (
                      <div key={u.id} className="p-5 bg-neutral-900/60 border border-neutral-800 rounded-[32px] flex justify-between items-center group hover:border-neutral-700 transition">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-center text-neutral-400 font-black text-lg shadow-inner">{displayUser(u.username)[0].toUpperCase()}</div>
                          <div className="flex flex-col gap-1">
                            <p className="text-base font-black text-white uppercase tracking-tight">{displayUser(u.username)}</p>
                            <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">{u.role === 'admin' ? '👑 Admin' : '👤 Assistant'}</p>
                            {/* Seule page ou l'on gere les comptes : on rappelle l'identifiant
                                de connexion reel quand il differe du nom affiche. */}
                            {displayUser(u.username) !== u.username && (
                              <p className="text-[9px] font-bold text-neutral-600 tracking-wider normal-case">connexion : {u.username}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {(() => {
                            const isProtected = ['ff','ss'].includes(u.username.toLowerCase());
                            const isSelf = u.id === currentUser.id;
                            return <>
                              {isProtected && <span className="px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[8px] font-black uppercase tracking-widest" title="Compte propriétaire — protégé">🔒 Owner</span>}
                              {!isSelf && !isProtected && (
                                <button onClick={() => setPwdModal({ open: true, mode: 'admin_reset', targetId: u.id, targetName: displayUser(u.username) })} className="p-3 text-blue-400/50 hover:text-blue-400 hover:bg-blue-500/10 rounded-2xl transition" title={`Réinitialiser le mot de passe de ${displayUser(u.username)}`}><KeyRound className="h-5 w-5" /></button>
                              )}
                              {!isSelf && !isProtected && (
                                <button onClick={() => handleDeleteAssistantLoc(u.id, displayUser(u.username))} className="p-3 text-rose-500/30 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition" title={`Supprimer ${displayUser(u.username)}`}><Trash2 className="h-5 w-5" /></button>
                              )}
                            </>;
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-8 border-2 border-rose-500/30 bg-gradient-to-br from-rose-500/10 to-red-950/10 rounded-[40px] flex flex-col gap-6 mt-4 shadow-2xl shadow-rose-950/10">
                  <div className="flex items-center justify-between gap-4"><div className="flex items-center gap-3 text-rose-400"><Siren className="h-6 w-6" /><h3 className="text-xs font-black uppercase tracking-widest">Panic Lock</h3></div><span className="text-[8px] font-black text-rose-300 uppercase tracking-widest border border-rose-500/30 bg-rose-500/10 px-2 py-1 rounded-md">Urgence</span></div>
                  <p className="text-[11px] font-bold text-neutral-300 leading-relaxed">Bloque instantanément tous les comptes, sessions et accès aux données — y compris les administrateurs. Seuls les identifiants d’urgence créés maintenant pourront ouvrir la console de déverrouillage.</p>
                  <button onClick={() => { setPanicForm({ currentPassword: '', emergencyUsername: '', emergencyPassword: '', emergencyPasswordConfirm: '' }); setPanicError(''); setPanicActivationOpen(true); }} className="py-5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-2xl uppercase text-[11px] tracking-[0.18em] active:scale-95 transition shadow-2xl shadow-rose-900/30 flex items-center justify-center gap-2"><Siren className="h-4 w-4" /> Activer Panic Lock</button>
                </div>
                <div className="p-8 border-2 border-rose-500/20 bg-rose-500/5 rounded-[40px] flex flex-col gap-6 mt-4"><h3 className="text-xs font-black text-rose-400 uppercase tracking-widest flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Zone de Danger</h3><p className="text-[11px] font-bold text-neutral-400 leading-relaxed">Action irréversible. Toutes les données seront effacées.</p><button onClick={() => { setConfirmModal({ isOpen: true, title: 'WIPE TOTAL', isDanger: true, requirePassword: true, description: 'Attention : TOUT sera effacé.', confirmText: 'TOUT EFFACER', onConfirm: async (p: string) => { startTransition(async () => { const res = await resetDatabaseToZero(p); if (res.success) { setSelectedContact(null); setActiveModal(null); await refreshHubState(); } else alert(res.error); }); } }); }} className="py-4 bg-rose-600 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest active:scale-95 transition shadow-2xl">Réinitialiser la plateforme</button></div>
              </>
            )}
          </div>
        )}
      </main>

      <nav className="app-bottom-nav fixed bottom-4 left-0 right-0 z-40 px-3 sm:px-4 flex justify-center pointer-events-none">
        <div className="glass-panel w-full max-w-[680px] lg:max-w-[896px] border border-neutral-800 rounded-[26px] sm:rounded-[36px] p-1.5 sm:p-2.5 shadow-2xl flex flex-wrap lg:flex-nowrap items-center justify-center gap-1 lg:gap-1.5 pointer-events-auto shadow-emerald-500/5 ring-1 ring-white/10 backdrop-blur-3xl">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5 lg:h-6 lg:w-6" />, adminOnly: true },
            { id: 'currencies', label: 'Devises', icon: <WalletCards className="h-5 w-5 lg:h-6 lg:w-6" />, adminOnly: true },
            { id: 'treasury', label: 'Coffre', icon: <CoffreIcon className="h-5 w-5 lg:h-6 lg:w-6" />, adminOnly: false },
            { id: 'banque', label: 'Banque', icon: <Landmark className="h-5 w-5 lg:h-6 lg:w-6" />, adminOnly: false },
            { id: 'credit', label: 'Crédit', icon: <Receipt className="h-5 w-5 lg:h-6 lg:w-6" />, adminOnly: true },
            { id: 'archive', label: 'Archive', icon: <Archive className="h-5 w-5 lg:h-6 lg:w-6" />, adminOnly: true },
            { id: 'contacts', label: 'Contacts', icon: <Users className="h-5 w-5 lg:h-6 lg:w-6" />, adminOnly: true },
            { id: 'history', label: 'Audit', icon: <History className="h-5 w-5 lg:h-6 lg:w-6" />, adminOnly: true },
            { id: 'settings', label: 'Paramètres', icon: <Settings className="h-5 w-5 lg:h-6 lg:w-6" />, adminOnly: true },
          ].filter(s => !s.adminOnly || currentUser?.role === 'admin').map(s => (
            <button key={s.id} onClick={() => navigateTo(s.id)} className={`flex basis-[18%] grow lg:basis-0 min-w-0 flex-col items-center gap-1 px-1 py-2 lg:gap-1.5 lg:px-3 lg:py-3.5 rounded-[20px] sm:rounded-[28px] transition-all duration-300 active:scale-90 ${activeSection === s.id ? 'bg-white text-black font-black shadow-2xl lg:scale-105' : 'text-neutral-500 hover:text-neutral-300'}`}>
              {s.icon}<span className="w-full truncate text-center text-[8px] lg:text-[9px] font-black uppercase tracking-tight">{s.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* --- MODALS --- */}
      {tndNoteEdit && (
        <div className="fixed inset-0 z-[180] bg-black/90 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200" onClick={() => { if (!isPending) setTndNoteEdit(null); }}>
          <div className="w-full max-w-md bg-[#080808] border border-neutral-800 rounded-t-[36px] sm:rounded-[36px] p-6 sm:p-7 flex flex-col gap-5 animate-slide-up shadow-2xl ring-1 ring-white/10" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4"><div><p className="text-[9px] font-black text-blue-300 uppercase tracking-[0.2em]">Coffre</p><h3 className="text-lg font-black text-white tracking-tight mt-1">Modifier la note</h3></div><button onClick={() => setTndNoteEdit(null)} disabled={isPending} className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition"><X className="h-4 w-4" /></button></div>
            <div className="grid grid-cols-2 gap-3"><div className="p-3 bg-neutral-900/70 border border-neutral-800 rounded-2xl"><p className="text-[8px] font-black text-neutral-500 uppercase tracking-widest">Montant verrouillé</p><p className={`text-lg font-black mt-1 ${tndNoteEdit.type === 'IN' ? 'text-emerald-400' : 'text-rose-400'}`}>{tndNoteEdit.type === 'IN' ? '+' : '-'}{formatRawCurrency(tndNoteEdit.amount, 'TND')}</p></div><div className="p-3 bg-neutral-900/70 border border-neutral-800 rounded-2xl"><p className="text-[8px] font-black text-neutral-500 uppercase tracking-widest">Type verrouillé</p><p className="text-lg font-black mt-1 text-neutral-200">{tndNoteEdit.type === 'IN' ? 'Entrée' : 'Sortie'}</p></div></div>
            <p className="text-[10px] text-neutral-500 font-bold leading-relaxed">Seule la note peut être corrigée. Le montant, le type, la date et l’état du mouvement ne peuvent pas être modifiés.</p>
            <form onSubmit={handleSaveTndNote} className="flex flex-col gap-3"><textarea autoFocus required maxLength={1000} value={tndNoteEdit.note} onChange={e => setTndNoteEdit(current => current ? { ...current, note: e.target.value } : current)} className="min-h-28 w-full resize-none bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-sm text-white font-bold outline-none focus:border-blue-500/50" placeholder="Note du mouvement" />{tndNoteEditError && <p className="text-rose-400 text-[10px] font-black uppercase text-center tracking-wider">{tndNoteEditError}</p>}<div className="flex gap-3"><button type="button" onClick={() => setTndNoteEdit(null)} disabled={isPending} className="flex-1 py-3.5 bg-neutral-900 border border-neutral-800 text-neutral-400 font-black rounded-2xl uppercase text-[10px] tracking-widest active:scale-95 transition">Annuler</button><button type="submit" disabled={isPending || !tndNoteEdit.note.trim()} className="flex-1 py-3.5 bg-blue-500 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest active:scale-95 transition disabled:opacity-50">{isPending ? 'Enregistrement…' : 'Enregistrer'}</button></div></form>
          </div>
        </div>
      )}
      {activeModal === 'add_tx' && currentUser.role === 'admin' && (
        <div className="fixed inset-0 z-[160] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setActiveModal(null)}>
          <div className="w-full max-w-md bg-[#080808] border border-neutral-800 rounded-[48px] p-10 flex flex-col gap-7 animate-scale-in shadow-2xl shadow-emerald-500/5 ring-1 ring-white/10" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-neutral-900 pb-5 text-emerald-400 px-1"><h3 className="font-black uppercase tracking-[0.2em] text-sm">Nouvelle Opération</h3><button onClick={() => setActiveModal(null)} className="p-2.5 rounded-full bg-neutral-900 transition hover:text-white border border-neutral-800"><X className="h-5 w-5" /></button></div>
            <form onSubmit={handleAddTransaction} className="flex flex-col gap-4">
              {!inlineNewPartner ? (
                <select required className="bg-neutral-900 border border-neutral-800 rounded-[20px] p-5 text-sm text-white font-black outline-none focus:border-emerald-500/50 appearance-none shadow-inner" value={transactionForm.contactId} onChange={e => { if (e.target.value === '__new__') { setInlineNewPartner(true); } else { setTransactionForm(p=>({...p, contactId: e.target.value})); } }}>
                  <option value="">Partenaire</option>
                  <option value="__new__">➕ Nouveau partenaire…</option>
                  {contacts.map((c:any) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
                </select>
              ) : (
                <div className="flex flex-col gap-2.5 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-[20px] animate-in fade-in duration-200">
                  <div className="flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Nouveau partenaire</span><button type="button" onClick={() => { setInlineNewPartner(false); setInlinePartnerName(''); setInlinePartnerCountry(''); }} className="text-neutral-500 hover:text-white transition"><X className="h-4 w-4" /></button></div>
                  <input type="text" autoFocus placeholder="Nom du partenaire" className="bg-neutral-900 border border-neutral-800 rounded-2xl p-3.5 text-sm text-white font-black uppercase outline-none focus:border-emerald-500/50 shadow-inner" value={inlinePartnerName} onChange={e => setInlinePartnerName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleInlineCreatePartner(); } }} />
                  <input type="text" placeholder="Pays / région (optionnel)" className="bg-neutral-900 border border-neutral-800 rounded-2xl p-3.5 text-xs text-white font-black uppercase outline-none focus:border-neutral-600 shadow-inner" value={inlinePartnerCountry} onChange={e => setInlinePartnerCountry(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleInlineCreatePartner(); } }} />
                  <button type="button" onClick={handleInlineCreatePartner} disabled={!inlinePartnerName.trim() || isPending} className="py-3 bg-emerald-500 text-black font-black rounded-2xl uppercase text-[10px] tracking-widest active:scale-95 transition disabled:opacity-40 flex items-center justify-center gap-2"><Plus className="h-4 w-4 stroke-[3]" /> Créer & sélectionner</button>
                </div>
              )}
              <div className="flex gap-3 w-full"><input type="number" step="any" required className="flex-1 min-w-0 bg-neutral-900 border border-neutral-800 rounded-[20px] p-5 text-3xl font-black text-white focus:border-emerald-500/50 outline-none shadow-inner tracking-tighter" placeholder="0.00" value={transactionForm.amount} onChange={e => setTransactionForm(p=>({...p, amount: e.target.value}))} /><select className="bg-neutral-900 border border-neutral-800 rounded-[20px] px-5 font-black text-white outline-none focus:border-neutral-600 shadow-inner" value={transactionForm.currencyCode} onChange={e => setTransactionForm(p=>({...p, currencyCode: e.target.value}))}>{initialActiveCurrencies.map((c:any) => <option key={c.code} value={c.code}>{c.code}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { type: 'HELD', label: 'ENCAISSER', note: 'Argent confié (+)', active: 'bg-emerald-500 text-black border-emerald-500' },
                  { type: 'PAYABLE', label: 'DÉCAISSER', note: "Repris / dépensé (−)", active: 'bg-rose-500 text-white border-rose-500' },
                ].map(opt => (
                  <button key={opt.type} type="button" onClick={() => setTransactionForm(p=>({...p, type: opt.type}))} className={`py-5 rounded-[20px] text-[11px] font-black uppercase border transition-all flex flex-col items-center gap-1 shadow-md ${transactionForm.type === opt.type ? opt.active : 'bg-neutral-900/50 border-neutral-800 text-neutral-500 hover:border-neutral-700'}`}><span>{opt.label}</span><span className="text-[7px] font-black opacity-60 tracking-tighter uppercase">{opt.note}</span></button>
                ))}
              </div>
              <button type="button" onClick={() => setTransactionForm(p=>({...p, isPostponed: !p.isPostponed}))} className={`w-full py-3.5 rounded-[20px] text-[10px] font-black uppercase border transition-all flex items-center justify-center gap-2 tracking-widest ${transactionForm.isPostponed ? 'bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20' : 'bg-neutral-900/50 border-neutral-800 text-amber-400 hover:border-amber-500/40'}`}><CalendarClock className="h-4 w-4" /> {transactionForm.isPostponed ? 'Planifié pour une date' : 'Planifier pour plus tard'}</button>
              {transactionForm.isPostponed && (
                <div className="flex flex-col gap-3 animate-in slide-in-from-top-2 duration-300">
                  <div className="flex flex-col gap-1.5"><label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1">Date prévue du mouvement</label><input type="date" required min={localDayKey()} className="bg-neutral-900 border border-neutral-800 rounded-[20px] p-4 text-white font-black outline-none focus:border-amber-500/50 shadow-inner [color-scheme:dark]" value={transactionForm.dueDate} onChange={e => setTransactionForm(p=>({...p, dueDate: e.target.value}))} /></div>
                  <div className="flex flex-col gap-1.5"><label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1">Email pour le rappel (optionnel)</label><input type="email" placeholder="votre@email.com" className="bg-neutral-950 border border-neutral-800 rounded-[20px] p-4 text-sm text-white font-black outline-none focus:border-amber-500/50" value={transactionForm.reminderEmail} onChange={e => setTransactionForm(p=>({...p, reminderEmail: e.target.value}))} /></div>
                </div>
              )}
              <div className="px-1 py-2.5 bg-neutral-900/40 border border-neutral-800 rounded-2xl flex items-start gap-2.5"><span className="text-base shrink-0 pl-2">💡</span><p className="text-[11px] font-bold text-neutral-400 leading-relaxed pr-2">{transactionForm.isPostponed ? `MOUVEMENT PLANIFIÉ (${transactionForm.type === 'HELD' ? 'Encaisser' : 'Décaisser'}) : le solde ne change PAS maintenant. Il sera appliqué quand tu confirmeras le mouvement à l'échéance.` : TYPE_EXPLAIN[transactionForm.type]}</p></div>
              <input type="text" required className="bg-neutral-950 border border-neutral-800 rounded-[20px] p-5 text-sm text-white focus:border-emerald-500/40 outline-none shadow-inner" placeholder="NOTE OBLIGATOIRE (TRACABILITÉ)" value={transactionForm.note} onChange={e => setTransactionForm(p=>({...p, note: e.target.value}))} />
              <div className="flex gap-4 mt-4"><button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-5 bg-neutral-900 text-neutral-400 font-black rounded-[24px] uppercase transition active:scale-95 border border-neutral-800 tracking-widest text-xs">Annuler</button><button type="submit" disabled={isPending || !transactionForm.note.trim()} className="flex-[2] py-5 bg-emerald-500 text-black font-black rounded-[24px] uppercase shadow-2xl shadow-emerald-500/30 active:scale-95 transition tracking-widest text-xs disabled:opacity-40">Enregistrer</button></div>
            </form>
          </div>
        </div>
      )}

      {/* SÉLECTEUR D'OPÉRATION — propose TOUTES les fonctionnalités disponibles pour le rôle
          connecté. Un assistant ne voit que Coffre + Banque (ce qu'il a le droit de faire) ;
          l'admin voit en plus Devises, Archive et Crédit. Chaque entrée affiche son solde en
          direct pour éviter de se tromper de caisse, et demande le sens (Entrée/Sortie) avant
          d'ouvrir le formulaire. */}
      {activeModal === 'choose_account' && (() => {
        const isAdmin = currentUser.role === 'admin';
        const closeChooser = () => { setActiveModal(null); setChooserExpand(null); };
        return (
        <div className="fixed inset-0 z-[160] bg-black/90 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200" onClick={closeChooser}>
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-[#080808] border border-neutral-800 rounded-t-[36px] sm:rounded-[40px] p-6 sm:p-8 flex flex-col gap-4 animate-slide-up sm:animate-scale-in shadow-2xl ring-1 ring-white/10" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-neutral-900 pb-4 px-1 sticky top-0 bg-[#080808] z-10 -mt-1 pt-1">
              <div><h3 className="font-black uppercase tracking-[0.2em] text-sm text-white">Nouvelle opération</h3><p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mt-1">{isAdmin ? "Choisis la caisse ou l'action" : 'Tes caisses autorisées'}</p></div>
              <button onClick={closeChooser} className="p-2.5 rounded-full bg-neutral-900 transition hover:text-white border border-neutral-800 shrink-0"><X className="h-5 w-5" /></button>
            </div>

            <p className="text-[9px] font-black text-neutral-600 uppercase tracking-[0.2em] px-1">Caisses en dinars</p>

            {/* COFFRE FORT ADMINISTRATION — tous les rôles */}
            <div className="rounded-[28px] border border-blue-500/25 bg-gradient-to-br from-blue-500/10 to-neutral-950 overflow-hidden transition">
              <button onClick={() => setChooserExpand(chooserExpand === 'treasury' ? null : 'treasury')} className="w-full text-left p-5 active:scale-[0.98] transition flex items-center gap-4">
                <div className="h-11 w-11 rounded-2xl bg-blue-500/15 text-blue-300 flex items-center justify-center shrink-0"><CoffreIcon className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1"><p className="text-sm font-black text-white uppercase tracking-tight truncate">Coffre Fort Administration</p><p className="text-[11px] font-black text-blue-300 tracking-tight mt-0.5">{formatRawCurrency(metrics.tndBalance || 0, 'TND')}</p></div>
                <ChevronRight className={`h-5 w-5 text-neutral-600 shrink-0 transition-transform ${chooserExpand === 'treasury' ? 'rotate-90' : ''}`} />
              </button>
              {chooserExpand === 'treasury' && (
                <div className="grid grid-cols-2 gap-2.5 px-4 pb-4 pt-1 animate-in slide-in-from-top-2 duration-200">
                  <button onClick={() => { setTndForm({ amount: '', type: 'IN', note: '', scheduledFor: '' }); navigateTo('treasury'); setActiveModal('add_tnd'); setChooserExpand(null); }} className="py-4 rounded-2xl bg-emerald-500 text-black font-black uppercase text-[11px] tracking-widest flex flex-col items-center gap-1 active:scale-95 transition"><ArrowUpRight className="h-4 w-4 rotate-180 stroke-[3]" /> Encaisser</button>
                  <button onClick={() => { setTndForm({ amount: '', type: 'OUT', note: '', scheduledFor: '' }); setTndBatchItems([{ amount: '', note: '' }]); navigateTo('treasury'); setActiveModal('add_tnd'); setChooserExpand(null); }} className="py-4 rounded-2xl bg-rose-500 text-white font-black uppercase text-[11px] tracking-widest flex flex-col items-center gap-1 active:scale-95 transition"><ArrowUpRight className="h-4 w-4 stroke-[3]" /> Décaissement</button>
                </div>
              )}
            </div>

            {/* BANQUE — une entrée par compte, tous les rôles. Couleur propre à chaque compte. */}
            {bankAccounts.map((a: any) => { const p = bankPalette(a.id); const key = `bank:${a.id}`; return (
              <div key={a.id} className={`rounded-[28px] border ${p.borderSoft} bg-gradient-to-br ${p.grad} to-neutral-950 overflow-hidden transition`}>
                <button onClick={() => setChooserExpand(chooserExpand === key ? null : key)} className="w-full text-left p-5 active:scale-[0.98] transition flex items-center gap-4">
                  <div className={`h-11 w-11 rounded-2xl ${p.bgSoft} ${p.text} flex items-center justify-center shrink-0`}><Landmark className="h-5 w-5" /></div>
                  <div className="min-w-0 flex-1"><p className="text-sm font-black text-white uppercase tracking-tight truncate flex items-center gap-1.5">{isBiatAccount(a.name) && <img src={BIAT_LOGO_SRC} alt="BIAT" className="h-[1em] w-auto rounded-sm shrink-0 bg-white/95 p-px" />}<span className="truncate">{a.name}</span></p><p className={`text-[11px] font-black ${p.text} tracking-tight mt-0.5`}>{formatRawCurrency(a.balance || 0, a.currencyCode)}</p></div>
                  <ChevronRight className={`h-5 w-5 text-neutral-600 shrink-0 transition-transform ${chooserExpand === key ? 'rotate-90' : ''}`} />
                </button>
                {chooserExpand === key && (
                  <div className="grid grid-cols-2 gap-2.5 px-4 pb-4 pt-1 animate-in slide-in-from-top-2 duration-200">
                    <button onClick={() => { setSelectedBankId(a.id); setBankForm({ amount: '', type: 'IN', note: '', scheduledFor: '' }); navigateTo('banque'); setActiveModal('add_bank'); setChooserExpand(null); }} className="py-4 rounded-2xl bg-emerald-500 text-black font-black uppercase text-[11px] tracking-widest flex flex-col items-center gap-1 active:scale-95 transition"><ArrowUpRight className="h-4 w-4 rotate-180 stroke-[3]" /> Entrée</button>
                    <button onClick={() => { setSelectedBankId(a.id); setBankForm({ amount: '', type: 'OUT', note: '', scheduledFor: '' }); setBankBatchItems([{ amount: '', note: '' }]); navigateTo('banque'); setActiveModal('add_bank'); setChooserExpand(null); }} className="py-4 rounded-2xl bg-rose-500 text-white font-black uppercase text-[11px] tracking-widest flex flex-col items-center gap-1 active:scale-95 transition"><ArrowUpRight className="h-4 w-4 stroke-[3]" /> Sortie</button>
                  </div>
                )}
              </div>
            ); })}

            {/* CAISSE ARCHIVE — admin uniquement */}
            {isAdmin && (
              <div className="rounded-[28px] border border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-neutral-950 overflow-hidden transition">
                <button onClick={() => setChooserExpand(chooserExpand === 'archive' ? null : 'archive')} className="w-full text-left p-5 active:scale-[0.98] transition flex items-center gap-4">
                  <div className="h-11 w-11 rounded-2xl bg-amber-500/15 text-amber-300 flex items-center justify-center shrink-0"><Archive className="h-5 w-5" /></div>
                  <div className="min-w-0 flex-1"><p className="text-sm font-black text-white uppercase tracking-tight truncate">Caisse Archive</p><p className="text-[11px] font-black text-amber-300 tracking-tight mt-0.5">{formatRawCurrency(metrics.archiveBalance || 0, 'TND')}</p></div>
                  <ChevronRight className={`h-5 w-5 text-neutral-600 shrink-0 transition-transform ${chooserExpand === 'archive' ? 'rotate-90' : ''}`} />
                </button>
                {chooserExpand === 'archive' && (
                  <div className="grid grid-cols-2 gap-2.5 px-4 pb-4 pt-1 animate-in slide-in-from-top-2 duration-200">
                    <button onClick={() => { setArchiveForm({ amount: '', type: 'IN', note: '', scheduledFor: '' }); navigateTo('archive'); setActiveModal('add_archive'); setChooserExpand(null); }} className="py-4 rounded-2xl bg-emerald-500 text-black font-black uppercase text-[11px] tracking-widest flex flex-col items-center gap-1 active:scale-95 transition"><ArrowUpRight className="h-4 w-4 rotate-180 stroke-[3]" /> Encaisser</button>
                    <button onClick={() => { setArchiveForm({ amount: '', type: 'OUT', note: '', scheduledFor: '' }); setArchiveBatchItems([{ amount: '', note: '' }]); navigateTo('archive'); setActiveModal('add_archive'); setChooserExpand(null); }} className="py-4 rounded-2xl bg-rose-500 text-white font-black uppercase text-[11px] tracking-widest flex flex-col items-center gap-1 active:scale-95 transition"><ArrowUpRight className="h-4 w-4 stroke-[3]" /> Décaissement</button>
                  </div>
                )}
              </div>
            )}

            {/* Actions qui ne sont PAS des mouvements de caisse — admin uniquement */}
            {isAdmin && (
              <>
                <p className="text-[9px] font-black text-neutral-600 uppercase tracking-[0.2em] px-1 mt-1">Autres opérations</p>

                {/* DEVISES — le sens est demandé dans le formulaire lui-même */}
                <button onClick={() => { setTransactionForm({ contactId: '', amount: '', currencyCode: 'USD', type: 'HELD', category: 'Virement', note: '', isPostponed: false, dueDate: '', reminderEmail: '', plannedType: 'RECEIVABLE' }); navigateTo('currencies'); setActiveModal('add_tx'); setChooserExpand(null); }} className="text-left p-5 rounded-[28px] border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-neutral-950 hover:border-emerald-500/50 active:scale-[0.98] transition flex items-center gap-4">
                  <div className="h-11 w-11 rounded-2xl bg-emerald-500/15 text-emerald-300 flex items-center justify-center shrink-0"><WalletCards className="h-5 w-5" /></div>
                  <div className="min-w-0 flex-1"><p className="text-sm font-black text-white uppercase tracking-tight">Devises · Partenaire</p><p className="text-[10px] font-black text-emerald-300/80 uppercase tracking-widest mt-1">Encaisser / décaisser un partenaire</p></div>
                  <ChevronRight className="h-5 w-5 text-neutral-600 shrink-0" />
                </button>

                {/* CRÉDIT — une dette, pas un mouvement de caisse : c'est dit explicitement */}
                <button onClick={() => { setCreditForm({ amount: '', beneficiary: '', note: '' }); setCreditError(''); navigateTo('credit'); setActiveModal('add_credit'); setChooserExpand(null); }} className="text-left p-5 rounded-[28px] border border-rose-500/25 bg-gradient-to-br from-rose-500/10 to-neutral-950 hover:border-rose-500/50 active:scale-[0.98] transition flex items-center gap-4">
                  <div className="h-11 w-11 rounded-2xl bg-rose-500/15 text-rose-300 flex items-center justify-center shrink-0"><Receipt className="h-5 w-5" /></div>
                  <div className="min-w-0 flex-1"><p className="text-sm font-black text-white uppercase tracking-tight">Crédit</p><p className="text-[10px] font-black text-rose-300/80 uppercase tracking-widest mt-1">Dette sans échéance · hors totaux</p></div>
                  <ChevronRight className="h-5 w-5 text-neutral-600 shrink-0" />
                </button>
              </>
            )}

            {!isAdmin && bankAccounts.length === 0 && (
              <p className="text-[11px] font-bold text-neutral-500 text-center py-2">Seul le Coffre est disponible pour ton compte.</p>
            )}
          </div>
        </div>
        );
      })()}
      {noteModal.open && (
        <div className="fixed inset-0 z-[170] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={() => setNoteModal({ open: false })}>
          <div className="w-full max-w-sm bg-[#080808] border border-sky-500/40 rounded-[40px] p-8 flex flex-col gap-6 animate-scale-in shadow-2xl ring-1 ring-white/10" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-neutral-900 pb-4"><div className="flex items-center gap-2 text-sky-300 min-w-0"><Bell className="h-5 w-5 shrink-0" /><h3 className="font-black uppercase tracking-[0.2em] text-sm truncate">{noteModal.editId ? 'Modifier la note' : 'Nouvelle note'}{noteModal.contactName ? ` · ${noteModal.contactName}` : ''}</h3></div><button onClick={() => setNoteModal({ open: false })} className="p-2.5 rounded-full bg-neutral-900 transition border border-neutral-800 shrink-0"><X className="h-5 w-5" /></button></div>
            <div className="flex items-center gap-3 p-3.5 bg-sky-500/5 border border-sky-500/20 rounded-2xl"><span className="text-base shrink-0">💡</span><p className="text-[11px] font-bold text-neutral-400 leading-relaxed">Argent informel <b className="text-sky-300">jamais compté</b> dans les totaux. Juste un rappel visible sur la fiche du partenaire.</p></div>
            <form onSubmit={handleSaveNote} className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-2.5">
                <button type="button" onClick={() => setNoteForm(p => ({ ...p, direction: 'THEY_OWE' }))} className={`py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest border transition ${noteForm.direction === 'THEY_OWE' ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-neutral-900/50 border-neutral-800 text-neutral-500 hover:border-neutral-700'}`}>Il me doit</button>
                <button type="button" onClick={() => setNoteForm(p => ({ ...p, direction: 'I_OWE' }))} className={`py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest border transition ${noteForm.direction === 'I_OWE' ? 'bg-rose-500 text-white border-rose-500' : 'bg-neutral-900/50 border-neutral-800 text-neutral-500 hover:border-neutral-700'}`}>Je lui dois</button>
              </div>
              <div className="flex gap-2.5">
                <input type="number" step="any" placeholder="Montant (optionnel)" value={noteForm.amount} onChange={e => setNoteForm(p => ({ ...p, amount: e.target.value }))} className="flex-[2] min-w-0 bg-neutral-900 border border-neutral-800 rounded-[20px] p-4 text-xl font-black text-white outline-none focus:border-sky-500/50 shadow-inner tracking-tighter" />
                <select value={noteForm.currencyCode} onChange={e => setNoteForm(p => ({ ...p, currencyCode: e.target.value }))} className="flex-1 min-w-0 bg-neutral-950 border border-neutral-800 rounded-[20px] p-4 text-sm font-black text-white outline-none focus:border-sky-500/40 [color-scheme:dark]">
                  {['TND','USD','EURO','RMB'].map(cc => <option key={cc} value={cc}>{cc}</option>)}
                </select>
              </div>
              <input type="text" required placeholder="DÉTAIL (QUI / POURQUOI)" value={noteForm.text} onChange={e => setNoteForm(p => ({ ...p, text: e.target.value }))} className="bg-neutral-950 border border-neutral-800 rounded-[20px] p-5 text-sm text-white outline-none focus:border-sky-500/40 shadow-inner" />
              <div className="flex gap-4 mt-1"><button type="button" onClick={() => setNoteModal({ open: false })} className="flex-1 py-5 bg-neutral-900 text-neutral-400 font-black rounded-[24px] uppercase transition active:scale-95 border border-neutral-800 tracking-widest text-xs">Annuler</button><button type="submit" disabled={isPending || !noteForm.text.trim()} className="flex-[2] py-5 bg-sky-500 text-black font-black rounded-[24px] uppercase shadow-2xl shadow-sky-500/30 active:scale-95 transition tracking-widest text-xs disabled:opacity-40">{noteModal.editId ? 'Enregistrer' : 'Ajouter'}</button></div>
            </form>
          </div>
        </div>
      )}
      {activeModal === 'add_receivable' && (
        <div className="fixed inset-0 z-[160] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={() => setActiveModal(null)}>
          <div className="w-full max-w-sm bg-[#080808] border border-sky-500/40 rounded-[40px] p-8 flex flex-col gap-6 animate-scale-in shadow-2xl ring-1 ring-white/10" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-neutral-900 pb-4"><div className="flex items-center gap-2 text-sky-300"><Bell className="h-5 w-5" /><h3 className="font-black uppercase tracking-[0.2em] text-sm">On me doit de l'argent</h3></div><button onClick={() => setActiveModal(null)} className="p-2.5 rounded-full bg-neutral-900 transition border border-neutral-800"><X className="h-5 w-5" /></button></div>
            <div className="flex items-center gap-3 p-3.5 bg-sky-500/5 border border-sky-500/20 rounded-2xl"><span className="text-base shrink-0">💡</span><p className="text-[11px] font-bold text-neutral-400 leading-relaxed">Ce montant reste <b className="text-sky-300">visible mais hors du solde</b>. Quand la personne te rembourse, tape « Récupéré » et il rejoint la caisse.</p></div>
            <form onSubmit={handleAddReceivable} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5"><label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1">Montant dû (TND)</label><input type="number" step="any" required autoFocus placeholder="0" value={receivableForm.amount} onChange={e => setReceivableForm(p => ({ ...p, amount: e.target.value }))} className="bg-neutral-900 border border-neutral-800 rounded-[20px] p-5 text-3xl font-black text-white outline-none focus:border-sky-500/50 shadow-inner tracking-tighter" /></div>
              <input type="text" required placeholder="QUI ? POURQUOI ? (NOTE OBLIGATOIRE)" value={receivableForm.note} onChange={e => setReceivableForm(p => ({ ...p, note: e.target.value }))} className="bg-neutral-950 border border-neutral-800 rounded-[20px] p-5 text-sm text-white outline-none focus:border-sky-500/40 shadow-inner" />
              <div className="flex gap-4 mt-1"><button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-5 bg-neutral-900 text-neutral-400 font-black rounded-[24px] uppercase transition active:scale-95 border border-neutral-800 tracking-widest text-xs">Annuler</button><button type="submit" disabled={isPending || !receivableForm.amount || !receivableForm.note.trim()} className="flex-[2] py-5 bg-sky-500 text-black font-black rounded-[24px] uppercase shadow-2xl shadow-sky-500/30 active:scale-95 transition tracking-widest text-xs disabled:opacity-40">Enregistrer</button></div>
            </form>
          </div>
        </div>
      )}
      {activeModal === 'transfer_archive' && currentUser.role === 'admin' && (
        <div className="fixed inset-0 z-[160] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={() => setActiveModal(null)}>
          <div className="w-full max-w-sm bg-[#080808] border border-amber-500/40 rounded-[40px] p-8 flex flex-col gap-6 animate-scale-in shadow-2xl ring-1 ring-white/10" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-neutral-900 pb-4"><div className="flex items-center gap-2 text-amber-300"><ArrowLeftRight className="h-5 w-5" /><h3 className="font-black uppercase tracking-[0.2em] text-sm">Transfert Coffre → Archive</h3></div><button onClick={() => setActiveModal(null)} className="p-2.5 rounded-full bg-neutral-900 transition border border-neutral-800"><X className="h-5 w-5" /></button></div>
            <div className="flex items-center gap-3 p-3.5 bg-amber-500/5 border border-amber-500/20 rounded-2xl"><span className="text-base shrink-0">💡</span><p className="text-[11px] font-bold text-neutral-400 leading-relaxed">Sortie du Coffre TND et entrée dans l'Archive, en une seule opération. Réservé à l'administrateur, mis en évidence dans les deux journaux.</p></div>
            <form onSubmit={handleTransferToArchive} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5"><label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1">Montant (TND)</label><input type="number" step="any" required autoFocus placeholder="0" value={transferForm.amount} onChange={e => setTransferForm(p => ({ ...p, amount: e.target.value }))} className="bg-neutral-900 border border-neutral-800 rounded-[20px] p-5 text-3xl font-black text-white outline-none focus:border-amber-500/50 shadow-inner tracking-tighter" /></div>
              <input type="text" required placeholder="NOTE OBLIGATOIRE (TRACABILITÉ)" value={transferForm.note} onChange={e => setTransferForm(p => ({ ...p, note: e.target.value }))} className="bg-neutral-950 border border-neutral-800 rounded-[20px] p-5 text-sm text-white outline-none focus:border-amber-500/40 shadow-inner" />
              <div className="flex gap-4 mt-1"><button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-5 bg-neutral-900 text-neutral-400 font-black rounded-[24px] uppercase transition active:scale-95 border border-neutral-800 tracking-widest text-xs">Annuler</button><button type="submit" disabled={isPending || !transferForm.amount || !transferForm.note.trim()} className="flex-[2] py-5 bg-amber-500 text-black font-black rounded-[24px] uppercase shadow-2xl shadow-amber-500/30 active:scale-95 transition tracking-widest text-xs disabled:opacity-40">Transférer</button></div>
            </form>
          </div>
        </div>
      )}
      {activeModal === 'add_tnd' && (
        <div className="fixed inset-0 z-[160] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={() => setActiveModal(null)}>
          <div className={`w-full ${tndForm.type === 'OUT' ? 'max-w-2xl' : 'max-w-sm'} max-h-[92vh] overflow-y-auto bg-[#080808] border border-blue-500/40 rounded-[48px] p-5 sm:p-10 flex flex-col gap-7 animate-scale-in shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-neutral-900 pb-5 text-blue-400 px-1"><h3 className="font-black uppercase tracking-[0.2em] text-sm">{tndForm.type === 'IN' ? 'Encaisser TND' : 'Décaissement TND'}</h3><button onClick={() => setActiveModal(null)} className="p-2.5 rounded-full bg-neutral-900 transition border border-neutral-800"><X className="h-5 w-5" /></button></div>
            {tndForm.type === 'OUT' ? (
              <form onSubmit={handleAddTndBatchDisbursement} className="flex flex-col gap-5">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-black text-rose-300 uppercase tracking-widest">Décaissements multiples</p><p className="text-[10px] text-neutral-500 font-bold mt-1">Chaque montant doit avoir sa propre note.</p></div><div className="shrink-0 px-4 py-2 bg-rose-500/10 border border-rose-500/25 rounded-2xl text-right"><p className="text-[8px] font-black uppercase tracking-[0.2em] text-rose-300/70">Total</p><p className="text-lg font-black text-rose-300 leading-none mt-0.5 whitespace-nowrap">{new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(tndBatchItems.reduce((s, item) => s + (Number(item.amount) || 0), 0))} DT</p></div></div>
                <div className="flex flex-col gap-3 max-h-[44vh] sm:max-h-[38vh] overflow-y-auto pr-1">
                  {tndBatchItems.map((item, index) => (
                    <div key={index} className="shrink-0 grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_170px_1fr_auto] gap-2 items-center p-3 bg-neutral-950 border border-neutral-800 rounded-2xl">
                      {/* Telephone : ligne 1 = numero + montant + corbeille, ligne 2 = la note
                          sur toute la largeur. Ordinateur : tout tient sur une seule ligne.
                          Les positions sont donnees explicitement pour les deux tailles. */}
                      <span className="col-start-1 row-start-1 h-9 w-9 sm:h-8 sm:w-8 rounded-xl bg-rose-500/10 text-rose-300 flex items-center justify-center text-[11px] sm:text-[10px] font-black">{index + 1}</span>
                      <div className="col-start-2 row-start-1 relative min-w-0">
                        <input type="number" inputMode="decimal" step="any" required min="0.001" placeholder="Montant" value={item.amount} onChange={e => setTndBatchItems(items => items.map((x, i) => i === index ? { ...x, amount: e.target.value } : x))} className="w-full bg-black border border-neutral-800 rounded-xl pl-3 pr-12 py-3 text-lg sm:text-sm text-white font-black tracking-tight outline-none focus:border-rose-500/50" />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-widest text-neutral-500">DT</span>
                      </div>
                      <button type="button" disabled={tndBatchItems.length === 1} onClick={() => setTndBatchItems(items => items.filter((_, i) => i !== index))} className="col-start-3 row-start-1 sm:col-start-4 p-2.5 text-rose-500/50 hover:text-rose-400 disabled:opacity-20 disabled:cursor-not-allowed rounded-xl"><Trash2 className="h-4 w-4" /></button>
                      <input type="text" required placeholder="NOTE OBLIGATOIRE" value={item.note} onChange={e => setTndBatchItems(items => items.map((x, i) => i === index ? { ...x, note: e.target.value } : x))} className="col-start-1 col-end-4 row-start-2 sm:col-start-3 sm:col-end-4 sm:row-start-1 min-w-0 bg-black border border-neutral-800 rounded-xl px-3 py-3 text-xs text-white font-bold uppercase outline-none focus:border-rose-500/50" />
                    </div>
                  ))}
                </div>
                <button type="button" disabled={tndBatchItems.length >= 30} onClick={() => setTndBatchItems(items => [...items, { amount: '', note: '' }])} className="py-3.5 border border-dashed border-rose-500/40 text-rose-300 hover:bg-rose-500/10 disabled:opacity-30 rounded-2xl font-black text-[10px] uppercase tracking-widest transition flex items-center justify-center gap-2"><Plus className="h-4 w-4" /> Ajouter un montant</button>
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black text-neutral-500 uppercase tracking-widest px-1 flex items-center gap-2"><CalendarClock className="h-3 w-3" /> Date prévue commune (optionnel)</label>
                  <input type="date" min={localDayKey()} className="bg-neutral-950 border border-neutral-800 rounded-[20px] p-4 text-sm text-white font-black uppercase outline-none focus:border-amber-500/50 shadow-inner" value={tndForm.scheduledFor || ''} onChange={e => setTndForm(p=>({ ...p, scheduledFor: e.target.value }))} />
                  {tndForm.scheduledFor && <p className="text-[10px] font-black text-amber-400 px-2 flex items-center gap-1.5"><Bell className="h-3 w-3" /> Tous les décaissements seront planifiés à cette date et rappelés dès J-1.</p>}
                </div>
                <div className="flex gap-4 mt-1">
                  <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-5 bg-neutral-900 text-neutral-400 font-black rounded-[24px] uppercase transition border border-neutral-800 tracking-widest text-xs">Annuler</button>
                  <button type="submit" disabled={isPending || tndBatchItems.some(item => !item.amount || !item.note.trim())} className="flex-[2] py-5 bg-rose-600 text-white font-black rounded-[24px] uppercase shadow-2xl shadow-rose-900/30 active:scale-95 transition tracking-widest text-xs disabled:opacity-40">{tndForm.scheduledFor ? `Planifier ${tndBatchItems.length} sortie${tndBatchItems.length > 1 ? 's' : ''}` : `Enregistrer ${tndBatchItems.length} sortie${tndBatchItems.length > 1 ? 's' : ''}`}</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAddTndMovement} className="flex flex-col gap-5">
                <div className="flex gap-3 w-full"><input type="number" step="any" required className="flex-1 min-w-0 bg-neutral-900 border border-neutral-800 rounded-[20px] p-5 text-3xl font-black text-white focus:border-blue-500/50 outline-none shadow-inner tracking-tighter" placeholder="0.00" value={tndForm.amount} onChange={e => setTndForm(p=>({...p, amount: e.target.value}))} /><div className="bg-neutral-950 border border-neutral-800 rounded-[20px] px-6 flex items-center text-blue-300 font-black text-lg shadow-inner">TND</div></div>
                <input type="text" required className="bg-neutral-950 border border-neutral-800 rounded-[20px] p-5 text-sm text-white font-black uppercase outline-none focus:border-blue-500/50 shadow-inner" placeholder="NOTE OBLIGATOIRE" value={tndForm.note} onChange={e => setTndForm(p=>({...p, note: e.target.value}))} />
                <div className="flex flex-col gap-2"><label className="text-[9px] font-black text-neutral-500 uppercase tracking-widest px-1 flex items-center gap-2"><CalendarClock className="h-3 w-3" /> Date prévue (optionnel — laisser vide = immédiat)</label><input type="date" min={localDayKey()} className="bg-neutral-950 border border-neutral-800 rounded-[20px] p-4 text-sm text-white font-black uppercase outline-none focus:border-amber-500/50 shadow-inner" value={tndForm.scheduledFor || ''} onChange={e => setTndForm(p=>({ ...p, scheduledFor: e.target.value }))} />{tndForm.scheduledFor && <p className="text-[10px] font-black text-amber-400 px-2 flex items-center gap-1.5"><Bell className="h-3 w-3" /> Rappel automatique dès J-1. Le montant ne compte dans le solde qu'après confirmation.</p>}</div>
                <div className="flex gap-4 mt-2"><button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-5 bg-neutral-900 text-neutral-400 font-black rounded-[24px] uppercase transition border border-neutral-800 tracking-widest text-xs">Annuler</button><button type="submit" disabled={isPending || !tndForm.note.trim()} className="flex-[2] py-5 bg-blue-600 text-white font-black rounded-[24px] uppercase shadow-2xl shadow-blue-500/30 active:scale-95 transition tracking-widest text-xs disabled:opacity-40">{tndForm.scheduledFor ? 'Planifier' : 'Confirmer'}</button></div>
              </form>
            )}
          </div>
        </div>
      )}

      {activeModal === 'add_bank_account' && (
        <div className="fixed inset-0 z-[160] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={() => setActiveModal(null)}>
          <div className="w-full max-w-sm bg-[#080808] border border-teal-500/40 rounded-[40px] p-8 flex flex-col gap-6 animate-scale-in shadow-2xl ring-1 ring-white/10" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-neutral-900 pb-4 text-teal-300"><div className="flex items-center gap-2"><Landmark className="h-5 w-5" /><h3 className="font-black uppercase tracking-[0.2em] text-sm">Nouveau compte bancaire</h3></div><button onClick={() => setActiveModal(null)} className="p-2.5 rounded-full bg-neutral-900 transition border border-neutral-800"><X className="h-5 w-5" /></button></div>
            <form onSubmit={handleCreateBankAccount} className="flex flex-col gap-5">
              <input type="text" required autoFocus placeholder="NOM DU COMPTE (ex: BIAT, ATTIJARI…)" value={newAccountForm.name} onChange={e => setNewAccountForm(p => ({ ...p, name: e.target.value }))} className="bg-neutral-950 border border-neutral-800 rounded-[20px] p-5 text-sm text-white font-black uppercase outline-none focus:border-teal-500/50 shadow-inner" />
              <div className="flex flex-col gap-1.5"><label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1">Devise du compte</label><select value={newAccountForm.currencyCode} onChange={e => setNewAccountForm(p => ({ ...p, currencyCode: e.target.value }))} className="bg-neutral-950 border border-neutral-800 rounded-[20px] p-4 text-sm font-black text-white outline-none focus:border-teal-500/40 [color-scheme:dark]">{['TND','USD','EURO','RMB'].map(cc => <option key={cc} value={cc}>{cc}</option>)}</select></div>
              <div className="flex gap-4 mt-1"><button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-5 bg-neutral-900 text-neutral-400 font-black rounded-[24px] uppercase transition active:scale-95 border border-neutral-800 tracking-widest text-xs">Annuler</button><button type="submit" disabled={isPending || !newAccountForm.name.trim()} className="flex-[2] py-5 bg-teal-500 text-black font-black rounded-[24px] uppercase shadow-2xl shadow-teal-500/30 active:scale-95 transition tracking-widest text-xs disabled:opacity-40">Créer</button></div>
            </form>
          </div>
        </div>
      )}
      {activeModal === 'rename_bank_account' && (
        <div className="fixed inset-0 z-[160] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={() => setActiveModal(null)}>
          <div className="w-full max-w-sm bg-[#080808] border border-teal-500/40 rounded-[40px] p-8 flex flex-col gap-6 animate-scale-in shadow-2xl ring-1 ring-white/10" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-neutral-900 pb-4 text-teal-300"><div className="flex items-center gap-2"><Edit className="h-5 w-5" /><h3 className="font-black uppercase tracking-[0.2em] text-sm">Renommer le compte</h3></div><button onClick={() => setActiveModal(null)} className="p-2.5 rounded-full bg-neutral-900 transition border border-neutral-800"><X className="h-5 w-5" /></button></div>
            <form onSubmit={handleRenameBankAccount} className="flex flex-col gap-5">
              <input type="text" required autoFocus value={renameAccountName} onChange={e => setRenameAccountName(e.target.value)} className="bg-neutral-950 border border-neutral-800 rounded-[20px] p-5 text-sm text-white font-black uppercase outline-none focus:border-teal-500/50 shadow-inner" />
              <div className="flex gap-4 mt-1"><button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-5 bg-neutral-900 text-neutral-400 font-black rounded-[24px] uppercase transition active:scale-95 border border-neutral-800 tracking-widest text-xs">Annuler</button><button type="submit" disabled={isPending || !renameAccountName.trim()} className="flex-[2] py-5 bg-teal-500 text-black font-black rounded-[24px] uppercase shadow-2xl shadow-teal-500/30 active:scale-95 transition tracking-widest text-xs disabled:opacity-40">Enregistrer</button></div>
            </form>
          </div>
        </div>
      )}
      {activeModal === 'add_credit' && currentUser.role === 'admin' && (
        <div className="fixed inset-0 z-[160] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={() => { if (!isPending) setActiveModal(null); }}>
          <div className="w-full max-w-sm max-h-[92vh] overflow-y-auto bg-[#080808] border border-rose-500/40 rounded-[48px] p-5 sm:p-10 flex flex-col gap-7 animate-scale-in shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-neutral-900 pb-5 text-rose-400 px-1">
              <h3 className="font-black uppercase tracking-[0.2em] text-sm">{creditForm.id ? 'Modifier le crédit' : 'Nouveau crédit'}</h3>
              <button onClick={() => setActiveModal(null)} disabled={isPending} className="p-2.5 rounded-full bg-neutral-900 transition border border-neutral-800"><X className="h-5 w-5" /></button>
            </div>
            {/* Bandeau de contexte — même rôle que le bandeau « Compte concerné » de Banque :
                rappeler sur quoi on agit et le total en cours pendant la saisie. */}
            <div className="flex items-center gap-3 p-4 rounded-[24px] bg-rose-500/15 border-2 border-rose-500/40">
              <span className="h-3.5 w-3.5 rounded-full bg-rose-400 shrink-0" />
              <div className="min-w-0"><p className="text-[8px] font-black text-neutral-400 uppercase tracking-[0.25em]">Registre concerné</p><p className="text-xl font-black uppercase tracking-tight truncate text-rose-300">Crédit</p></div>
              <p className="ml-auto text-right text-sm font-black text-white tracking-tighter shrink-0">{formatRawCurrency(credits.filter((c: any) => !c.isPaid).reduce((s: number, c: any) => s + (c.amount || 0), 0), 'TND')}</p>
            </div>
            <form onSubmit={handleSaveCredit} className="flex flex-col gap-5">
              <div className="flex gap-3 w-full">
                <input type="number" step="any" required autoFocus className="flex-1 min-w-0 bg-neutral-900 border border-neutral-800 rounded-[20px] p-5 text-3xl font-black text-white focus:border-rose-500/50 outline-none shadow-inner tracking-tighter" placeholder="0.00" value={creditForm.amount} onChange={e => setCreditForm(p => ({ ...p, amount: e.target.value }))} />
                <div className="bg-neutral-950 border border-neutral-800 rounded-[20px] px-6 flex items-center text-rose-300 font-black text-lg shadow-inner">TND</div>
              </div>
              <input type="text" required maxLength={120} className="bg-neutral-950 border border-neutral-800 rounded-[20px] p-5 text-sm text-white font-black uppercase outline-none focus:border-rose-500/50 shadow-inner" placeholder="BÉNÉFICIAIRE OBLIGATOIRE" value={creditForm.beneficiary} onChange={e => setCreditForm(p => ({ ...p, beneficiary: e.target.value }))} />
              <input type="text" required maxLength={1000} className="bg-neutral-950 border border-neutral-800 rounded-[20px] p-5 text-sm text-white font-black uppercase outline-none focus:border-rose-500/50 shadow-inner" placeholder="DESCRIPTION OBLIGATOIRE" value={creditForm.note} onChange={e => setCreditForm(p => ({ ...p, note: e.target.value }))} />
              <p className="text-[10px] font-black text-rose-400/90 px-2 flex items-center gap-1.5"><Receipt className="h-3 w-3 shrink-0" /> Aucune date requise. N&apos;affecte aucun solde ni total.</p>
              {creditError && <p className="text-rose-400 text-[10px] font-black uppercase text-center tracking-wider">{creditError}</p>}
              <div className="flex gap-4 mt-2">
                <button type="button" onClick={() => setActiveModal(null)} disabled={isPending} className="flex-1 py-5 bg-neutral-900 text-neutral-400 font-black rounded-[24px] uppercase transition border border-neutral-800 tracking-widest text-xs">Annuler</button>
                <button type="submit" disabled={isPending || !creditForm.amount || !creditForm.beneficiary.trim() || !creditForm.note.trim()} className="flex-[2] py-5 bg-rose-600 text-white font-black rounded-[24px] uppercase shadow-2xl shadow-rose-900/30 active:scale-95 transition tracking-widest text-xs disabled:opacity-40">{isPending ? 'Enregistrement…' : creditForm.id ? 'Enregistrer' : 'Confirmer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {activeModal === 'add_bank' && (() => { const bAcc = bankAccounts.find((a:any)=>a.id===selectedBankId); const bp = bAcc ? bankPalette(bAcc.id) : bankPalette('x'); return (
        <div className="fixed inset-0 z-[160] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={() => setActiveModal(null)}>
          <div className={`w-full ${bankForm.type === 'OUT' ? 'max-w-2xl' : 'max-w-sm'} max-h-[92vh] overflow-y-auto bg-[#080808] border-2 ${bp.border} rounded-[48px] p-5 sm:p-10 flex flex-col gap-6 animate-scale-in shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className={`flex justify-between items-center border-b border-neutral-900 pb-5 ${bp.text} px-1`}><h3 className="font-black uppercase tracking-[0.2em] text-sm flex items-center gap-2">{bankForm.type === 'IN' ? <ArrowUpRight className="h-4 w-4 rotate-180" /> : <ArrowUpRight className="h-4 w-4" />} {bankForm.type === 'IN' ? 'Entrée' : 'Sortie'}</h3><button onClick={() => setActiveModal(null)} className="p-2.5 rounded-full bg-neutral-900 transition border border-neutral-800"><X className="h-5 w-5" /></button></div>
            {/* Prominent account banner — always visible during the transaction */}
            <div className={`flex items-center gap-3 p-4 rounded-[24px] ${bp.bgSoft} border-2 ${bp.border}`}><span className={`h-3.5 w-3.5 rounded-full ${bp.dot} shrink-0`} /><div className="min-w-0"><p className="text-[8px] font-black text-neutral-400 uppercase tracking-[0.25em]">Compte concerné</p><p className={`text-xl font-black uppercase tracking-tight truncate ${bp.text} flex items-center gap-2`}>{isBiatAccount(bAcc?.name) && <img src={BIAT_LOGO_SRC} alt="BIAT" className="h-[1em] w-auto rounded-sm shrink-0 bg-white/95 p-px" />}<span className="truncate">{bAcc?.name || 'Compte'}</span></p></div><p className="ml-auto text-right text-sm font-black text-white tracking-tighter shrink-0">{formatRawCurrency(bAcc?.balance || 0, bAcc?.currencyCode || 'TND')}</p></div>
            {bankForm.type === 'OUT' ? (
              <form onSubmit={handleAddBankBatchDisbursement} className="flex flex-col gap-5">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-black text-rose-300 uppercase tracking-widest">Sorties multiples</p><p className="text-[10px] text-neutral-500 font-bold mt-1">Chaque montant a sa propre note.</p></div><div className="shrink-0 px-4 py-2 bg-rose-500/10 border border-rose-500/25 rounded-2xl text-right"><p className="text-[8px] font-black uppercase tracking-[0.2em] text-rose-300/70">Total</p><p className="text-lg font-black text-rose-300 leading-none mt-0.5 whitespace-nowrap">{new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(bankBatchItems.reduce((s, item) => s + (Number(item.amount) || 0), 0))}</p></div></div>
                <div className="flex flex-col gap-3 max-h-[44vh] sm:max-h-[38vh] overflow-y-auto pr-1">
                  {bankBatchItems.map((item, index) => (
                    <div key={index} className="shrink-0 grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_170px_1fr_auto] gap-2 items-center p-3 bg-neutral-950 border border-neutral-800 rounded-2xl">
                      {/* Telephone : ligne 1 = numero + montant + corbeille, ligne 2 = la note
                          sur toute la largeur. Ordinateur : tout tient sur une seule ligne.
                          Les positions sont donnees explicitement pour les deux tailles. */}
                      <span className="col-start-1 row-start-1 h-9 w-9 sm:h-8 sm:w-8 rounded-xl bg-rose-500/10 text-rose-300 flex items-center justify-center text-[11px] sm:text-[10px] font-black">{index + 1}</span>
                      <div className="col-start-2 row-start-1 relative min-w-0">
                        <input type="number" inputMode="decimal" step="any" required min="0.001" placeholder="Montant" value={item.amount} onChange={e => setBankBatchItems(items => items.map((x, i) => i === index ? { ...x, amount: e.target.value } : x))} className="w-full bg-black border border-neutral-800 rounded-xl pl-3 pr-12 py-3 text-lg sm:text-sm text-white font-black tracking-tight outline-none focus:border-rose-500/50" />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-widest text-neutral-500">{CURRENCY_SYMBOLS[bAcc?.currencyCode || 'TND'] || bAcc?.currencyCode}</span>
                      </div>
                      <button type="button" disabled={bankBatchItems.length === 1} onClick={() => setBankBatchItems(items => items.filter((_, i) => i !== index))} className="col-start-3 row-start-1 sm:col-start-4 p-2.5 text-rose-500/50 hover:text-rose-400 disabled:opacity-20 rounded-xl"><Trash2 className="h-4 w-4" /></button>
                      <input type="text" required placeholder="NOTE OBLIGATOIRE" value={item.note} onChange={e => setBankBatchItems(items => items.map((x, i) => i === index ? { ...x, note: e.target.value } : x))} className="col-start-1 col-end-4 row-start-2 sm:col-start-3 sm:col-end-4 sm:row-start-1 min-w-0 bg-black border border-neutral-800 rounded-xl px-3 py-3 text-xs text-white font-bold uppercase outline-none focus:border-rose-500/50" />
                    </div>
                  ))}
                </div>
                <button type="button" disabled={bankBatchItems.length >= 30} onClick={() => setBankBatchItems(items => [...items, { amount: '', note: '' }])} className="py-3.5 border border-dashed border-rose-500/40 text-rose-300 hover:bg-rose-500/10 disabled:opacity-30 rounded-2xl font-black text-[10px] uppercase tracking-widest transition flex items-center justify-center gap-2"><Plus className="h-4 w-4" /> Ajouter un montant</button>
                <div className="flex flex-col gap-2"><label className="text-[9px] font-black text-neutral-500 uppercase tracking-widest px-1 flex items-center gap-2"><CalendarClock className="h-3 w-3" /> Date prévue commune (optionnel)</label><input type="date" min={localDayKey()} className="bg-neutral-950 border border-neutral-800 rounded-[20px] p-4 text-sm text-white font-black uppercase outline-none focus:border-teal-500/50 shadow-inner" value={bankForm.scheduledFor || ''} onChange={e => setBankForm(p=>({ ...p, scheduledFor: e.target.value }))} /></div>
                <div className="flex gap-4 mt-1"><button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-5 bg-neutral-900 text-neutral-400 font-black rounded-[24px] uppercase transition border border-neutral-800 tracking-widest text-xs">Annuler</button><button type="submit" disabled={isPending || bankBatchItems.some(item => !item.amount || !item.note.trim())} className="flex-[2] py-5 bg-rose-600 text-white font-black rounded-[24px] uppercase shadow-2xl shadow-rose-900/30 active:scale-95 transition tracking-widest text-xs disabled:opacity-40">{bankForm.scheduledFor ? `Planifier ${bankBatchItems.length} sortie${bankBatchItems.length > 1 ? 's' : ''}` : `Enregistrer ${bankBatchItems.length} sortie${bankBatchItems.length > 1 ? 's' : ''}`}</button></div>
              </form>
            ) : (
              <form onSubmit={handleAddBankMovement} className="flex flex-col gap-5">
                <div className="flex gap-3 w-full"><input type="number" step="any" required autoFocus className="flex-1 min-w-0 bg-neutral-900 border border-neutral-800 rounded-[20px] p-5 text-3xl font-black text-white focus:border-teal-500/50 outline-none shadow-inner tracking-tighter" placeholder="0.00" value={bankForm.amount} onChange={e => setBankForm(p=>({...p, amount: e.target.value}))} /><div className="bg-neutral-950 border border-neutral-800 rounded-[20px] px-6 flex items-center text-teal-300 font-black text-lg shadow-inner">{bankAccounts.find((a:any)=>a.id===selectedBankId)?.currencyCode || 'TND'}</div></div>
                <input type="text" required className="bg-neutral-950 border border-neutral-800 rounded-[20px] p-5 text-sm text-white font-black uppercase outline-none focus:border-teal-500/50 shadow-inner" placeholder="NOTE OBLIGATOIRE" value={bankForm.note} onChange={e => setBankForm(p=>({...p, note: e.target.value}))} />
                <div className="flex flex-col gap-2"><label className="text-[9px] font-black text-neutral-500 uppercase tracking-widest px-1 flex items-center gap-2"><CalendarClock className="h-3 w-3" /> Date prévue (optionnel — vide = immédiat)</label><input type="date" min={localDayKey()} className="bg-neutral-950 border border-neutral-800 rounded-[20px] p-4 text-sm text-white font-black uppercase outline-none focus:border-teal-500/50 shadow-inner" value={bankForm.scheduledFor || ''} onChange={e => setBankForm(p=>({ ...p, scheduledFor: e.target.value }))} /></div>
                <div className="flex gap-4 mt-2"><button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-5 bg-neutral-900 text-neutral-400 font-black rounded-[24px] uppercase transition border border-neutral-800 tracking-widest text-xs">Annuler</button><button type="submit" disabled={isPending || !bankForm.note.trim()} className="flex-[2] py-5 bg-teal-600 text-white font-black rounded-[24px] uppercase shadow-2xl shadow-teal-500/30 active:scale-95 transition tracking-widest text-xs disabled:opacity-40">{bankForm.scheduledFor ? 'Planifier' : 'Confirmer'}</button></div>
              </form>
            )}
          </div>
        </div>
      ); })()}
      {bankNoteEdit && (
        <div className="fixed inset-0 z-[180] bg-black/90 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200" onClick={() => { if (!isPending) setBankNoteEdit(null); }}>
          <div className="w-full max-w-md bg-[#080808] border border-neutral-800 rounded-t-[36px] sm:rounded-[36px] p-6 sm:p-7 flex flex-col gap-5 animate-slide-up shadow-2xl ring-1 ring-white/10" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4"><div><p className="text-[9px] font-black text-teal-300 uppercase tracking-[0.2em]">Banque</p><h3 className="text-lg font-black text-white tracking-tight mt-1">Modifier la note</h3></div><button onClick={() => setBankNoteEdit(null)} disabled={isPending} className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition"><X className="h-4 w-4" /></button></div>
            <p className="text-[10px] text-neutral-500 font-bold leading-relaxed">Seule la note peut être corrigée. Le montant, le type et la date ne changent pas.</p>
            <form onSubmit={handleSaveBankNote} className="flex flex-col gap-3"><textarea autoFocus required maxLength={1000} value={bankNoteEdit.note} onChange={e => setBankNoteEdit(current => current ? { ...current, note: e.target.value } : current)} className="min-h-28 w-full resize-none bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-sm text-white font-bold outline-none focus:border-teal-500/50" placeholder="Note du mouvement" />{bankNoteEditError && <p className="text-rose-400 text-[10px] font-black uppercase text-center tracking-wider">{bankNoteEditError}</p>}<div className="flex gap-3"><button type="button" onClick={() => setBankNoteEdit(null)} disabled={isPending} className="flex-1 py-3.5 bg-neutral-900 border border-neutral-800 text-neutral-400 font-black rounded-2xl uppercase text-[10px] tracking-widest active:scale-95 transition">Annuler</button><button type="submit" disabled={isPending || !bankNoteEdit.note.trim()} className="flex-1 py-3.5 bg-teal-500 text-black font-black rounded-2xl uppercase text-[10px] tracking-widest active:scale-95 transition disabled:opacity-50">{isPending ? 'Enregistrement…' : 'Enregistrer'}</button></div></form>
          </div>
        </div>
      )}
      {activeModal === 'add_archive' && currentUser.role === 'admin' && (
        <div className="fixed inset-0 z-[160] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={() => setActiveModal(null)}>
          <div className={`w-full ${archiveForm.type === 'OUT' ? 'max-w-2xl' : 'max-w-sm'} max-h-[92vh] overflow-y-auto bg-[#080808] border border-amber-500/40 rounded-[48px] p-5 sm:p-10 flex flex-col gap-7 animate-scale-in shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-neutral-900 pb-5 text-amber-400 px-1"><h3 className="font-black uppercase tracking-[0.2em] text-sm">{archiveForm.type === 'IN' ? 'Encaisser Archive' : 'Décaissement Archive'}</h3><button onClick={() => setActiveModal(null)} className="p-2.5 rounded-full bg-neutral-900 transition border border-neutral-800"><X className="h-5 w-5" /></button></div>
            {archiveForm.type === 'OUT' ? (
              <form onSubmit={handleAddArchiveBatchDisbursement} className="flex flex-col gap-5">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-black text-rose-300 uppercase tracking-widest">Décaissements multiples</p><p className="text-[10px] text-neutral-500 font-bold mt-1">Chaque montant doit avoir sa propre note.</p></div><div className="shrink-0 px-4 py-2 bg-rose-500/10 border border-rose-500/25 rounded-2xl text-right"><p className="text-[8px] font-black uppercase tracking-[0.2em] text-rose-300/70">Total</p><p className="text-lg font-black text-rose-300 leading-none mt-0.5 whitespace-nowrap">{new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(archiveBatchItems.reduce((s, item) => s + (Number(item.amount) || 0), 0))} DT</p></div></div>
                <div className="flex flex-col gap-3 max-h-[44vh] sm:max-h-[38vh] overflow-y-auto pr-1">
                  {archiveBatchItems.map((item, index) => (
                    <div key={index} className="shrink-0 grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_170px_1fr_auto] gap-2 items-center p-3 bg-neutral-950 border border-neutral-800 rounded-2xl">
                      {/* Telephone : ligne 1 = numero + montant + corbeille, ligne 2 = la note
                          sur toute la largeur. Ordinateur : tout tient sur une seule ligne.
                          Les positions sont donnees explicitement pour les deux tailles. */}
                      <span className="col-start-1 row-start-1 h-9 w-9 sm:h-8 sm:w-8 rounded-xl bg-rose-500/10 text-rose-300 flex items-center justify-center text-[11px] sm:text-[10px] font-black">{index + 1}</span>
                      <div className="col-start-2 row-start-1 relative min-w-0">
                        <input type="number" inputMode="decimal" step="any" required min="0.001" placeholder="Montant" value={item.amount} onChange={e => setArchiveBatchItems(items => items.map((x, i) => i === index ? { ...x, amount: e.target.value } : x))} className="w-full bg-black border border-neutral-800 rounded-xl pl-3 pr-12 py-3 text-lg sm:text-sm text-white font-black tracking-tight outline-none focus:border-rose-500/50" />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-widest text-neutral-500">DT</span>
                      </div>
                      <button type="button" disabled={archiveBatchItems.length === 1} onClick={() => setArchiveBatchItems(items => items.filter((_, i) => i !== index))} className="col-start-3 row-start-1 sm:col-start-4 p-2.5 text-rose-500/50 hover:text-rose-400 disabled:opacity-20 disabled:cursor-not-allowed rounded-xl"><Trash2 className="h-4 w-4" /></button>
                      <input type="text" required placeholder="NOTE OBLIGATOIRE" value={item.note} onChange={e => setArchiveBatchItems(items => items.map((x, i) => i === index ? { ...x, note: e.target.value } : x))} className="col-start-1 col-end-4 row-start-2 sm:col-start-3 sm:col-end-4 sm:row-start-1 min-w-0 bg-black border border-neutral-800 rounded-xl px-3 py-3 text-xs text-white font-bold uppercase outline-none focus:border-rose-500/50" />
                    </div>
                  ))}
                </div>
                <button type="button" disabled={archiveBatchItems.length >= 30} onClick={() => setArchiveBatchItems(items => [...items, { amount: '', note: '' }])} className="py-3.5 border border-dashed border-rose-500/40 text-rose-300 hover:bg-rose-500/10 disabled:opacity-30 rounded-2xl font-black text-[10px] uppercase tracking-widest transition flex items-center justify-center gap-2"><Plus className="h-4 w-4" /> Ajouter un montant</button>
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black text-neutral-500 uppercase tracking-widest px-1 flex items-center gap-2"><CalendarClock className="h-3 w-3" /> Date prévue commune (optionnel)</label>
                  <input type="date" min={localDayKey()} className="bg-neutral-950 border border-neutral-800 rounded-[20px] p-4 text-sm text-white font-black uppercase outline-none focus:border-amber-500/50 shadow-inner" value={archiveForm.scheduledFor || ''} onChange={e => setArchiveForm(p=>({ ...p, scheduledFor: e.target.value }))} />
                  {archiveForm.scheduledFor && <p className="text-[10px] font-black text-amber-400 px-2 flex items-center gap-1.5"><Bell className="h-3 w-3" /> Tous les décaissements seront planifiés à cette date et rappelés dès J-1.</p>}
                </div>
                <div className="flex gap-4 mt-1">
                  <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-5 bg-neutral-900 text-neutral-400 font-black rounded-[24px] uppercase transition border border-neutral-800 tracking-widest text-xs">Annuler</button>
                  <button type="submit" disabled={isPending || archiveBatchItems.some(item => !item.amount || !item.note.trim())} className="flex-[2] py-5 bg-rose-600 text-white font-black rounded-[24px] uppercase shadow-2xl shadow-rose-900/30 active:scale-95 transition tracking-widest text-xs disabled:opacity-40">{archiveForm.scheduledFor ? `Planifier ${archiveBatchItems.length} sortie${archiveBatchItems.length > 1 ? 's' : ''}` : `Enregistrer ${archiveBatchItems.length} sortie${archiveBatchItems.length > 1 ? 's' : ''}`}</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAddArchiveMovement} className="flex flex-col gap-5">
                <div className="flex gap-3 w-full"><input type="number" step="any" required className="flex-1 min-w-0 bg-neutral-900 border border-neutral-800 rounded-[20px] p-5 text-3xl font-black text-white focus:border-amber-500/50 outline-none shadow-inner tracking-tighter" placeholder="0.00" value={archiveForm.amount} onChange={e => setArchiveForm(p=>({...p, amount: e.target.value}))} /><div className="bg-neutral-950 border border-neutral-800 rounded-[20px] px-6 flex items-center text-amber-300 font-black text-lg shadow-inner">TND</div></div>
                <input type="text" required className="bg-neutral-950 border border-neutral-800 rounded-[20px] p-5 text-sm text-white font-black uppercase outline-none focus:border-amber-500/50 shadow-inner" placeholder="NOTE OBLIGATOIRE" value={archiveForm.note} onChange={e => setArchiveForm(p=>({...p, note: e.target.value}))} />
                <div className="flex flex-col gap-2"><label className="text-[9px] font-black text-neutral-500 uppercase tracking-widest px-1 flex items-center gap-2"><CalendarClock className="h-3 w-3" /> Date prévue (optionnel — laisser vide = immédiat)</label><input type="date" min={localDayKey()} className="bg-neutral-950 border border-neutral-800 rounded-[20px] p-4 text-sm text-white font-black uppercase outline-none focus:border-amber-500/50 shadow-inner" value={archiveForm.scheduledFor || ''} onChange={e => setArchiveForm(p=>({ ...p, scheduledFor: e.target.value }))} />{archiveForm.scheduledFor && <p className="text-[10px] font-black text-amber-400 px-2 flex items-center gap-1.5"><Bell className="h-3 w-3" /> Rappel automatique dès J-1. Le montant ne compte dans le solde qu'après confirmation.</p>}</div>
                <div className="flex gap-4 mt-2"><button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-5 bg-neutral-900 text-neutral-400 font-black rounded-[24px] uppercase transition border border-neutral-800 tracking-widest text-xs">Annuler</button><button type="submit" disabled={isPending || !archiveForm.note.trim()} className="flex-[2] py-5 bg-amber-600 text-white font-black rounded-[24px] uppercase shadow-2xl shadow-amber-500/30 active:scale-95 transition tracking-widest text-xs disabled:opacity-40">{archiveForm.scheduledFor ? 'Planifier' : 'Confirmer'}</button></div>
              </form>
            )}
          </div>
        </div>
      )}

      {archiveNoteEdit && (
        <div className="fixed inset-0 z-[180] bg-black/90 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200" onClick={() => { if (!isPending) setArchiveNoteEdit(null); }}>
          <div className="w-full max-w-md bg-[#080808] border border-neutral-800 rounded-t-[36px] sm:rounded-[36px] p-6 sm:p-7 flex flex-col gap-5 animate-slide-up shadow-2xl ring-1 ring-white/10" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4"><div><p className="text-[9px] font-black text-amber-300 uppercase tracking-[0.2em]">Archive</p><h3 className="text-lg font-black text-white tracking-tight mt-1">Modifier la note</h3></div><button onClick={() => setArchiveNoteEdit(null)} disabled={isPending} className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition"><X className="h-4 w-4" /></button></div>
            <div className="grid grid-cols-2 gap-3"><div className="p-3 bg-neutral-900/70 border border-neutral-800 rounded-2xl"><p className="text-[8px] font-black text-neutral-500 uppercase tracking-widest">Montant verrouillé</p><p className={`text-lg font-black mt-1 ${archiveNoteEdit.type === 'IN' ? 'text-emerald-400' : 'text-rose-400'}`}>{archiveNoteEdit.type === 'IN' ? '+' : '-'}{formatRawCurrency(archiveNoteEdit.amount, 'TND')}</p></div><div className="p-3 bg-neutral-900/70 border border-neutral-800 rounded-2xl"><p className="text-[8px] font-black text-neutral-500 uppercase tracking-widest">Type verrouillé</p><p className="text-lg font-black mt-1 text-neutral-200">{archiveNoteEdit.type === 'IN' ? 'Entrée' : 'Sortie'}</p></div></div>
            <p className="text-[10px] text-neutral-500 font-bold leading-relaxed">Seule la note peut être corrigée. Le montant, le type, la date et l’état du mouvement ne peuvent pas être modifiés.</p>
            <form onSubmit={handleSaveArchiveNote} className="flex flex-col gap-3"><textarea autoFocus required maxLength={1000} value={archiveNoteEdit.note} onChange={e => setArchiveNoteEdit(current => current ? { ...current, note: e.target.value } : current)} className="min-h-28 w-full resize-none bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-sm text-white font-bold outline-none focus:border-amber-500/50" placeholder="Note du mouvement" />{archiveNoteEditError && <p className="text-rose-400 text-[10px] font-black uppercase text-center tracking-wider">{archiveNoteEditError}</p>}<div className="flex gap-3"><button type="button" onClick={() => setArchiveNoteEdit(null)} disabled={isPending} className="flex-1 py-3.5 bg-neutral-900 border border-neutral-800 text-neutral-400 font-black rounded-2xl uppercase text-[10px] tracking-widest active:scale-95 transition">Annuler</button><button type="submit" disabled={isPending || !archiveNoteEdit.note.trim()} className="flex-1 py-3.5 bg-amber-500 text-black font-black rounded-2xl uppercase text-[10px] tracking-widest active:scale-95 transition disabled:opacity-50">{isPending ? 'Enregistrement…' : 'Enregistrer'}</button></div></form>
          </div>
        </div>
      )}

      {activeModal === 'add_contact' && currentUser.role === 'admin' && (
        <div className="fixed inset-0 z-[160] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setActiveModal(null)}>
          <div className="w-full max-w-sm bg-[#080808] border border-neutral-800 rounded-[48px] p-10 flex flex-col gap-7 animate-scale-in shadow-2xl ring-1 ring-white/10" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-neutral-900 pb-5 text-emerald-400 px-1"><h3 className="font-black uppercase tracking-[0.2em] text-sm">Nouveau Partenaire</h3><button onClick={() => setActiveModal(null)} className="p-2.5 rounded-full bg-neutral-900 border border-neutral-800 transition hover:text-white"><X className="h-5 w-5" /></button></div>
            <form onSubmit={handleAddContact} className="flex flex-col gap-5">
              <div className="flex gap-4 w-full"><input type="text" className="w-24 bg-neutral-900 border border-neutral-800 rounded-[20px] p-5 text-center text-3xl outline-none focus:border-emerald-500/40 shadow-inner" value={contactForm.emoji} onChange={(e) => setContactForm(p => ({...p, emoji: e.target.value}))} /><input type="text" required className="flex-1 min-w-0 bg-neutral-900 border border-neutral-800 rounded-[20px] p-5 text-white font-black uppercase outline-none focus:border-emerald-500/40 shadow-inner" placeholder="NOM" value={contactForm.name} onChange={(e) => setContactForm(p => ({...p, name: e.target.value}))} /></div>
              <input type="text" className="bg-neutral-900 border border-neutral-800 rounded-[20px] p-5 text-white font-black uppercase text-sm outline-none focus:border-neutral-600 shadow-inner" placeholder="PAYS / REGION" value={contactForm.country} onChange={(e) => setContactForm(p => ({...p, country: e.target.value}))} />
              <div className="flex gap-4 mt-4"><button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-5 bg-neutral-900 text-neutral-400 font-black rounded-[24px] uppercase active:scale-95 transition border border-neutral-800 tracking-widest text-xs">Annuler</button><button type="submit" disabled={isPending} className="flex-[2] py-5 bg-white text-black font-black rounded-[24px] uppercase active:scale-95 transition shadow-2xl tracking-widest text-xs">Créer</button></div>
            </form>
          </div>
        </div>
      )}

      {activeModal === 'edit_contact' && (
        <div className="fixed inset-0 z-[170] bg-black/98 backdrop-blur-2xl flex items-center justify-center p-4 shadow-2xl" onClick={() => setActiveModal(null)}>
          <div className="w-full max-w-sm bg-[#080808] border border-blue-500/40 rounded-[52px] p-10 flex flex-col gap-8 animate-scale-in shadow-2xl shadow-blue-500/10 ring-1 ring-blue-500/20" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-neutral-900 pb-6 text-blue-400"><h3 className="font-black uppercase tracking-[0.25em] text-sm">Modification</h3><button onClick={() => setActiveModal(null)} className="p-3 bg-neutral-900 border border-neutral-800 rounded-full text-neutral-400 hover:text-white transition shadow-xl active:scale-90"><X className="h-6 w-6" /></button></div>
            <form onSubmit={handleUpdateContact} className="flex flex-col gap-6">
              <div className="flex gap-4 w-full"><input type="text" className="w-24 bg-neutral-900 border border-neutral-800 rounded-[24px] p-6 text-center text-4xl outline-none focus:border-blue-500/50 shadow-inner" value={contactForm.emoji} onChange={(e) => setContactForm(p => ({...p, emoji: e.target.value}))} /><input type="text" required className="flex-1 min-w-0 bg-neutral-900 border border-neutral-800 rounded-[24px] p-6 text-white font-black uppercase text-xl outline-none focus:border-blue-500/50 shadow-inner" value={contactForm.name} onChange={(e) => setContactForm(p => ({...p, name: e.target.value}))} /></div>
              <input type="text" className="bg-neutral-900 border border-neutral-800 rounded-[24px] p-6 text-white font-black uppercase text-sm outline-none focus:border-neutral-600 shadow-inner" value={contactForm.country} onChange={(e) => setContactForm(p => ({...p, country: e.target.value}))} />
              <label className="flex items-center gap-4 text-[10px] font-black text-neutral-500 cursor-pointer select-none py-4 px-2 hover:text-neutral-200 transition group uppercase tracking-widest"><div className="w-6 h-6 rounded-lg border-2 border-neutral-800 flex items-center justify-center group-hover:border-blue-500 transition shrink-0"><input type="checkbox" checked={contactForm.isArchived} onChange={(e) => setContactForm(p => ({...p, isArchived: e.target.checked}))} className="accent-blue-500 h-4 w-4" /></div> Archiver ce partenaire</label>
              <div className="flex gap-4 mt-2"><button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-5 bg-neutral-900 text-neutral-500 font-black rounded-[28px] uppercase transition active:scale-95 border border-neutral-800 tracking-widest text-[10px]">Annuler</button><button type="submit" disabled={isPending} className="flex-[2] py-5 bg-blue-600 text-white font-black rounded-[28px] uppercase shadow-2xl shadow-blue-500/40 active:scale-95 transition tracking-widest text-[10px]">Sauvegarder</button></div>
            </form>
          </div>
        </div>
      )}

      {selectedContact && (() => {
        const partnerTx = transactions.filter((t:any) => t.contactId === selectedContact.id);
        const txCount = partnerTx.length;
        const drawerNoteAdj = noteAdjustByContact[selectedContact.id];
        const drawerNoteUsd = drawerNoteAdj?.usd || 0;
        const hasDrawerNote = !!drawerNoteAdj?.hasAny && Math.abs(drawerNoteUsd) > 0.01;
        const drawerAdjustedUsd = selectedContact.netPositionUsd + drawerNoteUsd;
        const positive = (hasDrawerNote ? drawerAdjustedUsd : selectedContact.netPositionUsd) >= 0;
        const tnd = selectedContact.heldBalanceTnd || 0;
        const breakdown = [
          { key: 'HELD', label: 'Encaissé', val: selectedContact.heldBalanceUsd, tnd, style: 'emerald', icon: <ArrowUpRight className="h-4 w-4 rotate-180" />, note: 'Argent confié (+)', explain: 'ENCAISSÉ = total de l\'argent que tu lui as confié à garder. Cela augmente ton argent chez lui (+).' },
          { key: 'PAYABLE', label: 'Décaissé', val: selectedContact.payableBalanceUsd, tnd: 0, style: 'rose', icon: <ArrowUpRight className="h-4 w-4" />, note: 'Repris / dépensé (−)', explain: 'DÉCAISSÉ = total de l\'argent que tu as repris ou dépensé de ce qu\'il garde. Cela diminue ton argent chez lui (−).' },
          { key: 'RECEIVABLE', label: 'À recevoir', val: selectedContact.receivableBalanceUsd, tnd: 0, style: 'blue', icon: <CalendarClock className="h-4 w-4" />, note: 'Paiement prévu', explain: 'À RECEVOIR = paiement prévu à une date future. Sert uniquement de rappel — n\'affecte aucun solde.' },
        ];
        const activeExplain = drawerTypeFilter ? breakdown.find(b => b.key === drawerTypeFilter) : null;
        const startOpForPartner = (opType: string = 'HELD') => { setTransactionForm({ contactId: selectedContact.id, amount: '', currencyCode: 'USD', type: opType === 'RECEIVABLE' ? 'HELD' : opType, category: 'Virement', note: '', isPostponed: opType === 'RECEIVABLE', dueDate: '', reminderEmail: '', plannedType: opType === 'RECEIVABLE' ? 'HELD' : 'RECEIVABLE' }); setActiveModal('add_tx'); };
        const closeDrawer = () => { setSelectedContact(null); setDrawerTypeFilter(null); };
        return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end animate-in fade-in duration-300" onClick={closeDrawer}>
          <div className="w-full max-w-md bg-gradient-to-b from-[#0a0a0c] to-[#050505] border-l border-neutral-800 h-full overflow-y-auto animate-in slide-in-from-right duration-400 shadow-2xl shadow-emerald-500/5" onClick={e => e.stopPropagation()}>
            <div className={`app-safe-top-drawer relative overflow-hidden px-7 pb-8 border-b border-white/5 ${positive ? 'bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent' : 'bg-gradient-to-br from-rose-500/10 via-transparent to-transparent'}`}>
              <div className={`absolute -top-8 -right-6 opacity-[0.07] pointer-events-none ${positive ? 'text-emerald-400' : 'text-rose-400'}`}><Coins className="h-40 w-40" /></div>
              <div className="flex justify-between items-start relative">
                <div className="flex items-center gap-4 min-w-0"><span className="text-5xl p-2.5 bg-neutral-950/80 border border-neutral-800 rounded-3xl shadow-xl shrink-0">{selectedContact.emoji}</span><div className="min-w-0"><h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-none truncate">{selectedContact.name}</h3><p className="text-[10px] text-neutral-400 uppercase font-black tracking-[0.25em] mt-2 truncate">{selectedContact.country || 'GLOBAL'}</p></div></div>
                <button onClick={closeDrawer} className="p-2.5 bg-neutral-950/80 border border-neutral-800 rounded-full text-neutral-400 hover:text-white transition active:scale-90 shadow-lg shrink-0"><X className="h-5 w-5" /></button>
              </div>
              <div className="relative mt-7"><p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.25em] mb-1">Mon Argent{hasDrawerNote ? ' + notes' : ''} {positive ? '(chez lui)' : '(je lui dois)'}</p><p className={`font-black tracking-tighter leading-none break-words text-4xl ${positive ? 'text-emerald-400' : 'text-rose-400'}`}>{formatUSD(hasDrawerNote ? drawerAdjustedUsd : selectedContact.netPositionUsd)}</p>{hasDrawerNote && <p className="text-[10px] font-black text-neutral-500 tracking-tighter mt-1.5">réel {formatUSD(selectedContact.netPositionUsd)} · notes {drawerNoteUsd >= 0 ? '+' : ''}{formatUSD(drawerNoteUsd)}</p>}{tnd > 0.01 && <p className="text-amber-400 font-black text-sm tracking-tighter mt-1.5">+ {formatRawCurrency(tnd, 'TND')} <span className="text-neutral-500 text-[10px]">(local)</span></p>}</div>
            </div>
            <div className="px-7 pt-6 grid grid-cols-2 gap-3"><button onClick={() => startOpForPartner('HELD')} className="py-4 bg-emerald-500 text-black font-black uppercase text-[11px] rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 active:scale-[0.97] transition tracking-widest"><ArrowUpRight className="h-4 w-4 stroke-[3] rotate-180" /> Encaisser</button><button onClick={() => startOpForPartner('PAYABLE')} className="py-4 bg-rose-500 text-white font-black uppercase text-[11px] rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-rose-500/20 active:scale-[0.97] transition tracking-widest"><ArrowUpRight className="h-4 w-4 stroke-[3]" /> Décaisser</button></div>
            <div className="px-7 pt-3 flex gap-3"><button onClick={() => startOpForPartner('RECEIVABLE')} className="flex-1 py-3 bg-neutral-900 border border-amber-500/20 text-amber-400 font-black uppercase text-[10px] rounded-2xl flex items-center justify-center gap-2 active:scale-[0.97] transition tracking-widest"><CalendarClock className="h-4 w-4" /> Planifier</button><button onClick={(e) => { handleOpenEditContact(e as any, selectedContact); }} className="px-5 py-3 bg-neutral-900 border border-neutral-800 text-blue-400 font-black uppercase text-[10px] rounded-2xl flex items-center justify-center gap-2 active:scale-[0.97] transition tracking-widest"><Edit className="h-4 w-4" /> Modifier</button></div>
            <div className="px-7 pt-6 grid grid-cols-3 gap-2.5">
              {breakdown.map(b => {
                const showUsd = b.key !== 'HELD' || b.val > 0.01 || b.tnd <= 0.01; const active = drawerTypeFilter === b.key;
                return (
                <button key={b.key} onClick={() => setDrawerTypeFilter(active ? null : b.key)} className={`text-left p-3.5 rounded-2xl border bg-${b.style}-500/5 flex flex-col gap-2 active:scale-[0.97] transition cursor-pointer ${active ? `border-${b.style}-500/60 ring-2 ring-${b.style}-500/40` : `border-${b.style}-500/20 hover:border-${b.style}-500/40`}`}><span className={`text-${b.style}-400 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider`}>{b.icon}{b.label}</span>{showUsd && <p className={`text-${b.style}-400 font-black text-base tracking-tighter break-words leading-none`}>{formatUSD(b.val)}</p>}{b.key === 'HELD' && b.tnd > 0.01 && <p className={`text-amber-400 font-black tracking-tighter break-words leading-none ${showUsd ? 'text-[11px]' : 'text-base'}`}>{formatRawCurrency(b.tnd, 'TND')}</p>}<span className={`text-[8px] font-black uppercase tracking-wider ${active ? `text-${b.style}-400` : 'text-neutral-500'}`}>{b.note}</span></button>
                );
              })}
            </div>
            {activeExplain && <div className={`mx-7 mt-4 p-4 rounded-2xl border bg-${activeExplain.style}-500/5 border-${activeExplain.style}-500/20 flex items-start gap-3 animate-in fade-in duration-200`}><span className={`text-${activeExplain.style}-400 shrink-0 mt-0.5`}>{activeExplain.icon}</span><p className="text-[11px] font-bold text-neutral-300 leading-relaxed">{activeExplain.explain}</p></div>}
            <div className="mx-7 mt-6 p-5 rounded-[28px] border border-sky-500/25 bg-gradient-to-br from-sky-500/8 to-transparent">
              <PartnerNotes notes={notesByContact[selectedContact.id]} formatRawCurrency={formatRawCurrency} onAdd={() => openAddNote(selectedContact.id, selectedContact.name)} onEdit={(n: any) => openEditNote(n, selectedContact.name)} onDelete={handleDeleteNote} />
            </div>
            <div className="px-7 pt-8 pb-10 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-neutral-900 pb-3"><h4 className="text-[11px] font-black text-neutral-300 uppercase tracking-[0.25em] flex items-center gap-2"><Clock className="h-4 w-4" /> Historique{drawerTypeFilter && <span className="text-neutral-500">· {breakdown.find(b=>b.key===drawerTypeFilter)?.label}</span>}</h4>{drawerTypeFilter ? <button onClick={() => setDrawerTypeFilter(null)} className="text-[10px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1">Tout voir <X className="h-3 w-3" /></button> : <span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider">{txCount} op.</span>}</div>
              {(() => {
                const shown = drawerTypeFilter ? partnerTx.filter((t:any) => t.type === drawerTypeFilter) : partnerTx;
                if (shown.length === 0) return <EmptyState icon={<ArrowLeftRight className="h-8 w-8" />} title="Aucune opération" subtitle={drawerTypeFilter ? "Aucune opération de ce type." : "Touchez « Opération » pour commencer."} />;
                return <div className="flex flex-col gap-3">{shown.slice(0,30).map((t:any) => {
                  const st = getTransactionTypeStyle(t.type); const dotColor = st.style === 'blue' ? 'bg-blue-500' : st.style === 'emerald' ? 'bg-emerald-500' : 'bg-rose-500'; const txtColor = st.style === 'blue' ? 'text-blue-400' : st.style === 'emerald' ? 'text-emerald-400' : 'text-rose-400';
                  return (
                    <div key={t.id} className="group relative p-4 pl-5 bg-neutral-900/30 border border-neutral-800 rounded-3xl flex justify-between items-center gap-3 hover:border-neutral-700 hover:bg-neutral-900/50 transition"><span className={`absolute left-0 top-4 bottom-4 w-1 rounded-full ${dotColor}`} /><div className="flex flex-col gap-1 min-w-0"><p className="text-sm font-black text-neutral-100 uppercase tracking-tight truncate">{t.category}</p><p className={`text-[10px] font-black uppercase tracking-widest ${txtColor}`}>{st.label}</p><p className="text-[10px] text-neutral-600 font-black uppercase mt-0.5">{new Date(t.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</p></div><div className="text-right flex flex-col gap-0.5 shrink-0"><p className="text-base font-black text-white tracking-tighter leading-none break-words">{formatRawCurrency(t.amount, t.currencyCode)}</p>{t.currencyCode !== 'USD' && <p className="text-[10px] text-neutral-500 font-black tracking-tight">≈ {formatUSD(t.amountInUsd)}</p>}</div><button onClick={() => handleDeleteTxLoc(t.id)} className="p-2 text-rose-500/30 hover:text-rose-500 active:scale-90 transition shrink-0"><Trash2 className="h-4 w-4" /></button></div>
                  );
                })}</div>;
              })()}
            </div>
          </div>
        </div>
        );
      })()}

      {showNotifications && (
        <div className="fixed inset-0 z-[210] bg-black/80 backdrop-blur-sm flex justify-end animate-in fade-in duration-300" onClick={() => setShowNotifications(false)}>
          <div className="w-full max-w-md bg-gradient-to-b from-[#0a0a0c] to-[#050505] border-l border-neutral-800 h-full overflow-y-auto animate-in slide-in-from-right duration-300 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="app-safe-top-drawer px-7 pb-5 border-b border-white/5 flex justify-between items-center sticky top-0 bg-[#0a0a0c]/95 backdrop-blur z-10"><div className="flex items-center gap-3"><Bell className="h-5 w-5 text-amber-400" /><h3 className="text-lg font-black text-white uppercase tracking-tight">Notifications</h3>{(dueReminders.length + (currentUser.role === 'admin' ? tndDueSoon.length + tndOverdue.length : 0)) > 0 && <span className="h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-black">{dueReminders.length + (currentUser.role === 'admin' ? tndDueSoon.length + tndOverdue.length : 0)}</span>}</div><button onClick={() => setShowNotifications(false)} className="p-2.5 bg-neutral-950 border border-neutral-800 rounded-full text-neutral-400 hover:text-white transition active:scale-90"><X className="h-5 w-5" /></button></div>
            <div className="px-7 py-6 flex flex-col gap-4">
              {/* TND scheduled movements — admin only */}
              {currentUser.role === 'admin' && (tndDueSoon.length > 0 || tndOverdue.length > 0) && (
                <div className="flex flex-col gap-3 mb-2">
                  <div className="flex items-center gap-2 px-1"><CoffreIcon className="h-4 w-4 text-blue-400" /><h4 className="text-[10px] font-black text-blue-300 uppercase tracking-[0.25em]">Coffre TND</h4></div>
                  {[...tndOverdue, ...tndDueSoon.filter(m => !tndOverdue.some(o => o.id === m.id))].map((m: any) => {
                    const isOverdue = m.scheduledFor && new Date(m.scheduledFor).getTime() < Date.now();
                    return (
                      <div key={m.id} className={`p-5 rounded-[28px] border flex flex-col gap-3 shadow-lg ${isOverdue ? 'border-rose-900 bg-rose-950/20' : 'border-amber-900/50 bg-amber-950/10'}`}>
                        <div className="flex justify-between items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <p className={`text-[10px] font-black uppercase tracking-widest ${isOverdue ? 'text-rose-400' : 'text-amber-400'}`}>{isOverdue ? '⚠ En retard' : '🔔 Prévu sous 24h'} · {m.type === 'IN' ? 'Encaissement' : 'Décaissement'}</p>
                            <p className="text-base font-black text-white uppercase tracking-tight mt-1.5 truncate">{m.note}</p>
                            <p className={`text-2xl font-black tracking-tighter mt-1 break-words ${m.type === 'IN' ? 'text-emerald-400' : 'text-rose-400'}`}>{m.type === 'IN' ? '+' : '-'}{formatRawCurrency(m.amount, 'TND')}</p>
                            <p className="text-[10px] text-neutral-400 font-black uppercase mt-2 tracking-wider">Prévu le {m.scheduledFor ? new Date(m.scheduledFor).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : ''}</p>
                            <p className="text-[10px] text-neutral-500 font-black mt-1">par {displayUser(m.performedBy)}</p>
                          </div>
                        </div>
                        <div className="flex gap-2.5">
                          <button onClick={() => { setShowNotifications(false); handleSettleTndMovement(m.id); }} className="flex-1 py-3.5 bg-emerald-500 text-black font-black uppercase text-[10px] rounded-2xl flex items-center justify-center gap-2 active:scale-[0.97] transition tracking-widest shadow-lg shadow-emerald-500/20"><CheckCircle className="h-4 w-4" /> Confirmer</button>
                          <button onClick={() => { setShowNotifications(false); setActiveSection('treasury'); }} className="flex-1 py-3.5 bg-neutral-800 border border-neutral-700 text-blue-400 font-black uppercase text-[10px] rounded-2xl flex items-center justify-center gap-2 active:scale-[0.97] transition tracking-widest"><CoffreIcon className="h-4 w-4" /> Voir</button>
                        </div>
                      </div>
                    );
                  })}
                  {dueReminders.length > 0 && <div className="mt-2 mb-1 border-t border-neutral-900" />}
                </div>
              )}
              {dueReminders.length === 0 && (currentUser.role !== 'admin' || (tndDueSoon.length === 0 && tndOverdue.length === 0)) && <EmptyState icon={<CheckCircle className="h-8 w-8" />} title="Tout est à jour" subtitle="Aucun paiement attendu aujourd'hui." />}
              {dueReminders.map((r:any) => {
                const overdue = new Date(r.dueDate) < new Date(new Date().toDateString());
                return (
                <div key={r.id} className={`p-5 rounded-[28px] border flex flex-col gap-4 shadow-lg ${overdue ? 'border-rose-900 bg-rose-950/20' : 'border-amber-900/50 bg-amber-950/10'}`}><div className="flex justify-between items-start gap-3"><div className="min-w-0"><p className={`text-[10px] font-black uppercase tracking-widest ${overdue ? 'text-rose-400' : 'text-amber-400'}`}>{overdue ? '⚠ En retard' : '🔔 Échéance aujourd\'hui'}</p><p className="text-base font-black text-white uppercase tracking-tight mt-1.5 truncate">{r.contact?.name}</p><p className="text-2xl font-black text-white tracking-tighter mt-1 break-words">{formatRawCurrency(r.amount, r.currencyCode)}</p>{r.currencyCode !== 'USD' && <p className="text-[10px] text-neutral-500 font-black">≈ {formatUSD(r.amountInUsd)}</p>}<p className="text-[10px] text-neutral-400 font-black uppercase mt-2 tracking-wider">Prévu le {new Date(r.dueDate).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' })}</p>{r.note && <p className="text-[11px] text-neutral-500 font-bold mt-1 italic">{r.note}</p>}</div></div><div className="flex gap-2.5"><button onClick={() => handleConfirmReceived(r)} className="flex-1 py-3.5 bg-emerald-500 text-black font-black uppercase text-[10px] rounded-2xl flex items-center justify-center gap-2 active:scale-[0.97] transition tracking-widest shadow-lg shadow-emerald-500/20"><CheckCircle className="h-4 w-4" /> Confirmer</button><button onClick={() => handlePostpone(r)} className="flex-1 py-3.5 bg-neutral-800 border border-neutral-700 text-amber-400 font-black uppercase text-[10px] rounded-2xl flex items-center justify-center gap-2 active:scale-[0.97] transition tracking-widest"><CalendarClock className="h-4 w-4" /> Reporter</button></div></div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {postponeTarget && (
        <div className="fixed inset-0 z-[230] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setPostponeTarget(null)}>
          <div className="w-full max-w-sm bg-[#080808] border border-amber-500/40 rounded-[40px] p-8 flex flex-col gap-6 ring-1 ring-amber-500/10" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center"><h3 className="font-black uppercase tracking-[0.2em] text-sm text-amber-400 flex items-center gap-2"><CalendarClock className="h-5 w-5" /> Reporter</h3><button onClick={() => setPostponeTarget(null)} className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-full text-neutral-400 hover:text-white transition active:scale-90"><X className="h-5 w-5" /></button></div>
            <p className="text-xs font-bold text-neutral-400 leading-relaxed">Nouveau suivi pour <span className="text-white font-black">{postponeTarget.contact?.name}</span> · {formatRawCurrency(postponeTarget.amount, postponeTarget.currencyCode)}. Vous serez notifié à cette nouvelle date.</p>
            <input type="date" value={postponeDate} onChange={(e) => setPostponeDate(e.target.value)} className="bg-neutral-900 border border-neutral-800 rounded-[20px] p-5 text-white font-black outline-none focus:border-amber-500/50 shadow-inner [color-scheme:dark]" />
            <div className="flex gap-3"><button onClick={() => setPostponeTarget(null)} className="flex-1 py-4 bg-neutral-900 text-neutral-400 font-black rounded-[20px] uppercase active:scale-95 transition border border-neutral-800 tracking-widest text-[10px]">Annuler</button><button onClick={submitPostpone} disabled={!postponeDate} className="flex-[2] py-4 bg-amber-500 text-black font-black rounded-[20px] uppercase active:scale-95 transition shadow-xl tracking-widest text-[10px] disabled:opacity-40">Confirmer</button></div>
          </div>
        </div>
      )}

      {pwdModal.open && (
        <div className="fixed inset-0 z-[210] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setPwdModal({ open: false })}>
          <div className="w-full max-w-md bg-[#0a0a0a] border border-neutral-800 rounded-[48px] p-10 flex flex-col gap-6 shadow-2xl ring-1 ring-white/10" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-neutral-900 pb-5">
              <div className="flex items-center gap-3 text-blue-400"><KeyRound className="h-5 w-5" /><h3 className="text-[11px] font-black uppercase tracking-[0.2em]">{pwdModal.mode === 'self' ? 'Changer mon mot de passe' : `Réinitialiser: ${pwdModal.targetName}`}</h3></div>
              <button onClick={() => setPwdModal({ open: false })} className="p-2.5 rounded-full bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const fd = new FormData(form);
              fd.set('userId', pwdModal.targetId || '');
              const res: any = await changeUserPassword(fd);
              if (res.success) { form.reset(); setPwdModal({ open: false }); await refreshHubState(); alert('Mot de passe mis à jour'); }
              else alert(res.error || 'Erreur');
            }} className="flex flex-col gap-4">
              {pwdModal.mode === 'self' && (
                <input name="oldPassword" type="password" required placeholder="ANCIEN MOT DE PASSE" className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 text-sm text-white font-black outline-none focus:border-blue-500/40" />
              )}
              <input name="newPassword" type="password" required minLength={6} placeholder="NOUVEAU MOT DE PASSE (min 6)" className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 text-sm text-white font-black outline-none focus:border-blue-500/40" />
              <button type="submit" disabled={isPending} className="py-5 bg-blue-500 text-white font-black rounded-2xl uppercase text-[11px] tracking-[0.2em] active:scale-95 transition shadow-2xl disabled:opacity-50">{pwdModal.mode === 'self' ? 'Mettre à jour' : 'Réinitialiser'}</button>
            </form>
          </div>
        </div>
      )}

      {panicActivationOpen && (
        <div className="fixed inset-0 z-[230] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setPanicActivationOpen(false)}>
          <div className="w-full max-w-lg bg-[#0a0a0a] border border-rose-500/30 rounded-[52px] p-9 sm:p-11 flex flex-col gap-7 shadow-2xl shadow-rose-950/40 ring-1 ring-rose-500/10" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start gap-5 border-b border-rose-500/15 pb-6"><div className="flex items-center gap-4"><div className="p-3.5 bg-rose-500/15 rounded-2xl border border-rose-500/30 text-rose-400"><Siren className="h-7 w-7" /></div><div><h3 className="text-lg font-black uppercase text-white tracking-tight">Activer Panic Lock</h3><p className="text-[9px] font-black text-rose-300 uppercase tracking-[0.16em] mt-1">Verrouillage global immédiat</p></div></div><button onClick={() => setPanicActivationOpen(false)} className="p-2.5 rounded-full bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"><X className="h-4 w-4" /></button></div>
            <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl"><p className="text-[11px] text-neutral-300 font-bold leading-relaxed">Après confirmation, tous les utilisateurs — y compris toi — seront immédiatement déconnectés. Tu pourras revenir uniquement avec les nouveaux identifiants d’urgence ci-dessous.</p></div>
            <form onSubmit={handleActivatePanicLock} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2"><label className="text-[9px] font-black text-neutral-500 uppercase tracking-widest px-1">Ton mot de passe actuel</label><input type="password" required autoFocus value={panicForm.currentPassword} onChange={e => setPanicForm(p => ({ ...p, currentPassword: e.target.value }))} placeholder="CONFIRMER TON IDENTITÉ" className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-sm text-white font-black outline-none focus:border-rose-500/50" /></div>
              <div className="h-px bg-neutral-900 my-1" />
              <div className="flex flex-col gap-2"><label className="text-[9px] font-black text-amber-300 uppercase tracking-widest px-1">Identifiant d’urgence temporaire</label><input type="text" required minLength={3} maxLength={32} value={panicForm.emergencyUsername} onChange={e => setPanicForm(p => ({ ...p, emergencyUsername: e.target.value.toLowerCase().replace(/\s/g, '') }))} placeholder="ex. emergency-july" className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-sm text-white font-black outline-none focus:border-amber-500/50" /></div>
              <div className="grid sm:grid-cols-2 gap-3"><div className="flex flex-col gap-2"><label className="text-[9px] font-black text-amber-300 uppercase tracking-widest px-1">Mot de passe d’urgence</label><input type="password" required minLength={12} value={panicForm.emergencyPassword} onChange={e => setPanicForm(p => ({ ...p, emergencyPassword: e.target.value }))} placeholder="12+ caractères" className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-sm text-white font-black outline-none focus:border-amber-500/50" /></div><div className="flex flex-col gap-2"><label className="text-[9px] font-black text-amber-300 uppercase tracking-widest px-1">Confirmer</label><input type="password" required minLength={12} value={panicForm.emergencyPasswordConfirm} onChange={e => setPanicForm(p => ({ ...p, emergencyPasswordConfirm: e.target.value }))} placeholder="Répéter" className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-sm text-white font-black outline-none focus:border-amber-500/50" /></div></div>
              {panicError && <p className="text-rose-400 text-[10px] font-black uppercase text-center tracking-widest">{panicError}</p>}
              <button type="submit" disabled={isPending} className="mt-2 py-5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-2xl uppercase text-[11px] tracking-[0.18em] active:scale-95 transition shadow-xl shadow-rose-900/30 disabled:opacity-50 flex items-center justify-center gap-2"><Siren className="h-4 w-4" /> Verrouiller tout maintenant</button>
            </form>
          </div>
        </div>
      )}

      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[220] bg-black/98 backdrop-blur-2xl flex items-center justify-center p-4 animate-in scale-in duration-300 shadow-2xl" onClick={() => setConfirmModal({isOpen: false})}>
          <div className="w-full max-w-sm bg-[#0a0a0a] border border-neutral-800 rounded-[56px] p-12 text-center flex flex-col gap-9 shadow-2xl ring-1 ring-white/10" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col gap-5 items-center"><div className={`p-6 rounded-[32px] shadow-2xl shadow-rose-900/10 ${confirmModal.isDanger ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}><AlertTriangle className="h-12 w-12" /></div><h3 className="text-2xl font-black uppercase text-white tracking-widest mt-2 leading-tight">{confirmModal.title}</h3><p className="text-[13px] text-neutral-400 font-bold leading-relaxed px-2">{confirmModal.description}</p></div>
            {confirmModal.requirePassword && ( <input type="password" placeholder="MOT DE PASSE ADMIN" className="w-full bg-neutral-900 border border-neutral-800 rounded-[28px] p-6 text-center text-lg outline-none text-white focus:border-rose-500/50 shadow-inner font-black tracking-[0.3em]" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} /> )}
            <div className="flex gap-4"><button onClick={() => setConfirmModal({isOpen:false})} className="flex-1 py-5 bg-neutral-900 text-neutral-400 font-black rounded-[28px] uppercase transition active:scale-95 border border-neutral-800 tracking-widest text-xs">Non</button><button onClick={async () => { const p = confirmPassword; setConfirmModal({isOpen:false}); setConfirmPassword(''); await confirmModal.onConfirm(p); }} className={`flex-1 py-5 font-black uppercase rounded-[28px] transition active:scale-95 shadow-2xl tracking-widest text-xs ${confirmModal.isDanger ? 'bg-rose-600 text-white shadow-rose-900/40' : 'bg-emerald-500 text-black shadow-emerald-900/40'}`}>{confirmModal.confirmText}</button></div>
          </div>
        </div>
      )}

      {/* BANK transaction confirmation — anti-mistake dialog (account / type / amount / warning) */}
      {bankConfirm && (() => { const bp = bankPalette(bankConfirm.accountId); const isIn = bankConfirm.type === 'IN'; return (
        <div className="fixed inset-0 z-[230] bg-black/98 backdrop-blur-2xl flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setBankConfirm(null)}>
          <div className={`w-full max-w-sm bg-[#0a0a0a] border-2 ${bp.border} rounded-[44px] p-8 flex flex-col gap-6 shadow-2xl ring-1 ring-white/10`} onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center gap-3">
              <div className={`p-4 rounded-3xl ${isIn ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' : 'bg-rose-500/10 text-rose-400 border border-rose-500/25'}`}>{isIn ? <ArrowUpRight className="h-9 w-9 rotate-180" /> : <ArrowUpRight className="h-9 w-9" />}</div>
              <h3 className="text-lg font-black uppercase text-white tracking-widest">Confirmer {isIn ? "l'entrée" : 'la sortie'}</h3>
            </div>
            {/* Account — the most prominent element */}
            <div className={`flex items-center gap-3 p-4 rounded-[24px] ${bp.bgSoft} border-2 ${bp.border}`}>
              <span className={`h-3.5 w-3.5 rounded-full ${bp.dot} shrink-0`} />
              <div className="min-w-0 text-left"><p className="text-[8px] font-black text-neutral-400 uppercase tracking-[0.25em]">Compte affecté</p><p className={`text-2xl font-black uppercase tracking-tight truncate ${bp.text} flex items-center gap-2`}>{isBiatAccount(bankConfirm.accountName) && <img src={BIAT_LOGO_SRC} alt="BIAT" className="h-[1em] w-auto rounded-sm shrink-0 bg-white/95 p-px" />}<span className="truncate">{bankConfirm.accountName}</span></p></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 text-center"><p className="text-[8px] font-black text-neutral-500 uppercase tracking-widest">Type</p><p className={`text-sm font-black uppercase mt-1 ${isIn ? 'text-emerald-400' : 'text-rose-400'}`}>{bankConfirm.count ? `${bankConfirm.count} sorties` : isIn ? 'Entrée' : 'Sortie'}</p></div>
              <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 text-center"><p className="text-[8px] font-black text-neutral-500 uppercase tracking-widest">Montant</p><p className="text-sm font-black text-white mt-1 tracking-tighter">{isIn ? '+' : '-'}{formatRawCurrency(bankConfirm.amount, bankConfirm.currencyCode)}</p></div>
            </div>
            {bankConfirm.scheduledFor && <p className="text-center text-[10px] font-black text-amber-300 uppercase tracking-widest flex items-center justify-center gap-1.5"><CalendarClock className="h-3.5 w-3.5" /> Planifié · {new Date(bankConfirm.scheduledFor).toLocaleDateString('fr-FR')}</p>}
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30"><AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" /><p className="text-[11px] font-bold text-amber-200 leading-relaxed text-left">Vérifie que <b className="text-amber-100">{bankConfirm.accountName}</b> est bien le bon compte avant de valider.</p></div>
            <div className="flex gap-3">
              <button onClick={() => setBankConfirm(null)} className="flex-1 py-4 bg-neutral-900 text-neutral-400 font-black rounded-[24px] uppercase transition active:scale-95 border border-neutral-800 tracking-widest text-[11px]">Annuler</button>
              <button onClick={() => bankConfirm.run()} disabled={isPending} className={`flex-[2] py-4 font-black uppercase rounded-[24px] transition active:scale-95 shadow-2xl tracking-widest text-[11px] disabled:opacity-50 ${isIn ? 'bg-emerald-500 text-black shadow-emerald-900/40' : 'bg-rose-600 text-white shadow-rose-900/40'}`}>{isPending ? '…' : 'Confirmer'}</button>
            </div>
          </div>
        </div>
      ); })()}

      {/* Ephemeral success / error toast */}
      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 z-[240] bottom-[calc(6rem+env(safe-area-inset-bottom))] w-[calc(100%-2rem)] max-w-sm animate-slide-up" onClick={() => setToast(null)}>
          <div className={`flex items-center gap-3 p-4 rounded-[24px] shadow-2xl ring-1 ring-white/10 border ${toast.kind === 'success' ? 'bg-emerald-500 text-black border-emerald-400' : 'bg-rose-600 text-white border-rose-500'}`}>
            {toast.kind === 'success' ? <CheckCircle className="h-5 w-5 shrink-0" /> : <AlertTriangle className="h-5 w-5 shrink-0" />}
            <p className="text-[12px] font-black uppercase tracking-wide leading-tight">{toast.msg}</p>
          </div>
        </div>
      )}
    </div>
  );
}

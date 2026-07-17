'use client';

import React, { useState, useTransition, useMemo, useEffect, useOptimistic, useCallback, memo } from 'react';
import {
  Plus, ArrowLeftRight, Camera, Search, X, ChevronRight, ChevronLeft, RefreshCw, Clock, ExternalLink,
  UserPlus, Trash2, Users, Settings, Edit, AlertTriangle, Coins, Calendar, LogOut, Lock, KeyRound,
  Sun, Moon, CheckCircle, DollarSign, History, ArrowUpRight, Bell, CalendarClock
} from 'lucide-react';
import {
  createContact, updateContact, deleteContact,
  createHubTransaction, deleteHubTransaction,
  createReminder, toggleReminderCompleted, deleteReminder,
  confirmReminderReceived, postponeReminder, settleDebtFromAvoir,
  resetDatabaseToZero, loginUser, logoutUser, getCurrentUser,
  changeUserPassword, createAssistantUser, deleteAssistantUser,
  createTndMovement, deleteTndMovement, settleTndMovement
} from '../app/actions';

const CURRENCY_SYMBOLS: Record<string, string> = { USD: '$', RMB: '¥', EURO: '€', TND: 'DT' };

const TYPE_EXPLAIN: Record<string, string> = {
  HELD: "AVOIR : ton argent qu'il garde pour toi (ex: une avance que tu lui as versée). Cet argent est à toi, mais il est chez lui.",
  RECEIVABLE: "CRÉANCE : il te doit de l'argent. Tu attends qu'il te rembourse ou te paie ce montant.",
  PAYABLE: "DETTE : tu lui dois de l'argent. C'est un montant que tu dois lui payer.",
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

const ContactCard = memo(({ c, formatUSD, formatRawCurrency, onEdit, onSelect }: any) => {
  const positive = c.netPositionUsd >= 0;
  const hasTnd = (c.heldBalanceTnd || 0) > 0.01;
  const hasActivity = Math.abs(c.netPositionUsd) > 0.01 || c.heldBalanceUsd > 0.01 || c.receivableBalanceUsd > 0.01 || c.payableBalanceUsd > 0.01 || hasTnd;
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
      <div className={`flex items-baseline justify-between rounded-2xl px-4 py-3 border ${positive ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-300">Position Nette</span>
        <span className={`text-xl font-black tracking-tighter ${positive ? 'text-emerald-400' : 'text-rose-400'}`}>{formatUSD(c.netPositionUsd)}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-[10px] text-center font-black uppercase tracking-tighter">
        <div className="flex flex-col gap-1"><p className="text-neutral-400">Avoirs</p>{c.heldBalanceUsd > 0.01 && <p className="text-blue-400 font-black text-xs break-all">{formatUSD(c.heldBalanceUsd)}</p>}{hasTnd && <p className="text-amber-400 font-black text-xs break-all">{formatRawCurrency(c.heldBalanceTnd, 'TND')}</p>}{c.heldBalanceUsd <= 0.01 && !hasTnd && <p className="text-blue-400 font-black text-xs break-all">{formatUSD(0)}</p>}</div>
        <div className="flex flex-col gap-1"><p className="text-neutral-400">Créances</p><p className="text-emerald-400 font-black text-xs break-all">{formatUSD(c.receivableBalanceUsd)}</p></div>
        <div className="flex flex-col gap-1"><p className="text-neutral-400">Dettes</p><p className="text-rose-400 font-black text-xs break-all">{formatUSD(c.payableBalanceUsd)}</p></div>
      </div>
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
  initialContacts, initialActiveCurrencies, initialTransactions, initialReminders, initialAuditTrails, initialUsers, initialMetrics, initialCategories,
  initialTndMovements, initialTndForecast, initialTndUpcoming, initialTndDueSoon, initialTndOverdue
}: any) {
  // --- AUTH & THEME ---
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  
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

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [activeSection, setActiveSection] = useState<'dashboard' | 'contacts' | 'transactions' | 'reminders' | 'history' | 'settings' | 'treasury'>('dashboard');
  // Assistants land directly on Treasury (only section they can access)
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin' && activeSection !== 'treasury' && activeSection !== 'settings') {
      setActiveSection('treasury');
    }
  }, [currentUser, activeSection]);

  // --- DATA STATES ---
  const [contacts, setContacts] = useState(initialContacts);
  const [transactions, setTransactions] = useState(initialTransactions.map((t:any) => ({...t, createdAt: new Date(t.createdAt)})));
  const [metrics, setMetrics] = useState(initialMetrics);
  const [reminders, setReminders] = useState(initialReminders.map((r:any) => ({...r, dueDate: new Date(r.dueDate)})));
  const [tndMovements, setTndMovements] = useState(initialTndMovements?.map((m:any) => ({...m, createdAt: new Date(m.createdAt), scheduledFor: m.scheduledFor ? new Date(m.scheduledFor) : null })) || []);
  const [tndForecast, setTndForecast] = useState(initialTndForecast);
  const [tndUpcoming, setTndUpcoming] = useState<any[]>((initialTndUpcoming || []).map((m:any) => ({...m, createdAt: new Date(m.createdAt), scheduledFor: m.scheduledFor ? new Date(m.scheduledFor) : null })));
  const [tndDueSoon, setTndDueSoon] = useState<any[]>((initialTndDueSoon || []).map((m:any) => ({...m, createdAt: new Date(m.createdAt), scheduledFor: m.scheduledFor ? new Date(m.scheduledFor) : null })));
  const [tndOverdue, setTndOverdue] = useState<any[]>((initialTndOverdue || []).map((m:any) => ({...m, createdAt: new Date(m.createdAt), scheduledFor: m.scheduledFor ? new Date(m.scheduledFor) : null })));

  const [optimisticTransactions, addOptimisticTransaction] = useOptimistic(transactions, (state: any, newTx: any) => 
    newTx.action === 'delete' ? state.filter((t:any) => t.id !== newTx.id) : [newTx, ...state]
  );
  const [optimisticContacts, addOptimisticContact] = useOptimistic(contacts, (state: any, newContact: any) => 
    newContact.action === 'delete' ? state.filter((c:any) => c.id !== newContact.id) : [...state, newContact]
  );
  const [optimisticTndMovements, addOptimisticTndMovement] = useOptimistic(tndMovements, (state: any, newM: any) => 
    newM.action === 'delete' ? state.filter((m:any) => m.id !== newM.id) : [newM, ...state]
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [isPending, startTransition] = useTransition();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [contactFilterType, setContactFilterType] = useState<'ALL' | 'HELD' | 'RECEIVABLE' | 'PAYABLE'>('ALL');
  const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false });
  const [confirmPassword, setConfirmPassword] = useState('');

  const [transactionForm, setTransactionForm] = useState({ 
    contactId: '', amount: '', currencyCode: 'USD', type: 'HELD', category: 'Virement', note: '',
    isPostponed: false, dueDate: '', reminderEmail: ''
  });
  const [contactForm, setContactForm] = useState({ id: '', name: '', emoji: '👤', country: '', isArchived: false });
  const [postponeTarget, setPostponeTarget] = useState<any>(null);
  const [postponeDate, setPostponeDate] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [drawerTypeFilter, setDrawerTypeFilter] = useState<string | null>(null);
  const [inlineNewPartner, setInlineNewPartner] = useState(false);
  const [inlinePartnerName, setInlinePartnerName] = useState('');
  const [inlinePartnerCountry, setInlinePartnerCountry] = useState('');
  const [tndForm, setTndForm] = useState<{ amount: string; type: string; note: string; scheduledFor?: string }>({ amount: '', type: 'IN', note: '', scheduledFor: '' });
  // TND Treasury filters
  const [tndSearch, setTndSearch] = useState('');
  const [tndPeriod, setTndPeriod] = useState<'today' | '7d' | '30d' | 'all'>('all');
  const [tndUserFilter, setTndUserFilter] = useState<string>('all');
  const [tndAmountMin, setTndAmountMin] = useState<string>('');
  const [tndAmountMax, setTndAmountMax] = useState<string>('');
  const [tndTypeFilter, setTndTypeFilter] = useState<'all' | 'IN' | 'OUT'>('all');
  // Password management modal
  const [pwdModal, setPwdModal] = useState<{ open: boolean; targetId?: string; targetName?: string; mode?: 'self' | 'admin_reset' }>({ open: false });

  // --- NAVIGATION ---
  const [navStack, setNavStack] = useState<string[]>(['dashboard']);
  const [navPos, setNavPos] = useState(0);
  const canGoBack = navPos > 0;
  const canGoForward = navPos < navStack.length - 1;

  const navigateTo = useCallback((section: string) => {
    setActiveSection(section as any);
    setNavStack(prev => {
      if (prev[navPos] === section) return prev;
      const truncated = prev.slice(0, navPos + 1);
      truncated.push(section);
      setNavPos(truncated.length - 1);
      return truncated;
    });
  }, [navPos]);

  const closeTopOverlay = useCallback(() => {
    if (postponeTarget) { setPostponeTarget(null); return true; }
    if (confirmModal.isOpen) { setConfirmModal({ isOpen: false }); return true; }
    if (activeModal) { setActiveModal(null); return true; }
    if (showNotifications) { setShowNotifications(false); return true; }
    if (selectedContact) { setSelectedContact(null); setDrawerTypeFilter(null); return true; }
    return false;
  }, [postponeTarget, confirmModal, activeModal, showNotifications, selectedContact]);

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

  const formatUSD = useCallback((val: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val), []);
  const formatRawCurrency = useCallback((val: number, curr: string) => {
    const symbol = CURRENCY_SYMBOLS[curr] || curr;
    return `${symbol} ${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(val)}`;
  }, []);

  const refreshHubState = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/dashboard-data?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts);
        setTransactions(data.transactions.map((t: any) => ({ ...t, createdAt: new Date(t.createdAt) })));
        setMetrics(data.metrics);
        setReminders(data.reminders.map((r: any) => ({ ...r, dueDate: new Date(r.dueDate) })));
        const hydrateTnd = (m: any) => ({ ...m, createdAt: new Date(m.createdAt), scheduledFor: m.scheduledFor ? new Date(m.scheduledFor) : null });
        setTndMovements((data.tndMovements || []).map(hydrateTnd));
        setTndForecast(data.tndForecast);
        setTndUpcoming((data.tndUpcoming || []).map(hydrateTnd));
        setTndDueSoon((data.tndDueSoon || []).map(hydrateTnd));
        setTndOverdue((data.tndOverdue || []).map(hydrateTnd));
      }
    } catch (e) { console.error(e); }
    finally { setTimeout(() => setIsRefreshing(false), 500); }
  };

  const handleLogout = async () => { try { await logoutUser(); } catch {} setCurrentUser(null); localStorage.removeItem('hub_session_user'); };
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData(); data.append('username', loginForm.username); data.append('password', loginForm.password);
    const res = await loginUser(data);
    if (res.success && res.user) { setCurrentUser(res.user); localStorage.setItem('hub_session_user', JSON.stringify(res.user)); }
    else setLoginError('Identifiants invalides');
  };

  const handleSessionExpired = () => { setActiveModal(null); setCurrentUser(null); localStorage.removeItem('hub_session_user'); alert('Session expirée. Veuillez vous reconnecter.'); };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const contact = contacts.find((c:any) => c.id === transactionForm.contactId);
    const amount = parseFloat(transactionForm.amount);
    startTransition(async () => {
      if (transactionForm.type === 'RECEIVABLE' && transactionForm.isPostponed) {
        const data = new FormData();
        Object.entries(transactionForm).forEach(([k,v]) => data.append(k, v as any));
        const res: any = await createReminder(data);
        if (res.success) { setTransactionForm({ ...transactionForm, amount: '', note: '', isPostponed: false }); setActiveModal(null); await refreshHubState(); }
        else if (res.code) handleSessionExpired(); else alert(res.error);
        return;
      }
      addOptimisticTransaction({ id: Math.random().toString(), amount, currencyCode: transactionForm.currencyCode, amountInUsd: amount, contact, type: transactionForm.type, category: transactionForm.category, note: transactionForm.note, createdAt: new Date() });
      const data = new FormData(); Object.entries(transactionForm).forEach(([k,v]) => data.append(k, v as any));
      const opType = transactionForm.type;
      const opContactId = transactionForm.contactId;
      const res: any = await createHubTransaction(data);
      if (res.success) { 
        setTransactionForm({ ...transactionForm, amount: '', note: '' }); setActiveModal(null); await refreshHubState(); 
        if (opType === 'HELD') maybePromptSettleDebt(opContactId);
      } else if (res.code) handleSessionExpired(); else alert(res.error);
    });
  };

  const maybePromptSettleDebt = async (contactId: string) => {
    const c = contacts.find((x: any) => x.id === contactId);
    if (c && c.payableBalanceUsd > 0.01 && c.heldBalanceUsd > 0.01) {
      const settle = Math.min(c.heldBalanceUsd, c.payableBalanceUsd);
      setConfirmModal({
        isOpen: true, title: '💸 Régler la dette ?',
        description: `Tu dois ${formatUSD(c.payableBalanceUsd)} à ${c.name} et tu détiens ${formatUSD(c.heldBalanceUsd)} en Avoir chez lui. Veux-tu utiliser cet Avoir pour régler la dette (${formatUSD(settle)}) ?`,
        confirmText: 'Régler maintenant',
        onConfirm: async () => { startTransition(async () => { const res: any = await settleDebtFromAvoir(contactId); if (res.success) await refreshHubState(); else if (res.code) handleSessionExpired(); else alert(res.error); }); }
      });
    }
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
      const res: any = await createTndMovement(data);
      if (res.success) { setTndForm({ amount: '', type: 'IN', note: '' } as any); setActiveModal(null); await refreshHubState(); }
      else if (res.code) handleSessionExpired(); else alert(res.error || 'Erreur');
    });
  };

  const handleSettleTndMovement = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirmer l\'encaissement ?',
      description: 'Ce mouvement sera marqué comme réglé et impactera immédiatement le solde de trésorerie.',
      confirmText: 'Confirmer',
      onConfirm: async () => {
        setConfirmModal({ isOpen: false });
        startTransition(async () => { await settleTndMovement(id); await refreshHubState(); });
      },
    });
  };

  const handleDeleteTndMovement = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Supprimer ce mouvement ?',
      description: 'Ce mouvement de trésorerie TND sera retiré du journal.',
      confirmText: 'Supprimer',
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal({ isOpen: false });
        startTransition(async () => { addOptimisticTndMovement({ id, action: 'delete' }); await deleteTndMovement(id); await refreshHubState(); });
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
      isOpen: true, title: '✅ Paiement reçu ?',
      description: `Confirmer la réception de ${formatRawCurrency(r.amount, r.currencyCode)} de ${r.contact?.name} ? Le montant sera ajouté à ses Avoirs.`,
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

  const filteredMovements = useMemo(() =>
    optimisticTransactions.filter((t:any) => !searchQuery || t.contact?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || t.note?.toLowerCase().includes(searchQuery.toLowerCase())),
    [optimisticTransactions, searchQuery]
  );

  const getTransactionTypeStyle = (type: string) => {
    switch (type) {
      case 'HELD': return { label: 'AVOIR', note: 'Mon argent chez lui', style: 'blue' };
      case 'RECEIVABLE': return { label: 'CRÉANCE', note: 'Il me doit', style: 'emerald' };
      case 'PAYABLE': return { label: 'DETTE', note: 'Je lui dois', style: 'rose' };
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

  if (!currentUser) return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-neutral-900/40 border border-neutral-800 rounded-[48px] p-10 flex flex-col gap-8 shadow-2xl animate-in zoom-in-95 duration-500 ring-1 ring-white/10">
        <div className="text-center flex flex-col items-center gap-3">
          <div className="h-16 w-16 rounded-[24px] bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-black font-black text-4xl shadow-xl shadow-emerald-500/10">M</div>
          <h1 className="text-2xl font-black tracking-tighter uppercase text-white mt-2">MONEY HUB</h1>
          <p className="text-[10px] text-neutral-500 font-black uppercase tracking-[0.3em]">Accès Contrôlé</p>
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
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-2xl border-b border-neutral-900/50 p-4 pt-6">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          <div className="flex justify-between items-center px-1">
            <div className="flex items-center gap-2.5">
              {currentUser.role === 'admin' && (
                <div className="flex gap-1.5">
                  <button onClick={goBack} disabled={!canGoBack} className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 transition active:scale-90 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
                  <button onClick={goForward} disabled={!canGoForward} className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 transition active:scale-90 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
                </div>
              )}
              <div onClick={() => navigateTo(currentUser.role === 'admin' ? 'dashboard' : 'treasury')} className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-black font-black text-xl cursor-pointer shadow-lg shadow-emerald-500/10">M</div>
              <div className="hidden sm:block"><h1 className="text-xl font-black tracking-tighter uppercase leading-none">MONEY HUB</h1><p className="text-[10px] text-neutral-500 font-black uppercase mt-1 tracking-widest">Sourcing Control</p></div>
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
          {currentUser.role === 'admin' && (
            <>
              <div className="flex gap-2 px-1">
                <button onClick={() => { setTransactionForm({ contactId: '', amount: '', currencyCode: 'USD', type: 'HELD', category: 'Virement', note: '', isPostponed: false, dueDate: '', reminderEmail: '' }); setActiveModal('add_tx'); }} className="flex-1 py-4 bg-emerald-500 text-black font-black uppercase text-xs rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/10 active:scale-[0.98] transition"> <Plus className="h-5 w-5 stroke-[3]" /> Nouvelle Opération </button>
                <button onClick={() => setActiveModal('add_contact')} className="px-5 py-4 bg-neutral-900 border border-neutral-800 text-white font-black uppercase text-xs rounded-2xl active:scale-[0.98] transition shadow-md"> <UserPlus className="h-5 w-5" /> </button>
              </div>
              <div className="relative px-1">
                <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                <input type="text" placeholder="Rechercher par nom, note ou montant..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl py-4 pl-12 pr-10 text-sm focus:border-emerald-500/40 transition outline-none text-white shadow-inner" />
              </div>
            </>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 flex flex-col gap-7 animate-fade-up pb-32">
        {activeSection === 'dashboard' && (
          <div className="flex flex-col gap-5">
            <div className={`bg-gradient-to-br from-neutral-900 to-black border p-8 rounded-[48px] shadow-2xl relative overflow-hidden ring-1 ring-white/5 ${metrics.netPosition >= 0 ? 'border-emerald-500/20' : 'border-rose-500/20'}`}>
              <div className={`absolute top-0 right-0 p-8 opacity-[0.07] ${metrics.netPosition >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}><DollarSign className="h-32 w-32" /></div>
              <p className="text-[11px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-2">Position Nette Globale</p>
              <h2 className={`text-4xl sm:text-6xl font-black tracking-tighter break-words ${metrics.netPosition >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatUSD(metrics.netPosition)}</h2>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-5 pt-5 border-t border-white/5">
                <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /><span className="text-[10px] text-neutral-300 font-black uppercase tracking-widest">Live · USD</span></span>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">Avoirs {formatUSD(metrics.totalAvoirs)}</span>
                {metrics.totalAvoirsTnd > 0.01 && <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">Avoirs {formatRawCurrency(metrics.totalAvoirsTnd, 'TND')}</span>}
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">+ Créances {formatUSD(metrics.totalReceivables)}</span>
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">− Dettes {formatUSD(metrics.totalPayables)}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <StatCard label="Avoirs" val={formatUSD(metrics.totalAvoirs)} extra={metrics.totalAvoirsTnd > 0.01 ? `+ ${formatRawCurrency(metrics.totalAvoirsTnd, 'TND')}` : null} type="HELD" activeFilter={contactFilterType} style="blue" note="Mon argent chez lui" onClick={() => { setContactFilterType('HELD'); navigateTo('contacts'); }} />
              <StatCard label="À recevoir" val={formatUSD(metrics.totalReceivables)} type="RECEIVABLE" activeFilter={contactFilterType} style="emerald" note="Il me doit" onClick={() => { setContactFilterType('RECEIVABLE'); navigateTo('contacts'); }} />
              <StatCard label="À payer" val={formatUSD(metrics.totalPayables)} type="PAYABLE" activeFilter={contactFilterType} style="rose" note="Je lui dois" onClick={() => { setContactFilterType('PAYABLE'); navigateTo('contacts'); }} />
              <StatCard label="Rappels" val={formatUSD(metrics.upcomingPayments)} type="REMINDER" activeFilter={null} style="amber" note="À venir" onClick={() => navigateTo('reminders')} />
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-black shadow-lg"><Users className="h-5 w-5" /></div><h3 className="text-xs font-black text-neutral-300 uppercase tracking-[0.2em]">Partenaires Actifs</h3></div>
                <button onClick={() => navigateTo('contacts')} className="text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:text-emerald-400 transition">Voir Tout</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredContacts.map((c: any) => {
                  const hasTnd = (c.heldBalanceTnd || 0) > 0.01; const hasUsd = Math.abs(c.netPositionUsd) > 0.01;
                  return (
                    <div key={c.id} onClick={() => setSelectedContact(c)} className="bg-neutral-900/60 border border-neutral-800 p-5 rounded-[28px] flex justify-between items-center active:scale-[0.98] transition cursor-pointer hover:border-neutral-700 shadow-md">
                      <div className="flex items-center gap-4"><span className="text-2xl p-2 bg-neutral-950 border border-neutral-800 rounded-xl">{c.emoji}</span><p className="font-black text-white text-base uppercase tracking-tight">{c.name}</p></div>
                      <div className="text-right flex flex-col items-end">{(hasUsd || !hasTnd) && <p className={`text-sm font-black ${c.netPositionUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatUSD(c.netPositionUsd)}</p>}{hasTnd && <p className="text-xs font-black text-amber-400 tracking-tighter">{formatRawCurrency(c.heldBalanceTnd, 'TND')}</p>}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'contacts' && (() => {
          const filterMeta: any = { HELD: { label: 'Avoirs', type: 'HELD', color: 'blue', cta: 'Enregistrer un avoir' }, RECEIVABLE: { label: 'À recevoir', type: 'RECEIVABLE', color: 'emerald', cta: 'Ajouter une somme à recevoir' }, PAYABLE: { label: 'À payer', type: 'PAYABLE', color: 'rose', cta: 'Ajouter une dette' } };
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
                  {filteredContacts.map((c: any) => <ContactCard key={c.id} c={c} formatUSD={formatUSD} formatRawCurrency={formatRawCurrency} onEdit={handleOpenEditContact} onSelect={setSelectedContact} />)}
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
          const filtered = optimisticTndMovements.filter((m: any) => {
            if (tndTypeFilter !== 'all' && m.type !== tndTypeFilter) return false;
            if (tndUserFilter !== 'all' && m.performedBy !== tndUserFilter) return false;
            if (periodMs > 0 && (now - new Date(m.createdAt).getTime()) > periodMs) return false;
            if (!isNaN(min) && m.amount < min) return false;
            if (!isNaN(max) && m.amount > max) return false;
            if (q) {
              const hay = `${m.note || ''} ${m.performedBy || ''} ${m.amount}`.toLowerCase();
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
                      <p className="text-[10px] font-black text-amber-300 uppercase tracking-[0.25em]">Rappel Trésorerie</p>
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
                <div className="absolute -top-10 -right-10 opacity-[0.05] pointer-events-none text-blue-400"><Coins className="h-48 w-48" /></div>
                <p className="text-[11px] font-black text-blue-300 uppercase tracking-[0.3em] mb-2">Trésorerie TND Disponible</p>
                <h2 className="text-6xl font-black tracking-tighter text-white break-words leading-none">{formatRawCurrency(metrics.tndBalance, 'TND')}</h2>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-7 pt-6 border-t border-white/5">
                  <div className="flex flex-col"><p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Entrées Aujourd'hui</p><p className="text-emerald-400 font-black text-base tracking-tighter">+{formatRawCurrency(metrics.tndTodayIn, 'TND')}</p></div>
                  <div className="flex flex-col"><p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Sorties Aujourd'hui</p><p className="text-rose-400 font-black text-base tracking-tighter">-{formatRawCurrency(metrics.tndTodayOut, 'TND')}</p></div>
                  <div className="flex flex-col border-l border-white/10 pl-6"><p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Prévision J+7</p><p className="text-blue-300 font-black text-base tracking-tighter">{formatRawCurrency(tndForecast?.forecast7Days || metrics.tndBalance, 'TND')}</p></div>
                  <div className="flex flex-col border-l border-white/10 pl-6"><p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Prévision J+30</p><p className="text-blue-300 font-black text-base tracking-tighter">{formatRawCurrency(tndForecast?.forecast30Days || metrics.tndBalance, 'TND')}</p></div>
                </div>
              </div>

              {/* QUICK ACTIONS */}
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => { setTndForm({ amount: '', type: 'IN', note: '' }); setActiveModal('add_tnd'); }} className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-[32px] flex flex-col items-center gap-3 active:scale-95 transition group hover:bg-emerald-500/20"><div className="p-3 bg-emerald-500/20 rounded-2xl group-hover:scale-110 transition"><Plus className="h-6 w-6 text-emerald-400" /></div><p className="text-[10px] font-black uppercase text-emerald-400">Encaisser TND</p></button>
                <button onClick={() => { setTndForm({ amount: '', type: 'OUT', note: '' }); setActiveModal('add_tnd'); }} className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-[32px] flex flex-col items-center gap-3 active:scale-95 transition group hover:bg-rose-500/20"><div className="p-3 bg-rose-500/20 rounded-2xl group-hover:scale-110 transition rotate-45"><Plus className="h-6 w-6 text-rose-400" /></div><p className="text-[10px] font-black uppercase text-rose-400">Décaissement</p></button>
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
                    {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
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
                {filtered.length === 0 && <EmptyState icon={<Coins className="h-10 w-10" />} title={optimisticTndMovements.length === 0 ? 'Coffre-fort vide' : 'Aucun résultat'} subtitle={optimisticTndMovements.length === 0 ? 'Enregistrez votre premier mouvement.' : 'Essayez de modifier les filtres.'} />}
                <div className="flex flex-col gap-3">
                  {filtered.map((m: any) => {
                    const running = balanceById[m.id] ?? 0;
                    const isPending = m.isSettled === false;
                    return (
                      <div key={m.id} className={`group relative p-5 pl-6 border rounded-[32px] flex justify-between items-center gap-4 transition ${isPending ? 'bg-amber-500/5 border-amber-500/30 hover:border-amber-500/50' : 'bg-neutral-900/40 border-neutral-800 hover:border-neutral-700'}`}>
                        <span className={`absolute left-0 top-6 bottom-6 w-1 rounded-full ${isPending ? 'bg-amber-400' : m.type === 'IN' ? 'bg-emerald-500 shadow-lg' : 'bg-rose-500'}`} />
                        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isPending && <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1"><CalendarClock className="h-2.5 w-2.5" /> Prévu</span>}
                            <p className={`text-sm font-bold leading-tight break-words ${isPending ? 'text-amber-100' : 'text-neutral-200'}`}>{m.note}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            {isPending && m.scheduledFor ? (
                              <p className="text-[9px] text-amber-400 font-black uppercase flex items-center gap-1"><CalendarClock className="h-3 w-3" /> {new Date(m.scheduledFor).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' })}</p>
                            ) : (
                              <p className="text-[9px] text-neutral-600 font-black uppercase">{new Date(m.createdAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</p>
                            )}
                            {m.performedBy && <p className="text-[9px] text-blue-400 font-black uppercase flex items-center gap-1"><Users className="h-3 w-3" /> {m.performedBy}</p>}
                            {!isPending && <p className="text-[9px] text-neutral-500 font-black uppercase flex items-center gap-1.5"><History className="h-3 w-3" /> Solde: {formatRawCurrency(running, 'TND')}</p>}
                          </div>
                        </div>
                        <div className="text-right shrink-0 flex items-center gap-3">
                          <p className={`text-lg font-black tracking-tighter ${isPending ? 'text-amber-300' : m.type === 'IN' ? 'text-emerald-400' : 'text-rose-400'}`}>{m.type === 'IN' ? '+' : '-'}{formatRawCurrency(m.amount, 'TND')}</p>
                          {isPending && currentUser.role === 'admin' && (
                            <button onClick={() => handleSettleTndMovement(m.id)} className="px-3 py-2 bg-emerald-500 text-black rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-400 transition active:scale-95" title="Confirmer l'encaissement">✓</button>
                          )}
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
            <div className="flex justify-between items-center px-1"><div className="flex flex-col gap-1.5"><h2 className="text-2xl font-black text-white uppercase tracking-tighter">Échéancier</h2><p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Suivi des paiements attendus</p></div><button onClick={() => { setTransactionForm({ contactId: '', amount: '', currencyCode: 'USD', type: 'RECEIVABLE', category: 'Virement', note: '', isPostponed: true, dueDate: '', reminderEmail: '' }); setActiveModal('add_tx'); }} className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-500 transition active:scale-90"><Calendar className="h-6 w-6" /></button></div>
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-4"><h3 className="text-xs font-black text-rose-500 uppercase tracking-[0.2em] px-1 flex items-center gap-2 animate-pulse"><AlertTriangle className="h-4 w-4" /> En Retard</h3>
                {reminders.filter((r:any) => !r.isCompleted && new Date(r.dueDate) < new Date(new Date().toDateString())).map((r:any) => (
                  <div key={r.id} className="relative p-5 rounded-[32px] border border-rose-900/50 bg-rose-950/10 flex items-center justify-between gap-4 overflow-hidden"><div className="absolute top-0 bottom-0 left-0 w-1.5 bg-rose-600" /><div className="flex-1 min-w-0"><p className="text-xs font-black text-rose-400 uppercase tracking-widest mb-1 truncate">{r.contact?.name}</p><p className="text-xl font-black text-white tracking-tighter break-words">{formatRawCurrency(r.amount, r.currencyCode)}</p><p className="text-[9px] text-rose-500 uppercase mt-2 font-black tracking-widest uppercase">DÉPASSÉ LE {new Date(r.dueDate).toLocaleDateString()}</p><div className="flex gap-2 mt-3"><button onClick={() => handleConfirmReceived(r)} className="px-3 py-2 rounded-xl bg-emerald-500 text-black text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 active:scale-95 transition"><CheckCircle className="h-3.5 w-3.5" /> Reçu</button><button onClick={() => handlePostpone(r)} className="px-3 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-amber-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 active:scale-95 transition"><CalendarClock className="h-3.5 w-3.5" /> Reporter</button><button onClick={() => handleDeleteReminderLoc(r.id)} className="px-2.5 py-2 rounded-xl text-rose-500/40 hover:text-rose-500 active:scale-95 transition"><Trash2 className="h-3.5 w-3.5" /></button></div></div></div>
                ))}
              </div>
              <div className="flex flex-col gap-4"><h3 className="text-xs font-black text-neutral-500 uppercase tracking-[0.2em] px-1">Prochaines Échéances</h3>
                {reminders.filter((r:any) => !r.isCompleted && new Date(r.dueDate) >= new Date(new Date().toDateString())).map((r:any) => (
                  <div key={r.id} className="p-5 rounded-[32px] border border-neutral-800 bg-neutral-900/40 flex justify-between items-center gap-3"><div className="flex-1 min-w-0"><p className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-1 truncate">{r.contact?.name}</p><p className="text-xl font-black text-white tracking-tighter break-words">{formatRawCurrency(r.amount, r.currencyCode)}</p><p className="text-[9px] text-amber-500 uppercase mt-2 font-black tracking-widest">ÉCHÉANCE : {new Date(r.dueDate).toLocaleDateString()}</p><div className="flex gap-2 mt-3"><button onClick={() => handleConfirmReceived(r)} className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-emerald-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 active:scale-95 transition hover:bg-emerald-500 hover:text-black"><CheckCircle className="h-3.5 w-3.5" /> Reçu</button><button onClick={() => handlePostpone(r)} className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-amber-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 active:scale-95 transition"><CalendarClock className="h-3.5 w-3.5" /> Reporter</button><button onClick={() => handleDeleteReminderLoc(r.id)} className="px-2.5 py-2 rounded-xl text-rose-500/40 hover:text-rose-500 active:scale-95 transition"><Trash2 className="h-3.5 w-3.5" /></button></div></div></div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'history' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-4 px-1"><h3 className="text-xs font-black text-neutral-500 uppercase tracking-[0.2em]">Journal d'audit</h3><button onClick={() => refreshHubState()} className="text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:text-emerald-400 transition">Actualiser</button></div>
            <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto pr-1">
              {initialAuditTrails.length === 0 && <EmptyState icon={<History className="h-10 w-10" />} title="Journal vide" subtitle="Actions tracées ici." />}
              {initialAuditTrails.map((a: any) => (
                <div key={a.id} className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-3xl flex flex-col gap-2.5 shadow-sm">
                  <div className="flex justify-between items-center"><div className="flex items-center gap-2"><span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${a.action === 'DELETE' || a.action === 'WIPE' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'}`}>{a.action}</span><span className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">· {a.entityType}</span></div><p className="text-[9px] text-neutral-700 font-black uppercase">{new Date(a.createdAt).toLocaleString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</p></div>
                  <p className="text-[11px] font-bold text-neutral-300 leading-relaxed px-1">{a.details}</p>
                  <p className="text-[9px] text-neutral-600 font-black uppercase px-1 tracking-wider italic text-right">Signature: {a.modifiedBy}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'settings' && (
          <div className="flex flex-col gap-8">
            {/* CURRENT USER + LOGOUT + CHANGE OWN PASSWORD */}
            <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-[48px] flex justify-between items-center shadow-2xl">
              <div>
                <p className="text-sm font-black text-white uppercase tracking-tighter">{currentUser.username}</p>
                <p className="text-[10px] text-neutral-500 uppercase font-black tracking-[0.2em] mt-1.5">{currentUser.role === 'admin' ? '👑 Administrateur' : '👤 Assistant'}</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setPwdModal({ open: true, mode: 'self', targetId: currentUser.id, targetName: currentUser.username })} className="p-4 bg-neutral-950 text-neutral-300 rounded-3xl border border-neutral-800 transition hover:border-neutral-700 shadow-xl" title="Changer mon mot de passe"><KeyRound className="h-5 w-5" /></button>
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
                          <p className="text-[9px] text-neutral-500 mt-1">Trésorerie seule</p>
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
                          <div className="h-12 w-12 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-center text-neutral-400 font-black text-lg shadow-inner">{u.username[0].toUpperCase()}</div>
                          <div className="flex flex-col gap-1">
                            <p className="text-base font-black text-white uppercase tracking-tight">{u.username}</p>
                            <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">{u.role === 'admin' ? '👑 Admin' : '👤 Assistant'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {u.id !== currentUser.id && (
                            <button onClick={() => setPwdModal({ open: true, mode: 'admin_reset', targetId: u.id, targetName: u.username })} className="p-3 text-blue-400/50 hover:text-blue-400 hover:bg-blue-500/10 rounded-2xl transition" title={`Réinitialiser le mot de passe de ${u.username}`}><KeyRound className="h-5 w-5" /></button>
                          )}
                          {u.id !== currentUser.id && (
                            <button onClick={() => handleDeleteAssistantLoc(u.id, u.username)} className="p-3 text-rose-500/30 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition" title={`Supprimer ${u.username}`}><Trash2 className="h-5 w-5" /></button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-8 border-2 border-rose-500/20 bg-rose-500/5 rounded-[40px] flex flex-col gap-6 mt-4"><h3 className="text-xs font-black text-rose-400 uppercase tracking-widest flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Zone de Danger</h3><p className="text-[11px] font-bold text-neutral-400 leading-relaxed">Action irréversible. Toutes les données seront effacées.</p><button onClick={() => { setConfirmModal({ isOpen: true, title: 'WIPE TOTAL', isDanger: true, requirePassword: true, description: 'Attention : TOUT sera effacé.', confirmText: 'TOUT EFFACER', onConfirm: async (p: string) => { startTransition(async () => { const res = await resetDatabaseToZero(p); if (res.success) { setSelectedContact(null); setActiveModal(null); await refreshHubState(); } else alert(res.error); }); } }); }} className="py-4 bg-rose-600 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest active:scale-95 transition shadow-2xl">Réinitialiser la plateforme</button></div>
              </>
            )}
          </div>
        )}
      </main>

      <nav className="fixed bottom-4 left-0 right-0 z-40 px-4 flex justify-center pointer-events-none">
        <div className="glass-panel border border-neutral-800 rounded-[36px] p-2.5 shadow-2xl flex items-center gap-1.5 pointer-events-auto shadow-emerald-500/5 ring-1 ring-white/10 backdrop-blur-3xl scale-110 sm:scale-100">
          {[
            { id: 'dashboard', label: 'Accueil', icon: <DollarSign className="h-5 w-5" />, adminOnly: true },
            { id: 'contacts', label: 'Contacts', icon: <Users className="h-5 w-5" />, adminOnly: true },
            { id: 'treasury', label: 'Trésorerie', icon: <Coins className="h-5 w-5" />, adminOnly: false },
            { id: 'history', label: 'Audit', icon: <History className="h-5 w-5" />, adminOnly: true },
            { id: 'settings', label: 'Param', icon: <Settings className="h-5 w-5" />, adminOnly: true },
          ].filter(s => !s.adminOnly || currentUser?.role === 'admin').map(s => (
            <button key={s.id} onClick={() => navigateTo(s.id)} className={`flex flex-col items-center gap-1.5 px-5 py-3.5 rounded-[28px] transition-all duration-300 active:scale-90 ${activeSection === s.id ? 'bg-white text-black font-black shadow-2xl scale-105' : 'text-neutral-500 hover:text-neutral-300'}`}>
              {s.icon} <span className="text-[9px] font-black uppercase tracking-tighter">{s.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* --- MODALS --- */}
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
              <div className="grid grid-cols-3 gap-2.5">
                {['HELD', 'RECEIVABLE', 'PAYABLE'].map(type => (
                  <button key={type} type="button" onClick={() => setTransactionForm(p=>({...p, type, isPostponed: type === 'RECEIVABLE' ? p.isPostponed : false}))} className={`py-5 rounded-[20px] text-[10px] font-black uppercase border transition-all flex flex-col items-center gap-1 shadow-md ${transactionForm.type === type ? 'bg-white text-black border-white shadow-emerald-500/10' : 'bg-neutral-900/50 border-neutral-800 text-neutral-500 hover:border-neutral-700'}`}><span>{getTransactionTypeStyle(type).label}</span><span className="text-[7px] font-black opacity-50 tracking-tighter uppercase">{getTransactionTypeStyle(type).note}</span></button>
                ))}
              </div>
              {transactionForm.type === 'RECEIVABLE' && (
                <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setTransactionForm(p=>({...p, isPostponed: false}))} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase border transition-all ${!transactionForm.isPostponed ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-neutral-900 border-neutral-800 text-neutral-500'}`}>Effet Immédiat</button>
                    <button type="button" onClick={() => setTransactionForm(p=>({...p, isPostponed: true}))} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase border transition-all ${transactionForm.isPostponed ? 'bg-amber-500 text-black border-amber-500' : 'bg-neutral-900 border-neutral-800 text-neutral-500'}`}>Échéance Future</button>
                  </div>
                  {transactionForm.isPostponed && (
                    <div className="flex flex-col gap-3 animate-in slide-in-from-top-2 duration-300">
                      <div className="flex flex-col gap-1.5"><label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1">Date d'échéance</label><input type="date" required={transactionForm.isPostponed} className="bg-neutral-900 border border-neutral-800 rounded-[20px] p-4 text-white font-black outline-none focus:border-amber-500/50 shadow-inner [color-scheme:dark]" value={transactionForm.dueDate} onChange={e => setTransactionForm(p=>({...p, dueDate: e.target.value}))} /></div>
                      <div className="flex flex-col gap-1.5"><label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1">Email pour le rappel</label><input type="email" placeholder="votre@email.com" className="bg-neutral-950 border border-neutral-800 rounded-[20px] p-4 text-sm text-white font-black outline-none focus:border-amber-500/50" value={transactionForm.reminderEmail} onChange={e => setTransactionForm(p=>({...p, reminderEmail: e.target.value}))} /></div>
                    </div>
                  )}
                </div>
              )}
              <div className="px-1 py-2.5 bg-neutral-900/40 border border-neutral-800 rounded-2xl flex items-start gap-2.5"><span className="text-base shrink-0 pl-2">💡</span><p className="text-[11px] font-bold text-neutral-400 leading-relaxed pr-2">{transactionForm.type === 'RECEIVABLE' && transactionForm.isPostponed ? "RAPPEL : Le montant ne sera pas ajouté aux soldes immédiatement. Vous serez notifié par email à l'échéance." : TYPE_EXPLAIN[transactionForm.type]}</p></div>
              <input type="text" required className="bg-neutral-950 border border-neutral-800 rounded-[20px] p-5 text-sm text-white focus:border-emerald-500/40 outline-none shadow-inner" placeholder="NOTE OBLIGATOIRE (TRACABILITÉ)" value={transactionForm.note} onChange={e => setTransactionForm(p=>({...p, note: e.target.value}))} />
              <div className="flex gap-4 mt-4"><button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-5 bg-neutral-900 text-neutral-400 font-black rounded-[24px] uppercase transition active:scale-95 border border-neutral-800 tracking-widest text-xs">Annuler</button><button type="submit" disabled={isPending || !transactionForm.note.trim()} className="flex-[2] py-5 bg-emerald-500 text-black font-black rounded-[24px] uppercase shadow-2xl shadow-emerald-500/30 active:scale-95 transition tracking-widest text-xs disabled:opacity-40">Enregistrer</button></div>
            </form>
          </div>
        </div>
      )}

      {activeModal === 'add_tnd' && (
        <div className="fixed inset-0 z-[160] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={() => setActiveModal(null)}>
          <div className="w-full max-w-sm bg-[#080808] border border-blue-500/40 rounded-[48px] p-10 flex flex-col gap-7 animate-scale-in shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-neutral-900 pb-5 text-blue-400 px-1"><h3 className="font-black uppercase tracking-[0.2em] text-sm">{tndForm.type === 'IN' ? 'Encaisser TND' : 'Décaissement TND'}</h3><button onClick={() => setActiveModal(null)} className="p-2.5 rounded-full bg-neutral-900 transition border border-neutral-800"><X className="h-5 w-5" /></button></div>
            <form onSubmit={handleAddTndMovement} className="flex flex-col gap-5">
              <div className="flex gap-3 w-full">
                <input type="number" step="any" required className="flex-1 min-w-0 bg-neutral-900 border border-neutral-800 rounded-[20px] p-5 text-3xl font-black text-white focus:border-blue-500/50 outline-none shadow-inner tracking-tighter" placeholder="0.00" value={tndForm.amount} onChange={e => setTndForm(p=>({...p, amount: e.target.value}))} />
                <div className="bg-neutral-950 border border-neutral-800 rounded-[20px] px-6 flex items-center text-blue-300 font-black text-lg shadow-inner">TND</div>
              </div>
              <input type="text" required className="bg-neutral-950 border border-neutral-800 rounded-[20px] p-5 text-sm text-white font-black uppercase outline-none focus:border-blue-500/50 shadow-inner" placeholder="NOTE OBLIGATOIRE" value={tndForm.note} onChange={e => setTndForm(p=>({...p, note: e.target.value}))} />
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-black text-neutral-500 uppercase tracking-widest px-1 flex items-center gap-2"><CalendarClock className="h-3 w-3" /> Date prévue (optionnel — laisser vide = immédiat)</label>
                <input type="date" min={new Date().toISOString().slice(0,10)} className="bg-neutral-950 border border-neutral-800 rounded-[20px] p-4 text-sm text-white font-black uppercase outline-none focus:border-amber-500/50 shadow-inner" value={(tndForm as any).scheduledFor || ''} onChange={e => setTndForm(p=>({...(p as any), scheduledFor: e.target.value}))} />
                {(tndForm as any).scheduledFor && (
                  <p className="text-[10px] font-black text-amber-400 px-2 flex items-center gap-1.5"><Bell className="h-3 w-3" /> Rappel automatique dès J-1. Le montant ne compte dans le solde qu'après confirmation.</p>
                )}
              </div>
              <div className="flex gap-4 mt-2">
                <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-5 bg-neutral-900 text-neutral-400 font-black rounded-[24px] uppercase transition border border-neutral-800 tracking-widest text-xs">Annuler</button>
                <button type="submit" disabled={isPending || !tndForm.note.trim()} className="flex-[2] py-5 bg-blue-600 text-white font-black rounded-[24px] uppercase shadow-2xl shadow-blue-500/30 active:scale-95 transition tracking-widest text-xs disabled:opacity-40">{(tndForm as any).scheduledFor ? 'Planifier' : 'Confirmer'}</button>
              </div>
            </form>
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
        const positive = selectedContact.netPositionUsd >= 0;
        const tnd = selectedContact.heldBalanceTnd || 0;
        const breakdown = [
          { key: 'HELD', label: 'Avoirs', val: selectedContact.heldBalanceUsd, tnd, style: 'blue', icon: <DollarSign className="h-4 w-4" />, note: 'Mon argent chez lui', explain: 'AVOIR = ton argent qu\'il garde pour toi (ex: une avance que tu lui as versée). Cet argent est à toi, mais il est chez lui.' },
          { key: 'RECEIVABLE', label: 'Créances', val: selectedContact.receivableBalanceUsd, tnd: 0, style: 'emerald', icon: <ArrowUpRight className="h-4 w-4" />, note: 'Il me doit', explain: 'CRÉANCE = il te doit de l\'argent. Tu attends qu\'il te rembourse ou te paie ce montant.' },
          { key: 'PAYABLE', label: 'Dettes', val: selectedContact.payableBalanceUsd, tnd: 0, style: 'rose', icon: <ArrowUpRight className="h-4 w-4 rotate-180" />, note: 'Je lui dois', explain: 'DETTE = tu lui dois de l\'argent. C\'est un montant que tu dois lui payer.' },
        ];
        const activeExplain = drawerTypeFilter ? breakdown.find(b => b.key === drawerTypeFilter) : null;
        const startOpForPartner = () => { setTransactionForm({ contactId: selectedContact.id, amount: '', currencyCode: 'USD', type: 'HELD', category: 'Virement', note: '', isPostponed: false, dueDate: '', reminderEmail: '' }); setActiveModal('add_tx'); };
        const closeDrawer = () => { setSelectedContact(null); setDrawerTypeFilter(null); };
        return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end animate-in fade-in duration-300" onClick={closeDrawer}>
          <div className="w-full max-w-md bg-gradient-to-b from-[#0a0a0c] to-[#050505] border-l border-neutral-800 h-full overflow-y-auto animate-in slide-in-from-right duration-400 shadow-2xl shadow-emerald-500/5" onClick={e => e.stopPropagation()}>
            <div className={`relative overflow-hidden px-7 pt-7 pb-8 border-b border-white/5 ${positive ? 'bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent' : 'bg-gradient-to-br from-rose-500/10 via-transparent to-transparent'}`}>
              <div className={`absolute -top-8 -right-6 opacity-[0.07] pointer-events-none ${positive ? 'text-emerald-400' : 'text-rose-400'}`}><Coins className="h-40 w-40" /></div>
              <div className="flex justify-between items-start relative">
                <div className="flex items-center gap-4 min-w-0"><span className="text-5xl p-2.5 bg-neutral-950/80 border border-neutral-800 rounded-3xl shadow-xl shrink-0">{selectedContact.emoji}</span><div className="min-w-0"><h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-none truncate">{selectedContact.name}</h3><p className="text-[10px] text-neutral-400 uppercase font-black tracking-[0.25em] mt-2 truncate">{selectedContact.country || 'GLOBAL'}</p></div></div>
                <button onClick={closeDrawer} className="p-2.5 bg-neutral-950/80 border border-neutral-800 rounded-full text-neutral-400 hover:text-white transition active:scale-90 shadow-lg shrink-0"><X className="h-5 w-5" /></button>
              </div>
              <div className="relative mt-7"><p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.25em] mb-1">Position Nette</p><p className={`font-black tracking-tighter leading-none break-words text-4xl ${positive ? 'text-emerald-400' : 'text-rose-400'}`}>{formatUSD(selectedContact.netPositionUsd)}</p>{tnd > 0.01 && <p className="text-amber-400 font-black text-sm tracking-tighter mt-1.5">+ {formatRawCurrency(tnd, 'TND')} <span className="text-neutral-500 text-[10px]">(local)</span></p>}</div>
            </div>
            <div className="px-7 pt-6 flex gap-3"><button onClick={startOpForPartner} className="flex-1 py-4 bg-emerald-500 text-black font-black uppercase text-[11px] rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 active:scale-[0.97] transition tracking-widest"><Plus className="h-4 w-4 stroke-[3]" /> Opération</button><button onClick={(e) => { handleOpenEditContact(e as any, selectedContact); }} className="px-5 py-4 bg-neutral-900 border border-neutral-800 text-blue-400 font-black uppercase text-[11px] rounded-2xl flex items-center justify-center gap-2 active:scale-[0.97] transition tracking-widest"><Edit className="h-4 w-4" /> Modifier</button></div>
            <div className="px-7 pt-6 grid grid-cols-3 gap-2.5">
              {breakdown.map(b => {
                const showUsd = b.key !== 'HELD' || b.val > 0.01 || b.tnd <= 0.01; const active = drawerTypeFilter === b.key;
                return (
                <button key={b.key} onClick={() => setDrawerTypeFilter(active ? null : b.key)} className={`text-left p-3.5 rounded-2xl border bg-${b.style}-500/5 flex flex-col gap-2 active:scale-[0.97] transition cursor-pointer ${active ? `border-${b.style}-500/60 ring-2 ring-${b.style}-500/40` : `border-${b.style}-500/20 hover:border-${b.style}-500/40`}`}><span className={`text-${b.style}-400 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider`}>{b.icon}{b.label}</span>{showUsd && <p className={`text-${b.style}-400 font-black text-base tracking-tighter break-words leading-none`}>{formatUSD(b.val)}</p>}{b.key === 'HELD' && b.tnd > 0.01 && <p className={`text-amber-400 font-black tracking-tighter break-words leading-none ${showUsd ? 'text-[11px]' : 'text-base'}`}>{formatRawCurrency(b.tnd, 'TND')}</p>}<span className={`text-[8px] font-black uppercase tracking-wider ${active ? `text-${b.style}-400` : 'text-neutral-500'}`}>{b.note}</span></button>
                );
              })}
            </div>
            {activeExplain && <div className={`mx-7 mt-4 p-4 rounded-2xl border bg-${activeExplain.style}-500/5 border-${activeExplain.style}-500/20 flex items-start gap-3 animate-in fade-in duration-200`}><span className={`text-${activeExplain.style}-400 shrink-0 mt-0.5`}>{activeExplain.icon}</span><p className="text-[11px] font-bold text-neutral-300 leading-relaxed">{activeExplain.explain}</p></div>}
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
            <div className="px-7 pt-7 pb-5 border-b border-white/5 flex justify-between items-center sticky top-0 bg-[#0a0a0c]/95 backdrop-blur z-10"><div className="flex items-center gap-3"><Bell className="h-5 w-5 text-amber-400" /><h3 className="text-lg font-black text-white uppercase tracking-tight">Notifications</h3>{(dueReminders.length + (currentUser.role === 'admin' ? tndDueSoon.length + tndOverdue.length : 0)) > 0 && <span className="h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-black">{dueReminders.length + (currentUser.role === 'admin' ? tndDueSoon.length + tndOverdue.length : 0)}</span>}</div><button onClick={() => setShowNotifications(false)} className="p-2.5 bg-neutral-950 border border-neutral-800 rounded-full text-neutral-400 hover:text-white transition active:scale-90"><X className="h-5 w-5" /></button></div>
            <div className="px-7 py-6 flex flex-col gap-4">
              {/* TND scheduled movements — admin only */}
              {currentUser.role === 'admin' && (tndDueSoon.length > 0 || tndOverdue.length > 0) && (
                <div className="flex flex-col gap-3 mb-2">
                  <div className="flex items-center gap-2 px-1"><Coins className="h-4 w-4 text-blue-400" /><h4 className="text-[10px] font-black text-blue-300 uppercase tracking-[0.25em]">Trésorerie TND</h4></div>
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
                            <p className="text-[10px] text-neutral-500 font-black mt-1">par {m.performedBy}</p>
                          </div>
                        </div>
                        <div className="flex gap-2.5">
                          <button onClick={() => { setShowNotifications(false); handleSettleTndMovement(m.id); }} className="flex-1 py-3.5 bg-emerald-500 text-black font-black uppercase text-[10px] rounded-2xl flex items-center justify-center gap-2 active:scale-[0.97] transition tracking-widest shadow-lg shadow-emerald-500/20"><CheckCircle className="h-4 w-4" /> Confirmer</button>
                          <button onClick={() => { setShowNotifications(false); setActiveSection('treasury'); }} className="flex-1 py-3.5 bg-neutral-800 border border-neutral-700 text-blue-400 font-black uppercase text-[10px] rounded-2xl flex items-center justify-center gap-2 active:scale-[0.97] transition tracking-widest"><Coins className="h-4 w-4" /> Voir</button>
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
                <div key={r.id} className={`p-5 rounded-[28px] border flex flex-col gap-4 shadow-lg ${overdue ? 'border-rose-900 bg-rose-950/20' : 'border-amber-900/50 bg-amber-950/10'}`}><div className="flex justify-between items-start gap-3"><div className="min-w-0"><p className={`text-[10px] font-black uppercase tracking-widest ${overdue ? 'text-rose-400' : 'text-amber-400'}`}>{overdue ? '⚠ En retard' : '🔔 Échéance aujourd\'hui'}</p><p className="text-base font-black text-white uppercase tracking-tight mt-1.5 truncate">{r.contact?.name}</p><p className="text-2xl font-black text-white tracking-tighter mt-1 break-words">{formatRawCurrency(r.amount, r.currencyCode)}</p>{r.currencyCode !== 'USD' && <p className="text-[10px] text-neutral-500 font-black">≈ {formatUSD(r.amountInUsd)}</p>}<p className="text-[10px] text-neutral-400 font-black uppercase mt-2 tracking-wider">Prévu le {new Date(r.dueDate).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' })}</p>{r.note && <p className="text-[11px] text-neutral-500 font-bold mt-1 italic">{r.note}</p>}</div></div><div className="flex gap-2.5"><button onClick={() => handleConfirmReceived(r)} className="flex-1 py-3.5 bg-emerald-500 text-black font-black uppercase text-[10px] rounded-2xl flex items-center justify-center gap-2 active:scale-[0.97] transition tracking-widest shadow-lg shadow-emerald-500/20"><CheckCircle className="h-4 w-4" /> Reçu</button><button onClick={() => handlePostpone(r)} className="flex-1 py-3.5 bg-neutral-800 border border-neutral-700 text-amber-400 font-black uppercase text-[10px] rounded-2xl flex items-center justify-center gap-2 active:scale-[0.97] transition tracking-widest"><CalendarClock className="h-4 w-4" /> Reporter</button></div></div>
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

      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[220] bg-black/98 backdrop-blur-2xl flex items-center justify-center p-4 animate-in scale-in duration-300 shadow-2xl" onClick={() => setConfirmModal({isOpen: false})}>
          <div className="w-full max-w-sm bg-[#0a0a0a] border border-neutral-800 rounded-[56px] p-12 text-center flex flex-col gap-9 shadow-2xl ring-1 ring-white/10" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col gap-5 items-center"><div className={`p-6 rounded-[32px] shadow-2xl shadow-rose-900/10 ${confirmModal.isDanger ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}><AlertTriangle className="h-12 w-12" /></div><h3 className="text-2xl font-black uppercase text-white tracking-widest mt-2 leading-tight">{confirmModal.title}</h3><p className="text-[13px] text-neutral-400 font-bold leading-relaxed px-2">{confirmModal.description}</p></div>
            {confirmModal.requirePassword && ( <input type="password" placeholder="MOT DE PASSE ADMIN" className="w-full bg-neutral-900 border border-neutral-800 rounded-[28px] p-6 text-center text-lg outline-none text-white focus:border-rose-500/50 shadow-inner font-black tracking-[0.3em]" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} /> )}
            <div className="flex gap-4"><button onClick={() => setConfirmModal({isOpen:false})} className="flex-1 py-5 bg-neutral-900 text-neutral-400 font-black rounded-[28px] uppercase transition active:scale-95 border border-neutral-800 tracking-widest text-xs">Non</button><button onClick={async () => { const p = confirmPassword; setConfirmModal({isOpen:false}); setConfirmPassword(''); await confirmModal.onConfirm(p); }} className={`flex-1 py-5 font-black uppercase rounded-[28px] transition active:scale-95 shadow-2xl tracking-widest text-xs ${confirmModal.isDanger ? 'bg-rose-600 text-white shadow-rose-900/40' : 'bg-emerald-500 text-black shadow-emerald-900/40'}`}>{confirmModal.confirmText}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useTransition, useMemo, useEffect, useOptimistic, useCallback, memo } from 'react';
import {
  Plus, ArrowLeftRight, Camera, Search, X, ChevronRight, RefreshCw, Clock, ExternalLink,
  UserPlus, Trash2, Users, Settings, Edit, AlertTriangle, Coins, Calendar, LogOut, Lock,
  Sun, Moon, CheckCircle, DollarSign, History, ArrowUpRight
} from 'lucide-react';
import {
  createContact, updateContact, deleteContact,
  createHubTransaction, deleteHubTransaction,
  createReminder, toggleReminderCompleted, deleteReminder,
  resetDatabaseToZero, loginUser, logoutUser, getCurrentUser
} from '../app/actions';

const CURRENCY_SYMBOLS: Record<string, string> = { USD: '$', RMB: '¥', EURO: '€', TND: 'DT' };

// --- HELPER COMPONENTS (MEMOIZED FOR SPEED) ---
const StatCard = memo(({ label, val, type, activeFilter, onClick, style, note, extra }: any) => (
  <div 
    onClick={onClick}
    className={`bg-neutral-900/40 border border-neutral-800 p-4 rounded-2xl cursor-pointer transition-all active:scale-[0.97] hover:border-${style}-500/40 ${activeFilter === type ? `ring-2 ring-${style}-500/50 border-${style}-500/50` : ''}`}
  >
    <p className="text-[10px] font-black text-neutral-300 uppercase tracking-wider">{label}</p>
    <p className={`text-2xl font-black text-${style}-400 mt-2 tracking-tighter break-all`}>{val}</p>
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
  initialContacts, initialActiveCurrencies, initialTransactions, initialReminders, initialAuditTrails, initialUsers, initialMetrics, initialCategories
}: any) {
  // --- AUTH & THEME ---
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  
  useEffect(() => {
    // Validate the REAL server session (httpOnly cookie), not just the local cache.
    // The localStorage cache can exist without a valid cookie (e.g. after the
    // security migration or cookie expiry) which made mutations fail silently.
    (async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          setCurrentUser(user);
          localStorage.setItem('hub_session_user', JSON.stringify(user));
        } else {
          setCurrentUser(null);
          localStorage.removeItem('hub_session_user');
        }
      } catch {
        setCurrentUser(null);
        localStorage.removeItem('hub_session_user');
      }
    })();
  }, []);

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [activeSection, setActiveSection] = useState<'dashboard' | 'contacts' | 'transactions' | 'reminders' | 'history' | 'settings'>('dashboard');

  // --- DATA STATES ---
  const [contacts, setContacts] = useState(initialContacts);
  const [transactions, setTransactions] = useState(initialTransactions.map((t:any) => ({...t, createdAt: new Date(t.createdAt)})));
  const [metrics, setMetrics] = useState(initialMetrics);
  const [reminders, setReminders] = useState(initialReminders.map((r:any) => ({...r, dueDate: new Date(r.dueDate)})));

  const [optimisticTransactions, addOptimisticTransaction] = useOptimistic(transactions, (state: any, newTx: any) => 
    newTx.action === 'delete' ? state.filter((t:any) => t.id !== newTx.id) : [newTx, ...state]
  );

  const [optimisticContacts, addOptimisticContact] = useOptimistic(contacts, (state: any, newContact: any) => 
    newContact.action === 'delete' ? state.filter((c:any) => c.id !== newContact.id) : [...state, newContact]
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [isPending, startTransition] = useTransition();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [contactFilterType, setContactFilterType] = useState<'ALL' | 'HELD' | 'RECEIVABLE' | 'PAYABLE'>('ALL');
  const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false });
  const [confirmPassword, setConfirmPassword] = useState('');

  const [transactionForm, setTransactionForm] = useState({ contactId: '', amount: '', currencyCode: 'USD', type: 'HELD', category: 'Virement', note: '' });
  const [contactForm, setContactForm] = useState({ id: '', name: '', emoji: '👤', country: '', isArchived: false });
  const [reminderForm, setReminderForm] = useState({ contactId: '', amount: '', currencyCode: 'USD', dueDate: '', note: '' });
  const [editingHolderId, setEditingHolderId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', emoji: '', color: 'blue' });

  const formatUSD = useCallback((val: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val), []);
  const formatRawCurrency = useCallback((val: number, curr: string) => {
    const symbol = CURRENCY_SYMBOLS[curr] || curr;
    return `${symbol} ${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(val)}`;
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files[0]) setTransactionForm(p => ({ ...p, photo: e.target.files![0] })); };

  const refreshHubState = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/dashboard-data?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts); setTransactions(data.transactions.map((t: any) => ({ ...t, createdAt: new Date(t.createdAt) })));
        setMetrics(data.metrics); setReminders(data.reminders.map((r: any) => ({ ...r, dueDate: new Date(r.dueDate) })));
      }
    } catch (e) { console.error(e); }
    finally { setTimeout(() => setIsRefreshing(false), 500); }
  };

  const handleLogout = async () => {
    try { await logoutUser(); } catch {}
    setCurrentUser(null);
    localStorage.removeItem('hub_session_user');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData(); data.append('username', loginForm.username); data.append('password', loginForm.password);
    const res = await loginUser(data);
    if (res.success && res.user) { setCurrentUser(res.user); localStorage.setItem('hub_session_user', JSON.stringify(res.user)); }
    else setLoginError('Identifiants invalides');
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const contact = contacts.find((c:any) => c.id === transactionForm.contactId);
    const amount = parseFloat(transactionForm.amount);
    startTransition(async () => {
      addOptimisticTransaction({ id: Math.random().toString(), amount, currencyCode: transactionForm.currencyCode, amountInUsd: amount, contact, type: transactionForm.type, category: transactionForm.category, note: transactionForm.note, createdAt: new Date() });
      const data = new FormData(); Object.entries(transactionForm).forEach(([k,v]) => data.append(k, v as any));
      const res: any = await createHubTransaction(data);
      if (res.success) { setActiveModal(null); await refreshHubState(); }
      else if (res.code === 'UNAUTHORIZED' || res.code === 'FORBIDDEN') { handleSessionExpired(); }
      else { alert(res.error || 'Erreur'); }
    });
  };

  const handleDeleteTx = (id: string) => {
    setConfirmModal({ isOpen: true, title: 'Supprimer ?', description: 'Action auditée.', confirmText: 'Supprimer', isDanger: true, onConfirm: async () => {
      startTransition(async () => { addOptimisticTransaction({ id, action: 'delete' }); await deleteHubTransaction(id); await refreshHubState(); });
    }});
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name.trim()) return;
    startTransition(async () => {
      addOptimisticContact({ id: 'temp', name: contactForm.name, emoji: contactForm.emoji, netPositionUsd: 0, heldBalanceUsd:0, receivableBalanceUsd:0, payableBalanceUsd:0 });
      const data = new FormData();
      Object.entries(contactForm).forEach(([k,v]) => data.append(k, v as any));
      const res: any = await createContact(data);
      if (res.success) {
        setContactForm({ id: '', name: '', emoji: '👤', country: '', isArchived: false });
        setActiveModal(null);
        await refreshHubState();
      } else if (res.code === 'UNAUTHORIZED' || res.code === 'FORBIDDEN') {
        handleSessionExpired();
      } else {
        alert(res.error || 'Erreur lors de la création');
      }
    });
  };

  const handleSessionExpired = () => {
    setActiveModal(null);
    setCurrentUser(null);
    localStorage.removeItem('hub_session_user');
    alert('Votre session a expiré. Veuillez vous reconnecter.');
  };

  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault(); if (!contactForm.id || !contactForm.name) return;
    const data = new FormData(); data.append('contactId', contactForm.id); data.append('name', contactForm.name); data.append('emoji', contactForm.emoji); data.append('country', contactForm.country); data.append('isArchived', contactForm.isArchived ? 'true' : 'false');
    startTransition(async () => {
      const res = await updateContact(data);
      if (res.success) { setContactForm({ id: '', name: '', emoji: '👤', country: '', isArchived: false }); setActiveModal(null); await refreshHubState(); }
      else alert(res.error);
    });
  };

  const handleToggleReminder = async (id: string, isDone: boolean) => { 
    startTransition(async () => { 
      await toggleReminderCompleted(id, isDone); 
      await refreshHubState(); 
    }); 
  };

  const handleDeleteReminder = (id: string) => {
    setConfirmModal({
      isOpen: true, title: 'Supprimer ?', description: 'Supprimer ce rappel ?', confirmText: 'Supprimer', isDanger: true,
      onConfirm: async () => {
        startTransition(async () => {
          await deleteReminder(id);
          await refreshHubState();
        });
      }
    });
  };

  const handleCreateReminderSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!reminderForm.contactId || !reminderForm.amount || !reminderForm.dueDate) return;
    const data = new FormData(); data.append('contactId', reminderForm.contactId); data.append('amount', reminderForm.amount); data.append('currencyCode', reminderForm.currencyCode); data.append('dueDate', reminderForm.dueDate); data.append('note', reminderForm.note);
    startTransition(async () => {
      const res = await createReminder(data);
      if (res.success) { setReminderForm({ contactId: '', amount: '', currencyCode: 'USD', dueDate: '', note: '' }); setActiveModal(null); await refreshHubState(); }
    });
  };

  const handleOpenEditContact = useCallback((e: React.MouseEvent, c: any) => {
    e.preventDefault(); e.stopPropagation();
    setContactForm({ id: c.id, name: c.name, emoji: c.emoji, country: c.country || '', isArchived: !!c.isArchived });
    setActiveModal('edit_contact');
  }, []);

  const handleMasterWipeToZero = () => {
    setConfirmModal({ isOpen: true, title: '⚠️ WIPE GLOBAL ?', description: 'Action irréversible. Mot de passe :', confirmText: 'Wipe', isDanger: true, requirePassword: true, onConfirm: async (p: any) => {
      startTransition(async () => { const res = await resetDatabaseToZero(p); if (res.success) { setSelectedContact(null); setActiveModal(null); await refreshHubState(); } else alert(res.error); });
    }});
  };

  const handleStartInlineEdit = (contact: any) => { setEditingHolderId(contact.id); setEditFormData({ name: contact.name, emoji: contact.emoji, color: 'blue' }); };
  const handleSaveInlineEdit = async (e: React.FormEvent, id: string) => {
    e.preventDefault(); const data = new FormData(); data.append('contactId', id); data.append('name', editFormData.name); data.append('emoji', editFormData.emoji); data.append('country', ''); data.append('isArchived', 'false');
    startTransition(async () => { const res = await updateContact(data); if (res.success) { setEditingHolderId(null); await refreshHubState(); } else alert(res.error); });
  };

  const handleEraseAccount = (id: string, name: string) => {
    setConfirmModal({ isOpen: true, title: '🗑️ SUPPRIMER CONTACT', description: `Supprimer définitivement ${name} ?`, confirmText: 'Supprimer', cancelText: 'Annuler', isDanger: true, onConfirm: async () => {
      startTransition(async () => { addOptimisticContact({ id, action: 'delete' }); await deleteContact(id); await refreshHubState(); });
    }});
  };

  const handleSelectContact = (c: any) => setSelectedContact(c);

  const getTransactionTypeStyle = (type: string) => {
    switch (type) {
      case 'HELD': return { label: 'Avoir', style: 'blue', note: 'Mon argent chez lui' };
      case 'RECEIVABLE': return { label: 'Créance', style: 'emerald', note: 'Il me doit de l\'argent' };
      case 'PAYABLE': return { label: 'Dette', style: 'rose', note: 'Je lui dois de l\'argent' };
      default: return { label: '?', style: 'neutral', note: '' };
    }
  };

  const filteredContacts = useMemo(() => {
    let result = [...optimisticContacts];
    // SMART SORT: 
    // 1. Partners with highest absolute balance (importance) first
    // 2. Then alphabetical
    result.sort((a, b) => {
      const aVolume = Math.max(Math.abs(a.heldBalanceUsd), Math.abs(a.receivableBalanceUsd), Math.abs(a.payableBalanceUsd));
      const bVolume = Math.max(Math.abs(b.heldBalanceUsd), Math.abs(b.receivableBalanceUsd), Math.abs(b.payableBalanceUsd));
      
      if (bVolume !== aVolume) return bVolume - aVolume;
      return a.name.localeCompare(b.name);
    });

    if (contactFilterType === 'HELD') result = result.filter((c:any) => c.heldBalanceUsd > 0);
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

  if (!currentUser) return (
    <div className="min-h-screen bg-[#020202] flex items-center justify-center p-4">
      <div className="w-full max-w-sm glass-panel border border-neutral-800 rounded-[40px] p-10 text-center shadow-2xl animate-scale-in">
        <span className="inline-flex p-4 bg-neutral-900 border border-neutral-800 text-emerald-400 rounded-3xl mb-4"><Lock className="h-7 w-7" /></span>
        <h1 className="text-3xl font-black tracking-tighter uppercase mb-8">MONEY HUB</h1>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input type="text" required placeholder="Identifiant" value={loginForm.username} onChange={(e) => setLoginForm(p => ({ ...p, username: e.target.value }))} className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-sm focus:border-emerald-500/50 outline-none text-white transition-all" />
          <input type="password" required placeholder="Mot de passe" value={loginForm.password} onChange={(e) => setLoginForm(p => ({ ...p, password: e.target.value }))} className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-sm focus:border-emerald-500/50 outline-none text-white transition-all" />
          {loginError && <p className="text-rose-400 text-xs font-black uppercase tracking-widest">{loginError}</p>}
          <button type="submit" className="w-full py-4 bg-emerald-500 text-black font-black uppercase rounded-2xl active:scale-95 transition shadow-lg shadow-emerald-500/20 mt-4">Accéder au Hub</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen pb-32 ambient-bg ${theme === 'light' ? 'bg-neutral-50 text-black' : 'bg-[#050505] text-white'}`}>
      <header className="sticky top-0 z-40 bg-[#050505]/90 backdrop-blur-2xl border-b border-neutral-900/50 p-4 pt-6">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          <div className="flex justify-between items-center px-1">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-black font-black text-xl shadow-lg shadow-emerald-500/10">M</div>
              <div><h1 className="text-xl font-black tracking-tighter uppercase leading-none">MONEY HUB</h1><p className="text-[10px] text-neutral-500 font-black uppercase mt-1 tracking-widest">Sourcing Control</p></div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 transition active:scale-90">{theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
              <button onClick={refreshHubState} className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 transition active:scale-90 shadow-lg"><RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} /></button>
            </div>
          </div>
          <div className="flex gap-2 px-1">
            <button onClick={() => { setTransactionForm({ contactId: '', amount: '', currencyCode: 'USD', type: 'HELD', category: 'Virement', note: '' }); setActiveModal('add_tx'); }} className="flex-1 py-4 bg-emerald-500 text-black font-black uppercase text-xs rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/10 active:scale-[0.98] transition"> <Plus className="h-5 w-5 stroke-[3]" /> Nouvelle Opération </button>
            <button onClick={() => setActiveModal('add_contact')} className="px-5 py-4 bg-neutral-900 border border-neutral-800 text-white font-black uppercase text-xs rounded-2xl active:scale-[0.98] transition shadow-md"> <UserPlus className="h-5 w-5" /> </button>
          </div>
          <div className="relative px-1">
            <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <input type="text" placeholder="Rechercher par nom, note ou montant..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl py-4 pl-12 pr-10 text-sm focus:border-emerald-500/40 transition outline-none text-white shadow-inner" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 flex flex-col gap-7 animate-fade-up">
        {activeSection === 'dashboard' && (
          <div className="flex flex-col gap-5">
            <div className={`bg-gradient-to-br from-neutral-900 to-black border p-8 rounded-[48px] shadow-2xl relative overflow-hidden ring-1 ring-white/5 ${metrics.netPosition >= 0 ? 'border-emerald-500/20' : 'border-rose-500/20'}`}>
              <div className={`absolute top-0 right-0 p-8 opacity-[0.07] ${metrics.netPosition >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}><DollarSign className="h-32 w-32" /></div>
              <p className="text-[11px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-2">Position Nette Globale</p>
              <h2 className={`text-6xl font-black tracking-tighter ${metrics.netPosition >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatUSD(metrics.netPosition)}</h2>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-5 pt-5 border-t border-white/5">
                <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /><span className="text-[10px] text-neutral-300 font-black uppercase tracking-widest">Live · USD</span></span>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">Avoirs {formatUSD(metrics.totalAvoirs)}</span>
                {metrics.totalAvoirsTnd > 0.01 && <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">Avoirs {formatRawCurrency(metrics.totalAvoirsTnd, 'TND')}</span>}
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">+ Créances {formatUSD(metrics.totalReceivables)}</span>
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">− Dettes {formatUSD(metrics.totalPayables)}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <StatCard label="Avoirs" val={formatUSD(metrics.totalAvoirs)} extra={metrics.totalAvoirsTnd > 0.01 ? `+ ${formatRawCurrency(metrics.totalAvoirsTnd, 'TND')}` : null} type="HELD" activeFilter={contactFilterType} style="blue" note="Mon argent chez lui" onClick={() => { setContactFilterType('HELD'); setActiveSection('contacts'); }} />
              <StatCard label="À recevoir" val={formatUSD(metrics.totalReceivables)} type="RECEIVABLE" activeFilter={contactFilterType} style="emerald" note="Il me doit" onClick={() => { setContactFilterType('RECEIVABLE'); setActiveSection('contacts'); }} />
              <StatCard label="À payer" val={formatUSD(metrics.totalPayables)} type="PAYABLE" activeFilter={contactFilterType} style="rose" note="Je lui dois" onClick={() => { setContactFilterType('PAYABLE'); setActiveSection('contacts'); }} />
              <StatCard label="Rappels" val={formatUSD(metrics.upcomingPayments)} type="REMINDER" activeFilter={null} style="amber" note="À venir" onClick={() => setActiveSection('reminders')} />
            </div>
            <div className="flex justify-between items-center mt-2 px-1">
              <h3 className="text-xs font-black text-neutral-500 uppercase tracking-[0.2em]">Partenaires Actifs</h3>
              <button onClick={() => setActiveSection('contacts')} className="text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:text-emerald-400 transition">Voir Tout</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredContacts.map((c: any) => {
                const hasTnd = (c.heldBalanceTnd || 0) > 0.01;
                const hasUsd = Math.abs(c.netPositionUsd) > 0.01;
                return (
                <div key={c.id} onClick={() => handleSelectContact(c)} className="bg-neutral-900/60 border border-neutral-800 p-5 rounded-[28px] flex justify-between items-center active:scale-[0.98] transition cursor-pointer hover:border-neutral-700 shadow-md">
                  <div className="flex items-center gap-4"><span className="text-2xl p-2 bg-neutral-950 border border-neutral-800 rounded-xl">{c.emoji}</span><p className="font-black text-white text-base uppercase tracking-tight">{c.name}</p></div>
                  <div className="text-right flex flex-col items-end">
                    {(hasUsd || !hasTnd) && <p className={`text-sm font-black ${c.netPositionUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatUSD(c.netPositionUsd)}</p>}
                    {hasTnd && <p className="text-xs font-black text-amber-400 tracking-tighter">{formatRawCurrency(c.heldBalanceTnd, 'TND')}</p>}
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        )}

        {activeSection === 'contacts' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-10">
            <div onClick={() => setActiveModal('add_contact')} className="border border-dashed border-neutral-800 bg-neutral-900/10 p-10 rounded-[40px] flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-neutral-900/30 transition-all active:scale-95 group">
              <div className="p-4 bg-emerald-500/10 rounded-3xl group-hover:scale-110 transition"><Plus className="h-8 w-8 text-emerald-500" /></div>
              <p className="text-xs font-black uppercase tracking-widest text-neutral-400">Ajouter un Partenaire</p>
            </div>
            {filteredContacts.map((c: any) => (
              <ContactCard key={c.id} c={c} formatUSD={formatUSD} formatRawCurrency={formatRawCurrency} onEdit={handleOpenEditContact} onSelect={setSelectedContact} />
            ))}
          </div>
        )}

        {activeSection === 'transactions' && (
          <div className="flex flex-col gap-3 pb-10">
            {filteredMovements.length === 0 && (
              <EmptyState icon={<ArrowLeftRight className="h-10 w-10" />} title="Aucune opération" subtitle="Les opérations enregistrées apparaîtront ici. Touchez « Nouvelle Opération » pour commencer." />
            )}
            {filteredMovements.map((t: any) => (
              <div key={t.id} className="bg-neutral-900 border border-neutral-800 p-5 rounded-3xl flex justify-between items-center shadow-lg hover:border-neutral-700 transition group">
                <div className="flex items-center gap-4">
                  <span className="text-2xl p-2.5 bg-neutral-950 border border-neutral-800 rounded-2xl shadow-inner group-hover:scale-110 transition duration-300">{t.contact?.emoji}</span>
                  <div><p className="text-base font-black text-white uppercase tracking-tight">{t.contact?.name}</p><p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${getTransactionTypeStyle(t.type).style === 'blue' ? 'text-blue-500' : getTransactionTypeStyle(t.type).style === 'emerald' ? 'text-emerald-500' : 'text-rose-500'}`}>{t.category} · {getTransactionTypeStyle(t.type).label}</p></div>
                </div>
                <div className="text-right flex items-center gap-4">
                  <div className="flex flex-col gap-0.5"><p className="text-lg font-black text-white tracking-tighter">{formatUSD(t.amountInUsd)}</p><p className="text-[10px] text-neutral-600 font-black uppercase">{t.createdAt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</p></div>
                  <button onClick={() => handleDeleteTx(t.id)} className="p-2.5 text-rose-500/40 hover:text-rose-500 active:scale-90 transition hover:bg-rose-500/10 rounded-xl"><Trash2 className="h-5 w-5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeSection === 'history' && (
          <div className="flex flex-col gap-4 pb-10">
            <h2 className="text-xs font-black text-neutral-500 uppercase tracking-[0.2em] mb-2 px-1 flex items-center gap-2"> <History className="h-4 w-4" /> Journal de Traçabilité </h2>
            <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto pr-1">
              {initialAuditTrails.length === 0 && (
                <EmptyState icon={<History className="h-10 w-10" />} title="Journal vide" subtitle="Chaque action (création, modification, suppression, connexion) sera tracée ici de façon sécurisée." />
              )}
              {initialAuditTrails.map((a: any) => (
                <div key={a.id} className="bg-neutral-900/60 border border-neutral-800 p-5 rounded-[28px] flex flex-col gap-3 shadow-inner ring-1 ring-white/5">
                  <div className="flex justify-between items-start"><p className="text-[9px] font-black px-1.5 py-1 rounded-lg bg-neutral-950 text-neutral-400 uppercase tracking-widest border border-neutral-800">{a.entityType} : {a.action}</p><p className="text-[9px] text-neutral-500 font-black uppercase">{new Date(a.createdAt).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</p></div>
                  <p className="text-[13px] font-bold text-neutral-200 leading-relaxed">{a.details}</p>
                  <p className="text-[9px] text-neutral-600 font-black uppercase tracking-widest mt-1 italic">Signature : <span className="text-emerald-500/80 underline decoration-emerald-500/20">{a.modifiedBy}</span></p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'reminders' && (
          <div className="flex flex-col gap-7 pb-10">
            <button onClick={() => setActiveModal('add_reminder')} className="w-full py-5 bg-amber-600 text-white font-black uppercase rounded-[28px] shadow-2xl shadow-amber-900/20 active:scale-[0.98] transition">+ Nouvel Échéancier</button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-4"><h3 className="text-xs font-black text-rose-500 uppercase tracking-[0.2em] px-1 flex items-center gap-2 animate-pulse"><AlertTriangle className="h-4 w-4" /> Retards Critiques</h3>
                {reminders.filter((r:any) => !r.isCompleted && new Date(r.dueDate) < new Date()).map((r:any) => (
                  <div key={r.id} className="p-5 rounded-[32px] border border-rose-950 bg-rose-950/20 flex justify-between items-center shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-rose-600" />
                    <div><p className="text-xs font-black text-rose-400 uppercase tracking-widest mb-1">{r.contact?.name}</p><p className="text-xl font-black text-white tracking-tighter">{formatRawCurrency(r.amount, r.currencyCode)}</p><p className="text-[9px] text-rose-500 uppercase mt-2 font-black tracking-widest">DÉPASSÉ LE {new Date(r.dueDate).toLocaleDateString()}</p></div>
                    <button onClick={() => handleToggleReminder(r.id, true)} className="p-3 rounded-2xl bg-emerald-500 text-black active:scale-90 transition shadow-lg shadow-emerald-500/20"><CheckCircle className="h-5 w-5" /></button>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-4"><h3 className="text-xs font-black text-neutral-500 uppercase tracking-[0.2em] px-1">Prochaines Échéances</h3>
                {reminders.filter((r:any) => !r.isCompleted && new Date(r.dueDate) >= new Date()).map((r:any) => (
                  <div key={r.id} className="p-5 rounded-[32px] border border-neutral-800 bg-neutral-900/40 flex justify-between items-center">
                    <div><p className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-1">{r.contact?.name}</p><p className="text-xl font-black text-white tracking-tighter">{formatRawCurrency(r.amount, r.currencyCode)}</p><p className="text-[9px] text-amber-500 uppercase mt-2 font-black tracking-widest">ÉCHÉANCE : {new Date(r.dueDate).toLocaleDateString()}</p></div>
                    <button onClick={() => handleToggleReminder(r.id, true)} className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-400 active:scale-90 transition hover:bg-emerald-500 hover:text-black"><CheckCircle className="h-5 w-5" /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'settings' && (
          <div className="flex flex-col gap-7 pb-10 animate-fade-up">
            <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-[48px] flex justify-between items-center shadow-2xl ring-1 ring-white/5"><div><p className="text-sm font-black text-white uppercase tracking-tighter">{currentUser.username}</p><p className="text-[10px] text-neutral-500 uppercase font-black tracking-[0.2em] mt-1.5">{currentUser.role}</p></div><button onClick={handleLogout} className="p-4 bg-rose-950/20 text-rose-400 rounded-3xl border border-rose-900/40 transition active:scale-90 hover:bg-rose-900/40 shadow-xl shadow-rose-900/10"><LogOut className="h-6 w-6" /></button></div>
            <div className="bg-neutral-900 border border-neutral-800 p-7 rounded-[40px] flex flex-col gap-6 shadow-2xl">
              <div className="flex justify-between items-center border-b border-neutral-800 pb-5 px-1"><h3 className="text-xs font-black uppercase text-neutral-500 tracking-[0.2em] flex items-center gap-2"><Settings className="h-4 w-4" /> Répertoire & Équipiers</h3> <button onClick={() => setActiveModal('add_contact')} className="py-2.5 px-6 rounded-2xl bg-emerald-500 text-black font-black text-[11px] uppercase transition active:scale-95 shadow-xl shadow-emerald-500/10">+ Nouveau</button></div>
              <div className="flex flex-col gap-2.5 max-h-[450px] overflow-y-auto pr-1">
                {contacts.map((c:any) => (
                  <div key={c.id} className="p-4 rounded-3xl bg-neutral-950 border border-neutral-800 flex justify-between items-center hover:border-neutral-700 transition-all group shadow-sm">
                    <div className="flex items-center gap-3"><span className="text-xl group-hover:rotate-12 transition duration-300">{c.emoji}</span><p className="text-sm font-black text-neutral-100 uppercase tracking-tight">{c.name}</p></div>
                    <div className="flex gap-2.5">
                      <button onClick={(e) => handleOpenEditContact(e, c)} className="p-3 text-blue-400 active:scale-90 transition hover:bg-neutral-900 rounded-2xl border border-transparent hover:border-neutral-800 shadow-md" title="Renommer"><Edit className="h-4.5 w-4.5" /></button>
                      <button onClick={() => handleEraseAccount(c.id, c.name)} className="p-3 text-rose-400 active:scale-90 transition hover:bg-neutral-900 rounded-2xl border border-transparent hover:border-neutral-800 shadow-md" title="Supprimer"><Trash2 className="h-4.5 w-4.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {currentUser.role === 'admin' && ( <button onClick={handleMasterWipeToZero} className="w-full py-6 bg-rose-600/10 border border-rose-600/30 text-rose-500 font-black uppercase rounded-[40px] transition hover:bg-rose-600 hover:text-white shadow-2xl active:scale-[0.98] tracking-widest text-xs">⚠️ Réinitialiser Tout le Système</button> )}
          </div>
        )}
      </main>

      <nav className="fixed bottom-4 left-0 right-0 z-40 px-4 flex justify-center pointer-events-none">
        <div className="glass-panel border border-neutral-800 rounded-[36px] p-2.5 shadow-2xl flex items-center gap-1.5 pointer-events-auto shadow-emerald-500/5 ring-1 ring-white/10 backdrop-blur-3xl scale-110 sm:scale-100">
          {[
            { id: 'dashboard', label: 'Accueil', icon: <DollarSign className="h-5 w-5" /> },
            { id: 'contacts', label: 'Contacts', icon: <Users className="h-5 w-5" /> },
            { id: 'transactions', label: 'Ops', icon: <ArrowLeftRight className="h-5 w-5" /> },
            { id: 'reminders', label: 'Rappels', icon: <Calendar className="h-5 w-5" /> },
            { id: 'settings', label: 'Param', icon: <Settings className="h-5 w-5" /> },
          ].map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id as any)} className={`flex flex-col items-center gap-1.5 px-5 py-3.5 rounded-[28px] transition-all duration-300 active:scale-90 ${activeSection === s.id ? 'bg-white text-black font-black shadow-2xl scale-105' : 'text-neutral-500 hover:text-neutral-300'}`}>
              {s.icon} <span className="text-[9px] font-black uppercase tracking-tighter">{s.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* --- MODALS --- */}
      {activeModal === 'add_tx' && (
        <div className="fixed inset-0 z-[160] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setActiveModal(null)}>
          <div className="w-full max-w-md bg-[#080808] border border-neutral-800 rounded-[48px] p-10 flex flex-col gap-7 animate-scale-in shadow-2xl shadow-emerald-500/5 ring-1 ring-white/10" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-neutral-900 pb-5 text-emerald-400 px-1"><h3 className="font-black uppercase tracking-[0.2em] text-sm">Nouvelle Opération</h3><button onClick={() => setActiveModal(null)} className="p-2.5 rounded-full bg-neutral-900 transition hover:text-white border border-neutral-800"><X className="h-5 w-5" /></button></div>
            <form onSubmit={handleAddTransaction} className="flex flex-col gap-4">
              <select required className="bg-neutral-900 border border-neutral-800 rounded-[20px] p-5 text-sm text-white font-black outline-none focus:border-emerald-500/50 appearance-none shadow-inner" value={transactionForm.contactId} onChange={e => setTransactionForm(p=>({...p, contactId: e.target.value}))}><option value="">Partenaire</option>{contacts.map((c:any) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}</select>
              <div className="flex gap-3 w-full"><input type="number" step="any" required className="flex-1 min-w-0 bg-neutral-900 border border-neutral-800 rounded-[20px] p-5 text-3xl font-black text-white focus:border-emerald-500/50 outline-none shadow-inner tracking-tighter" placeholder="0.00" value={transactionForm.amount} onChange={e => setTransactionForm(p=>({...p, amount: e.target.value}))} /><select className="bg-neutral-900 border border-neutral-800 rounded-[20px] px-5 font-black text-white outline-none focus:border-neutral-600 shadow-inner" value={transactionForm.currencyCode} onChange={e => setTransactionForm(p=>({...p, currencyCode: e.target.value}))}>{initialActiveCurrencies.map((c:any) => <option key={c.code} value={c.code}>{c.code}</option>)}</select></div>
              <div className="grid grid-cols-3 gap-2.5">
                {['HELD', 'RECEIVABLE', 'PAYABLE'].map(type => (
                  <button key={type} type="button" onClick={() => setTransactionForm(p=>({...p, type}))} className={`py-5 rounded-[20px] text-[10px] font-black uppercase border transition-all flex flex-col items-center gap-1 shadow-md ${transactionForm.type === type ? 'bg-white text-black border-white shadow-emerald-500/10' : 'bg-neutral-900/50 border-neutral-800 text-neutral-500 hover:border-neutral-700'}`}><span>{getTransactionTypeStyle(type).label}</span><span className="text-[7px] font-black opacity-50 tracking-tighter uppercase">{getTransactionTypeStyle(type).note}</span></button>
                ))}
              </div>
              <input type="text" className="bg-neutral-900 border border-neutral-800 rounded-[20px] p-5 text-sm text-white focus:border-neutral-600 outline-none shadow-inner" placeholder="Commentaire / Référence" value={transactionForm.note} onChange={e => setTransactionForm(p=>({...p, note: e.target.value}))} />
              <div className="flex gap-4 mt-4"><button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-5 bg-neutral-900 text-neutral-400 font-black rounded-[24px] uppercase transition active:scale-95 border border-neutral-800 tracking-widest text-xs">Annuler</button><button type="submit" disabled={isPending} className="flex-[2] py-5 bg-emerald-500 text-black font-black rounded-[24px] uppercase shadow-2xl shadow-emerald-500/30 active:scale-95 transition tracking-widest text-xs">Enregistrer</button></div>
            </form>
          </div>
        </div>
      )}

      {activeModal === 'add_contact' && (
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

      {activeModal === 'add_reminder' && (
        <div className="fixed inset-0 z-[160] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={() => setActiveModal(null)}>
          <div className="w-full max-w-sm bg-[#080808] border border-neutral-800 rounded-[48px] p-10 flex flex-col gap-7 animate-scale-in shadow-2xl shadow-amber-500/5 ring-1 ring-white/10" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-neutral-900 pb-5 text-amber-500 px-1"><h3 className="font-black uppercase tracking-[0.2em] text-sm">Planifier Rappel</h3><button onClick={() => setActiveModal(null)} className="p-2.5 rounded-full bg-neutral-900 transition border border-neutral-800"><X className="h-5 w-5" /></button></div>
            <form onSubmit={handleCreateReminderSubmit} className="flex flex-col gap-5">
              <select required className="bg-neutral-900 border border-neutral-800 rounded-[20px] p-5 text-sm text-white font-black outline-none focus:border-amber-500/40 appearance-none shadow-inner" value={reminderForm.contactId} onChange={(e) => setReminderForm(p => ({...p, contactId: e.target.value}))}><option value="">Partenaire</option>{contacts.map((c:any) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}</select>
              <div className="flex gap-3 w-full"><input type="number" step="any" required className="flex-1 min-w-0 bg-neutral-900 border border-neutral-800 rounded-[20px] p-5 text-2xl font-black text-white outline-none focus:border-amber-500/40 shadow-inner tracking-tighter" placeholder="0.00" value={reminderForm.amount} onChange={(e) => setReminderForm(p => ({...p, amount: e.target.value}))} /><select className="bg-neutral-900 border border-neutral-800 rounded-[20px] px-5 font-black text-white outline-none focus:border-neutral-600 shadow-inner" value={reminderForm.currencyCode} onChange={(e) => setReminderForm(p => ({...p, currencyCode: e.target.value}))}>{Object.keys(CURRENCY_SYMBOLS).map(code => <option key={code} value={code}>{code}</option>)}</select></div>
              <input type="date" required className="bg-neutral-900 border border-neutral-800 rounded-[20px] p-5 text-sm text-white font-black outline-none focus:border-neutral-600 shadow-inner" value={reminderForm.dueDate} onChange={(e) => setReminderForm(p => ({...p, dueDate: e.target.value}))} />
              <div className="flex gap-4 mt-4"><button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-5 bg-neutral-900 text-neutral-400 font-black rounded-[24px] uppercase transition border border-neutral-800 tracking-widest text-xs">Annuler</button><button type="submit" disabled={isPending} className="flex-[2] py-5 bg-amber-600 text-white font-black rounded-[24px] uppercase transition active:scale-95 shadow-lg shadow-amber-500/30 active:scale-95 transition tracking-widest text-xs">Enregistrer</button></div>
            </form>
          </div>
        </div>
      )}

      {selectedContact && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end animate-in fade-in duration-300" onClick={() => setSelectedContact(null)}>
          <div className="w-full max-w-md bg-[#050505] border-l border-neutral-800 h-full overflow-y-auto p-7 flex flex-col gap-9 animate-in slide-in-from-right duration-400 shadow-2xl shadow-emerald-500/5" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-neutral-900 pb-6"><div className="flex items-center gap-5"><span className="text-6xl p-3 bg-neutral-900 border border-neutral-800 rounded-3xl shadow-xl">{selectedContact.emoji}</span><div><h3 className="text-3xl font-black text-white uppercase tracking-tighter leading-tight">{selectedContact.name}</h3><p className="text-xs text-neutral-500 uppercase font-black tracking-[0.3em] mt-2">{selectedContact.country || 'GLOBAL'}</p></div></div><button onClick={() => setSelectedContact(null)} className="p-3 bg-neutral-900 border border-neutral-800 rounded-full text-neutral-400 hover:text-white transition active:scale-90 shadow-lg"><X className="h-6 w-6" /></button></div>
            <div className={`p-7 rounded-[40px] border-2 shadow-2xl ring-1 ring-white/5 relative overflow-hidden ${selectedContact.netPositionUsd >= 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}><div className={`absolute -bottom-6 -right-4 opacity-[0.06] pointer-events-none ${selectedContact.netPositionUsd >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}><Coins className="h-32 w-32" /></div><p className="text-[11px] font-black text-neutral-400 uppercase tracking-[0.3em] mb-3 relative">Position Nette Globale</p><p className={`font-black tracking-tighter leading-none break-all relative text-4xl sm:text-5xl ${selectedContact.netPositionUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatUSD(selectedContact.netPositionUsd)}</p></div>
            <div className="flex flex-col gap-4">
              {[
                { label: 'Avoirs détenus', val: selectedContact.heldBalanceUsd, style: 'blue', note: 'Mon argent chez lui' },
                { label: 'Créances', val: selectedContact.receivableBalanceUsd, style: 'emerald', note: 'Il me doit de l\'argent' },
                { label: 'Dettes', val: selectedContact.payableBalanceUsd, style: 'rose', note: 'Je lui dois de l\'argent' }
              ].map(row => (
                <div key={row.label} className={`p-6 bg-neutral-900/40 border border-neutral-800 rounded-[36px] flex justify-between items-center gap-3 shadow-inner group hover:border-${row.style}-500/30 transition-all duration-500`}>
                  <div className="flex flex-col min-w-0"><p className={`text-[11px] font-black text-neutral-400 uppercase tracking-widest group-hover:text-${row.style}-400 transition`}>{row.label}</p><p className={`text-[9px] text-${row.style}-500 font-black italic uppercase mt-1.5 opacity-70 tracking-tighter`}>{row.note}</p></div>
                  <div className="flex flex-col items-end min-w-0">{(() => {
                    const isAvoirs = row.label === 'Avoirs détenus';
                    const tnd = selectedContact.heldBalanceTnd || 0;
                    const showUsd = !isAvoirs || row.val > 0.01 || tnd <= 0.01;
                    return (<>
                      {showUsd && <p className={`font-black text-${row.style}-400 text-2xl sm:text-3xl tracking-tighter break-all text-right transition duration-500`}>{formatUSD(row.val)}</p>}
                      {isAvoirs && tnd > 0.01 && <p className={`font-black text-amber-400 tracking-tighter break-all text-right ${showUsd ? 'text-sm' : 'text-2xl sm:text-3xl'}`}>{formatRawCurrency(tnd, 'TND')}</p>}
                    </>);
                  })()}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-5 mt-4"><h4 className="text-[11px] font-black text-neutral-600 uppercase tracking-[0.3em] border-b border-neutral-900 pb-4 flex items-center gap-3"><Clock className="h-4 w-4" /> Historique Chronologique</h4><div className="flex flex-col gap-3">{transactions.filter((t:any) => t.contactId === selectedContact.id).slice(0,12).map((t:any) => (<div key={t.id} className="p-5 bg-neutral-900/20 border border-neutral-800 rounded-[28px] flex justify-between items-center shadow-sm hover:border-neutral-600 hover:bg-neutral-900/40 transition duration-300"><div className="flex flex-col gap-1"><p className="text-sm font-black text-neutral-100 uppercase tracking-tight">{t.category}</p><p className={`text-[10px] font-black uppercase tracking-widest ${getTransactionTypeStyle(t.type).style === 'blue' ? 'text-blue-500' : getTransactionTypeStyle(t.type).style === 'emerald' ? 'text-emerald-500' : 'text-rose-500'}`}>{getTransactionTypeStyle(t.type).label}</p></div><div className="text-right flex flex-col gap-1"><p className="text-lg font-black text-white tracking-tighter">{formatRawCurrency(t.amount, t.currencyCode)}</p>{t.currencyCode !== 'USD' && <p className="text-[10px] text-neutral-500 font-black tracking-tight">≈ {formatUSD(t.amountInUsd)}</p>}<p className="text-[10px] text-neutral-700 font-black uppercase">{new Date(t.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</p></div></div>))}</div></div>
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

      {lightboxImage && (
        <div className="fixed inset-0 z-[230] bg-black/98 flex items-center justify-center p-4 cursor-pointer animate-in fade-in duration-500 shadow-2xl" onClick={() => setLightboxImage(null)}>
          <button className="absolute top-10 right-10 p-4 bg-neutral-900 border border-neutral-800 text-white rounded-full shadow-2xl transition active:scale-90 hover:bg-neutral-800 border-2 border-white/5"><X className="h-8 w-8" /></button>
          <img src={lightboxImage} alt="Pièce Jointe" className="max-w-full max-h-[85vh] rounded-[64px] object-contain border-8 border-neutral-900 shadow-2xl shadow-emerald-500/10 ring-1 ring-white/10" />
        </div>
      )}
    </div>
  );

  function handleContactFormDeleteClick(id: string) {
    const contact = contacts.find((c:any) => c.id === id);
    if (!contact) return;
    handleEraseAccount(id, contact.name);
  }
}

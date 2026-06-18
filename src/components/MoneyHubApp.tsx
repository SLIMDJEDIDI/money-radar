'use client';

import React, { useState, useTransition, useMemo, useEffect, useOptimistic } from 'react';
import {
  Plus, ArrowLeftRight, Camera, Search, X, ChevronRight, RefreshCw, Clock, ExternalLink,
  UserPlus, Trash2, Users, Settings, Edit, AlertTriangle, Coins, Calendar, LogOut, Lock,
  Sun, Moon, CheckCircle, DollarSign, History, ArrowUpRight
} from 'lucide-react';
import {
  createContact, updateContact, deleteContact,
  createHubTransaction, deleteHubTransaction,
  createReminder, toggleReminderCompleted, deleteReminder,
  resetDatabaseToZero, loginUser
} from '../app/actions';

const CURRENCY_SYMBOLS: Record<string, string> = { USD: '$', EUR: '€', CNY: '¥', TND: 'DT', HKD: 'HK$' };

interface Contact { id: string; name: string; emoji: string; country: string | null; isArchived: boolean; heldBalanceUsd: number; receivableBalanceUsd: number; payableBalanceUsd: number; netPositionUsd: number; }

export default function MoneyHubApp({
  initialContacts, initialCurrencies, initialActiveCurrencies, initialCategories,
  initialTransactions, initialReminders, initialAuditTrails, initialUsers, initialMetrics
}: any) {
  // --- AUTH & THEME ---
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  useEffect(() => {
    const saved = localStorage.getItem('hub_session_user');
    if (saved) setCurrentUser(JSON.parse(saved));
  }, []);

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [activeSection, setActiveSection] = useState<'dashboard' | 'contacts' | 'transactions' | 'reminders' | 'history' | 'settings'>('dashboard');

  // --- DATA STATES ---
  const [contacts, setContacts] = useState(initialContacts);
  const [transactions, setTransactions] = useState(initialTransactions.map((t:any) => ({...t, createdAt: new Date(t.createdAt)})));
  const [metrics, setMetrics] = useState(initialMetrics);
  const [reminders, setReminders] = useState(initialReminders.map((r:any) => ({...r, dueDate: new Date(r.dueDate)})));
  const [auditTrails, setAuditTrails] = useState(initialAuditTrails.map((a:any) => ({...a, createdAt: new Date(a.createdAt)})));

  // --- OPTIMISTIC UI ---
  const [optimisticTransactions, addOptimisticTransaction] = useOptimistic(
    transactions,
    (state: any, newTx: any) => {
      if (newTx.action === 'delete') return state.filter((t:any) => t.id !== newTx.id);
      return [newTx, ...state];
    }
  );

  const [optimisticContacts, addOptimisticContact] = useOptimistic(
    contacts,
    (state: any, newContact: any) => {
      if (newContact.action === 'delete') return state.filter((c:any) => c.id !== newContact.id);
      return [...state, newContact].sort((a:any,b:any) => a.name.localeCompare(b.name));
    }
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

  const formatUSD = (val: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  const formatRawCurrency = (val: number, curr: string) => {
    const symbol = CURRENCY_SYMBOLS[curr] || curr;
    return `${symbol} ${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(val)}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files[0]) setTransactionForm(p => ({ ...p, photo: e.target.files![0] })); };

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
        setAuditTrails(data.auditTrails.map((a: any) => ({ ...a, createdAt: new Date(a.createdAt) })));
        if (selectedContact) {
          const updated = data.contacts.find((c: any) => c.id === selectedContact.id);
          if (updated) setSelectedContact(updated);
        }
      }
    } catch (e) { console.error(e); }
    finally { setTimeout(() => setIsRefreshing(false), 500); }
  };

  const handleLogout = () => { setCurrentUser(null); localStorage.removeItem('hub_session_user'); };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData(); data.append('username', loginForm.username); data.append('password', loginForm.password);
    const res = await loginUser(data);
    if (res.success && res.user) { setCurrentUser(res.user); localStorage.setItem('hub_session_user', JSON.stringify(res.user)); }
    else setLoginError('Identifiants invalides');
  };

  const filteredMovements = useMemo(() => {
    return optimisticTransactions.filter((t: any) => 
      !searchQuery || 
      t.contact?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      t.note?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [optimisticTransactions, searchQuery]);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const contact = contacts.find((c:any) => c.id === transactionForm.contactId);
    const amount = parseFloat(transactionForm.amount);
    startTransition(async () => {
      addOptimisticTransaction({ id: Math.random().toString(), amount, currencyCode: transactionForm.currencyCode, amountInUsd: amount, contact, type: transactionForm.type, category: transactionForm.category, note: transactionForm.note, createdAt: new Date() });
      const data = new FormData(); Object.entries(transactionForm).forEach(([k,v]) => data.append(k, v as any)); data.append('modifiedBy', currentUser.username);
      const res = await createHubTransaction(data, currentUser.username);
      if (res.success) { setActiveModal(null); await refreshHubState(); }
    });
  };

  const handleDeleteTx = (id: string) => {
    setConfirmModal({ isOpen: true, title: 'Supprimer ?', description: 'Action auditée.', confirmText: 'Supprimer', isDanger: true, onConfirm: async () => {
      startTransition(async () => { addOptimisticTransaction({ id, action: 'delete' }); await deleteHubTransaction(id, currentUser.username); await refreshHubState(); });
    }});
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      addOptimisticContact({ id: 'temp', name: contactForm.name, emoji: contactForm.emoji, netPositionUsd: 0, heldBalanceUsd:0, receivableBalanceUsd:0, payableBalanceUsd:0 });
      const data = new FormData();
      Object.entries(contactForm).forEach(([k,v]) => data.append(k, v as any));
      const res = await createContact(data, currentUser.username);
      if (res.success) { setActiveModal(null); await refreshHubState(); }
    });
  };

  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault(); if (!contactForm.id || !contactForm.name) return;
    const data = new FormData(); data.append('contactId', contactForm.id); data.append('name', contactForm.name); data.append('emoji', contactForm.emoji); data.append('country', contactForm.country); data.append('isArchived', contactForm.isArchived ? 'true' : 'false');
    startTransition(async () => {
      const res = await updateContact(data, currentUser.username);
      if (res.success) { setContactForm({ id: '', name: '', emoji: '👤', country: '', isArchived: false }); setActiveModal(null); await refreshHubState(); }
      else alert(res.error);
    });
  };

  const handleOpenEditContact = (e: React.MouseEvent, c: any) => {
    e.preventDefault();
    e.stopPropagation();
    setContactForm({ id: c.id, name: c.name, emoji: c.emoji, country: c.country || '', isArchived: !!c.isArchived });
    setActiveModal('edit_contact');
  };

  const handleCreateReminderSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!reminderForm.contactId || !reminderForm.amount || !reminderForm.dueDate) return;
    const data = new FormData(); data.append('contactId', reminderForm.contactId); data.append('amount', reminderForm.amount); data.append('currencyCode', reminderForm.currencyCode); data.append('dueDate', reminderForm.dueDate); data.append('note', reminderForm.note);
    startTransition(async () => {
      const res = await createReminder(data);
      if (res.success) { setReminderForm({ contactId: '', amount: '', currencyCode: 'USD', dueDate: '', note: '' }); setActiveModal(null); await refreshHubState(); }
    });
  };

  const handleToggleReminder = async (id: string, isDone: boolean) => { startTransition(async () => { await toggleReminderCompleted(id, isDone); await refreshHubState(); }); };

  const handleMasterWipeToZero = () => {
    setConfirmModal({ isOpen: true, title: '⚠️ WIPE GLOBAL ?', description: 'Action irréversible. Mot de passe :', confirmText: 'Wipe', isDanger: true, requirePassword: true, onConfirm: async (p: any) => {
      startTransition(async () => { const res = await resetDatabaseToZero(p, currentUser?.id); if (res.success) { setSelectedContact(null); setActiveModal(null); await refreshHubState(); } else alert(res.error); });
    }});
  };

  const handleStartInlineEdit = (contact: any) => { setEditingHolderId(contact.id); setEditFormData({ name: contact.name, emoji: contact.emoji, color: 'blue' }); };
  const handleSaveInlineEdit = async (e: React.FormEvent, id: string) => {
    e.preventDefault(); const data = new FormData(); data.append('contactId', id); data.append('name', editFormData.name); data.append('emoji', editFormData.emoji); data.append('country', ''); data.append('isArchived', 'false');
    startTransition(async () => { const res = await updateContact(data, currentUser.username); if (res.success) { setEditingHolderId(null); await refreshHubState(); } else alert(res.error); });
  };

  const handleEraseAccount = (id: string, name: string) => {
    setConfirmModal({ isOpen: true, title: '🗑️ SUPPRIMER CONTACT', description: `Supprimer ${name} ?`, confirmText: 'Supprimer', cancelText: 'Annuler', isDanger: true, onConfirm: async () => {
      startTransition(async () => { const res = await deleteContact(id, currentUser.username); if (res.success) { if (selectedContact?.id === id) setSelectedContact(null); await refreshHubState(); } else alert(res.error); });
    }});
  };

  const handleSelectContact = (c: Contact) => setSelectedContact(c);

  const getTransactionTypeStyle = (type: string) => {
    switch (type) {
      case 'HELD': return { text: 'text-blue-400', label: 'Avoirs', bg: 'bg-blue-500/10 border-blue-500/20', note: 'Mon argent chez lui' };
      case 'RECEIVABLE': return { text: 'text-emerald-400', label: 'Créance', bg: 'bg-emerald-500/10 border-emerald-500/20', note: 'Il me doit de l\'argent' };
      case 'PAYABLE': return { text: 'text-rose-400', label: 'Dette', bg: 'bg-rose-500/10 border-rose-500/20', note: 'Je lui dois de l\'argent' };
      default: return { text: 'text-neutral-400', label: '?', bg: 'bg-neutral-500/10 border-neutral-500/20', note: '' };
    }
  };

  if (!currentUser) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="w-full max-w-sm glass-panel border border-neutral-800 rounded-3xl p-8 flex flex-col gap-6 text-center shadow-2xl relative animate-scale-in">
        <div className="flex flex-col gap-1 items-center"><span className="p-3 bg-neutral-900 border border-neutral-800 text-emerald-400 rounded-2xl mb-2"><Lock className="h-6 w-6" /></span><h1 className="text-2xl font-black tracking-wider uppercase">MONEY HUB</h1></div>
        <form onSubmit={handleLogin} className="flex flex-col gap-4 mt-2">
          <input type="text" required placeholder="Identifiant" value={loginForm.username} onChange={(e) => setLoginForm(p => ({ ...p, username: e.target.value }))} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 px-4 text-sm focus:border-emerald-500/50 outline-none text-white" />
          <input type="password" required placeholder="Mot de passe" value={loginForm.password} onChange={(e) => setLoginForm(p => ({ ...p, password: e.target.value }))} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 px-4 text-sm focus:border-emerald-500/50 outline-none text-white" />
          {loginError && <p className="text-rose-400 text-xs font-bold">{loginError}</p>}
          <button type="submit" className="w-full py-3 bg-emerald-500 text-black font-black uppercase rounded-xl active:scale-95 transition shadow-lg shadow-emerald-500/20">Accéder</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen pb-28 ambient-bg ${theme === 'light' ? 'bg-neutral-50 text-black' : 'bg-[#050505] text-white'}`}>
      <header className="sticky top-0 z-40 bg-[#050505]/90 backdrop-blur-xl border-b border-neutral-900/50 p-4">
        <div className="max-w-4xl mx-auto flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2.5"><div className="h-8 w-8 rounded-xl bg-emerald-500 flex items-center justify-center text-black font-black">H</div><h1 className="text-lg font-black tracking-widest uppercase">MONEY HUB</h1></div>
            <div className="flex gap-2">
              <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className="p-2 rounded-full bg-neutral-900 border border-neutral-800 transition active:scale-90">{theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
              <button onClick={refreshHubState} className="p-2 rounded-full bg-neutral-900 border border-neutral-800 transition active:scale-90 shadow-lg"><RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} /></button>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setTransactionForm({ contactId: '', amount: '', currencyCode: 'USD', type: 'HELD', category: 'Virement', note: '' }); setActiveModal('add_tx'); }} className="flex-1 py-3.5 bg-emerald-500 text-black font-black uppercase text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition"> <Plus className="h-5 w-5 stroke-[3]" /> Opération </button>
            <button onClick={() => setActiveModal('add_contact')} className="px-5 py-3.5 bg-neutral-900 border border-neutral-800 text-white font-black uppercase text-xs rounded-2xl active:scale-[0.98] transition shadow-md"> <UserPlus className="h-5 w-5" /> </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <input type="text" placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl py-3 pl-10 pr-9 text-sm focus:border-emerald-500/40 transition outline-none text-white" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 flex flex-col gap-6 animate-fade-up">
        {activeSection === 'dashboard' && (
          <div className="flex flex-col gap-5">
            <div className="bg-gradient-to-br from-neutral-900 to-black border border-neutral-800 p-7 rounded-[32px] shadow-2xl relative overflow-hidden">
              <p className="text-[11px] font-black text-neutral-400 uppercase tracking-widest">Position Nette Mondiale</p>
              <h2 className="text-5xl font-black mt-2 tracking-tighter">{formatUSD(metrics.netPosition)}</h2>
              <p className="text-[10px] text-emerald-500/80 mt-2 font-bold uppercase tracking-widest italic">Position Globale Aggregée · USD</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { type: 'HELD', label: 'Avoirs', icon: <Coins />, val: metrics.totalAvoirs, style: 'blue' },
                { type: 'RECEIVABLE', label: 'À recevoir', icon: <ArrowUpRight />, val: metrics.totalReceivables, style: 'emerald' },
                { type: 'PAYABLE', label: 'À payer', icon: <ArrowLeftRight />, val: metrics.totalPayables, style: 'rose' },
                { type: 'REMINDER', label: 'Rappels', icon: <Calendar />, val: metrics.upcomingPayments, style: 'amber' }
              ].map(card => (
                <div key={card.label} onClick={() => { if(card.type === 'REMINDER') setActiveSection('reminders'); else { setContactFilterType(card.type as any); setActiveSection('contacts'); } }} className={`bg-neutral-900/40 border border-neutral-800 p-4 rounded-2xl cursor-pointer hover:border-${card.style}-500/40 transition active:scale-[0.97]`}>
                  <p className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">{card.label}</p>
                  <p className={`text-2xl font-black text-${card.style}-400 mt-2`}>{formatUSD(card.val)}</p>
                  <p className={`text-[8px] text-${card.style}-400/70 font-black italic uppercase mt-1`}>{getTransactionTypeStyle(card.type).note || 'Échéances à venir'}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              {optimisticContacts.slice(0, 4).map((c: any) => (
                <div key={c.id} onClick={() => handleSelectContact(c)} className="bg-neutral-900/60 border border-neutral-800 p-4 rounded-2xl flex justify-between items-center active:scale-[0.98] transition cursor-pointer hover:border-neutral-700">
                  <div className="flex items-center gap-3"><span className="text-2xl">{c.emoji}</span><p className="font-black text-white text-base uppercase tracking-tight">{c.name}</p></div>
                  <p className={`text-sm font-black ${c.netPositionUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatUSD(c.netPositionUsd)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'contacts' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div onClick={() => setActiveModal('add_contact')} className="border border-dashed border-neutral-800 p-8 rounded-3xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-neutral-900/20 active:scale-95 transition text-neutral-500">
              <Plus className="h-7 w-7 text-emerald-500" /><p className="text-xs font-black uppercase tracking-widest">Nouveau Partenaire</p>
            </div>
            {optimisticContacts.map((c: any) => (
              <div key={c.id} className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl flex flex-col gap-5 hover:border-neutral-700 transition shadow-lg">
                <div className="flex justify-between items-start">
                  <div onClick={() => setSelectedContact(c)} className="flex items-center gap-3 cursor-pointer">
                    <span className="text-3xl">{c.emoji}</span>
                    <div><p className="font-black text-white text-xl uppercase tracking-tighter leading-tight">{c.name}</p><p className="text-[10px] text-neutral-500 uppercase font-black tracking-widest mt-1">{c.country}</p></div>
                  </div>
                  <button onClick={(e) => handleOpenEditContact(e, c)} className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-blue-400 active:scale-90 transition shadow-md hover:bg-neutral-900"><Edit className="h-4 w-4" /></button>
                </div>
                <div className="grid grid-cols-3 gap-2 border-t border-neutral-800 pt-4 text-[10px] text-center font-black uppercase tracking-tighter">
                  <div className="flex flex-col gap-1"><p className="text-neutral-500">Avoirs</p><p className="text-blue-400 font-black">{formatUSD(c.heldBalanceUsd)}</p></div>
                  <div className="flex flex-col gap-1"><p className="text-neutral-500">Créances</p><p className="text-emerald-400 font-black">{formatUSD(c.receivableBalanceUsd)}</p></div>
                  <div className="flex flex-col gap-1"><p className="text-neutral-500">Dettes</p><p className="text-rose-400 font-black">{formatUSD(c.payableBalanceUsd)}</p></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeSection === 'transactions' && (
          <div className="flex flex-col gap-3 animate-fade-up">
            {filteredMovements.map((t: any) => (
              <div key={t.id} className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3"><span className="text-2xl p-2 bg-neutral-950 rounded-xl border border-neutral-800 shadow-inner">{t.contact?.emoji}</span><div><p className="text-sm font-black text-white uppercase tracking-tight">{t.contact?.name}</p><p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">{t.category} · {getTransactionTypeStyle(t.type).label}</p></div></div>
                <div className="text-right flex items-center gap-3"><div><p className="text-sm font-black text-white">{formatUSD(t.amountInUsd)}</p><p className="text-[10px] text-neutral-500 font-bold">{t.createdAt.toLocaleDateString()}</p></div><button onClick={() => handleDeleteTx(t.id)} className="p-2 text-rose-500 active:scale-90 transition hover:bg-rose-500/10 rounded-lg"><Trash2 className="h-4 w-4" /></button></div>
              </div>
            ))}
          </div>
        )}

        {activeSection === 'reminders' && (
          <div className="flex flex-col gap-6 animate-fade-up">
            <button onClick={() => setActiveModal('add_reminder')} className="w-full py-4 bg-amber-600 text-white font-black uppercase rounded-2xl active:scale-95 transition shadow-lg shadow-amber-900/20">+ Créer un Rappel</button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-3"><h3 className="text-xs font-black text-rose-400 uppercase tracking-widest flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Retards</h3>
                {reminders.filter((r:any) => !r.isCompleted && new Date(r.dueDate) < new Date()).map((r:any) => (
                  <div key={r.id} className="p-4 rounded-2xl border border-rose-950 bg-rose-950/10 flex justify-between items-center shadow-inner">
                    <div><p className="text-xs font-black text-rose-400 uppercase">{r.contact?.name}</p><p className="text-sm font-black mt-1 uppercase text-neutral-200 tracking-tighter">{formatRawCurrency(r.amount, r.currencyCode)}</p><p className="text-[9px] text-rose-500 uppercase mt-1 font-black">LE {new Date(r.dueDate).toLocaleDateString()}</p></div>
                    <button onClick={() => handleToggleReminder(r.id, true)} className="p-2.5 rounded-full bg-emerald-500 text-black active:scale-90 transition shadow-lg"><CheckCircle className="h-5 w-5" /></button>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-3"><h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest">Échéances</h3>
                {reminders.filter((r:any) => !r.isCompleted && new Date(r.dueDate) >= new Date()).map((r:any) => (
                  <div key={r.id} className="p-4 rounded-2xl border border-neutral-800 bg-neutral-900/40 flex justify-between items-center shadow-inner">
                    <div><p className="text-xs font-black text-white uppercase">{r.contact?.name}</p><p className="text-sm font-black mt-1 uppercase text-neutral-300 tracking-tighter">{formatRawCurrency(r.amount, r.currencyCode)}</p><p className="text-[9px] text-amber-500 uppercase mt-1 font-black">LE {new Date(r.dueDate).toLocaleDateString()}</p></div>
                    <button onClick={() => handleToggleReminder(r.id, true)} className="p-2.5 rounded-full bg-emerald-500 text-black active:scale-90 transition shadow-lg"><CheckCircle className="h-5 w-5" /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'history' && (
          <div className="flex flex-col gap-3 animate-fade-up">
            <h2 className="text-xs font-black text-neutral-500 uppercase tracking-widest mb-2 flex items-center gap-2"> <History className="h-4 w-4" /> Historique de Traçabilité </h2>
            <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
              {auditTrails.map((a: any) => (
                <div key={a.id} className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl flex flex-col gap-2 shadow-inner">
                  <div className="flex justify-between items-start"><p className="text-[9px] font-black px-1.5 py-0.5 rounded bg-neutral-950 text-neutral-400 uppercase tracking-widest border border-neutral-800">{a.entityType} : {a.action}</p><p className="text-[9px] text-neutral-500 font-black uppercase">{new Date(a.createdAt).toLocaleString()}</p></div>
                  <p className="text-xs font-bold text-neutral-300 leading-snug">{a.details}</p>
                  <p className="text-[9px] text-neutral-600 font-black uppercase italic">Exécuté par : <span className="text-emerald-500/80">{a.modifiedBy}</span></p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'settings' && (
          <div className="flex flex-col gap-6 animate-fade-up">
            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-[32px] flex justify-between items-center shadow-2xl"><div><p className="text-sm font-black text-white uppercase tracking-tight">{currentUser.username}</p><p className="text-[10px] text-neutral-500 uppercase font-black tracking-widest mt-1">{currentUser.role}</p></div><button onClick={handleLogout} className="p-3 bg-rose-950/20 text-rose-400 rounded-2xl border border-rose-900/40 transition active:scale-90 hover:bg-rose-900/40 shadow-lg"><LogOut className="h-5 w-5" /></button></div>
            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-[32px] flex flex-col gap-6 shadow-2xl">
              <div className="flex justify-between items-center border-b border-neutral-800 pb-4"><h3 className="text-sm font-black uppercase text-neutral-200 flex items-center gap-2"><Settings className="h-4 w-4" /> Répertoire & Édition</h3> <button onClick={() => setActiveModal('add_contact')} className="py-2 px-5 rounded-xl bg-emerald-500 text-black font-black text-[10px] uppercase transition active:scale-95 shadow-lg">+ Partenaire</button></div>
              <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                {contacts.map((c:any) => (
                  <div key={c.id} className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex justify-between items-center hover:border-neutral-700 transition-all group">
                    <div className="flex items-center gap-3"><span className="text-xl group-hover:scale-125 transition duration-300">{c.emoji}</span><p className="text-sm font-black text-neutral-100 uppercase tracking-tight">{c.name}</p></div>
                    <div className="flex gap-2">
                      <button onClick={(e) => handleOpenEditContact(e, c)} className="p-2.5 text-blue-400 active:scale-90 transition hover:bg-neutral-900 rounded-xl border border-transparent hover:border-neutral-800" title="Éditer"><Edit className="h-4 w-4" /></button>
                      <button onClick={() => handleEraseAccount(c.id, c.name)} className="p-2.5 text-rose-400 active:scale-90 transition hover:bg-neutral-900 rounded-xl border border-transparent hover:border-neutral-800" title="Effacer"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {currentUser.role === 'admin' && ( <button onClick={handleMasterWipeToZero} className="w-full py-5 bg-rose-600/10 border border-rose-600/30 text-rose-500 font-black uppercase rounded-[32px] transition hover:bg-rose-600 hover:text-white shadow-2xl active:scale-[0.98]">⚠️ Réinitialiser Tout à Zéro</button> )}
          </div>
        )}
      </main>

      <nav className="fixed bottom-4 left-0 right-0 z-40 px-4 flex justify-center pointer-events-none">
        <div className="glass-panel border border-neutral-800 rounded-[32px] p-2 shadow-2xl flex items-center gap-1 pointer-events-auto shadow-emerald-500/5 ring-1 ring-white/5">
          {[
            { id: 'dashboard', label: 'Accueil', icon: <DollarSign className="h-4 w-4" /> },
            { id: 'contacts', label: 'Contacts', icon: <Users className="h-4 w-4" /> },
            { id: 'transactions', label: 'Ops', icon: <ArrowLeftRight className="h-4 w-4" /> },
            { id: 'history', label: 'Audit', icon: <History className="h-4 w-4" /> },
            { id: 'settings', label: 'Param', icon: <Settings className="h-4 w-4" /> },
          ].map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id as any)} className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-[24px] transition-all duration-300 active:scale-90 ${activeSection === s.id ? 'bg-white text-black font-black shadow-lg' : 'text-neutral-500 hover:text-neutral-300'}`}>
              {s.icon} <span className="text-[8px] font-black uppercase tracking-widest">{s.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* --- MODALS --- */}
      {activeModal === 'add_tx' && (
        <div className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setActiveModal(null)}>
          <div className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-[40px] p-8 flex flex-col gap-6 animate-scale-in shadow-2xl shadow-emerald-500/5 ring-1 ring-white/10" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-neutral-900 pb-4 text-emerald-400"><h3 className="font-black uppercase tracking-widest text-base">Nouvelle Opération</h3><button onClick={() => setActiveModal(null)} className="p-2 rounded-full bg-neutral-900 transition hover:text-white"><X className="h-5 w-5" /></button></div>
            <form onSubmit={handleAddTransaction} className="flex flex-col gap-4">
              <select required className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-sm text-white font-black outline-none focus:border-emerald-500/50" value={transactionForm.contactId} onChange={e => setTransactionForm(p=>({...p, contactId: e.target.value}))}><option value="">Partenaire</option>{contacts.map((c:any) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}</select>
              <div className="flex gap-2"><input type="number" step="any" required className="flex-1 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-2xl font-black text-white focus:border-emerald-500/50 outline-none" placeholder="0.00" value={transactionForm.amount} onChange={e => setTransactionForm(p=>({...p, amount: e.target.value}))} /><select className="bg-neutral-900 border border-neutral-800 rounded-2xl px-4 font-black text-white outline-none" value={transactionForm.currencyCode} onChange={e => setTransactionForm(p=>({...p, currencyCode: e.target.value}))}>{initialActiveCurrencies.map((c:any) => <option key={c.code} value={c.code}>{c.code}</option>)}</select></div>
              <div className="grid grid-cols-3 gap-2">{['HELD', 'RECEIVABLE', 'PAYABLE'].map(type => (<button key={type} type="button" onClick={() => setTransactionForm(p=>({...p, type}))} className={`py-4 rounded-2xl text-[9px] font-black uppercase border transition flex flex-col items-center gap-1 ${transactionForm.type === type ? 'bg-white text-black border-white shadow-xl' : 'border-neutral-800 text-neutral-500 hover:border-neutral-700'}`}><span>{getTransactionTypeStyle(type).label}</span><span className={`text-[6.5px] font-black opacity-60 uppercase tracking-tighter`}>{getTransactionTypeStyle(type).note}</span></button>))}</div>
              <input type="text" className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-sm text-white focus:border-neutral-600 outline-none" placeholder="Commentaire / Note" value={transactionForm.note} onChange={e => setTransactionForm(p=>({...p, note: e.target.value}))} />
              <div className="flex gap-3 mt-3"><button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-4 bg-neutral-900 text-neutral-400 font-black rounded-2xl uppercase transition active:scale-95 border border-neutral-800">Annuler</button><button type="submit" disabled={isPending} className="flex-[2] py-4 bg-emerald-500 text-black font-black rounded-2xl uppercase shadow-lg shadow-emerald-500/30 active:scale-95 transition">Enregistrer</button></div>
            </form>
          </div>
        </div>
      )}

      {activeModal === 'add_contact' && (
        <div className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setActiveModal(null)}>
          <div className="w-full max-w-sm bg-neutral-950 border border-neutral-800 rounded-[40px] p-8 flex flex-col gap-6 animate-scale-in shadow-2xl ring-1 ring-white/10" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-neutral-900 pb-3 text-emerald-400"><h3 className="font-black uppercase tracking-widest text-base">Nouveau Partenaire</h3><button onClick={() => setActiveModal(null)} className="p-2 rounded-full bg-neutral-900 transition"><X className="h-5 w-5" /></button></div>
            <form onSubmit={handleAddContact} className="flex flex-col gap-4">
              <div className="flex gap-3"><input type="text" className="w-20 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-center text-2xl outline-none focus:border-emerald-500/40" value={contactForm.emoji} onChange={(e) => setContactForm(p => ({...p, emoji: e.target.value}))} /><input type="text" required className="flex-1 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-white font-black outline-none focus:border-emerald-500/40" placeholder="Nom complet" value={contactForm.name} onChange={(e) => setContactForm(p => ({...p, name: e.target.value}))} /></div>
              <input type="text" className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-white font-black outline-none focus:border-neutral-600" placeholder="Pays / Ville" value={contactForm.country} onChange={(e) => setContactForm(p => ({...p, country: e.target.value}))} />
              <div className="flex gap-3 mt-3"><button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-4 bg-neutral-900 text-neutral-400 font-black rounded-2xl uppercase active:scale-95 transition border border-neutral-800">Annuler</button><button type="submit" disabled={isPending} className="flex-[2] py-4 bg-white text-black font-black rounded-2xl uppercase active:scale-95 transition shadow-2xl">Créer</button></div>
            </form>
          </div>
        </div>
      )}

      {activeModal === 'edit_contact' && (
        <div className="fixed inset-0 z-[160] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 shadow-2xl" onClick={() => setActiveModal(null)}>
          <div className="w-full max-w-sm bg-neutral-950 border border-blue-500/50 rounded-[40px] p-8 flex flex-col gap-7 animate-scale-in shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-neutral-900 pb-4 text-blue-400"><h3 className="font-black uppercase tracking-widest text-base">Modifier Partenaire</h3><button onClick={() => setActiveModal(null)} className="p-2 bg-neutral-900 rounded-full text-neutral-400 hover:text-white transition shadow-lg border border-neutral-800"><X className="h-5 w-5" /></button></div>
            <form onSubmit={handleUpdateContact} className="flex flex-col gap-5">
              <div className="flex gap-3"><input type="text" className="w-20 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-center text-2xl outline-none focus:border-blue-500/50 shadow-inner" value={contactForm.emoji} onChange={(e) => setContactForm(p => ({...p, emoji: e.target.value}))} /><input type="text" required className="flex-1 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-white font-black outline-none focus:border-blue-500/50 shadow-inner" value={contactForm.name} onChange={(e) => setContactForm(p => ({...p, name: e.target.value}))} /></div>
              <input type="text" className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-sm text-white font-black outline-none focus:border-neutral-600 shadow-inner" value={contactForm.country} onChange={(e) => setContactForm(p => ({...p, country: e.target.value}))} />
              <label className="flex items-center gap-4 text-xs font-black text-neutral-400 cursor-pointer select-none py-3 hover:text-white transition"><input type="checkbox" checked={contactForm.isArchived} onChange={(e) => setContactForm(p => ({...p, isArchived: e.target.checked}))} className="accent-blue-500 h-6 w-6" /> Archiver le contact</label>
              <div className="flex gap-3 mt-2"><button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-4 bg-neutral-900 text-neutral-400 font-black rounded-2xl uppercase transition active:scale-95 border border-neutral-800">Annuler</button><button type="submit" disabled={isPending} className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl uppercase shadow-lg shadow-blue-500/40 active:scale-95 transition">Sauver</button></div>
            </form>
          </div>
        </div>
      )}

      {activeModal === 'add_reminder' && (
        <div className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={() => setActiveModal(null)}>
          <div className="w-full max-w-sm bg-neutral-950 border border-neutral-800 rounded-[40px] p-8 flex flex-col gap-6 animate-scale-in shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-neutral-900 pb-3 text-amber-500"><h3 className="font-black uppercase tracking-widest text-base">Nouveau Rappel</h3><button onClick={() => setActiveModal(null)}><X className="h-5 w-5" /></button></div>
            <form onSubmit={handleCreateReminderSubmit} className="flex flex-col gap-4">
              <select required className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-sm text-white font-black outline-none focus:border-amber-500/40" value={reminderForm.contactId} onChange={(e) => setReminderForm(p => ({...p, contactId: e.target.value}))}><option value="">Partenaire</option>{contacts.map((c:any) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}</select>
              <div className="flex gap-2"><input type="number" step="any" required className="flex-1 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-white font-black outline-none focus:border-amber-500/40" placeholder="0.00" value={reminderForm.amount} onChange={(e) => setReminderForm(p => ({...p, amount: e.target.value}))} /><select className="bg-neutral-900 border border-neutral-800 rounded-2xl px-2 text-white font-black outline-none cursor-pointer" value={reminderForm.currencyCode} onChange={(e) => setReminderForm(p => ({...p, currencyCode: e.target.value}))}>{Object.keys(CURRENCY_SYMBOLS).map(code => <option key={code} value={code}>{code}</option>)}</select></div>
              <input type="date" required className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-sm text-white font-black outline-none focus:border-neutral-600" value={reminderForm.dueDate} onChange={(e) => setReminderForm(p => ({...p, dueDate: e.target.value}))} />
              <div className="flex gap-3 mt-3"><button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-4 bg-neutral-900 text-neutral-400 font-black rounded-2xl uppercase transition border border-neutral-800">Annuler</button><button type="submit" disabled={isPending} className="flex-[2] py-4 bg-amber-600 text-white font-black rounded-2xl uppercase shadow-lg shadow-amber-500/30 active:scale-95 transition">Enregistrer</button></div>
            </form>
          </div>
        </div>
      )}

      {selectedContact && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end" onClick={() => setSelectedContact(null)}>
          <div className="w-full max-w-md bg-neutral-950 border-l border-neutral-800 h-full overflow-y-auto p-7 flex flex-col gap-8 animate-in slide-in-from-right duration-300 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-neutral-900 pb-5"><div className="flex items-center gap-4"><span className="text-5xl">{selectedContact.emoji}</span><div><h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-tight">{selectedContact.name}</h3><p className="text-[11px] text-neutral-500 uppercase font-black tracking-widest mt-1">{selectedContact.country}</p></div></div><button onClick={() => setSelectedContact(null)} className="p-2.5 bg-neutral-900 rounded-full text-neutral-400 hover:text-white transition border border-neutral-800"><X className="h-5 w-5" /></button></div>
            <div className={`p-8 rounded-[48px] border shadow-2xl ring-1 ring-white/5 ${selectedContact.netPositionUsd >= 0 ? 'bg-emerald-500/5 border-emerald-500/25' : 'bg-rose-500/5 border-rose-500/25'}`}><p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2 opacity-60">Position Nette Globale</p><p className={`text-5xl font-black tracking-tighter ${selectedContact.netPositionUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatUSD(selectedContact.netPositionUsd)}</p></div>
            <div className="flex flex-col gap-3">
              {[
                { label: 'Avoirs détenus', val: selectedContact.heldBalanceUsd, style: 'blue', note: 'Mon argent chez lui' },
                { label: 'Créances', val: selectedContact.receivableBalanceUsd, style: 'emerald', note: 'Il me doit de l\'argent' },
                { label: 'Dettes', val: selectedContact.payableBalanceUsd, style: 'rose', note: 'Je lui dois de l\'argent' }
              ].map(row => (
                <div key={row.label} className={`p-5 bg-${row.style}-500/5 border border-${row.style}-500/10 rounded-[32px] flex justify-between items-center shadow-inner group hover:border-${row.style}-500/30 transition-all duration-300`}>
                  <div className="flex flex-col"><p className={`text-[10px] font-black text-neutral-400 uppercase tracking-widest group-hover:text-${row.style}-400 transition`}>{row.label}</p><p className={`text-[9px] text-${row.style}-500 font-black italic uppercase mt-1 opacity-70`}>{row.note}</p></div>
                  <p className={`font-black text-${row.style}-400 text-2xl tracking-tighter`}>{formatUSD(row.val)}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-4 mt-2"><h4 className="text-[11px] font-black text-neutral-500 uppercase tracking-[0.2em] border-b border-neutral-900 pb-3 flex items-center gap-2"><Clock className="h-4 w-4" /> Historique récent</h4><div className="flex flex-col gap-2.5">{transactions.filter((t:any) => t.contactId === selectedContact.id).slice(0,12).map((t:any) => (<div key={t.id} className="p-4 bg-neutral-900/40 border border-neutral-800 rounded-2xl flex justify-between items-center shadow-sm hover:border-neutral-700 transition"><div className="flex flex-col gap-0.5"><p className="text-xs font-black text-neutral-200 uppercase tracking-tight">{t.category}</p><p className={`text-[9px] font-black uppercase tracking-widest ${getTransactionTypeStyle(t.type).text}`}>{getTransactionTypeStyle(t.type).label}</p></div><div className="text-right flex flex-col gap-0.5"><p className="text-sm font-black text-white">{formatUSD(t.amountInUsd)}</p><p className="text-[9px] text-neutral-600 font-bold uppercase">{new Date(t.createdAt).toLocaleDateString()}</p></div></div>))}</div></div>
          </div>
        </div>
      )}

      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in scale-in duration-200" onClick={() => setConfirmModal({isOpen: false})}>
          <div className="w-full max-w-sm bg-neutral-950 border border-neutral-800 rounded-[40px] p-10 text-center flex flex-col gap-7 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col gap-3 items-center"><div className={`p-5 rounded-3xl shadow-xl ${confirmModal.isDanger ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}><AlertTriangle className="h-9 w-9" /></div><h3 className="text-xl font-black uppercase text-white tracking-widest mt-2">{confirmModal.title}</h3><p className="text-xs text-neutral-400 font-bold leading-relaxed">{confirmModal.description}</p></div>
            {confirmModal.requirePassword && ( <input type="password" placeholder="Mot de passe" className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-5 text-center text-sm outline-none text-white focus:border-neutral-600 shadow-inner font-black" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} /> )}
            <div className="flex gap-3"><button onClick={() => setConfirmModal({isOpen:false})} className="flex-1 py-4 bg-neutral-900 text-neutral-400 font-black rounded-2xl uppercase transition active:scale-95 border border-neutral-800">Non</button><button onClick={async () => { const p = confirmPassword; setConfirmModal({isOpen:false}); setConfirmPassword(''); await confirmModal.onConfirm(p); }} className={`flex-1 py-4 font-black uppercase rounded-2xl transition active:scale-95 shadow-xl ${confirmModal.isDanger ? 'bg-rose-600 text-white shadow-rose-900/40' : 'bg-emerald-500 text-black shadow-emerald-900/40'}`}>{confirmModal.confirmText}</button></div>
          </div>
        </div>
      )}

      {lightboxImage && (
        <div className="fixed inset-0 z-[210] bg-black/98 flex items-center justify-center p-4 cursor-pointer animate-in fade-in duration-300" onClick={() => setLightboxImage(null)}>
          <button className="absolute top-8 right-8 p-3 bg-neutral-900 border border-neutral-800 text-white rounded-full shadow-2xl transition active:scale-90 hover:bg-neutral-800"><X className="h-6 w-6" /></button>
          <img src={lightboxImage} alt="Pièce Jointe" className="max-w-full max-h-[85vh] rounded-[40px] object-contain border-4 border-neutral-900 shadow-2xl shadow-emerald-500/5" />
        </div>
      )}
    </div>
  );
}

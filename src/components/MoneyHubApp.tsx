'use client';

import React, { useState, useTransition, useMemo, useEffect, useOptimistic } from 'react';
import {
  Plus, ArrowLeftRight, Camera, Search, X, ChevronRight, RefreshCw, Clock, ExternalLink,
  UserPlus, Trash2, Users, Settings, Edit, AlertTriangle, Coins, Calendar, LogOut, Lock,
  Sun, Moon, CheckCircle, DollarSign, History
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

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [contactFilterType, setContactFilterType] = useState<'ALL' | 'HELD' | 'RECEIVABLE' | 'PAYABLE'>('ALL');

  const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [editingHolderId, setEditingHolderId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', emoji: '', color: 'blue' });

  const [transactionForm, setTransactionForm] = useState({ contactId: '', amount: '', currencyCode: 'USD', type: 'HELD', category: 'Virement', note: '' });
  const [contactForm, setContactForm] = useState({ id: '', name: '', emoji: '👤', country: '' });
  const [reminderForm, setReminderForm] = useState({ contactId: '', amount: '', currencyCode: 'USD', dueDate: '', note: '' });

  const formatUSD = (val: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  const formatRawCurrency = (val: number, curr: string) => {
    const symbol = CURRENCY_SYMBOLS[curr] || curr;
    return `${symbol} ${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(val)}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files[0]) setTransactionForm(p => ({ ...p, photo: e.target.files![0] })); };

  const refreshHubState = async () => {
    const res = await fetch('/api/dashboard-data');
    if (res.ok) {
      const data = await res.json();
      setContacts(data.contacts);
      setTransactions(data.transactions.map((t: any) => ({ ...t, createdAt: new Date(t.createdAt) })));
      setMetrics(data.metrics);
      if (selectedContact) {
        const updated = data.allContacts.find((c: any) => c.id === selectedContact.id);
        if (updated) setSelectedContact(updated);
      }
    }
  };

  const handleLogout = () => { setCurrentUser(null); localStorage.removeItem('hub_session_user'); };
  const handleStartInlineEdit = (contact: Contact) => { setEditingHolderId(contact.id); setEditFormData({ name: contact.name, emoji: contact.emoji, color: 'blue' }); };
  const handleSaveInlineEdit = async (e: React.FormEvent, id: string) => {
    e.preventDefault(); const data = new FormData(); data.append('contactId', id); data.append('name', editFormData.name); data.append('emoji', editFormData.emoji); data.append('country', ''); data.append('isArchived', 'false');
    startTransition(async () => { const res = await updateContact(data, currentUser.username); if (res.success) { setEditingHolderId(null); await refreshHubState(); } else alert(res.error); });
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
      const data = new FormData(); Object.entries(contactForm).forEach(([k,v]) => data.append(k, v as any));
      const res = await createContact(data, currentUser.username);
      if (res.success) { setActiveModal(null); await refreshHubState(); }
    });
  };

  const handleMasterWipeToZero = () => {
    setConfirmModal({ isOpen: true, title: '⚠️ WIPE GLOBAL ?', description: 'Saisissez votre mot de passe :', confirmText: 'Wipe', isDanger: true, requirePassword: true, onConfirm: async (p: any) => {
      startTransition(async () => {
        const res = await resetDatabaseToZero(p, currentUser?.id);
        if (res.success) { setSelectedContact(null); setActiveModal(null); await refreshHubState(); } else alert(res.error);
      });
    }});
  };

  if (!currentUser) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="w-full max-w-sm glass-panel border border-neutral-800 rounded-3xl p-8 flex flex-col gap-6 text-center shadow-2xl animate-scale-in">
        <div className="flex flex-col gap-1 items-center"><span className="p-3 bg-neutral-900 border border-neutral-800 text-emerald-400 rounded-2xl mb-2"><Lock className="h-6 w-6" /></span><h1 className="text-2xl font-black uppercase">MONEY HUB</h1></div>
        <form onSubmit={handleLogin} className="flex flex-col gap-4 mt-2">
          <input type="text" required placeholder="Identifiant" value={loginForm.username} onChange={(e) => setLoginForm(p => ({ ...p, username: e.target.value }))} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 px-4 text-sm focus:border-emerald-500/50 outline-none text-white" />
          <input type="password" required placeholder="Mot de passe" value={loginForm.password} onChange={(e) => setLoginForm(p => ({ ...p, password: e.target.value }))} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 px-4 text-sm focus:border-emerald-500/50 outline-none text-white" />
          {loginError && <p className="text-rose-400 text-xs font-bold">{loginError}</p>}
          <button type="submit" className="w-full py-3 bg-emerald-500 text-black font-black uppercase rounded-xl active:scale-95 transition shadow-lg shadow-emerald-500/20">Accéder</button>
        </form>
      </div>
    </div>
  );

  const filteredMovements = optimisticTransactions.filter((t:any) => !searchQuery || t.contact?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || t.note?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className={`min-h-screen pb-28 ambient-bg ${theme === 'light' ? 'bg-neutral-50 text-black' : 'bg-[#050505] text-white'}`}>
      <header className="sticky top-0 z-40 bg-[#050505]/80 backdrop-blur-xl border-b border-neutral-900/50 p-4">
        <div className="max-w-4xl mx-auto flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2.5"><div className="h-8 w-8 rounded-xl bg-emerald-500 flex items-center justify-center text-black font-black">H</div><h1 className="text-lg font-black tracking-widest uppercase">MONEY HUB</h1></div>
            <div className="flex gap-2">
              <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className="p-2 rounded-full bg-neutral-900 border border-neutral-800">{theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
              <button onClick={refreshHubState} className="p-2 rounded-full bg-neutral-900 border border-neutral-800"><RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} /></button>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setActiveModal('add_tx')} className="flex-1 py-3.5 bg-emerald-500 text-black font-black uppercase text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition"> <Plus className="h-5 w-5 stroke-[3]" /> Opération </button>
            <button onClick={() => setActiveModal('add_contact')} className="px-5 py-3.5 bg-neutral-900 border border-neutral-800 text-white font-black uppercase text-xs rounded-2xl active:scale-[0.98] transition"> <UserPlus className="h-5 w-5" /> </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <input type="text" placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl py-3 pl-10 pr-9 text-sm focus:border-emerald-500/40 transition outline-none" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 flex flex-col gap-6 animate-fade-up">
        {activeSection === 'dashboard' && (
          <div className="flex flex-col gap-5">
            <div className="bg-gradient-to-br from-neutral-900 to-black border border-neutral-800 p-7 rounded-[32px] shadow-2xl relative overflow-hidden">
              <p className="text-[11px] font-black text-neutral-400 uppercase tracking-widest">Position Nette</p>
              <h2 className="text-5xl font-black mt-2 tracking-tighter">{formatUSD(metrics.netPosition)}</h2>
              <p className="text-[10px] text-emerald-500/80 mt-2 font-bold uppercase tracking-widest">Global USD</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div onClick={() => { setContactFilterType('HELD'); setActiveSection('contacts'); }} className="bg-neutral-900/40 border border-neutral-800 p-4 rounded-2xl cursor-pointer"> <p className="text-[10px] font-black text-neutral-500 uppercase">Avoirs</p> <p className="text-2xl font-black text-blue-400 mt-1">{formatUSD(metrics.totalAvoirs)}</p> </div>
              <div onClick={() => { setContactFilterType('RECEIVABLE'); setActiveSection('contacts'); }} className="bg-neutral-900/40 border border-neutral-800 p-4 rounded-2xl cursor-pointer"> <p className="text-[10px] font-black text-neutral-500 uppercase">Créances</p> <p className="text-2xl font-black text-emerald-400 mt-1">{formatUSD(metrics.totalReceivables)}</p> </div>
              <div onClick={() => { setContactFilterType('PAYABLE'); setActiveSection('contacts'); }} className="bg-neutral-900/40 border border-neutral-800 p-4 rounded-2xl cursor-pointer"> <p className="text-[10px] font-black text-neutral-500 uppercase">Dettes</p> <p className="text-2xl font-black text-rose-400 mt-1">{formatUSD(metrics.totalPayables)}</p> </div>
              <div onClick={() => setActiveSection('reminders')} className="bg-neutral-900/40 border border-neutral-800 p-4 rounded-2xl cursor-pointer"> <p className="text-[10px] font-black text-neutral-500 uppercase">Rappels</p> <p className="text-2xl font-black text-amber-500 mt-1">{formatUSD(metrics.upcomingPayments)}</p> </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              {optimisticContacts.slice(0, 4).map((c: any) => (
                <div key={c.id} onClick={() => setSelectedContact(c)} className="bg-neutral-900/60 border border-neutral-800 p-4 rounded-2xl flex justify-between items-center active:scale-[0.98] transition cursor-pointer">
                  <div className="flex items-center gap-3"><span className="text-2xl">{c.emoji}</span><p className="font-extrabold text-sm">{c.name}</p></div>
                  <p className={`text-sm font-black ${c.netPositionUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatUSD(c.netPositionUsd)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'contacts' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {optimisticContacts.map((c: any) => (
              <div key={c.id} className="bg-neutral-900 border border-neutral-800 p-5 rounded-3xl flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div onClick={() => setSelectedContact(c)} className="flex items-center gap-3 cursor-pointer"><span className="text-3xl">{c.emoji}</span><div><p className="font-black text-white">{c.name}</p><p className="text-[10px] text-neutral-500 uppercase font-bold">{c.country}</p></div></div>
                  <button onClick={() => { setContactForm(c); setActiveModal('edit_contact'); }} className="p-2 text-blue-400"><Edit className="h-4 w-4" /></button>
                </div>
                <div className="grid grid-cols-3 gap-2 border-t border-neutral-800 pt-3 text-[10px] text-center font-black uppercase">
                  <div><p className="text-neutral-500 mb-1">Avoirs</p><p className="text-blue-400">{formatUSD(c.heldBalanceUsd)}</p></div>
                  <div><p className="text-neutral-500 mb-1">Créances</p><p className="text-emerald-400">{formatUSD(c.receivableBalanceUsd)}</p></div>
                  <div><p className="text-neutral-500 mb-1">Dettes</p><p className="text-rose-400">{formatUSD(c.payableBalanceUsd)}</p></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeSection === 'transactions' && (
          <div className="flex flex-col gap-3">
            {filteredMovements.map((t: any) => (
              <div key={t.id} className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl flex justify-between items-center">
                <div className="flex items-center gap-3"><span className="text-2xl p-2 bg-neutral-950 rounded-xl">{t.contact?.emoji}</span><div><p className="text-sm font-black">{t.contact?.name}</p><p className="text-[10px] text-neutral-500 font-bold uppercase">{t.category} · {t.type}</p></div></div>
                <div className="text-right flex items-center gap-3"><div><p className="text-sm font-black">{formatUSD(t.amountInUsd)}</p><p className="text-[10px] text-neutral-500">{t.createdAt.toLocaleDateString()}</p></div><button onClick={() => handleDeleteTx(t.id)} className="p-2 text-rose-500"><Trash2 className="h-4 w-4" /></button></div>
              </div>
            ))}
          </div>
        )}

        {activeSection === 'history' && (
          <div className="flex flex-col gap-3">
            <h2 className="text-xs font-black text-neutral-500 uppercase tracking-widest mb-2 flex items-center gap-2"> <History className="h-4 w-4" /> Historique de Traçabilité </h2>
            {initialAuditTrails.map((a: any) => (
              <div key={a.id} className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl flex flex-col gap-2">
                <div className="flex justify-between items-start"><p className="text-[10px] font-black px-2 py-0.5 rounded bg-neutral-950 text-neutral-400 uppercase">{a.entityType} : {a.action}</p><p className="text-[10px] text-neutral-500 font-bold">{new Date(a.createdAt).toLocaleString()}</p></div>
                <p className="text-xs font-bold text-neutral-300">{a.details}</p>
                <p className="text-[9px] text-neutral-500 font-black uppercase">Fait par : <span className="text-emerald-500">{a.modifiedBy}</span></p>
              </div>
            ))}
          </div>
        )}

        {activeSection === 'settings' && (
          <div className="flex flex-col gap-6">
            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl flex justify-between items-center"><div><p className="text-sm font-black">{currentUser.username}</p><p className="text-xs text-neutral-500">{currentUser.role}</p></div><button onClick={handleLogout} className="p-3 bg-rose-950/20 text-rose-400 rounded-2xl border border-rose-900/40"><LogOut className="h-5 w-5" /></button></div>
            {currentUser.role === 'admin' && ( <button onClick={handleMasterWipeToZero} className="w-full py-4 bg-rose-600 text-white font-black uppercase rounded-2xl transition">⚠️ Master Wipe Database</button> )}
          </div>
        )}
      </main>

      <nav className="fixed bottom-4 left-0 right-0 z-40 px-4 flex justify-center pointer-events-none">
        <div className="glass-panel border border-neutral-800 rounded-3xl p-2 shadow-2xl flex items-center gap-1 pointer-events-auto">
          {[
            { id: 'dashboard', label: 'Accueil', icon: <DollarSign className="h-4 w-4" /> },
            { id: 'contacts', label: 'Contacts', icon: <Users className="h-4 w-4" /> },
            { id: 'transactions', label: 'Ops', icon: <ArrowLeftRight className="h-4 w-4" /> },
            { id: 'history', label: 'Audit', icon: <History className="h-4 w-4" /> },
            { id: 'settings', label: 'Param', icon: <Settings className="h-4 w-4" /> },
          ].map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id as any)} className={`flex flex-col items-center gap-1 px-4 py-2.5 rounded-2xl transition active:scale-90 ${activeSection === s.id ? 'bg-white text-black font-black' : 'text-neutral-500'}`}>
              {s.icon} <span className="text-[8px] font-black uppercase tracking-tighter">{s.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {activeModal === 'add_tx' && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setActiveModal(null)}>
          <div className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-[32px] p-7 flex flex-col gap-6 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-neutral-900 pb-4"><h3 className="font-black uppercase text-emerald-400 tracking-widest">Enregistrer Opération</h3><button onClick={() => setActiveModal(null)} className="p-2 bg-neutral-900 rounded-full"><X className="h-4 w-4" /></button></div>
            <form onSubmit={handleAddTransaction} className="flex flex-col gap-4">
              <select required className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-sm text-white" value={transactionForm.contactId} onChange={e => setTransactionForm(p=>({...p, contactId: e.target.value}))}><option value="">Partenaire</option>{contacts.map((c:any) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}</select>
              <div className="flex gap-2"><input type="number" step="any" required className="flex-1 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-xl font-black text-white" placeholder="0.00" value={transactionForm.amount} onChange={e => setTransactionForm(p=>({...p, amount: e.target.value}))} /><select className="bg-neutral-900 border border-neutral-800 rounded-2xl px-4 font-black text-white" value={transactionForm.currencyCode} onChange={e => setTransactionForm(p=>({...p, currencyCode: e.target.value}))}>{initialActiveCurrencies.map((c:any) => <option key={c.code} value={c.code}>{c.code}</option>)}</select></div>
              <div className="grid grid-cols-3 gap-2">{['HELD', 'RECEIVABLE', 'PAYABLE'].map(type => (<button key={type} type="button" onClick={() => setTransactionForm(p=>({...p, type}))} className={`py-3 rounded-xl text-[9px] font-black uppercase border transition ${transactionForm.type === type ? 'bg-white text-black' : 'border-neutral-800 text-neutral-500'}`}>{type === 'HELD' ? 'Avoir' : type === 'RECEIVABLE' ? 'Créance' : 'Dette'}</button>))}</div>
              <input type="text" className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-sm text-white" placeholder="Commentaire..." value={transactionForm.note} onChange={e => setTransactionForm(p=>({...p, note: e.target.value}))} />
              <div className="flex gap-3 mt-2"><button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-4 bg-neutral-900 text-white font-black rounded-2xl uppercase">Annuler</button><button type="submit" disabled={isPending} className="flex-[2] py-4 bg-emerald-500 text-black font-black rounded-2xl uppercase shadow-lg shadow-emerald-500/20">Enregistrer</button></div>
            </form>
          </div>
        </div>
      )}

      {activeModal === 'add_contact' && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setActiveModal(null)}>
          <div className="w-full max-w-sm bg-neutral-950 border border-neutral-800 rounded-[32px] p-7 flex flex-col gap-6 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-neutral-900 pb-3"><h3 className="font-black uppercase text-emerald-400">Nouveau Partenaire</h3><button onClick={() => setActiveModal(null)}><X className="h-4 w-4" /></button></div>
            <form onSubmit={handleAddContact} className="flex flex-col gap-4">
              <div className="flex gap-2"><input type="text" className="w-16 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-center text-white" value={contactForm.emoji} onChange={(e) => setContactForm(p => ({...p, emoji: e.target.value}))} /><input type="text" required className="flex-1 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-white" placeholder="Nom" value={contactForm.name} onChange={(e) => setContactForm(p => ({...p, name: e.target.value}))} /></div>
              <input type="text" className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-white" placeholder="Pays" value={contactForm.country} onChange={(e) => setContactForm(p => ({...p, country: e.target.value}))} />
              <div className="flex gap-2 mt-2"><button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-4 bg-neutral-900 text-white font-black rounded-2xl uppercase">Annuler</button><button type="submit" disabled={isPending} className="flex-[2] py-4 bg-white text-black font-black rounded-2xl uppercase">Créer</button></div>
            </form>
          </div>
        </div>
      )}

      {selectedContact && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end" onClick={() => setSelectedContact(null)}>
          <div className="w-full max-w-md bg-neutral-950 border-l border-neutral-800 h-full overflow-y-auto p-6 flex flex-col gap-8 animate-in slide-in-from-right duration-300" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-neutral-900 pb-4"><div className="flex items-center gap-3"><span className="text-4xl">{selectedContact.emoji}</span><div><h3 className="text-xl font-black">{selectedContact.name}</h3><p className="text-xs text-neutral-500 uppercase">{selectedContact.country}</p></div></div><button onClick={() => setSelectedContact(null)} className="p-2 bg-neutral-900 rounded-full"><X className="h-5 w-5" /></button></div>
            <div className={`p-6 rounded-3xl border ${selectedContact.netPositionUsd >= 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}><p className="text-xs font-bold text-neutral-500 uppercase">Position Nette</p><p className={`text-4xl font-black mt-1 ${selectedContact.netPositionUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatUSD(selectedContact.netPositionUsd)}</p></div>
            <div className="flex flex-col gap-2"><div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex justify-between items-center"><p className="text-xs font-bold text-neutral-400">Avoirs</p><p className="font-black text-blue-400">{formatUSD(selectedContact.heldBalanceUsd)}</p></div><div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex justify-between items-center"><p className="text-xs font-bold text-neutral-400">Créances</p><p className="font-black text-emerald-400">{formatUSD(selectedContact.receivableBalanceUsd)}</p></div><div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl flex justify-between items-center"><p className="text-xs font-bold text-neutral-400">Dettes</p><p className="font-black text-rose-400">{formatUSD(selectedContact.payableBalanceUsd)}</p></div></div>
          </div>
        </div>
      )}

      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[110] bg-black/95 flex items-center justify-center p-4 animate-in scale-in duration-200" onClick={() => setConfirmModal({isOpen: false})}>
          <div className="w-full max-w-sm bg-neutral-950 border border-neutral-800 rounded-[32px] p-8 text-center flex flex-col gap-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col gap-3 items-center"><div className={`p-4 rounded-3xl ${confirmModal.isDanger ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}><AlertTriangle className="h-8 w-8" /></div><h3 className="text-xl font-black uppercase">{confirmModal.title}</h3><p className="text-xs text-neutral-400 font-bold">{confirmModal.description}</p></div>
            {confirmModal.requirePassword && ( <input type="password" placeholder="Mot de passe" className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-center text-sm outline-none text-white" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} /> )}
            <div className="flex gap-3"><button onClick={() => setConfirmModal({isOpen:false})} className="flex-1 py-4 bg-neutral-900 text-white font-black rounded-2xl uppercase">Non</button><button onClick={async () => { const p = confirmPassword; setConfirmModal({isOpen:false}); setConfirmPassword(''); await confirmModal.onConfirm(p); }} className={`flex-1 py-4 font-black uppercase rounded-2xl ${confirmModal.isDanger ? 'bg-rose-600 text-white' : 'bg-emerald-500 text-black'}`}>{confirmModal.confirmText}</button></div>
          </div>
        </div>
      )}

      {lightboxImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 cursor-pointer" onClick={() => setLightboxImage(null)}>
          <button className="absolute top-6 right-6 p-2 bg-neutral-900 border border-neutral-800 text-white rounded-full"><X className="h-5 w-5" /></button>
          <img src={lightboxImage} alt="Pièce Jointe" className="max-w-full max-h-[85vh] rounded-2xl object-contain border border-neutral-800" />
        </div>
      )}
    </div>
  );
}

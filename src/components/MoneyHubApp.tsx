'use client';

import React, { useState, useTransition, useMemo, useEffect } from 'react';
import {
  Plus,
  ArrowLeftRight,
  Camera,
  Search,
  X,
  ChevronRight,
  RefreshCw,
  Clock,
  ExternalLink,
  UserPlus,
  Trash2,
  Users,
  Building,
  User,
  AlertTriangle,
  Coins,
  Package,
  Settings,
  Edit,
  ArrowUpRight,
  CheckCircle,
  HelpCircle,
  ShieldCheck,
  Lock,
  LogOut,
  Calendar,
  FileSpreadsheet,
  FileText,
  DollarSign,
  Sun,
  Moon,
  Database
} from 'lucide-react';
import {
  createContact,
  updateContact,
  deleteContact,
  createHubTransaction,
  updateHubTransaction,
  deleteHubTransaction,
  createReminder,
  toggleReminderCompleted,
  deleteReminder,
  updateCurrencyRate,
  toggleCurrencyActive,
  createCategory,
  deleteCategory,
  createAssistantUser,
  deleteAssistantUser,
  changeUserPassword,
  resetDatabaseToZero,
  loginUser
} from '../app/actions';

interface Contact {
  id: string;
  name: string;
  emoji: string;
  country: string | null;
  isArchived: boolean;
  heldBalanceUsd: number;
  receivableBalanceUsd: number;
  payableBalanceUsd: number;
  netPositionUsd: number;
}

interface Currency {
  id: string;
  code: string;
  symbol: string;
  rateToUsd: number;
  isActive: boolean;
}

interface Category {
  id: string;
  name: string;
  isCustom: boolean;
}

interface Transaction {
  id: string;
  amount: number;
  currencyCode: string;
  amountInUsd: number;
  contactId: string;
  contact: Contact;
  type: string; // "HELD" | "RECEIVABLE" | "PAYABLE"
  category: string;
  note: string | null;
  photoPath: string | null;
  attachmentName: string | null;
  createdAt: Date;
}

interface Reminder {
  id: string;
  amount: number;
  currencyCode: string;
  amountInUsd: number;
  contactId: string;
  contact: Contact;
  dueDate: Date;
  note: string | null;
  isCompleted: boolean;
}

interface AuditTrail {
  id: string;
  transactionId: string | null;
  transaction?: Transaction | null;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  modifiedBy: string;
  createdAt: Date;
}

interface HubUser {
  id: string;
  username: string;
  passwordHash: string;
  role: string;
  canWrite: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

interface Metrics {
  totalAvoirs: number;
  totalReceivables: number;
  totalPayables: number;
  upcomingPayments: number;
  netPosition: number;
}

interface MoneyHubAppProps {
  initialContacts: Contact[];
  initialAllContacts: Contact[];
  initialCurrencies: Currency[];
  initialActiveCurrencies: Currency[];
  initialCategories: Category[];
  initialTransactions: any[];
  initialReminders: any[];
  initialAuditTrails: any[];
  initialUsers: HubUser[];
  initialMetrics: Metrics;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  CNY: '¥',
  TND: 'DT',
  HKD: 'HK$',
};

export default function MoneyHubApp({
  initialContacts,
  initialAllContacts,
  initialCurrencies,
  initialActiveCurrencies,
  initialCategories,
  initialTransactions,
  initialReminders,
  initialAuditTrails,
  initialUsers,
  initialMetrics
}: MoneyHubAppProps) {
  // Session Authentication State
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    username: string;
    role: string;
    canWrite: boolean;
    canEdit: boolean;
    canDelete: boolean;
  } | null>(null);

  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginFormError] = useState('');

  // Hydration state check
  useEffect(() => {
    const savedUser = localStorage.getItem('hub_session_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  // UI Theme
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Active Navigation
  const [activeSection, setActiveSection] = useState<'dashboard' | 'contacts' | 'transactions' | 'reminders' | 'settings'>('dashboard');

  // Live Database Sync State
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [allContacts, setAllContacts] = useState<Contact[]>(initialAllContacts);
  const [currencies, setCurrencies] = useState<Currency[]>(initialCurrencies);
  const [activeCurrencies, setActiveCurrencies] = useState<Currency[]>(initialActiveCurrencies);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [transactions, setTransactions] = useState<Transaction[]>(
    initialTransactions.map(t => ({ ...t, createdAt: new Date(t.createdAt) }))
  );
  const [reminders, setReminders] = useState<Reminder[]>(
    initialReminders.map(r => ({ ...r, dueDate: new Date(r.dueDate) }))
  );
  const [auditTrails, setAuditTrails] = useState<AuditTrail[]>(
    initialAuditTrails.map(a => ({ ...a, createdAt: new Date(a.createdAt) }))
  );
  const [users, setUsers] = useState<HubUser[]>(initialUsers);
  const [metrics, setMetrics] = useState<Metrics>(initialMetrics);

  const [searchQuery, setSearchQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  // Modals Controller
  const [activeModal, setActiveModal] = useState<'add_transaction' | 'edit_transaction' | 'add_reminder' | 'add_contact' | 'edit_contact' | 'settings' | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Filters
  const [contactFilterType, setContactFilterType] = useState<'ALL' | 'HELD' | 'RECEIVABLE' | 'PAYABLE'>('ALL');

  // Inline edit state
  const [editingHolderId, setEditingHolderId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    emoji: '',
    color: 'blue',
    category: 'holder',
    partnerType: 'person'
  });

  // Form states
  const [transactionForm, setTransactionForm] = useState({
    contactId: '',
    amount: '',
    currencyCode: 'USD',
    type: 'HELD', 
    category: 'Virement',
    note: '',
    photo: null as File | null
  });

  const [reminderForm, setReminderForm] = useState({
    contactId: '',
    amount: '',
    currencyCode: 'USD',
    dueDate: '',
    note: ''
  });

  const [contactForm, setContactForm] = useState({
    id: '',
    name: '',
    emoji: '👤',
    country: '',
    isArchived: false
  });

  // Settings inline form states
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newAssistantForm, setNewAssistantForm] = useState({ username: '', password: '', canEdit: false, canDelete: false });
  const [newPasswordForm, setNewPasswordForm] = useState({ password: '' });

  // Formatting
  const formatUSD = (val: number) => {
    const isNegative = val < 0;
    const formatted = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(Math.abs(val));
    return isNegative ? `-${formatted}` : formatted;
  };

  const formatRawCurrency = (val: number, curr: string) => {
    const isNegative = val < 0;
    const formatted = new Intl.NumberFormat('fr-FR', {
      maximumFractionDigits: 2
    }).format(Math.abs(val));
    const symbol = CURRENCY_SYMBOLS[curr] || curr;
    return isNegative ? `-${symbol} ${formatted}` : `${symbol} ${formatted}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setTransactionForm(prev => ({ ...prev, photo: e.target.files![0] }));
    }
  };

  const handleSelectContact = (c: Contact) => {
    setSelectedContact(c);
  };

  const refreshHubState = async () => {
    const response = await fetch('/api/dashboard-data');
    if (response.ok) {
      const data = await response.json();
      setContacts(data.contacts);
      setAllContacts(data.allContacts);
      setCurrencies(data.currencies);
      setActiveCurrencies(data.activeCurrencies);
      setCategories(data.categories);
      setTransactions(data.transactions.map((t: any) => ({ ...t, createdAt: new Date(t.createdAt) })));
      setReminders(data.reminders.map((r: any) => ({ ...r, dueDate: new Date(r.dueDate) })));
      setAuditTrails(data.auditTrails.map((a: any) => ({ ...a, createdAt: new Date(a.createdAt) })));
      setUsers(data.users);
      setMetrics(data.metrics);
      
      if (selectedContact) {
        const updated = data.allContacts.find((c: any) => c.id === selectedContact.id);
        if (updated) setSelectedContact(updated);
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginFormError('');
    const data = new FormData();
    data.append('username', loginForm.username);
    data.append('password', loginForm.password);
    const res = await loginUser(data);
    if (res.success && res.user) {
      setCurrentUser(res.user);
      localStorage.setItem('hub_session_user', JSON.stringify(res.user));
    } else {
      setLoginFormError(res.error || 'Erreur de connexion');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('hub_session_user');
  };

  const filteredContacts = useMemo(() => {
    let result = contacts;
    if (contactFilterType === 'HELD') result = result.filter(c => c.heldBalanceUsd > 0);
    else if (contactFilterType === 'RECEIVABLE') result = result.filter(c => c.receivableBalanceUsd > 0);
    else if (contactFilterType === 'PAYABLE') result = result.filter(c => c.payableBalanceUsd > 0);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.country && c.country.toLowerCase().includes(q))
      );
    }
    return result;
  }, [contacts, contactFilterType, searchQuery]);

  const filteredTransactions = useMemo(() => {
    if (!searchQuery) return transactions;
    const q = searchQuery.toLowerCase();
    return transactions.filter(t =>
      t.contact.name.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      (t.note && t.note.toLowerCase().includes(q)) ||
      t.currencyCode.toLowerCase().includes(q) ||
      t.amount.toString().includes(q)
    );
  }, [transactions, searchQuery]);

  const filteredReminders = useMemo(() => {
    if (!searchQuery) return reminders;
    const q = searchQuery.toLowerCase();
    return reminders.filter(r =>
      r.contact.name.toLowerCase().includes(q) ||
      r.currencyCode.toLowerCase().includes(q) ||
      (r.note && r.note.toLowerCase().includes(q))
    );
  }, [reminders, searchQuery]);

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name) return;
    const data = new FormData();
    data.append('name', contactForm.name);
    data.append('emoji', contactForm.emoji);
    data.append('country', contactForm.country);
    startTransition(async () => {
      const res = await createContact(data);
      if (res.success) {
        setContactForm({ id: '', name: '', emoji: '👤', country: '', isArchived: false });
        setActiveModal(null);
        await refreshHubState();
      } else alert(res.error);
    });
  };

  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.id || !contactForm.name) return;
    const data = new FormData();
    data.append('contactId', contactForm.id);
    data.append('name', contactForm.name);
    data.append('emoji', contactForm.emoji);
    data.append('country', contactForm.country);
    data.append('isArchived', contactForm.isArchived ? 'true' : 'false');
    startTransition(async () => {
      const res = await updateContact(data);
      if (res.success) {
        setContactForm({ id: '', name: '', emoji: '👤', country: '', isArchived: false });
        setActiveModal(null);
        await refreshHubState();
      } else alert(res.error);
    });
  };

  const handleOpenEditContact = (c: Contact) => {
    setContactForm({ id: c.id, name: c.name, emoji: c.emoji, country: c.country || '', isArchived: c.isArchived });
    setActiveModal('edit_contact');
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionForm.contactId || !transactionForm.amount) return;
    const data = new FormData();
    data.append('contactId', transactionForm.contactId);
    data.append('amount', transactionForm.amount);
    data.append('currencyCode', transactionForm.currencyCode);
    data.append('type', transactionForm.type);
    data.append('category', transactionForm.category);
    data.append('note', transactionForm.note);
    data.append('modifiedBy', currentUser?.username || 'Administrateur');
    if (transactionForm.photo) data.append('photo', transactionForm.photo);
    startTransition(async () => {
      const res = await createHubTransaction(data);
      if (res.success) {
        setTransactionForm({ contactId: '', amount: '', currencyCode: 'USD', type: 'HELD', category: 'Virement', note: '', photo: null });
        setActiveModal(null);
        await refreshHubState();
      } else alert(res.error);
    });
  };

  const handleOpenEditTransaction = (t: Transaction) => {
    if (!currentUser?.canEdit) { alert('Droits insuffisants'); return; }
    setSelectedTransaction(t);
    setTransactionForm({ contactId: t.contactId, amount: t.amount.toString(), currencyCode: t.currencyCode, type: t.type, category: t.category, note: t.note || '', photo: null });
    setActiveModal('edit_transaction');
  };

  const handleUpdateTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransaction) return;
    const data = new FormData();
    data.append('transactionId', selectedTransaction.id);
    data.append('amount', transactionForm.amount);
    data.append('currencyCode', transactionForm.currencyCode);
    data.append('type', transactionForm.type);
    data.append('category', transactionForm.category);
    data.append('note', transactionForm.note);
    data.append('modifiedBy', currentUser?.username || 'Administrateur');
    if (transactionForm.photo) data.append('photo', transactionForm.photo);
    startTransition(async () => {
      const res = await updateHubTransaction(data);
      if (res.success) {
        setSelectedTransaction(null);
        setActiveModal(null);
        await refreshHubState();
      } else alert(res.error);
    });
  };

  const handleDeleteTransaction = async (tId: string) => {
    if (!currentUser?.canDelete) { alert('Droits insuffisants'); return; }
    if (!window.confirm('Supprimer définitivement ?')) return;
    startTransition(async () => {
      const res = await deleteHubTransaction(tId, currentUser?.username);
      if (res.success) await refreshHubState();
      else alert(res.error);
    });
  };

  const handleToggleReminder = async (id: string, isDone: boolean) => {
    startTransition(async () => {
      const res = await toggleReminderCompleted(id, isDone);
      if (res.success) await refreshHubState();
      else alert('Échec');
    });
  };

  const handleDeleteReminder = async (id: string) => {
    if (!window.confirm('Supprimer ?')) return;
    startTransition(async () => {
      const res = await deleteReminder(id);
      if (res.success) await refreshHubState();
      else alert('Échec');
    });
  };

  const handleCreateReminderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderForm.contactId || !reminderForm.amount || !reminderForm.dueDate) return;
    const data = new FormData();
    data.append('contactId', reminderForm.contactId);
    data.append('amount', reminderForm.amount);
    data.append('currencyCode', reminderForm.currencyCode);
    data.append('dueDate', reminderForm.dueDate);
    data.append('note', reminderForm.note);
    startTransition(async () => {
      const res = await createReminder(data);
      if (res.success) {
        setReminderForm({ contactId: '', amount: '', currencyCode: 'USD', dueDate: '', note: '' });
        setActiveModal(null);
        await refreshHubState();
      } else alert(res.error);
    });
  };

  const handleMasterWipeToZero = async () => {
    if (!window.confirm('⚠️ WIPE GLOBAL ?')) return;
    startTransition(async () => {
      const res = await resetDatabaseToZero();
      if (res.success) { setSelectedContact(null); setActiveModal(null); await refreshHubState(); }
      else alert(res.error);
    });
  };

  const handleStartInlineEdit = (contact: Contact) => {
    setEditingHolderId(contact.id);
    setEditFormData({
      name: contact.name,
      emoji: contact.emoji,
      color: 'blue',
      category: 'partner',
      partnerType: 'person'
    });
  };

  const handleSaveInlineEdit = async (e: React.FormEvent, contactId: string) => {
    e.preventDefault();
    const data = new FormData();
    data.append('contactId', contactId);
    data.append('name', editFormData.name);
    data.append('emoji', editFormData.emoji);
    data.append('country', '');
    data.append('isArchived', 'false');
    startTransition(async () => {
      const res = await updateContact(data);
      if (res.success) { setEditingHolderId(null); await refreshHubState(); }
      else alert(res.error);
    });
  };

  const handleEraseAccount = async (id: string, name: string) => {
    if (!window.confirm(`Supprimer ${name} ?`)) return;
    startTransition(async () => {
      const res = await deleteContact(id);
      if (res.success) { if (selectedContact?.id === id) setSelectedContact(null); await refreshHubState(); }
      else alert(res.error);
    });
  };

  const getTransactionTypeStyle = (type: string) => {
    switch (type) {
      case 'HELD': return { text: 'text-blue-400', label: 'Avoirs', bg: 'bg-blue-500/10 border-blue-500/20' };
      case 'RECEIVABLE': return { text: 'text-emerald-400', label: 'Créance', bg: 'bg-emerald-500/10 border-emerald-500/20' };
      case 'PAYABLE': return { text: 'text-rose-400', label: 'Dette', bg: 'bg-rose-500/10 border-rose-500/20' };
      default: return { text: 'text-neutral-400', label: '?', bg: 'bg-neutral-500/10 border-neutral-500/20' };
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-sm glass-panel border border-neutral-800 rounded-3xl p-8 flex flex-col gap-6 text-center shadow-2xl relative">
          <div className="flex flex-col gap-1 items-center">
            <span className="p-3 bg-neutral-900 border border-neutral-800 text-emerald-400 rounded-2xl mb-2"><Lock className="h-6 w-6" /></span>
            <h1 className="text-2xl font-black tracking-wider uppercase">MONEY HUB</h1>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest">PRIVÉ • SECURISE</p>
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-4 mt-2">
            <input type="text" required placeholder="Identifiant" value={loginForm.username} onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-3 px-4 text-sm text-white focus:border-neutral-600 transition" />
            <input type="password" required placeholder="Mot de passe" value={loginForm.password} onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-3 px-4 text-sm text-white focus:border-neutral-600 transition" />
            {loginError && <p className="text-rose-400 text-xs font-bold">{loginError}</p>}
            <button type="submit" className="w-full py-3 bg-emerald-500 text-black font-black uppercase rounded-xl active:scale-95 transition">CONNEXION</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-24 ${theme === 'light' ? 'bg-neutral-50 text-black' : 'bg-black text-white'}`}>
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-neutral-900 p-4">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-black uppercase tracking-widest">MONEY HUB</h1>
            <div className="flex gap-2">
              <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-full bg-neutral-900 border border-neutral-800">{theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
              <button onClick={refreshHubState} className="p-2 rounded-full bg-neutral-900 border border-neutral-800"><RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} /></button>
              <button onClick={handleLogout} className="p-2 rounded-full bg-rose-950/20 border border-rose-900/40 text-rose-400"><LogOut className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <input type="text" placeholder="Recherche..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl py-3 pl-10 text-sm focus:border-neutral-600" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 flex flex-col gap-8">
        {activeSection === 'dashboard' && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl glow-blue">
                <p className="text-xs font-bold text-neutral-500 uppercase">Position Nette (USD)</p>
                <h2 className="text-4xl font-black mt-2">{formatUSD(metrics.netPosition)}</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div onClick={() => { setContactFilterType('HELD'); setActiveSection('contacts'); }} className="bg-neutral-900 border border-neutral-800 p-4 rounded-3xl cursor-pointer">
                  <p className="text-[10px] font-bold text-neutral-500 uppercase">Avoirs</p>
                  <p className="text-xl font-black text-blue-400 mt-1">{formatUSD(metrics.totalAvoirs)}</p>
                </div>
                <div onClick={() => { setContactFilterType('RECEIVABLE'); setActiveSection('contacts'); }} className="bg-neutral-900 border border-neutral-800 p-4 rounded-3xl cursor-pointer">
                  <p className="text-[10px] font-bold text-neutral-500 uppercase">Créances</p>
                  <p className="text-xl font-black text-emerald-400 mt-1">{formatUSD(metrics.totalReceivables)}</p>
                </div>
                <div onClick={() => { setContactFilterType('PAYABLE'); setActiveSection('contacts'); }} className="bg-neutral-900 border border-neutral-800 p-4 rounded-3xl cursor-pointer">
                  <p className="text-[10px] font-bold text-neutral-500 uppercase">Dettes</p>
                  <p className="text-xl font-black text-rose-400 mt-1">{formatUSD(metrics.totalPayables)}</p>
                </div>
                <div onClick={() => setActiveSection('reminders')} className="bg-neutral-900 border border-neutral-800 p-4 rounded-3xl cursor-pointer">
                  <p className="text-[10px] font-bold text-neutral-500 uppercase">Rappels</p>
                  <p className="text-xl font-black text-amber-500 mt-1">{formatUSD(metrics.upcomingPayments)}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredContacts.slice(0, 4).map(c => (
                <div key={c.id} onClick={() => handleSelectContact(c)} className="bg-neutral-900/50 border border-neutral-800 p-5 rounded-3xl cursor-pointer hover:border-neutral-700 transition">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3"><span className="text-2xl">{c.emoji}</span><div><p className="font-extrabold text-sm">{c.name}</p><p className="text-[10px] text-neutral-500 uppercase">{c.country}</p></div></div>
                    <p className={`text-sm font-black ${c.netPositionUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatUSD(c.netPositionUsd)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'contacts' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div onClick={() => setActiveModal('add_contact')} className="border border-dashed border-neutral-800 p-6 rounded-3xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-neutral-900/20"><Plus className="h-6 w-6 text-neutral-500" /><p className="text-xs font-bold uppercase text-neutral-500">Nouveau Partenaire</p></div>
            {filteredContacts.map(c => (
              <div key={c.id} className="bg-neutral-900 border border-neutral-800 p-5 rounded-3xl flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div onClick={() => handleSelectContact(c)} className="flex items-center gap-3 cursor-pointer"><span className="text-3xl">{c.emoji}</span><div><p className="font-extrabold text-white">{c.name}</p><p className="text-[10px] text-neutral-500 uppercase">{c.country}</p></div></div>
                  <button onClick={() => handleOpenEditContact(c)} className="p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-blue-400"><Edit className="h-4 w-4" /></button>
                </div>
                <div className="grid grid-cols-3 gap-2 border-t border-neutral-800 pt-3 text-[10px] text-center font-bold">
                  <div><p className="text-neutral-500">AVOIRS</p><p className="text-blue-400">{formatUSD(c.heldBalanceUsd)}</p></div>
                  <div><p className="text-neutral-500">CRÉANCES</p><p className="text-emerald-400">{formatUSD(c.receivableBalanceUsd)}</p></div>
                  <div><p className="text-neutral-500">DETTES</p><p className="text-rose-400">{formatUSD(c.payableBalanceUsd)}</p></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeSection === 'transactions' && (
          <div className="flex flex-col gap-3">
            {filteredTransactions.map(t => {
              const s = getTransactionTypeStyle(t.type);
              return (
                <div key={t.id} className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl flex justify-between items-center gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl p-2 rounded-xl bg-neutral-950 border border-neutral-800">{t.contact.emoji}</span>
                    <div>
                      <p className="text-sm font-extrabold">{t.contact.name} <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded border ml-1 ${s.bg} ${s.text}`}>{s.label}</span></p>
                      <p className="text-xs text-neutral-500 mt-1">{t.category} : {t.note}</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <p className="text-sm font-black">{formatUSD(t.amountInUsd)}</p>
                      <p className="text-[10px] text-neutral-500">{t.createdAt.toLocaleDateString()}</p>
                    </div>
                    {t.photoPath && <button onClick={() => setLightboxImage(t.photoPath)} className="p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-blue-400"><Camera className="h-4 w-4" /></button>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeSection === 'reminders' && (
          <div className="flex flex-col gap-6">
            <button onClick={() => setActiveModal('add_reminder')} className="w-full py-4 bg-amber-600 text-white font-black uppercase rounded-2xl active:scale-95 transition">+ Créer un Rappel</button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-3"><h3 className="text-xs font-black text-rose-400 uppercase tracking-widest flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Retards Urgents</h3>
                {filteredReminders.filter(r => !r.isCompleted && new Date(r.dueDate) < new Date()).map(r => (
                  <div key={r.id} className="p-4 rounded-2xl border border-rose-950 bg-rose-950/10 flex justify-between items-center">
                    <div><p className="text-xs font-extrabold text-rose-400">{r.contact.name}</p><p className="text-xs font-bold mt-1">{formatRawCurrency(r.amount, r.currencyCode)}</p><p className="text-[9px] text-rose-500 uppercase mt-1 font-black">LE {new Date(r.dueDate).toLocaleDateString()}</p></div>
                    <button onClick={() => handleToggleReminder(r.id, true)} className="p-2 rounded-full bg-emerald-500 text-black"><CheckCircle className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-3"><h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest">Échéances</h3>
                {filteredReminders.filter(r => !r.isCompleted && new Date(r.dueDate) >= new Date()).map(r => (
                  <div key={r.id} className="p-4 rounded-2xl border border-neutral-800 bg-neutral-900/40 flex justify-between items-center">
                    <div><p className="text-xs font-extrabold">{r.contact.name}</p><p className="text-xs font-bold mt-1">{formatRawCurrency(r.amount, r.currencyCode)}</p><p className="text-[9px] text-amber-500 uppercase mt-1 font-black">LE {new Date(r.dueDate).toLocaleDateString()}</p></div>
                    <button onClick={() => handleToggleReminder(r.id, true)} className="p-2 rounded-full bg-emerald-500 text-black"><CheckCircle className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'settings' && (
          <div className="flex flex-col gap-8">
            <div className="bg-rose-950/10 border border-rose-950 p-6 rounded-3xl flex justify-between items-center gap-4">
              <div><h4 className="text-sm font-black text-rose-400 uppercase">Master Wipe</h4><p className="text-xs text-neutral-500 mt-1">Réinitialiser tout à zéro</p></div>
              <button onClick={handleMasterWipeToZero} className="py-2.5 px-5 bg-rose-600 text-white font-black text-xs rounded-xl uppercase">Reset DB</button>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl flex flex-col gap-6">
              <h3 className="text-sm font-black uppercase flex items-center gap-2"><Settings className="h-4 w-4" /> Directory & Edit</h3>
              <div className="flex flex-col gap-2">
                {allContacts.map(c => (
                  <div key={c.id} className="p-4 rounded-2xl bg-neutral-950 border border-neutral-900 flex justify-between items-center">
                    {editingHolderId === c.id ? (
                      <form onSubmit={(e) => handleSaveInlineEdit(e, c.id)} className="flex flex-1 gap-2">
                        <input type="text" className="w-12 bg-black border border-neutral-800 rounded p-1 text-center" value={editFormData.emoji} onChange={(e) => setEditFormData(p => ({...p, emoji: e.target.value}))} />
                        <input type="text" className="flex-1 bg-black border border-neutral-800 rounded p-1" value={editFormData.name} onChange={(e) => setEditFormData(p => ({...p, name: e.target.value}))} />
                        <button type="submit" className="bg-white text-black px-3 rounded text-[10px] font-black">SAVE</button>
                        <button type="button" onClick={() => setEditingHolderId(null)} className="text-neutral-500 px-2 text-[10px] font-black">X</button>
                      </form>
                    ) : (
                      <>
                        <div className="flex items-center gap-3"><span className="text-xl">{c.emoji}</span><p className="text-sm font-extrabold">{c.name}</p></div>
                        <div className="flex gap-2">
                          <button onClick={() => handleStartInlineEdit(c)} className="p-2 text-blue-400 hover:bg-neutral-800 rounded-lg"><Edit className="h-4 w-4" /></button>
                          <button onClick={() => handleEraseAccount(c.id, c.name)} className="p-2 text-rose-400 hover:bg-neutral-800 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <div className="fixed bottom-6 left-0 right-0 z-40 px-4 flex justify-center pointer-events-none">
        <nav className="glass-panel border border-neutral-800 rounded-full px-5 py-3 shadow-2xl flex items-center gap-4 pointer-events-auto overflow-x-auto max-w-full">
          {['dashboard', 'contacts', 'transactions', 'reminders', 'settings'].map(s => (
            <button key={s} onClick={() => setActiveSection(s as any)} className={`text-[10px] font-black uppercase px-4 py-2.5 rounded-full transition ${activeSection === s ? 'bg-white text-black' : 'text-neutral-500'}`}>{s}</button>
          ))}
          <button onClick={() => setActiveModal('add_transaction')} className="p-3 bg-emerald-500 text-black rounded-full shadow-lg active:scale-95 transition"><Plus className="h-5 w-5 stroke-[3]" /></button>
        </nav>
      </div>

      {selectedContact && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-neutral-950 border-l border-neutral-800 h-full overflow-y-auto p-6 flex flex-col gap-8">
            <div className="flex justify-between items-center border-b border-neutral-900 pb-4">
              <div className="flex items-center gap-3"><span className="text-4xl">{selectedContact.emoji}</span><div><h3 className="text-xl font-black">{selectedContact.name}</h3><p className="text-xs text-neutral-500 uppercase">{selectedContact.country}</p></div></div>
              <button onClick={() => setSelectedContact(null)} className="p-2 bg-neutral-900 rounded-full"><X className="h-5 w-5" /></button>
            </div>
            <div className={`p-6 rounded-3xl border ${selectedContact.netPositionUsd >= 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
              <p className="text-xs font-bold text-neutral-500 uppercase">Position Nette Globale (USD)</p>
              <p className={`text-4xl font-black mt-1 ${selectedContact.netPositionUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatUSD(selectedContact.netPositionUsd)}</p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex justify-between items-center"><p className="text-xs font-bold text-neutral-400">Avoirs détenus</p><p className="font-black text-blue-400">{formatUSD(selectedContact.heldBalanceUsd)}</p></div>
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex justify-between items-center"><p className="text-xs font-bold text-neutral-400">Créances</p><p className="font-black text-emerald-400">{formatUSD(selectedContact.receivableBalanceUsd)}</p></div>
              <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl flex justify-between items-center"><p className="text-xs font-bold text-neutral-400">Dettes</p><p className="font-black text-rose-400">{formatUSD(selectedContact.payableBalanceUsd)}</p></div>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'add_transaction' && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-3xl p-6 flex flex-col gap-6">
            <div className="flex justify-between items-center"><h3 className="font-black uppercase text-emerald-400">Enregistrer une opération</h3><button onClick={() => setActiveModal(null)}><X className="h-5 w-5" /></button></div>
            <form onSubmit={handleCreateTransaction} className="flex flex-col gap-4">
              <select required className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-sm" value={transactionForm.contactId} onChange={(e) => setTransactionForm(p => ({...p, contactId: e.target.value}))}><option value="">-- Partenaire --</option>{allContacts.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}</select>
              <div className="flex gap-2"><input type="number" step="any" required className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl p-3 font-bold" placeholder="Montant" value={transactionForm.amount} onChange={(e) => setTransactionForm(p => ({...p, amount: e.target.value}))} /><select className="bg-neutral-900 border border-neutral-800 rounded-xl px-3" value={transactionForm.currencyCode} onChange={(e) => setTransactionForm(p => ({...p, currencyCode: e.target.value}))}>{activeCurrencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}</select></div>
              <select required className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-sm" value={transactionForm.type} onChange={(e) => setTransactionForm(p => ({...p, type: e.target.value}))}><option value="HELD">Avoir</option><option value="RECEIVABLE">Créance</option><option value="PAYABLE">Dette</option></select>
              <select required className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-sm" value={transactionForm.category} onChange={(e) => setTransactionForm(p => ({...p, category: e.target.value}))}>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
              <input type="text" className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-sm" placeholder="Note..." value={transactionForm.note} onChange={(e) => setTransactionForm(p => ({...p, note: e.target.value}))} />
              <div className="flex items-center gap-3"><label className="p-3 bg-neutral-900 rounded-xl text-xs font-bold cursor-pointer">Photo/PDF <input type="file" className="hidden" onChange={handleFileChange} /></label><span className="text-[10px] text-neutral-500 truncate">{transactionForm.photo ? transactionForm.photo.name : 'Aucun'}</span></div>
              <button type="submit" disabled={isPending} className="py-3 bg-white text-black font-black rounded-xl uppercase">{isPending ? 'Sync...' : 'Enregistrer'}</button>
            </form>
          </div>
        </div>
      )}

      {activeModal === 'add_contact' && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-neutral-950 border border-neutral-800 rounded-3xl p-6 flex flex-col gap-6">
            <h3 className="font-black uppercase text-emerald-400">Nouveau Partenaire</h3>
            <form onSubmit={handleCreateContact} className="flex flex-col gap-4">
              <div className="flex gap-2"><input type="text" className="w-16 bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-center" value={contactForm.emoji} onChange={(e) => setContactForm(p => ({...p, emoji: e.target.value}))} /><input type="text" required className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl p-3" placeholder="Nom" value={contactForm.name} onChange={(e) => setContactForm(p => ({...p, name: e.target.value}))} /></div>
              <input type="text" className="bg-neutral-900 border border-neutral-800 rounded-xl p-3" placeholder="Pays" value={contactForm.country} onChange={(e) => setContactForm(p => ({...p, country: e.target.value}))} />
              <button type="submit" disabled={isPending} className="py-3 bg-white text-black font-black rounded-xl uppercase">Créer</button>
            </form>
          </div>
        </div>
      )}

      {activeModal === 'edit_contact' && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-neutral-950 border border-neutral-800 rounded-3xl p-6 flex flex-col gap-6">
            <h3 className="font-black uppercase text-blue-400">Modifier Partenaire</h3>
            <form onSubmit={handleUpdateContact} className="flex flex-col gap-4">
              <div className="flex gap-2"><input type="text" className="w-16 bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-center" value={contactForm.emoji} onChange={(e) => setContactForm(p => ({...p, emoji: e.target.value}))} /><input type="text" required className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl p-3" value={contactForm.name} onChange={(e) => setContactForm(p => ({...p, name: e.target.value}))} /></div>
              <input type="text" className="bg-neutral-900 border border-neutral-800 rounded-xl p-3" value={contactForm.country} onChange={(e) => setContactForm(p => ({...p, country: e.target.value}))} />
              <label className="flex items-center gap-2 text-xs font-bold text-neutral-500"><input type="checkbox" checked={contactForm.isArchived} onChange={(e) => setContactForm(p => ({...p, isArchived: e.target.checked}))} /> Archiver</label>
              <button type="submit" disabled={isPending} className="py-3 bg-white text-black font-black rounded-xl uppercase">Sauver</button>
            </form>
          </div>
        </div>
      )}

      {activeModal === 'add_reminder' && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-neutral-950 border border-neutral-800 rounded-3xl p-6 flex flex-col gap-6">
            <h3 className="font-black uppercase text-amber-500">Nouveau Rappel</h3>
            <form onSubmit={handleCreateReminderSubmit} className="flex flex-col gap-4">
              <select required className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-sm" value={reminderForm.contactId} onChange={(e) => setReminderForm(p => ({...p, contactId: e.target.value}))}><option value="">-- Partenaire --</option>{allContacts.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}</select>
              <div className="flex gap-2"><input type="number" step="any" required className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl p-3" placeholder="Montant" value={reminderForm.amount} onChange={(e) => setReminderForm(p => ({...p, amount: e.target.value}))} /><select className="bg-neutral-900 border border-neutral-800 rounded-xl px-2" value={reminderForm.currencyCode} onChange={(e) => setReminderForm(p => ({...p, currencyCode: e.target.value}))}>{activeCurrencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}</select></div>
              <input type="date" required className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-sm text-white" value={reminderForm.dueDate} onChange={(e) => setReminderForm(p => ({...p, dueDate: e.target.value}))} />
              <input type="text" className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-sm" placeholder="Note..." value={reminderForm.note} onChange={(e) => setReminderForm(p => ({...p, note: e.target.value}))} />
              <button type="submit" disabled={isPending} className="py-3 bg-white text-black font-black rounded-xl uppercase">Enregistrer</button>
            </form>
          </div>
        </div>
      )}

      {lightboxImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 cursor-pointer" onClick={() => setLightboxImage(null)}>
          <button className="absolute top-6 right-6 p-2 bg-neutral-900 border border-neutral-800 text-white rounded-full"><X className="h-5 w-5" /></button>
          <img src={lightboxImage} className="max-w-full max-h-[85vh] rounded-2xl object-contain border border-neutral-800" />
        </div>
      )}
    </div>
  );
}

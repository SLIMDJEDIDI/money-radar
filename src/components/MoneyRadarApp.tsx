'use client';

import React, { useState, useTransition, useMemo } from 'react';
import {
  Plus,
  ArrowLeftRight,
  Camera,
  Search,
  AlertTriangle,
  Coins,
  Package,
  Users,
  CheckCircle,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  RefreshCw,
  Clock,
  ExternalLink,
  ShieldAlert,
  UserPlus,
  ArrowRight,
  Building,
  User,
  DollarSign
} from 'lucide-react';
import { createMovement, reconcileHolder, createHolder } from '../app/actions';

interface Holder {
  id: string;
  name: string;
  emoji: string;
  color: string;      // "green" | "blue" | "orange" | "red"
  category: string;   // "holder" | "partner" | "upcoming"
  partnerType: string | null; // "person" | "company"
  isUpcoming: boolean;
  expectedBalance: number;
  actualBalance: number;
  difference: number;
  isSpecialTransit: boolean;
  balances: {
    currency: string;
    expectedBalance: number;
    actualBalance: number;
  }[];
}

interface Metrics {
  totalWealth: number;
  availableCash: number;
  inventoryValue: number;
  receivables: number;
  payables: number;
  upcomingPayments: number;
  expectedTotalWealth: number;
}

interface Movement {
  id: string;
  amount: number;
  currency: string;
  amountInUsd: number;
  fromHolderId: string | null;
  toHolderId: string | null;
  fromHolder?: { name: string; emoji: string } | null;
  toHolder?: { name: string; emoji: string } | null;
  note: string | null;
  photoPath: string | null;
  createdAt: Date;
}

interface MoneyRadarAppProps {
  initialHolders: Holder[];
  initialMetrics: Metrics;
  initialMovements: any[];
}

export default function MoneyRadarApp({
  initialHolders,
  initialMetrics,
  initialMovements
}: MoneyRadarAppProps) {
  // Core State
  const [holders, setHolders] = useState<Holder[]>(initialHolders);
  const [metrics, setMetrics] = useState<Metrics>(initialMetrics);
  const [movements, setMovements] = useState<Movement[]>(
    initialMovements.map(m => ({ ...m, createdAt: new Date(m.createdAt) }))
  );
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHolder, setSelectedHolder] = useState<Holder | null>(null);
  const [holderMovements, setHolderMovements] = useState<Movement[]>([]);
  const [isLoadingHolder, setIsLoadingHolder] = useState(false);

  // Active Category View Filter: "all" | "wallets" | "partners" | "upcoming"
  const [activeTab, setActiveCategoryTab] = useState<'all' | 'wallets' | 'partners' | 'upcoming'>('all');

  // Modal Controllers
  const [activeModal, setActiveModal] = useState<'movement' | 'transfer' | 'proof' | 'account' | null>(null);
  
  // Movement & Transfer Form State
  const [formData, setFormData] = useState({
    amount: '',
    currency: 'USD',
    fromHolderId: '',
    toHolderId: '',
    note: '',
    photo: null as File | null
  });

  // Create Account Form State
  const [accountFormData, setAccountFormData] = useState({
    name: '',
    emoji: '💵',
    color: 'blue',
    category: 'holder',
    partnerType: 'person',
    initialCurrency: 'USD',
    initialExpected: '',
    initialActual: ''
  });
  
  // Specific Currency Reconciliation State
  const [reconcileCurrency, setReconcileCurrency] = useState('USD');
  const [reconcileVal, setReconcileVal] = useState('');
  
  const [isPending, startTransition] = useTransition();
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Currency Symbology Map
  const CURRENCY_SYMBOLS: Record<string, string> = {
    USD: '$',
    EUR: '€',
    TND: 'DT',
  };

  const formatUSD = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatRawCurrency = (val: number, curr: string) => {
    return `${CURRENCY_SYMBOLS[curr] || curr} ${new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2
    }).format(val)}`;
  };

  // Live client-side state sync
  const refreshAppState = async () => {
    const response = await fetch('/api/dashboard-data');
    if (response.ok) {
      const data = await response.json();
      setHolders(data.holders);
      setMetrics(data.metrics);
      setMovements(data.movements.map((m: any) => ({ ...m, createdAt: new Date(m.createdAt) })));
      
      // Keep selected details Panel updated
      if (selectedHolder) {
        const updatedSelected = data.holders.find((h: any) => h.id === selectedHolder.id);
        if (updatedSelected) {
          setSelectedHolder(updatedSelected);
          
          // Re-fetch individual timeline
          const timelineRes = await fetch(`/api/dashboard-data`); // fallback timeline refresh
          const details = data.movements.filter((m: any) => m.fromHolderId === updatedSelected.id || m.toHolderId === updatedSelected.id);
          setHolderMovements(details.map((m: any) => ({ ...m, createdAt: new Date(m.createdAt) })));
        }
      }
    }
  };

  // Filter Holders based on search AND top navigation tab category
  const filteredHolders = useMemo(() => {
    let result = holders;

    // Filter by Top Segmented Tab
    if (activeTab === 'wallets') {
      result = result.filter(h => h.category === 'holder');
    } else if (activeTab === 'partners') {
      result = result.filter(h => h.category === 'partner');
    } else if (activeTab === 'upcoming') {
      result = result.filter(h => h.category === 'upcoming' || h.isUpcoming);
    }

    // Filter by Search Query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        h =>
          h.name.toLowerCase().includes(q) ||
          h.color.toLowerCase().includes(q) ||
          h.category.toLowerCase().includes(q) ||
          h.balances.some(b => b.currency.toLowerCase().includes(q))
      );
    }

    return result;
  }, [holders, activeTab, searchQuery]);

  const filteredMovements = useMemo(() => {
    if (!searchQuery) return movements;
    const q = searchQuery.toLowerCase();
    return movements.filter(m => {
      const fromName = m.fromHolder?.name.toLowerCase() || 'external';
      const toName = m.toHolder?.name.toLowerCase() || 'external';
      const note = m.note?.toLowerCase() || '';
      const amountStr = m.amount.toString();
      const currency = m.currency.toLowerCase();
      return (
        fromName.includes(q) ||
        toName.includes(q) ||
        note.includes(q) ||
        amountStr.includes(q) ||
        currency.includes(q)
      );
    });
  }, [movements, searchQuery]);

  // Click handler to load Holder details and setup initial reconciliation currency
  const handleSelectHolder = async (holder: Holder) => {
    setIsLoadingHolder(true);
    setSelectedHolder(holder);
    
    // Default to the first available currency in their wallet for physical reconciliation
    const defaultCurrency = holder.balances[0]?.currency || 'USD';
    setReconcileCurrency(defaultCurrency);
    setReconcileVal((holder.balances[0]?.actualBalance ?? 0).toString());

    try {
      const response = await fetch(`/api/dashboard-data`); // Sync state
      const timeline = movements.filter(m => m.fromHolderId === holder.id || m.toHolderId === holder.id);
      setHolderMovements(timeline);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingHolder(false);
    }
  };

  // Change reconciliation input value when currency changes
  const handleReconcileCurrencyChange = (curr: string) => {
    setReconcileCurrency(curr);
    const currBalance = selectedHolder?.balances.find(b => b.currency === curr);
    setReconcileVal((currBalance?.actualBalance ?? 0).toString());
  };

  // Submit Movement Form
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount) return;

    const data = new FormData();
    data.append('amount', formData.amount);
    data.append('currency', formData.currency);
    data.append('fromHolderId', formData.fromHolderId);
    data.append('toHolderId', formData.toHolderId);
    data.append('note', formData.note);
    if (formData.photo) {
      data.append('photo', formData.photo);
    }

    startTransition(async () => {
      const res = await createMovement(data);
      if (res.success) {
        setFormData({
          amount: '',
          currency: 'USD',
          fromHolderId: '',
          toHolderId: '',
          note: '',
          photo: null
        });
        setActiveModal(null);
        await refreshAppState();
      } else {
        alert(res.error || 'Operation failed');
      }
    });
  };

  // Submit Reconciliation count per specific currency
  const handleReconcileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHolder) return;
    
    const actualVal = parseFloat(reconcileVal);
    if (isNaN(actualVal)) return;

    startTransition(async () => {
      const res = await reconcileHolder(selectedHolder.id, reconcileCurrency, actualVal);
      if (res.success) {
        await refreshAppState();
        // Update selected holder local state reference
        const updatedSelected = holders.find(h => h.id === selectedHolder.id);
        if (updatedSelected) {
          setSelectedHolder(updatedSelected);
        }
      } else {
        alert('Reconciliation failed');
      }
    });
  };

  // Submit Dynamic Account Creator Form
  const handleCreateAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountFormData.name) return;

    const data = new FormData();
    data.append('name', accountFormData.name);
    data.append('emoji', accountFormData.emoji);
    data.append('color', accountFormData.color);
    data.append('category', accountFormData.category);
    data.append('partnerType', accountFormData.partnerType);
    data.append('initialCurrency', accountFormData.initialCurrency);
    data.append('initialExpected', accountFormData.initialExpected || '0');
    data.append('initialActual', accountFormData.initialActual || '0');

    startTransition(async () => {
      const res = await createHolder(data);
      if (res.success) {
        // Reset form
        setAccountFormData({
          name: '',
          emoji: '💵',
          color: 'blue',
          category: 'holder',
          partnerType: 'person',
          initialCurrency: 'USD',
          initialExpected: '',
          initialActual: ''
        });
        setActiveModal(null);
        await refreshAppState();
      } else {
        alert(res.error || 'Failed to create account');
      }
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, photo: e.target.files![0] }));
    }
  };

  // Perfect color map matching specified requirements
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'green':
        return {
          border: 'border-emerald-500/20',
          bg: 'bg-emerald-500/5',
          text: 'text-emerald-400',
          badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          glow: 'glow-green'
        };
      case 'orange':
        return {
          border: 'border-orange-500/20',
          bg: 'bg-orange-500/5',
          text: 'text-orange-400',
          badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
          glow: 'glow-orange'
        };
      case 'red':
        return {
          border: 'border-red-500/20',
          bg: 'bg-red-500/5',
          text: 'text-red-400',
          badge: 'bg-red-500/10 text-red-400 border-red-500/20',
          glow: 'glow-red'
        };
      case 'blue':
      default:
        return {
          border: 'border-blue-500/20',
          bg: 'bg-blue-500/5',
          text: 'text-blue-400',
          badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
          glow: 'glow-blue'
        };
    }
  };

  return (
    <div className="safe-bottom pb-24 md:pb-6">
      {/* 1. Header & Dynamic Search Engine */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-neutral-900 px-4 py-4 md:py-6">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <h1 className="text-xl md:text-2xl font-black tracking-wider text-neutral-100 uppercase">
                  MONEY RADAR
                </h1>
                <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-0.5">COMMAND CENTER</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Add Account Button */}
              <button
                onClick={() => setActiveModal('account')}
                className="p-2.5 rounded-full bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-emerald-400 hover:text-emerald-300 transition active:scale-95 flex items-center gap-1.5 text-xs font-bold px-4"
                title="Create Account/Partner"
              >
                <Plus className="h-4 w-4" />
                <span>Account</span>
              </button>
              
              <button 
                onClick={refreshAppState}
                className="p-2.5 rounded-full bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 transition active:scale-95"
                title="Sync System"
              >
                <RefreshCw className={`h-4 w-4 text-neutral-400 ${isPending ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Type Ahmed, Wise, 5000, EUR, Company, Container..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl py-3 pl-11 pr-4 text-sm text-white placeholder-neutral-500 outline-none focus:border-neutral-600 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-400"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 mt-6 flex flex-col gap-8">
        
        {/* 2. Apple Wallet Style Giant Metric cards */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Main Total Net Wealth Card */}
          <div className="md:col-span-2 glass-panel rounded-3xl p-6 relative overflow-hidden border border-neutral-800 glow-blue flex flex-col justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                TOTAL MONEY (USD)
              </p>
              <h2 className="text-4xl md:text-5xl font-black mt-2 tracking-tight text-white">
                {formatUSD(metrics.totalWealth)}
              </h2>
            </div>
            
            <div className="mt-4 pt-4 border-t border-neutral-900 flex justify-between items-center text-xs text-neutral-500">
              <span>Expected: {formatUSD(metrics.expectedTotalWealth)}</span>
              {metrics.totalWealth !== metrics.expectedTotalWealth ? (
                <span className={`font-semibold px-2 py-0.5 rounded-lg ${
                  metrics.totalWealth >= metrics.expectedTotalWealth ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                }`}>
                  Drift: {formatUSD(metrics.totalWealth - metrics.expectedTotalWealth)}
                </span>
              ) : (
                <span className="text-emerald-500">100% Reconciled</span>
              )}
            </div>
          </div>

          {/* Available Cash */}
          <div className="glass-panel rounded-3xl p-6 border border-neutral-800 relative glow-blue flex flex-col justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                AVAILABLE CASH
              </p>
              <h3 className="text-2xl md:text-3xl font-black mt-2 text-blue-400">
                {formatUSD(metrics.availableCash)}
              </h3>
            </div>
            <p className="text-[10px] text-neutral-500 mt-4">Cash wallets, Tunisia banks, Wise</p>
          </div>

          {/* Inventory Value */}
          <div className="glass-panel rounded-3xl p-6 border border-neutral-800 relative glow-orange flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  INVENTORY VALUE
                </p>
                <h3 className="text-2xl md:text-3xl font-black mt-2 text-orange-400">
                  {formatUSD(metrics.inventoryValue)}
                </h3>
              </div>
              <Package className="h-5 w-5 text-orange-400 opacity-50" />
            </div>
            <p className="text-[10px] text-neutral-500 mt-4">Goods in Transit / Factory advances</p>
          </div>

          {/* Receivables (Owed to you) */}
          <div className="glass-panel rounded-3xl p-6 border border-neutral-800 relative glow-green flex flex-col justify-between md:col-span-2">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  RECEIVABLES (OWED TO YOU)
                </p>
                <h3 className="text-2xl md:text-3xl font-black mt-2 text-emerald-400">
                  {formatUSD(metrics.receivables)}
                </h3>
              </div>
              <Users className="h-5 w-5 text-emerald-400 opacity-50" />
            </div>
            <p className="text-[10px] text-neutral-500 mt-4">Ahmed, Brother, China Office</p>
          </div>

          {/* Smart Feature widget: Upcoming Debit/Payments Card */}
          <div className="glass-panel rounded-3xl p-6 border border-neutral-800 relative glow-red flex flex-col justify-between md:col-span-2">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  UPCOMING PAYMENTS
                </p>
                <h3 className="text-2xl md:text-3xl font-black mt-2 text-red-400">
                  {formatUSD(metrics.upcomingPayments)}
                </h3>
              </div>
              <Clock className="h-5 w-5 text-red-400 opacity-50" />
            </div>
            <p className="text-[10px] text-neutral-500 mt-4">Future debit areas (Rent, Logistics, etc.)</p>
          </div>
        </section>

        {/* 3. Three-way Segmented Navigation Tab bar */}
        <section className="flex flex-col gap-4">
          <div className="bg-neutral-950 p-1 rounded-2xl border border-neutral-900 flex">
            {[
              { id: 'all', label: 'All Holders' },
              { id: 'wallets', label: 'My Wallets' },
              { id: 'partners', label: 'Partners / 3rd Party' },
              { id: 'upcoming', label: 'Upcoming' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCategoryTab(tab.id as any)}
                className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold tracking-wide transition ${
                  activeTab === tab.id
                    ? 'bg-neutral-900 text-white border border-neutral-800 shadow-md'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Holders grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredHolders.map((holder) => {
              const styles = getColorClasses(holder.color);
              const drift = holder.actualBalance - holder.expectedBalance;
              
              return (
                <div
                  key={holder.id}
                  onClick={() => handleSelectHolder(holder)}
                  className={`glass-panel border rounded-3xl p-5 cursor-pointer hover:border-neutral-700 hover:bg-neutral-900/30 transition active:scale-[0.99] flex flex-col gap-4 justify-between ${styles.border} ${styles.glow}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <span className="text-3xl bg-neutral-900 border border-neutral-800 p-2.5 rounded-2xl">
                        {holder.emoji}
                      </span>
                      <div>
                        <h4 className="font-bold text-white text-base flex items-center gap-1.5 flex-wrap">
                          {holder.name}
                          {holder.partnerType && (
                            <span className="text-[9px] uppercase font-black tracking-widest px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">
                              {holder.partnerType}
                            </span>
                          )}
                          {holder.category === 'upcoming' && (
                            <span className="text-[9px] uppercase font-black tracking-widest px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                              DEBIT
                            </span>
                          )}
                        </h4>
                        <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-0.5">
                          {holder.category}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className={`text-lg font-black ${styles.text}`}>
                        {formatUSD(holder.actualBalance)}
                      </p>
                      {drift !== 0 && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          drift > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {drift > 0 ? '+' : ''}{formatUSD(drift)} Drift
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Multi-Currency breakdown pills */}
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-neutral-900/50">
                    {holder.balances.map((b) => (
                      <span
                        key={b.currency}
                        className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-neutral-950 border border-neutral-900 text-neutral-300"
                      >
                        {formatRawCurrency(b.actualBalance, b.currency)}
                        {b.actualBalance !== b.expectedBalance && (
                          <span className="text-[9px] ml-1 text-neutral-500">
                            (sh. {formatRawCurrency(b.expectedBalance, b.currency)})
                          </span>
                        )}
                      </span>
                    ))}
                    {holder.balances.length === 0 && (
                      <span className="text-xs text-neutral-600 italic">No wallets initialized</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {filteredHolders.length === 0 && (
            <div className="text-center py-12 border border-dashed border-neutral-900 rounded-3xl text-neutral-600 text-xs">
              No money holders match your search criteria.
            </div>
          )}
        </section>

        {/* 4. Global Movements History */}
        <section className="flex flex-col gap-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400">
            RECENT RADAR ACTIVITY
          </h3>
          <div className="flex flex-col gap-3">
            {filteredMovements.slice(0, 8).map((mov) => {
              const fromName = mov.fromHolder?.name || 'External Inflow';
              const fromEmoji = mov.fromHolder?.emoji || '📥';
              const toName = mov.toHolder?.name || 'External Outflow';
              const toEmoji = mov.toHolder?.emoji || '📤';
              const isTransfer = mov.fromHolderId && mov.toHolderId;

              return (
                <div
                  key={mov.id}
                  className="glass-panel border border-neutral-900 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center -space-x-2 bg-neutral-900 border border-neutral-800 p-2 rounded-xl">
                      <span className="text-lg">{fromEmoji}</span>
                      {isTransfer && <span className="text-lg">{toEmoji}</span>}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-neutral-100">{fromName}</span>
                        {isTransfer && (
                          <>
                            <ChevronRight className="h-3 w-3 text-neutral-500" />
                            <span className="font-bold text-sm text-neutral-100">{toName}</span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 mt-1">
                        {mov.note || <span className="italic text-neutral-700">No note added</span>}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 border-t border-neutral-900/50 pt-2.5 md:pt-0 md:border-0">
                    <div className="text-xs text-neutral-500 flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      <span>
                        {mov.createdAt.toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-sm font-black text-white">
                          {mov.currency !== 'USD' && (
                            <span className="text-xs text-neutral-500 mr-1.5">
                              {formatRawCurrency(mov.amount, mov.currency)}
                            </span>
                          )}
                          {formatUSD(mov.amountInUsd)}
                        </p>
                      </div>

                      {mov.photoPath && (
                        <button
                          onClick={() => setLightboxImage(mov.photoPath)}
                          className="p-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-blue-400 hover:text-blue-300 hover:border-neutral-700 transition"
                        >
                          <Camera className="h-4 w-4 animate-pulse" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* 5. PERSISTENT DOCK (Only 3 Main Buttons) */}
      <div className="fixed bottom-6 left-0 right-0 z-40 px-4 flex justify-center pointer-events-none">
        <div className="glass-panel border border-neutral-800 rounded-full px-5 py-3.5 shadow-2xl flex items-center gap-6 pointer-events-auto">
          {/* Movement Button */}
          <button
            onClick={() => {
              setFormData(p => ({ ...p, fromHolderId: '', toHolderId: '' }));
              setActiveModal('movement');
            }}
            className="flex items-center gap-2 bg-emerald-500 text-black font-extrabold text-sm px-6 py-3 rounded-full hover:bg-emerald-400 transition active:scale-95 glow-green"
          >
            <Plus className="h-4.5 w-4.5 stroke-[3]" />
            <span>Movement</span>
          </button>

          {/* Transfer Button */}
          <button
            onClick={() => {
              setFormData(p => ({ ...p, fromHolderId: '', toHolderId: '' }));
              setActiveModal('transfer');
            }}
            className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-white font-bold text-sm px-5 py-3 rounded-full transition active:scale-95"
          >
            <ArrowLeftRight className="h-4 w-4" />
            <span>Transfer</span>
          </button>

          {/* Quick Proof Button */}
          <button
            onClick={() => {
              setFormData(p => ({ ...p, fromHolderId: '', toHolderId: 'external' }));
              setActiveModal('proof');
            }}
            className="p-3 rounded-full bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 transition active:scale-95"
            title="Attach Quick Proof"
          >
            <Camera className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* 6. DETAIL PANEL WITH MULTI-CURRENCY DRIFT RECONCILER */}
      {selectedHolder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-neutral-950 border-l border-neutral-800 h-full overflow-y-auto flex flex-col relative">
            
            {/* Header */}
            <div className="sticky top-0 z-20 bg-neutral-950/90 backdrop-blur-md px-6 py-5 border-b border-neutral-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-4xl bg-neutral-900 border border-neutral-800 p-2 rounded-xl">
                  {selectedHolder.emoji}
                </span>
                <div>
                  <h3 className="font-black text-xl text-white">{selectedHolder.name}</h3>
                  <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded ${
                    getColorClasses(selectedHolder.color).badge
                  }`}>
                    {selectedHolder.category}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedHolder(null)}
                className="p-2 bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-8 flex-1">
              {/* Aggregated USD display */}
              <div className={`border rounded-3xl p-6 ${getColorClasses(selectedHolder.color).bg} ${getColorClasses(selectedHolder.color).border}`}>
                <p className="text-xs text-neutral-400 uppercase tracking-wider font-bold">
                  Total Actual Balance (USD)
                </p>
                <p className={`text-4xl font-black mt-1 ${getColorClasses(selectedHolder.color).text}`}>
                  {formatUSD(selectedHolder.actualBalance)}
                </p>

                <div className="mt-4 pt-4 border-t border-neutral-900 flex justify-between text-xs text-neutral-400">
                  <span>Expected total: {formatUSD(selectedHolder.expectedBalance)}</span>
                  <span>Drift: {formatUSD(selectedHolder.difference)}</span>
                </div>
              </div>

              {/* Individual currency wallets list */}
              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  Currency Breakdown
                </h4>
                <div className="flex flex-col gap-2">
                  {selectedHolder.balances.map((b) => {
                    const diff = b.actualBalance - b.expectedBalance;
                    return (
                      <div key={b.currency} className="bg-neutral-900 border border-neutral-900/60 p-4 rounded-2xl flex justify-between items-center">
                        <div>
                          <p className="text-xs text-neutral-500 font-bold uppercase">{b.currency} Wallet</p>
                          <p className="text-sm font-bold text-neutral-300 mt-1">Expected: {formatRawCurrency(b.expectedBalance, b.currency)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-black text-white">{formatRawCurrency(b.actualBalance, b.currency)}</p>
                          {diff !== 0 && (
                            <span className={`text-[9px] px-1 py-0.5 rounded font-bold ${diff > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                              {diff > 0 ? '+' : ''}{formatRawCurrency(diff, b.currency)} drift
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SMART RECONCILIATION FOR CHOSEN CURRENCY */}
              <div className="glass-panel border border-neutral-900 rounded-3xl p-5">
                <h4 className="text-sm font-bold text-neutral-300 uppercase tracking-wider mb-3">
                  Verify actual physical count
                </h4>
                <form onSubmit={handleReconcileSubmit} className="flex flex-col gap-3">
                  {/* Select which currency is physically counted */}
                  <div className="flex gap-2">
                    <select
                      value={reconcileCurrency}
                      onChange={(e) => handleReconcileCurrencyChange(e.target.value)}
                      className="bg-neutral-900 border border-neutral-800 text-xs font-bold text-neutral-300 rounded-xl px-3 py-2 outline-none focus:border-neutral-600"
                    >
                      {selectedHolder.balances.map(b => (
                        <option key={b.currency} value={b.currency}>{b.currency} Wallet</option>
                      ))}
                    </select>

                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500 font-bold">
                        {CURRENCY_SYMBOLS[reconcileCurrency] || '$'}
                      </span>
                      <input
                        type="number"
                        placeholder="Count"
                        value={reconcileVal}
                        onChange={(e) => setReconcileVal(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-2 pl-8 pr-3 text-sm text-white focus:border-neutral-600 outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full bg-white text-black font-black text-xs py-2.5 rounded-xl hover:bg-neutral-200 transition disabled:opacity-50"
                  >
                    {isPending ? 'Updating count...' : 'Update Currency Count'}
                  </button>
                </form>
              </div>

              {/* Timeline */}
              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  Timeline
                </h4>

                {isLoadingHolder ? (
                  <div className="text-center py-6 text-neutral-500 text-xs flex items-center justify-center gap-2">
                    <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                    <span>Syncing logs...</span>
                  </div>
                ) : holderMovements.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-neutral-900 rounded-2xl text-neutral-600 text-xs">
                    No movements recorded yet
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {holderMovements.map((mov) => {
                      const isOutgoing = mov.fromHolderId === selectedHolder.id;
                      const relatedName = isOutgoing
                        ? (mov.toHolder?.name || 'External')
                        : (mov.fromHolder?.name || 'External');
                      const relatedEmoji = isOutgoing
                        ? (mov.toHolder?.emoji || '📤')
                        : (mov.fromHolder?.emoji || '📥');

                      return (
                        <div
                          key={mov.id}
                          className="bg-neutral-900/60 border border-neutral-900 rounded-2xl p-4 flex justify-between items-center gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl bg-neutral-950 p-1.5 rounded-lg border border-neutral-800">
                              {relatedEmoji}
                            </span>
                            <div>
                              <p className="text-sm font-bold text-white">
                                {isOutgoing ? 'Sent to' : 'Received from'} {relatedName}
                              </p>
                              <p className="text-xs text-neutral-400 mt-0.5">
                                {mov.note || <span className="italic text-neutral-700">No note</span>}
                              </p>
                            </div>
                          </div>

                          <div className="text-right flex items-center gap-2">
                            <div>
                              <p className={`text-sm font-extrabold ${isOutgoing ? 'text-neutral-400' : 'text-emerald-400'}`}>
                                {isOutgoing ? '-' : '+'}{formatRawCurrency(mov.amount, mov.currency)}
                              </p>
                              <p className="text-[10px] text-neutral-500">
                                {mov.createdAt.toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </p>
                            </div>
                            {mov.photoPath && (
                              <button
                                onClick={() => setLightboxImage(mov.photoPath)}
                                className="p-1 rounded bg-neutral-950 border border-neutral-800 text-blue-400"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. +MOVEMENT & ↔ TRANSFER MODAL */}
      {activeModal && activeModal !== 'account' && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-3xl p-6 relative flex flex-col gap-6">
            <div className="flex justify-between items-center border-b border-neutral-900 pb-4">
              <h3 className="text-lg font-black tracking-wide uppercase text-white flex items-center gap-2">
                {activeModal === 'movement' && <Plus className="h-5 w-5 text-emerald-400" />}
                {activeModal === 'transfer' && <ArrowLeftRight className="h-5 w-5 text-blue-400" />}
                {activeModal === 'proof' && <Camera className="h-5 w-5 text-yellow-500" />}
                {activeModal === 'movement' && 'New Money Movement'}
                {activeModal === 'transfer' && 'New Transfer'}
                {activeModal === 'proof' && 'Upload Quick Proof'}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white rounded-full transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-3 px-4 text-xl font-bold text-white outline-none focus:border-neutral-600 placeholder-neutral-700"
                  />
                </div>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                  className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-neutral-600 cursor-pointer"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="TND">TND (DT)</option>
                </select>
              </div>

              {activeModal !== 'proof' && (
                <div>
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                    From
                  </label>
                  <select
                    required={activeModal === 'transfer'}
                    value={formData.fromHolderId}
                    onChange={(e) => setFormData(prev => ({ ...prev, fromHolderId: e.target.value }))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-2.5 px-3.5 text-sm text-white outline-none focus:border-neutral-600 cursor-pointer"
                  >
                    <option value="">-- Select Source --</option>
                    {activeModal === 'movement' && <option value="external">📥 External Income (Outside money)</option>}
                    {holders.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.emoji} {h.name} ({formatUSD(h.actualBalance)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                  To
                </label>
                <select
                  required={activeModal === 'transfer' || activeModal === 'proof'}
                  value={formData.toHolderId}
                  onChange={(e) => setFormData(prev => ({ ...prev, toHolderId: e.target.value }))}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-2.5 px-3.5 text-sm text-white outline-none focus:border-neutral-600 cursor-pointer"
                >
                  <option value="">-- Select Destination --</option>
                  {activeModal === 'movement' && <option value="external">📤 External Expense (Outside payment)</option>}
                  {holders.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.emoji} {h.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                  Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paid factory invoice, loan returned..."
                  value={formData.note}
                  onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-2.5 px-3.5 text-sm text-white outline-none focus:border-neutral-600 placeholder-neutral-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                  Attach Proof (Invoice, Whatsapp SS, Receipt)
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-neutral-300 cursor-pointer transition active:scale-95">
                    <Camera className="h-4 w-4" />
                    <span>Choose Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs text-neutral-500 truncate max-w-[200px]">
                    {formData.photo ? formData.photo.name : 'No proof attached'}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full mt-2 py-3 bg-white text-black hover:bg-neutral-200 transition font-black tracking-wide text-sm rounded-xl disabled:opacity-50"
              >
                {isPending ? 'SYNCING TRANSACTION...' : 'SAVE TRANSACTION'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 8. +ACCOUNT CREATION MODAL */}
      {activeModal === 'account' && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-3xl p-6 relative flex flex-col gap-6">
            <div className="flex justify-between items-center border-b border-neutral-900 pb-4">
              <h3 className="text-lg font-black tracking-wide uppercase text-white flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-emerald-400" />
                <span>Create New Account</span>
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white rounded-full transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAccountSubmit} className="flex flex-col gap-4">
              
              {/* Category selector */}
              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                  Account Type
                </label>
                <select
                  value={accountFormData.category}
                  onChange={(e) => setAccountFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-2.5 px-3.5 text-sm text-white outline-none focus:border-neutral-600 cursor-pointer"
                >
                  <option value="holder">🏦 My Wallet (Cash, Bank, Wise)</option>
                  <option value="partner">🤝 3rd Party Partner (Company or Person)</option>
                  <option value="upcoming">📋 Upcoming Debit Payment (Rent, Logistics)</option>
                </select>
              </div>

              {/* Name & Emoji input */}
              <div className="flex gap-2">
                <div className="w-20">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                    Emoji
                  </label>
                  <input
                    type="text"
                    required
                    value={accountFormData.emoji}
                    onChange={(e) => setAccountFormData(prev => ({ ...prev, emoji: e.target.value }))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-2.5 px-3.5 text-center text-lg focus:border-neutral-600 outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                    Account Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Slim Cash, ZARBITI Factory, Ahmed"
                    value={accountFormData.name}
                    onChange={(e) => setAccountFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-2.5 px-3.5 text-sm text-white focus:border-neutral-600 outline-none placeholder-neutral-700"
                  />
                </div>
              </div>

              {/* Color selector */}
              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                  Color Indicator
                </label>
                <select
                  value={accountFormData.color}
                  onChange={(e) => setAccountFormData(prev => ({ ...prev, color: e.target.value }))}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-2.5 px-3.5 text-sm text-white outline-none focus:border-neutral-600 cursor-pointer"
                >
                  <option value="blue">🔵 Blue (Your cash/assets)</option>
                  <option value="green">🟢 Green (Money owed to you)</option>
                  <option value="orange">🟠 Orange (Inventory/Goods in transit)</option>
                  <option value="red">🔴 Red (Money you owe / Liabilities)</option>
                </select>
              </div>

              {/* Conditional Partner Type selector */}
              {accountFormData.category === 'partner' && (
                <div>
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                    Partner Classification
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                      <input
                        type="radio"
                        name="partnerType"
                        checked={accountFormData.partnerType === 'person'}
                        onChange={() => setAccountFormData(prev => ({ ...prev, partnerType: 'person' }))}
                        className="accent-white h-4 w-4"
                      />
                      <span>Person</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                      <input
                        type="radio"
                        name="partnerType"
                        checked={accountFormData.partnerType === 'company'}
                        onChange={() => setAccountFormData(prev => ({ ...prev, partnerType: 'company' }))}
                        className="accent-white h-4 w-4"
                      />
                      <span>Company</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Wallet initial balance configuration */}
              <div className="border-t border-neutral-900 pt-4 mt-2 flex flex-col gap-3">
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  Initial Wallet Balance
                </h4>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">
                      Expected count
                    </label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={accountFormData.initialExpected}
                      onChange={(e) => setAccountFormData(prev => ({ ...prev, initialExpected: e.target.value }))}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-2 px-3 text-sm focus:border-neutral-600 outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">
                      Actual physical count
                    </label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={accountFormData.initialActual}
                      onChange={(e) => setAccountFormData(prev => ({ ...prev, initialActual: e.target.value }))}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-2 px-3 text-sm focus:border-neutral-600 outline-none"
                    />
                  </div>
                  <div className="w-24">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">
                      Currency
                    </label>
                    <select
                      value={accountFormData.initialCurrency}
                      onChange={(e) => setAccountFormData(prev => ({ ...prev, initialCurrency: e.target.value }))}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-2 px-2 text-xs font-bold focus:border-neutral-600 outline-none cursor-pointer"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="TND">TND (DT)</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full mt-4 py-3 bg-white text-black hover:bg-neutral-200 transition font-black tracking-wide text-sm rounded-xl disabled:opacity-50"
              >
                {isPending ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 9. Lightbox visual proof attachment viewer */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxImage(null)}
        >
          <button 
            className="absolute top-6 right-6 p-2 bg-neutral-900 border border-neutral-800 text-white rounded-full"
            onClick={() => setLightboxImage(null)}
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightboxImage}
            alt="Uploaded Financial Proof"
            className="max-w-full max-h-[85vh] rounded-2xl object-contain border border-neutral-800"
          />
        </div>
      )}
    </div>
  );
}

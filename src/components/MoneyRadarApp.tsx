'use client';

import React, { useState, useTransition, useMemo } from 'react';
import {
  Plus,
  ArrowLeftRight,
  Camera,
  Search,
  AlertTriangle,
  TrendingUp,
  Coins,
  Package,
  Users,
  CheckCircle,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  Check,
  ChevronRight,
  RefreshCw,
  Clock,
  ExternalLink
} from 'lucide-react';
import { createMovement, reconcileHolder, getHolderDetails } from '../app/actions';

interface Holder {
  id: string;
  name: string;
  emoji: string;
  color: string; // "green" | "blue" | "orange" | "red"
  expectedBalance: number;
  actualBalance: number;
  difference: number;
  isSpecialTransit: boolean;
}

interface Metrics {
  totalWealth: number;
  availableCash: number;
  inventoryValue: number;
  receivables: number;
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
  // State
  const [holders, setHolders] = useState<Holder[]>(initialHolders);
  const [metrics, setMetrics] = useState<Metrics>(initialMetrics);
  const [movements, setMovements] = useState<Movement[]>(
    initialMovements.map(m => ({ ...m, createdAt: new Date(m.createdAt) }))
  );
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHolder, setSelectedHolder] = useState<Holder | null>(null);
  const [holderMovements, setHolderMovements] = useState<Movement[]>([]);
  const [isLoadingHolder, setIsLoadingHolder] = useState(false);

  // Forms Modals State
  const [activeModal, setActiveModal] = useState<'movement' | 'transfer' | 'proof' | null>(null);
  const [formData, setFormData] = useState({
    amount: '',
    currency: 'USD',
    fromHolderId: '',
    toHolderId: '',
    note: '',
    photo: null as File | null
  });
  
  const [reconcileVal, setReconcileVal] = useState('');
  const [isPending, startTransition] = useTransition();
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Quick Currency Formatter
  const formatUSD = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Live Filtration on Holders & Timeline
  const filteredHolders = useMemo(() => {
    if (!searchQuery) return holders;
    const q = searchQuery.toLowerCase();
    return holders.filter(
      h =>
        h.name.toLowerCase().includes(q) ||
        h.color.toLowerCase().includes(q) ||
        formatUSD(h.expectedBalance).includes(q) ||
        formatUSD(h.actualBalance).includes(q)
    );
  }, [holders, searchQuery]);

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

  // Click handler to load Holder Timeline and open detail panel
  const handleSelectHolder = async (holder: Holder) => {
    setIsLoadingHolder(true);
    setSelectedHolder(holder);
    setReconcileVal(holder.actualBalance.toString());
    try {
      const details = await getHolderDetails(holder.id);
      setHolderMovements(details.movements.map(m => ({ ...m, createdAt: new Date(m.createdAt) })));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingHolder(false);
    }
  };

  // Refresh entire app state from database
  const refreshAppState = async () => {
    // Standard fetch behavior
    const response = await fetch('/api/dashboard-data');
    if (response.ok) {
      const data = await response.json();
      setHolders(data.holders);
      setMetrics(data.metrics);
      setMovements(data.movements.map((m: any) => ({ ...m, createdAt: new Date(m.createdAt) })));
      
      // Update selected holder details if open
      if (selectedHolder) {
        const updatedSelected = data.holders.find((h: any) => h.id === selectedHolder.id);
        if (updatedSelected) {
          setSelectedHolder(updatedSelected);
          setReconcileVal(updatedSelected.actualBalance.toString());
          const details = await getHolderDetails(updatedSelected.id);
          setHolderMovements(details.movements.map(m => ({ ...m, createdAt: new Date(m.createdAt) })));
        }
      }
    } else {
      // Hard reload fallback
      window.location.reload();
    }
  };

  // Submit Handler for Movements / Transfers
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
        // Reset form
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

  // Submit Handler for Reconciliation (Expected vs Actual)
  const handleReconcileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHolder) return;
    
    const actualVal = parseFloat(reconcileVal);
    if (isNaN(actualVal)) return;

    startTransition(async () => {
      const res = await reconcileHolder(selectedHolder.id, actualVal);
      if (res.success) {
        await refreshAppState();
      } else {
        alert('Reconciliation failed');
      }
    });
  };

  // File change handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, photo: e.target.files![0] }));
    }
  };

  // Color mapper based on the specified requirements
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
      {/* 1. Header & Quick Search Bar */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-neutral-900 px-4 py-4 md:py-6">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <h1 className="text-xl md:text-2xl font-black tracking-wider text-neutral-100 uppercase">
                  MONEY RADAR
                </h1>
              </div>
              <p className="text-xs text-neutral-400">COMMAND CENTER</p>
            </div>
            
            <button 
              onClick={refreshAppState}
              className="p-2 rounded-full bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 transition active:scale-95"
              title="Refresh Data"
            >
              <RefreshCw className={`h-4 w-4 text-neutral-400 ${isPending ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Search holder, currency, note, amount..."
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
        {/* 2. Apple Wallet Style Giant KPI Display */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Main Total Wealth Card (Span 2 cols on desktop) */}
          <div className="md:col-span-2 glass-panel rounded-3xl p-6 relative overflow-hidden border border-neutral-800 glow-blue">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  TOTAL WEALTH (USD)
                </p>
                <h2 className="text-4xl md:text-5xl font-black mt-2 tracking-tight text-white">
                  {formatUSD(metrics.totalWealth)}
                </h2>
              </div>
              <Coins className="h-8 w-8 text-blue-400 opacity-60" />
            </div>
            
            {/* Expected vs Actual Drift highlight */}
            <div className="mt-4 pt-4 border-t border-neutral-900 flex justify-between items-center text-xs">
              <span className="text-neutral-400">Expected: {formatUSD(metrics.expectedTotalWealth)}</span>
              {metrics.totalWealth !== metrics.expectedTotalWealth ? (
                <span className={`font-semibold px-2 py-1 rounded-lg ${
                  metrics.totalWealth >= metrics.expectedTotalWealth ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                }`}>
                  Drift: {formatUSD(metrics.totalWealth - metrics.expectedTotalWealth)}
                </span>
              ) : (
                <span className="text-neutral-500">100% Reconciled</span>
              )}
            </div>
          </div>

          {/* Available Cash (Blue) */}
          <div className="glass-panel rounded-3xl p-6 border border-neutral-800 relative glow-blue flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  AVAILABLE CASH
                </p>
                <h3 className="text-2xl md:text-3xl font-black mt-2 text-blue-400">
                  {formatUSD(metrics.availableCash)}
                </h3>
              </div>
            </div>
            <p className="text-[10px] text-neutral-500 mt-4">Cash Tunisia, Banks, Wise</p>
          </div>

          {/* Inventory Value (Orange) */}
          <div className="glass-panel rounded-3xl p-6 border border-neutral-800 relative glow-orange flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  INVENTORY VALUE
                </p>
                <h3 className="text-2xl md:text-3xl font-black mt-2 text-orange-400">
                  {formatUSD(metrics.inventoryValue)}
                </h3>
              </div>
              <Package className="h-5 w-5 text-orange-400 opacity-50" />
            </div>
            <p className="text-[10px] text-neutral-500 mt-4">In Transit & factory advances</p>
          </div>

          {/* Receivables (Green) */}
          <div className="glass-panel rounded-3xl p-6 border border-neutral-800 relative glow-green flex flex-col justify-between md:col-span-2">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
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
        </section>

        {/* 3. Holders List ("Where is my money right now?") */}
        <section className="flex flex-col gap-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400">
            MONEY HOLDERS
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredHolders.map((holder) => {
              const styles = getColorClasses(holder.color);
              const drift = holder.actualBalance - holder.expectedBalance;
              
              return (
                <div
                  key={holder.id}
                  onClick={() => handleSelectHolder(holder)}
                  className={`glass-panel border rounded-3xl p-5 cursor-pointer hover:border-neutral-700 hover:bg-neutral-900/30 transition active:scale-[0.99] flex justify-between items-center ${styles.border} ${styles.glow}`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl bg-neutral-900 border border-neutral-800 p-2.5 rounded-2xl">
                      {holder.emoji}
                    </span>
                    <div>
                      <h4 className="font-bold text-white text-base flex items-center gap-1.5">
                        {holder.name}
                        {holder.isSpecialTransit && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
                            TRANSIT
                          </span>
                        )}
                      </h4>
                      {drift !== 0 ? (
                        <p className="text-xs text-neutral-400 flex items-center gap-1 mt-0.5">
                          <span>Expected: {formatUSD(holder.expectedBalance)}</span>
                        </p>
                      ) : (
                        <p className="text-xs text-neutral-500 mt-0.5">Fully Reconciled</p>
                      )}
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
                        {drift > 0 ? '+' : ''}{formatUSD(drift)} Diff
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {filteredHolders.length === 0 && (
            <div className="text-center py-12 border border-dashed border-neutral-800 rounded-3xl text-neutral-500 text-sm">
              No Money Holders match your query
            </div>
          )}
        </section>

        {/* 4. Global Movements History Timeline */}
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
                        {mov.note || <span className="italic text-neutral-600">No note added</span>}
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
                              {mov.currency} {mov.amount.toLocaleString()}
                            </span>
                          )}
                          {formatUSD(mov.amountInUsd)}
                        </p>
                      </div>

                      {mov.photoPath && (
                        <button
                          onClick={() => setLightboxImage(mov.photoPath)}
                          className="p-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-blue-400 hover:text-blue-300 hover:border-neutral-700 transition"
                          title="View Proof"
                        >
                          <Camera className="h-4 w-4 animate-pulse" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredMovements.length === 0 && (
              <div className="text-center py-12 border border-dashed border-neutral-800 rounded-3xl text-neutral-500 text-sm">
                No transactions matched your search
              </div>
            )}
          </div>
        </section>
      </div>

      {/* 5. PERSISTENT DOCK (Only 3 Main Buttons - Apple Wallet style floating bar) */}
      <div className="fixed bottom-6 left-0 right-0 z-40 px-4 flex justify-center pointer-events-none">
        <div className="glass-panel border border-neutral-800 rounded-full px-5 py-3.5 shadow-2xl flex items-center gap-6 pointer-events-auto">
          {/* Movement Button (90% of the time) */}
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

      {/* 6. Money Holder DETAIL PANEL (Slides up/in) */}
      {selectedHolder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-neutral-950 border-l border-neutral-800 h-full overflow-y-auto flex flex-col relative">
            
            {/* Detail Header */}
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
                    {selectedHolder.color} holder
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
              {/* Balances Display Card */}
              <div className={`border rounded-3xl p-6 ${getColorClasses(selectedHolder.color).bg} ${getColorClasses(selectedHolder.color).border}`}>
                <p className="text-xs text-neutral-400 uppercase tracking-wider font-bold">
                  Current Actual Balance
                </p>
                <p className={`text-4xl font-black mt-1 ${getColorClasses(selectedHolder.color).text}`}>
                  {formatUSD(selectedHolder.actualBalance)}
                </p>

                <div className="mt-4 pt-4 border-t border-neutral-900 flex justify-between text-xs text-neutral-400">
                  <span>Expected count: {formatUSD(selectedHolder.expectedBalance)}</span>
                  <span>Drift: {formatUSD(selectedHolder.difference)}</span>
                </div>
              </div>

              {/* SMART FEATURE: Reconcile Drift Balance */}
              <div className="glass-panel border border-neutral-900 rounded-3xl p-5">
                <h4 className="text-sm font-bold text-neutral-300 uppercase tracking-wider mb-3">
                  Verify actual physical cash
                </h4>
                <form onSubmit={handleReconcileSubmit} className="flex gap-2.5">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500 font-bold">
                      $
                    </span>
                    <input
                      type="number"
                      placeholder="Actual count"
                      value={reconcileVal}
                      onChange={(e) => setReconcileVal(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-2.5 pl-7 pr-3 text-sm text-white focus:border-neutral-600 outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="bg-white text-black font-extrabold text-xs px-5 py-2.5 rounded-xl hover:bg-neutral-200 transition disabled:opacity-50"
                  >
                    {isPending ? 'Updating...' : 'Update Actual'}
                  </button>
                </form>
                <p className="text-[10px] text-neutral-500 mt-2">
                  Entering the actual count updates the differences dynamically to identify lost or unrecorded money.
                </p>
              </div>

              {/* Holder-specific timeline */}
              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  Timeline
                </h4>

                {isLoadingHolder ? (
                  <div className="text-center py-6 text-neutral-500 text-xs flex items-center justify-center gap-2">
                    <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                    <span>Loading history...</span>
                  </div>
                ) : holderMovements.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-neutral-900 rounded-2xl text-neutral-600 text-xs">
                    No records on this holder yet
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
                              {mov.photoPath && (
                                <span className="text-[10px] text-blue-400 font-semibold flex items-center gap-1 mt-1">
                                  <Camera className="h-3 w-3" />
                                  proof attached
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-right flex items-center gap-2">
                            <div>
                              <p className={`text-sm font-extrabold ${isOutgoing ? 'text-neutral-400' : 'text-emerald-400'}`}>
                                {isOutgoing ? '-' : '+'}{formatUSD(mov.amountInUsd)}
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
      {activeModal && (
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
              {/* Amount & Currency input (Keypad design) */}
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

              {/* Source (From) - only shown for Movement & Transfer */}
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

              {/* Destination (To) */}
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

              {/* Note / Memo */}
              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                  Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cash given, invoice pay, whatsapp deal..."
                  value={formData.note}
                  onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-2.5 px-3.5 text-sm text-white outline-none focus:border-neutral-600 placeholder-neutral-600"
                />
              </div>

              {/* Photo Upload (Receipt/Invoice attachment) */}
              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                  Attach Proof (Screenshot, Photo, Invoice)
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-neutral-300 cursor-pointer transition active:scale-95">
                    <Camera className="h-4 w-4" />
                    <span>Choose Photo</span>
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

              {/* Submit button */}
              <button
                type="submit"
                disabled={isPending}
                className="w-full mt-2 py-3 bg-white text-black hover:bg-neutral-200 transition font-black tracking-wide text-sm rounded-xl disabled:opacity-50"
              >
                {isPending ? 'PROCESSING RADAR...' : 'SAVE MOVEMENT'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 8. Lightbox visual proof attachment viewer */}
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

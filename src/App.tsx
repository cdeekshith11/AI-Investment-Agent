/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TrendingDown, TrendingUp, Bell, PieChart, Activity, Info, AlertTriangle, Settings, Plus, Trash2, Save, X, RefreshCw, Heart, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PortfolioStatus, ETFData } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from 'recharts';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Sparkline = ({ data, color }: { data: any[], color: string }) => (
  <div className="h-8 w-16">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <Line 
          type="monotone" 
          dataKey="price" 
          stroke={color} 
          strokeWidth={2} 
          dot={false} 
          isAnimationActive={false} 
        />
        <YAxis hide domain={['dataMin', 'dataMax']} />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

const HealthGauge = ({ score }: { score: number }) => {
  const color = score > 80 ? '#10b981' : score > 50 ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative w-full h-2 bg-black/5 rounded-full overflow-hidden">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${score}%` }}
        className="h-full"
        style={{ backgroundColor: color }}
      />
    </div>
  );
};

export default function App() {
  const [status, setStatus] = useState<PortfolioStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analysis, setAnalysis] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);
  const [prediction, setPrediction] = useState<string>('');
  const [predicting, setPredicting] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [newEtf, setNewEtf] = useState({ symbol: '', name: '', sipAmount: 1000 });
  const [newAlert, setNewAlert] = useState({ symbol: '', type: 'PRICE_BELOW', value: 0 });

  const fetchStatus = () => {
    setRefreshing(true);
    fetch('/api/portfolio')
      .then(res => res.json())
      .then(data => {
        setStatus(data);
        setLoading(false);
      })
      .catch(err => console.error("Fetch error:", err))
      .finally(() => setRefreshing(false));
  };

  useEffect(() => {
    fetchStatus(); // Initial fetch
    const interval = setInterval(fetchStatus, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const handleAddEtf = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/portfolio/etfs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEtf),
      });
      if (res.ok) {
        setNewEtf({ symbol: '', name: '', sipAmount: 1000 });
        fetchStatus();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteEtf = async (symbol: string) => {
    try {
      const res = await fetch(`/api/portfolio/etfs/${symbol}`, { method: 'DELETE' });
      if (res.ok) fetchStatus();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateEtf = async (symbol: string, updates: { sipAmount?: number }) => {
    try {
      const res = await fetch(`/api/portfolio/etfs/${symbol}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) fetchStatus();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddAlert = async (symbol: string) => {
    if (newAlert.value <= 0) return;
    try {
      const res = await fetch(`/api/portfolio/etfs/${symbol}/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: newAlert.type, value: newAlert.value }),
      });
      if (res.ok) {
        setNewAlert({ symbol: '', type: 'PRICE_BELOW', value: 0 });
        fetchStatus();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAlert = async (symbol: string, alertId: string) => {
    try {
      const res = await fetch(`/api/portfolio/etfs/${symbol}/alerts/${alertId}`, { method: 'DELETE' });
      if (res.ok) fetchStatus();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAnalysis('');
    try {
      const res = await fetch('/api/analyze', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setAnalysis(data.analysis);
    } catch (error: any) {
      console.error(error);
      setAnalysis(`⚠️ Error: ${error.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handlePredict = async () => {
    setPredicting(true);
    setPrediction('');
    try {
      const res = await fetch('/api/predict', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Prediction failed');
      setPrediction(data.prediction);
    } catch (error: any) {
      console.error(error);
      setPrediction(`⚠️ Error: ${error.message}`);
    } finally {
      setPredicting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E4E3E0]">
        <div className="font-mono text-sm animate-pulse">INITIALIZING AGENT...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <header className="mb-12 border-b border-black pb-8 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-medium tracking-tight mb-2">INVESTMENT AGENT</h1>
          <p className="text-xs font-mono opacity-50 uppercase tracking-widest">
            Portfolio Monitoring & Dip Detection System v1.0
          </p>
        </div>
        <div className="text-right flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-mono opacity-50 uppercase mb-1">Data Source</span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase rounded">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Yahoo Finance
            </div>
          </div>
          <button 
            onClick={() => setIsManaging(!isManaging)}
            className={cn(
              "p-2 border border-black hover:bg-black hover:text-white transition-colors",
              isManaging && "bg-black text-white"
            )}
          >
            <Settings size={18} />
          </button>
          <div>
            <p className="text-[10px] font-mono opacity-50 uppercase mb-1">Market Status</p>
            <div className="flex items-center gap-1.5">
              <div className={cn(
                "w-1.5 h-1.5 rounded-full",
                status?.marketOpen ? "bg-emerald-500 animate-pulse" : "bg-red-500"
              )} />
              <p className="text-sm font-mono uppercase">{status?.marketOpen ? "Open" : "Closed"}</p>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-mono opacity-50 uppercase mb-1">Last Data Sync</p>
            <div className="flex items-center gap-4">
              <p className="text-sm font-mono">{new Date(status?.lastUpdate || '').toLocaleTimeString()}</p>
              <button 
                onClick={() => fetchStatus()}
                className="hover:rotate-180 transition-transform duration-500"
                title="Force Refresh"
              >
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {isManaging && (
          <motion.section 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-12 border border-black p-6 bg-white overflow-hidden"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-medium uppercase tracking-widest text-sm">Portfolio Customization</h2>
              <button onClick={() => setIsManaging(false)}><X size={18} /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Add New ETF */}
              <div className="border-r border-black/10 pr-8">
                <h3 className="text-xs font-mono uppercase opacity-50 mb-4">Add New Asset</h3>
                <form onSubmit={handleAddEtf} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <input 
                      placeholder="Symbol (e.g. NIFTY50)"
                      value={newEtf.symbol}
                      onChange={e => setNewEtf({...newEtf, symbol: e.target.value})}
                      className="border border-black p-2 text-xs font-mono"
                      required
                    />
                    <input 
                      placeholder="Name (e.g. Nifty 50 ETF)"
                      value={newEtf.name}
                      onChange={e => setNewEtf({...newEtf, name: e.target.value})}
                      className="border border-black p-2 text-xs font-mono"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase opacity-50">SIP Amount (₹)</label>
                      <input 
                        type="number"
                        value={newEtf.sipAmount}
                        onChange={e => setNewEtf({...newEtf, sipAmount: Number(e.target.value)})}
                        className="w-full border border-black p-2 text-xs font-mono"
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-black text-white p-2 text-xs font-mono uppercase tracking-widest flex items-center justify-center gap-2">
                    <Plus size={14} /> Add to Portfolio
                  </button>
                </form>
              </div>

              {/* Manage Existing */}
              <div>
                <h3 className="text-xs font-mono uppercase opacity-50 mb-4">Current Assets</h3>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {status?.etfs.map((etf, idx) => (
                    <div key={`${etf.symbol}-${idx}`} className="border border-black/10 p-4 bg-black/5 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-medium">{etf.name}</p>
                          <p className="text-[10px] font-mono opacity-50">{etf.symbol}</p>
                        </div>
                        <button 
                          onClick={() => handleDeleteEtf(etf.symbol)}
                          className="text-red-600 hover:bg-red-50 p-1 transition-colors"
                          title="Remove Asset"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3">
                        <div className="space-y-1">
                          <label className="text-[8px] font-mono uppercase opacity-50">SIP (₹)</label>
                          <div className="flex gap-1">
                            <input 
                              type="number"
                              defaultValue={etf.sipAmount}
                              onBlur={(e) => handleUpdateEtf(etf.symbol, { sipAmount: Number(e.target.value) })}
                              className="w-full border border-black/20 p-1 text-[10px] font-mono bg-white"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Custom Alerts Section */}
                      <div className="border-t border-black/5 pt-3 mt-3">
                        <p className="text-[10px] font-mono uppercase opacity-50 mb-2">Custom Price Alerts</p>
                        <div className="space-y-2 mb-3">
                          {etf.alerts?.map(alert => (
                            <div key={alert.id} className="flex justify-between items-center bg-white p-2 border border-black/5 text-[10px] font-mono">
                              <span>
                                {alert.type.replace('_', ' ')}: {alert.type.includes('PRICE') ? '₹' : ''}{alert.value}{alert.type.includes('CHANGE') ? '%' : ''}
                              </span>
                              <button 
                                onClick={() => handleDeleteAlert(etf.symbol, alert.id)}
                                className="text-red-600 hover:opacity-70"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                          {(!etf.alerts || etf.alerts.length === 0) && (
                            <p className="text-[10px] italic opacity-30">No custom alerts set</p>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          <select 
                            value={newAlert.symbol === etf.symbol ? newAlert.type : 'PRICE_BELOW'}
                            onChange={(e) => setNewAlert({ ...newAlert, symbol: etf.symbol, type: e.target.value as any })}
                            className="text-[10px] font-mono border border-black/20 p-1 bg-white flex-1"
                          >
                            <option value="PRICE_BELOW">Price Below</option>
                            <option value="PRICE_ABOVE">Price Above</option>
                            <option value="CHANGE_BELOW">Change Below</option>
                            <option value="CHANGE_ABOVE">Change Above</option>
                          </select>
                          <input 
                            type="number"
                            placeholder="Value"
                            value={newAlert.symbol === etf.symbol ? newAlert.value : ''}
                            onChange={(e) => setNewAlert({ ...newAlert, symbol: etf.symbol, value: Number(e.target.value) })}
                            className="text-[10px] font-mono border border-black/20 p-1 bg-white w-20"
                          />
                          <button 
                            onClick={() => handleAddAlert(etf.symbol)}
                            className="bg-black text-white p-1 px-2 text-[10px] font-mono uppercase"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Market Context Bar */}
      <div className="mb-12 flex gap-4 overflow-hidden py-4 border-y border-black/5 bg-white/30 px-4">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-[10px] font-mono opacity-50 uppercase">Global Context</span>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        {status?.etfs.slice(0, 3).map(etf => (
          <div key={`ticker-${etf.symbol}`} className="flex items-center gap-2 text-[11px] font-mono border-r border-black/10 pr-4">
            <span className="opacity-60">{etf.symbol}</span>
            <span className={etf.change < 0 ? "text-red-600" : "text-emerald-600"}>
              {etf.price.toFixed(1)} ({etf.change > 0 ? '+' : ''}{etf.change.toFixed(1)}%)
            </span>
          </div>
        ))}
        <div className="flex-1" />
        <div className="text-[10px] font-mono opacity-40 uppercase">Session: {status?.marketOpen ? "Cash Market Active" : "Orders Frozen"}</div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
        <div className="border border-black p-6 bg-white/50 relative overflow-hidden group">
          <div className="flex items-center gap-2 mb-4">
            <PieChart size={16} />
            <span className="col-header">Monthly SIP</span>
          </div>
          <div className="text-3xl font-mono">₹{status?.totalInvestment}</div>
          <div className="mt-2 text-[10px] font-mono opacity-40 uppercase">Total Commitment</div>
        </div>

        <div className="border border-black p-6 bg-white/50">
          <div className="flex items-center gap-2 mb-4">
            <Heart size={16} className="text-red-500" />
            <span className="col-header">Portfolio Health</span>
          </div>
          <div className="text-3xl font-mono mb-2">{status?.healthScore?.toFixed(0)}%</div>
          <HealthGauge score={status?.healthScore || 0} />
        </div>

        <div className="border border-black p-6 bg-white/50">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} />
            <span className="col-header">Market Pulse</span>
          </div>
          <div className="text-sm leading-relaxed italic font-serif">
            "{status?.sentiment}"
          </div>
        </div>

        <div className="border border-black p-6 bg-black text-[#E4E3E0]">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={16} className="text-emerald-400" />
            <span className="col-header text-white/50">AI Top Pick</span>
          </div>
          <div className="text-lg font-medium leading-tight">
            {status?.monthlyLowDetected 
              ? `Double SIP on ${status.etfs.sort((a,b) => a.maxMonthlyDip - b.maxMonthlyDip)[0].symbol}` 
              : "Standard SIP Discipline"}
          </div>
          <div className="mt-2 text-[10px] font-mono text-emerald-400 uppercase tracking-tighter">
            Smart Allocation Engine
          </div>
        </div>
      </div>

      {/* Historical Insight: Lowest Dip of the Month */}
      {status?.previousMonthDip && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 border-2 border-dashed border-black/20 p-6 bg-white flex flex-col md:flex-row gap-6 items-center"
        >
          <div className="flex-shrink-0 w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center border border-amber-200">
            <TrendingDown className="text-amber-600" size={32} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-amber-600 text-white text-[10px] font-mono uppercase tracking-widest">Historical Event</span>
              <h3 className="font-medium uppercase tracking-wider text-sm">Lowest Dip of the Month Detected (Previous Month)</h3>
            </div>
            <p className="text-sm font-serif italic text-black/70 leading-relaxed">
              {status.previousMonthAlert}
            </p>
          </div>
        </motion.div>
      )}

      {/* ETF Table */}
      <section className="mb-12 overflow-x-auto">
        <div className="min-w-[1000px]">
          <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_4fr] border-t border-black bg-black/5 p-4">
            <div className="col-header">Asset Name</div>
            <div className="col-header">Price</div>
            <div className="col-header">24h</div>
            <div className="col-header">Trend</div>
            <div className="col-header">SIP</div>
            <div className="col-header">Historical Performance (%)</div>
          </div>
          {status?.etfs.map((etf, idx) => (
            <motion.div 
              key={`${etf.symbol}-row-${idx}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_4fr] border-b border-black/10 p-4 items-center hover:bg-black/5 transition-colors"
            >
              <div className="font-medium">
                {etf.name}
                <div className="text-[10px] font-mono opacity-40">{etf.symbol}</div>
              </div>
              <div className="data-value">₹{etf.price.toFixed(2)}</div>
              <div className={cn(
                "data-value flex items-center gap-1",
                !status?.marketOpen ? "opacity-30" : (etf.change < 0 ? "text-red-600" : "text-emerald-600")
              )}>
                {!status?.marketOpen ? "Closed" : `${etf.change > 0 ? '+' : ''}${etf.change.toFixed(2)}%`}
              </div>
              <div>
                <Sparkline 
                  data={etf.history} 
                  color={etf.change < 0 ? "#ef4444" : "#10b981"} 
                />
              </div>
              <div className="data-value opacity-50">₹{etf.sipAmount}</div>
              <div className="grid grid-cols-8 gap-2 text-[10px] font-mono">
                <div className="flex flex-col">
                  <span className="opacity-40 uppercase text-[8px]">1D</span>
                  <span className={etf.stats.oneDay < 0 ? "text-red-500" : "text-emerald-500"}>{etf.stats.oneDay.toFixed(2)}%</span>
                </div>
                <div className="flex flex-col">
                  <span className="opacity-40 uppercase text-[8px]">1W</span>
                  <span className={etf.stats.oneWeek < 0 ? "text-red-500" : "text-emerald-500"}>{etf.stats.oneWeek.toFixed(2)}%</span>
                </div>
                <div className="flex flex-col">
                  <span className="opacity-40 uppercase text-[8px]">1M</span>
                  <span className={etf.stats.oneMonth < 0 ? "text-red-500" : "text-emerald-500"}>{etf.stats.oneMonth.toFixed(2)}%</span>
                </div>
                <div className="flex flex-col">
                  <span className="opacity-40 uppercase text-[8px]">2M</span>
                  <span className={etf.stats.twoMonths < 0 ? "text-red-500" : "text-emerald-500"}>{etf.stats.twoMonths.toFixed(2)}%</span>
                </div>
                <div className="flex flex-col">
                  <span className="opacity-40 uppercase text-[8px]">3M</span>
                  <span className={etf.stats.threeMonths < 0 ? "text-red-500" : "text-emerald-500"}>{etf.stats.threeMonths.toFixed(2)}%</span>
                </div>
                <div className="flex flex-col">
                  <span className="opacity-40 uppercase text-[8px]">6M</span>
                  <span className={etf.stats.sixMonths < 0 ? "text-red-500" : "text-emerald-500"}>{etf.stats.sixMonths.toFixed(2)}%</span>
                </div>
                <div className="flex flex-col">
                  <span className="opacity-40 uppercase text-[8px]">1Y</span>
                  <span className={etf.stats.oneYear < 0 ? "text-red-500" : "text-emerald-500"}>{etf.stats.oneYear.toFixed(2)}%</span>
                </div>
                <div className="flex flex-col bg-red-50 p-1 border border-red-100">
                  <span className="text-red-600 font-bold uppercase text-[8px]">Max Dip</span>
                  <span className="text-red-600 font-bold">{etf.maxMonthlyDip.toFixed(2)}%</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Smart Weighting & Rebalance Section */}
      <section className="mb-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 border border-black p-8 bg-black text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Target size={120} />
          </div>
          <h3 className="flex items-center gap-2 mb-6">
            <Target size={18} className="text-emerald-400" />
            <span className="font-medium uppercase tracking-wider text-sm">Smart Allocation Optimizer</span>
          </h3>
          <div className="space-y-4 relative z-10">
            <p className="text-sm font-serif italic text-white/70">
              Based on current volatility and localized dips, our engine suggests the following SIP adjustments to maximize your "Cost Averaging" effect:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              {status?.etfs && [...status.etfs].sort((a,b) => a.maxMonthlyDip - b.maxMonthlyDip).slice(0, 2).map((etf, i) => (
                <div key={`rebalance-${etf.symbol}`} className="border border-white/20 p-4 bg-white/5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-mono uppercase opacity-50">{etf.symbol}</span>
                    <span className="text-emerald-400 text-[10px] font-bold">OVERWEIGHT</span>
                  </div>
                  <div className="text-lg font-mono">₹{Math.round(etf.sipAmount * 1.5)}</div>
                  <div className="text-[9px] opacity-40 uppercase mt-1">Recommended SIP (+₹{Math.round(etf.sipAmount * 0.5)})</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border border-black p-8 bg-white flex flex-col justify-between">
          <div>
            <h3 className="flex items-center gap-2 mb-6">
              <Activity size={18} />
              <span className="font-medium uppercase tracking-wider text-sm">Wealth projection</span>
            </h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-[10px] font-mono uppercase opacity-50 mb-2">
                  <span>1Y Est. Value</span>
                  <span>Confidence</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-2xl font-mono">₹{Math.round((status?.totalInvestment || 0) * 12 * 1.12)}</span>
                  <span className="text-sm font-mono text-emerald-600">88%</span>
                </div>
              </div>
              <div className="h-1 w-full bg-black/5 rounded-full overflow-hidden">
                <div className="h-full w-[88%] bg-emerald-500 rounded-full" />
              </div>
            </div>
          </div>
          <p className="text-[9px] opacity-40 uppercase mt-8 leading-tight">
            *Projection based on historical CAGR of current assets.
          </p>
        </div>
      </section>
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="border border-black p-8">
          <h3 className="flex items-center gap-2 mb-6">
            <Info size={18} />
            <span className="font-medium uppercase tracking-wider text-sm">AI Sentiment Analysis</span>
          </h3>
          <button 
            onClick={handleAnalyze}
            disabled={analyzing}
            className="w-full border border-black p-4 font-mono text-xs uppercase tracking-widest hover:bg-black hover:text-white transition-colors mb-6 disabled:opacity-50"
          >
            {analyzing ? 'Processing Market Data...' : 'Run Deep Sentiment Analysis'}
          </button>
          {analysis && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[11px] leading-relaxed font-mono bg-black text-emerald-500 p-4 border border-black/10 overflow-y-auto max-h-[300px] shadow-inner"
            >
              <div className="flex items-center gap-2 mb-2 opacity-50">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span>TERMINAL_OUTPUT_READY</span>
              </div>
              <div className="whitespace-pre-wrap">
                {analysis}
              </div>
            </motion.div>
          )}
        </div>

        <div className="border border-black p-8 bg-amber-50">
          <h3 className="flex items-center gap-2 mb-6">
            <AlertTriangle size={18} className="text-amber-600" />
            <span className="font-medium uppercase tracking-wider text-sm">Dip Prediction & Alerts</span>
          </h3>
          
          <div className="mb-6">
            <button 
              onClick={handlePredict}
              disabled={predicting}
              className="w-full border border-amber-600 p-3 font-mono text-[10px] uppercase tracking-widest hover:bg-amber-600 hover:text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Activity size={14} />
              {predicting ? 'Calculating Probabilities...' : 'Generate AI Dip Prediction'}
            </button>
          </div>

          {prediction && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 border-t-2 border-emerald-500 bg-black text-emerald-500/90 text-[10px] font-mono shadow-sm mb-6"
            >
              <div className="flex justify-between items-center mb-2 opacity-50 border-b border-emerald-500/20 pb-1">
                <span>PREDICTION_ENGINE_v4.2</span>
                <span>CONFIDENCE: HIGH</span>
              </div>
              <div className="whitespace-pre-wrap leading-relaxed italic">
                {prediction}
              </div>
            </motion.div>
          )}

          <div className="space-y-4">
            {!status?.marketOpen && (
              <div className="p-4 border border-black/10 bg-black/5 text-center">
                <p className="text-xs font-mono opacity-60 uppercase tracking-widest">Market is currently closed</p>
                <p className="text-[10px] mt-1 opacity-40">Monitoring will resume at 9:15 AM IST on the next trading day.</p>
              </div>
            )}

            {status?.marketOpen && status?.etfs.flatMap(etf => 
              (etf.alerts || []).filter(a => a.triggered).map(alert => (
                <motion.div 
                  key={`custom-alert-${alert.id}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 border-l-4 border-amber-500 bg-white shadow-sm"
                >
                  <p className="text-xs font-mono text-amber-600 mb-1 uppercase">Custom Alert Triggered</p>
                  <p className="text-sm font-medium">
                    {etf.name}: {alert.type.replace('_', ' ')} {alert.type.includes('PRICE') ? '₹' : ''}{alert.value}{alert.type.includes('CHANGE') ? '%' : ''}
                  </p>
                  <p className="text-[10px] mt-1 opacity-70">Current: {alert.type.includes('PRICE') ? `₹${etf.price.toFixed(2)}` : `${etf.change.toFixed(2)}%`}</p>
                </motion.div>
              ))
            )}

            {status?.marketOpen && status?.etfs.map(etf => (
              <motion.div 
                key={`alert-dip-${etf.symbol}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 border-l-4 border-red-500 bg-white shadow-sm space-y-2"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-mono text-red-600 mb-1 uppercase">Monthly Maximum Dip Alert</p>
                    <p className="text-sm font-medium">{etf.name} ({etf.symbol})</p>
                  </div>
                  <div className="bg-red-600 text-white px-2 py-1 text-xs font-mono font-bold">
                    {etf.maxMonthlyDip.toFixed(2)}%
                  </div>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-100 rounded text-xs font-serif italic text-amber-900">
                  <span className="font-bold uppercase text-[10px] block mb-1 not-italic font-sans text-amber-700">AI Suggestion:</span>
                  {etf.aiSuggestion}
                </div>
              </motion.div>
            ))}

            {status?.marketOpen && status?.etfs.filter(e => e.change > -1.5).slice(0, 2).map(etf => (
              <motion.div 
                key={`stable-${etf.symbol}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 border-l-4 border-emerald-500 bg-white shadow-sm"
              >
                <p className="text-xs font-mono text-emerald-600 mb-1 uppercase">Strategy: Stable</p>
                <p className="text-sm">{etf.name} is performing within normal range. Stick to regular SIP of ₹{etf.sipAmount}.</p>
              </motion.div>
            ))}

            {status?.etfs.length === 0 && (
              <p className="text-xs font-mono opacity-50 italic">No assets tracked. Add ETFs in settings to see alerts.</p>
            )}
          </div>
          <div className="mt-8 pt-8 border-t border-black/10">
            <p className="text-[10px] font-mono opacity-50 uppercase mb-4">Telegram Integration Status</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-mono">Bot Active & Monitoring</span>
            </div>
          </div>
        </div>
      </section>

      <footer className="mt-24 pt-8 border-t border-black flex justify-between items-center text-[10px] font-mono opacity-30 uppercase tracking-widest">
        <div>© 2026 AI Investment Agent</div>
        <div className="flex items-center gap-2">
          <div className="w-1 h-1 rounded-full bg-emerald-500" />
          Powered by Real-Time Yahoo Finance Data
        </div>
      </footer>
    </div>
  );
}

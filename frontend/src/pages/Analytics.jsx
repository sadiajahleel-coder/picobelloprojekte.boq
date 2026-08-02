import React, { useEffect, useState } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, AlertCircle, BarChart2, Clock, Package,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

function fmt(n) {
  return Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Pct({ value, inverted = false }) {
  const positive = inverted ? value < 0 : value > 0;
  const color = positive ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-gray-400';
  return (
    <span className={`text-xs font-semibold ${color}`}>
      {value > 0 ? '+' : ''}{value.toFixed(1)}%
    </span>
  );
}

function CssBar({ value, max, color = 'bg-primary-900' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── Tab: Profit Report ─────────────────────────────────────────────────────────
function ProfitTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/profit').then(({ data }) => setData(data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-16 text-gray-400">Computing profit data…</div>;

  const maxRevenue = Math.max(...(data?.rows || []).map((r) => r.totalRevenue), 1);

  return (
    <div className="space-y-5">
      {/* Totals banner */}
      {data?.totals && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Invoiced', value: data.totals.totalInvoiced, icon: DollarSign, color: 'text-blue-500 bg-blue-50' },
            { label: 'Revenue Collected', value: data.totals.totalRevenue, icon: TrendingUp, color: 'text-green-500 bg-green-50' },
            { label: 'Total Estimated Cost', value: data.totals.totalCost, icon: BarChart2, color: 'text-orange-500 bg-orange-50' },
            { label: 'Gross Profit', value: data.totals.grossProfit, icon: TrendingUp, color: 'text-primary-700 bg-primary-50' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color} mb-2`}>
                <Icon size={16} />
              </div>
              <p className="text-xs text-gray-400">{label}</p>
              <p className="text-lg font-bold text-gray-800 mt-0.5">₦{fmt(value)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Per-project table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left px-5 py-3">Project</th>
              <th className="text-right px-4 py-3">Invoiced</th>
              <th className="text-right px-4 py-3">Collected</th>
              <th className="text-right px-4 py-3">Est. Cost</th>
              <th className="text-right px-4 py-3">Gross Profit</th>
              <th className="text-right px-4 py-3">Margin</th>
              <th className="px-5 py-3 w-32">Revenue Bar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(data?.rows || []).map((r) => (
              <tr key={r.project._id} className="hover:bg-gray-50">
                <td className="px-5 py-3">
                  <p className="font-medium text-gray-800">{r.project.name}</p>
                  <p className="text-xs text-gray-400">{r.project.client}</p>
                </td>
                <td className="px-4 py-3 text-right text-gray-600">₦{fmt(r.totalInvoiced)}</td>
                <td className="px-4 py-3 text-right text-green-600 font-medium">₦{fmt(r.totalRevenue)}</td>
                <td className="px-4 py-3 text-right text-gray-600">₦{fmt(r.totalCost)}</td>
                <td className={`px-4 py-3 text-right font-semibold ${r.grossProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  ₦{fmt(r.grossProfit)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Pct value={r.margin} />
                </td>
                <td className="px-5 py-3">
                  <CssBar value={r.totalRevenue} max={maxRevenue} color={r.grossProfit >= 0 ? 'bg-green-500' : 'bg-red-500'} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab: Cost Variance ─────────────────────────────────────────────────────────
function VarianceTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/cost-variance').then(({ data }) => setData(data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-16 text-gray-400">Computing variance…</div>;

  return (
    <div className="space-y-3">
      {(data?.rows || []).map((r) => (
        <div key={r.project._id} className={`bg-white rounded-2xl border shadow-sm p-5 ${r.overBudget ? 'border-red-200' : 'border-gray-100'}`}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="font-semibold text-gray-800">{r.project.name}</p>
              <p className="text-xs text-gray-400">{r.project.client}</p>
            </div>
            {r.overBudget && (
              <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                <AlertCircle size={11} /> Over Budget
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3 text-sm">
            <div>
              <p className="text-xs text-gray-400">Estimated (BOQ)</p>
              <p className="font-semibold text-gray-700">{r.project.currency} {fmt(r.estimatedCost)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Actual Spend</p>
              <p className="font-semibold text-blue-600">{r.project.currency} {fmt(r.actualSpend)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Approved Changes</p>
              <p className={`font-semibold ${r.approvedChanges > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {r.approvedChanges > 0 ? '+' : ''}{r.project.currency} {fmt(r.approvedChanges)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Variance</p>
              <p className={`font-bold ${r.variance > 0 ? 'text-red-600' : r.variance < 0 ? 'text-green-600' : 'text-gray-400'}`}>
                {r.variance > 0 ? '+' : ''}{r.project.currency} {fmt(r.variance)}
                {' '}<Pct value={r.variancePct} inverted />
              </p>
            </div>
          </div>
          {/* Dual bar */}
          {r.estimatedCost > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="w-20">Estimated</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-2 bg-primary-900 rounded-full" style={{ width: '100%' }} />
                </div>
                <span className="w-24 text-right">{r.project.currency} {fmt(r.estimatedCost)}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="w-20">Actual</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-2 rounded-full ${r.actualSpend > r.estimatedCost ? 'bg-red-500' : 'bg-blue-500'}`}
                    style={{ width: `${Math.min(100, (r.actualSpend / r.estimatedCost) * 100).toFixed(0)}%` }} />
                </div>
                <span className="w-24 text-right">{r.project.currency} {fmt(r.actualSpend)}</span>
              </div>
            </div>
          )}
        </div>
      ))}
      {data?.rows?.length === 0 && (
        <div className="text-center py-16 text-gray-400">No active projects with cost data.</div>
      )}
    </div>
  );
}

// ── Tab: Outstanding Invoices ──────────────────────────────────────────────────
function OutstandingTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/outstanding').then(({ data }) => setData(data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-16 text-gray-400">Loading outstanding invoices…</div>;

  const bucketColors = {
    current: 'bg-blue-100 text-blue-700',
    '1-30': 'bg-yellow-100 text-yellow-700',
    '31-60': 'bg-orange-100 text-orange-700',
    '61-90': 'bg-red-100 text-red-600',
    '90+': 'bg-red-200 text-red-800',
  };

  return (
    <div className="space-y-5">
      {/* Grand total banner */}
      <div className="bg-primary-900 text-white rounded-2xl p-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-blue-300 text-sm">Total Outstanding</p>
          <p className="text-3xl font-bold">₦{fmt(data?.grandTotal || 0)}</p>
        </div>
        <div className="text-right">
          <p className="text-blue-300 text-sm">{data?.count || 0} invoice{data?.count !== 1 ? 's' : ''}</p>
          <p className="text-blue-200 text-xs mt-1">awaiting payment</p>
        </div>
      </div>

      {(data?.summary || []).map((bucket) => (
        bucket.count > 0 && (
          <div key={bucket.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${bucketColors[bucket.label]}`}>
                  {bucket.label === 'current' ? 'Not Yet Due' : `${bucket.label} days overdue`}
                </span>
                <span className="text-sm text-gray-500">{bucket.count} invoice{bucket.count !== 1 ? 's' : ''}</span>
              </div>
              <p className="font-bold text-gray-800">₦{fmt(bucket.total)}</p>
            </div>
            <div className="divide-y divide-gray-50">
              {bucket.items.map((inv) => (
                <div key={inv._id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-mono font-medium text-primary-900">{inv.invoiceNumber}</p>
                    <p className="text-xs text-gray-400">{inv.project} · {inv.client}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-800">{inv.currency} {fmt(inv.balance)}</p>
                    {inv.dueDate && <p className="text-xs text-gray-400">Due {new Date(inv.dueDate).toLocaleDateString('en-GB')}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      ))}

      {data?.count === 0 && (
        <div className="text-center py-16 text-gray-400">
          <DollarSign size={40} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium">No outstanding invoices</p>
        </div>
      )}
    </div>
  );
}

// ── Tab: Supplier Price History ────────────────────────────────────────────────
function SupplierTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState(false);

  const search = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/analytics/supplier-history', { params: { material: query } });
      setData(data);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-3">
        <input value={query} onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder="Search material name…"
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-900/30" />
        <button onClick={search} disabled={loading}
          className="bg-primary-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-800 disabled:opacity-60">
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>

      {!searched && (
        <div className="text-center py-16 text-gray-400">
          <Package size={40} className="mx-auto mb-3 opacity-20" />
          <p>Search for a material to view price history</p>
        </div>
      )}

      {searched && (data?.materials || []).length === 0 && (
        <div className="text-center py-10 text-gray-400">No materials found for "{query}"</div>
      )}

      {(data?.materials || []).map((mat) => (
        <div key={mat.material} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="font-semibold text-gray-800">{mat.material}</h3>
            <div className="flex gap-4 text-xs text-gray-500">
              <span>Min: <strong>₦{fmt(mat.min)}</strong></span>
              <span>Avg: <strong>₦{fmt(mat.avg)}</strong></span>
              <span>Max: <strong>₦{fmt(mat.max)}</strong></span>
            </div>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-5 py-2">Supplier</th>
                <th className="text-right px-4 py-2">Unit Price</th>
                <th className="text-right px-4 py-2">Delivery</th>
                <th className="text-right px-4 py-2">Total</th>
                <th className="text-left px-5 py-2">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {mat.records.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-5 py-2 font-medium text-gray-800">{r.supplier}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{r.currency} {fmt(r.price)}</td>
                  <td className="px-4 py-2 text-right text-gray-500">{r.currency} {fmt(r.deliveryFee)}</td>
                  <td className="px-4 py-2 text-right font-semibold text-gray-800">{r.currency} {fmt(r.total)}</td>
                  <td className="px-5 py-2 text-gray-400 text-xs">{new Date(r.date).toLocaleDateString('en-GB')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Tab: Cash Flow Risk ─────────────────────────────────────────────────────────
function CashFlowTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/cash-flow-risk').then(({ data }) => setData(data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-16 text-gray-400">Scoring payment history…</div>;

  const tierStyles = {
    high:   { badge: 'bg-red-100 text-red-700', border: 'border-red-200', label: 'High Risk' },
    medium: { badge: 'bg-yellow-100 text-yellow-700', border: 'border-yellow-200', label: 'Medium Risk' },
    low:    { badge: 'bg-green-100 text-green-700', border: 'border-gray-100', label: 'Low Risk' },
  };

  const clients = data?.clients || [];
  const atRisk = clients.filter((c) => c.tier !== 'low').length;

  return (
    <div className="space-y-5">
      <div className="bg-primary-900 text-white rounded-2xl p-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-blue-300 text-sm">Clients Flagged</p>
          <p className="text-3xl font-bold">{atRisk} <span className="text-lg font-normal text-blue-200">of {clients.length}</span></p>
        </div>
        <p className="text-blue-200 text-xs max-w-xs text-right">
          Based on how late each client has actually paid past invoices — not just current balance.
        </p>
      </div>

      {clients.map((c) => {
        const style = tierStyles[c.tier];
        return (
          <div key={c.clientEmail || c.clientName} className={`bg-white rounded-2xl border shadow-sm p-5 ${style.border}`}>
            <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
              <div>
                <p className="font-semibold text-gray-800">{c.clientName}</p>
                {c.clientEmail && <p className="text-xs text-gray-400">{c.clientEmail}</p>}
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 ${style.badge}`}>{style.label}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3 text-sm">
              <div>
                <p className="text-xs text-gray-400">Invoices</p>
                <p className="font-semibold text-gray-700">{c.invoiceCount}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Outstanding</p>
                <p className="font-semibold text-gray-700">₦{fmt(c.totalOutstanding)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">On-Time Rate</p>
                <p className="font-semibold text-gray-700">{Math.round(c.onTimeRate * 100)}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Avg Days Late</p>
                <p className="font-semibold text-gray-700">{c.avgDaysLate || 0}</p>
              </div>
            </div>
            <ul className="text-xs text-gray-500 space-y-0.5">
              {c.reasons.map((r, i) => <li key={i}>• {r}</li>)}
            </ul>
          </div>
        );
      })}

      {clients.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <TrendingDown size={40} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium">No invoice history to score yet</p>
        </div>
      )}
    </div>
  );
}

// ── Main Analytics Page ────────────────────────────────────────────────────────
const TABS = [
  { id: 'profit', label: 'Profit Report', icon: TrendingUp },
  { id: 'variance', label: 'Cost Variance', icon: BarChart2 },
  { id: 'outstanding', label: 'Outstanding', icon: Clock },
  { id: 'cashflow', label: 'Cash Flow Risk', icon: TrendingDown },
  { id: 'supplier', label: 'Supplier History', icon: Package },
];

export default function Analytics() {
  const { user } = useAuth();
  const [tab, setTab] = useState('profit');
  const [sending, setSending] = useState(false);
  const [reminderResult, setReminderResult] = useState(null);

  const sendReminders = async () => {
    setSending(true);
    setReminderResult(null);
    try {
      const { data } = await api.post('/analytics/send-reminders');
      setReminderResult(`${data.sent} reminder${data.sent !== 1 ? 's' : ''} sent (${data.overdue} overdue invoice${data.overdue !== 1 ? 's' : ''})`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      {user?.role !== 'admin' && (
        <p className="text-xs text-gray-400">Showing only the projects assigned to you</p>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="overflow-x-auto w-full sm:w-auto">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl min-w-max">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  tab === id ? 'bg-white text-primary-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {reminderResult && <span className="text-xs text-green-600">{reminderResult}</span>}
          <button onClick={sendReminders} disabled={sending}
            className="flex items-center gap-1.5 text-sm border border-gray-200 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-60 whitespace-nowrap">
            <AlertCircle size={14} /> {sending ? 'Sending…' : 'Send Reminders'}
          </button>
        </div>
      </div>

      {tab === 'profit' && <ProfitTab />}
      {tab === 'variance' && <VarianceTab />}
      {tab === 'outstanding' && <OutstandingTab />}
      {tab === 'cashflow' && <CashFlowTab />}
      {tab === 'supplier' && <SupplierTab />}
    </div>
  );
}

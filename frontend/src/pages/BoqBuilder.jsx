import React, { useEffect, useState, useCallback } from 'react';
import { Plus, X, Pencil, Trash2, ChevronLeft, FileSpreadsheet, CheckCircle, AlertTriangle, ClipboardCheck, Sparkles } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ExcelImport from '../components/ExcelImport';
import { runImport, summarize } from '../utils/runImport';

const BOQ_ITEM_IMPORT_COLUMNS = [
  { key: 'item', label: 'Item', type: 'string', required: true },
  { key: 'description', label: 'Description', type: 'string' },
  { key: 'unit', label: 'Unit', type: 'string', required: true },
  { key: 'quantity', label: 'Quantity', type: 'number', required: true },
  { key: 'baseCost', label: 'Base Cost', type: 'number', required: true },
  { key: 'overheadPercent', label: 'Overhead %', type: 'number' },
  { key: 'profitPercent', label: 'Profit %', type: 'number' },
];

const STATUS_COLORS = { draft: 'bg-yellow-100 text-yellow-700', final: 'bg-blue-100 text-blue-700', approved: 'bg-green-100 text-green-700' };
const CURRENCIES = ['NGN', 'USD', 'EUR', 'GBP'];
const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-900 focus:border-transparent';

function calcItem(baseCost, overheadPercent, profitPercent, quantity) {
  const unitPrice = baseCost * (1 + overheadPercent / 100) * (1 + profitPercent / 100);
  return { unitPrice: parseFloat(unitPrice.toFixed(2)), total: parseFloat((unitPrice * quantity).toFixed(2)) };
}

function fmt(n, currency = '') {
  return `${currency} ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.trim();
}

function VersionModal({ open, onClose, onSaved, editing }) {
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState({ projectId: '', name: '', description: '', currency: 'NGN', status: 'draft' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    api.get('/projects').then(({ data }) => setProjects(data.projects)).catch(console.error);
    setForm(editing
      ? { projectId: editing.projectId?._id ?? editing.projectId, name: editing.name, description: editing.description ?? '', currency: editing.currency ?? 'NGN', status: editing.status }
      : { projectId: '', name: '', description: '', currency: 'NGN', status: 'draft' });
    setError('');
  }, [open, editing]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      editing ? await api.put(`/boq/${editing._id}`, form) : await api.post('/boq', form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">{editing ? 'Edit BOQ' : 'New BOQ Version'}</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Project *</label>
            <select required value={form.projectId} onChange={set('projectId')} className={inputCls + ' bg-white'}>
              <option value="">Select project…</option>
              {projects.map((p) => <option key={p._id} value={p._id}>{p.name} — {p.client}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">BOQ Name *</label>
            <input type="text" required value={form.name} onChange={set('name')} className={inputCls} placeholder="e.g. Substructure BOQ v1" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Description</label>
            <textarea rows={2} value={form.description} onChange={set('description')} className={inputCls + ' resize-none'} placeholder="Optional notes…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Currency</label>
              <select value={form.currency} onChange={set('currency')} className={inputCls + ' bg-white'}>
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Status</label>
              <select value={form.status} onChange={set('status')} className={inputCls + ' bg-white'}>
                {['draft', 'final', 'approved'].map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-primary-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 disabled:opacity-60">
              {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AiDraftModal({ open, onClose, onCreated }) {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [description, setDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [notConfigured, setNotConfigured] = useState(false);
  const [draftItems, setDraftItems] = useState(null);

  useEffect(() => {
    if (!open) return;
    api.get('/projects').then(({ data }) => setProjects(data.projects)).catch(console.error);
    setProjectId(''); setName(''); setCurrency('NGN'); setDescription('');
    setError(''); setNotConfigured(false); setDraftItems(null);
  }, [open]);

  const generate = async () => {
    if (!projectId) { setError('Choose a project first.'); return; }
    if (!description.trim()) { setError('Describe the project first.'); return; }
    setGenerating(true); setError(''); setNotConfigured(false); setDraftItems(null);
    try {
      const { data } = await api.post('/boq/ai-draft', { description, projectId });
      if (!data.configured) { setNotConfigured(true); setError(data.error); return; }
      if (data.error) { setError(data.error); return; }
      setDraftItems(data.items.map((it) => ({ ...it, quantity: String(it.quantity), baseCost: String(it.baseCost) })));
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to generate draft');
    } finally {
      setGenerating(false);
    }
  };

  const updateRow = (i, k, v) => setDraftItems((rows) => rows.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
  const removeRow = (i) => setDraftItems((rows) => rows.filter((_, idx) => idx !== i));

  const total = (draftItems || []).reduce((s, r) => s + (parseFloat(r.quantity) || 0) * (parseFloat(r.baseCost) || 0), 0);

  const createBoq = async () => {
    if (!name.trim()) { setError('Give this BOQ a name.'); return; }
    if (!draftItems?.length) { setError('No items to save.'); return; }
    setCreating(true); setError('');
    try {
      const { data: versionData } = await api.post('/boq', {
        projectId, name, currency,
        description: `AI-drafted from: ${description.slice(0, 300)}`,
      });
      const versionId = versionData.version._id;
      for (const row of draftItems) {
        await api.post(`/boq/${versionId}/items`, {
          item: row.item, description: row.description, unit: row.unit,
          quantity: row.quantity, baseCost: row.baseCost,
        });
      }
      onCreated(versionId);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to create BOQ from draft');
    } finally {
      setCreating(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center p-2 sm:p-4 overflow-y-auto z-50">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Sparkles size={17} className="text-primary-900" /> AI BOQ Draft</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className={`border px-4 py-3 rounded-lg text-sm ${notConfigured ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
              {error}
            </div>
          )}

          {!draftItems && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Project *</label>
                <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputCls + ' bg-white'}>
                  <option value="">Select project…</option>
                  {projects.map((p) => <option key={p._id} value={p._id}>{p.name} — {p.client}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">BOQ Name *</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. AI Draft — Phase 1" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Currency</label>
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls + ' bg-white'}>
                    {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Describe the project *</label>
                <textarea rows={5} value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls + ' resize-none'}
                  placeholder="e.g. Two-bedroom bungalow, 120sqm, standard finish — foundation, block walls, roofing, plumbing, electrical, tiling, painting…" />
              </div>
              <button onClick={generate} disabled={generating}
                className="w-full flex items-center justify-center gap-2 bg-primary-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 disabled:opacity-60">
                <Sparkles size={15} /> {generating ? 'Generating…' : 'Generate Draft'}
              </button>
            </>
          )}

          {draftItems && (
            <>
              <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['Item', 'Unit', 'Qty', 'Base Cost', 'Source', ''].map((h) => (
                        <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {draftItems.map((row, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2">
                          <p className="font-medium text-gray-800">{row.item}</p>
                          {row.description && <p className="text-xs text-gray-400">{row.description}</p>}
                        </td>
                        <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{row.unit}</td>
                        <td className="px-3 py-2">
                          <input type="number" min="0" step="any" value={row.quantity}
                            onChange={(e) => updateRow(i, 'quantity', e.target.value)}
                            className="w-20 px-2 py-1 border border-gray-200 rounded text-sm" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" min="0" step="0.01" value={row.baseCost}
                            onChange={(e) => updateRow(i, 'baseCost', e.target.value)}
                            className="w-24 px-2 py-1 border border-gray-200 rounded text-sm" />
                        </td>
                        <td className="px-3 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${row.source === 'library' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {row.source === 'library' ? 'Your library' : 'AI estimate'}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <button onClick={() => removeRow(i)} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-400">
                {draftItems.length} item{draftItems.length !== 1 ? 's' : ''} — estimated total {currency} {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.
                Review every rate before creating — AI estimates are a starting point, not a quote.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDraftItems(null)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Back</button>
                <button onClick={createBoq} disabled={creating}
                  className="flex-1 bg-primary-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 disabled:opacity-60">
                  {creating ? 'Creating…' : `Create BOQ (${draftItems.length} items)`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const ITEM_EMPTY = { item: '', description: '', unit: '', quantity: '', baseCost: '', overheadPercent: '0', profitPercent: '0' };

function ItemModal({ open, onClose, onSaved, versionId, editing, currency }) {
  const [form, setForm] = useState(ITEM_EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(editing
      ? { item: editing.item, description: editing.description ?? '', unit: editing.unit, quantity: editing.quantity, baseCost: editing.baseCost, overheadPercent: editing.overheadPercent, profitPercent: editing.profitPercent }
      : ITEM_EMPTY);
    setError('');
  }, [open, editing]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const bc = parseFloat(form.baseCost) || 0;
  const oh = parseFloat(form.overheadPercent) || 0;
  const pr = parseFloat(form.profitPercent) || 0;
  const qty = parseFloat(form.quantity) || 0;
  const preview = calcItem(bc, oh, pr, qty);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      editing
        ? await api.put(`/boq/${versionId}/items/${editing._id}`, form)
        : await api.post(`/boq/${versionId}/items`, form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">{editing ? 'Edit BOQ Item' : 'Add BOQ Item'}</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Item *</label>
            <input type="text" required value={form.item} onChange={set('item')} className={inputCls} placeholder="e.g. Excavation to reduce levels" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Description</label>
            <input type="text" value={form.description} onChange={set('description')} className={inputCls} placeholder="Optional detail…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Unit *</label>
              <input type="text" required value={form.unit} onChange={set('unit')} className={inputCls} placeholder="m³, m², kg, sum" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Quantity *</label>
              <input type="number" required min="0" step="any" value={form.quantity} onChange={set('quantity')} className={inputCls} placeholder="0" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Base Cost ({currency}) *</label>
            <input type="number" required min="0" step="0.01" value={form.baseCost} onChange={set('baseCost')} className={inputCls} placeholder="0.00" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Overhead %</label>
              <input type="number" min="0" step="0.1" value={form.overheadPercent} onChange={set('overheadPercent')} className={inputCls} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Profit %</label>
              <input type="number" min="0" step="0.1" value={form.profitPercent} onChange={set('profitPercent')} className={inputCls} placeholder="0" />
            </div>
          </div>
          {bc > 0 && (
            <div className="bg-primary-50 border border-primary-100 rounded-lg p-4 grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-gray-500">Final Unit Price</p>
                <p className="font-bold text-primary-900">{fmt(preview.unitPrice, currency)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Cost</p>
                <p className="font-bold text-primary-900">{fmt(preview.total, currency)}</p>
              </div>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-primary-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 disabled:opacity-60">
              {saving ? 'Saving…' : editing ? 'Update Item' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BoqBuilder() {
  const { user } = useAuth();
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeVersion, setActiveVersion] = useState(null);
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [missingItems, setMissingItems] = useState([]);
  const [reviewerOpen, setReviewerOpen] = useState(true);
  const [versionModal, setVersionModal] = useState(false);
  const [editingVersion, setEditingVersion] = useState(null);
  const [aiDraftModal, setAiDraftModal] = useState(false);
  const [itemModal, setItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const canEdit = ['admin', 'qs', 'project_manager'].includes(user?.role);
  const canDelete = ['admin', 'qs'].includes(user?.role);

  const fetchVersions = useCallback(() => {
    api.get('/boq')
      .then(({ data }) => setVersions(data.versions))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchVersions(); }, [fetchVersions]);

  const openVersion = async (v) => {
    setActiveVersion(v);
    setItemsLoading(true);
    try {
      const { data } = await api.get(`/boq/${v._id}`);
      setActiveVersion(data.version);
      setItems(data.items);
      setMissingItems(data.missingItems || []);
    } catch (err) {
      console.error(err);
    } finally {
      setItemsLoading(false);
    }
  };

  const refreshVersion = async () => {
    if (!activeVersion) return;
    const { data } = await api.get(`/boq/${activeVersion._id}`);
    setActiveVersion(data.version);
    setItems(data.items);
    setMissingItems(data.missingItems || []);
  };

  const handleDeleteVersion = async (id) => {
    if (!confirm('Delete this BOQ and all its items?')) return;
    try {
      await api.delete(`/boq/${id}`);
      if (activeVersion?._id === id) setActiveVersion(null);
      fetchVersions();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete BOQ');
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!confirm('Remove this item?')) return;
    try {
      await api.delete(`/boq/${activeVersion._id}/items/${itemId}`);
      refreshVersion();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete item');
    }
  };

  if (!activeVersion) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500">{versions.length} BOQ document{versions.length !== 1 ? 's' : ''}</p>
          {canEdit && (
            <div className="flex items-center gap-2">
              <button onClick={() => setAiDraftModal(true)}
                className="flex items-center gap-2 border border-primary-900 text-primary-900 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-50">
                <Sparkles size={16} /> AI Draft
              </button>
              <button onClick={() => { setEditingVersion(null); setVersionModal(true); }}
                className="flex items-center gap-2 bg-primary-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800">
                <Plus size={16} /> New BOQ
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-900" /></div>
        ) : versions.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
            <FileSpreadsheet size={48} className="mx-auto mb-3 text-gray-200" />
            <p className="text-gray-500">No BOQ documents yet.</p>
            {canEdit && <button onClick={() => { setEditingVersion(null); setVersionModal(true); }} className="mt-2 text-primary-900 font-medium hover:underline text-sm">Create your first BOQ</button>}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {versions.map((v) => (
              <div key={v._id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer" onClick={() => openVersion(v)}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-semibold text-gray-800 text-sm leading-tight">{v.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize shrink-0 ${STATUS_COLORS[v.status]}`}>{v.status}</span>
                </div>
                <div className="space-y-1 text-xs text-gray-500 mb-4">
                  <p><span className="text-gray-400">Project:</span> <span className="text-gray-700">{v.projectId?.name ?? '—'}</span></p>
                  <p><span className="text-gray-400">Client:</span> <span className="text-gray-700">{v.projectId?.client ?? '—'}</span></p>
                  <p><span className="text-gray-400">Total:</span> <span className="font-bold text-gray-800">{v.currency} {Number(v.totalCost).toLocaleString()}</span></p>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-3 pt-3 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => { setEditingVersion(v); setVersionModal(true); }} className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary-900 transition-colors">
                      <Pencil size={13} /> Edit
                    </button>
                    {user?.role === 'admin' && (
                      <button onClick={() => handleDeleteVersion(v._id)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-600 transition-colors ml-auto">
                        <Trash2 size={13} /> Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <VersionModal open={versionModal} onClose={() => setVersionModal(false)}
          onSaved={() => { setVersionModal(false); fetchVersions(); }} editing={editingVersion} />
        <AiDraftModal open={aiDraftModal} onClose={() => setAiDraftModal(false)}
          onCreated={async (versionId) => {
            setAiDraftModal(false);
            fetchVersions();
            const { data } = await api.get(`/boq/${versionId}`);
            setActiveVersion(data.version);
            setItems(data.items);
            setMissingItems(data.missingItems || []);
          }} />
      </div>
    );
  }

  const grandTotal = items.reduce((s, i) => s + (i.totalCost || 0), 0);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button onClick={() => setActiveVersion(null)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-900 transition-colors shrink-0">
          <ChevronLeft size={16} /> Back
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-semibold text-gray-800 truncate">{activeVersion.name}</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize shrink-0 ${STATUS_COLORS[activeVersion.status]}`}>{activeVersion.status}</span>
          </div>
          <p className="text-xs text-gray-500 truncate">{activeVersion.projectId?.name} — {activeVersion.projectId?.client}</p>
        </div>
        {canEdit && (
          <>
            <ExcelImport
              onImport={async (rows) => {
                const result = await runImport(rows, (row) => row._id
                  ? api.put(`/boq/${activeVersion._id}/items/${row._id}`, row)
                  : api.post(`/boq/${activeVersion._id}/items`, row));
                alert(summarize(result, 'item'));
                refreshVersion();
              }}
              matchKey="item"
              existingRecords={items}
              columns={BOQ_ITEM_IMPORT_COLUMNS}
              templateName="boq-items"
            />
            <button onClick={() => { setEditingItem(null); setItemModal(true); }}
              className="flex items-center gap-2 bg-primary-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 shrink-0">
              <Plus size={16} /> Add Item
            </button>
          </>
        )}
      </div>

      {!itemsLoading && missingItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl mb-4 overflow-hidden">
          <button onClick={() => setReviewerOpen(o => !o)}
            className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left">
            <span className="flex items-center gap-2 text-sm font-semibold text-amber-800">
              <ClipboardCheck size={16} /> BOQ Reviewer — {missingItems.reduce((s, t) => s + t.missingItems.length, 0)} commonly-missing item{missingItems.reduce((s, t) => s + t.missingItems.length, 0) !== 1 ? 's' : ''} found
            </span>
            <span className="text-xs text-amber-600">{reviewerOpen ? 'Hide' : 'Show'}</span>
          </button>
          {reviewerOpen && (
            <div className="px-4 pb-4 space-y-3">
              {missingItems.map(({ trade, missingItems: list }) => (
                <div key={trade}>
                  <p className="text-xs font-semibold text-amber-800 mb-1">{trade}</p>
                  <ul className="text-xs text-amber-700 space-y-0.5">
                    {list.map(label => (
                      <li key={label} className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0" /> {label}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <p className="text-[11px] text-amber-500 pt-1 border-t border-amber-100">
                Based on items commonly paired with the trades already in this BOQ — review and add if applicable, or ignore if intentionally excluded.
              </p>
            </div>
          )}
        </div>
      )}

      {itemsLoading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-900" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
          <FileSpreadsheet size={48} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-500 text-sm">No items yet.</p>
          {canEdit && <button onClick={() => { setEditingItem(null); setItemModal(true); }} className="mt-2 text-primary-900 font-medium hover:underline text-sm">Add your first item</button>}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto mb-4">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Item', 'Unit', 'Qty', 'Base Cost', 'OH %', 'Profit %', 'Unit Price', 'Total', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{item.item}</p>
                      {item.description && <p className="text-xs text-gray-400">{item.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{item.unit}</td>
                    <td className="px-4 py-3 text-gray-700">{item.quantity}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {fmt(item.baseCost)}
                        {item.rateAlert && (
                          <AlertTriangle size={14} className="text-amber-500 shrink-0"
                            title={`${item.rateAlert.belowPct}% below your QS library rate for "${item.rateAlert.libraryItem}" (${fmt(item.rateAlert.libraryRate)})`} />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{item.overheadPercent}%</td>
                    <td className="px-4 py-3 text-gray-500">{item.profitPercent}%</td>
                    <td className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap">{fmt(item.finalUnitPrice)}</td>
                    <td className="px-4 py-3 font-bold text-gray-800 whitespace-nowrap">{fmt(item.totalCost)}</td>
                    <td className="px-4 py-3">
                      {canEdit && (
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => { setEditingItem(item); setItemModal(true); }} className="text-gray-400 hover:text-primary-900 transition-colors"><Pencil size={14} /></button>
                          {canDelete && <button onClick={() => handleDeleteItem(item._id)} className="text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-primary-900 text-white rounded-xl px-4 sm:px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="opacity-70" />
              <span className="text-sm opacity-80">{items.length} item{items.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-70">Grand Total</p>
              <p className="text-xl font-bold">{activeVersion.currency} {Number(grandTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        </>
      )}

      <ItemModal open={itemModal} onClose={() => setItemModal(false)}
        onSaved={() => { setItemModal(false); refreshVersion(); }}
        versionId={activeVersion._id} editing={editingItem} currency={activeVersion.currency} />
    </div>
  );
}

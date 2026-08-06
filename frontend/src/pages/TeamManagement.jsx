import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Mail, ShieldCheck, X, Users, Edit2, CreditCard, KeyRound, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const PRESET_ROLES = [
  { value: 'qs',              label: 'Quantity Surveyor',  desc: 'Can view pricing library and use estimator' },
  { value: 'project_manager', label: 'Project Manager',    desc: 'Can manage projects, progress, change orders, and site reports' },
  { value: 'client',          label: 'Client',             desc: 'Read-only view of estimates, invoices, progress, and site reports' },
];

const ROLE_COLORS = {
  admin:           'bg-blue-100 text-blue-700',
  qs:              'bg-purple-100 text-purple-700',
  project_manager: 'bg-green-100 text-green-700',
  client:          'bg-orange-100 text-orange-700',
};

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-900/30';

function roleColor(r) {
  return ROLE_COLORS[r] || 'bg-gray-100 text-gray-600';
}

function roleLabel(r) {
  const found = PRESET_ROLES.find((x) => x.value === r);
  if (found) return found.label;
  if (r === 'admin') return 'Administrator';
  return r ? r.charAt(0).toUpperCase() + r.slice(1) : r;
}

function RolePicker({ value, onChange }) {
  const isCustom = value && !PRESET_ROLES.find((r) => r.value === value) && value !== '';
  const [showCustom, setShowCustom] = useState(isCustom);

  const handleSelect = (v) => {
    setShowCustom(false);
    onChange(v);
  };

  const handleCustomToggle = () => {
    setShowCustom(true);
    onChange('');
  };

  return (
    <div className="space-y-2">
      {PRESET_ROLES.map((r) => (
        <label
          key={r.value}
          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${!showCustom && value === r.value ? 'border-primary-900 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'}`}
        >
          <input
            type="radio"
            name="rolePicker"
            checked={!showCustom && value === r.value}
            onChange={() => handleSelect(r.value)}
            className="mt-0.5"
          />
          <div>
            <p className="text-sm font-medium text-gray-800">{r.label}</p>
            <p className="text-xs text-gray-500">{r.desc}</p>
          </div>
        </label>
      ))}
      <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${showCustom ? 'border-primary-900 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'}`}>
        <input
          type="radio"
          name="rolePicker"
          checked={showCustom}
          onChange={handleCustomToggle}
          className="mt-0.5 shrink-0"
        />
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-800">Custom role</p>
          {showCustom && (
            <input
              autoFocus
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="e.g. Site Supervisor, Architect…"
              className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-900/30"
            />
          )}
        </div>
      </label>
    </div>
  );
}

function InviteModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'qs', phone: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.role.trim()) return setError('Please select or enter a role.');
    setSaving(true);
    setError('');
    try {
      const { data } = await api.post('/auth/invite', form);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send invite. Please try again.');
      setSaving(false);
    }
  };

  if (result) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="font-bold text-gray-800 text-lg mb-1 text-center">Invitation sent!</h3>
          <p className="text-sm text-gray-500 text-center mb-4">
            {form.name} will receive an email to set their password.
            {form.phone && ' A WhatsApp message was also sent.'}
          </p>
          <p className="text-xs text-gray-400 mb-1 font-medium">Share this link manually if needed:</p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 break-all select-all mb-4">
            {result.inviteUrl}
          </div>
          <button onClick={onSaved} className="w-full bg-primary-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-primary-800">
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[95vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h2 className="font-semibold text-gray-800">Add Team Member</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
            <input required value={form.name} onChange={set('name')} className={inputCls} placeholder="Jane Smith" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
            <input required type="email" value={form.email} onChange={set('email')} className={inputCls} placeholder="jane@company.com" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              WhatsApp Number <span className="text-gray-400 font-normal">(optional — also sends invite via WhatsApp)</span>
            </label>
            <input type="tel" value={form.phone} onChange={set('phone')} className={inputCls} placeholder="+234 000 000 0000" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Role *</label>
            <RolePicker value={form.role} onChange={(v) => setForm((f) => ({ ...f, role: v }))} />
          </div>
          <p className="text-xs text-gray-400">
            An invitation email will be sent with a link to set their password. The link expires in 48 hours.
          </p>
        </form>
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0">
          <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.name || !form.email || !form.role.trim()}
            className="flex-1 bg-primary-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Sending…' : 'Send Invite'}
          </button>
        </div>
      </div>
    </div>
  );
}

const PLAN_COLORS = {
  free:    'bg-gray-100 text-gray-500',
  basic:   'bg-blue-100 text-blue-700',
  premium: 'bg-purple-100 text-purple-700',
};

function EditPlanModal({ member, onClose, onSaved }) {
  const [plan, setPlan] = useState(member.plan || 'free');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/auth/team/${member._id}/plan`, { plan });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update plan.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Change Plan — {member.name}</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-3">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
          {['free', 'basic', 'premium'].map((p) => (
            <label key={p} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${plan === p ? 'border-primary-900 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'}`}>
              <input type="radio" name="plan" checked={plan === p} onChange={() => setPlan(p)} />
              <div>
                <p className="text-sm font-medium text-gray-800 capitalize">{p}</p>
                <p className="text-xs text-gray-500">
                  {p === 'free' && 'Estimator, BOQ, Invoices'}
                  {p === 'basic' && '+ Rate Libraries, Estimate History'}
                  {p === 'premium' && '+ Analytics, Change Orders, Site Reports, all features'}
                </p>
              </div>
            </label>
          ))}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-primary-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-800 disabled:opacity-60">
              {saving ? 'Saving…' : 'Update Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResetPasswordModal({ member, onClose }) {
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    setSaving(true);
    try {
      await api.patch(`/auth/team/${member._id}/password`, { password });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Reset Password — {member.name}</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        {done ? (
          <div className="p-6 text-center">
            <p className="text-green-600 font-medium mb-4">Password reset successfully.</p>
            <button onClick={onClose} className="bg-primary-900 text-white rounded-lg px-6 py-2 text-sm font-medium hover:bg-primary-800">Done</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-900/30" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 bg-primary-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-800 disabled:opacity-60">
                {saving ? 'Saving…' : 'Reset Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function EditRoleModal({ member, onClose, onSaved }) {
  const [role, setRole] = useState(member.role);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!role.trim()) return setError('Please select or enter a role.');
    setSaving(true);
    try {
      await api.patch(`/auth/team/${member._id}/role`, { role });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update role.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Change Role — {member.name}</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-3">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}
          <RolePicker value={role} onChange={setRole} />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving || !role.trim()} className="flex-1 bg-primary-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-800 disabled:opacity-60">
              {saving ? 'Saving…' : 'Update Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TeamManagement() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [editPlanMember, setEditPlanMember] = useState(null);
  const [resetPwMember, setResetPwMember] = useState(null);

  if (user?.role !== 'admin') {
    return (
      <div className="text-center py-20 text-gray-400">
        <ShieldCheck size={48} className="mx-auto mb-3 opacity-20" />
        <p className="font-medium">Admin access required</p>
        <p className="text-sm">Only administrators can manage team members.</p>
      </div>
    );
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/auth/team');
      setMembers(data.members || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRemove = async (id) => {
    if (!confirm('Remove this team member from your company?')) return;
    try {
      await api.delete(`/auth/team/${id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove team member');
    }
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Team Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage who has access to your company's BOQ system.</p>
        </div>
        <button onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 bg-primary-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-800">
          <Plus size={16} /> Add Member
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading team…</div>
      ) : members.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users size={40} className="mx-auto mb-3 opacity-20" />
          <p>No team members yet. Add your first member above.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs text-gray-500 font-semibold uppercase tracking-wide">
            {members.length} member{members.length !== 1 ? 's' : ''}
          </div>
          <div className="divide-y divide-gray-50">
            {members.map((m) => (
              <div key={m._id} className="px-5 py-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white font-bold ${roleColor(m.role).replace('text-', 'bg-').replace('-100', '-500')}`}>
                  {m.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-800 truncate">{m.name}</p>
                    {m._id === user._id && <span className="text-xs text-gray-400">(you)</span>}
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-1"><Mail size={11} /> {m.email}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${roleColor(m.role)}`}>
                  {roleLabel(m.role)}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 capitalize ${PLAN_COLORS[m.plan || 'free']}`}>
                  {m.plan || 'free'}
                </span>
                {(() => {
                  const isSuperUser = ['tidan1023@gmail.com', 'sadiajahleel@gmail.com'].includes(user?.email);
                  return (
                <div className="flex items-center gap-1 shrink-0">
                  {m._id !== user._id && (
                    <button onClick={() => setEditMember(m)}
                      className="p-1.5 text-gray-400 hover:text-primary-900 hover:bg-primary-50 rounded-lg" title="Change role">
                      <Edit2 size={14} />
                    </button>
                  )}
                  {isSuperUser && (
                    <button onClick={() => setEditPlanMember(m)}
                      className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg" title="Change plan">
                      <CreditCard size={14} />
                    </button>
                  )}
                  {isSuperUser && m._id !== user._id && (
                    <button onClick={() => setResetPwMember(m)}
                      className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg" title="Reset password">
                      <KeyRound size={14} />
                    </button>
                  )}
                  {m._id !== user._id && (
                    <button onClick={() => handleRemove(m._id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Remove">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                  );
                })()}
              </div>
            ))}
          </div>
        </div>
      )}

      {showInvite && (
        <InviteModal onClose={() => setShowInvite(false)} onSaved={() => { setShowInvite(false); load(); }} />
      )}
      {editMember && (
        <EditRoleModal member={editMember} onClose={() => setEditMember(null)} onSaved={() => { setEditMember(null); load(); }} />
      )}
      {editPlanMember && (
        <EditPlanModal member={editPlanMember} onClose={() => setEditPlanMember(null)} onSaved={() => { setEditPlanMember(null); load(); }} />
      )}
      {resetPwMember && (
        <ResetPasswordModal member={resetPwMember} onClose={() => setResetPwMember(null)} />
      )}
    </div>
  );
}

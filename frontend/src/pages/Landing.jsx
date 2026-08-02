import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, Calculator, Database, FileText, ArrowRight,
  CheckCircle, TrendingUp, Shield, Clock, ChevronRight,
  Users, Receipt, BarChart2, GitPullRequest, ClipboardList,
  Package, Zap, FolderOpen, X, Phone, GanttChart,
  BookOpen, Layers, ChevronDown,
} from 'lucide-react';
import Logo from '../components/Logo';
import axios from 'axios';

function BookCallModal({ plan, onClose }) {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [phone, setPhone]       = useState('');
  const [submitting, setSub]    = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setSub(true);
    setError('');
    try {
      await axios.post('/api/auth/request-onboarding', { name, email, phone, plan });
      setDone(true);
    } catch {
      setError('Something went wrong. Please email us directly at hello@squaremetre.app');
    } finally { setSub(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-7 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"><X size={20} /></button>
        {done ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={28} className="text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Request Sent!</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              We've received your request for the <strong>{plan}</strong> plan.
              We'll be in touch within 24 hours to schedule your onboarding call.
            </p>
            <button onClick={onClose} className="mt-6 bg-primary-900 text-white font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-primary-800 transition-colors">Done</button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                <Phone size={18} className="text-primary-900" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Book an Onboarding Call</h3>
                <p className="text-sm text-gray-400">{plan} plan</p>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-5 leading-relaxed">
              Leave your details and we'll reach out within 24 hours to schedule a personal walkthrough and open your account.
            </p>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Your Name</label>
                <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Tunde Adeyemi"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-900" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email Address</label>
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tunde@yourfirm.com"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-900" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Phone / WhatsApp</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 800 000 0000"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-900" />
              </div>
              {error && <p className="text-red-500 text-xs">{error}</p>}
              <button type="submit" disabled={submitting}
                className="w-full bg-primary-900 text-white font-semibold py-3 rounded-xl hover:bg-primary-800 transition-colors text-sm disabled:opacity-60">
                {submitting ? 'Sending…' : 'Request Onboarding Call'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

const HOW_IT_WORKS = [
  {
    n: '01',
    title: 'Set Up Your Rate Libraries',
    desc: 'Enter your QS unit rates, artisan day-rates, and material prices. These feed every estimate, BOQ, and cost report across the platform.',
  },
  {
    n: '02',
    title: 'Estimate & Build Your BOQ',
    desc: 'Input project size, condition, and finish tier for a ballpark estimate in seconds. Then build the full Bill of Quantities — item by item — and send it to the client for approval.',
  },
  {
    n: '03',
    title: 'Manage the Work',
    desc: 'Track progress weekly, file site reports, log expenses, raise change orders, and pay your team — all from one place.',
  },
  {
    n: '04',
    title: 'Invoice, Report & Get Paid',
    desc: 'Issue invoices linked to projects. Share a link so clients can view the invoice and your bank transfer details. Run analytics on revenue, costs, and profitability. Download PDFs on your letterhead.',
  },
];

const CONDITIONS = [
  { label: 'Carcass',          desc: 'Structure only — full interior scope ahead' },
  { label: 'Advanced Carcass', desc: 'External shell done — internal scope ahead' },
  { label: 'Semi-Finished',    desc: 'MEP rough-in done — finishes and fit-out ahead' },
  { label: 'Finished',         desc: 'Complete house needing a facelift' },
];

const TIERS = [
  { label: 'Basic',     color: 'bg-gray-100 text-gray-700',     desc: 'Functional and clean' },
  { label: 'Mid-Range', color: 'bg-blue-100 text-blue-700',     desc: 'Smart and polished' },
  { label: 'Premium',   color: 'bg-purple-100 text-purple-700', desc: 'High-end and bespoke' },
];

const FEATURES = [
  {
    icon: Calculator,
    color: 'bg-blue-50 text-blue-600',
    title: 'Project Estimator',
    desc: 'Generate detailed cost estimates in minutes. Select project type, condition, size, and build tier — the engine prices every element from your rate libraries.',
  },
  {
    icon: Layers,
    color: 'bg-indigo-50 text-indigo-600',
    title: 'BOQ Builder',
    desc: 'Build a full Bill of Quantities item by item, with options and tiers. Send it to the client for digital approval — they approve or reject each line from their portal.',
  },
  {
    icon: GanttChart,
    color: 'bg-cyan-50 text-cyan-600',
    title: 'Programme of Works',
    desc: 'Auto-draw an 8-phase Gantt chart. Set one start date and every activity date shifts instantly. Track weekly variance with planned vs actual progress reports.',
  },
  {
    icon: Database,
    color: 'bg-teal-50 text-teal-600',
    title: 'QS & Rate Libraries',
    desc: 'Maintain master rate books for unit rates, artisan day-rates, and material prices. Every estimate and BOQ references live rates — update once, reflect everywhere.',
  },
  {
    icon: Zap,
    color: 'bg-yellow-50 text-yellow-600',
    title: 'Price Intelligence',
    desc: 'AI-powered benchmarking that compares your rates against market data. Spot where you\'re over- or under-priced before it costs you a contract.',
  },
  {
    icon: TrendingUp,
    color: 'bg-green-50 text-green-600',
    title: 'Progress Tracker',
    desc: 'Log construction progress by phase — substructure, superstructure, finishes, MEP, and more. Clients see live updates without needing to call.',
  },
  {
    icon: GitPullRequest,
    color: 'bg-purple-50 text-purple-600',
    title: 'Change Orders',
    desc: 'Manage scope changes formally. Team members submit requests; you review, price, and approve. Every change is logged with a full paper trail.',
  },
  {
    icon: ClipboardList,
    color: 'bg-orange-50 text-orange-600',
    title: 'Site Reports',
    desc: 'Your team files daily or weekly site reports — photos, weather, manpower, and progress notes. Review all reports and add comments from the dashboard.',
  },
  {
    icon: Receipt,
    color: 'bg-red-50 text-red-600',
    title: 'Invoices & Expenses',
    desc: 'Create and track invoices linked to projects. Share a link so clients can view the invoice and pay by bank transfer. Log every project expense and compare against budget.',
  },
  {
    icon: BarChart2,
    color: 'bg-teal-50 text-teal-600',
    title: 'Analytics',
    desc: 'Company-wide performance charts: revenue trends, project profitability, outstanding balances, and cost breakdowns by trade.',
  },
  {
    icon: FolderOpen,
    color: 'bg-pink-50 text-pink-600',
    title: 'Document Library',
    desc: 'Centralised storage for contracts, permits, site plans, and drawings. Organised by folder or project — always a click away for the whole team.',
  },
  {
    icon: FileText,
    color: 'bg-amber-50 text-amber-600',
    title: 'PDF on Letterhead',
    desc: 'Download professional estimates and invoices on your company letterhead with your logo, signature, stamp, and payment terms.',
  },
  {
    icon: Clock,
    color: 'bg-sky-50 text-sky-600',
    title: 'Estimate History & Simulator',
    desc: 'Every estimate is saved. Run what-if simulations — change material costs, labour rates, or size — and see the cost impact immediately.',
  },
  {
    icon: Users,
    color: 'bg-violet-50 text-violet-600',
    title: 'Team & Role Management',
    desc: 'Invite QS, Project Managers, and Clients. Each role sees only what\'s relevant — clients get progress updates, BOQ approvals, and invoices; PMs get site tools.',
  },
  {
    icon: Shield,
    color: 'bg-gray-50 text-gray-600',
    title: 'Modular — Use What You Need',
    desc: 'Toggle individual modules on or off from Company Settings. Start lean and activate features as your team grows — no bloat, no noise.',
  },
];

const FAQS = [
  {
    q: 'How does SquareMetre calculate the base rate for estimates?',
    a: 'The base rate is the cost per m² for a carcass, basic-finish, 150m² project at today\'s prices. If you have historical projects logged, the engine reverse-engineers each project\'s cost to that standard baseline, removes statistical outliers, and averages the remainder — so your estimates are calibrated to your own real data. If you have no historical projects yet, it falls back to a ₦90,000/m² industry rate. You can also set your own base rate manually in Company Settings → Estimator Settings.',
  },
  {
    q: 'Can I import all my data from Excel at once?',
    a: 'Yes. Use Master Import (in the Admin section of the sidebar) to upload a single Excel file with one sheet per module — QS Prices, Artisan Rates, Materials, Contacts, and Historical Projects. The app reads each sheet and saves the data to the right module automatically. Download the pre-formatted template first to fill in your data.',
  },
  {
    q: 'What is the difference between the Free, Basic, and Premium plans?',
    a: 'Free gives you 7 days of core tools: estimates, BOQ builder, invoices, contacts, projects, and documents. Basic adds rate libraries (QS, artisan, materials), estimate history, historical projects, and the programme of works Gantt chart. Premium unlocks analytics, change orders, site reports, expense tracking, the scenario simulator, and price intelligence.',
  },
  {
    q: 'Can clients see and approve BOQs online?',
    a: 'Yes. Every client you invite gets their own secure portal where they can view the BOQ, approve or flag individual line items, see invoices, and leave comments — all without needing a full admin account.',
  },
  {
    q: 'How does invoice payment work?',
    a: 'Create an invoice and share the link directly with your client — it shows your bank transfer details. Record payments as they come in and your Invoices page stays up to date automatically.',
  },
  {
    q: 'How do I build a programme of works?',
    a: 'Go to Programme of Works in the sidebar. Select a project, set a start date, and the 8-phase Gantt chart auto-populates with standard construction phases. All activity dates shift automatically when you change the start date. You can also file weekly progress reports with planned vs actual tracking from the same page.',
  },
  {
    q: 'Can I manage multiple projects and teams?',
    a: 'Yes. Each project has its own BOQ, invoices, programme, site reports, expenses, and change orders. You can invite team members — QS, Project Managers, and Clients — with role-based access so each person only sees what is relevant to them.',
  },
  {
    q: 'What happens when my 7-day trial ends?',
    a: 'You keep access to the free tier features (estimates, BOQ, invoices, contacts, projects, documents) indefinitely. Features that require a Basic or Premium plan are gated until you upgrade. Upgrades are activated after a short onboarding call — we set you up personally.',
  },
  {
    q: 'Can I generate PDF estimates and invoices?',
    a: 'Yes. From any estimate or invoice detail page, click the Download PDF button. The PDF is professionally formatted with your company logo, details, line items, and totals — ready to send directly to your client.',
  },
  {
    q: 'Is my data secure?',
    a: 'All data is stored on MongoDB Atlas with encryption at rest and in transit. Each company\'s data is fully isolated — no user from one firm can ever access another\'s data.',
  },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left gap-4"
      >
        <span className="font-medium text-gray-800 text-sm leading-snug">{q}</span>
        <ChevronDown size={16} className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
          {a}
        </div>
      )}
    </div>
  );
}

function FaqList() {
  return (
    <div className="space-y-3">
      {FAQS.map(({ q, a }) => <FaqItem key={q} q={q} a={a} />)}
    </div>
  );
}

const WAITLIST_ROLES = [
  { value: 'quantity_surveyor',         label: 'Quantity Surveyor' },
  { value: 'project_manager',           label: 'Project Manager' },
  { value: 'contractor',                label: 'Contractor / Builder' },
  { value: 'architect',                 label: 'Architect' },
  { value: 'civil_structural_engineer', label: 'Civil / Structural Engineer' },
  { value: 'mep_engineer',              label: 'MEP Engineer' },
  { value: 'site_supervisor',           label: 'Site Supervisor / Foreman' },
  { value: 'developer_client',          label: 'Developer / Client' },
  { value: 'consultant',                label: 'Consultant' },
  { value: 'supplier_vendor',           label: 'Supplier / Vendor' },
  { value: 'student',                   label: 'Student' },
  { value: 'other',                     label: 'Other' },
];

function WaitlistSection() {
  const [form, setForm]           = useState({ name: '', role: '', email: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]           = useState(false);
  const [error, setError]         = useState('');

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await axios.post('/api/waitlist', form);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="py-14 sm:py-24 px-4 sm:px-8 bg-primary-900 text-white">
      <div className="max-w-xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-3">Join the Launch Waitlist</h2>
        <p className="text-blue-200 mb-8 text-sm sm:text-base leading-relaxed">
          We're rolling out new modular features soon. Leave your details and we'll email you the moment they go live.
        </p>

        {done ? (
          <div className="bg-white/10 border border-white/20 rounded-2xl p-8">
            <CheckCircle size={32} className="text-green-400 mx-auto mb-3" />
            <p className="font-semibold">You're on the list!</p>
            <p className="text-blue-200 text-sm mt-1">We'll email you the moment new features launch.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="bg-white rounded-2xl p-6 sm:p-8 shadow-xl text-left space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg text-sm">{error}</div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Name *</label>
                <input required value={form.name} onChange={set('name')}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-900"
                  placeholder="Full name" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Role in construction *</label>
                <select required value={form.role} onChange={set('role')}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-900">
                  <option value="">Select role…</option>
                  {WAITLIST_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Email *</label>
                <input required type="email" value={form.email} onChange={set('email')}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-900"
                  placeholder="you@company.com" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Phone <span className="text-gray-400 font-normal">(optional)</span></label>
                <input value={form.phone} onChange={set('phone')}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-900"
                  placeholder="+234 800 000 0000" />
              </div>
            </div>
            <button type="submit" disabled={submitting}
              className="w-full bg-primary-900 text-white font-semibold py-3 rounded-xl hover:bg-primary-800 transition-colors disabled:opacity-60">
              {submitting ? 'Joining…' : 'Join the Waitlist'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

export default function Landing() {
  const [bookPlan, setBookPlan] = useState(null);

  return (
    <div className="min-h-screen bg-white font-sans">
      {bookPlan && <BookCallModal plan={bookPlan} onClose={() => setBookPlan(null)} />}

      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-primary-900 rounded-xl flex items-center justify-center shrink-0">
              <Building2 size={16} className="text-white" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold text-primary-900 leading-tight">SquareMetre</p>
              <p className="text-xs text-gray-400 hidden sm:block">BOQ and Project Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-primary-900 transition-colors px-2 py-1">Sign In</Link>
            <Link to="/register" className="bg-primary-900 text-white text-sm font-medium px-3 sm:px-4 py-2 rounded-lg hover:bg-primary-800 transition-colors">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="bg-primary-900 text-white pt-12 pb-16 sm:pt-20 sm:pb-28 px-4 sm:px-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-blue-400" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-blue-300" />
        </div>
        <div className="max-w-4xl mx-auto text-center relative">
          <span className="inline-block bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold px-3 py-1 rounded-full mb-5 tracking-widest uppercase">
            Built for Nigerian Construction Firms
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold leading-tight mb-4 sm:mb-6">
            Estimate, Manage & Deliver<br />
            <span className="text-blue-300">Every Construction Project</span>
          </h1>
          <p className="text-base sm:text-lg text-blue-200 max-w-2xl mx-auto mb-7 sm:mb-10 leading-relaxed">
            From your first ballpark estimate to final invoice — SquareMetre is the complete platform for Nigerian construction firms.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register"
              className="flex items-center justify-center gap-2 bg-white text-primary-900 font-semibold px-6 py-3 sm:px-7 sm:py-3.5 rounded-xl hover:bg-blue-50 transition-colors shadow-lg">
              Start Free — 7 Days <ArrowRight size={17} />
            </Link>
            <Link to="/login"
              className="flex items-center justify-center gap-2 border border-blue-400/40 text-white font-medium px-6 py-3 sm:px-7 sm:py-3.5 rounded-xl hover:bg-primary-800 transition-colors">
              Sign In
            </Link>
          </div>
          <div className="flex flex-wrap gap-3 sm:gap-6 justify-center mt-8 sm:mt-12 text-blue-300 text-xs sm:text-sm">
            {['Invoicing & payment tracking', 'PDF on letterhead', 'Client approval portal', '7-day free trial'].map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle size={13} className="text-blue-400" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-14 sm:py-24 px-4 sm:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">How It Works</h2>
            <p className="text-gray-500 max-w-xl mx-auto text-sm sm:text-base">From rate libraries to final payment — one connected workflow.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6 sm:gap-8">
            {HOW_IT_WORKS.map(({ n, title, desc }) => (
              <div key={n} className="flex gap-4">
                <div className="text-4xl sm:text-5xl font-black text-primary-100 leading-none shrink-0 w-10 sm:w-12 select-none">{n}</div>
                <div className="pt-1">
                  <h3 className="font-semibold text-gray-800 mb-1.5 text-sm sm:text-base">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONDITION + TIER GRID */}
      <section className="py-14 sm:py-24 px-4 sm:px-8 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Four Conditions, Three Tiers</h2>
            <p className="text-gray-500 max-w-xl mx-auto text-sm sm:text-base">
              Select where the property starts and the quality of finish the client wants. The engine handles the rest.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6 sm:gap-8">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Starting Condition</p>
              <div className="space-y-2.5">
                {CONDITIONS.map(({ label, desc }) => (
                  <div key={label} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                    <ChevronRight size={14} className="text-primary-900 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Finish Tier</p>
              <div className="space-y-2.5">
                {TIERS.map(({ label, color, desc }) => (
                  <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${color}`}>{label}</span>
                    <p className="text-sm text-gray-600">{desc}</p>
                  </div>
                ))}
                <div className="mt-3 p-3 bg-primary-50 rounded-xl border border-primary-100">
                  <p className="text-xs text-primary-700 font-medium leading-relaxed">
                    The tool calculates all three tiers simultaneously, so you can present the client with options in a single document.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SAMPLE ESTIMATE */}
      <section className="py-14 sm:py-24 px-4 sm:px-8 bg-primary-900 text-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Sample Output</h2>
            <p className="text-blue-300 text-sm">250m² · Semi-Finished condition · Based on 8 historical projects</p>
          </div>
          <div className="bg-primary-800 rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { tier: 'Basic',     rate: '₦78,400',  total: '₦19,600,000', selected: false },
                { tier: 'Mid-Range', rate: '₦113,700', total: '₦28,420,000', selected: true  },
                { tier: 'Premium',   rate: '₦164,600', total: '₦41,160,000', selected: false },
              ].map(({ tier, rate, total, selected }) => (
                <div key={tier} className={`rounded-xl p-4 ${selected ? 'bg-blue-600 ring-2 ring-blue-400' : 'bg-primary-700'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold">{tier}</p>
                    {selected && <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Selected</span>}
                  </div>
                  <p className="text-xl font-black">{total}</p>
                  <p className="text-xs text-blue-300 mt-0.5">{rate} / m²</p>
                </div>
              ))}
            </div>
            <div className="bg-primary-700 rounded-xl p-4">
              <p className="text-xs text-blue-300 font-semibold uppercase tracking-wide mb-3">Breakdown</p>
              <div className="space-y-2">
                {[
                  ['Historical projects used',           '8 of 11 (3 outliers removed)'],
                  ['Base rate (carcass, basic, 150m²)',  '₦96,200 /m²'],
                  ['Condition (semi-finished)',           '× 0.55'],
                  ['Tier (mid-range)',                   '× 1.45'],
                  ['Size adjustment (250m²)',            '× 0.930'],
                  ['Final rate per m²',                  '₦113,700 /m²'],
                ].map(([l, v]) => (
                  <div key={l} className="flex items-start justify-between gap-2 text-blue-200">
                    <span className="text-xs">{l}</span>
                    <span className="text-xs font-semibold text-white whitespace-nowrap">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="py-14 sm:py-24 px-4 sm:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Everything Built In</h2>
            <p className="text-gray-500 max-w-xl mx-auto text-sm sm:text-base">Estimating, programming, project management, invoicing, payments, reporting — one platform, no spreadsheets.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {FEATURES.map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="bg-gray-50 rounded-2xl p-5 sm:p-6 border border-gray-100 hover:border-primary-200 transition-colors">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${color} mb-3 sm:mb-4`}>
                  <Icon size={18} />
                </div>
                <h3 className="font-semibold text-gray-800 mb-1.5 text-sm sm:text-base">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Waitlist */}
      <WaitlistSection />

      {/* PRICING */}
      <section className="py-14 sm:py-24 px-4 sm:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Simple, Transparent Pricing</h2>
            <p className="text-gray-500 max-w-xl mx-auto text-sm sm:text-base">One tool for your whole team. No hidden fees, no per-seat charges.</p>
          </div>

          {/* Free tier */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Free</span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">7-day trial</span>
              </div>
              <p className="text-sm text-gray-600">Create an account and access the full platform free for 7 days — no card required. Estimator, BOQ, invoices, programme, and more.</p>
            </div>
            <Link to="/register"
              className="shrink-0 flex items-center gap-2 border border-primary-900 text-primary-900 font-semibold px-5 py-2.5 rounded-xl hover:bg-primary-50 transition-colors text-sm">
              Start Free Trial <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 sm:gap-8 items-start">

            {/* Basic */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-7 flex flex-col">
              <div className="mb-5">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Basic</span>
                <div className="mt-3 flex items-end gap-1.5">
                  <span className="text-4xl font-black text-gray-900">₦50,000</span>
                  <span className="text-gray-400 text-sm mb-1">/month</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">For teams getting started with digital estimating and project management.</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  'Project Estimator + Cost Simulator',
                  'BOQ Builder with client approval',
                  'Programme of Works (Gantt)',
                  'Estimate & programme history',
                  'Up to 5 team members',
                  'QS, Artisan & Material rate libraries',
                  'Historical project database',
                  'Invoices + payment tracking',
                  'Document Library',
                  'Client portal (view & approve)',
                  'PDF downloads on letterhead',
                  'Email support',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <CheckCircle size={15} className="text-green-500 mt-0.5 shrink-0" />{f}
                  </li>
                ))}
                {[
                  'Analytics & Reporting',
                  'Price Intelligence (AI)',
                  'Unlimited team members',
                  'Change Orders & Site Reports',
                  'Expense Tracker',
                  'Progress Tracker',
                  'Priority support',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-400 line-through decoration-gray-300">
                    <div className="w-3.5 h-3.5 mt-0.5 shrink-0 rounded-full border border-gray-200" />{f}
                  </li>
                ))}
              </ul>
              <button onClick={() => setBookPlan('Basic')}
                className="w-full flex items-center justify-center gap-2 border border-primary-900 text-primary-900 font-semibold py-3 rounded-xl hover:bg-primary-50 transition-colors text-sm">
                Book a Call <ArrowRight size={15} />
              </button>
            </div>

            {/* Premium */}
            <div className="bg-primary-900 rounded-2xl shadow-xl p-7 flex flex-col relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-blue-500/20 pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-blue-400/10 pointer-events-none" />
              <div className="mb-5 relative">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-blue-300 uppercase tracking-widest">Premium</span>
                  <span className="text-xs bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-full font-semibold">Best Value</span>
                </div>
                <div className="mt-3 flex items-end gap-1.5">
                  <span className="text-4xl font-black text-white">₦300,000</span>
                  <span className="text-blue-300 text-sm mb-1">/year</span>
                </div>
                <p className="text-sm text-blue-300 mt-2">
                  Everything in Basic, plus the full platform — unlocked.
                  <span className="block mt-1 text-blue-400 text-xs">~₦25,000/month — save 50% vs Basic annual</span>
                </p>
              </div>
              <ul className="space-y-3 mb-8 flex-1 relative">
                {[
                  'Everything in Basic',
                  'Unlimited team members',
                  'Full Analytics & Reporting',
                  'Price Intelligence (AI benchmarking)',
                  'Change Orders & Approvals',
                  'Site Reports with photos',
                  'Expense Tracker',
                  'Progress Tracker',
                  'Contacts & CRM',
                  'Unlimited estimate history',
                  'Priority onboarding & support',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-blue-100">
                    <CheckCircle size={15} className="text-blue-400 mt-0.5 shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <button onClick={() => setBookPlan('Premium')}
                className="w-full flex items-center justify-center gap-2 bg-white text-primary-900 font-bold py-3 rounded-xl hover:bg-blue-50 transition-colors text-sm relative shadow-md">
                Book a Call <ArrowRight size={15} />
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Prices in Nigerian Naira. Paid plans are activated after an onboarding call — we set you up personally.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 sm:py-20 px-4 sm:px-8 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-8">Frequently Asked Questions</h2>
          <FaqList />
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 sm:py-24 px-4 sm:px-8 bg-white text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Ready to Run Your First Estimate?</h2>
          <p className="text-gray-500 mb-7 leading-relaxed text-sm sm:text-base">
            Create a free account, set up your rate libraries, and have a credible ballpark estimate with a full Gantt programme in your client's hands within minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register"
              className="flex items-center justify-center gap-2 bg-primary-900 text-white font-semibold px-7 py-3 rounded-xl hover:bg-primary-800 transition-colors shadow-md">
              Start 7-Day Free Trial <ArrowRight size={17} />
            </Link>
            <Link to="/login"
              className="flex items-center justify-center gap-2 border border-gray-300 text-gray-700 font-medium px-7 py-3 rounded-xl hover:bg-gray-50 transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-100 py-6 sm:py-8 px-4 sm:px-8 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-primary-900 rounded-lg flex items-center justify-center">
              <Building2 size={14} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-700">SquareMetre Limited</span>
          </div>
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} SquareMetre. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

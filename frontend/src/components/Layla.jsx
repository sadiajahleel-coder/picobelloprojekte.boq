import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';

const LAYLA_RESPONSES = [
  { keywords: ['estimate', 'estimat', 'cost', 'price', 'quote'],
    reply: "Go to Project Estimator in the sidebar. Select your project type, condition, size, and finish tier — Layla will price every element from your rate libraries automatically." },
  { keywords: ['boq', 'bill of quantities', 'quantities'],
    reply: "The BOQ Builder lets you build a full Bill of Quantities item by item. Once done, send it to your client for digital approval directly from their portal." },
  { keywords: ['invoice', 'payment', 'pay'],
    reply: "Go to Invoices in the sidebar to create and manage invoices. Share the invoice link with your client — it shows your bank transfer details. Track outstanding balances from the same page." },
  { keywords: ['programme', 'gantt', 'schedule', 'phase'],
    reply: "Programme of Works gives you an 8-phase Gantt chart. Set a start date and all activity dates shift automatically. File weekly progress reports with planned vs actual tracking." },
  { keywords: ['team', 'invite', 'member', 'role', 'staff'],
    reply: "Go to Team Management under Admin. Invite QS, Project Managers, and Clients by email. Each role sees only what's relevant to them." },
  { keywords: ['client', 'portal', 'approval', 'approve'],
    reply: "Clients get their own portal — view progress, approve BOQ items, see invoices, and leave comments. Invite them via Team Management." },
  { keywords: ['report', 'site', 'daily', 'weekly'],
    reply: "Use Site Reports under Execution to file daily or weekly reports with photos, weather, manpower, and progress notes." },
  { keywords: ['expense', 'cost tracker', 'budget'],
    reply: "The Expense Tracker lets you log every project cost and compare against budget. Find it under Execution in the sidebar." },
  { keywords: ['analytics', 'revenue', 'profit', 'performance'],
    reply: "Analytics gives you company-wide charts — revenue trends, project profitability, outstanding balances, and cost breakdowns by trade." },
  { keywords: ['base rate', 'baserate', 'rate override', 'manual rate'],
    reply: "The base rate is the ₦/m² cost for a carcass, basic-finish, 150m² project. The engine calculates it automatically from your historical projects. If you have none yet, it uses a ₦90,000/m² industry fallback. You can override it manually in Company Settings → Estimator Settings." },
  { keywords: ['import', 'excel', 'upload', 'master import', 'spreadsheet'],
    reply: "Use Master Import (in the Admin section of the sidebar) to upload a single Excel file with one sheet per module — QS Prices, Artisan Rates, Materials, Contacts, and Historical Projects. Download the template first to fill in your data." },
  { keywords: ['module', 'feature', 'toggle', 'enable', 'disable'],
    reply: "Turn individual modules on or off in Company Settings → Modules. Control exactly what your team sees in the sidebar." },
  { keywords: ['rate', 'library', 'qs price', 'artisan', 'material'],
    reply: "Your rate libraries live under Pricing Libraries. Maintain QS unit rates, artisan day-rates, and material prices — every estimate references these live rates." },
  { keywords: ['change order', 'variation', 'scope'],
    reply: "Change Orders let you manage scope changes formally. Team members submit, you review, price, and approve. Every change is fully logged." },
  { keywords: ['document', 'file', 'upload', 'contract', 'drawing'],
    reply: "The Document Library gives you centralised storage for contracts, permits, site plans, and drawings — organised by folder or project." },
  { keywords: ['password', 'login', 'forgot', 'reset', 'account'],
    reply: "Click 'Forgot password?' on the login page to reset. For other account issues, email hello@squaremetre.app." },
  { keywords: ['plan', 'upgrade', 'basic', 'premium', 'trial'],
    reply: "SquareMetre has three plans — Free (7-day trial), Basic, and Premium. Basic unlocks rate libraries and estimate history. Premium adds analytics, change orders, site reports, and more." },
  { keywords: ['hello', 'hi', 'hey', 'help', 'start', 'what can'],
    reply: "Hi! I'm Layla, your SquareMetre assistant. I can help with estimates, BOQs, invoices, team setup, programmes, and more. What do you need?" },
];

const FALLBACK = "I'm not sure about that one. Try asking about estimates, BOQs, invoices, team management, or the programme of works. Or email hello@squaremetre.app.";

const SUGGESTED = [
  "How do I create an estimate?",
  "How does BOQ approval work?",
  "How do clients pay invoices?",
  "How do I invite my team?",
  "What's included in each plan?",
  "How does the Gantt programme work?",
];

function getReply(input) {
  const lower = input.toLowerCase();
  for (const { keywords, reply } of LAYLA_RESPONSES) {
    if (keywords.some((k) => lower.includes(k))) return reply;
  }
  return FALLBACK;
}

export default function Layla() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: 'layla', text: "Hi, I'm Layla! How can I help you today?" },
  ]);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = (text) => {
    const t = (text || input).trim();
    if (!t) return;
    setMessages((prev) => [...prev, { from: 'user', text: t }]);
    setInput('');
    setTimeout(() => {
      setMessages((prev) => [...prev, { from: 'layla', text: getReply(t) }]);
    }, 600);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
      {open && (
        <div className="fixed bottom-20 right-4 sm:right-6 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          style={{ maxHeight: '72vh' }}>

          {/* Header */}
          <div className="bg-primary-900 px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">L</div>
              <div>
                <p className="text-white font-semibold text-sm leading-tight">Layla</p>
                <p className="text-blue-300 text-xs">SquareMetre Assistant</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-blue-300 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.from === 'layla' && (
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 mr-2 mt-0.5">L</div>
                )}
                <div className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                  m.from === 'user'
                    ? 'bg-primary-900 text-white rounded-br-sm'
                    : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Suggested questions — always visible, kept to one compact row so it doesn't crowd out Layla's replies */}
          <div className="px-3 pt-1 pb-1 bg-white border-t border-gray-100 shrink-0">
            <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Suggested</p>
            <div className="flex gap-1.5 overflow-x-auto">
              {SUGGESTED.map((q) => (
                <button key={q} onClick={() => send(q)}
                  className="text-[10.5px] bg-primary-50 text-primary-900 border border-primary-200 rounded-full px-2 py-0.5 hover:bg-primary-100 transition-colors whitespace-nowrap shrink-0">
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="px-3 py-2.5 bg-white shrink-0 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask Layla anything…"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-900/30"
            />
            <button onClick={() => send()} disabled={!input.trim()}
              className="bg-primary-900 text-white rounded-xl px-3 py-2 hover:bg-primary-800 transition-colors disabled:opacity-40">
              <Send size={15} />
            </button>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 right-4 sm:right-6 z-50 w-14 h-14 bg-primary-900 text-white rounded-full shadow-lg hover:bg-primary-800 transition-colors flex items-center justify-center"
        title="Chat with Layla"
      >
        {open ? <X size={22} /> : <MessageSquare size={22} />}
      </button>
    </>
  );
}

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Logo from '../components/Logo';

const API = import.meta.env.VITE_API_URL || '/api';

function fmt(n) {
  return Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_LABEL = {
  draft: 'Draft', sent: 'Awaiting Payment', paid: 'Paid',
  partially_paid: 'Partially Paid', overdue: 'Overdue',
};
const STATUS_COLOR = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  partially_paid: 'bg-yellow-100 text-yellow-700',
  overdue: 'bg-red-100 text-red-700',
};

export default function PayInvoice() {
  const { token } = useParams();

  const [invoice, setInvoice] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/invoices/public/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.invoice) {
          setInvoice(d.invoice);
          setCompany(d.invoice.companyId || {});
        } else {
          setError('Invoice not found.');
        }
      })
      .catch(() => setError('Could not load invoice.'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading invoice…</p>
        </div>
      </div>
    );
  }

  if (!invoice && error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <p className="text-gray-400 text-sm mt-1">This link may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  const isPaid = invoice?.status === 'paid' || invoice?.balance <= 0;
  const pct    = invoice?.total > 0 ? Math.min(100, ((invoice.amountPaid || 0) / invoice.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-primary-900 text-white">
        <div className="max-w-2xl mx-auto px-4 py-5 flex items-center gap-3">
          <Logo size={36} />
          <div>
            <p className="font-bold text-sm leading-tight">{company?.companyName || 'SquareMetre'}</p>
            <p className="text-blue-300 text-xs">Secure Invoice Payment</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Success banner */}
        {isPaid && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-green-800 mb-1">Payment confirmed!</h2>
            <p className="text-green-600 text-sm">Thank you. This invoice is now {invoice?.balance > 0 ? 'partially paid' : 'fully paid'}.</p>
          </div>
        )}

        {/* Invoice card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Invoice header */}
          <div className="bg-primary-900 text-white px-6 py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-blue-300 text-xs font-semibold uppercase tracking-wide mb-0.5">Invoice</p>
                <p className="text-xl font-bold font-mono">{invoice?.invoiceNumber}</p>
                <p className="text-blue-200 text-sm mt-0.5">{invoice?.projectName}</p>
              </div>
              <span className={`mt-1 shrink-0 inline-block px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[invoice?.status]}`}>
                {STATUS_LABEL[invoice?.status] || invoice?.status}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-blue-400 text-xs mb-0.5">Total</p>
                <p className="font-bold">{invoice?.currency} {fmt(invoice?.total)}</p>
              </div>
              <div>
                <p className="text-blue-400 text-xs mb-0.5">Paid</p>
                <p className="font-bold text-green-300">{invoice?.currency} {fmt(invoice?.amountPaid)}</p>
              </div>
              <div>
                <p className="text-blue-400 text-xs mb-0.5">Balance</p>
                <p className={`font-bold ${invoice?.balance > 0 ? 'text-red-300' : 'text-green-300'}`}>
                  {invoice?.currency} {fmt(invoice?.balance)}
                </p>
              </div>
            </div>

            <div className="mt-3">
              <div className="h-1.5 bg-primary-800 rounded-full overflow-hidden">
                <div className="h-1.5 bg-green-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>

          {/* Client + dates */}
          <div className="px-6 py-4 border-b border-gray-100 grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Bill To</p>
              <p className="font-semibold text-gray-800">{invoice?.clientName || '—'}</p>
              {invoice?.clientEmail && <p className="text-sm text-gray-500">{invoice.clientEmail}</p>}
              {invoice?.clientPhone && <p className="text-sm text-gray-500">{invoice.clientPhone}</p>}
              {invoice?.clientAddress && <p className="text-sm text-gray-500">{invoice.clientAddress}</p>}
            </div>
            <div className="text-sm text-gray-500 space-y-1">
              <p><span className="text-gray-400">Issued:</span> {fmtDate(invoice?.issueDate)}</p>
              {invoice?.dueDate && <p><span className="text-gray-400">Due:</span> {fmtDate(invoice.dueDate)}</p>}
            </div>
          </div>

          {/* Line items */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide">
                  <th className="text-left px-6 py-2.5">Description</th>
                  <th className="text-right px-3 py-2.5">Qty</th>
                  <th className="text-right px-3 py-2.5">Rate</th>
                  <th className="text-right px-6 py-2.5">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(invoice?.lineItems || []).map((item, i) => (
                  <tr key={i}>
                    <td className="px-6 py-3 text-gray-700">{item.description}</td>
                    <td className="px-3 py-3 text-right text-gray-500">{item.quantity} {item.unit}</td>
                    <td className="px-3 py-3 text-right text-gray-500">{fmt(item.unitRate)}</td>
                    <td className="px-6 py-3 text-right font-medium tabular-nums">{fmt(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span className="tabular-nums">{invoice?.currency} {fmt(invoice?.subtotal)}</span>
            </div>
            {invoice?.vatRate > 0 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>VAT ({invoice.vatRate}%)</span>
                <span className="tabular-nums">{invoice?.currency} {fmt(invoice?.vatAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-gray-800 pt-1 border-t border-gray-200">
              <span>Grand Total</span>
              <span className="tabular-nums">{invoice?.currency} {fmt(invoice?.total)}</span>
            </div>
            {invoice?.amountPaid > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Amount Paid</span>
                <span className="tabular-nums">− {invoice?.currency} {fmt(invoice?.amountPaid)}</span>
              </div>
            )}
            {invoice?.balance > 0 && (
              <div className="flex justify-between text-base font-bold text-red-600 pt-1 border-t border-gray-200">
                <span>Balance Due</span>
                <span className="tabular-nums">{invoice?.currency} {fmt(invoice?.balance)}</span>
              </div>
            )}
          </div>

          {/* Notes */}
          {invoice?.notes && (
            <div className="px-6 py-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-gray-600 whitespace-pre-line">{invoice.notes}</p>
            </div>
          )}

          {/* Bank details (fallback) */}
          {(company?.bankDetails || []).length > 0 && (
            <div className="px-6 py-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Bank Transfer Details</p>
              {company.bankDetails.map((b, i) => (
                <div key={i} className="text-sm text-gray-600 mb-2">
                  <p className="font-medium text-gray-800">{b.bankName}</p>
                  <p>{b.accountName} &nbsp;&middot;&nbsp; {b.accountNumber}</p>
                  {b.sortCode && <p>Sort Code: {b.sortCode}</p>}
                </div>
              ))}
              {company.paymentInstructions && (
                <p className="text-xs text-gray-400 mt-2 whitespace-pre-line">{company.paymentInstructions}</p>
              )}
            </div>
          )}
        </div>

        {/* Outstanding balance notice */}
        {!isPaid && invoice?.balance > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}
            <p className="text-sm text-gray-500">
              Please settle the balance above using the bank transfer details on this page, or contact us directly.
            </p>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 pb-4">
          Powered by SquareMetre BOQ System
        </p>
      </div>
    </div>
  );
}

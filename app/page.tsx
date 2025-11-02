'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
  Plus, Trash2, Printer, Save, Upload, RefreshCcw,
  Sun, Moon, Eye, Trash, Search
} from 'lucide-react';

/* =================== Types =================== */
type Item = { description: string; qty: number; rate: number };

type CompanyProfile = {
  logoUrl: string;
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  companyTin: string;
};

type PaymentStatus = 'Unpaid' | 'Partially Paid' | 'Paid';

type Invoice = {
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;

  clientName: string;
  clientPhone: string;
  clientEmail: string;
  clientAddress: string;

  items: Item[];

  bankDetails: string;
  additionalDetails: string;
  terms: string;

  logoUrl: string;
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  companyTin: string;

  taxRate: number;
  discount: number;
  shipping: number;

  paymentStatus: PaymentStatus;
  currency: string;
};

/* =================== Utils & persistence =================== */
const num = (v: any) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const money = (n: number, c: string) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: c }).format(num(n));

const safeRead = <T,>(k: string, f: T): T => {
  if (typeof window === 'undefined') return f;
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T) : f; } catch { return f; }
};
const safeWrite = (k: string, v: unknown) => {
  if (typeof window !== 'undefined') try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
};

/* =================== Defaults =================== */
const DEFAULT_PROFILE: CompanyProfile = {
  logoUrl: '',
  companyName: 'LEXVOR GROUP LTD',
  companyEmail: 'lexvorgrouplimited@gmail.com',
  companyPhone: '+1 914-508-3305',
  companyAddress: 'Ghana – USA',
  companyTin: 'C0066170982',
};

const newInvoiceFromProfile = (p: CompanyProfile, currency = 'GHS'): Invoice => ({
  invoiceNo: 'INV-0001',
  invoiceDate: new Date().toISOString().slice(0, 10),
  dueDate: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),

  clientName: '',
  clientPhone: '',
  clientEmail: '',
  clientAddress: '',

  items: [{ description: '', qty: 1, rate: 0 }],

  bankDetails: '',
  additionalDetails: '',
  terms: '',

  logoUrl: p.logoUrl,
  companyName: p.companyName,
  companyEmail: p.companyEmail,
  companyPhone: p.companyPhone,
  companyAddress: p.companyAddress,
  companyTin: p.companyTin,

  taxRate: 0,
  discount: 0,
  shipping: 0,

  paymentStatus: 'Unpaid',
  currency,
});

/* =================== Theme =================== */
const useTheme = () => {
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('__theme');
    if (saved) return saved === 'dark';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('__theme', dark ? 'dark' : 'light');
  }, [dark]);
  return { dark, setDark };
};

/* =================== Print / PDF component (responsive + aligned) =================== */
const PrintInvoice = React.forwardRef<HTMLDivElement, { invoice: Invoice }>(
  ({ invoice }, ref) => {
    const subTotal = invoice.items.reduce((s, it) => s + num(it.qty) * num(it.rate), 0);
    const vat = subTotal * (num(invoice.taxRate) / 100);
    const total = subTotal - num(invoice.discount) + vat + num(invoice.shipping);

    const gridGray = '#d0d0d0';
    const headerGray = '#d9d9d9';
    const borderThin = `0.6pt solid ${gridGray}`;

    return (
      <div ref={ref} className="print-area">
        <div className="print-inner mx-auto py-4">
          {/* HEADER */}
          <div className="grid md:grid-cols-12 grid-cols-12 gap-4 items-start">
            <div className="md:col-span-8 col-span-12">
              <div className="font-extrabold md:text-[18pt] text-[16pt] leading-tight">
                {invoice.companyName || 'LEXVOR GROUP LTD'}
              </div>
              {invoice.companyTin && <div className="text-[9pt]">TIN: {invoice.companyTin}</div>}
              {invoice.companyAddress && (
                <div className="text-[9pt] mt-[2px] whitespace-pre-wrap">{invoice.companyAddress}</div>
              )}
              {invoice.companyPhone && <div className="text-[9pt] mt-[2px]">Phone: {invoice.companyPhone}</div>}
              {invoice.companyEmail && <div className="text-[9pt] mt-[2px]">Email: {invoice.companyEmail}</div>}
            </div>

            <div className="md:col-span-4 col-span-12 md:text-right text-center">
              <div className="text-[14pt] font-extrabold tracking-wide">INVOICE</div>
              <div className="mt-3 inline-flex items-center justify-center w-full">
                {invoice.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={invoice.logoUrl}
                    alt="Logo"
                    className="md:h-[24mm] h-[18mm] md:max-w-[90mm] max-w-[70mm] object-contain mx-auto"
                  />
                ) : (
                  <div className="text-[8pt] text-neutral-400 md:h-[24mm] h-[18mm] md:w-[90mm] w-[70mm] border border-neutral-200 rounded flex items-center justify-center">
                    LOGO
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* BILL TO + META */}
          <div className="grid md:grid-cols-12 grid-cols-12 gap-4 mt-4 items-start">
            {/* Bill To */}
            <div className="md:col-span-6 col-span-12 flex flex-col">
              <div className="uppercase text-[9pt] font-semibold text-neutral-600 mb-1">Bill To</div>
              <div className="rounded flex-1 p-2" style={{ border: borderThin }}>
                {(invoice.clientName ||
                  invoice.clientAddress ||
                  invoice.clientEmail ||
                  invoice.clientPhone) ? (
                  <>
                    {invoice.clientName && <div className="text-[9pt] font-semibold">{invoice.clientName}</div>}
                    {invoice.clientAddress && (
                      <div className="text-[9pt] whitespace-pre-wrap mt-[1px]">{invoice.clientAddress}</div>
                    )}
                    {invoice.clientEmail && <div className="text-[9pt] underline mt-[1px]">{invoice.clientEmail}</div>}
                    {invoice.clientPhone && <div className="text-[9pt] mt-[1px]">{invoice.clientPhone}</div>}
                  </>
                ) : (
                  <div className="text-[9pt] text-neutral-400">—</div>
                )}
              </div>
            </div>

            {/* Meta tiles (auto height, aligned) */}
            <div className="md:col-span-6 col-span-12 md:self-start md:mt-[22px]">
              <div className="grid grid-rows-3 max-w-full">
                {[
                  ['Invoice No', invoice.invoiceNo || '-'],
                  ['Invoice Date', invoice.invoiceDate || '-'],
                  ['Due Date', invoice.dueDate || '-'],
                ].map(([label, val], i) => (
                  <div key={i} className="grid grid-cols-12">
                    <div
                      className="col-span-4 text-[9pt] font-semibold px-2 py-[5px] flex items-center"
                      style={{
                        background: headerGray,
                        color: '#1a1a1a',
                        border: borderThin,
                        borderTopLeftRadius: i === 0 ? 4 : 0,
                        borderBottomLeftRadius: i === 2 ? 4 : 0,
                      }}
                    >
                      {label}
                    </div>
                    <div
                      className="col-span-8 text-[9pt] px-2 py-[5px] flex items-center"
                      style={{
                        background: '#fff',
                        border: borderThin,
                        borderTopRightRadius: i === 0 ? 4 : 0,
                        borderBottomRightRadius: i === 2 ? 4 : 0,
                      }}
                    >
                      {val}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ITEMS TABLE */}
          <div className="mt-4 rounded" style={{ border: borderThin }}>
            <table className="w-full text-[9pt]" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: headerGray }}>
                  {['Description', 'Qty', 'Price', 'Total'].map((h, i) => (
                    <th key={i} className="text-left font-semibold" style={{ padding: '6px', borderBottom: borderThin }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((it, i) => (
                  <tr key={i}>
                    <td style={{ padding: '6px', borderBottom: `0.6pt dotted ${gridGray}` }}>{it.description}</td>
                    <td style={{ padding: '6px', textAlign: 'right', borderBottom: `0.6pt dotted ${gridGray}` }}>
                      {num(it.qty)}
                    </td>
                    <td style={{ padding: '6px', textAlign: 'right', borderBottom: `0.6pt dotted ${gridGray}` }}>
                      {money(num(it.rate), invoice.currency)}
                    </td>
                    <td style={{ padding: '6px', textAlign: 'right', borderBottom: `0.6pt dotted ${gridGray}` }}>
                      {money(num(it.qty) * num(it.rate), invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* BANK + TOTAL */}
          <div className="grid md:grid-cols-12 grid-cols-12 gap-4 mt-4">
            {invoice.bankDetails && (
              <div className="md:col-span-7 col-span-12">
                <div className="rounded h-full" style={{ border: borderThin }}>
                  <div className="px-3 py-2 text-[9pt] font-semibold uppercase" style={{ borderBottom: borderThin }}>
                    Bank Details
                  </div>
                  <div className="px-3 py-3 text-[9pt] whitespace-pre-wrap">{invoice.bankDetails}</div>
                </div>
              </div>
            )}

            <div className={invoice.bankDetails ? 'md:col-span-5 col-span-12' : 'col-span-12'}>
              <div className="rounded" style={{ border: borderThin }}>
                <table className="w-full text-[9pt]" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: headerGray }}>
                      <th className="text-left font-semibold p-[6px]">Summary</th>
                      <th className="text-right font-semibold p-[6px]">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Subtotal', subTotal],
                      ['Discount', num(invoice.discount)],
                      [`VAT (${num(invoice.taxRate)}%)`, vat],
                      ['Shipping', num(invoice.shipping)],
                    ].map(([label, val], i) => (
                      <tr key={i}>
                        <td style={{ padding: '6px', borderBottom: borderThin }}>{label}</td>
                        <td style={{ padding: '6px', textAlign: 'right', borderBottom: borderThin }}>
                          {money(num(val as number), invoice.currency)}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td className="font-bold" style={{ padding: '6px', borderTop: `1pt solid ${gridGray}` }}>
                        Total
                      </td>
                      <td className="font-bold text-right" style={{ padding: '6px', borderTop: `1pt solid ${gridGray}` }}>
                        {money(total, invoice.currency)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* TERMS */}
          <div className="mt-4 rounded text-center" style={{ border: borderThin }}>
            <div className="px-3 py-2 text-[9pt] font-semibold" style={{ borderBottom: borderThin }}>
              Terms &amp; Conditions
            </div>
            <div className="px-3 py-3 text-[9pt] whitespace-pre-wrap">{invoice.terms || '—'}</div>
          </div>

          <div className="mt-6 text-center text-[10pt] font-bold">
            Thank you for doing business with Lexvor Group Limited.
          </div>
        </div>

        {/* Screen & Print CSS */}
        <style jsx global>{`
          .print-inner { width: 178mm; }
          @media (max-width: 768px) {
            .print-inner { width: 100%; padding-left: 10px; padding-right: 10px; }
          }
          @page { size: A4; margin: 16mm; }
          @media print { html, body { background: #fff !important; } .print-inner { width: auto; } }
        `}</style>
      </div>
    );
  }
);
PrintInvoice.displayName = 'PrintInvoice';

/* =================== Main App (FULL interface restored) =================== */
export default function App() {
  const { dark, setDark } = useTheme();

  // Currency
  const [currency, setCurrency] = useState<string>(() => {
    if (typeof window === 'undefined') return 'GHS';
    return localStorage.getItem('__currency') || 'GHS';
  });
  useEffect(() => { localStorage.setItem('__currency', currency); }, [currency]);

  // Profile
  const [profile, setProfile] = useState<CompanyProfile>(() =>
    safeRead<CompanyProfile>('__company_profile', DEFAULT_PROFILE)
  );
  useEffect(() => { safeWrite('__company_profile', profile); }, [profile]);

  // Draft invoice
  const [invoice, setInvoice] = useState<Invoice>(() =>
    safeRead<Invoice>('__invoice_draft', newInvoiceFromProfile(DEFAULT_PROFILE, currency))
  );
  useEffect(() => {
    // Sync profile & currency into draft
    setInvoice((inv) => ({
      ...inv,
      currency,
      logoUrl: profile.logoUrl || inv.logoUrl,
      companyName: profile.companyName || inv.companyName,
      companyEmail: profile.companyEmail || inv.companyEmail,
      companyPhone: profile.companyPhone || inv.companyPhone,
      companyAddress: profile.companyAddress || inv.companyAddress,
      companyTin: profile.companyTin || inv.companyTin,
    }));
  }, [
    profile.logoUrl,
    profile.companyName,
    profile.companyEmail,
    profile.companyPhone,
    profile.companyAddress,
    profile.companyTin,
    currency,
  ]);
  useEffect(() => { safeWrite('__invoice_draft', invoice); }, [invoice]);

  // Local DB
  const [db, setDb] = useState<Invoice[]>(() => safeRead<Invoice[]>('__invoices_db', []));
  useEffect(() => { safeWrite('__invoices_db', db); }, [db]);

  // Tabs
  const [tab, setTab] = useState<'create' | 'invoices'>('create');

  // Print: current draft (Create tab)
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrintDraft = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Invoice_${invoice.invoiceNo}`,
  });

  // Print: selected row (Invoices tab)
  const rowPrintRef = useRef<HTMLDivElement>(null);
  const [printRow, setPrintRow] = useState<Invoice | null>(null);
  const handlePrintRow = useReactToPrint({
    contentRef: rowPrintRef,
    documentTitle: `Invoice_${printRow?.invoiceNo || 'Invoice'}`,
  });

  // Totals
  const subTotal = useMemo(
    () => invoice.items.reduce((s, it) => s + num(it.qty) * num(it.rate), 0),
    [invoice.items]
  );
  const vat = useMemo(() => subTotal * (num(invoice.taxRate) / 100), [subTotal, invoice.taxRate]);
  const total = useMemo(
    () => subTotal - num(invoice.discount) + vat + num(invoice.shipping),
    [subTotal, vat, invoice.discount, invoice.shipping]
  );

  // Handlers
  const onLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setProfile((p) => ({ ...p, logoUrl: String(reader.result || '') }));
    reader.readAsDataURL(file);
  };
  const addItem = () =>
    setInvoice((s) => ({ ...s, items: [...s.items, { description: '', qty: 1, rate: 0 }] }));
  const updateItem = (i: number, patch: Partial<Item>) =>
    setInvoice((s) => {
      const items = s.items.slice();
      items[i] = { ...items[i], ...patch };
      return { ...s, items };
    });
  const removeItem = (i: number) =>
    setInvoice((s) => ({ ...s, items: s.items.filter((_, k) => k !== i) }));

  const saveToLocal = () => {
    setDb((rows) => {
      const others = rows.filter((r) => r.invoiceNo !== invoice.invoiceNo);
      return [{ ...invoice }, ...others];
    });
    setTab('invoices');
  };

  const deleteFromDB = (invoiceNo: string) =>
    setDb((rows) => rows.filter((r) => r.invoiceNo !== invoiceNo));

  const viewToDraft = (invoiceNo: string) => {
    const src = db.find((r) => r.invoiceNo === invoiceNo);
    if (!src) return;
    setInvoice({ ...src });
    setTab('create');
    window?.scrollTo?.({ top: 0, behavior: 'smooth' });
  };

  const exportRowToPDF = (invoiceNo: string) => {
    const src = db.find((r) => r.invoiceNo === invoiceNo);
    if (!src) return;
    setPrintRow({ ...src });
    setTimeout(() => handlePrintRow(), 50);
  };

  // Search
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return db;
    return db.filter((r) =>
      r.invoiceNo.toLowerCase().includes(q) ||
      r.clientName.toLowerCase().includes(q) ||
      r.paymentStatus.toLowerCase().includes(q) ||
      r.invoiceDate.toLowerCase().includes(q) ||
      r.dueDate.toLowerCase().includes(q)
    );
  }, [db, search]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-950 text-neutral-50">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-neutral-900/70 backdrop-blur border-b border-neutral-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap gap-3 items-center justify-between">
          <div className="text-lg font-semibold">Invoice System</div>
          <div className="flex items-center gap-2">
            <select
              className="input w-[110px]"
              value={invoice.currency}
              onChange={(e) => setInvoice((prev) => ({ ...prev, currency: e.target.value }))}
              title="Currency"
            >
              {['GHS', 'USD', 'EUR', 'GBP', 'NGN', 'ZAR', 'CAD', 'AUD'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button className="btn btn-ghost-strong" onClick={() => setDark(!dark)} title="Toggle theme">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto p-4">
        <div className="mb-4 inline-flex rounded-xl border border-neutral-700 overflow-hidden">
          <button
            onClick={() => setTab('create')}
            className={`tab-btn ${tab === 'create' ? 'tab-btn-active' : ''}`}
          >
            Create Invoice
          </button>
          <button
            onClick={() => setTab('invoices')}
            className={`tab-btn border-l border-neutral-700 ${tab === 'invoices' ? 'tab-btn-active' : ''}`}
          >
            Invoices
          </button>
        </div>

        {tab === 'create' && (
          <>
            {/* Actions */}
            <div className="flex flex-wrap gap-2 mb-4">
              <button className="btn btn-primary" onClick={handlePrintDraft}>
                <Printer className="h-4 w-4 mr-2" /> Export to PDF
              </button>
              <button className="btn" onClick={saveToLocal}>
                <Save className="h-4 w-4 mr-2" /> Save to DB
              </button>
              <button className="btn" onClick={() => setInvoice(newInvoiceFromProfile(profile, invoice.currency))}>
                <RefreshCcw className="h-4 w-4 mr-2" /> New from Profile
              </button>
              <label className="btn cursor-pointer">
                <Upload className="h-4 w-4 mr-2" /> Upload Logo
                <input type="file" accept="image/*" className="hidden" onChange={onLogoUpload} />
              </label>
            </div>

            {/* Company Profile */}
            <section className="card mb-6">
              <div className="card-h"><div className="card-t">Company Profile (persists)</div></div>
              <div className="card-c grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="label">Company Name</label>
                  <input className="input" value={profile.companyName} onChange={(e) => setProfile({ ...profile, companyName: e.target.value })} />
                  <label className="label">Company Email</label>
                  <input className="input" value={profile.companyEmail} onChange={(e) => setProfile({ ...profile, companyEmail: e.target.value })} />
                  <label className="label">Company Phone</label>
                  <input className="input" value={profile.companyPhone} onChange={(e) => setProfile({ ...profile, companyPhone: e.target.value })} />
                </div>
                <div className="space-y-3">
                  <label className="label">Company Address</label>
                  <textarea className="textarea" rows={4} value={profile.companyAddress} onChange={(e) => setProfile({ ...profile, companyAddress: e.target.value })} />
                  <label className="label">Company TIN</label>
                  <input className="input" value={profile.companyTin} onChange={(e) => setProfile({ ...profile, companyTin: e.target.value })} />
                  <div className="flex items-center gap-3">
                    <label className="btn" title="Upload company logo">
                      <Upload className="h-4 w-4 mr-2" /> Upload Logo
                      <input type="file" accept="image/*" className="hidden" onChange={onLogoUpload} />
                    </label>
                    {profile.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={profile.logoUrl} alt="Logo" className="h-10 w-10 object-contain rounded bg-white/70 border" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-neutral-200/40 border border-neutral-700" />
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Invoice settings */}
            <section className="card mb-6">
              <div className="card-h"><div className="card-t">Invoice Settings</div></div>
              <div className="card-c grid md:grid-cols-4 gap-3">
                <div>
                  <label className="label">Invoice No</label>
                  <input className="input" value={invoice.invoiceNo} onChange={(e) => setInvoice({ ...invoice, invoiceNo: e.target.value })} />
                </div>
                <div>
                  <label className="label">Invoice Date</label>
                  <input className="input" type="date" value={invoice.invoiceDate} onChange={(e) => setInvoice({ ...invoice, invoiceDate: e.target.value })} />
                </div>
                <div>
                  <label className="label">Due Date</label>
                  <input className="input" type="date" value={invoice.dueDate} onChange={(e) => setInvoice({ ...invoice, dueDate: e.target.value })} />
                </div>
                <div>
                  <label className="label">Payment Status</label>
                  <select className="input" value={invoice.paymentStatus} onChange={(e) => setInvoice({ ...invoice, paymentStatus: e.target.value as PaymentStatus })}>
                    <option>Unpaid</option>
                    <option>Partially Paid</option>
                    <option>Paid</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Client */}
            <section className="card mb-6">
              <div className="card-h"><div className="card-t">Bill To</div></div>
              <div className="card-c grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="label">Client Name</label>
                  <input className="input" value={invoice.clientName} onChange={(e) => setInvoice({ ...invoice, clientName: e.target.value })} />
                  <label className="label">Client Email</label>
                  <input className="input" value={invoice.clientEmail} onChange={(e) => setInvoice({ ...invoice, clientEmail: e.target.value })} />
                </div>
                <div className="space-y-3">
                  <label className="label">Client Phone</label>
                  <input className="input" value={invoice.clientPhone} onChange={(e) => setInvoice({ ...invoice, clientPhone: e.target.value })} />
                  <label className="label">Client Address</label>
                  <textarea className="textarea" rows={4} value={invoice.clientAddress} onChange={(e) => setInvoice({ ...invoice, clientAddress: e.target.value })} />
                </div>
              </div>
            </section>

            {/* Items */}
            <section className="card mb-6">
              <div className="card-h"><div className="card-t">Items</div></div>
              <div className="card-c">
                <div className="overflow-hidden rounded-lg border border-neutral-700">
                  <table className="w-full text-sm">
                    <thead className="bg-neutral-800/60 text-left">
                      <tr>
                        <th className="px-3 py-2">Description</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-right">Rate</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                        <th className="px-3 py-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items.map((it, i) => (
                        <tr key={i} className="border-t border-neutral-800">
                          <td className="px-3 py-2">
                            <input className="input" placeholder="Item / service"
                              value={it.description} onChange={(e) => updateItem(i, { description: e.target.value })} />
                          </td>
                          <td className="px-3 py-2">
                            <input className="input text-right" type="number" min={0}
                              value={it.qty} onChange={(e) => updateItem(i, { qty: num(e.target.value) })} />
                          </td>
                          <td className="px-3 py-2">
                            <input className="input text-right" type="number" step="0.01"
                              value={it.rate} onChange={(e) => updateItem(i, { rate: num(e.target.value) })} />
                          </td>
                          <td className="px-3 py-2 text-right align-middle">
                            {money(num(it.qty) * num(it.rate), invoice.currency)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button className="btn-sm btn-ghost-strong" onClick={() => removeItem(i)}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between mt-3 gap-4 flex-wrap">
                  <button className="btn" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-2" /> Add Item
                  </button>
                  <div className="w-full md:w-80 space-y-2">
                    <div className="flex justify-between text-sm py-1">
                      <div>Subtotal</div><div>{money(subTotal, invoice.currency)}</div>
                    </div>

                    <div className="flex items-center justify-between text-sm py-1 gap-2">
                      <div className="flex items-center gap-2">
                        <span className="label !mb-0">VAT %</span>
                        <input className="input w-24" type="number" step="0.01" value={invoice.taxRate}
                          onChange={(e) => setInvoice({ ...invoice, taxRate: num(e.target.value) })} />
                      </div>
                      <div>{money(vat, invoice.currency)}</div>
                    </div>

                    <div className="flex items-center justify-between text-sm py-1 gap-2">
                      <div className="flex items-center gap-2">
                        <span className="label !mb-0">Discount</span>
                        <input className="input w-28" type="number" step="0.01" value={invoice.discount}
                          onChange={(e) => setInvoice({ ...invoice, discount: num(e.target.value) })} />
                      </div>
                      <div>{money(num(invoice.discount), invoice.currency)}</div>
                    </div>

                    <div className="flex items-center justify-between text-sm py-1 gap-2">
                      <div className="flex items-center gap-2">
                        <span className="label !mb-0">Shipping</span>
                        <input className="input w-28" type="number" step="0.01" value={invoice.shipping}
                          onChange={(e) => setInvoice({ ...invoice, shipping: num(e.target.value) })} />
                      </div>
                      <div>{money(num(invoice.shipping), invoice.currency)}</div>
                    </div>

                    <div className="border-t border-neutral-800 mt-2 pt-2 flex justify-between font-semibold">
                      <div>Total</div><div>{money(total, invoice.currency)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Notes / terms */}
            <section className="card">
              <div className="card-h"><div className="card-t">Bank Details, Additional Info & Terms</div></div>
              <div className="card-c grid md:grid-cols-3 gap-4">
                <div>
                  <label className="label">Bank Details</label>
                  <textarea className="textarea" rows={5} value={invoice.bankDetails}
                    onChange={(e) => setInvoice({ ...invoice, bankDetails: e.target.value })} />
                </div>
                <div>
                  <label className="label">Additional Details</label>
                  <textarea className="textarea" rows={5} value={invoice.additionalDetails}
                    onChange={(e) => setInvoice({ ...invoice, additionalDetails: e.target.value })} />
                </div>
                <div>
                  <label className="label">Terms & Conditions</label>
                  <textarea className="textarea" rows={5} value={invoice.terms}
                    onChange={(e) => setInvoice({ ...invoice, terms: e.target.value })} />
                </div>
              </div>
            </section>

            {/* Hidden print ref for draft */}
            <div className="hidden">
              <div ref={printRef}><PrintInvoice invoice={invoice} /></div>
            </div>

            {/* On-screen PDF preview */}
            <section className="card mt-6">
              <div className="card-h"><div className="card-t">Preview (A4, print-ready)</div></div>
              <div className="card-c">
                <div className="bg-white mx-auto shadow-sm" style={{ width: '210mm' }}>
                  <div className="mx-auto" style={{ width: '190mm' }}>
                    <PrintInvoice invoice={invoice} />
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {tab === 'invoices' && (
          <section className="card">
            <div className="card-h flex items-center justify-between">
              <div className="card-t">Invoices</div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    className="input pl-8 w-64"
                    placeholder="Search by #, client, status, date…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <select
                  className="input w-56"
                  onChange={(e) => e.target.value && viewToDraft(e.target.value)}
                  defaultValue=""
                  title="Quick select invoice"
                >
                  <option value="" disabled>Quick select…</option>
                  {filtered.slice(0, 20).map((r) => (
                    <option key={r.invoiceNo} value={r.invoiceNo}>
                      {r.invoiceNo} — {r.clientName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="card-c">
              <div className="overflow-hidden rounded-xl border border-neutral-700">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-800/60 text-left">
                    <tr>
                      <th className="px-3 py-2">Invoice No</th>
                      <th className="px-3 py-2">Invoice Date</th>
                      <th className="px-3 py-2">Due Date</th>
                      <th className="px-3 py-2">Client</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Total</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => {
                      const sub = r.items.reduce((s, i) => s + num(i.qty) * num(i.rate), 0);
                      const v = sub * (num(r.taxRate) / 100);
                      const t = sub - num(r.discount) + v + num(r.shipping);
                      return (
                        <tr key={r.invoiceNo} className="border-t border-neutral-800">
                          <td className="px-3 py-2 font-mono">{r.invoiceNo}</td>
                          <td className="px-3 py-2">{r.invoiceDate}</td>
                          <td className="px-3 py-2">{r.dueDate}</td>
                          <td className="px-3 py-2">{r.clientName}</td>
                          <td className="px-3 py-2">{r.paymentStatus}</td>
                          <td className="px-3 py-2">{money(t, r.currency || invoice.currency)}</td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex justify-end gap-2">
                              <button className="btn-sm btn-ghost-strong" title="View/Edit" onClick={() => viewToDraft(r.invoiceNo)}><Eye className="h-4 w-4" /></button>
                              <button className="btn-sm btn-primary" title="Export PDF" onClick={() => exportRowToPDF(r.invoiceNo)}><Printer className="h-4 w-4" /></button>
                              <button className="btn-sm btn-danger" title="Delete" onClick={() => deleteFromDB(r.invoiceNo)}><Trash className="h-4 w-4" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr><td colSpan={7} className="px-3 py-10 text-center text-neutral-400">No matches.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Hidden print area for selected row */}
            <div className="hidden">
              <div ref={rowPrintRef}>{printRow && <PrintInvoice invoice={printRow} />}</div>
            </div>
          </section>
        )}
      </div>

      {/* Utility styles for buttons/inputs/cards */}
      <style jsx global>{`
        .btn { @apply inline-flex items-center gap-2 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-50 px-3 py-2; }
        .btn-primary { @apply bg-blue-600 hover:bg-blue-700 text-white; }
        .btn-ghost-strong { @apply bg-neutral-800/60 hover:bg-neutral-700/70 text-neutral-100 rounded-md px-2 py-1; }
        .btn-danger { @apply bg-red-600 hover:bg-red-700 text-white; }
        .btn-sm { @apply px-2 py-1 rounded; }
        .input { @apply bg-neutral-800/60 border border-neutral-700 rounded-md px-3 py-2 text-neutral-100 w-full outline-none; }
        .textarea { @apply bg-neutral-800/60 border border-neutral-700 rounded-md px-3 py-2 text-neutral-100 w-full outline-none; }
        .label { @apply block mb-1 text-sm text-neutral-300; }
        .card { @apply rounded-2xl border border-neutral-800 bg-neutral-900/50 backdrop-blur; }
        .card-h { @apply px-4 py-3 border-b border-neutral-800; }
        .card-c { @apply p-4; }
        .card-t { @apply text-sm font-semibold text-neutral-200; }
        .tab-btn { @apply px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800; }
        .tab-btn-active { @apply bg-neutral-800 text-neutral-50; }
      `}</style>
    </main>
  );
}

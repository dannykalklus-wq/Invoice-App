// app/page.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

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
  clientNumber?: string;

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

/* ============ Safe localStorage helpers ============ */
const safeRead = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const safeWrite = (key: string, value: unknown) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

/* =================== Defaults =================== */
const DEFAULT_PROFILE: CompanyProfile = {
  logoUrl: '',
  companyName: 'Lexvor Group Ltd',
  companyEmail: 'lexvorgroupimited@gmail.com',
  companyPhone: '+1 914-508-3305',
  companyAddress: 'Ghana – USA',
  companyTin: 'CO066170982',
};

const newInvoiceFromProfile = (p: CompanyProfile, currency = 'GHS'): Invoice => ({
  invoiceNo: 'INV-0001',
  invoiceDate: new Date().toISOString().slice(0, 10),
  dueDate: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),

  clientName: '',
  clientPhone: '',
  clientEmail: '',
  clientAddress: '',
  clientNumber: '',

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

/* =================== Helpers =================== */
const formatMoney = (n: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(n || 0));

/* =================== Main App =================== */
export default function AppPage() {
  // Theme (simple toggle)
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return true;
    const s = localStorage.getItem('__theme');
    if (s) return s === 'dark';
    return true;
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('__theme', dark ? 'dark' : 'light');
  }, [dark]);

  // Currency
  const [currency, setCurrency] = useState<string>(() => (typeof window === 'undefined' ? 'GHS' : localStorage.getItem('__currency') || 'GHS'));
  useEffect(() => localStorage.setItem('__currency', currency), [currency]);

  // Profile
  const [profile, setProfile] = useState<CompanyProfile>(() => safeRead('__company_profile', DEFAULT_PROFILE));
  useEffect(() => safeWrite('__company_profile', profile), [profile]);

  // Draft invoice
  const [invoice, setInvoice] = useState<Invoice>(() => safeRead('__invoice_draft', newInvoiceFromProfile(DEFAULT_PROFILE, currency)));
  useEffect(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.logoUrl, profile.companyName, profile.companyEmail, profile.companyPhone, profile.companyAddress, profile.companyTin, currency]);

  useEffect(() => safeWrite('__invoice_draft', invoice), [invoice]);

  // Local DB
  const [db, setDb] = useState<Invoice[]>(() => safeRead('__invoices_db', []));
  useEffect(() => safeWrite('__invoices_db', db), [db]);

  // Tabs
  const [tab, setTab] = useState<'create' | 'invoices'>('create');

  // Print ref
  const printRef = useRef<HTMLDivElement | null>(null);

  // Calculations
  const subTotal = useMemo(() => invoice.items.reduce((s, it) => s + Number(it.qty || 0) * Number(it.rate || 0), 0), [invoice.items]);
  const vat = useMemo(() => subTotal * (Number(invoice.taxRate || 0) / 100), [subTotal, invoice.taxRate]);
  const total = useMemo(() => subTotal - Number(invoice.discount || 0) + vat + Number(invoice.shipping || 0), [subTotal, vat, invoice.discount, invoice.shipping]);

  /* =================== Handlers =================== */
  const onLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setProfile((p) => ({ ...p, logoUrl: String(reader.result || '') }));
    reader.readAsDataURL(file);
  };

  const addItem = () => setInvoice((s) => ({ ...s, items: [...s.items, { description: '', qty: 1, rate: 0 }] }));
  const updateItem = (i: number, patch: Partial<Item>) => setInvoice((s) => {
    const items = s.items.slice();
    items[i] = { ...items[i], ...patch };
    return { ...s, items };
  });
  const removeItem = (i: number) => setInvoice((s) => ({ ...s, items: s.items.filter((_, k) => k !== i) }));

  const saveToDB = () => {
    setDb((rows) => {
      const others = rows.filter((r) => r.invoiceNo !== invoice.invoiceNo);
      return [{ ...invoice }, ...others];
    });
    setTab('invoices');
  };
  const deleteFromDB = (invoiceNo: string) => setDb((rows) => rows.filter((r) => r.invoiceNo !== invoiceNo));
  const viewToDraft = (invoiceNo: string) => {
    const src = db.find((r) => r.invoiceNo === invoiceNo);
    if (!src) return;
    setInvoice({ ...src });
    setTab('create');
    window?.scrollTo?.({ top: 0, behavior: 'smooth' });
  };

  // Export to PDF / print — simple approach: open new window and print content
  const handlePrintDraft = () => {
    if (!printRef.current) return;
    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Invoice - ${invoice.invoiceNo}</title>
          <style>
            /* Minimal reset for the printable document */
            body { margin:0; padding:0; font-family: Arial, Helvetica, sans-serif; color: #111; }
            ${(document.querySelector('style')?.textContent || '')}
            /* In case tailwind isn't available in the print window, we include critical styles used by the invoice */
            .invoice-print-wrapper { width:210mm; padding:16mm; box-sizing:border-box; }
            .invoice-head{display:flex;justify-content:space-between;align-items:flex-start}
            .invoice-title{font-weight:700;font-size:28px}
            .invoice-logo{width:160px;height:auto;object-fit:contain}
            .invoice-meta-row{display:grid;grid-template-columns:1fr 360px;gap:18px;margin-top:18px}
            .bill-box,.meta-box{border:1px solid #ccc;padding:12px;border-radius:4px;min-height:110px;background:#fff}
            .meta-tile{display:grid;grid-template-columns:120px 1fr}
            .meta-tile .label{background:#99b3d9;color:#fff;padding:8px 10px;font-weight:600;border-right:1px solid #cddae9}
            .meta-tile .value{padding:8px 10px;border:1px solid #e6eef8}
            .items-table{width:100%;border-collapse:collapse;margin-top:18px;table-layout:fixed}
            .items-table thead th{background:#99b3d9;color:#fff;padding:8px 12px;text-align:left;font-weight:700}
            .items-table tbody td{padding:10px 12px;border-bottom:1px dotted #888;vertical-align:middle}
            .items-table .amount,.items-table .rate{text-align:right;white-space:nowrap}
            .bottom-row{display:grid;grid-template-columns:1fr 320px;gap:20px;margin-top:18px}
            .bank-box,.summary-box{border:1px solid #ddd;padding:12px;border-radius:6px;background:#fff}
            .summary-row{display:flex;justify-content:space-between;padding:6px 8px}
            .summary-row.total{font-weight:700;border-top:1px solid #ddd;margin-top:6px}
            .terms-box{margin-top:20px;border:1px dashed #ddd;padding:12px;border-radius:6px;text-align:center;background:#fff}
            .thanks{margin-top:18px;text-align:center;font-weight:800;font-size:14pt}
          </style>
        </head>
        <body>
          <div class="invoice-print-wrapper">${printRef.current.innerHTML}</div>
        </body>
      </html>
    `;
    const w = window.open('', '_blank', 'width=900,height=1100');
    if (!w) {
      alert('Pop-up blocked. Please allow pop-ups for this site to print/export PDF.');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    // give the browser a little time to render
    setTimeout(() => {
      w.focus();
      w.print();
    }, 350);
  };

  // Export a stored invoice to print (from list)
  const exportRowToPDF = (invoiceNo: string) => {
    const src = db.find((r) => r.invoiceNo === invoiceNo);
    if (!src) return;
    // render as hidden element then open print window
    const container = document.createElement('div');
    container.style.display = 'block';
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    document.body.appendChild(container);
    // render minimal HTML structure (reuse same markup as PrintInvoice below)
    container.innerHTML = renderPrintable(src);
    const w = window.open('', '_blank', 'width=900,height=1100');
    if (!w) { alert('Allow pop-ups to export PDF'); document.body.removeChild(container); return; }
    w.document.open();
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${src.invoiceNo}</title><style>
      /* include critical styles */
      ${(document.querySelector('style')?.textContent || '')}
    </style></head><body><div class="invoice-print-wrapper">${container.innerHTML}</div></body></html>`);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); document.body.removeChild(container); }, 350);
  };

  // helper to render printable HTML for an invoice object (used in exportRow)
  const renderPrintable = (inv: Invoice) => {
    const sub = inv.items.reduce((s, it) => s + Number(it.qty || 0) * Number(it.rate || 0), 0);
    const v = sub * (Number(inv.taxRate || 0) / 100);
    const t = sub - Number(inv.discount || 0) + v + Number(inv.shipping || 0);

    return `
      <div>
        <div class="invoice-head">
          <div class="invoice-company">
            <div style="font-weight:700;font-size:22px">${inv.companyName}</div>
            <div style="margin-top:6px;font-size:12px">${inv.companyTin ? `TIN: ${inv.companyTin}<br/>` : ''}${inv.companyAddress}<br/>Phone: ${inv.companyPhone}<br/>Email: ${inv.companyEmail}</div>
          </div>
          <div style="text-align:right">
            <div class="invoice-title">INVOICE</div>
            <div style="margin-top:12px"><img src="${inv.logoUrl || ''}" alt="logo" class="invoice-logo" /></div>
          </div>
        </div>

        <div class="invoice-meta-row">
          <div class="bill-box">
            <div style="font-weight:700;font-size:12px;margin-bottom:6px">BILL TO</div>
            <div style="font-weight:600">${inv.clientName}</div>
            <div style="font-size:12px;margin-top:6px">${inv.clientAddress.replace(/\n/g,'<br/>')}</div>
            <div style="margin-top:8px;font-size:12px">${inv.clientEmail}<br/>${inv.clientPhone}</div>
          </div>

          <div>
            <div class="meta-box">
              <div class="meta-tile">
                <div class="label">Invoice No</div><div class="value">${inv.invoiceNo}</div>
              </div>
              <div style="height:6px"></div>
              <div class="meta-tile">
                <div class="label">Invoice Date</div><div class="value">${inv.invoiceDate}</div>
              </div>
              <div style="height:6px"></div>
              <div class="meta-tile">
                <div class="label">Due Date</div><div class="value">${inv.dueDate}</div>
              </div>
            </div>
          </div>
        </div>

        <table class="items-table" role="table" aria-label="Items">
          <thead>
            <tr>
              <th style="width:60%;">Description</th>
              <th style="width:10%;">Qty</th>
              <th style="width:15%;text-align:right">Price</th>
              <th style="width:15%;text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${inv.items.map(it => `<tr>
               <td>${it.description || '&nbsp;'}</td>
               <td style="text-align:right">${it.qty}</td>
               <td class="rate">${formatMoney(Number(it.rate || 0), inv.currency)}</td>
               <td class="amount">${formatMoney(Number(it.qty || 0) * Number(it.rate || 0), inv.currency)}</td>
             </tr>`).join('')}
          </tbody>
        </table>

        <div class="bottom-row">
          <div class="bank-box">
            <div style="font-weight:700;margin-bottom:6px">BANK DETAILS</div>
            <div style="font-size:12px;white-space:pre-wrap">${inv.bankDetails || ''}</div>
          </div>

          <div class="summary-box">
            <div style="font-weight:700;margin-bottom:6px">Summary</div>
            <div class="summary-row"><div>Subtotal</div><div>${formatMoney(sub, inv.currency)}</div></div>
            <div class="summary-row"><div>Discount</div><div>${formatMoney(Number(inv.discount || 0), inv.currency)}</div></div>
            <div class="summary-row"><div>VAT (${inv.taxRate || 0}%)</div><div>${formatMoney(v, inv.currency)}</div></div>
            <div class="summary-row"><div>Shipping</div><div>${formatMoney(Number(inv.shipping || 0), inv.currency)}</div></div>
            <div class="summary-row total"><div>Total</div><div>${formatMoney(t, inv.currency)}</div></div>
          </div>
        </div>

        <div class="terms-box">${inv.terms || ''}</div>
        <div class="thanks">Thank you for doing business with Lexvor Group Limited</div>
      </div>
    `;
  };

  /* =================== Invoices list search =================== */
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return db;
    return db.filter((r) =>
      r.invoiceNo.toLowerCase().includes(q) ||
      r.clientName.toLowerCase().includes(q) ||
      r.paymentStatus.toLowerCase().includes(q)
    );
  }, [db, search]);

  /* ============== Small helper: inline PrintInvoice component ============== */
  const PrintInvoice = ({ invoice }: { invoice: Invoice }) => {
    const sub = invoice.items.reduce((s, it) => s + Number(it.qty || 0) * Number(it.rate || 0), 0);
    const v = sub * (Number(invoice.taxRate || 0) / 100);
    const t = sub - Number(invoice.discount || 0) + v + Number(invoice.shipping || 0);
    return (
      <div>
        <div className="invoice-head">
          <div className="invoice-company">
            <div style={{ fontWeight: 700, fontSize: 22 }}>{invoice.companyName}</div>
            <div style={{ marginTop: 6, fontSize: 12 }}>
              {invoice.companyTin ? <>TIN: {invoice.companyTin}<br /></> : null}
              {invoice.companyAddress}<br />
              Phone: {invoice.companyPhone}<br />
              Email: {invoice.companyEmail}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div className="invoice-title">INVOICE</div>
            <div style={{ marginTop: 12 }}>
              {invoice.logoUrl ? <img src={invoice.logoUrl} alt="logo" className="invoice-logo" /> : <div style={{ width: 160, height: 60, background: '#eee' }} />}
            </div>
          </div>
        </div>

        <div className="invoice-meta-row">
          <div className="bill-box">
            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6 }}>BILL TO</div>
            <div style={{ fontWeight: 600 }}>{invoice.clientName}</div>
            <div style={{ fontSize: 12, marginTop: 6, whiteSpace: 'pre-wrap' }}>{invoice.clientAddress}</div>
            <div style={{ marginTop: 8, fontSize: 12 }}>{invoice.clientEmail}<br />{invoice.clientPhone}</div>
          </div>

          <div>
            <div className="meta-box">
              <div style={{ marginBottom: 6 }} className="meta-tile">
                <div className="label">Invoice No</div><div className="value">{invoice.invoiceNo}</div>
              </div>
              <div style={{ height: 6 }} />
              <div className="meta-tile" style={{ marginBottom: 6 }}>
                <div className="label">Invoice Date</div><div className="value">{invoice.invoiceDate}</div>
              </div>
              <div style={{ height: 6 }} />
              <div className="meta-tile">
                <div className="label">Due Date</div><div className="value">{invoice.dueDate}</div>
              </div>
            </div>
          </div>
        </div>

        <table className="items-table" role="table" aria-label="Items">
          <thead>
            <tr>
              <th style={{ width: '60%' }}>Description</th>
              <th style={{ width: '10%' }}>Qty</th>
              <th style={{ width: '15%', textAlign: 'right' }}>Price</th>
              <th style={{ width: '15%', textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((it, i) => (
              <tr key={i}>
                <td>{it.description || '\u00A0'}</td>
                <td style={{ textAlign: 'right' }}>{it.qty}</td>
                <td className="rate">{formatMoney(Number(it.rate || 0), invoice.currency)}</td>
                <td className="amount">{formatMoney(Number(it.qty || 0) * Number(it.rate || 0), invoice.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="bottom-row">
          <div className="bank-box">
            <div style={{ fontWeight: 700, marginBottom: 6 }}>BANK DETAILS</div>
            <div style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{invoice.bankDetails || ''}</div>
          </div>

          <div className="summary-box">
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Summary</div>
            <div className="summary-row"><div>Subtotal</div><div>{formatMoney(sub, invoice.currency)}</div></div>
            <div className="summary-row"><div>Discount</div><div>{formatMoney(Number(invoice.discount || 0), invoice.currency)}</div></div>
            <div className="summary-row"><div>VAT ({invoice.taxRate || 0}%)</div><div>{formatMoney(v, invoice.currency)}</div></div>
            <div className="summary-row"><div>Shipping</div><div>{formatMoney(Number(invoice.shipping || 0), invoice.currency)}</div></div>
            <div className="summary-row total"><div>Total</div><div>{formatMoney(t, invoice.currency)}</div></div>
          </div>
        </div>

        <div className="terms-box" style={{ whiteSpace: 'pre-wrap' }}>{invoice.terms}</div>
        <div className="thanks">Thank you for doing business with Lexvor Group Limited</div>
      </div>
    );
  };

  /* =================== Render main UI =================== */
  return (
    <main className="min-h-screen bg-neutral-900 text-neutral-100 p-4">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-neutral-900/80 backdrop-blur border-b border-neutral-800 p-3 mb-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="text-lg font-semibold">Invoice System</div>
          <div className="flex items-center gap-2">
            <select className="input" value={invoice.currency} onChange={(e) => setInvoice({ ...invoice, currency: e.target.value })}>
              {['GHS','USD','EUR','GBP','NGN','ZAR','CAD','AUD'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button className="btn btn-ghost" onClick={() => setDark(!dark)} aria-label="Toggle theme">{dark ? '🌙' : '☀️'}</button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Tabs */}
        <div className="mb-4 inline-flex rounded-xl overflow-hidden">
          <button onClick={() => setTab('create')} className={`tab-btn ${tab === 'create' ? 'tab-btn-active' : ''}`}>Create Invoice</button>
          <button onClick={() => setTab('invoices')} className={`tab-btn ${tab === 'invoices' ? 'tab-btn-active' : ''} border-l`}>Invoices</button>
        </div>

        {tab === 'create' && (
          <>
            {/* Actions */}
            <div className="flex flex-wrap gap-2 mb-4">
              <button className="btn btn-primary" onClick={handlePrintDraft}>🖨️ Export to PDF</button>
              <button className="btn" onClick={saveToDB}>💾 Save to DB</button>
              <button className="btn" onClick={() => setInvoice(newInvoiceFromProfile(profile, invoice.currency))}>🔁 New from Profile</button>
              <label className="btn cursor-pointer">
                ⬆️ Upload Logo
                <input type="file" accept="image/*" className="hidden" onChange={onLogoUpload} />
              </label>
            </div>

            {/* Company profile */}
            <section className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700 }}>Company Profile (persists)</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12 }}>
                <div>
                  <label className="label">Company Name</label>
                  <input className="input" value={profile.companyName} onChange={(e) => setProfile({ ...profile, companyName: e.target.value })} />
                  <label className="label" style={{ marginTop: 8 }}>Company Email</label>
                  <input className="input" value={profile.companyEmail} onChange={(e) => setProfile({ ...profile, companyEmail: e.target.value })} />
                  <label className="label" style={{ marginTop: 8 }}>Company Phone</label>
                  <input className="input" value={profile.companyPhone} onChange={(e) => setProfile({ ...profile, companyPhone: e.target.value })} />
                </div>
                <div>
                  <label className="label">Company Address</label>
                  <textarea className="textarea" rows={3} value={profile.companyAddress} onChange={(e) => setProfile({ ...profile, companyAddress: e.target.value })} />
                  <label className="label" style={{ marginTop: 8 }}>Company TIN</label>
                  <input className="input" value={profile.companyTin} onChange={(e) => setProfile({ ...profile, companyTin: e.target.value })} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                    <label className="btn cursor-pointer">Upload Logo<input type="file" accept="image/*" className="hidden" onChange={onLogoUpload} /></label>
                    {profile.logoUrl ? <img src={profile.logoUrl} alt="logo" style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 6 }} /> : <div style={{ width: 48, height: 48, background: '#fff', borderRadius: 6 }} />}
                  </div>
                </div>
              </div>
            </section>

            {/* Invoice settings */}
            <section className="card">
              <div style={{ fontWeight: 700 }}>Invoice Settings</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
                <div><label className="label">Invoice No</label><input className="input" value={invoice.invoiceNo} onChange={(e) => setInvoice({ ...invoice, invoiceNo: e.target.value })} /></div>
                <div><label className="label">Invoice Date</label><input className="input" type="date" value={invoice.invoiceDate} onChange={(e) => setInvoice({ ...invoice, invoiceDate: e.target.value })} /></div>
                <div><label className="label">Due Date</label><input className="input" type="date" value={invoice.dueDate} onChange={(e) => setInvoice({ ...invoice, dueDate: e.target.value })} /></div>
                <div><label className="label">Payment Status</label>
                  <select className="input" value={invoice.paymentStatus} onChange={(e) => setInvoice({ ...invoice, paymentStatus: e.target.value as PaymentStatus })}>
                    <option>Unpaid</option><option>Partially Paid</option><option>Paid</option>
                  </select></div>
              </div>
            </section>

            {/* Bill To */}
            <section className="card">
              <div style={{ fontWeight: 700 }}>Bill To</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <div>
                  <label className="label">Client Name</label>
                  <input className="input" value={invoice.clientName} onChange={(e) => setInvoice({ ...invoice, clientName: e.target.value })} />
                  <label className="label" style={{ marginTop: 8 }}>Client Email</label>
                  <input className="input" value={invoice.clientEmail} onChange={(e) => setInvoice({ ...invoice, clientEmail: e.target.value })} />
                </div>
                <div>
                  <label className="label">Client Phone</label>
                  <input className="input" value={invoice.clientPhone} onChange={(e) => setInvoice({ ...invoice, clientPhone: e.target.value })} />
                  <label className="label" style={{ marginTop: 8 }}>Client Address</label>
                  <textarea className="textarea" rows={4} value={invoice.clientAddress} onChange={(e) => setInvoice({ ...invoice, clientAddress: e.target.value })} />
                </div>
              </div>
            </section>

            {/* Items */}
            <section className="card">
              <div style={{ fontWeight: 700 }}>Items</div>
              <div style={{ marginTop: 12 }}>
                <div style={{ overflow: 'hidden', borderRadius: 8 }}>
                  <table className="items-table" role="table" aria-label="Items">
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th style={{ textAlign: 'right' }}>Qty</th>
                        <th style={{ textAlign: 'right' }}>Rate</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                        <th style={{ textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items.map((it, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td><input className="input" value={it.description} onChange={(e) => updateItem(i, { description: e.target.value })} /></td>
                          <td style={{ textAlign: 'right' }}><input className="input" type="number" min={0} value={it.qty} onChange={(e) => updateItem(i, { qty: Number(e.target.value) })} /></td>
                          <td style={{ textAlign: 'right' }}><input className="input" type="number" value={it.rate} onChange={(e) => updateItem(i, { rate: Number(e.target.value) })} /></td>
                          <td style={{ textAlign: 'right' }}>{formatMoney(Number(it.qty || 0) * Number(it.rate || 0), invoice.currency)}</td>
                          <td style={{ textAlign: 'right' }}><button className="btn" onClick={() => removeItem(i)}>🗑️</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                  <button className="btn" onClick={addItem}>+ Add Item</button>

                  <div style={{ width: 320 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><div>Subtotal</div><div>{formatMoney(subTotal, invoice.currency)}</div></div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span className="label !mb-0">VAT %</span>
                        <input className="input" style={{ width: 90 }} type="number" value={invoice.taxRate} onChange={(e) => setInvoice({ ...invoice, taxRate: Number(e.target.value) })} />
                      </div>
                      <div>{formatMoney(vat, invoice.currency)}</div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 8 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span className="label !mb-0">Discount</span>
                        <input className="input" style={{ width: 120 }} type="number" value={invoice.discount} onChange={(e) => setInvoice({ ...invoice, discount: Number(e.target.value) })} />
                      </div>
                      <div>{formatMoney(Number(invoice.discount || 0), invoice.currency)}</div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 8 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span className="label !mb-0">Shipping</span>
                        <input className="input" style={{ width: 120 }} type="number" value={invoice.shipping} onChange={(e) => setInvoice({ ...invoice, shipping: Number(e.target.value) })} />
                      </div>
                      <div>{formatMoney(Number(invoice.shipping || 0), invoice.currency)}</div>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', marginTop: 10, paddingTop: 8, fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                      <div>Total</div><div>{formatMoney(total, invoice.currency)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Bank / Additional / Terms across the page */}
            <section className="card">
              <div style={{ fontWeight: 700 }}>Bank Details, Additional Info & Terms</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
                <div>
                  <label className="label">Bank Details</label>
                  <textarea className="textarea" rows={6} value={invoice.bankDetails} onChange={(e) => setInvoice({ ...invoice, bankDetails: e.target.value })} />
                </div>
                <div>
                  <label className="label">Additional Details</label>
                  <textarea className="textarea" rows={6} value={invoice.additionalDetails} onChange={(e) => setInvoice({ ...invoice, additionalDetails: e.target.value })} />
                </div>
                <div>
                  <label className="label">Terms & Conditions</label>
                  <textarea className="textarea" rows={6} value={invoice.terms} onChange={(e) => setInvoice({ ...invoice, terms: e.target.value })} />
                </div>
              </div>
            </section>

            {/* Print area for draft (hidden but used for the print window) */}
            <div style={{ display: 'none' }}>
              <div ref={printRef}>
                <div className="invoice-print-wrapper">
                  <PrintInvoice invoice={invoice} />
                </div>
              </div>
            </div>

            {/* Visible Preview (A4) */}
            <section className="card">
              <div style={{ fontWeight: 700 }}>Preview (A4, print-ready)</div>
              <div style={{ marginTop: 12 }}>
                <div style={{ background: '#fff', display: 'flex', justifyContent: 'center' }}>
                  <div style={{ width: '210mm' }}>
                    <div className="invoice-print-wrapper">
                      <PrintInvoice invoice={invoice} />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {tab === 'invoices' && (
          <section className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700 }}>Invoices</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input className="input" placeholder="Search by #, client, status…" value={search} onChange={(e) => setSearch(e.target.value)} />
                <select className="input" defaultValue="" onChange={(e) => e.target.value && viewToDraft(e.target.value)}>
                  <option value="">Quick select…</option>
                  {filtered.slice(0, 20).map(r => <option key={r.invoiceNo} value={r.invoiceNo}>{r.invoiceNo} — {r.clientName}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <tr>
                      <th style={{ padding: 8, textAlign: 'left' }}>Invoice No</th>
                      <th style={{ padding: 8, textAlign: 'left' }}>Invoice Date</th>
                      <th style={{ padding: 8, textAlign: 'left' }}>Due Date</th>
                      <th style={{ padding: 8, textAlign: 'left' }}>Client</th>
                      <th style={{ padding: 8, textAlign: 'left' }}>Status</th>
                      <th style={{ padding: 8, textAlign: 'right' }}>Total</th>
                      <th style={{ padding: 8, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => {
                      const sub = r.items.reduce((s, i) => s + Number(i.qty || 0) * Number(i.rate || 0), 0);
                      const v = sub * (Number(r.taxRate || 0) / 100);
                      const t = sub - Number(r.discount || 0) + v + Number(r.shipping || 0);
                      return (
                        <tr key={r.invoiceNo} style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: 8, fontFamily: 'monospace' }}>{r.invoiceNo}</td>
                          <td style={{ padding: 8 }}>{r.invoiceDate}</td>
                          <td style={{ padding: 8 }}>{r.dueDate}</td>
                          <td style={{ padding: 8 }}>{r.clientName}</td>
                          <td style={{ padding: 8 }}>{r.paymentStatus}</td>
                          <td style={{ padding: 8, textAlign: 'right' }}>{formatMoney(t, r.currency || invoice.currency)}</td>
                          <td style={{ padding: 8, textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                              <button className="btn" onClick={() => viewToDraft(r.invoiceNo)}>View/Edit</button>
                              <button className="btn btn-primary" onClick={() => exportRowToPDF(r.invoiceNo)}>Export</button>
                              <button className="btn" onClick={() => deleteFromDB(r.invoiceNo)}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center' }}>No matches.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

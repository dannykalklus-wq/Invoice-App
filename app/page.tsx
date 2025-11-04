'use client';
export const dynamic = 'force-dynamic';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
  Plus, Trash2, Printer, Save, Upload, RefreshCcw,
  Sun, Moon, Eye, Trash, Search
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

/* ---------------------------
   Types & small helpers
   --------------------------- */
type Item = { description: string; qty: number; rate: number };
type CompanyProfile = {
  logoUrl: string; companyName: string; companyEmail: string; companyPhone: string; companyAddress: string; companyTin: string;
};
type PaymentStatus = 'Unpaid' | 'Partially Paid' | 'Paid';
type Invoice = {
  invoiceNo: string; invoiceDate: string; dueDate: string;
  clientName: string; clientPhone: string; clientEmail: string; clientAddress: string;
  items: Item[]; bankDetails: string; additionalDetails: string; terms: string;
  logoUrl: string; companyName: string; companyEmail: string; companyPhone: string; companyAddress: string; companyTin: string;
  taxRate: number; discount: number; shipping: number;
  paymentStatus: PaymentStatus; currency: string;
};

const num = (v: any) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const money = (n: number, c: string) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: c }).format(num(n));

const safeRead = <T,>(k: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const safeWrite = (k: string, value: unknown) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(k, JSON.stringify(value));
  } catch {}
};

/* ---------------------------
   Defaults
   --------------------------- */
const DEFAULT_PROFILE: CompanyProfile = {
  logoUrl: '',
  companyName: 'Lexvor Group Ltd',
  companyEmail: '',
  companyPhone: '',
  companyAddress: '',
  companyTin: ''
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
  currency
});

/* ---------------------------
   Theme hook
   --------------------------- */
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

/* ============================
   PRINT / PDF INVOICE
   ============================ */
const PrintInvoice = React.forwardRef<HTMLDivElement, { invoice: Invoice }>(
  ({ invoice }, ref) => {
    // totals
    const subTotal = invoice.items.reduce((sum, it) => sum + num(it.qty) * num(it.rate), 0);
    const vat = subTotal * (num(invoice.taxRate) / 100);
    const total = subTotal - num(invoice.discount) + vat + num(invoice.shipping);

    // consistent visual values for print
    const borderThin = '0.6pt solid #d0d0d0';
    const headerBg = '#e6e6e6';
    const tileBg = '#d7dbe0'; // subtle gray for meta tiles
    const tableHeaderBg = '#e9e9e9';
    const dotted = '0.6pt dotted #cfcfcf';

    return (
      <div ref={ref} className="print-area" style={{ color: '#000', background: '#fff', padding: '12mm 0' }}>
        <div className="print-inner" style={{ width: '186mm', margin: '0 auto', fontFamily: 'inherit' }}>
          {/* Header: left company, center title, right logo */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: '1 1 45%', minWidth: 0 }}>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{invoice.companyName || ' '}</div>
              {invoice.companyTin ? <div style={{ fontSize: 10, marginTop: 6 }}>TIN: {invoice.companyTin}</div> : null}
              {invoice.companyAddress ? <div style={{ fontSize: 10, marginTop: 6, whiteSpace: 'pre-wrap' }}>{invoice.companyAddress}</div> : null}
              {invoice.companyPhone ? <div style={{ fontSize: 10, marginTop: 6 }}>{invoice.companyPhone}</div> : null}
              {invoice.companyEmail ? <div style={{ fontSize: 10, marginTop: 6 }}>{invoice.companyEmail}</div> : null}
            </div>

            <div style={{ flex: '0 0 200px', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>INVOICE</div>
              {/* keep small gap then logo */}
              <div style={{ marginTop: 8 }}>
                {invoice.logoUrl ? (
                  <img
                    src={invoice.logoUrl}
                    alt="logo"
                    style={{ maxHeight: 90, maxWidth: 210, objectFit: 'contain', display: 'block', margin: '8px auto' }}
                  />
                ) : (
                  <div style={{ height: 90, width: 210, border: borderThin, borderRadius: 6, margin: '8px auto' }} />
                )}
              </div>
            </div>

            <div style={{ flex: '1 1 30%', minWidth: 0, textAlign: 'right' }}>
              {/* reserved for alignment symmetry — leaving blank intentionally so center remains centered */}
            </div>
          </div>

          {/* Second row: Bill To (left) and Meta tiles (right) aligned on same top and same height */}
          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            {/* Bill To box (flexible width) */}
            <div style={{ flex: '1 1 auto', minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 6 }}>BILL TO</div>
              <div style={{ border: borderThin, borderRadius: 6, padding: 10, minHeight: 86 }}>
                {invoice.clientName ? <div style={{ fontWeight: 700 }}>{invoice.clientName}</div> : <div style={{ color: '#666' }}>—</div>}
                {invoice.clientAddress ? <div style={{ whiteSpace: 'pre-wrap', marginTop: 6 }}>{invoice.clientAddress}</div> : null}
                {invoice.clientEmail ? <div style={{ marginTop: 6 }}>{invoice.clientEmail}</div> : null}
                {invoice.clientPhone ? <div style={{ marginTop: 6 }}>{invoice.clientPhone}</div> : null}
              </div>
            </div>

            {/* Meta tiles - fixed narrower width to avoid overflowing into items table */}
            <div style={{ width: 320, flex: '0 0 320px' }}>
              <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr 1fr', gap: 6 }}>
                {[
                  ['Invoice No', invoice.invoiceNo || '-'],
                  ['Invoice Date', invoice.invoiceDate || '-'],
                  ['Due Date', invoice.dueDate || '-']
                ].map(([label, value], i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'stretch' }}>
                    <div style={{ background: tileBg, padding: 8, border

'use client';

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { Printer, Save, RefreshCcw, Upload, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

/* =============== Types =============== */
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

/* =============== Safe localStorage helpers =============== */
const safeRead = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const safeWrite = (key: string, value: unknown) => {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
};

/* =============== Defaults =============== */
const DEFAULT_PROFILE: CompanyProfile = {
  logoUrl: "",
  companyName: "LEXVOR GROUP LTD",
  companyEmail: "lexvorgrouplimited@gmail.com",
  companyPhone: "+1 914-508-3305",
  companyAddress: "Ghana — USA",
  companyTin: "C0066170982",
};

const newInvoiceFromProfile = (p: CompanyProfile, currency = "USD"): Invoice => ({
  invoiceNo: `LEX-${Math.floor(Math.random() * 1000000)}`,
  invoiceDate: new Date().toISOString().slice(0, 10),
  dueDate: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),

  clientName: "",
  clientPhone: "",
  clientEmail: "",
  clientAddress: "",

  items: [{ description: "", qty: 1, rate: 0 }],

  bankDetails: "",
  additionalDetails: "",
  terms: "",

  logoUrl: p.logoUrl,
  companyName: p.companyName,
  companyEmail: p.companyEmail,
  companyPhone: p.companyPhone,
  companyAddress: p.companyAddress,
  companyTin: p.companyTin,

  taxRate: 0,
  discount: 0,
  shipping: 0,

  paymentStatus: "Unpaid",
  currency,
});

/* =============== Helpers =============== */
const formatMoney = (n: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(n || 0));

/* =============== Print PDF =============== */
const PrintInvoice = React.forwardRef<HTMLDivElement, { invoice: Invoice }>(
  ({ invoice }, ref) => {
    const subTotal = invoice.items.reduce((sum, it) => sum + Number(it.qty || 0) * Number(it.rate || 0), 0);
    const vat = subTotal * (Number(invoice.taxRate || 0) / 100);
    const total = subTotal - Number(invoice.discount || 0) + vat + Number(invoice.shipping || 0);

    return (
      <div ref={ref} className="print-area p-8 font-sans">
        <div className="print-inner">
          {/* ---------- HEADER ---------- */}
          <div className="pt-4 grid grid-cols-2 gap-6 items-start">
            {/* LEFT */}
            <div>
              <div className="company-title">{invoice.companyName}</div>
              {invoice.companyTin && <div className="text-sm soft-underline mt-1">TIN: {invoice.companyTin}</div>}
              {invoice.companyAddress && (
                <div className="text-sm mt-1 whitespace-pre-wrap">{invoice.companyAddress}</div>
              )}
              {invoice.companyPhone && <div className="text-sm mt-1">Phone: {invoice.companyPhone}</div>}
              {invoice.companyEmail && <div className="text-sm mt-1">Email: {invoice.companyEmail}</div>}
            </div>

            {/* RIGHT */}
            <div className="text-right">
              <div className="print-h1">INVOICE</div>
              <div className="mt-6 inline-block">
                {invoice.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={invoice.logoUrl}
                    alt="Logo"
                    className="h-14 object-contain inline-block"
                    style={{ maxWidth: "140px" }}
                  />
                ) : (
                  <div className="h-14 w-40 inline-block bg-neutral-200 rounded" />
                )}
              </div>
            </div>
          </div>

          {/* ---------- BILL TO + META ---------- */}
          <div className="mt-4 grid grid-cols-2 gap-6 items-start">
            <div>
              <div className="print-h2">Bill To</div>
              <div className="mt-1 text-sm print-line">
                {invoice.clientName && <div className="font-medium">{invoice.clientName}</div>}
                {invoice.clientAddress && <div className="whitespace-pre-wrap">{invoice.clientAddress}</div>}
                {invoice.clientEmail && <div className="mt-1">{invoice.clientEmail}</div>}
                {invoice.clientPhone && <div>{invoice.clientPhone}</div>}
              </div>
            </div>

            <div className="meta">
              <div className="meta-row">
                <div className="meta-label">Invoice No</div>
                <div className="meta-val">{invoice.invoiceNo}</div>
              </div>
              <div className="meta-row">
                <div className="meta-label">Invoice Date</div>
                <div className="meta-val">{invoice.invoiceDate}</div>
              </div>
              <div className="meta-row">
                <div className="meta-label">Due Date</div>
                <div className="meta-val">{invoice.dueDate}</div>
              </div>
            </div>
          </div>

          {/* ---------- ITEMS TABLE ---------- */}
          <div className="mt-6 overflow-hidden rounded border border-line">
            <table className="w-full text-sm">
              <thead className="bg-neutral-100">
                <tr>
                  <th className="px-3 py-2 text-left">Description</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Rate</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((it, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="px-3 py-2">{it.description}</td>
                    <td className="px-3 py-2 text-right">{it.qty}</td>
                    <td className="px-3 py-2 text-right">{formatMoney(it.rate, invoice.currency)}</td>
                    <td className="px-3 py-2 text-right">{formatMoney(it.qty * it.rate, invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ---------- BANK + TOTALS ---------- */}
          <div className="mt-6 grid grid-cols-2 gap-6 items-start">
            {/* Left tiles (3 equal width) */}
            <div className="grid grid-cols-3 gap-3">
              <div className="tile">
                <div className="font-semibold text-sm">BANK DETAILS</div>
                <div className="text-xs mt-1 whitespace-pre-wrap">{invoice.bankDetails}</div>
              </div>
              <div className="tile">
                <div className="font-semibold text-sm">ADDITIONAL DETAILS</div>
                <div className="text-xs mt-1 whitespace-pre-wrap">{invoice.additionalDetails}</div>
              </div>
              <div className="tile">
                <div className="font-semibold text-sm">TERMS & CONDITIONS</div>
                <div className="text-xs mt-1 whitespace-pre-wrap">{invoice.terms}</div>
              </div>
            </div>

            {/* Totals */}
            <div className="totals ml-auto">
              <div className="flex justify-between text-sm py-1"><div>Subtotal</div><div>{formatMoney(subTotal, invoice.currency)}</div></div>
              <div className="flex justify-between text-sm py-1"><div>Discount</div><div>{formatMoney(invoice.discount, invoice.currency)}</div></div>
              <div className="flex justify-between text-sm py-1"><div>VAT ({invoice.taxRate}%)</div><div>{formatMoney(vat, invoice.currency)}</div></div>
              <div className="flex justify-between text-sm py-1"><div>Shipping</div><div>{formatMoney(invoice.shipping, invoice.currency)}</div></div>
              <div className="total flex justify-between text-sm pt-2"><div>Total</div><div>{formatMoney(total, invoice.currency)}</div></div>
            </div>
          </div>

          <div className="mt-10 text-center font-semibold italic text-sm">
            Thank you for doing business with {invoice.companyName}.
          </div>
        </div>
      </div>
    );
  }
);
PrintInvoice.displayName = "PrintInvoice";

/* =============== Main App =============== */
export default function App() {
  const [invoice, setInvoice] = useState<Invoice>(() =>
    safeRead("__invoice_draft", newInvoiceFromProfile(DEFAULT_PROFILE))
  );
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: `Invoice_${invoice.invoiceNo}` });

  const subTotal = useMemo(() => invoice.items.reduce((s, i) => s + i.qty * i.rate, 0), [invoice.items]);
  const vat = useMemo(() => subTotal * (invoice.taxRate / 100), [subTotal, invoice.taxRate]);
  const total = useMemo(() => subTotal - invoice.discount + vat + invoice.shipping, [subTotal, vat, invoice.discount, invoice.shipping]);

  return (
    <main className="min-h-screen bg-neutral-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between mb-4">
          <button className="btn-primary" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" /> Export to PDF
          </button>
          <button className="btn" onClick={() => setInvoice(newInvoiceFromProfile(DEFAULT_PROFILE))}>
            <RefreshCcw className="h-4 w-4 mr-2" /> New Invoice
          </button>
        </div>

        <div className="bg-white rounded-xl shadow p-6 border border-line">
          <PrintInvoice ref={printRef} invoice={invoice} />
        </div>
      </div>
    </main>
  );
}

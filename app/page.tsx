'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Plus, Trash2, Printer, Save, Upload, RefreshCcw, Sun, Moon, Eye, Trash, Search, FileDown } from "lucide-react";
import { useReactToPrint } from "react-to-print";

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

/* ============ Safe localStorage helpers ============ */
const safeRead = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
};
const safeWrite = (key: string, value: unknown) => {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
};

/* =================== Defaults =================== */
const DEFAULT_PROFILE: CompanyProfile = {
  logoUrl: "",
  companyName: "Lexvor Group Ltd",
  companyEmail: "",
  companyPhone: "",
  companyAddress: "",
  companyTin: "",
};

const newInvoiceFromProfile = (p: CompanyProfile, currency = "GHS"): Invoice => ({
  invoiceNo: "INV-0001",
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

/* =================== Theme & money =================== */
const formatMoney = (n: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(n || 0));

const useTheme = () => {
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("__theme");
    if (saved) return saved === "dark";
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("__theme", dark ? "dark" : "light");
  }, [dark]);
  return { dark, setDark };
};

/* =================== PDF component =================== */
const PrintInvoice = React.forwardRef<HTMLDivElement, { invoice: Invoice }>(
  ({ invoice }, ref) => {
    const subTotal = invoice.items.reduce((sum, it) => sum + Number(it.qty || 0) * Number(it.rate || 0), 0);
    const vat = subTotal * (Number(invoice.taxRate || 0) / 100);
    const total = subTotal - Number(invoice.discount || 0) + vat + Number(invoice.shipping || 0);

    return (
      <div ref={ref} className="bg-white text-black p-8">
        {/* HEADER — Excel-style layout */}
        <div className="pt-4 grid grid-cols-2 gap-6 items-start">
          {/* LEFT: Company details */}
          <div className="print-line">
            <div className="company-title">{invoice.companyName || "Company Name"}</div>
            {invoice.companyTin && (
              <div className="text-sm soft-underline mt-1">TIN: {invoice.companyTin}</div>
            )}
            {invoice.companyAddress && (
              <div className="text-sm mt-1 whitespace-pre-wrap">{invoice.companyAddress}</div>
            )}
            {invoice.companyPhone && (
              <div className="text-sm mt-1">Phone: {invoice.companyPhone}</div>
            )}
            {invoice.companyEmail && (
              <div className="text-sm mt-1">Email: {invoice.companyEmail}</div>
            )}
          </div>

          {/* RIGHT: Invoice title + logo */}
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

        {/* SECOND ROW: Bill To + Meta table */}
        <div className="mt-4 grid grid-cols-2 gap-6 items-start">
          {/* Bill To */}
          <div>
            <div className="print-h2">Bill To</div>
            <div className="mt-1 text-sm print-line">
              {invoice.clientName && <div className="font-medium">{invoice.clientName}</div>}
              {invoice.clientAddress && <div className="whitespace-pre-wrap">{invoice.clientAddress}</div>}
              {invoice.clientEmail && <div className="mt-1">{invoice.clientEmail}</div>}
              {invoice.clientPhone && <div className="">{invoice.clientPhone}</div>}
            </div>
          </div>

          {/* Right: Meta table */}
          <div className="meta">
            <div className="meta-row">
              <div className="meta-label">Invoice No</div>
              <div className="meta-val">{invoice.invoiceNo || "-"}</div>
            </div>
            <div className="meta-row">
              <div className="meta-label">Invoice Date</div>
              <div className="meta-val">{invoice.invoiceDate || "-"}</div>
            </div>
            <div className="meta-row">
              <div className="meta-label">Due Date</div>
              <div className="meta-val">{invoice.dueDate || "-"}</div>
            </div>
          </div>
        </div>

        {/* ITEMS TABLE */}
        <div className="mt-6 overflow-hidden rounded border">
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
                <tr className="border-t avoid-break" key={i}>
                  <td className="px-3 py-2">{it.description}</td>
                  <td className="px-3 py-2 text-right">{it.qty}</td>
                  <td className="px-3 py-2 text-right">{formatMoney(it.rate, invoice.currency)}</td>
                  <td className="px-3 py-2 text-right">{formatMoney(it.qty * it.rate, invoice.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* BANK DETAILS + TOTALS */}
        <div className="mt-6 grid grid-cols-2 gap-6">
          <div className="text-sm space-y-4">
            {invoice.bankDetails && (
              <div>
                <div className="font-semibold">Bank Details</div>
                <div className="whitespace-pre-wrap mt-1">{invoice.bankDetails}</div>
              </div>
            )}
            {invoice.additionalDetails && (
              <div>
                <div className="font-semibold">Additional Details</div>
                <div className="whitespace-pre-wrap mt-1">{invoice.additionalDetails}</div>
              </div>
            )}
            {invoice.terms && (
              <div>
                <div className="font-semibold">Terms &amp; Conditions</div>
                <div className="whitespace-pre-wrap mt-1">{invoice.terms}</div>
              </div>
            )}
          </div>

          <div className="justify-self-end w-64">
            <div className="flex justify-between text-sm py-1"><div>Subtotal</div><div>{formatMoney(subTotal, invoice.currency)}</div></div>
            <div className="flex justify-between text-sm py-1"><div>Discount</div><div>{formatMoney(invoice.discount, invoice.currency)}</div></div>
            <div className="flex justify-between text-sm py-1"><div>VAT ({invoice.taxRate}%)</div><div>{formatMoney(vat, invoice.currency)}</div></div>
            <div className="flex justify-between text-sm py-1"><div>Shipping</div><div>{formatMoney(invoice.shipping, invoice.currency)}</div></div>
            <div className="border-t mt-2 pt-2 flex justify-between font-semibold">
              <div>Total</div><div>{formatMoney(total, invoice.currency)}</div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-sm italic">
          Thank you for doing business with {invoice.companyName || "our company"}.
        </div>
      </div>
    );
  }
);
PrintInvoice.displayName = "PrintInvoice";

/* =================== Main App =================== */
export default function App() {
  const { dark, setDark } = useTheme();
  const [currency, setCurrency] = useState("GHS");
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [invoice, setInvoice] = useState(newInvoiceFromProfile(DEFAULT_PROFILE, currency));

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: invoice.invoiceNo });

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
      <div className="max-w-5xl mx-auto p-4">
        <button onClick={handlePrint} className="btn btn-primary mb-4">
          <Printer className="h-4 w-4 mr-2" /> Print / Export PDF
        </button>
        <div ref={printRef}><PrintInvoice invoice={invoice} /></div>
      </div>
    </main>
  );
}

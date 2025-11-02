'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  Plus, Trash2, Printer, Save, Upload, RefreshCcw,
  Sun, Moon, Eye, Trash, Search
} from "lucide-react";
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

/* ============ Helpers (mobile-safe number parsing) ============ */
const num = (v: any) => {
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/* ============ Safe localStorage helpers ============ */
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
  new Intl.NumberFormat(undefined, { style: "currency", currency }).format(num(n));

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

/* =================== PDF component (Excel-style header) =================== */
const PrintInvoice = React.forwardRef<HTMLDivElement, { invoice: Invoice }>(
  ({ invoice }, ref) => {
    const subTotal = invoice.items.reduce((sum, it) => sum + num(it.qty) * num(it.rate), 0);
    const vat = subTotal * (num(invoice.taxRate) / 100);
    const total = subTotal - num(invoice.discount) + vat + num(invoice.shipping);

    return (
      <div ref={ref} className="print-area bg-white text-black">
        <div className="print-inner py-6">

          {/* HEADER — Excel-style layout */}
          <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* LEFT: Company details */}
            <div>
              <div className="company-title font-bold text-2xl">{invoice.companyName || "Company Name"}</div>
              {invoice.companyTin && (
                <div className="text-sm mt-1">TIN: {invoice.companyTin}</div>
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
              <div className="print-h1 text-2xl font-bold tracking-tight">INVOICE</div>
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
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Bill To */}
            <div>
              <div className="uppercase text-sm font-semibold text-neutral-600">BILL TO</div>
              <div className="mt-1 text-sm">
                {invoice.clientName && <div className="font-medium">{invoice.clientName}</div>}
                {invoice.clientAddress && <div className="whitespace-pre-wrap">{invoice.clientAddress}</div>}
                {invoice.clientEmail && <div className="mt-1">{invoice.clientEmail}</div>}
                {invoice.clientPhone && <div className="">{invoice.clientPhone}</div>}
              </div>
            </div>

            {/* Right: Meta table (Excel blue #99b3d9) */}
            <div className="meta">
              <div className="flex">
                <div className="w-40 bg-[#99b3d9] text-neutral-900 font-semibold px-3 py-2 text-sm rounded-l">Invoice No</div>
                <div className="flex-1 border border-neutral-200 px-3 py-2 text-sm rounded-r">{invoice.invoiceNo || "-"}</div>
              </div>
              <div className="flex mt-1">
                <div className="w-40 bg-[#99b3d9] text-neutral-900 font-semibold px-3 py-2 text-sm rounded-l">Invoice Date</div>
                <div className="flex-1 border border-neutral-200 px-3 py-2 text-sm rounded-r">{invoice.invoiceDate || "-"}</div>
              </div>
              <div className="flex mt-1">
                <div className="w-40 bg-[#99b3d9] text-neutral-900 font-semibold px-3 py-2 text-sm rounded-l">Due Date</div>
                <div className="flex-1 border border-neutral-200 px-3 py-2 text-sm rounded-r">{invoice.dueDate || "-"}</div>
              </div>
            </div>
          </div>

          {/* ITEMS TABLE */}
          <div className="mt-6 overflow-hidden rounded border border-neutral-200">
            <table className="table text-sm">
              <colgroup>
                <col />
                <col style={{ width: "80px" }} />
                <col style={{ width: "120px" }} />
                <col style={{ width: "140px" }} />
              </colgroup>
              <thead className="bg-neutral-100">
                <tr>
                  <th className="text-left">Description</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Rate</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((it, i) => (
                  <tr className="avoid-break" key={i}>
                    <td className="whitespace-pre-wrap">{it.description}</td>
                    <td className="text-right">{num(it.qty)}</td>
                    <td className="text-right">{formatMoney(num(it.rate), invoice.currency)}</td>
                    <td className="text-right">{formatMoney(num(it.qty) * num(it.rate), invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* BANK + TOTALS */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="avoid-break rounded-lg border border-neutral-200 p-4">
              <div className="text-sm font-semibold text-neutral-600">BANK DETAILS</div>
              <div className="whitespace-pre-wrap text-sm mt-2">
                {invoice.bankDetails || "—"}
              </div>
            </div>

            <div className="justify-self-end w-full max-w-[280px] md:max-w-[320px]">
              <div className="rounded-lg border border-neutral-200 p-4">
                <div className="flex justify-between text-sm py-1"><div>Subtotal</div><div>{formatMoney(subTotal, invoice.currency)}</div></div>
                <div className="flex justify-between text-sm py-1"><div>Discount</div><div>{formatMoney(num(invoice.discount), invoice.currency)}</div></div>
                <div className="flex justify-between text-sm py-1"><div>VAT ({num(invoice.taxRate)}%)</div><div>{formatMoney(vat, invoice.currency)}</div></div>
                <div className="flex justify-between text-sm py-1"><div>Shipping</div><div>{formatMoney(num(invoice.shipping), invoice.currency)}</div></div>
                <div className="border-t mt-2 pt-2 flex justify-between font-semibold">
                  <div>Total</div><div>{formatMoney(total, invoice.currency)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* ADDITIONAL + TERMS */}
          <div className="mt-6 space-y-6">
            <div className="text-sm whitespace-pre-wrap">
              {invoice.additionalDetails || " "}
            </div>
            <div className="text-sm whitespace-pre-wrap text-center">
              {invoice.terms || " "}
            </div>
          </div>

          {/* SALUTATION — bold + centered */}
          <div className="mt-10 text-center text-sm font-bold">
            Thank you for doing business with Lexvor Group Limited
          </div>
        </div>

        {/* Fixed footer */}
        <div className="print-footer">
          <div>{invoice.companyName}</div>
          <div className="pageno"></div>
        </div>
      </div>
    );
  }
);
PrintInvoice.displayName = "PrintInvoice";

/* =================== Main App =================== */
export default function App() {
  const { dark, setDark } = useTheme();

  // Currency
  const [currency, setCurrency] = useState<string>(() => {
    if (typeof window === "undefined") return "GHS";
    return localStorage.getItem("__currency") || "GHS";
  });
  useEffect(() => { localStorage.setItem("__currency", currency); }, [currency]);

  // Profile (persists)
  const [profile, setProfile] = useState<CompanyProfile>(() =>
    safeRead<CompanyProfile>("__company_profile", DEFAULT_PROFILE)
  );
  useEffect(() => { safeWrite("__company_profile", profile); }, [profile]);

  // Draft (persists)
  const [invoice, setInvoice] = useState<Invoice>(() =>
    safeRead<Invoice>("__invoice_draft", newInvoiceFromProfile(DEFAULT_PROFILE, currency))
  );
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
  }, [
    profile.logoUrl, profile.companyName, profile.companyEmail,
    profile.companyPhone, profile.companyAddress, profile.companyTin, currency
  ]);
  useEffect(() => { safeWrite("__invoice_draft", invoice); }, [invoice]);

  // Local DB
  const [db, setDb] = useState<Invoice[]>(() => safeRead<Invoice[]>("__invoices_db", []));
  useEffect(() => { safeWrite("__invoices_db", db); }, [db]);

  // Tabs
  const [tab, setTab] = useState<"create" | "invoices">("create");

  // --- PRINT / PDF (Desktop vs Mobile) ---
  const visiblePreviewRef = useRef<HTMLDivElement>(null);

  // Desktop print
  const handlePrintDraft = useReactToPrint({
    contentRef: visiblePreviewRef,
    documentTitle: `Invoice_${invoice.invoiceNo}`
  });

  // Mobile detection
  const isMobile = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  // Mobile PDF export using html2canvas + jsPDF
  const exportPDFMobile = async () => {
    try {
      const el = visiblePreviewRef.current;
      if (!el) return;

      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: document.documentElement.scrollWidth,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const pageWidth = 210;
      const pageHeight = 297;

      const imgProps = { width: pageWidth, height: (canvas.height * pageWidth) / canvas.width };
      let y = 0;

      if (imgProps.height <= pageHeight) {
        pdf.addImage(imgData, "JPEG", 0, 0, imgProps.width, imgProps.height);
      } else {
        const onePageHeightPx = (canvas.width * pageHeight) / pageWidth;
        let sY = 0;
        while (sY < canvas.height) {
          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = canvas.width;
          pageCanvas.height = Math.min(onePageHeightPx, canvas.height - sY);

          const ctx = pageCanvas.getContext("2d");
          if (!ctx) break;
          ctx.drawImage(canvas, 0, sY, canvas.width, pageCanvas.height, 0, 0, canvas.width, pageCanvas.height);

          const pageData = pageCanvas.toDataURL("image/jpeg", 0.98);
          if (y === 0) {
            pdf.addImage(pageData, "JPEG", 0, 0, pageWidth, pageHeight);
          } else {
            pdf.addPage();
            pdf.addImage(pageData, "JPEG", 0, 0, pageWidth, pageHeight);
          }
          sY += pageCanvas.height;
          y += pageHeight;
        }
      }

      pdf.save(`Invoice_${invoice.invoiceNo || "Invoice"}.pdf`);
    } catch (e) {
      console.error("Mobile PDF export failed:", e);
      alert("Could not generate PDF on this device. Please try desktop export.");
    }
  };

  const exportPDF = () => {
    if (isMobile) exportPDFMobile();
    else handlePrintDraft();
  };

  // Totals (on-screen)
  const subTotal = useMemo(
    () => invoice.items.reduce((sum, it) => sum + num(it.qty) * num(it.rate), 0),
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
    reader.onload = () => setProfile((p) => ({ ...p, logoUrl: String(reader.result || "") }));
    reader.readAsDataURL(file);
  };
  const addItem = () => setInvoice((s) => ({ ...s, items: [...s.items, { description: "", qty: 1, rate: 0 }] }));
  const updateItem = (i: number, patch: Partial<Item>) =>
    setInvoice((s) => {
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
    setTab("invoices");
  };
  const deleteFromDB = (invoiceNo: string) => setDb((rows) => rows.filter((r) => r.invoiceNo !== invoiceNo));
  const viewToDraft = (invoiceNo: string) => {
    const src = db.find((r) => r.invoiceNo === invoiceNo);
    if (!src) return;
    setInvoice({ ...src });
    setTab("create");
    window?.scrollTo?.({ top: 0, behavior: "smooth" });
  };

  // List filtering
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return db;
    return db.filter(r =>
      r.invoiceNo.toLowerCase().includes(q) ||
      r.clientName.toLowerCase().includes(q) ||
      r.paymentStatus.toLowerCase().includes(q) ||
      r.invoiceDate.toLowerCase().includes(q) ||
      r.dueDate.toLowerCase().includes(q)
    );
  }, [db, search]);

  // Optional: smoke test Supabase (non-blocking)
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.from("invoices").select("*").limit(1);
        if (error) console.warn("Supabase test error:", error.message);
        else console.log("Supabase sample:", data);
      } catch {
        // ignore
      }
    })();
  }, []);

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-neutral-900/90 backdrop-blur border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap gap-3 items-center justify-between">
          <div className="text-lg font-semibold">Invoice System</div>
          <div className="flex items-center gap-2">
            <select
              className="input w-[110px]"
              value={invoice.currency}
              onChange={(e) => setInvoice((prev) => ({ ...prev, currency: e.target.value }))}
              title="Currency"
            >
              {["GHS","USD","EUR","GBP","NGN","ZAR","CAD","AUD"].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button className="btn btn-ghost-strong" onClick={() => setDark(!dark)} title="Toggle theme">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        {/* Tabs */}
        <div className="mb-4 inline-flex rounded-xl border overflow-hidden">
          <button
            onClick={() => setTab("create")}
            className={`tab-btn ${tab === "create" ? "tab-btn-active" : ""}`}
          >
            Create Invoice
          </button>
          <button
            onClick={() => setTab("invoices")}
            className={`tab-btn border-l ${tab === "invoices" ? "tab-btn-active" : ""}`}
          >
            Invoices
          </button>
        </div>

        {tab === "create" && (
          <>
            {/* Actions */}
            <div className="flex flex-wrap gap-2 mb-4">
              <button className="btn btn-primary" onClick={exportPDF}>
                <Printer className="h-4 w-4 mr-2" /> Export to PDF
              </button>
              <button className="btn" onClick={saveToDB}>
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
                      <img src={profile.logoUrl} alt="Logo" className="h-10 w-10 object-contain rounded bg-white border" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-neutral-200 border" />
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
                  <select
                    className="input"
                    value={invoice.paymentStatus}
                    onChange={(e) => setInvoice({ ...invoice, paymentStatus: e.target.value as PaymentStatus })}
                  >
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
                <div className="table-wrap rounded-lg border border-neutral-200 dark:border-neutral-800">
                  <table className="w-full text-sm min-w-[560px]">
                    <thead className="bg-neutral-100 dark:bg-neutral-800/60 text-left">
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
                        <tr key={i} className="border-t border-neutral-200 dark:border-neutral-800">
                          <td className="px-3 py-2">
                            <input
                              className="input"
                              placeholder="Item / service"
                              value={it.description}
                              onChange={(e) => updateItem(i, { description: e.target.value })}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              className="input text-right font-mono"
                              type="number" inputMode="decimal"
                              value={it.qty}
                              onChange={(e) => updateItem(i, { qty: num(e.target.value) })}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              className="input text-right font-mono"
                              type="number" inputMode="decimal"
                              value={it.rate}
                              onChange={(e) => updateItem(i, { rate: num(e.target.value) })}
                            />
                          </td>
                          <td className="px-3 py-2 text-right align-middle font-mono">
                            {formatMoney(num(it.qty) * num(it.rate), invoice.currency)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button className="btn-sm btn-ghost-strong" onClick={() => removeItem(i)}><Trash2 className="h-4 w-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between mt-3">
                  <button className="btn" onClick={addItem}><Plus className="h-4 w-4 mr-2" /> Add Item</button>
                  <div className="w-80 space-y-2">
                    <div className="flex justify-between text-sm py-1">
                      <div>Subtotal</div><div className="font-mono">{formatMoney(subTotal, invoice.currency)}</div>
                    </div>

                    <div className="flex items-center justify-between text-sm py-1 gap-2">
                      <div className="flex items-center gap-2">
                        <span className="label !mb-0">VAT %</span>
                        <input
                          className="input w-24 font-mono"
                          type="number" inputMode="decimal"
                          value={invoice.taxRate}
                          onChange={(e) => setInvoice({ ...invoice, taxRate: num(e.target.value) })}
                        />
                      </div>
                      <div className="font-mono">{formatMoney(vat, invoice.currency)}</div>
                    </div>

                    <div className="flex items-center justify-between text-sm py-1 gap-2">
                      <div className="flex items-center gap-2">
                        <span className="label !mb-0">Discount</span>
                        <input
                          className="input w-28 font-mono"
                          type="number" inputMode="decimal"
                          value={invoice.discount}
                          onChange={(e) => setInvoice({ ...invoice, discount: num(e.target.value) })}
                        />
                      </div>
                      <div className="font-mono">{formatMoney(num(invoice.discount), invoice.currency)}</div>
                    </div>

                    <div className="flex items-center justify-between text-sm py-1 gap-2">
                      <div className="flex items-center gap-2">
                        <span className="label !mb-0">Shipping</span>
                        <input
                          className="input w-28 font-mono"
                          type="number" inputMode="decimal"
                          value={invoice.shipping}
                          onChange={(e) => setInvoice({ ...invoice, shipping: num(e.target.value) })}
                        />
                      </div>
                      <div className="font-mono">{formatMoney(num(invoice.shipping), invoice.currency)}</div>
                    </div>

                    <div className="border-t mt-2 pt-2 flex justify-between font-semibold">
                      <div>Total</div><div className="font-mono">{formatMoney(total, invoice.currency)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Notes / terms editor */}
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

            {/* On-screen Preview (A4, and used for mobile PDF export) */}
            <section className="card mt-6">
              <div className="card-h"><div className="card-t">Preview (A4, print-ready)</div></div>
              <div className="card-c">
                <div className="print-area mx-auto shadow-sm">
                  <div className="print-inner mx-auto" ref={visiblePreviewRef}>
                    <PrintInvoice invoice={invoice} />
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {tab === "invoices" && (
          <section className="card">
            <div className="card-h flex items-center justify-between">
              <div className="card-t">Invoices</div>

              {/* Search + quick select */}
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
                  {filtered.slice(0, 20).map(r => (
                    <option key={r.invoiceNo} value={r.invoiceNo}>
                      {r.invoiceNo} — {r.clientName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="card-c">
              <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-100 dark:bg-neutral-800/60 text-left">
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
                        <tr key={r.invoiceNo} className="border-t border-neutral-200 dark:border-neutral-800">
                          <td className="px-3 py-2 font-mono">{r.invoiceNo}</td>
                          <td className="px-3 py-2">{r.invoiceDate}</td>
                          <td className="px-3 py-2">{r.dueDate}</td>
                          <td className="px-3 py-2">{r.clientName}</td>
                          <td className="px-3 py-2">{r.paymentStatus}</td>
                          <td className="px-3 py-2 font-mono">{formatMoney(t, r.currency || invoice.currency)}</td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex justify-end gap-2">
                              <button className="btn-sm btn-ghost-strong" title="View/Edit" onClick={() => viewToDraft(r.invoiceNo)}><Eye className="h-4 w-4" /></button>
                              <button className="btn-sm btn-danger" title="Delete" onClick={() => deleteFromDB(r.invoiceNo)}><Trash className="h-4 w-4" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr><td colSpan={7} className="px-3 py-10 text-center text-neutral-500">No matches.</td></tr>
                    )}
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

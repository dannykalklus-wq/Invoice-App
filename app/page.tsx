'use client';

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, Printer, Save, Upload, RefreshCcw, Sun, Moon, Eye, Trash, Search } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { supabase } from '../lib/supabaseClient'; // if app/page.tsx is at /app/page.tsx and lib/ is at repo root

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
  clientNumber: "",

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

/* =================== PDF / Print Component =================== */
/* Layout carefully tuned to match provided design: two-column header, bill-to left, meta tiles right (narrow),
   equal-width tiles for bank/additional/terms, centered terms, bigger logo, bold thank-you centered. */
const PrintInvoice = React.forwardRef<HTMLDivElement, { invoice: Invoice }>(
  ({ invoice }, ref) => {
    const subTotal = invoice.items.reduce((sum, it) => sum + Number(it.qty || 0) * Number(it.rate || 0), 0);
    const vat = subTotal * (Number(invoice.taxRate || 0) / 100);
    const total = subTotal - Number(invoice.discount || 0) + vat + Number(invoice.shipping || 0);

    return (
      <div
        ref={ref}
        className="print-root bg-white text-black"
        style={{
          width: "210mm",
          minHeight: "297mm",
          padding: "18mm",
          boxSizing: "border-box",
          fontFamily: "inherit",
          fontSize: 12,
        }}
      >
        {/* header: left company info + right invoice title + large logo */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 0.5 }}>{invoice.companyName}</div>
            <div style={{ marginTop: 8, lineHeight: 1.35 }}>
              {invoice.companyTin && <div>TIN: {invoice.companyTin}</div>}
              {invoice.companyAddress && <div>{invoice.companyAddress}</div>}
              {invoice.companyPhone && <div>Phone: {invoice.companyPhone}</div>}
              {invoice.companyEmail && <div>Email: {invoice.companyEmail}</div>}
            </div>
          </div>

          <div style={{ width: 260, textAlign: "right" }}>
            <div style={{ fontSize: 28, fontWeight: 800 }}>INVOICE</div>
            <div style={{ marginTop: 6 }}>
              {/* logo larger and centered in its box */}
              <div style={{ display: "inline-block", padding: 8, borderRadius: 6 }}>
                {invoice.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={invoice.logoUrl} alt="Logo" style={{ maxWidth: 200, maxHeight: 60, objectFit: "contain" }} />
                ) : (
                  <div style={{ width: 200, height: 60 }} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* spacer */}
        <div style={{ height: 22 }} />

        {/* Bill To + Meta tiles side-by-side. Meta column set to fixed width so it doesn't overflow into table.
            We'll ensure the meta column's top aligns with bill-to's top; both inside the same row. */}
        <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div style={{
              border: "1px solid #ddd",
              borderRadius: 6,
              padding: 12,
              minHeight: 110,
              boxSizing: "border-box",
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#333", marginBottom: 8 }}>BILL TO</div>
              <div style={{ fontWeight: 700 }}>{invoice.clientName}</div>
              <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{invoice.clientAddress}</div>
              <div style={{ marginTop: 6 }}>{invoice.clientEmail}</div>
              <div>{invoice.clientPhone}</div>
              {invoice.clientNumber ? <div>Client #: {invoice.clientNumber}</div> : null}
            </div>
          </div>

          {/* Meta column: fixed width and tiles stacked. */}
          <div style={{ width: 320 }}>
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 0 }}>
              {/* label tile (blueish background) and value tile (right) */}
              <div style={{ background: "#b7cfe9", padding: "10px 12px", borderTopLeftRadius: 6, borderBottomLeftRadius: 6, border: "1px solid #cfcfcf" }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Invoice No</div>
              </div>
              <div style={{ border: "1px solid #cfcfcf", padding: 10, borderTopRightRadius: 6, borderBottomRightRadius: 6 }}>
                {invoice.invoiceNo}
              </div>

              <div style={{ background: "#b7cfe9", padding: "10px 12px", border: "1px solid #cfcfcf" }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Invoice Date</div>
              </div>
              <div style={{ border: "1px solid #cfcfcf", padding: 10 }}>
                {invoice.invoiceDate}
              </div>

              <div style={{ background: "#b7cfe9", padding: "10px 12px", borderBottomLeftRadius: 6, border: "1px solid #cfcfcf" }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Due Date</div>
              </div>
              <div style={{ border: "1px solid #cfcfcf", padding: 10, borderBottomRightRadius: 6 }}>
                {invoice.dueDate}
              </div>
            </div>
          </div>
        </div>

        {/* spacer */}
        <div style={{ height: 18 }} />

        {/* Items table */}
        <div style={{ borderRadius: 6, overflow: "hidden", border: "1px solid #ddd" }}>
          <div style={{ background: "#cfcfcf", padding: "10px 12px", fontWeight: 700, display: "grid", gridTemplateColumns: "1fr 80px 140px 140px", alignItems: "center" }}>
            <div>Description</div>
            <div style={{ textAlign: "right" }}>Qty</div>
            <div style={{ textAlign: "right" }}>Price</div>
            <div style={{ textAlign: "right" }}>Total</div>
          </div>
          <div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <tbody>
                {invoice.items.map((it, i) => {
                  const amount = Number(it.qty || 0) * Number(it.rate || 0);
                  return (
                    <tr key={i} style={{ borderBottom: "1px dotted #cfcfcf" }}>
                      <td style={{ padding: "12px", verticalAlign: "top" }}>{it.description || '\u00A0'}</td>
                      <td style={{ padding: "12px", textAlign: "right", verticalAlign: "top", width: 80 }}>{it.qty}</td>
                      <td style={{ padding: "12px", textAlign: "right", verticalAlign: "top", width: 140 }}>{formatMoney(Number(it.rate || 0), invoice.currency)}</td>
                      <td style={{ padding: "12px", textAlign: "right", verticalAlign: "top", width: 140 }}>{formatMoney(amount, invoice.currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* spacer */}
        <div style={{ height: 18 }} />

        {/* Bank Details (left) and summary (right) */}
        <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div style={{ border: "1px solid #ddd", borderRadius: 6, padding: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>BANK DETAILS</div>
              <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.45 }}>{invoice.bankDetails || '—'}</div>
            </div>
          </div>

          <div style={{ width: 300 }}>
            <div style={{ border: "1px solid #ddd", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ background: "#cfcfcf", padding: "8px 10px", fontWeight: 700, textAlign: "left" }}>Summary</div>
              <div style={{ padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><div>Subtotal</div><div>{formatMoney(subTotal, invoice.currency)}</div></div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><div>Discount</div><div>{formatMoney(Number(invoice.discount || 0), invoice.currency)}</div></div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><div>VAT ({invoice.taxRate || 0}%)</div><div>{formatMoney(vat, invoice.currency)}</div></div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><div>Shipping</div><div>{formatMoney(Number(invoice.shipping || 0), invoice.currency)}</div></div>

                <div style={{ borderTop: "1px solid #ddd", paddingTop: 10, display: "flex", justifyContent: "space-between", fontWeight: 800 }}>
                  <div>Total</div>
                  <div>{formatMoney(total, invoice.currency)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* spacer */}
        <div style={{ height: 18 }} />

        {/* Bank / Additional / Terms — equal width tiles across the page, terms centered text */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div style={{ border: "1px solid #ddd", borderRadius: 6, padding: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Bank Details</div>
            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.4 }}>{invoice.bankDetails || '\u00A0'}</div>
          </div>
          <div style={{ border: "1px solid #ddd", borderRadius: 6, padding: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Additional Details</div>
            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.4 }}>{invoice.additionalDetails || '\u00A0'}</div>
          </div>
          <div style={{ border: "1px solid #ddd", borderRadius: 6, padding: 12, textAlign: "center" }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Terms &amp; Conditions</div>
            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.4, textAlign: "center" }}>{invoice.terms || '\u00A0'}</div>
          </div>
        </div>

        {/* final thank-you — bold and centered */}
        <div style={{ marginTop: 22, textAlign: "center", fontWeight: 800 }}>
          Thank you for doing business with Lexvor Group Limited
        </div>
      </div>
    );
  }
);
PrintInvoice.displayName = "PrintInvoice";

/* =================== Main App =================== */
export default function App() {
  const { dark, setDark } = useTheme();

  // Supabase safe dynamic loader (optional) - won't break builds if lib missing.
  const supabaseRef = useRef<any>(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // dynamic import so the bundler won't fail if file not present
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = await import('@/lib/supabaseClient').catch(() => null);
        if (!mounted) return;
        if (mod && mod.supabase) supabaseRef.current = mod.supabase;
      } catch (err) {
        // safe to ignore — local fallback DB used
        // console.warn('Supabase dynamic import failed', err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Currency
  const [currency, setCurrency] = useState<string>(() => {
    if (typeof window === "undefined") return "GHS";
    return localStorage.getItem("__currency") || "GHS";
  });
  useEffect(() => { localStorage.setItem("__currency", currency); }, [currency]);

  // Profile
  const [profile, setProfile] = useState<CompanyProfile>(() =>
    safeRead<CompanyProfile>("__company_profile", DEFAULT_PROFILE)
  );
  useEffect(() => { safeWrite("__company_profile", profile); }, [profile]);

  // Draft
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
  }, [profile.logoUrl, profile.companyName, profile.companyEmail, profile.companyPhone, profile.companyAddress, profile.companyTin, currency]);
  useEffect(() => { safeWrite("__invoice_draft", invoice); }, [invoice]);

  // Local DB
  const [db, setDb] = useState<Invoice[]>(() => safeRead<Invoice[]>("__invoices_db", []));
  useEffect(() => { safeWrite("__invoices_db", db); }, [db]);

  // Tabs
  const [tab, setTab] = useState<"create" | "invoices">("create");

  // Printing current draft (Create tab)
  const printRef = useRef<HTMLDivElement>(null);
  // useReactToPrint supports contentRef in certain versions; we use contentRef (compatible with earlier code)
  const handlePrintDraft = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Invoice_${invoice.invoiceNo}`
  });

  // Printing from Invoices tab (select row → print that row)
  const printRowRef = useRef<HTMLDivElement>(null);
  const [printInvoiceData, setPrintInvoiceData] = useState<Invoice | null>(null);
  const handlePrintRow = useReactToPrint({
    contentRef: printRowRef,
    documentTitle: `Invoice_${printInvoiceData?.invoiceNo || "Invoice"}`
  });

  // Totals
  const subTotal = useMemo(
    () => invoice.items.reduce((sum, it) => sum + Number(it.qty || 0) * Number(it.rate || 0), 0),
    [invoice.items]
  );
  const vat = useMemo(() => subTotal * (Number(invoice.taxRate || 0) / 100), [subTotal, invoice.taxRate]);
  const total = useMemo(
    () => subTotal - Number(invoice.discount || 0) + vat + Number(invoice.shipping || 0),
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
  const exportRowToPDF = (invoiceNo: string) => {
    const src = db.find((r) => r.invoiceNo === invoiceNo);
    if (!src) return;
    setPrintInvoiceData({ ...src });
    // wait state commit then print
    setTimeout(() => { handlePrintRow(); }, 80);
  };

  // Invoices search & select
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

  // small responsive helpers for UI only (no functionality change)
  const onChangeClientAddress = (val: string) => setInvoice({ ...invoice, clientAddress: val });

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

      {/* Tabs + content */}
      <div className="max-w-6xl mx-auto p-4">
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
              <button className="btn btn-primary" onClick={handlePrintDraft}>
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
                      <img src={profile.logoUrl} alt="Logo" className="h-12 w-28 object-contain rounded bg-white border" />
                    ) : (
                      <div className="h-12 w-28 rounded bg-neutral-200 border" />
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

            {/* Bill To */}
            <section className="card mb-6">
              <div className="card-h"><div className="card-t">Bill To</div></div>
              <div className="card-c grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="label">Client Name</label>
                  <input className="input" value={invoice.clientName} onChange={(e) => setInvoice({ ...invoice, clientName: e.target.value })} />
                  <label className="label">Client Email</label>
                  <input className="input" value={invoice.clientEmail} onChange={(e) => setInvoice({ ...invoice, clientEmail: e.target.value })} />
                  <label className="label">Client Number</label>
                  <input className="input" value={invoice.clientNumber || ''} onChange={(e) => setInvoice({ ...invoice, clientNumber: e.target.value })} />
                </div>
                <div className="space-y-3">
                  <label className="label">Client Phone</label>
                  <input className="input" value={invoice.clientPhone} onChange={(e) => setInvoice({ ...invoice, clientPhone: e.target.value })} />
                  <label className="label">Client Address</label>
                  <textarea className="textarea" rows={4} value={invoice.clientAddress} onChange={(e) => onChangeClientAddress(e.target.value)} />
                </div>
              </div>
            </section>

            {/* Items */}
            <section className="card mb-6">
              <div className="card-h"><div className="card-t">Items</div></div>
              <div className="card-c">
                <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
                  <table className="w-full text-sm">
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
                            <input className="input" placeholder="Item / service" value={it.description}
                              onChange={(e) => updateItem(i, { description: e.target.value })} />
                          </td>
                          <td className="px-3 py-2">
                            <input className="input text-right" type="number" min={0} value={it.qty}
                              onChange={(e) => updateItem(i, { qty: Number(e.target.value) })} />
                          </td>
                          <td className="px-3 py-2">
                            <input className="input text-right" type="number" step="0.01" value={it.rate}
                              onChange={(e) => updateItem(i, { rate: Number(e.target.value) })} />
                          </td>
                          <td className="px-3 py-2 text-right align-middle">
                            {formatMoney(Number(it.qty || 0) * Number(it.rate || 0), invoice.currency)}
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
                    <div className="flex justify-between text-sm py-1"><div>Subtotal</div><div>{formatMoney(subTotal, invoice.currency)}</div></div>

                    <div className="flex items-center justify-between text-sm py-1 gap-2">
                      <div className="flex items-center gap-2">
                        <span className="label !mb-0">VAT %</span>
                        <input className="input w-24" type="number" step="0.01" value={invoice.taxRate}
                          onChange={(e) => setInvoice({ ...invoice, taxRate: Number(e.target.value) })} />
                      </div>
                      <div>{formatMoney(vat, invoice.currency)}</div>
                    </div>

                    <div className="flex items-center justify-between text-sm py-1 gap-2">
                      <div className="flex items-center gap-2">
                        <span className="label !mb-0">Discount</span>
                        <input className="input w-28" type="number" step="0.01" value={invoice.discount}
                          onChange={(e) => setInvoice({ ...invoice, discount: Number(e.target.value) })} />
                      </div>
                      <div>{formatMoney(Number(invoice.discount || 0), invoice.currency)}</div>
                    </div>

                    <div className="flex items-center justify-between text-sm py-1 gap-2">
                      <div className="flex items-center gap-2">
                        <span className="label !mb-0">Shipping</span>
                        <input className="input w-28" type="number" step="0.01" value={invoice.shipping}
                          onChange={(e) => setInvoice({ ...invoice, shipping: Number(e.target.value) })} />
                      </div>
                      <div>{formatMoney(Number(invoice.shipping || 0), invoice.currency)}</div>
                    </div>

                    <div className="border-t mt-2 pt-2 flex justify-between font-semibold">
                      <div>Total</div><div>{formatMoney(total, invoice.currency)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Bank / Additional / Terms */}
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

            {/* Print area for draft (hidden) */}
            <div className="hidden">
              <div ref={printRef}><PrintInvoice invoice={invoice} /></div>
            </div>

            {/* Visible Preview */}
            <section className="card mt-6">
              <div className="card-h"><div className="card-t">Preview (A4, print-ready)</div></div>
              <div className="card-c">
                <div className="bg-white mx-auto shadow-sm" style={{ width: "210mm" }}>
                  <div className="mx-auto" style={{ width: "190mm" }}>
                    <PrintInvoice invoice={invoice} />
                  </div>
                </div>
                <style>{`
                  @page { size: A4; margin: 16mm; }
                  @media print { html, body { background: white !important; } }
                  /* small responsive adjustments for the preview iframe-like view */
                  @media (max-width: 900px) {
                    .print-root { width: 100% !important; padding: 12px !important; box-sizing: border-box; }
                  }
                `}</style>
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
                      const sub = r.items.reduce((s, i) => s + Number(i.qty || 0) * Number(i.rate || 0), 0);
                      const v = sub * (Number(r.taxRate || 0) / 100);
                      const t = sub - Number(r.discount || 0) + v + Number(r.shipping || 0);
                      return (
                        <tr key={r.invoiceNo} className="border-t border-neutral-200 dark:border-neutral-800">
                          <td className="px-3 py-2 font-mono">{r.invoiceNo}</td>
                          <td className="px-3 py-2">{r.invoiceDate}</td>
                          <td className="px-3 py-2">{r.dueDate}</td>
                          <td className="px-3 py-2">{r.clientName}</td>
                          <td className="px-3 py-2">{r.paymentStatus}</td>
                          <td className="px-3 py-2">{formatMoney(t, r.currency || invoice.currency)}</td>
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
                      <tr><td colSpan={7} className="px-3 py-10 text-center text-neutral-500">No matches.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Hidden print area for selected row */}
            <div className="hidden">
              <div ref={printRowRef}>{printInvoiceData && <PrintInvoice invoice={printInvoiceData} />}</div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

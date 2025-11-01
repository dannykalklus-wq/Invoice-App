'use client';

export const dynamic = 'force-dynamic'; // ensure client-only rendering on Vercel

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, Printer, Save, Upload, RefreshCcw } from "lucide-react";
import { useReactToPrint } from "react-to-print";

type Item = { description: string; qty: number; rate: number };

type CompanyProfile = {
  logoUrl: string;         // Base64 data URL (persisted)
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  companyTin: string;
};

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

  // snapshot (copied from profile when editing)
  logoUrl: string;
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  companyTin: string;

  taxRate: number;
  discount: number;
  shipping: number;
};

/* -------------------------
   Safe localStorage helpers
------------------------- */
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
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

/* -------------------------
   Defaults
------------------------- */
const DEFAULT_PROFILE: CompanyProfile = {
  logoUrl: "",
  companyName: "Lexvor Group Ltd",
  companyEmail: "",
  companyPhone: "",
  companyAddress: "",
  companyTin: "",
};

const newInvoiceFromProfile = (p: CompanyProfile): Invoice => ({
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
});

export default function InvoiceApp() {
  /* -------------------------
     Load & persist Profile
  ------------------------- */
  const [profile, setProfile] = useState<CompanyProfile>(() =>
    safeRead<CompanyProfile>("__company_profile", DEFAULT_PROFILE)
  );

  // Persist profile
  useEffect(() => {
    safeWrite("__company_profile", profile);
  }, [profile]);

  /* -------------------------
     Load & persist Invoice
  ------------------------- */
  const [invoice, setInvoice] = useState<Invoice>(() =>
    safeRead<Invoice>("__invoice_draft", newInvoiceFromProfile(profile))
  );

  // Persist invoice
  useEffect(() => {
    safeWrite("__invoice_draft", invoice);
  }, [invoice]);

  // Sync invoice's company snapshot when profile changes (non-destructive)
  useEffect(() => {
    setInvoice((inv) => ({
      ...inv,
      logoUrl: profile.logoUrl || inv.logoUrl,
      companyName: profile.companyName || inv.companyName,
      companyEmail: profile.companyEmail || inv.companyEmail,
      companyPhone: profile.companyPhone || inv.companyPhone,
      companyAddress: profile.companyAddress || inv.companyAddress,
      companyTin: profile.companyTin || inv.companyTin,
    }));
  }, [profile.logoUrl, profile.companyName, profile.companyEmail, profile.companyPhone, profile.companyAddress, profile.companyTin]);

  /* -------------------------
     Print / PDF
  ------------------------- */
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Invoice_${invoice.invoiceNo}`,
  });

  /* -------------------------
     Logo upload -> persist profile
  ------------------------- */
  const onLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const logoUrl = String(reader.result || "");
      setProfile((p) => ({ ...p, logoUrl }));
    };
    reader.readAsDataURL(file);
  };

  /* -------------------------
     Items / Totals
  ------------------------- */
  const addItem = () =>
    setInvoice((s) => ({ ...s, items: [...s.items, { description: "", qty: 1, rate: 0 }] }));

  const updateItem = (i: number, patch: Partial<Item>) =>
    setInvoice((s) => {
      const items = s.items.slice();
      items[i] = { ...items[i], ...patch };
      return { ...s, items };
    });

  const removeItem = (i: number) =>
    setInvoice((s) => ({ ...s, items: s.items.filter((_, k) => k !== i) }));

  const subTotal = useMemo(
    () => invoice.items.reduce((sum, it) => sum + Number(it.qty || 0) * Number(it.rate || 0), 0),
    [invoice.items]
  );
  const vat = useMemo(() => subTotal * (Number(invoice.taxRate || 0) / 100), [subTotal, invoice.taxRate]);
  const total = useMemo(
    () => subTotal - Number(invoice.discount || 0) + vat + Number(invoice.shipping || 0),
    [subTotal, vat, invoice.discount, invoice.shipping]
  );

  const resetToProfile = () => setInvoice(newInvoiceFromProfile(profile));

  /* -------------------------
     UI
  ------------------------- */
  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-neutral-900/90 backdrop-blur border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap gap-2 items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Invoice System</h1>
          <div className="flex flex-wrap gap-2">
            <button className="btn" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" /> Export to PDF
            </button>
            <button className="btn" onClick={() => safeWrite("__invoice_draft", invoice)}>
              <Save className="h-4 w-4 mr-2" /> Save Draft
            </button>
            <button className="btn" onClick={resetToProfile} title="Reset invoice fields from Company Profile">
              <RefreshCcw className="h-4 w-4 mr-2" /> Reset from Profile
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 grid xl:grid-cols-3 gap-6">
        {/* Company Profile */}
        <section className="card xl:col-span-2">
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

              <div className="space-y-2">
                <label className="label">Logo</label>
                <div className="flex items-center gap-3">
                  <label className="btn cursor-pointer">
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
          </div>
        </section>

        {/* Invoice Meta */}
        <section className="card">
          <div className="card-h"><div className="card-t">Invoice Settings</div></div>
          <div className="card-c grid md:grid-cols-3 gap-3">
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
          </div>
        </section>

        {/* Client */}
        <section className="card xl:col-span-2">
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
        <section className="card xl:col-span-3">
          <div className="card-h"><div className="card-t">Items</div></div>
          <div className="card-c">
            <div className="overflow-hidden rounded-lg border border-neutral-200">
              <table className="w-full text-sm">
                <thead className="bg-neutral-100 text-left">
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
                    <tr key={i} className="border-t">
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
                      <td className="px-3 py-2 text-right align-middle">{(Number(it.qty || 0) * Number(it.rate || 0)).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">
                        <button className="btn-sm" onClick={() => removeItem(i)}><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between mt-3">
              <button className="btn" onClick={addItem}><Plus className="h-4 w-4 mr-2" /> Add Item</button>
              <div className="w-80 space-y-2">
                <div className="flex justify-between text-sm py-1"><div>Subtotal</div><div>{subTotal.toFixed(2)}</div></div>

                <div className="flex items-center justify-between text-sm py-1 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="label !mb-0">VAT %</span>
                    <input className="input w-24" type="number" step="0.01" value={invoice.taxRate}
                      onChange={(e) => setInvoice({ ...invoice, taxRate: Number(e.target.value) })} />
                  </div>
                  <div>{vat.toFixed(2)}</div>
                </div>

                <div className="flex items-center justify-between text-sm py-1 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="label !mb-0">Discount</span>
                    <input className="input w-28" type="number" step="0.01" value={invoice.discount}
                      onChange={(e) => setInvoice({ ...invoice, discount: Number(e.target.value) })} />
                  </div>
                  <div>{Number(invoice.discount || 0).toFixed(2)}</div>
                </div>

                <div className="flex items-center justify-between text-sm py-1 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="label !mb-0">Shipping</span>
                    <input className="input w-28" type="number" step="0.01" value={invoice.shipping}
                      onChange={(e) => setInvoice({ ...invoice, shipping: Number(e.target.value) })} />
                  </div>
                  <div>{Number(invoice.shipping || 0).toFixed(2)}</div>
                </div>

                <div className="border-t mt-2 pt-2 flex justify-between font-semibold">
                  <div>Total</div><div>{total.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bank / Additional / Terms */}
        <section className="card xl:col-span-3">
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

        {/* Print Preview (A4) */}
        <section className="card xl:col-span-3">
          <div className="card-h"><div className="card-t">Preview (A4, print-ready)</div></div>
          <div className="card-c">
            <div className="bg-white mx-auto shadow-sm preview-a4">
              <div className="mx-auto" style={{ width: "190mm" }}>
                <div ref={printRef}>
                  {/* Printable content (clean, no UI controls) */}
                  <div className="bg-white text-black p-8">
                    <div className="flex items-start justify-between gap-6">
                      <div className="flex items-center gap-4">
                        {invoice.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={invoice.logoUrl} alt="Logo" className="h-16 w-16 object-contain" />
                        ) : (
                          <div className="h-16 w-16 rounded bg-neutral-200" />
                        )}
                        <div>
                          <div className="text-xl font-semibold">{invoice.companyName}</div>
                          <div className="text-sm whitespace-pre-wrap">{invoice.companyAddress}</div>
                          <div className="text-sm">{invoice.companyEmail}</div>
                          <div className="text-sm">{invoice.companyPhone}</div>
                          {invoice.companyTin && <div className="text-sm">TIN: {invoice.companyTin}</div>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold tracking-tight">INVOICE</div>
                        <div className="mt-2 text-sm">Invoice No: <span className="font-medium">{invoice.invoiceNo}</span></div>
                        <div className="text-sm">Invoice Date: {invoice.invoiceDate}</div>
                        <div className="text-sm">Due Date: {invoice.dueDate}</div>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-6">
                      <div>
                        <div className="text-sm font-semibold">Bill To</div>
                        <div className="mt-1 font-medium">{invoice.clientName}</div>
                        <div className="text-sm">Phone: {invoice.clientPhone}</div>
                        <div className="text-sm">{invoice.clientEmail}</div>
                        <div className="text-sm whitespace-pre-wrap">{invoice.clientAddress}</div>
                      </div>
                    </div>

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
                              <td className="px-3 py-2 text-right">{Number(it.rate || 0).toFixed(2)}</td>
                              <td className="px-3 py-2 text-right">{(Number(it.qty || 0) * Number(it.rate || 0)).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-6">
                      <div className="text-sm space-y-4">
                        {invoice.bankDetails ? (
                          <div>
                            <div className="font-semibold">Bank Details</div>
                            <div className="whitespace-pre-wrap mt-1">{invoice.bankDetails}</div>
                          </div>
                        ) : null}
                        {invoice.additionalDetails ? (
                          <div>
                            <div className="font-semibold">Additional Details</div>
                            <div className="whitespace-pre-wrap mt-1">{invoice.additionalDetails}</div>
                          </div>
                        ) : null}
                        {invoice.terms ? (
                          <div>
                            <div className="font-semibold">Terms &amp; Conditions</div>
                            <div className="whitespace-pre-wrap mt-1">{invoice.terms}</div>
                          </div>
                        ) : null}
                      </div>
                      <div className="justify-self-end w-64">
                        <div className="flex justify-between text-sm py-1"><div>Subtotal</div><div>{subTotal.toFixed(2)}</div></div>
                        <div className="flex justify-between text-sm py-1"><div>Discount</div><div>{Number(invoice.discount || 0).toFixed(2)}</div></div>
                        <div className="flex justify-between text-sm py-1"><div>VAT ({invoice.taxRate || 0}%)</div><div>{vat.toFixed(2)}</div></div>
                        <div className="flex justify-between text-sm py-1"><div>Shipping</div><div>{Number(invoice.shipping || 0).toFixed(2)}</div></div>
                        <div className="border-t mt-2 pt-2 flex justify-between font-semibold"><div>Total</div><div>{total.toFixed(2)}</div></div>
                      </div>
                    </div>

                    <div className="mt-8 text-center text-sm italic">Thank you for doing business with Lexvor Group Limited</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Print CSS */}
            <style>{`
              .preview-a4 { width: 210mm; }
              @page { size: A4; margin: 16mm; }
              @media print {
                html, body { background: white !important; }
                .no-print { display: none !important; }
                .avoid-break { break-inside: avoid; page-break-inside: avoid; }
                table { page-break-inside: auto; }
                tr { page-break-inside: avoid; page-break-after: auto; }
              }
            `}</style>
          </div>
        </section>
      </div>
    </main>
  );
}

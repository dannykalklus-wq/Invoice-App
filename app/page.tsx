'use client';

export const dynamic = 'force-dynamic'; // ✅ prevent SSR from running localStorage

import React, { useMemo, useRef, useState, useEffect } from "react";
import { Sun, Moon, Plus, Save, Trash2, Printer, Upload, Download } from "lucide-react";
import { useReactToPrint } from "react-to-print";

console.log("🚀 Invoice app page initialized");

// Safe localStorage helpers
function safeGetItem(key: string, fallback: any = null) {
  if (typeof window === "undefined") return fallback;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch (e) {
    console.error("❌ Error reading localStorage", e);
    return fallback;
  }
}

function safeSetItem(key: string, value: any) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("❌ Error writing localStorage", e);
  }
}

const cls = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");

const Button = ({ children, className = "", ...rest }: any) => (
  <button
    {...rest}
    className={cls(
      "px-4 py-2 rounded-xl border text-sm font-medium transition no-print",
      "border-neutral-300 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800",
      className
    )}
  >
    {children}
  </button>
);

const Input = (props: any) => (
  <input
    {...props}
    className={cls(
      "w-full rounded-xl border px-3 py-2",
      "border-neutral-300 bg-white text-black dark:border-neutral-700 dark:bg-neutral-900 dark:text-white",
      props.className
    )}
  />
);

const TextArea = (props: any) => (
  <textarea
    {...props}
    rows={props.rows || 3}
    className={cls(
      "w-full rounded-xl border px-3 py-2 resize-y",
      "border-neutral-300 bg-white text-black dark:border-neutral-700 dark:bg-neutral-900 dark:text-white",
      props.className
    )}
  />
);

const Label = ({ children }: any) => (
  <label className="block text-sm font-medium mb-1 text-neutral-700 dark:text-neutral-200">{children}</label>
);

type Item = { description: string; qty: number; rate: number };
type Invoice = {
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  clientEmail: string;
  items: Item[];
  bankDetails: string;
  additionalDetails: string;
  terms: string;
  logoUrl: string;
  companyName: string;
  companyAddress: string;
  companyEmail: string;
  companyPhone: string;
  companyTin: string;
  taxRate: number;
  discount: number;
  shipping: number;
};

export default function App() {
  console.log("🧠 App component mounted");

  const [invoice, setInvoice] = useState<Invoice>(() => {
    console.log("📦 Initializing invoice state...");
    const stored = safeGetItem("invoice");
    return (
      stored || {
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
        logoUrl: "",
        companyName: "Lexvor Group Ltd",
        companyAddress: "",
        companyEmail: "",
        companyPhone: "",
        companyTin: "",
        taxRate: 0,
        discount: 0,
        shipping: 0,
      }
    );
  });

  useEffect(() => {
    console.log("💾 Saving invoice to localStorage");
    safeSetItem("invoice", invoice);
  }, [invoice]);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      console.log("🖼️ Logo uploaded");
      setInvoice({ ...invoice, logoUrl: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const addItem = () => {
    console.log("➕ Adding new item");
    setInvoice((i) => ({ ...i, items: [...i.items, { description: "", qty: 1, rate: 0 }] }));
  };

  const subTotal = invoice.items.reduce((s, i) => s + i.qty * i.rate, 0);
  const vat = subTotal * (invoice.taxRate / 100);
  const total = subTotal - invoice.discount + vat + invoice.shipping;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50 p-4">
      <h1 className="text-2xl font-bold mb-4">Invoice System</h1>

      <div className="flex flex-wrap gap-3 mb-6">
        <Button onClick={handlePrint}><Printer className="h-4 w-4 inline mr-2" /> Print PDF</Button>
        <Button onClick={() => console.log('💾 Invoice saved:', invoice)}><Save className="h-4 w-4 inline mr-2" /> Save</Button>
        <label className="cursor-pointer">
          <Upload className="h-4 w-4 inline mr-2" /> Upload Logo
          <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
        </label>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label>Company Name</Label>
          <Input value={invoice.companyName} onChange={(e) => setInvoice({ ...invoice, companyName: e.target.value })} />
          <Label>Company Email</Label>
          <Input value={invoice.companyEmail} onChange={(e) => setInvoice({ ...invoice, companyEmail: e.target.value })} />
          <Label>Company Phone</Label>
          <Input value={invoice.companyPhone} onChange={(e) => setInvoice({ ...invoice, companyPhone: e.target.value })} />
        </div>

        <div>
          <Label>Client Name</Label>
          <Input value={invoice.clientName} onChange={(e) => setInvoice({ ...invoice, clientName: e.target.value })} />
          <Label>Client Phone</Label>
          <Input value={invoice.clientPhone} onChange={(e) => setInvoice({ ...invoice, clientPhone: e.target.value })} />
          <Label>Client Email</Label>
          <Input value={invoice.clientEmail} onChange={(e) => setInvoice({ ...invoice, clientEmail: e.target.value })} />
        </div>
      </div>

      <div className="mt-6">
        <h2 className="font-semibold mb-2">Items</h2>
        {invoice.items.map((it, i) => (
          <div key={i} className="grid grid-cols-4 gap-2 mb-2">
            <Input placeholder="Description" value={it.description} onChange={(e) => {
              const items = [...invoice.items];
              items[i].description = e.target.value;
              setInvoice({ ...invoice, items });
            }} />
            <Input type="number" placeholder="Qty" value={it.qty} onChange={(e) => {
              const items = [...invoice.items];
              items[i].qty = +e.target.value;
              setInvoice({ ...invoice, items });
            }} />
            <Input type="number" placeholder="Rate" value={it.rate} onChange={(e) => {
              const items = [...invoice.items];
              items[i].rate = +e.target.value;
              setInvoice({ ...invoice, items });
            }} />
            <div className="flex items-center justify-between">
              <span>{(it.qty * it.rate).toFixed(2)}</span>
              <Button size="sm" onClick={() => {
                const items = invoice.items.filter((_, k) => k !== i);
                setInvoice({ ...invoice, items });
              }}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
        <Button onClick={addItem}><Plus className="h-4 w-4 mr-2 inline" /> Add Item</Button>
      </div>

      <div className="mt-6">
        <Label>Bank Details</Label>
        <TextArea value={invoice.bankDetails} onChange={(e) => setInvoice({ ...invoice, bankDetails: e.target.value })} />
        <Label>Additional Details</Label>
        <TextArea value={invoice.additionalDetails} onChange={(e) => setInvoice({ ...invoice, additionalDetails: e.target.value })} />
        <Label>Terms & Conditions</Label>
        <TextArea value={invoice.terms} onChange={(e) => setInvoice({ ...invoice, terms: e.target.value })} />
      </div>

      <div className="mt-6 border-t pt-3">
        <p>Subtotal: {subTotal.toFixed(2)}</p>
        <p>Discount: {invoice.discount.toFixed(2)}</p>
        <p>VAT ({invoice.taxRate}%): {vat.toFixed(2)}</p>
        <p>Shipping: {invoice.shipping.toFixed(2)}</p>
        <h3 className="text-lg font-semibold">Total: {total.toFixed(2)}</h3>
      </div>

      <div ref={printRef} className="hidden print:block">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-2">{invoice.companyName}</h1>
          <p>{invoice.companyEmail}</p>
          <p>{invoice.companyPhone}</p>
          <p>{invoice.companyAddress}</p>
          <h2 className="mt-4 text-xl font-semibold">Invoice #{invoice.invoiceNo}</h2>
          <p>Date: {invoice.invoiceDate}</p>
          <p>Due: {invoice.dueDate}</p>
          <hr className="my-3" />
          <p><strong>Client:</strong> {invoice.clientName} ({invoice.clientPhone})</p>
          <p>{invoice.clientEmail}</p>
          <hr className="my-3" />
          <h3 className="font-semibold">Items</h3>
          {invoice.items.map((it, i) => (
            <p key={i}>{it.description} — {it.qty} × {it.rate} = {(it.qty * it.rate).toFixed(2)}</p>
          ))}
          <hr className="my-3" />
          <p>Subtotal: {subTotal.toFixed(2)}</p>
          <p>Discount: {invoice.discount.toFixed(2)}</p>
          <p>VAT: {vat.toFixed(2)}</p>
          <p>Shipping: {invoice.shipping.toFixed(2)}</p>
          <h3 className="font-semibold">Total: {total.toFixed(2)}</h3>
          <hr className="my-3" />
          <p><strong>Bank Details:</strong><br />{invoice.bankDetails}</p>
          <p><strong>Additional Details:</strong><br />{invoice.additionalDetails}</p>
          <p><strong>Terms & Conditions:</strong><br />{invoice.terms}</p>
          <p className="mt-6 italic text-center">Thank you for doing business with Lexvor Group Limited</p>
        </div>
      </div>
    </div>
  );
}

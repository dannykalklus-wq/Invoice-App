'use client'

import React, { useMemo, useRef, useState, useEffect } from "react";
import { Sun, Moon, Plus, Save, Trash2, Search, Printer, Copy, Upload, Download } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { createClient } from "@supabase/supabase-js";

/* =========================
   Supabase (optional)
========================= */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

/* =========================
   UI helpers
========================= */
const cls = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");

const Button = ({ className, variant = "solid", size = "md", children, ...rest }: any) => {
  const base = "inline-flex items-center justify-center rounded-xl transition border no-print";
  const sizes = size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2";
  const variants =
    variant === "solid"
      ? "bg-black text-white border-transparent hover:opacity-90 dark:bg-white dark:text-black"
      : variant === "outline"
      ? "bg-transparent text-black border-neutral-300 hover:bg-neutral-100 dark:text-white dark:border-neutral-700 dark:hover:bg-neutral-800"
      : "bg-transparent text-black border-transparent hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-800";
  return (
    <button className={cls(base, sizes, variants, className)} {...rest}>
      {children}
    </button>
  );
};

const Input = (props: any) => (
  <input
    {...props}
    className={cls(
      "w-full rounded-xl border px-3 py-2",
      "border-neutral-300 bg-white text-black",
      "dark:border-neutral-700 dark:bg-neutral-900 dark:text-white",
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
      "border-neutral-300 bg-white text-black",
      "dark:border-neutral-700 dark:bg-neutral-900 dark:text-white",
      props.className
    )}
  />
);

const Label = ({ children, className, ...rest }: any) => (
  <label className={cls("block text-sm font-medium mb-1 text-neutral-700 dark:text-neutral-200", className)} {...rest}>
    {children}
  </label>
);

const Card = ({ className, children }: any) => (
  <div className={cls("rounded-2xl border border-neutral-200 bg-white text-black dark:border-neutral-800 dark:bg-neutral-900 dark:text-white", className)}>{children}</div>
);
const CardHeader = ({ children }: any) => <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">{children}</div>;
const CardTitle = ({ children }: any) => <div className="text-lg font-semibold">{children}</div>;
const CardContent = ({ className, children }: any) => <div className={cls("p-4", className)}>{children}</div>;

/* =========================
   Theme
========================= */
const useDarkMode = () => {
  const [dark, setDark] = useState(() => typeof window !== "undefined" && localStorage.getItem("theme") === "dark");
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);
  return { dark, setDark };
};

/* =========================
   Types
========================= */
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

const defaultProfile = {
  logoUrl: "",
  companyName: "LEXVOR GROUP LTD",
  companyAddress: "",
  companyEmail: "",
  companyPhone: "",
  companyTin: "",
};

const emptyItem = { description: "", qty: 1, rate: 0 };

/* =========================
   Database Hook (local)
========================= */
const useDB = () => {
  const [rows, setRows] = useState<any[]>(() => JSON.parse(localStorage.getItem("invoices") || "[]"));
  useEffect(() => localStorage.setItem("invoices", JSON.stringify(rows)), [rows]);

  const add = (invoice: Invoice) => {
    setRows((r) => [invoice, ...r.filter((x) => x.invoiceNo !== invoice.invoiceNo)]);
  };
  return { rows, add };
};

/* =========================
   Print Invoice (A4)
========================= */
const PrintInvoice = React.forwardRef<HTMLDivElement, { invoice: Invoice }>(({ invoice }, ref) => {
  const subTotal = invoice.items.reduce((s, i) => s + i.qty * i.rate, 0);
  const vat = subTotal * (invoice.taxRate / 100);
  const total = subTotal - invoice.discount + vat + invoice.shipping;

  return (
    <div ref={ref} className="bg-white text-black p-8 max-w-[190mm] mx-auto print-area">
      <div className="flex justify-between items-start">
        <div className="flex gap-4">
          {invoice.logoUrl ? <img src={invoice.logoUrl} alt="Logo" className="h-16 w-16 object-contain" /> : <div className="h-16 w-16 bg-gray-200" />}
          <div>
            <div className="text-xl font-semibold">{invoice.companyName}</div>
            <div className="text-sm whitespace-pre-wrap">{invoice.companyAddress}</div>
            <div className="text-sm">{invoice.companyEmail}</div>
            <div className="text-sm">{invoice.companyPhone}</div>
            <div className="text-sm">TIN: {invoice.companyTin}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold">INVOICE</div>
          <div className="mt-1 text-sm">Invoice No: {invoice.invoiceNo}</div>
          <div className="text-sm">Invoice Date: {invoice.invoiceDate}</div>
          <div className="text-sm">Due Date: {invoice.dueDate}</div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6">
        <div>
          <div className="font-semibold text-sm">Bill To</div>
          <div className="mt-1 font-medium">{invoice.clientName}</div>
          <div className="text-sm">Phone: {invoice.clientPhone}</div>
          <div className="text-sm">{invoice.clientEmail}</div>
          <div className="text-sm whitespace-pre-wrap">{invoice.clientAddress}</div>
        </div>
      </div>

      <div className="mt-6 border rounded">
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
              <tr key={i} className="border-t">
                <td className="px-3 py-2">{it.description}</td>
                <td className="px-3 py-2 text-right">{it.qty}</td>
                <td className="px-3 py-2 text-right">{it.rate.toFixed(2)}</td>
                <td className="px-3 py-2 text-right">{(it.qty * it.rate).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6">
        <div className="text-sm space-y-4">
          <div>
            <div className="font-semibold">Bank Details</div>
            <div className="whitespace-pre-wrap mt-1">{invoice.bankDetails}</div>
          </div>
          <div>
            <div className="font-semibold">Additional Details</div>
            <div className="whitespace-pre-wrap mt-1">{invoice.additionalDetails}</div>
          </div>
          <div>
            <div className="font-semibold">Terms & Conditions</div>
            <div className="whitespace-pre-wrap mt-1">{invoice.terms}</div>
          </div>
        </div>

        <div className="justify-self-end w-64">
          <div className="flex justify-between text-sm py-1"><div>Subtotal</div><div>{subTotal.toFixed(2)}</div></div>
          <div className="flex justify-between text-sm py-1"><div>Discount</div><div>{invoice.discount.toFixed(2)}</div></div>
          <div className="flex justify-between text-sm py-1"><div>VAT ({invoice.taxRate}%)</div><div>{vat.toFixed(2)}</div></div>
          <div className="flex justify-between text-sm py-1"><div>Shipping</div><div>{invoice.shipping.toFixed(2)}</div></div>
          <div className="border-t mt-2 pt-2 flex justify-between font-semibold"><div>Total</div><div>{total.toFixed(2)}</div></div>
        </div>
      </div>

      <div className="mt-8 text-center text-sm italic">Thank you for doing business with Lexvor Group Limited</div>
    </div>
  );
});
PrintInvoice.displayName = "PrintInvoice";

/* =========================
   Main App
========================= */
export default function App() {
  const { dark, setDark } = useDarkMode();
  const [profile, setProfile] = useState(defaultProfile);
  const [invoice, setInvoice] = useState<Invoice>({
    invoiceNo: "INV-0001",
    invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    clientAddress: "",
    items: [{ ...emptyItem }],
    bankDetails: "",
    additionalDetails: "",
    terms: "",
    logoUrl: "",
    companyName: profile.companyName,
    companyAddress: profile.companyAddress,
    companyEmail: profile.companyEmail,
    companyPhone: profile.companyPhone,
    companyTin: profile.companyTin,
    taxRate: 0,
    discount: 0,
    shipping: 0,
  });

  const db = useDB();
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setInvoice({ ...invoice, logoUrl: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const addItem = () => setInvoice((i) => ({ ...i, items: [...i.items, { ...emptyItem }] }));

  const saveInvoice = () => {
    db.add(invoice);
    alert("Invoice saved to local database!");
  };

  const exportDB = () => {
    const blob = new Blob([JSON.stringify(db.rows, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "invoices.json";
    a.click();
  };

  const importDB = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const imported = JSON.parse(reader.result as string);
          if (Array.isArray(imported)) {
            localStorage.setItem("invoices", JSON.stringify(imported));
            alert("Invoices imported successfully!");
            location.reload();
          }
        } catch {
          alert("Invalid file.");
        }
      };
      reader.readAsText(file);
    }
  };

  const subTotal = invoice.items.reduce((s, i) => s + i.qty * i.rate, 0);
  const vat = subTotal * (invoice.taxRate / 100);
  const total = subTotal - invoice.discount + vat + invoice.shipping;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50">
      <div className="flex justify-between items-center px-4 py-3 border-b bg-white dark:bg-neutral-900">
        <div className="text-lg font-semibold">Invoice System</div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => setDark(!dark)}>{dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</Button>
          <Button onClick={handlePrint}><Printer className="h-4 w-4 mr-2" /> Print PDF</Button>
          <Button onClick={saveInvoice}><Save className="h-4 w-4 mr-2" /> Save</Button>
          <Button onClick={exportDB}><Download className="h-4 w-4 mr-2" /> Export</Button>
          <label className="cursor-pointer">
            <Upload className="h-4 w-4 mr-2 inline" /> Import
            <input type="file" className="hidden" accept=".json" onChange={importDB} />
          </label>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 grid xl:grid-cols-3 gap-6">
        {/* Company and client */}
        <Card className="xl:col-span-2">
          <CardHeader><CardTitle>Company & Client</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label>Upload Logo</Label>
                <input type="file" accept="image/*" onChange={handleLogoUpload} />
              </div>
              <div>
                <Label>Company Name</Label>
                <Input value={invoice.companyName} onChange={(e) => setInvoice({ ...invoice, companyName: e.target.value })} />
              </div>
              <div><Label>Email</Label><Input value={invoice.companyEmail} onChange={(e) => setInvoice({ ...invoice, companyEmail: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={invoice.companyPhone} onChange={(e) => setInvoice({ ...invoice, companyPhone: e.target.value })} /></div>
              <div><Label>Address</Label><TextArea value={invoice.companyAddress} onChange={(e) => setInvoice({ ...invoice, companyAddress: e.target.value })} /></div>
              <div><Label>TIN</Label><Input value={invoice.companyTin} onChange={(e) => setInvoice({ ...invoice, companyTin: e.target.value })} /></div>
            </div>

            <div className="border-t my-3"></div>

            <div className="grid md:grid-cols-2 gap-3">
              <div><Label>Client Name</Label><Input value={invoice.clientName} onChange={(e) => setInvoice({ ...invoice, clientName: e.target.value })} /></div>
              <div><Label>Client Phone</Label><Input value={invoice.clientPhone} onChange={(e) => setInvoice({ ...invoice, clientPhone: e.target.value })} /></div>
              <div><Label>Client Email</Label><Input value={invoice.clientEmail} onChange={(e) => setInvoice({ ...invoice, clientEmail: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Client Address</Label><TextArea value={invoice.clientAddress} onChange={(e) => setInvoice({ ...invoice, clientAddress: e.target.value })} /></div>
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader><CardTitle>Invoice Details</CardTitle></CardHeader>
          <CardContent>
            <Label>Invoice No</Label>
            <Input value={invoice.invoiceNo} onChange={(e) => setInvoice({ ...invoice, invoiceNo: e.target.value })} />
            <Label>Invoice Date</Label>
            <Input type="date" value={invoice.invoiceDate} onChange={(e) => setInvoice({ ...invoice, invoiceDate: e.target.value })} />
            <Label>Due Date</Label>
            <Input type="date" value={invoice.dueDate} onChange={(e) => setInvoice({ ...invoice, dueDate: e.target.value })} />
          </CardContent>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader><CardTitle>Items</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="bg-neutral-100">
                <tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th><th></th></tr>
              </thead>
              <tbody>
                {invoice.items.map((it, i) => (
                  <tr key={i}>
                    <td><Input value={it.description} onChange={(e) => { const items = [...invoice.items]; items[i].description = e.target.value; setInvoice({ ...invoice, items }); }} /></td>
                    <td><Input type="number" value={it.qty} onChange={(e) => { const items = [...invoice.items]; items[i].qty = +e.target.value; setInvoice({ ...invoice, items }); }} /></td>
                    <td><Input type="number" value={it.rate} onChange={(e) => { const items = [...invoice.items]; items[i].rate = +e.target.value; setInvoice({ ...invoice, items }); }} /></td>
                    <td className="text-right">{(it.qty * it.rate).toFixed(2)}</td>
                    <td><Button size="sm" variant="ghost" onClick={() => setInvoice({ ...invoice, items: invoice.items.filter((_, k) => k !== i) })}><Trash2 className="h-4 w-4" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Button variant="outline" className="mt-3" onClick={addItem}><Plus className="h-4 w-4 mr-2" /> Add Item</Button>

            <div className="mt-4 flex flex-col items-end gap-2 w-full">
              <div>Subtotal: {subTotal.toFixed(2)}</div>
              <div>Discount: <Input type="number" value={invoice.discount} onChange={(e) => setInvoice({ ...invoice, discount: +e.target.value })} className="w-28 inline ml-2" /></div>
              <div>VAT %: <Input type="number" value={invoice.taxRate} onChange={(e) => setInvoice({ ...invoice, taxRate: +e.target.value })} className="w-20 inline ml-2" /></div>
              <div>Shipping: <Input type="number" value={invoice.shipping} onChange={(e) => setInvoice({ ...invoice, shipping: +e.target.value })} className="w-28 inline ml-2" /></div>
              <div className="font-bold">Total: {total.toFixed(2)}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader><CardTitle>Bank Details, Additional Info & Terms</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-3">
            <div><Label>Bank Details</Label><TextArea value={invoice.bankDetails} onChange={(e) => setInvoice({ ...invoice, bankDetails: e.target.value })} /></div>
            <div><Label>Additional Details</Label><TextArea value={invoice.additionalDetails} onChange={(e) => setInvoice({ ...invoice, additionalDetails: e.target.value })} /></div>
            <div><Label>Terms & Conditions</Label><TextArea value={invoice.terms} onChange={(e) => setInvoice({ ...invoice, terms: e.target.value })} /></div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader><CardTitle>Preview (PDF)</CardTitle></CardHeader>
          <CardContent>
            <div className="bg-white p-4 shadow-sm mx-auto" style={{ width: "210mm" }}>
              <div ref={printRef}>
                <PrintInvoice invoice={invoice} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

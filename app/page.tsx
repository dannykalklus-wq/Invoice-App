'use client'

import React, { useMemo, useRef, useState, useEffect } from "react";
import { Sun, Moon, Plus, Save, Trash2, Search, Printer, Copy } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { createClient } from "@supabase/supabase-js";

/* =========================
   Supabase (optional)
========================= */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

/* =========================
   Tiny UI helpers (Tailwind)
========================= */
const cls = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "solid" | "outline" | "ghost";
  size?: "sm" | "md";
};
const Button: React.FC<ButtonProps> = ({ className, variant = "solid", size = "md", children, ...rest }) => {
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

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className, ...rest }) => (
  <input
    className={cls(
      "w-full rounded-xl border px-3 py-2",
      "border-neutral-300 bg-white text-black",
      "dark:border-neutral-700 dark:bg-neutral-900 dark:text-white",
      className
    )}
    {...rest}
  />
);

const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({ className, rows = 3, ...rest }) => (
  <textarea
    rows={rows}
    className={cls(
      "w-full rounded-xl border px-3 py-2 resize-y",
      "border-neutral-300 bg-white text-black",
      "dark:border-neutral-700 dark:bg-neutral-900 dark:text-white",
      className
    )}
    {...rest}
  />
);

const Label: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = ({ className, children, ...rest }) => (
  <label className={cls("block text-sm font-medium mb-1 text-neutral-700 dark:text-neutral-200", className)} {...rest}>
    {children}
  </label>
);

const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...rest }) => (
  <div
    className={cls(
      "rounded-2xl border",
      "border-neutral-200 bg-white text-black",
      "dark:border-neutral-800 dark:bg-neutral-900 dark:text-white",
      className
    )}
    {...rest}
  >
    {children}
  </div>
);

const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...rest }) => (
  <div className={cls("px-4 py-3 border-b border-neutral-200 dark:border-neutral-800", className)} {...rest}>
    {children}
  </div>
);

const CardTitle = ({ children }: { children?: React.ReactNode }) => (
  <div className="text-lg font-semibold">{children}</div>
);

const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...rest }) => (
  <div className={cls("p-4", className)} {...rest}>
    {children}
  </div>
);

/* =========================
   Theme
========================= */
const useDarkMode = () => {
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);
  return { dark, setDark };
};

/* =========================
   Currency context
========================= */
const CurrencyContext = React.createContext<{ currency: string; fmt: (n: number) => string }>({
  currency: "GHS",
  fmt: (n: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: "GHS" }).format(n),
});
const useCurrency = () => {
  const [currency, setCurrency] = useState<string>(() => {
    if (typeof window === "undefined") return "GHS";
    return localStorage.getItem("__currency") || "GHS";
  });
  useEffect(() => {
    try { localStorage.setItem("__currency", currency); } catch {}
  }, [currency]);
  const fmt = (n: number) => new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(n || 0));
  return { currency, setCurrency, fmt };
};

/* =========================
   Types & defaults
========================= */
type Item = { description: string; qty: number; rate: number };
type Invoice = {
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  clientName: string;
  clientAddress: string;
  clientEmail: string;
  items: Item[];
  notes: string;
  additionalDetails?: string;   // NEW
  terms?: string;               // NEW
  paymentStatus: "Unpaid" | "Partially Paid" | "Paid";
  paymentDate?: string;
  driveLink?: string;
  logoUrl?: string;
  companyName?: string;
  companyAddress?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyTin?: string;
  taxRate: number;
  discount: number;
  currency?: string;
};

type CompanyProfile = {
  logoUrl: string;
  companyName: string;
  companyAddress: string;
  companyEmail: string;
  companyPhone: string;
  companyTin: string;
};

const defaultProfile: CompanyProfile = {
  logoUrl: "",
  companyName: "LEXVOR GROUP LTD",
  companyAddress: "",
  companyEmail: "",
  companyPhone: "",
  companyTin: "",
};

const emptyItem: Item = { description: "", qty: 1, rate: 0 };

const makeEmptyInvoice = (profile: CompanyProfile): Invoice => ({
  invoiceNo: "INV-0001",
  invoiceDate: new Date().toISOString().slice(0, 10),
  dueDate: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
  clientName: "",
  clientAddress: "",
  clientEmail: "",
  items: [{ ...emptyItem }],
  notes: "",
  additionalDetails: "",
  terms: "",
  paymentStatus: "Unpaid",
  paymentDate: "",
  driveLink: "",
  logoUrl: profile.logoUrl,
  companyName: profile.companyName,
  companyAddress: profile.companyAddress,
  companyEmail: profile.companyEmail,
  companyPhone: profile.companyPhone,
  companyTin: profile.companyTin,
  taxRate: 0,
  discount: 0,
});

/* =========================
   Company Profile (persist)
========================= */
const useCompanyProfile = () => {
  const [profile, setProfile] = useState<CompanyProfile>(() => {
    try { return JSON.parse(localStorage.getItem("__company_profile") || "null") || defaultProfile; }
    catch { return defaultProfile; }
  });
  useEffect(() => {
    try { localStorage.setItem("__company_profile", JSON.stringify(profile)); } catch {}
  }, [profile]);
  return { profile, setProfile };
};

/* =========================
   DB hook (Supabase / local)
========================= */
const useDB = () => {
  const [rows, setRows] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem("__invoice_db") || "[]"); } catch { return []; }
  });
  useEffect(() => { try { localStorage.setItem("__invoice_db", JSON.stringify(rows)); } catch {} }, [rows]);

  const persistFullInvoice = (inv: Invoice) => {
    try {
      const map = JSON.parse(localStorage.getItem("__invoice_store") || "{}");
      map[inv.invoiceNo] = inv;
      localStorage.setItem("__invoice_store", JSON.stringify(map));
    } catch {}
  };
  const loadFullInvoice = (invoiceNo: string): Invoice | null => {
    try {
      const map = JSON.parse(localStorage.getItem("__invoice_store") || "{}");
      return map[invoiceNo] || null;
    } catch { return null; }
  };

  const loadRemote = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("invoices")
      .select("invoiceNo, invoiceDate, dueDate, clientName, amount, paymentStatus, paymentDate, driveLink, notes")
      .order("invoiceDate", { ascending: false });
    if (!error && data) setRows(data);
  };
  useEffect(() => { loadRemote(); }, []);

  const add = async (inv: Invoice) => {
    const sub = inv.items.reduce((s, x) => s + Number(x.qty || 0) * Number(x.rate || 0), 0);
    const tax = sub * (Number(inv.taxRate || 0) / 100);
    const total = sub + tax - Number(inv.discount || 0);
    const row = {
      invoiceNo: inv.invoiceNo,
      invoiceDate: inv.invoiceDate,
      dueDate: inv.dueDate,
      clientName: inv.clientName,
      amount: Number(total.toFixed(2)),
      paymentStatus: inv.paymentStatus,
      paymentDate: inv.paymentDate || null,
      driveLink: inv.driveLink || null,
      notes: inv.notes || null,
    };
    setRows((xs) => [row, ...xs]);
    persistFullInvoice(inv);
    if (supabase) {
      await supabase.from("invoices").upsert(row, { onConflict: "invoiceNo" });
      await loadRemote();
    }
  };

  const remove = async (invoiceNo: string) => {
    setRows((xs) => xs.filter((r) => r.invoiceNo !== invoiceNo));
    if (supabase) {
      await supabase.from("invoices").delete().eq("invoiceNo", invoiceNo);
      await loadRemote();
    }
  };

  return { rows, add, remove, loadFullInvoice };
};

/* =========================
   Number formatting
========================= */
const Money: React.FC<{ children: any }> = ({ children }) => {
  const { fmt } = React.useContext(CurrencyContext);
  const val = Number(children || 0);
  return <span>{fmt(val)}</span>;
};

/* =========================
   Printable Invoice (A4)
========================= */
const PrintInvoice = React.forwardRef<HTMLDivElement, { invoice: Invoice }>(({ invoice }, ref) => {
  const subTotal = invoice.items.reduce((s, x) => s + Number(x.qty || 0) * Number(x.rate || 0), 0);
  const tax = subTotal * (Number(invoice.taxRate || 0) / 100);
  const total = subTotal + tax - Number(invoice.discount || 0);

  return (
    <div ref={ref} className="bg-white text-black p-8 max-w-[190mm] mx-auto print-area">
      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          {invoice.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={invoice.logoUrl} alt="Logo" className="h-16 w-16 object-contain" />
          ) : (
            <div className="h-16 w-16 rounded bg-neutral-200" />
          )}
          <div>
            <div className="text-xl font-semibold">{invoice.companyName || "Company Name"}</div>
            <div className="text-sm whitespace-pre-wrap">{invoice.companyAddress}</div>
            <div className="text-sm">{invoice.companyEmail}</div>
            <div className="text-sm">{invoice.companyPhone}</div>
            {invoice.companyTin ? <div className="text-sm">TIN: {invoice.companyTin}</div> : null}
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold tracking-tight">INVOICE</div>
          <div className="mt-2 text-sm">Invoice No: <span className="font-medium">{invoice.invoiceNo}</span></div>
          <div className="text-sm">Invoice Date: {invoice.invoiceDate}</div>
          <div className="text-sm">Due Date: {invoice.dueDate}</div>
          <div className="text-sm">Currency: {invoice.currency || "GHS"}</div>
        </div>
      </div>

      {/* Bill To + Status */}
      <div className="mt-6 grid grid-cols-2 gap-6">
        <div>
          <div className="text-sm font-semibold">Bill To</div>
          <div className="mt-1 font-medium">{invoice.clientName}</div>
          <div className="text-sm whitespace-pre-wrap">{invoice.clientAddress}</div>
          <div className="text-sm">{invoice.clientEmail}</div>
        </div>
        <div className="text-right">
          <div className="text-sm">Payment Status: <span className="font-medium">{invoice.paymentStatus}</span></div>
          {invoice.paymentDate && <div className="text-sm">Payment Date: {invoice.paymentDate}</div>}
          {invoice.driveLink && <div className="text-sm truncate">Link: {invoice.driveLink}</div>}
        </div>
      </div>

      {/* Items */}
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
                <td className="px-3 py-2 text-right"><Money>{it.rate}</Money></td>
                <td className="px-3 py-2 text-right"><Money>{Number(it.qty || 0) * Number(it.rate || 0)}</Money></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="mt-6 grid grid-cols-2 gap-6">
        <div className="text-sm space-y-4">
          {invoice.notes ? (
            <div>
              <div className="font-semibold">Notes</div>
              <div className="whitespace-pre-wrap mt-1">{invoice.notes}</div>
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
          <div className="flex justify-between text-sm py-1"><div>Subtotal</div><div><Money>{subTotal}</Money></div></div>
          <div className="flex justify-between text-sm py-1"><div>Tax ({invoice.taxRate || 0}%)</div><div><Money>{tax}</Money></div></div>
          <div className="flex justify-between text-sm py-1"><div>Discount</div><div><Money>{invoice.discount || 0}</Money></div></div>
          <div className="border-t mt-2 pt-2 flex justify-between font-semibold"><div>Total</div><div><Money>{subTotal + tax - Number(invoice.discount || 0)}</Money></div></div>
        </div>
      </div>
    </div>
  );
});
PrintInvoice.displayName = "PrintInvoice";

/* =========================
   Invoice Builder
========================= */
function InvoiceBuilder({
  onSave,
  draft,
  onDraftChange,
  profile,
  setProfile,
}: {
  onSave: (inv: Invoice) => void;
  draft: Invoice;
  onDraftChange: (inv: Invoice) => void;
  profile: CompanyProfile;
  setProfile: React.Dispatch<React.SetStateAction<CompanyProfile>>;
}) {
  const { currency } = React.useContext(CurrencyContext);

  const [invoice, setInvoice] = useState<Invoice>(draft);
  useEffect(() => { setInvoice(draft); }, [draft]);

  // keep invoice company fields in sync with profile + persist profile
  const syncProfile = <K extends keyof CompanyProfile>(key: K, value: CompanyProfile[K]) => {
    const updated = { ...profile, [key]: value };
    setProfile(updated);
    setInvoice((s) => ({
      ...s,
      [key === "logoUrl" ? "logoUrl" : key === "companyTin" ? "companyTin" : key]: value as any,
    }));
  };

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef });

  const addItem = () => setInvoice((s) => ({ ...s, items: [...s.items, { ...emptyItem }] }));
  const removeItem = (i: number) => setInvoice((s) => ({ ...s, items: s.items.filter((_, k) => k !== i) }));

  const subTotal = invoice.items.reduce((s, x) => s + Number(x.qty || 0) * Number(x.rate || 0), 0);
  const tax = subTotal * (Number(invoice.taxRate || 0) / 100);
  const total = subTotal + tax - Number(invoice.discount || 0);

  // propagate draft up so Duplicate or tab switch preserves it
  useEffect(() => { onDraftChange(invoice); }, [invoice]); // eslint-disable-line

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>Company Profile (persists)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="logo">Logo URL</Label>
              <Input id="logo" placeholder="https://..." value={profile.logoUrl} onChange={(e) => syncProfile("logoUrl", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="cname">Company Name</Label>
              <Input id="cname" value={profile.companyName} onChange={(e) => syncProfile("companyName", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="cemail">Company Email</Label>
              <Input id="cemail" value={profile.companyEmail} onChange={(e) => syncProfile("companyEmail", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="cphone">Company Phone</Label>
              <Input id="cphone" value={profile.companyPhone} onChange={(e) => syncProfile("companyPhone", e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="caddr">Company Address</Label>
              <TextArea id="caddr" rows={4} value={profile.companyAddress} onChange={(e) => syncProfile("companyAddress", e.target.value)} placeholder={"Street Address\nCity, Region"} />
            </div>
            <div>
              <Label htmlFor="tin">Company TIN</Label>
              <Input id="tin" value={profile.companyTin} onChange={(e) => syncProfile("companyTin", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Invoice Settings</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-3 gap-3">
            <div><Label>Invoice No</Label><Input value={invoice.invoiceNo} onChange={(e) => setInvoice({ ...invoice, invoiceNo: e.target.value })} /></div>
            <div><Label>Invoice Date</Label><Input type="date" value={invoice.invoiceDate} onChange={(e) => setInvoice({ ...invoice, invoiceDate: e.target.value })} /></div>
            <div><Label>Due Date</Label><Input type="date" value={invoice.dueDate} onChange={(e) => setInvoice({ ...invoice, dueDate: e.target.value })} /></div>
          </div>
          <div>
            <Label>Currency</Label>
            <Input disabled value={invoice.currency || currency} />
            <div className="text-xs text-neutral-500 mt-1">Change currency in the top bar.</div>
          </div>
        </CardContent>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader><CardTitle>Bill To</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-3">
          <div><Label>Client Name</Label><Input value={invoice.clientName} onChange={(e) => setInvoice({ ...invoice, clientName: e.target.value })} /></div>
          <div><Label>Client Email</Label><Input value={invoice.clientEmail} onChange={(e) => setInvoice({ ...invoice, clientEmail: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Client Address</Label><TextArea rows={4} value={invoice.clientAddress} onChange={(e) => setInvoice({ ...invoice, clientAddress: e.target.value })} placeholder={"Street Address\nCity, Region"} /></div>
        </CardContent>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader><CardTitle>Items</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-900 text-left">
                <tr>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Rate</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2 text-right no-print">Action</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((it, i) => (
                  <tr key={i} className="border-t avoid-break">
                    <td className="px-3 py-2">
                      <Input placeholder="Item / Service description" value={it.description} onChange={(e) => {
                        const items = [...invoice.items]; items[i].description = e.target.value; setInvoice({ ...invoice, items });
                      }} />
                    </td>
                    <td className="px-3 py-2">
                      <Input type="number" min={0} value={it.qty} onChange={(e) => {
                        const items = [...invoice.items]; items[i].qty = Number(e.target.value); setInvoice({ ...invoice, items });
                      }} />
                    </td>
                    <td className="px-3 py-2">
                      <Input type="number" step="0.01" value={it.rate} onChange={(e) => {
                        const items = [...invoice.items]; items[i].rate = Number(e.target.value); setInvoice({ ...invoice, items });
                      }} />
                    </td>
                    <td className="px-3 py-2 text-right align-middle"><Money>{Number(it.qty || 0) * Number(it.rate || 0)}</Money></td>
                    <td className="px-3 py-2 text-right no-print">
                      <Button variant="ghost" size="sm" onClick={() => {
                        const items = invoice.items.filter((_, k) => k !== i);
                        setInvoice({ ...invoice, items });
                      }}><Trash2 className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="flex justify-between mt-3">
            <Button variant="outline" onClick={() => setInvoice((s) => ({ ...s, items: [...s.items, { ...emptyItem }] }))}><Plus className="mr-2 h-4 w-4" /> Add line</Button>
            <div className="w-80">
              <div className="flex justify-between text-sm py-1"><div>Subtotal</div><div><Money>{subTotal}</Money></div></div>
              <div className="flex items-center justify-between text-sm py-1 gap-2">
                <div className="flex items-center gap-2"><Label className="text-sm">Tax %</Label>
                  <Input className="w-20" type="number" step="0.01" value={invoice.taxRate} onChange={(e) => setInvoice({ ...invoice, taxRate: Number(e.target.value) })} />
                </div>
                <div><Money>{tax}</Money></div>
              </div>
              <div className="flex items-center justify-between text-sm py-1 gap-2">
                <div className="flex items-center gap-2"><Label className="text-sm">Discount</Label>
                  <Input className="w-24" type="number" step="0.01" value={invoice.discount} onChange={(e) => setInvoice({ ...invoice, discount: Number(e.target.value) })} />
                </div>
                <div><Money>{invoice.discount || 0}</Money></div>
              </div>
              <div className="border-t mt-2 pt-2 flex justify-between font-semibold"><div>Total</div><div><Money>{total}</Money></div></div>
            </div>
          </div>

          {/* Notes, Additional Details, Terms */}
          <div className="grid md:grid-cols-3 gap-3 mt-3">
            <div className="md:col-span-1">
              <Label>Notes</Label>
              <TextArea
                rows={4}
                value={invoice.notes}
                onChange={(e) => setInvoice({ ...invoice, notes: e.target.value })}
                placeholder={"Payment instructions, bank details, etc.\n(Press Enter for a new line.)"}
              />
            </div>
            <div className="md:col-span-1">
              <Label>Additional Details</Label>
              <TextArea
                rows={4}
                value={invoice.additionalDetails || ""}
                onChange={(e) => setInvoice({ ...invoice, additionalDetails: e.target.value })}
                placeholder={"e.g., Project scope, delivery notes.\n(Press Enter for a new line.)"}
              />
            </div>
            <div className="md:col-span-1">
              <Label>Terms & Conditions</Label>
              <TextArea
                rows={4}
                value={invoice.terms || ""}
                onChange={(e) => setInvoice({ ...invoice, terms: e.target.value })}
                placeholder={"e.g., Payment within 14 days.\n(Press Enter for a new line.)"}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-4">
            <Button onClick={() => onSave({ ...invoice, currency })}><Save className="mr-2 h-4 w-4" /> Save to Database</Button>
            <Button variant="outline" onClick={useReactToPrint({ contentRef: printRef })}><Printer className="mr-2 h-4 w-4" /> Export to PDF</Button>
          </div>
        </CardContent>
      </Card>

      {/* Live PDF Preview */}
      <Card>
        <CardHeader><CardTitle>Preview (A4, print-ready)</CardTitle></CardHeader>
        <CardContent>
          <div className="border rounded-xl overflow-hidden bg-neutral-50">
            <div className="bg-white mx-auto my-4 shadow-sm" style={{ width: "210mm" }}>
              <div className="mx-auto" style={{ width: "190mm" }}>
                <div ref={printRef as any}>
                  <PrintInvoice invoice={{ ...invoice, currency }} />
                </div>
              </div>
            </div>
          </div>
          {/* Print styles */}
          <style>{`
            @page { size: A4; margin: 16mm; }
            @media print {
              html, body { background: white !important; }
              .no-print { display: none !important; }
              body * { visibility: hidden; }
              .print-area, .print-area * { visibility: visible; }
              .print-area { position: absolute; inset: 0; width: 190mm; margin: 0 auto; }
              .avoid-break { break-inside: avoid; page-break-inside: avoid; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
            }
          `}</style>
        </CardContent>
      </Card>
    </div>
  );
}

/* =========================
   Invoices List + Duplicate
========================= */
function Invoices({
  rows,
  onDuplicate,
}: {
  rows: any[];
  onDuplicate: (invoiceNo: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return rows.filter(r => !q || r.invoiceNo?.toLowerCase().includes(q) || r.clientName?.toLowerCase().includes(q));
  }, [rows, query]);

  return (
    <Card>
      <CardHeader><CardTitle>Invoices</CardTitle></CardHeader>
      <CardContent>
        <div className="flex justify-between mb-3 gap-3">
          <div className="relative w-60">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
            <Input className="pl-8" placeholder="Search by number or client" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-900 text-left">
              <tr>
                <th className="px-3 py-2">Invoice No</th>
                <th className="px-3 py-2">Invoice Date</th>
                <th className="px-3 py-2">Due Date</th>
                <th className="px-3 py-2">Client Name</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Payment Date</th>
                <th className="px-3 py-2">Drive</th>
                <th className="px-3 py-2">Notes</th>
                <th className="px-3 py-2 no-print">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.invoiceNo} className="border-t">
                  <td className="px-3 py-2 font-mono">{r.invoiceNo}</td>
                  <td className="px-3 py-2">{r.invoiceDate}</td>
                  <td className="px-3 py-2">{r.dueDate}</td>
                  <td className="px-3 py-2">{r.clientName}</td>
                  <td className="px-3 py-2 text-right"><Money>{r.amount}</Money></td>
                  <td className="px-3 py-2">{r.paymentStatus}</td>
                  <td className="px-3 py-2">{r.paymentDate || ""}</td>
                  <td className="px-3 py-2 truncate max-w-[10rem]">{r.driveLink || ""}</td>
                  <td className="px-3 py-2 truncate max-w-[12rem]">{r.notes || ""}</td>
                  <td className="px-3 py-2 no-print">
                    <Button size="sm" variant="outline" onClick={() => onDuplicate(r.invoiceNo)}>
                      <Copy className="h-4 w-4 mr-1" /> Duplicate
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="px-3 py-10 text-center text-neutral-500">No invoices yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/* =========================
   App Shell
========================= */
export default function App() {
  const { dark, setDark } = useDarkMode();
  const currencyStore = useCurrency();
  const { currency, setCurrency } = currencyStore;

  const db = useDB();
  const company = useCompanyProfile();

  const [draft, setDraft] = useState<Invoice>(() => makeEmptyInvoice(company.profile));
  useEffect(() => {
    if (!draft.clientName && draft.items.length === 1 && draft.items[0].description === "") {
      setDraft(makeEmptyInvoice(company.profile));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company.profile.companyName, company.profile.logoUrl, company.profile.companyTin, company.profile.companyAddress, company.profile.companyEmail, company.profile.companyPhone]);

  const [active, setActive] = useState<"create" | "invoices">("create");

  const handleDuplicate = (invoiceNo: string) => {
    const full = db.loadFullInvoice(invoiceNo);
    if (full) {
      const copy: Invoice = {
        ...full,
        invoiceNo: `${full.invoiceNo}-COPY`,
        invoiceDate: new Date().toISOString().slice(0, 10),
        dueDate: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
        paymentStatus: "Unpaid",
        paymentDate: "",
      };
      setDraft(copy);
      setActive("create");
      window?.scrollTo?.({ top: 0, behavior: "smooth" });
    } else {
      const row = db.rows.find((r) => r.invoiceNo === invoiceNo);
      if (row) {
        setDraft({
          ...makeEmptyInvoice(company.profile),
          clientName: row.clientName,
          invoiceNo: `${row.invoiceNo}-COPY`,
        });
        setActive("create");
        window?.scrollTo?.({ top: 0, behavior: "smooth" });
      }
    }
  };

  return (
    <CurrencyContext.Provider value={currencyStore}>
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50">
        {/* Top bar */}
        <div className="flex flex-wrap gap-3 justify-between items-center border-b px-4 py-3 bg-white dark:bg-neutral-900">
          <div className="text-lg font-semibold">Invoice System</div>
          <div className="flex items-center gap-2">
            <select
              className="rounded-xl border px-3 py-2 border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 no-print"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              title="Currency"
            >
              {["GHS","USD","EUR","GBP","NGN","ZAR","CAD","AUD"].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <Button variant="ghost" onClick={() => setDark(!dark)} title="Toggle theme">
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto p-4">
          <div className="mb-4 inline-flex rounded-xl border overflow-hidden no-print">
            <button
              onClick={() => setActive("create")}
              className={cls("px-4 py-2", active === "create" ? "bg-black text-white dark:bg-white dark:text-black" : "bg-transparent")}
            >
              Create Invoice
            </button>
            <button
              onClick={() => setActive("invoices")}
              className={cls("px-4 py-2 border-l", active === "invoices" ? "bg-black text-white dark:bg-white dark:text-black" : "bg-transparent")}
            >
              Invoices
            </button>
          </div>

          {active === "create" && (
            <InvoiceBuilder
              onSave={db.add}
              draft={draft}
              onDraftChange={setDraft}
              profile={company.profile}
              setProfile={company.setProfile}
            />
          )}
          {active === "invoices" && (
            <Invoices rows={db.rows} onDuplicate={handleDuplicate} />
          )}
        </div>
      </div>
    </CurrencyContext.Provider>
  );
}

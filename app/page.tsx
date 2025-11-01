'use client'

import React, { useMemo, useRef, useState, useEffect } from "react";
import { Sun, Moon, Plus, Save, Trash2, Search, Printer } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { createClient } from "@supabase/supabase-js";

// Supabase (optional). If env vars are missing, app falls back to localStorage.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

// ---------- Minimal UI helpers (Tailwind) ----------
const cls = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "solid" | "outline" | "ghost";
  size?: "sm" | "md";
};
const Button: React.FC<ButtonProps> = ({ className, variant = "solid", size = "md", children, ...rest }) => {
  const base = "inline-flex items-center justify-center rounded-xl transition border";
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

// ---------- Theme ----------
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

// ---------- Data ----------
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
  paymentStatus: "Unpaid" | "Partially Paid" | "Paid";
  paymentDate?: string;
  driveLink?: string;
  logoUrl?: string;
  companyName?: string;
  companyAddress?: string;
  companyEmail?: string;
  companyPhone?: string;
  taxRate: number;
  discount: number;
};

const emptyItem: Item = { description: "", qty: 1, rate: 0 };
const emptyInvoice: Invoice = {
  invoiceNo: "INV-0001",
  invoiceDate: new Date().toISOString().slice(0, 10),
  dueDate: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
  clientName: "",
  clientAddress: "",
  clientEmail: "",
  items: [{ ...emptyItem }],
  notes: "",
  paymentStatus: "Unpaid",
  paymentDate: "",
  driveLink: "",
  logoUrl: "",
  companyName: "LEXVOR GROUP LTD",
  companyAddress: "",
  companyEmail: "",
  companyPhone: "",
  taxRate: 0,
  discount: 0,
};

// ---------- Database hook (Supabase if available, otherwise localStorage) ----------
const useDB = () => {
  const [rows, setRows] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("__invoice_db") || "[]");
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("__invoice_db", JSON.stringify(rows));
    } catch {}
  }, [rows]);

  const loadRemote = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("invoices")
      .select(
        "invoiceNo, invoiceDate, dueDate, clientName, amount, paymentStatus, paymentDate, driveLink, notes"
      )
      .order("invoiceDate", { ascending: false });
    if (!error && data) setRows(data);
  };
  useEffect(() => {
    loadRemote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return { rows, add, remove };
};

// ---------- Invoice Printable ----------
const Money: React.FC<{ children: any }> = ({ children }) => {
  const val = Number(children || 0);
  return (
    <span>
      {val.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}
    </span>
  );
};

const PrintInvoice = React.forwardRef<HTMLDivElement, { invoice: Invoice }>(({ invoice }, ref) => {
  const subTotal = invoice.items.reduce((s, x) => s + Number(x.qty || 0) * Number(x.rate || 0), 0);
  const tax = subTotal * (Number(invoice.taxRate || 0) / 100);
  const total = subTotal + tax - Number(invoice.discount || 0);

  return (
    <div ref={ref} className="bg-white text-black p-8 max-w-3xl mx-auto">
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
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold tracking-tight">INVOICE</div>
          <div className="mt-2 text-sm">
            Invoice No: <span className="font-medium">{invoice.invoiceNo}</span>
          </div>
          <div className="text-sm">Invoice Date: {invoice.invoiceDate}</div>
          <div className="text-sm">Due Date: {invoice.dueDate}</div>
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
          <div className="text-sm">
            Payment Status: <span className="font-medium">{invoice.paymentStatus}</span>
          </div>
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
              <tr className="border-t" key={i}>
                <td className="px-3 py-2">{it.description}</td>
                <td className="px-3 py-2 text-right">{it.qty}</td>
                <td className="px-3 py-2 text-right">
                  <Money>{it.rate}</Money>
                </td>
                <td className="px-3 py-2 text-right">
                  <Money>{Number(it.qty || 0) * Number(it.rate || 0)}</Money>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="mt-6 grid grid-cols-2 gap-6">
        <div className="text-sm">
          <div className="font-semibold">Notes</div>
          <div className="whitespace-pre-wrap mt-1 min-h-[3rem]">{invoice.notes}</div>
        </div>
        <div className="justify-self-end w-64">
          <div className="flex justify-between text-sm py-1">
            <div>Subtotal</div>
            <div>
              <Money>{subTotal}</Money>
            </div>
          </div>
          <div className="flex justify-between text-sm py-1">
            <div>Tax ({invoice.taxRate || 0}%)</div>
            <div>
              <Money>{tax}</Money>
            </div>
          </div>
          <div className="flex justify-between text-sm py-1">
            <div>Discount</div>
            <div>
              <Money>{invoice.discount || 0}</Money>
            </div>
          </div>
          <div className="border-t mt-2 pt-2 flex justify-between font-semibold">
            <div>Total</div>
            <div>
              <Money>{subTotal + tax - Number(invoice.discount || 0)}</Money>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
PrintInvoice.displayName = "PrintInvoice";

// ---------- Invoice Builder ----------
function InvoiceBuilder({ onSave }: { onSave: (inv: Invoice) => void }) {
  const [invoice, setInvoice] = useState<Invoice>(() => {
    try {
      return { ...emptyInvoice, ...(JSON.parse(localStorage.getItem("__draft_invoice") || "null") || {}) };
    } catch {
      return emptyInvoice;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("__draft_invoice", JSON.stringify(invoice));
    } catch {}
  }, [invoice]);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef });

  const addItem = () => setInvoice((s) => ({ ...s, items: [...s.items, { ...emptyItem }] }));
  const removeItem = (i: number) => setInvoice((s) => ({ ...s, items: s.items.filter((_, k) => k !== i) }));

  const subTotal = invoice.items.reduce((s, x) => s + Number(x.qty || 0) * Number(x.rate || 0), 0);
  const tax = subTotal * (Number(invoice.taxRate || 0) / 100);
  const total = subTotal + tax - Number(invoice.discount || 0);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Invoice Form</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Company & Logo */}
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="logo">Logo URL</Label>
              <Input
                id="logo"
                placeholder="https://..."
                value={invoice.logoUrl || ""}
                onChange={(e) => setInvoice({ ...invoice, logoUrl: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="cname">Company Name</Label>
              <Input
                id="cname"
                value={invoice.companyName || ""}
                onChange={(e) => setInvoice({ ...invoice, companyName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="cemail">Company Email</Label>
              <Input
                id="cemail"
                value={invoice.companyEmail || ""}
                onChange={(e) => setInvoice({ ...invoice, companyEmail: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="cphone">Company Phone</Label>
              <Input
                id="cphone"
                value={invoice.companyPhone || ""}
                onChange={(e) => setInvoice({ ...invoice, companyPhone: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="caddr">Company Address</Label>
              <Input
                id="caddr"
                value={invoice.companyAddress || ""}
                onChange={(e) => setInvoice({ ...invoice, companyAddress: e.target.value })}
              />
            </div>
          </div>

          {/* Invoice meta */}
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label>Invoice No</Label>
              <Input value={invoice.invoiceNo} onChange={(e) => setInvoice({ ...invoice, invoiceNo: e.target.value })} />
            </div>
            <div>
              <Label>Invoice Date</Label>
              <Input
                type="date"
                value={invoice.invoiceDate}
                onChange={(e) => setInvoice({ ...invoice, invoiceDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={invoice.dueDate} onChange={(e) => setInvoice({ ...invoice, dueDate: e.target.value })} />
            </div>
          </div>

          {/* Client */}
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Client Name</Label>
              <Input value={invoice.clientName} onChange={(e) => setInvoice({ ...invoice, clientName: e.target.value })} />
            </div>
            <div>
              <Label>Client Email</Label>
              <Input value={invoice.clientEmail} onChange={(e) => setInvoice({ ...invoice, clientEmail: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Client Address</Label>
              <Input
                value={invoice.clientAddress}
                onChange={(e) => setInvoice({ ...invoice, clientAddress: e.target.value })}
              />
            </div>
          </div>

          {/* Items */}
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-900 text-left">
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
                      <Input
                        placeholder="Item / Service description"
                        value={it.description}
                        onChange={(e) => {
                          const items = [...invoice.items];
                          items[i].description = e.target.value;
                          setInvoice({ ...invoice, items });
                        }}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={0}
                        value={it.qty}
                        onChange={(e) => {
                          const items = [...invoice.items];
                          items[i].qty = Number(e.target.value);
                          setInvoice({ ...invoice, items });
                        }}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={it.rate}
                        onChange={(e) => {
                          const items = [...invoice.items];
                          items[i].rate = Number(e.target.value);
                          setInvoice({ ...invoice, items });
                        }}
                      />
                    </td>
                    <td className="px-3 py-2 text-right align-middle">
                      <Money>{Number(it.qty || 0) * Number(it.rate || 0)}</Money>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button variant="ghost" size="sm" onClick={() => removeItem(i)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="flex justify-between mt-2">
            <Button variant="outline" onClick={addItem}>
              <Plus className="mr-2 h-4 w-4" /> Add line
            </Button>
            <div className="w-80">
              <div className="flex justify-between text-sm py-1">
                <div>Subtotal</div>
                <div>
                  <Money>{subTotal}</Money>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm py-1 gap-2">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Tax %</Label>
                  <Input
                    className="w-20"
                    type="number"
                    step="0.01"
                    value={invoice.taxRate}
                    onChange={(e) => setInvoice({ ...invoice, taxRate: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Money>{tax}</Money>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm py-1 gap-2">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Discount</Label>
                  <Input
                    className="w-24"
                    type="number"
                    step="0.01"
                    value={invoice.discount}
                    onChange={(e) => setInvoice({ ...invoice, discount: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Money>{invoice.discount || 0}</Money>
                </div>
              </div>
              <div className="border-t mt-2 pt-2 flex justify-between font-semibold">
                <div>Total</div>
                <div>
                  <Money>{total}</Money>
                </div>
              </div>
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Input
              value={invoice.notes}
              onChange={(e) => setInvoice({ ...invoice, notes: e.target.value })}
              placeholder="Payment instructions, bank details, etc."
            />
          </div>

          {/* Payment / Drive link */}
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label>Payment Status</Label>
              <select
                className="w-full rounded-xl border px-3 py-2 border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                value={invoice.paymentStatus}
                onChange={(e) => setInvoice({ ...invoice, paymentStatus: e.target.value as Invoice["paymentStatus"] })}
              >
                <option>Unpaid</option>
                <option>Partially Paid</option>
                <option>Paid</option>
              </select>
            </div>
            <div>
              <Label>Payment Date</Label>
              <Input
                type="date"
                value={invoice.paymentDate || ""}
                onChange={(e) => setInvoice({ ...invoice, paymentDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Google Drive Link</Label>
              <Input
                placeholder="https://drive.google.com/..."
                value={invoice.driveLink || ""}
                onChange={(e) => setInvoice({ ...invoice, driveLink: e.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={() => onSave(invoice)}>
              <Save className="mr-2 h-4 w-4" /> Save to Database
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" /> Export to PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live PDF Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Preview (PDF output)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-xl overflow-hidden bg-white text-black">
            <div className="print-area">
              <PrintInvoice ref={printRef} invoice={invoice} />
            </div>
          </div>
          <style>{`@media print { body { background: white !important; } .print-area { margin: 0; } }`}</style>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------- Invoices List ----------
function Invoices({ rows }: { rows: any[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return rows.filter(
      (r) => !q || r.invoiceNo.toLowerCase().includes(q) || r.clientName.toLowerCase().includes(q)
    );
  }, [rows, query]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoices</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-end mb-3">
          <div className="relative w-60">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
            <Input
              className="pl-8"
              placeholder="Search by number or client"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
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
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.invoiceNo} className="border-t">
                  <td className="px-3 py-2 font-mono">{r.invoiceNo}</td>
                  <td className="px-3 py-2">{r.invoiceDate}</td>
                  <td className="px-3 py-2">{r.dueDate}</td>
                  <td className="px-3 py-2">{r.clientName}</td>
                  <td className="px-3 py-2 text-right">
                    <Money>{r.amount}</Money>
                  </td>
                  <td className="px-3 py-2">{r.paymentStatus}</td>
                  <td className="px-3 py-2">{r.paymentDate || ""}</td>
                  <td className="px-3 py-2 truncate max-w-[10rem]">{r.driveLink || ""}</td>
                  <td className="px-3 py-2 truncate max-w-[12rem]">{r.notes || ""}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-neutral-500">
                    No invoices yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- App ----------
export default function App() {
  const { dark, setDark } = useDarkMode();
  const [active, setActive] = useState<"create" | "invoices">("create");
  const db = useDB();

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50">
      {/* Top bar */}
      <div className="flex justify-between items-center border-b px-4 py-3 bg-white dark:bg-neutral-900">
        <div className="text-lg font-semibold">Invoice System</div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => setDark(!dark)}>
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto p-4">
        <div className="mb-4 inline-flex rounded-xl border overflow-hidden">
          <button
            onClick={() => setActive("create")}
            className={cls(
              "px-4 py-2",
              active === "create" ? "bg-black text-white dark:bg-white dark:text-black" : "bg-transparent"
            )}
          >
            Create Invoice
          </button>
          <button
            onClick={() => setActive("invoices")}
            className={cls(
              "px-4 py-2 border-l",
              active === "invoices" ? "bg-black text-white dark:bg-white dark:text-black" : "bg-transparent"
            )}
          >
            Invoices
          </button>
        </div>

        {active === "create" && <InvoiceBuilder onSave={db.add} />}
        {active === "invoices" && <Invoices rows={db.rows} />}
      </div>
    </div>
  );
}

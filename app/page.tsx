'use client'

import React, { useMemo, useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, Moon, Sun, Plus, Save, Trash2, Loader2, Search, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useReactToPrint } from "react-to-print";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

const cls = (...xs: string[]) => xs.filter(Boolean).join(" ");

const useDarkMode = () => {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);
  return { dark, setDark };
};

const emptyItem = { description: "", qty: 1, rate: 0 };
const emptyInvoice = {
  invoiceNo: "INV-001",
  invoiceDate: new Date().toISOString().slice(0, 10),
  dueDate: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
  clientName: "",
  items: [emptyItem],
  notes: "",
  paymentStatus: "Unpaid",
  taxRate: 0,
  discount: 0,
};

const useDB = () => {
  const [rows, setRows] = useState<any[]>([]);
  const loadRemote = async () => {
    if (!supabase) return;
    const { data } = await supabase.from("invoices").select("*");
    if (data) setRows(data);
  };
  useEffect(() => { loadRemote(); }, []);
  const add = async (inv: any) => {
    const total = inv.items.reduce((s: number, x: any) => s + x.qty * x.rate, 0);
    const row = { ...inv, amount: total };
    setRows((xs) => [row, ...xs]);
    if (supabase) await supabase.from("invoices").upsert(row);
  };
  return { rows, add };
};

function InvoiceForm({ onSave }: any) {
  const [invoice, setInvoice] = useState(emptyInvoice);
  const printRef = useRef(null);
  const handlePrint = useReactToPrint({ content: () => printRef.current });

  const total = invoice.items.reduce((s, x) => s + x.qty * x.rate, 0);
  const addItem = () => setInvoice((i) => ({ ...i, items: [...i.items, emptyItem] }));

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Create Invoice</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
            <div><Label>Invoice No</Label><Input value={invoice.invoiceNo} onChange={e => setInvoice({ ...invoice, invoiceNo: e.target.value })} /></div>
            <div><Label>Invoice Date</Label><Input type="date" value={invoice.invoiceDate} onChange={e => setInvoice({ ...invoice, invoiceDate: e.target.value })} /></div>
            <div><Label>Due Date</Label><Input type="date" value={invoice.dueDate} onChange={e => setInvoice({ ...invoice, dueDate: e.target.value })} /></div>
          </div>

          <div><Label>Client Name</Label><Input value={invoice.clientName} onChange={e => setInvoice({ ...invoice, clientName: e.target.value })} /></div>

          <table className="w-full border text-sm">
            <thead className="bg-neutral-100">
              <tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>
            </thead>
            <tbody>
              {invoice.items.map((x, i) => (
                <tr key={i}>
                  <td><Input value={x.description} onChange={e => {
                    const items = [...invoice.items];
                    items[i].description = e.target.value;
                    setInvoice({ ...invoice, items });
                  }} /></td>
                  <td><Input type="number" value={x.qty} onChange={e => {
                    const items = [...invoice.items];
                    items[i].qty = +e.target.value;
                    setInvoice({ ...invoice, items });
                  }} /></td>
                  <td><Input type="number" value={x.rate} onChange={e => {
                    const items = [...invoice.items];
                    items[i].rate = +e.target.value;
                    setInvoice({ ...invoice, items });
                  }} /></td>
                  <td className="text-right pr-2">{(x.qty * x.rate).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <Button variant="outline" onClick={addItem}><Plus className="mr-2 h-4 w-4" /> Add Item</Button>

          <div className="flex justify-between mt-4">
            <div className="font-semibold">Total:</div>
            <div>${total.toFixed(2)}</div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={() => { onSave(invoice); }}> <Save className="mr-2 h-4 w-4" /> Save </Button>
            <Button variant="outline" onClick={handlePrint}> <Printer className="mr-2 h-4 w-4" /> Export PDF </Button>
          </div>
        </CardContent>
      </Card>

      <Card ref={printRef}>
        <CardHeader><CardTitle>Invoice Preview</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div><strong>Invoice No:</strong> {invoice.invoiceNo}</div>
            <div><strong>Client:</strong> {invoice.clientName}</div>
            <div><strong>Total:</strong> ${total.toFixed(2)}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InvoicesList({ rows }: any) {
  return (
    <Card>
      <CardHeader><CardTitle>Invoices</CardTitle></CardHeader>
      <CardContent>
        <table className="w-full border text-sm">
          <thead className="bg-neutral-100">
            <tr><th>No</th><th>Client</th><th>Total</th></tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}><td>{r.invoiceNo}</td><td>{r.clientName}</td><td>${r.amount?.toFixed(2)}</td></tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export default function App() {
  const { dark, setDark } = useDarkMode();
  const [active, setActive] = useState("create");
  const db = useDB();

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50">
      <div className="flex justify-between items-center border-b px-4 py-3 bg-white dark:bg-neutral-900">
        <div className="text-lg font-semibold">Invoice System</div>
        <Button variant="ghost" size="icon" onClick={() => setDark(!dark)}>
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        <Tabs value={active} onValueChange={setActive}>
          <TabsList>
            <TabsTrigger value="create">Create Invoice</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <InvoiceForm onSave={db.add} />
          </TabsContent>

          <TabsContent value="invoices">
            <InvoicesList rows={db.rows} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

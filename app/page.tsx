'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import {
  Plus, Trash2, Printer, Save, Upload, RefreshCcw,
  Sun, Moon, Eye, Search
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

/* =================== Helpers =================== */
type Item = { description: string; qty: number; rate: number };
type CompanyProfile = {
  logoUrl: string; companyName: string; companyEmail: string;
  companyPhone: string; companyAddress: string; companyTin: string;
};
type PaymentStatus = 'Unpaid' | 'Partially Paid' | 'Paid';
type Invoice = {
  invoiceNo: string; invoiceDate: string; dueDate: string;
  clientName: string; clientPhone: string; clientEmail: string; clientAddress: string;
  items: Item[]; bankDetails: string; additionalDetails: string; terms: string;
  logoUrl: string; companyName: string; companyEmail: string; companyPhone: string; companyAddress: string; companyTin: string;
  taxRate: number; discount: number; shipping: number;
  paymentStatus: PaymentStatus; currency: string;
};

const num = (v: any) => {
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const formatMoney = (n:number, c:string) =>
  new Intl.NumberFormat(undefined, { style:"currency", currency:c }).format(num(n));

/* =================== PDF Output =================== */
const PrintInvoice = React.forwardRef<HTMLDivElement, { invoice: Invoice }>(
  ({ invoice }, ref) => {
    const subTotal = invoice.items.reduce((s, it) => s + num(it.qty)*num(it.rate), 0);
    const vat = subTotal * (num(invoice.taxRate)/100);
    const total = subTotal - num(invoice.discount) + vat + num(invoice.shipping);

    const gridGray = "#d0d0d0";        
    const headerGray = "#d9d9d9";
    const borderThin = "0.6pt solid " + gridGray;

    return (
      <div ref={ref} className="print-area">
        <div className="print-inner py-4" style={{ width: "178mm" }}>
          {/* HEADER */}
          <div className="grid grid-cols-12 gap-4 items-start">
            <div className="col-span-8">
              <div className="font-extrabold text-[18pt] leading-tight">
                {invoice.companyName || "LEXVOR GROUP LTD"}
              </div>
              {invoice.companyTin && <div className="text-[9pt]">TIN: {invoice.companyTin}</div>}
              {invoice.companyAddress && <div className="text-[9pt] mt-[2px] whitespace-pre-wrap">{invoice.companyAddress}</div>}
              {invoice.companyPhone && <div className="text-[9pt] mt-[2px]">Phone: {invoice.companyPhone}</div>}
              {invoice.companyEmail && <div className="text-[9pt] mt-[2px]">Email: {invoice.companyEmail}</div>}
            </div>
            <div className="col-span-4 text-right">
              <div className="text-[14pt] font-extrabold tracking-wide">INVOICE</div>
              <div className="mt-3 inline-flex items-center justify-center">
                {invoice.logoUrl
                  ? <img src={invoice.logoUrl} alt="Logo" className="h-[24mm] max-w-[90mm] object-contain" />
                  : <div className="text-[8pt] text-neutral-400 h-[24mm] w-[90mm] border border-neutral-200 rounded flex items-center justify-center">LOGO</div>
                }
              </div>
            </div>
          </div>

          {/* BILL TO + META */}
          <div className="grid grid-cols-12 gap-4 mt-4 items-start">
            {/* Bill To */}
            <div className="col-span-6 flex flex-col">
              <div className="uppercase text-[9pt] font-semibold text-neutral-600 mb-1">Bill To</div>
              <div className="rounded border flex-1 p-2" style={{ border: borderThin }}>
                {(invoice.clientName || invoice.clientAddress || invoice.clientEmail || invoice.clientPhone) ? (
                  <>
                    {invoice.clientName && <div className="text-[9pt] font-semibold">{invoice.clientName}</div>}
                    {invoice.clientAddress && <div className="text-[9pt] whitespace-pre-wrap mt-[1px]">{invoice.clientAddress}</div>}
                    {invoice.clientEmail && <div className="text-[9pt] underline mt-[1px]">{invoice.clientEmail}</div>}
                    {invoice.clientPhone && <div className="text-[9pt] mt-[1px]">{invoice.clientPhone}</div>}
                  </>
                ) : (
                  <div className="text-[9pt] text-neutral-400">—</div>
                )}
              </div>
            </div>

            {/* Meta Info tiles */}
            <div className="col-span-6 self-start mt-[22px]">
              <div className="grid grid-rows-3 max-w-full">
                {[
                  ["Invoice No", invoice.invoiceNo || "-"],
                  ["Invoice Date", invoice.invoiceDate || "-"],
                  ["Due Date", invoice.dueDate || "-"],
                ].map(([label, val], i) => (
                  <div key={i} className="grid grid-cols-12">
                    <div
                      className="col-span-4 text-[9pt] font-semibold px-2 py-[5px] flex items-center"
                      style={{
                        background: headerGray,
                        color: "#1a1a1a",
                        border: borderThin,
                        borderTopLeftRadius: i === 0 ? 4 : 0,
                        borderBottomLeftRadius: i === 2 ? 4 : 0,
                      }}
                    >
                      {label}
                    </div>
                    <div
                      className="col-span-8 text-[9pt] px-2 py-[5px] flex items-center"
                      style={{
                        background: "#fff",
                        border: borderThin,
                        borderTopRightRadius: i === 0 ? 4 : 0,
                        borderBottomRightRadius: i === 2 ? 4 : 0,
                      }}
                    >
                      {val}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ITEMS TABLE */}
          <div className="mt-4 rounded" style={{ border: borderThin }}>
            <table className="w-full text-[9pt]" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: headerGray }}>
                  {["Description","Qty","Price","Total"].map((h,i)=>(
                    <th key={i} className="text-left font-semibold" style={{ padding:"6px", borderBottom:borderThin }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((it,i)=>(
                  <tr key={i}>
                    <td style={{ padding:"6px", borderBottom:`0.6pt dotted ${gridGray}` }}>{it.description}</td>
                    <td style={{ padding:"6px", textAlign:"right", borderBottom:`0.6pt dotted ${gridGray}` }}>{num(it.qty)}</td>
                    <td style={{ padding:"6px", textAlign:"right", borderBottom:`0.6pt dotted ${gridGray}` }}>{formatMoney(num(it.rate), invoice.currency)}</td>
                    <td style={{ padding:"6px", textAlign:"right", borderBottom:`0.6pt dotted ${gridGray}` }}>{formatMoney(num(it.qty)*num(it.rate), invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* BANK DETAILS + TOTAL */}
          <div className="grid grid-cols-12 gap-4 mt-4">
            {invoice.bankDetails && (
              <div className="col-span-7">
                <div className="rounded h-full" style={{ border: borderThin }}>
                  <div className="px-3 py-2 text-[9pt] font-semibold uppercase border-b" style={{ borderBottom: borderThin }}>Bank Details</div>
                  <div className="px-3 py-3 text-[9pt] whitespace-pre-wrap">{invoice.bankDetails}</div>
                </div>
              </div>
            )}
            <div className={invoice.bankDetails ? "col-span-5" : "col-span-12"}>
              <div className="rounded" style={{ border: borderThin }}>
                <table className="w-full text-[9pt]" style={{ borderCollapse:"collapse" }}>
                  <thead>
                    <tr style={{ background: headerGray }}>
                      <th className="text-left font-semibold p-[6px]">Summary</th>
                      <th className="text-right font-semibold p-[6px]">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Subtotal", subTotal],
                      ["Discount", num(invoice.discount)],
                      [`VAT (${num(invoice.taxRate)}%)`, vat],
                      ["Shipping", num(invoice.shipping)],
                    ].map(([label,val],i)=>(
                      <tr key={i}>
                        <td style={{ padding:"6px", borderBottom:borderThin }}>{label}</td>
                        <td style={{ padding:"6px", textAlign:"right", borderBottom:borderThin }}>{formatMoney(num(val), invoice.currency)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td className="font-bold" style={{ padding:"6px", borderTop:`1pt solid ${gridGray}` }}>Total</td>
                      <td className="font-bold text-right" style={{ padding:"6px", borderTop:`1pt solid ${gridGray}` }}>{formatMoney(total, invoice.currency)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* TERMS */}
          <div className="mt-4 rounded text-center" style={{ border: borderThin }}>
            <div className="px-3 py-2 text-[9pt] font-semibold border-b" style={{ borderBottom: borderThin }}>
              Terms &amp; Conditions
            </div>
            <div className="px-3 py-3 text-[9pt] whitespace-pre-wrap">{invoice.terms || "—"}</div>
          </div>

          <div className="mt-6 text-center text-[10pt] font-bold">
            Thank you for doing business with Lexvor Group Limited.
          </div>
        </div>
      </div>
    );
  }
);
PrintInvoice.displayName = "PrintInvoice";

/* =================== Main =================== */
export default function App() {
  const componentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: componentRef });
  const sample: Invoice = {
    invoiceNo: "123456789",
    invoiceDate: "2025-11-01",
    dueDate: "2025-11-08",
    clientName: "Kelvin Sosoo–Kuevor",
    clientAddress: "No. C95 Lettuce Street\nCommunity 22 Annex, Tema",
    clientEmail: "Kelvin88007@gmail.com",
    clientPhone: "(+233)54 233 2944",
    items: [
      { description: "2018 Honda Accord EX-L", qty: 1, rate: 7600 },
      { description: "IAA Charges", qty: 1, rate: 856 },
      { description: "Towing and Delivery", qty: 1, rate: 1400 },
    ],
    bankDetails: "Beneficiary: Alexander Ayivor\nBank: Ghana Commercial Bank\nAccount Number: 1751010046766\nSWIFT: GHCGBGHAC",
    additionalDetails: "",
    terms: "All sales are final. Vehicle sold as is, no warranty implied. Full payment is required before shipping/export.",
    logoUrl: "/lexvor-logo.png",
    companyName: "LEXVOR GROUP LTD",
    companyEmail: "lexvorgrouplimited@gmail.com",
    companyPhone: "+1 914-508-3305",
    companyAddress: "Ghana – USA",
    companyTin: "C0066170982",
    taxRate: 0,
    discount: 0,
    shipping: 1200,
    paymentStatus: "Paid",
    currency: "USD"
  };

  return (
    <main className="use-glass min-h-screen flex flex-col items-center justify-center p-6">
      <button onClick={handlePrint} className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2 rounded mb-4 flex items-center gap-2">
        <Printer className="w-4 h-4" /> Export to PDF
      </button>
      <div ref={componentRef}>
        <PrintInvoice invoice={sample} />
      </div>
    </main>
  );
}

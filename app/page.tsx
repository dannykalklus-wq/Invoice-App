'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  Trash2,
  Printer,
  Save,
  Upload,
  RefreshCcw,
  Sun,
  Moon,
  Eye,
  Trash,
  Search,
  FileDown,
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { supabase } from '../lib/supabaseClient'; // fixed relative import
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Types
type Item = {
  description: string;
  qty: number;
  rate: number;
};

type CompanyProfile = {
  logoUrl: string;
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  companyTin: string;
};

type Client = {
  name: string;
  address: string;
  email: string;
  phone: string;
};

// Component
export default function InvoiceApp() {
  const [items, setItems] = useState<Item[]>([
    { description: 'Item / service', qty: 1, rate: 0 },
  ]);
  const [currency, setCurrency] = useState('USD');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>({
    logoUrl: '',
    companyName: '',
    companyEmail: '',
    companyPhone: '',
    companyAddress: '',
    companyTin: '',
  });

  const [client, setClient] = useState<Client>({
    name: '',
    address: '',
    email: '',
    phone: '',
  });

  const [invoiceDetails, setInvoiceDetails] = useState({
    number: '',
    date: '',
    dueDate: '',
    paymentStatus: 'Paid',
  });

  const [bankDetails, setBankDetails] = useState('');
  const [terms, setTerms] = useState('');
  const [shipping, setShipping] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [vat, setVat] = useState(0);

  const componentRef = useRef<HTMLDivElement>(null);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.qty * item.rate, 0);
    const vatAmount = (vat / 100) * subtotal;
    const total = subtotal - discount + vatAmount + shipping;
    return { subtotal, vatAmount, total };
  }, [items, discount, vat, shipping]);

  const handleAddItem = () => setItems([...items, { description: '', qty: 1, rate: 0 }]);
  const handleRemoveItem = (index: number) =>
    setItems(items.filter((_, i) => i !== index));

  // === FIX: use contentRef (not content) to satisfy current react-to-print types ===
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `${companyProfile.companyName}_Invoice_${invoiceDetails.number}`,
  });
  // ==============================================================================

  const handleExportPDF = async () => {
    const input = componentRef.current;
    if (!input) return;

    try {
      const canvas = await html2canvas(input, { scale: 2 });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Invoice_${invoiceDetails.number || 'New'}.pdf`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('PDF export failed', err);
      alert('Export to PDF failed. Check console for details.');
    }
  };

  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem('companyProfile');
      if (savedProfile) setCompanyProfile(JSON.parse(savedProfile));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Failed to load company profile from localStorage', err);
    }
  }, []);

  const handleProfileSave = () => {
    try {
      localStorage.setItem('companyProfile', JSON.stringify(companyProfile));
      alert('Company profile saved locally!');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to save profile', err);
      alert('Failed to save company profile.');
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCompanyProfile({ ...companyProfile, logoUrl: reader.result as string });
    reader.readAsDataURL(file);
  };

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-black'} px-4 sm:px-6 md:px-8`}>
      <div className="max-w-7xl mx-auto py-6 space-y-8">
        {/* HEADER ACTIONS */}
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleExportPDF}
              className="flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium text-white"
            >
              <FileDown size={16} className="mr-2" /> Export to PDF
            </button>
            <button
              onClick={handleProfileSave}
              className="flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 rounded-md text-sm font-medium text-white"
            >
              <Save size={16} className="mr-2" /> Save Profile
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-sm font-medium text-white"
              title="Print / Export (browser print)"
            >
              <Printer size={16} className="mr-2" /> Print
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="bg-transparent border border-gray-400 rounded-md px-2 py-1 text-sm"
            >
              <option>USD</option>
              <option>GHS</option>
              <option>EUR</option>
            </select>
            <button onClick={toggleTheme} className="p-2 rounded-full border border-gray-500">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>

        {/* COMPANY PROFILE */}
        <div className="p-4 rounded-lg bg-white/10 border border-gray-700 shadow-md">
          <h2 className="font-bold text-lg mb-2">Company Profile</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Company Name</label>
              <input
                value={companyProfile.companyName}
                onChange={(e) =>
                  setCompanyProfile({ ...companyProfile, companyName: e.target.value })
                }
                className="w-full px-3 py-2 rounded-md bg-transparent border border-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Company Address</label>
              <input
                value={companyProfile.companyAddress}
                onChange={(e) =>
                  setCompanyProfile({ ...companyProfile, companyAddress: e.target.value })
                }
                className="w-full px-3 py-2 rounded-md bg-transparent border border-gray-500"
              />
            </div>
          </div>
        </div>

        {/* INVOICE FORM */}
        <div className="p-4 rounded-lg bg-white/10 border border-gray-700 shadow-md">
          <h2 className="font-bold text-lg mb-2">Invoice Details</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium">Invoice No</label>
              <input
                value={invoiceDetails.number}
                onChange={(e) =>
                  setInvoiceDetails({ ...invoiceDetails, number: e.target.value })
                }
                className="w-full px-3 py-2 rounded-md bg-transparent border border-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Invoice Date</label>
              <input
                type="date"
                value={invoiceDetails.date}
                onChange={(e) =>
                  setInvoiceDetails({ ...invoiceDetails, date: e.target.value })
                }
                className="w-full px-3 py-2 rounded-md bg-transparent border border-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Due Date</label>
              <input
                type="date"
                value={invoiceDetails.dueDate}
                onChange={(e) =>
                  setInvoiceDetails({ ...invoiceDetails, dueDate: e.target.value })
                }
                className="w-full px-3 py-2 rounded-md bg-transparent border border-gray-500"
              />
            </div>
          </div>
        </div>

        {/* ITEMS */}
        <div className="p-4 rounded-lg bg-white/10 border border-gray-700 shadow-md">
          <h2 className="font-bold text-lg mb-2">Items</h2>
          {items.map((item, index) => (
            <div key={index} className="grid sm:grid-cols-4 gap-3 mb-2">
              <input
                value={item.description}
                placeholder="Description"
                onChange={(e) => {
                  const updated = [...items];
                  updated[index].description = e.target.value;
                  setItems(updated);
                }}
                className="px-3 py-2 rounded-md bg-transparent border border-gray-500"
              />
              <input
                type="number"
                value={item.qty}
                onChange={(e) => {
                  const updated = [...items];
                  updated[index].qty = +e.target.value;
                  setItems(updated);
                }}
                className="px-3 py-2 rounded-md bg-transparent border border-gray-500"
              />
              <input
                type="number"
                value={item.rate}
                onChange={(e) => {
                  const updated = [...items];
                  updated[index].rate = +e.target.value;
                  setItems(updated);
                }}
                className="px-3 py-2 rounded-md bg-transparent border border-gray-500"
              />
              <button
                onClick={() => handleRemoveItem(index)}
                className="bg-red-600 hover:bg-red-700 rounded-md text-white flex items-center justify-center"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button
            onClick={handleAddItem}
            className="flex items-center px-3 py-2 bg-blue-500 hover:bg-blue-600 rounded-md text-sm font-medium text-white"
          >
            <Plus size={16} className="mr-2" /> Add Item
          </button>
        </div>

        {/* PREVIEW SECTION */}
        <div
          ref={componentRef}
          className="bg-white text-black p-6 mt-10 rounded-lg shadow-lg max-w-4xl mx-auto"
        >
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-xl font-bold">{companyProfile.companyName}</h1>
              <p className="text-sm">{companyProfile.companyAddress}</p>
              <p className="text-sm">{companyProfile.companyPhone}</p>
              <p className="text-sm">{companyProfile.companyEmail}</p>
            </div>
            <div className="text-right">
              <h1 className="text-xl font-bold">INVOICE</h1>
              {companyProfile.logoUrl && (
                <img
                  src={companyProfile.logoUrl}
                  alt="Logo"
                  className="mt-2 mx-auto w-20 h-auto"
                />
              )}
            </div>
          </div>

          {/* Client */}
          <div className="grid sm:grid-cols-2 gap-4 border border-gray-300 p-3 rounded-md mb-4">
            <div>
              <h2 className="font-bold text-sm mb-1">BILL TO</h2>
              <p className="font-semibold text-sm">{client.name}</p>
              <p className="text-sm">{client.address}</p>
              <p className="text-sm">{client.email}</p>
              <p className="text-sm">{client.phone}</p>
            </div>
            <div>
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <td className="bg-gray-300 font-semibold px-2 py-1">Invoice No</td>
                    <td className="border px-2 py-1">{invoiceDetails.number}</td>
                  </tr>
                  <tr>
                    <td className="bg-gray-300 font-semibold px-2 py-1">Invoice Date</td>
                    <td className="border px-2 py-1">{invoiceDetails.date}</td>
                  </tr>
                  <tr>
                    <td className="bg-gray-300 font-semibold px-2 py-1">Due Date</td>
                    <td className="border px-2 py-1">{invoiceDetails.dueDate}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-sm border border-gray-300 mb-4">
            <thead className="bg-gray-300">
              <tr>
                <th className="text-left px-2 py-1">Description</th>
                <th className="text-right px-2 py-1">Qty</th>
                <th className="text-right px-2 py-1">Rate</th>
                <th className="text-right px-2 py-1">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="border-t border-gray-300">
                  <td className="px-2 py-1">{item.description}</td>
                  <td className="text-right px-2 py-1">{item.qty}</td>
                  <td className="text-right px-2 py-1">
                    {currency} {item.rate.toFixed(2)}
                  </td>
                  <td className="text-right px-2 py-1">
                    {currency} {(item.qty * item.rate).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Summary */}
          <div className="flex flex-wrap justify-between gap-4">
            <div className="flex-1 min-w-[250px] border border-gray-300 p-3 rounded-md">
              <h3 className="font-semibold text-sm mb-1">BANK DETAILS</h3>
              <p className="text-sm whitespace-pre-line">{bankDetails}</p>
            </div>
            <div className="flex-1 min-w-[200px] border border-gray-300 p-3 rounded-md">
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <td>Subtotal</td>
                    <td className="text-right">{currency} {totals.subtotal.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td>Discount</td>
                    <td className="text-right">{currency} {discount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td>VAT ({vat}%)</td>
                    <td className="text-right">{currency} {totals.vatAmount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td>Shipping</td>
                    <td className="text-right">{currency} {shipping.toFixed(2)}</td>
                  </tr>
                  <tr className="font-bold border-t border-gray-400">
                    <td>Total</td>
                    <td className="text-right">{currency} {totals.total.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Terms */}
          <div className="text-center mt-6 text-xs text-gray-700 leading-snug">
            <h3 className="font-semibold mb-1">Terms & Conditions</h3>
            <p>{terms}</p>
            <p className="mt-4 font-semibold">
              Thank you for doing business with {companyProfile.companyName}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

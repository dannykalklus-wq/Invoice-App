'use client';
export const dynamic = 'force-dynamic';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
  Plus, Trash2, Printer, Save, Upload, RefreshCcw,
  Sun, Moon, Eye, Trash, Search
} from 'lucide-react';
import { supabase } from "../lib/supabaseClient";// or '../../lib/supabaseClient' depending on where page.tsx sits

type Item = { description: string; qty: number; rate: number };
type CompanyProfile = { logoUrl: string; companyName: string; companyEmail: string; companyPhone: string; companyAddress: string; companyTin: string; };
type PaymentStatus = 'Unpaid'|'Partially Paid'|'Paid';
type Invoice = {
  invoiceNo: string; invoiceDate: string; dueDate: string;
  clientName: string; clientPhone: string; clientEmail: string; clientAddress: string;
  items: Item[]; bankDetails: string; additionalDetails: string; terms: string;
  logoUrl: string; companyName: string; companyEmail: string; companyPhone: string; companyAddress: string; companyTin: string;
  taxRate: number; discount: number; shipping: number;
  paymentStatus: PaymentStatus; currency: string;
};

const num = (v:any)=>{ const n = typeof v==='number'?v:parseFloat(String(v).replace(/,/g,'')); return Number.isFinite(n)?n:0; };
const money = (n:number,c:string)=> new Intl.NumberFormat(undefined,{style:'currency',currency:c}).format(num(n));
const safeRead = <T,>(k:string,f:T):T=>{ if(typeof window==='undefined') return f; try{ const r=localStorage.getItem(k); return r?JSON.parse(r) as T:f;}catch{return f;} };
const safeWrite = (k:string,v:unknown)=>{ if(typeof window==='undefined') return; try{ localStorage.setItem(k,JSON.stringify(v)); }catch{} };

const DEFAULT_PROFILE:CompanyProfile = { logoUrl:'', companyName:'Lexvor Group Ltd', companyEmail:'', companyPhone:'', companyAddress:'', companyTin:'' };
const newInvoiceFromProfile = (p:CompanyProfile, currency='GHS'):Invoice => ({
  invoiceNo:'INV-0001', invoiceDate:new Date().toISOString().slice(0,10), dueDate:new Date(Date.now()+7*864e5).toISOString().slice(0,10),
  clientName:'', clientPhone:'', clientEmail:'', clientAddress:'', items:[{description:'',qty:1,rate:0}],
  bankDetails:'', additionalDetails:'', terms:'',
  logoUrl:p.logoUrl, companyName:p.companyName, companyEmail:p.companyEmail, companyPhone:p.companyPhone, companyAddress:p.companyAddress, companyTin:p.companyTin,
  taxRate:0, discount:0, shipping:0, paymentStatus:'Unpaid', currency
});

const useTheme = ()=> {
  const [dark,setDark]=useState<boolean>(()=>{ if(typeof window==='undefined') return false; const s=localStorage.getItem('__theme'); if(s) return s==='dark'; return window.matchMedia?.('(prefers-color-scheme:dark)').matches ?? false; });
  useEffect(()=>{ document.documentElement.classList.toggle('dark',dark); localStorage.setItem('__theme', dark ? 'dark':'light'); },[dark]);
  return {dark,setDark};
};

const PrintInvoice = React.forwardRef<HTMLDivElement, {invoice:Invoice}>(({invoice}, ref)=>{
  const subTotal = invoice.items.reduce((s,it)=>s+num(it.qty)*num(it.rate),0);
  const vat = subTotal*(num(invoice.taxRate)/100);
  const total = subTotal - num(invoice.discount) + vat + num(invoice.shipping);
  const gridGray = '#d0d0d0', headerGray = '#f3f4f6', borderThin = `0.6pt solid ${gridGray}`;

  return (
    <div ref={ref} className="print-area">
      <div className="print-inner">
        <div style={{padding:'12px 0'}}>
          <div style={{display:'grid', gridTemplateColumns:'1fr 280px', gap:16, alignItems:'start'}}>
            <div>
              <div style={{fontWeight:800, fontSize:18}}>{invoice.companyName}</div>
              {invoice.companyTin && <div style={{fontSize:10}}>TIN: {invoice.companyTin}</div>}
              {invoice.companyAddress && <div style={{fontSize:10, whiteSpace:'pre-wrap'}}>{invoice.companyAddress}</div>}
              {invoice.companyPhone && <div style={{fontSize:10}}>{invoice.companyPhone}</div>}
              {invoice.companyEmail && <div style={{fontSize:10}}>{invoice.companyEmail}</div>}
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:16,fontWeight:800}}>INVOICE</div>
              <div style={{marginTop:8}}>
                {invoice.logoUrl ? <img src={invoice.logoUrl} alt="Logo" style={{maxHeight:'110px', objectFit:'contain'}}/> : <div style={{height:110,width:200,border:'1px solid #ddd'}} />}
              </div>
            </div>
          </div>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:12, alignItems:'start'}}>
            <div>
              <div style={{fontSize:9, fontWeight:700, marginBottom:6}}>Bill To</div>
              <div style={{border:borderThin, borderRadius:6, padding:8}}>
                {invoice.clientName? <div style={{fontWeight:700}}>{invoice.clientName}</div> : <div style={{color:'#666'}}>—</div>}
                {invoice.clientAddress && <div style={{whiteSpace:'pre-wrap', marginTop:4}}>{invoice.clientAddress}</div>}
                {invoice.clientEmail && <div style={{marginTop:4}}>{invoice.clientEmail}</div>}
                {invoice.clientPhone && <div style={{marginTop:4}}>{invoice.clientPhone}</div>}
              </div>
            </div>
            <div>
              <div style={{display:'grid', gridTemplateRows:'1fr 1fr 1fr', gap:6}}>
                {[['Invoice No', invoice.invoiceNo], ['Invoice Date', invoice.invoiceDate], ['Due Date', invoice.dueDate]].map((row,i)=>(
                  <div key={i} style={{display:'grid', gridTemplateColumns:'100px 1fr'}}>
                    <div style={{background:headerGray, border:borderThin, padding:6, fontWeight:700}}>{row[0]}</div>
                    <div style={{border:borderThin, padding:6}}>{row[1] || '-'}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{marginTop:12, border:borderThin, borderRadius:6}}>
            <table style={{width:'100%', borderCollapse:'collapse', fontSize:12}}>
              <thead style={{background:'#f3f4f6'}}>
                <tr>
                  <th style={{textAlign:'left', padding:8}}>Description</th>
                  <th style={{textAlign:'right', padding:8}}>Qty</th>
                  <th style={{textAlign:'right', padding:8}}>Rate</th>
                  <th style={{textAlign:'right', padding:8}}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((it,i)=>(
                  <tr key={i}>
                    <td style={{padding:8, borderBottom:`0.6pt dotted ${gridGray}`}}>{it.description}</td>
                    <td style={{padding:8, textAlign:'right', borderBottom:`0.6pt dotted ${gridGray}`}}>{num(it.qty)}</td>
                    <td style={{padding:8, textAlign:'right', borderBottom:`0.6pt dotted ${gridGray}`}}>{money(it.rate, invoice.currency)}</td>
                    <td style={{padding:8, textAlign:'right', borderBottom:`0.6pt dotted ${gridGray}`}}>{money(num(it.qty)*num(it.rate), invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{display:'grid', gridTemplateColumns: invoice.bankDetails ? '1fr 280px' : '1fr', gap:12, marginTop:12}}>
            {invoice.bankDetails && (
              <div style={{border:borderThin, borderRadius:6}}>
                <div style={{padding:8, borderBottom:borderThin, fontWeight:700}}>Bank Details</div>
                <div style={{padding:8, whiteSpace:'pre-wrap'}}>{invoice.bankDetails}</div>
              </div>
            )}
            <div style={{border:borderThin, borderRadius:6}}>
              <table style={{width:'100%', borderCollapse:'collapse', fontSize:12}}>
                <thead style={{background:'#f3f4f6'}}><tr><th style={{padding:8}}>Summary</th><th style={{padding:8, textAlign:'right'}}>Amount</th></tr></thead>
                <tbody>
                  <tr><td style={{padding:6}}>Subtotal</td><td style={{padding:6, textAlign:'right'}}>{money(subTotal, invoice.currency)}</td></tr>
                  <tr><td style={{padding:6}}>Discount</td><td style={{padding:6, textAlign:'right'}}>{money(invoice.discount, invoice.currency)}</td></tr>
                  <tr><td style={{padding:6}}>VAT ({invoice.taxRate}%)</td><td style={{padding:6, textAlign:'right'}}>{money(vat, invoice.currency)}</td></tr>
                  <tr><td style={{padding:6}}>Shipping</td><td style={{padding:6, textAlign:'right'}}>{money(invoice.shipping, invoice.currency)}</td></tr>
                  <tr><td style={{padding:6, fontWeight:700}}>Total</td><td style={{padding:6, textAlign:'right', fontWeight:700}}>{money(total, invoice.currency)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div style={{marginTop:12, border:borderThin, borderRadius:6, textAlign:'center', padding:10}}>
            <div style={{fontWeight:700}}>Terms & Conditions</div>
            <div style={{whiteSpace:'pre-wrap', marginTop:6}}>{invoice.terms || '—'}</div>
          </div>

          <div style={{textAlign:'center', marginTop:16, fontWeight:700}}>Thank you for doing business with Lexvor Group Limited</div>
        </div>
      </div>
    </div>
  );
});
PrintInvoice.displayName='PrintInvoice';

export default function App(){
  const {dark,setDark} = useTheme();
  // Currency
  const [currency,setCurrency]=useState<string>(()=>{ if(typeof window==='undefined') return 'GHS'; return localStorage.getItem('__currency') || 'GHS'; });
  useEffect(()=>{ if(typeof window!=='undefined') localStorage.setItem('__currency', currency); },[currency]);

  const [profile,setProfile] = useState<CompanyProfile>(()=> safeRead<CompanyProfile>('__company_profile', DEFAULT_PROFILE));
  useEffect(()=> safeWrite('__company_profile', profile), [profile]);

  const [invoice,setInvoice] = useState<Invoice>(()=> safeRead<Invoice>('__invoice_draft', newInvoiceFromProfile(DEFAULT_PROFILE, currency)));
  useEffect(()=> {
    setInvoice(inv => ({ ...inv, currency, logoUrl: profile.logoUrl || inv.logoUrl, companyName: profile.companyName || inv.companyName, companyEmail: profile.companyEmail || inv.companyEmail, companyPhone: profile.companyPhone || inv.companyPhone, companyAddress: profile.companyAddress || inv.companyAddress, companyTin: profile.companyTin || inv.companyTin }));
  }, [profile.logoUrl, profile.companyName, profile.companyEmail, profile.companyPhone, profile.companyAddress, profile.companyTin, currency]);
  useEffect(()=> safeWrite('__invoice_draft', invoice), [invoice]);

  const [db,setDb] = useState<Invoice[]>(()=> safeRead<Invoice[]>('__invoices_db', []));
  useEffect(()=> safeWrite('__invoices_db', db), [db]);

  const [tab,setTab] = useState<'create'|'invoices'>('create');

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrintDraft = useReactToPrint({ contentRef: printRef, documentTitle: `Invoice_${invoice.invoiceNo}` });

  const rowPrintRef = useRef<HTMLDivElement>(null);
  const [printRow,setPrintRow] = useState<Invoice|null>(null);
  const handlePrintRow = useReactToPrint({ contentRef: rowPrintRef, documentTitle: `Invoice_${printRow?.invoiceNo||'Invoice'}` });

  const subTotal = useMemo(()=> invoice.items.reduce((s,it)=>s+num(it.qty)*num(it.rate),0), [invoice.items]);
  const vat = useMemo(()=> subTotal*(num(invoice.taxRate)/100), [subTotal, invoice.taxRate]);
  const total = useMemo(()=> subTotal - num(invoice.discount) + vat + num(invoice.shipping), [subTotal, vat, invoice.discount, invoice.shipping]);

  const onLogoUpload = (e:React.ChangeEvent<HTMLInputElement>)=>{
    const file = e.target.files?.[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=> setProfile(p=> ({ ...p, logoUrl: String(reader.result || '') }));
    reader.readAsDataURL(file);
  };
  const addItem = ()=> setInvoice(s=>({...s, items:[...s.items, {description:'', qty:1, rate:0}]}));
  const updateItem = (i:number, patch:Partial<Item>)=> setInvoice(s=>{ const items=s.items.slice(); items[i]={...items[i],...patch}; return {...s, items}; });
  const removeItem = (i:number)=> setInvoice(s=>({...s, items: s.items.filter((_,k)=>k!==i)}));

  const saveToLocal = ()=> { setDb(rows => { const others = rows.filter(r=> r.invoiceNo !== invoice.invoiceNo); return [{...invoice}, ...others]; }); setTab('invoices'); };

  const deleteFromDB = (invoiceNo:string)=> setDb(rows=> rows.filter(r=> r.invoiceNo !== invoiceNo));
  const viewToDraft = (invoiceNo:string)=> { const src = db.find(r=> r.invoiceNo===invoiceNo); if(!src) return; setInvoice({...src}); setTab('create'); window?.scrollTo?.({top:0, behavior:'smooth'}); };
  const exportRowToPDF = (invoiceNo:string)=> { const src = db.find(r=> r.invoiceNo===invoiceNo); if(!src) return; setPrintRow({...src}); setTimeout(()=> handlePrintRow(), 50); };

  const [search,setSearch] = useState('');
  const filtered = useMemo(()=>{ const q = search.trim().toLowerCase(); if(!q) return db; return db.filter(r => r.invoiceNo.toLowerCase().includes(q) || r.clientName.toLowerCase().includes(q) || r.paymentStatus.toLowerCase().includes(q) || r.invoiceDate.toLowerCase().includes(q) || r.dueDate.toLowerCase().includes(q)); }, [db, search]);

  return (
    <main className="min-h-screen p-4">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
        <div style={{fontSize:18, fontWeight:700}}>Invoice System</div>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <select value={invoice.currency} onChange={(e)=> setInvoice(prev=> ({...prev, currency: e.target.value}))} style={{padding:8, borderRadius:8}}>
            {['GHS','USD','EUR','GBP','NGN','ZAR','CAD','AUD'].map(c=> <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={()=> setDark(!dark)} className="btn-ghost-strong" aria-label="Toggle theme" style={{padding:8,borderRadius:8}}>{dark? <Sun/> : <Moon/>}</button>
        </div>
      </div>

      <div style={{display:'flex', gap:8, marginBottom:12}}>
        <button onClick={()=> setTab('create')} style={{padding:8,borderRadius:8, background: tab==='create' ? '#111827':'#0b1220', color:'#fff'}}>Create Invoice</button>
        <button onClick={()=> setTab('invoices')} style={{padding:8,borderRadius:8, background: tab==='invoices' ? '#111827':'#0b1220', color:'#fff'}}>Invoices</button>
      </div>

      {tab==='create' && (
        <>
          <div style={{display:'flex', gap:8, flexWrap:'wrap', marginBottom:12}}>
            <button className="btn btn-primary" onClick={handlePrintDraft}><Printer/> Export to PDF</button>
            <button className="btn" onClick={saveToLocal}><Save/> Save to DB</button>
            <button className="btn" onClick={()=> setInvoice(newInvoiceFromProfile(profile, invoice.currency))}><RefreshCcw/> New from Profile</button>
            <label style={{display:'inline-flex',alignItems:'center',gap:8, padding:8, borderRadius:8, background:'#111827', cursor:'pointer'}}><Upload/> Upload Logo <input type="file" accept="image/*" style={{display:'none'}} onChange={onLogoUpload} /></label>
          </div>

          <section style={{marginBottom:12, padding:12, borderRadius:12, background:'#0b1220'}}>
            <div style={{fontWeight:700, marginBottom:8}}>Company Profile (persists)</div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
              <div>
                <label>Company Name</label>
                <input className="input" value={profile.companyName} onChange={(e)=> setProfile({...profile, companyName: e.target.value})} />
                <label>Company Email</label>
                <input className="input" value={profile.companyEmail} onChange={(e)=> setProfile({...profile, companyEmail: e.target.value})} />
                <label>Company Phone</label>
                <input className="input" value={profile.companyPhone} onChange={(e)=> setProfile({...profile, companyPhone: e.target.value})} />
              </div>
              <div>
                <label>Company Address</label>
                <textarea className="textarea" rows={4} value={profile.companyAddress} onChange={(e)=> setProfile({...profile, companyAddress: e.target.value})} />
                <label>Company TIN</label>
                <input className="input" value={profile.companyTin} onChange={(e)=> setProfile({...profile, companyTin: e.target.value})} />
                <div style={{marginTop:8}}>
                  {profile.logoUrl ? <img src={profile.logoUrl} alt="Logo" style={{height:40, objectFit:'contain'}}/> : <div style={{height:40,width:40, background:'#111827'}}/>}
                </div>
              </div>
            </div>
          </section>

          <section style={{marginBottom:12, padding:12, borderRadius:12, background:'#0b1220'}}>
            <div style={{fontWeight:700, marginBottom:8}}>Invoice Settings</div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8}}>
              <input className="input" value={invoice.invoiceNo} onChange={(e)=> setInvoice({...invoice, invoiceNo: e.target.value})} placeholder="Invoice No"/>
              <input className="input" type="date" value={invoice.invoiceDate} onChange={(e)=> setInvoice({...invoice, invoiceDate: e.target.value})}/>
              <input className="input" type="date" value={invoice.dueDate} onChange={(e)=> setInvoice({...invoice, dueDate: e.target.value})}/>
              <select className="input" value={invoice.paymentStatus} onChange={(e)=> setInvoice({...invoice, paymentStatus: e.target.value as PaymentStatus})}>
                <option>Unpaid</option><option>Partially Paid</option><option>Paid</option>
              </select>
            </div>
          </section>

          <section style={{marginBottom:12, padding:12, borderRadius:12, background:'#0b1220'}}>
            <div style={{fontWeight:700, marginBottom:8}}>Bill To</div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
              <div>
                <input className="input" placeholder="Client Name" value={invoice.clientName} onChange={(e)=> setInvoice({...invoice, clientName: e.target.value})}/>
                <input className="input" placeholder="Client Email" value={invoice.clientEmail} onChange={(e)=> setInvoice({...invoice, clientEmail: e.target.value})}/>
              </div>
              <div>
                <input className="input" placeholder="Client Phone" value={invoice.clientPhone} onChange={(e)=> setInvoice({...invoice, clientPhone: e.target.value})}/>
                <textarea className="textarea" rows={3} placeholder="Client Address" value={invoice.clientAddress} onChange={(e)=> setInvoice({...invoice, clientAddress: e.target.value})}/>
              </div>
            </div>
          </section>

          <section style={{marginBottom:12, padding:12, borderRadius:12, background:'#0b1220'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
              <div style={{fontWeight:700}}>Items</div>
              <div><button className="btn" onClick={addItem}><Plus/> Add Item</button></div>
            </div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%', borderCollapse:'collapse'}}>
                <thead style={{background:'#0f172a'}}>
                  <tr>
                    <th>Description</th><th style={{textAlign:'right'}}>Qty</th><th style={{textAlign:'right'}}>Rate</th><th style={{textAlign:'right'}}>Amount</th><th style={{textAlign:'right'}}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((it,i)=>(
                    <tr key={i}>
                      <td><input className="input" value={it.description} onChange={(e)=> updateItem(i,{description:e.target.value})}/></td>
                      <td><input className="input" type="number" value={it.qty} onChange={(e)=> updateItem(i,{qty:num(e.target.value)})} style={{textAlign:'right'}}/></td>
                      <td><input className="input" type="number" value={it.rate} onChange={(e)=> updateItem(i,{rate:num(e.target.value)})} style={{textAlign:'right'}}/></td>
                      <td style={{textAlign:'right'}}>{money(num(it.qty)*num(it.rate), invoice.currency)}</td>
                      <td style={{textAlign:'right'}}><button className="btn" onClick={()=> removeItem(i)}><Trash2/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{display:'flex', justifyContent:'flex-end', marginTop:12}}>
              <div style={{width:320}}>
                <div style={{display:'flex', justifyContent:'space-between'}}><div>Subtotal</div><div>{money(subTotal, invoice.currency)}</div></div>
                <div style={{display:'flex', justifyContent:'space-between', marginTop:6}}><div><label>VAT %</label> <input className="input" type="number" value={invoice.taxRate} onChange={(e)=> setInvoice({...invoice, taxRate:num(e.target.value)})} style={{width:80}}/></div><div>{money(vat, invoice.currency)}</div></div>
                <div style={{display:'flex', justifyContent:'space-between', marginTop:6}}><div><label>Discount</label> <input className="input" type="number" value={invoice.discount} onChange={(e)=> setInvoice({...invoice, discount:num(e.target.value)})} style={{width:100}}/></div><div>{money(invoice.discount, invoice.currency)}</div></div>
                <div style={{display:'flex', justifyContent:'space-between', marginTop:6}}><div><label>Shipping</label> <input className="input" type="number" value={invoice.shipping} onChange={(e)=> setInvoice({...invoice, shipping:num(e.target.value)})} style={{width:100}}/></div><div>{money(invoice.shipping, invoice.currency)}</div></div>
                <div style={{borderTop:'1px solid #222', marginTop:8, display:'flex', justifyContent:'space-between', fontWeight:700}}><div>Total</div><div>{money(total, invoice.currency)}</div></div>
              </div>
            </div>
          </section>

          <section style={{padding:12, borderRadius:12, background:'#0b1220'}}>
            <div style={{fontWeight:700, marginBottom:8}}>Bank Details, Additional Info & Terms</div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8}}>
              <textarea className="textarea" rows={4} placeholder="Bank Details" value={invoice.bankDetails} onChange={(e)=> setInvoice({...invoice, bankDetails: e.target.value})} />
              <textarea className="textarea" rows={4} placeholder="Additional Details" value={invoice.additionalDetails} onChange={(e)=> setInvoice({...invoice, additionalDetails: e.target.value})} />
              <textarea className="textarea" rows={4} placeholder="Terms & Conditions" value={invoice.terms} onChange={(e)=> setInvoice({...invoice, terms: e.target.value})} />
            </div>
          </section>

          <div style={{display:'none'}}><div ref={printRef}><PrintInvoice invoice={invoice}/></div></div>
          <section style={{marginTop:12}}>
            <div style={{maxWidth: '100%', overflow:'auto'}}>
              <div style={{background:'#fff', color:'#000', width:'210mm', margin:'0 auto'}}>
                <div style={{width:'186mm', margin:'0 auto'}}><PrintInvoice invoice={invoice}/></div>
              </div>
            </div>
          </section>
        </>
      )}

      {tab==='invoices' && (
        <section style={{marginTop:12}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
            <div style={{fontWeight:700}}>Invoices</div>
            <div style={{display:'flex', gap:8}}>
              <div style={{position:'relative'}}><Search style={{position:'absolute', left:8, top:'50%', transform:'translateY(-50%)'}}/><input placeholder="Search by #, client, status, date…" value={search} onChange={(e)=> setSearch(e.target.value)} style={{paddingLeft:28}}/></div>
              <select onChange={(e)=> e.target.value && viewToDraft(e.target.value)}><option value="">Quick select…</option>{filtered.slice(0,20).map(r => <option key={r.invoiceNo} value={r.invoiceNo}>{r.invoiceNo} — {r.clientName}</option>)}</select>
            </div>
          </div>

          <div style={{overflow:'auto'}}>
            <table style={{width:'100%', borderCollapse:'collapse'}}>
              <thead style={{background:'#0f172a'}}><tr><th>Invoice No</th><th>Invoice Date</th><th>Due Date</th><th>Client</th><th>Status</th><th>Total</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(r=>{
                  const sub = r.items.reduce((s,i)=> s + num(i.qty)*num(i.rate), 0);
                  const v = sub * (num(r.taxRate)/100);
                  const t = sub - num(r.discount) + v + num(r.shipping);
                  return (
                    <tr key={r.invoiceNo}>
                      <td>{r.invoiceNo}</td><td>{r.invoiceDate}</td><td>{r.dueDate}</td><td>{r.clientName}</td><td>{r.paymentStatus}</td><td>{money(t, r.currency || invoice.currency)}</td>
                      <td style={{textAlign:'right'}}>
                        <button className="btn" onClick={()=> viewToDraft(r.invoiceNo)} aria-label="View/Edit"><Eye/></button>
                        <button className="btn" onClick={()=> exportRowToPDF(r.invoiceNo)} aria-label="Export PDF"><Printer/></button>
                        <button className="btn" onClick={()=> deleteFromDB(r.invoiceNo)} aria-label="Delete"><Trash/></button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length===0 && <tr><td colSpan={7} style={{textAlign:'center', padding:12}}>No matches.</td></tr>}
              </tbody>
            </table>
          </div>

          <div style={{display:'none'}}><div ref={rowPrintRef}>{printRow && <PrintInvoice invoice={printRow}/>}</div></div>
        </section>
      )}
    </main>
  );
}

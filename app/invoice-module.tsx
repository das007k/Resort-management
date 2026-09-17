"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Download, FileCheck2, MessageCircleMore, Plus, ReceiptText, Settings2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TaxSettings } from "./commercial-config";
import { money } from "./domain";

type InvoiceItem = { id: number; description: string; category: "accommodation" | "service"; quantity: number; rate: number };

const seedItems: InvoiceItem[] = [
  { id: 1, description: "Pepper Cottage · 3 nights", category: "accommodation", quantity: 1, rate: 37260 },
  { id: 2, description: "Breakfast plan · 3 days", category: "service", quantity: 1, rate: 4050 },
  { id: 3, description: "Jeep safari", category: "service", quantity: 1, rate: 4500 },
];

export function InvoiceGenerator({ taxSettings, onConfigureTax, onNotice }: { taxSettings: TaxSettings; onConfigureTax: () => void; onNotice: (value: string) => void }) {
  const [guest, setGuest] = useState("Neha Menon");
  const [phone, setPhone] = useState("+91 98470 55221");
  const [bookingId, setBookingId] = useState("STX-1048");
  const [invoiceDate, setInvoiceDate] = useState("2026-12-23");
  const [items, setItems] = useState<InvoiceItem[]>(seedItems);
  const [paid, setPaid] = useState(25000);
  const [finalized, setFinalized] = useState(false);

  const totals = useMemo(() => {
    const accommodation = items.filter((item) => item.category === "accommodation").reduce((sum, item) => sum + item.quantity * item.rate, 0);
    const services = items.filter((item) => item.category === "service").reduce((sum, item) => sum + item.quantity * item.rate, 0);
    const accommodationTax = !taxSettings.gstEnabled ? 0 : Math.round(taxSettings.pricesIncludeTax ? accommodation - accommodation / (1 + taxSettings.accommodationRate / 100) : accommodation * taxSettings.accommodationRate / 100);
    const serviceTax = !taxSettings.gstEnabled ? 0 : Math.round(taxSettings.pricesIncludeTax ? services - services / (1 + taxSettings.serviceRate / 100) : services * taxSettings.serviceRate / 100);
    const subtotal = accommodation + services;
    const total = taxSettings.pricesIncludeTax ? subtotal : subtotal + accommodationTax + serviceTax;
    return { accommodationTax, serviceTax, subtotal, total, balance: Math.max(0, total - paid) };
  }, [items, paid, taxSettings]);

  const updateItem = (id: number, changes: Partial<InvoiceItem>) => setItems((current) => current.map((item) => item.id === id ? { ...item, ...changes } : item));
  const addItem = () => setItems((current) => [...current, { id: Date.now(), description: "New service", category: "service", quantity: 1, rate: 0 }]);
  const removeItem = (id: number) => setItems((current) => current.filter((item) => item.id !== id));
  const flash = (message: string) => { onNotice(message); window.setTimeout(() => onNotice(""), 3600); };
  const finalize = () => { setFinalized(true); flash(`Invoice ${taxSettings.invoicePrefix || "INV"}-2026-018 finalized.`); };
  const share = () => {
    const message = `Hello ${guest}, your final invoice ${taxSettings.invoicePrefix || "INV"}-2026-018 for ${money(totals.total)} is ready. Balance due: ${money(totals.balance)}.`;
    window.open(`https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  return <>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-1 text-xs font-bold uppercase tracking-[.14em] text-[#006ce4]">Finance desk</p><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Final invoice generator</h1><p className="mt-2 max-w-2xl text-sm text-slate-500">Create a tax-ready guest invoice from the final stay folio, record collections and share the balance due.</p></div><div className="flex gap-2"><Button variant="outline" onClick={addItem}><Plus /> Add line item</Button><Button className="bg-[#003b95]" onClick={finalize}><FileCheck2 /> Finalize invoice</Button></div></div>
    <section className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
      <div className="space-y-5">
        <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="mb-5"><h2 className="font-bold">Guest & booking</h2><p className="mt-1 text-sm text-slate-500">Invoice identity and stay reference.</p></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Guest name"><Input value={guest} onChange={(e) => setGuest(e.target.value)} /></Field><Field label="WhatsApp number"><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field><Field label="Booking ID"><Input value={bookingId} onChange={(e) => setBookingId(e.target.value)} /></Field><Field label="Invoice date"><Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} /></Field></div></div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-bold">Final folio</h2><p className="mt-1 text-sm text-slate-500">Separate accommodation and services for the configured GST breakup.</p></div><Badge variant="outline">{items.length} items</Badge></div><div className="space-y-3">{items.map((item) => <div key={item.id} className="grid gap-3 rounded-xl border p-3 sm:grid-cols-[1fr_150px_90px_130px_36px] sm:items-end"><Field label="Description"><Input value={item.description} onChange={(e) => updateItem(item.id, { description: e.target.value })} /></Field><Field label="Tax category"><select value={item.category} onChange={(e) => updateItem(item.id, { category: e.target.value as InvoiceItem["category"] })} className="h-10 rounded-md border bg-white px-3 text-sm"><option value="accommodation">Accommodation</option><option value="service">Service / add-on</option></select></Field><Field label="Qty"><Input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(item.id, { quantity: Math.max(1, Number(e.target.value)) })} /></Field><Field label="Rate"><Input type="number" min="0" value={item.rate} onChange={(e) => updateItem(item.id, { rate: Math.max(0, Number(e.target.value)) })} /></Field><button onClick={() => removeItem(item.id)} className="mb-0.5 grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Remove ${item.description}`}><Trash2 className="size-4" /></button></div>)}</div><Button variant="outline" className="mt-4" onClick={addItem}><Plus /> Add another item</Button></div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-bold">Payment status</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Amount received"><Input type="number" min="0" value={paid} onChange={(e) => setPaid(Math.max(0, Number(e.target.value)))} /></Field><div className="rounded-xl bg-slate-50 p-4"><span className="text-xs uppercase tracking-wider text-slate-500">Balance due</span><strong className={`mt-1 block text-2xl ${totals.balance > 0 ? "text-rose-600" : "text-emerald-700"}`}>{money(totals.balance)}</strong></div></div></div>
      </div>
      <div className="xl:sticky xl:top-[100px] xl:self-start">
        <div className={`invoice-print-area overflow-hidden rounded-2xl border bg-white shadow-sm ${finalized ? "ring-2 ring-emerald-300" : ""}`}><div className="bg-[#004bad] p-6 text-white"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-[#febb02]">Cardamom Rock Resort</p><h2 className="mt-2 text-2xl font-bold">Tax invoice</h2><p className="mt-1 text-sm text-white/60">{taxSettings.invoicePrefix || "INV"}-2026-018 · {invoiceDate}</p>{taxSettings.gstEnabled && <p className="mt-1 text-xs text-white/45">GSTIN {taxSettings.gstin || "Not configured"}</p>}</div><span className="grid size-11 place-items-center rounded-xl bg-[#febb02] text-[#003b95]"><ReceiptText /></span></div></div><div className="p-6"><div className="flex justify-between gap-4 border-b pb-5"><div><span className="text-xs uppercase tracking-wider text-slate-400">Billed to</span><strong className="mt-1 block">{guest}</strong><span className="text-sm text-slate-500">{phone}</span></div><div className="text-right"><span className="text-xs uppercase tracking-wider text-slate-400">Booking</span><strong className="mt-1 block">{bookingId}</strong>{finalized && <span className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-emerald-700"><CheckCircle2 className="size-3.5" /> Final</span>}</div></div><div className="py-5"><div className="mb-3 grid grid-cols-[1fr_80px_100px] text-xs font-bold uppercase tracking-wider text-slate-400"><span>Item</span><span className="text-center">Qty</span><span className="text-right">Amount</span></div><div className="space-y-3">{items.map((item) => <div key={item.id} className="grid grid-cols-[1fr_80px_100px] items-center text-sm"><span><strong className="block">{item.description}</strong><span className="text-xs capitalize text-slate-400">{item.category}</span></span><span className="text-center text-slate-500">{item.quantity}</span><strong className="text-right">{money(item.quantity * item.rate)}</strong></div>)}</div></div><div className="space-y-3 border-t pt-5"><Line label="Subtotal" value={totals.subtotal} />{taxSettings.gstEnabled && <><Line label={`Accommodation GST (${taxSettings.accommodationRate}%${taxSettings.pricesIncludeTax ? " included" : ""})`} value={totals.accommodationTax} /><Line label={`Services GST (${taxSettings.serviceRate}%${taxSettings.pricesIncludeTax ? " included" : ""})`} value={totals.serviceTax} /></>}<div className="flex items-end justify-between rounded-xl bg-blue-50 p-4"><span><span className="block text-xs uppercase tracking-wider text-slate-500">Invoice total</span><button onClick={onConfigureTax} className="mt-1 flex items-center gap-1 text-xs font-bold text-[#003b95]"><Settings2 className="size-3" /> Tax settings</button></span><strong className="text-2xl text-[#003b95]">{money(totals.total)}</strong></div><Line label="Amount received" value={-Math.min(paid, totals.total)} accent /><div className="flex justify-between border-t pt-3"><strong>Balance due</strong><strong className={totals.balance > 0 ? "text-rose-600" : "text-emerald-700"}>{money(totals.balance)}</strong></div></div></div></div><div className="mt-4 flex gap-2"><Button className="flex-1 bg-[#003b95]" onClick={share}><MessageCircleMore /> Share invoice</Button><Button variant="outline" onClick={() => window.print()}><Download /> PDF</Button></div>
      </div>
    </section>
  </>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-2 text-sm font-semibold">{label}{children}</label>; }
function Line({ label, value, accent }: { label: string; value: number; accent?: boolean }) { return <div className={`flex justify-between text-sm ${accent ? "font-semibold text-[#006ce4]" : "text-slate-600"}`}><span>{label}</span><strong className="text-slate-900">{value < 0 ? "−" : ""}{money(Math.abs(value))}</strong></div>; }

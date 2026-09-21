"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CreditCard, FileText, IndianRupee, Link2, RefreshCw, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { money, Reservation } from "./domain";

type PaymentRecord = {
  id: string; reference: string; reservationId: string; amount: number; method: string;
  status: "Pending" | "Paid"; createdAt: string; paidAt?: string | null; guest: string; unit: string;
};

export function PaymentOperations({ reservations, onReservationsChanged, onOpenInvoices, onNotice }: {
  reservations: Reservation[];
  onReservationsChanged: () => Promise<void>;
  onOpenInvoices: () => void;
  onNotice: (value: string) => void;
}) {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [busyId, setBusyId] = useState("");
  const savedReservations = reservations.filter((item) => item.persisted);
  const outstanding = savedReservations.filter((item) => item.paid < item.amount);

  const flash = (message: string) => { onNotice(message); window.setTimeout(() => onNotice(""), 4200); };
  const loadPayments = async () => {
    try {
      const response = await fetch("/api/payments", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json() as { payments?: PaymentRecord[] };
      setPayments(data.payments ?? []);
    } catch { /* The reservation workflow remains available while finance history reconnects. */ }
  };
  // Initial synchronization with the persisted finance ledger.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadPayments(); }, []);

  const totals = useMemo(() => ({
    collected: payments.filter((item) => item.status === "Paid").reduce((sum, item) => sum + item.amount, 0),
    requested: payments.filter((item) => item.status === "Pending").reduce((sum, item) => sum + item.amount, 0),
    outstanding: outstanding.reduce((sum, item) => sum + item.amount - item.paid, 0),
  }), [outstanding, payments]);

  const createRequest = async (reservation: Reservation) => {
    setBusyId(reservation.id);
    try {
      const response = await fetch("/api/payments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reservationId: reservation.id, amount: reservation.amount - reservation.paid, method: "Payment link" }) });
      const data = await response.json() as { payment?: PaymentRecord; error?: string };
      if (!response.ok || !data.payment) throw new Error(data.error || "Unable to create payment request.");
      await loadPayments(); flash(`${data.payment.reference} created for ${reservation.guest}.`);
    } catch (error) { flash(error instanceof Error ? error.message : "Unable to create payment request."); }
    finally { setBusyId(""); }
  };

  const recordPayment = async (payment: PaymentRecord) => {
    setBusyId(payment.id);
    try {
      const response = await fetch("/api/payments", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: payment.id }) });
      const data = await response.json() as { invoice?: { invoiceNo: string } | null; error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to record payment.");
      await Promise.all([loadPayments(), onReservationsChanged()]);
      flash(data.invoice ? `Payment recorded. Final invoice ${data.invoice.invoiceNo} created automatically.` : "Payment recorded and reservation balance updated.");
    } catch (error) { flash(error instanceof Error ? error.message : "Unable to record payment."); }
    finally { setBusyId(""); }
  };

  return <>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-1 text-xs font-bold uppercase tracking-[.14em] text-[#006ce4]">Finance desk</p><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Payments & settlements</h1><p className="mt-2 max-w-2xl text-sm text-slate-500">Create collection requests, record verified receipts and automatically close fully-paid guest folios.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => void loadPayments()}><RefreshCw /> Refresh</Button><Button className="bg-[#003b95]" onClick={onOpenInvoices}><FileText /> Final invoices</Button></div></div>
    <section className="mb-5 grid gap-4 md:grid-cols-4"><Metric label="Collected" value={money(totals.collected)} icon={CheckCircle2} /><Metric label="Requests pending" value={money(totals.requested)} icon={Link2} /><Metric label="Guest balance" value={money(totals.outstanding)} icon={IndianRupee} /><Metric label="Gateway mode" value="Ready" icon={ShieldCheck} /></section>
    <section className="grid gap-6 xl:grid-cols-[1fr_.9fr]">
      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="border-b p-5"><h2 className="font-bold">Outstanding reservations</h2><p className="mt-1 text-sm text-slate-500">Create a request for the current reservation balance.</p></div><div className="divide-y">{outstanding.map((reservation) => <div key={reservation.id} className="flex flex-wrap items-center gap-4 p-5"><span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-[#003b95]"><CreditCard className="size-5" /></span><span className="min-w-[180px] flex-1"><strong className="block text-sm">{reservation.guest}</strong><span className="text-xs text-slate-500">{reservation.id} · {reservation.unit}</span></span><span><strong className="block text-sm">{money(reservation.amount - reservation.paid)}</strong><span className="text-xs text-slate-500">balance due</span></span><Button size="sm" className="bg-[#003b95]" disabled={busyId === reservation.id} onClick={() => void createRequest(reservation)}>Create request</Button></div>)}{outstanding.length === 0 && <div className="p-10 text-center text-sm text-slate-500">No saved reservation currently has an outstanding balance.</div>}</div></div>
      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="border-b p-5"><h2 className="font-bold">Payment requests</h2><p className="mt-1 text-sm text-slate-500">Record receipt only after gateway, UPI, cash or bank confirmation.</p></div><div className="divide-y">{payments.map((payment) => <div key={payment.id} className="p-5"><div className="flex items-start justify-between gap-3"><span><strong className="block text-sm">{payment.guest}</strong><span className="text-xs text-slate-500">{payment.reference} · {payment.method}</span></span><Badge variant="outline" className={payment.status === "Paid" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}>{payment.status}</Badge></div><div className="mt-4 flex items-center justify-between gap-3"><strong className="text-lg text-[#003b95]">{money(payment.amount)}</strong>{payment.status === "Pending" ? <Button size="sm" variant="outline" disabled={busyId === payment.id} onClick={() => void recordPayment(payment)}><CheckCircle2 /> Record received</Button> : <span className="text-xs font-semibold text-emerald-700">Balance updated</span>}</div></div>)}{payments.length === 0 && <div className="p-10 text-center text-sm text-slate-500">Payment requests will appear here.</div>}</div><div className="flex items-center gap-2 border-t bg-slate-50 p-4 text-xs text-slate-500"><ShieldCheck className="size-4 text-emerald-600" /> Card data is never stored. Connect Razorpay or Cashfree credentials before real payment links are enabled.</div></div>
    </section>
  </>;
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof CreditCard }) { return <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><span><span className="text-sm text-slate-500">{label}</span><strong className="mt-2 block text-2xl">{value}</strong></span><span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-[#003b95]"><Icon className="size-5" /></span></div></div>; }

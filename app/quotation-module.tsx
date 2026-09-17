"use client";

import { useMemo, useState } from "react";
import { CalendarRange, Check, ChevronRight, Download, FileCheck2, IndianRupee, MessageCircleMore, Plus, Sparkles, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cardOffers, loyaltyRewards, serviceCatalogue } from "./commercial-config";
import { money } from "./domain";

type Season = { id: string; name: string; multiplier: number; start: string; end: string; tone: string };

const seasons: Season[] = [
  { id: "green", name: "Green season", multiplier: 0.9, start: "2026-06-01", end: "2026-09-30", tone: "bg-emerald-50 text-emerald-700" },
  { id: "high", name: "High season", multiplier: 1.15, start: "2026-10-01", end: "2026-12-19", tone: "bg-blue-50 text-blue-700" },
  { id: "festive", name: "Festive peak", multiplier: 1.35, start: "2026-12-20", end: "2027-01-10", tone: "bg-amber-50 text-amber-800" },
  { id: "regular", name: "Regular season", multiplier: 1, start: "2027-01-11", end: "2027-05-31", tone: "bg-slate-100 text-slate-700" },
];

const roomTypes = [
  { id: "pepper", name: "Pepper Cottage", rate: 9200, includedAdults: 2 },
  { id: "cardamom", name: "Cardamom Suite", rate: 8200, includedAdults: 2 },
  { id: "cedar", name: "Cedar 2-BHK", rate: 12400, includedAdults: 4 },
  { id: "mist", name: "Mist Valley Room", rate: 6800, includedAdults: 2 },
];

const mealPlans = [
  { id: "room", name: "Room only", adult: 0, child: 0 },
  { id: "breakfast", name: "Breakfast included", adult: 450, child: 250 },
  { id: "halfboard", name: "Breakfast + dinner", adult: 1250, child: 650 },
];

function parseDate(value: string) { const [y, m, d] = value.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); }
function nightsBetween(from: string, to: string) { return Math.max(1, Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86400000)); }
function activeSeason(date: string) { return seasons.find((season) => date >= season.start && date <= season.end) ?? seasons[3]; }

export function Quotations({ enabledServiceIds, onNotice }: { enabledServiceIds: string[]; onNotice: (value: string) => void }) {
  const [guest, setGuest] = useState("Neha & family");
  const [phone, setPhone] = useState("+91 98470 55221");
  const [checkIn, setCheckIn] = useState("2026-12-20");
  const [checkOut, setCheckOut] = useState("2026-12-23");
  const [roomId, setRoomId] = useState("pepper");
  const [adults, setAdults] = useState(2);
  const [youngChildren, setYoungChildren] = useState(1);
  const [olderChildren, setOlderChildren] = useState(1);
  const [mealId, setMealId] = useState("breakfast");
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>(["jeep-safari", "campfire"]);
  const [discount, setDiscount] = useState(5);
  const [rewardId, setRewardId] = useState("none");
  const [cardOfferId, setCardOfferId] = useState("none");
  const [generated, setGenerated] = useState(false);
  const availableAddOns = useMemo(() => serviceCatalogue.filter((service) => enabledServiceIds.includes(service.id) && !["breakfast", "kids-breakfast", "dinner", "extra-bed"].includes(service.id)), [enabledServiceIds]);

  const quote = useMemo(() => {
    const room = roomTypes.find((item) => item.id === roomId) ?? roomTypes[0];
    const meal = mealPlans.find((item) => item.id === mealId) ?? mealPlans[0];
    const season = activeSeason(checkIn);
    const nights = nightsBetween(checkIn, checkOut);
    const roomSubtotal = Math.round(room.rate * season.multiplier) * nights;
    const extraAdults = Math.max(0, adults - room.includedAdults) * 1500 * nights;
    const olderChildCharge = olderChildren * 800 * nights;
    const mealSubtotal = (adults * meal.adult + olderChildren * meal.child) * nights;
    const extras = availableAddOns.filter((item) => selectedAddOns.includes(item.id)).reduce((sum, item) => sum + item.price, 0);
    const subtotal = roomSubtotal + extraAdults + olderChildCharge + mealSubtotal + extras;
    const discountAmount = Math.round(subtotal * Math.max(0, Math.min(30, discount)) / 100);
    const reward = loyaltyRewards.find((item) => item.id === rewardId) ?? loyaltyRewards[0];
    const rewardAmount = Math.min(reward.value, subtotal - discountAmount);
    const afterReward = subtotal - discountAmount - rewardAmount;
    const cardOffer = cardOffers.find((item) => item.id === cardOfferId) ?? cardOffers[0];
    const cardDiscount = afterReward >= cardOffer.minimum ? Math.min(Math.round(afterReward * cardOffer.rate), cardOffer.cap) : 0;
    const taxable = afterReward - cardDiscount;
    const tax = Math.round(taxable * 0.12);
    return { room, meal, season, nights, roomSubtotal, extraAdults, olderChildCharge, mealSubtotal, extras, subtotal, discountAmount, reward, rewardAmount, cardOffer, cardDiscount, taxable, tax, total: taxable + tax };
  }, [adults, availableAddOns, cardOfferId, checkIn, checkOut, discount, mealId, olderChildren, rewardId, roomId, selectedAddOns]);

  const toggleAddOn = (id: string, checked: boolean) => setSelectedAddOns((current) => checked ? [...current, id] : current.filter((item) => item !== id));
  const flash = (text: string) => { onNotice(text); window.setTimeout(() => onNotice(""), 3800); };
  const generate = () => { setGenerated(true); flash(`Quotation QTN-2026-018 prepared for ${guest}.`); };
  const share = () => {
    const message = `Hello ${guest}, your Cardamom Rock quotation is ready. ${quote.room.name}, ${quote.nights} night${quote.nights > 1 ? "s" : ""}, total ${money(quote.total)}. Valid for 48 hours.`;
    window.open(`https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  return <>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-1 text-xs font-bold uppercase tracking-[.14em] text-[#006ce4]">Sales desk</p><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Quotations</h1><p className="mt-2 max-w-2xl text-sm text-slate-500">Build a personalised stay proposal using live seasonal rates, guest composition, meal plans and resort experiences.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => flash("Blank quotation started.")}><Plus /> New quote</Button><Button className="bg-[#003b95]" onClick={generate}><FileCheck2 /> Generate quotation</Button></div></div>

    <section className="mb-6 grid gap-4 md:grid-cols-4"><QuoteMetric icon={FileCheck2} label="Open quotes" value="8" note="₹3.26L potential" /><QuoteMetric icon={MessageCircleMore} label="Awaiting response" value="5" note="Follow up today" /><QuoteMetric icon={Check} label="Converted" value="42%" note="Last 30 days" /><QuoteMetric icon={IndianRupee} label="Average quote" value="₹38,400" note="Stay + experiences" /></section>

    <section className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
      <div className="space-y-5">
        <QuoteSection title="Guest & stay" description="Dates automatically select the applicable season.">
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Guest name"><Input value={guest} onChange={(e) => setGuest(e.target.value)} /></Field><Field label="WhatsApp number"><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field><Field label="Check-in"><Input type="date" value={checkIn} onInput={(e) => setCheckIn(e.currentTarget.value)} /></Field><Field label="Check-out"><Input type="date" min={checkIn} value={checkOut} onInput={(e) => setCheckOut(e.currentTarget.value)} /></Field></div>
          <div className={`mt-4 flex items-center justify-between rounded-xl px-4 py-3 ${quote.season.tone}`}><span className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="size-4" /> {quote.season.name} applied</span><strong className="text-sm">{Math.round((quote.season.multiplier - 1) * 100) >= 0 ? "+" : ""}{Math.round((quote.season.multiplier - 1) * 100)}% seasonal rate</strong></div>
        </QuoteSection>

        <QuoteSection title="Accommodation & guests" description="Children 0–5 stay free; ages 6–12 use the child rate.">
          <Field label="Room or cottage"><select value={roomId} onChange={(e) => setRoomId(e.target.value)} className="h-10 w-full rounded-md border bg-white px-3 text-sm">{roomTypes.map((room) => <option key={room.id} value={room.id}>{room.name} · from {money(room.rate)}</option>)}</select></Field>
          <div className="mt-4 grid gap-4 sm:grid-cols-3"><NumberField label="Adults (13+)" value={adults} setValue={setAdults} min={1} /><NumberField label="Children (6–12)" value={olderChildren} setValue={setOlderChildren} min={0} /><NumberField label="Children (0–5)" value={youngChildren} setValue={setYoungChildren} min={0} /></div>
        </QuoteSection>

        <QuoteSection title="Meals & experiences" description="Keep the service catalogue configurable for every property.">
          <Field label="Meal plan"><select value={mealId} onChange={(e) => setMealId(e.target.value)} className="h-10 w-full rounded-md border bg-white px-3 text-sm">{mealPlans.map((meal) => <option key={meal.id} value={meal.id}>{meal.name}</option>)}</select></Field>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">{availableAddOns.map((item) => <label key={item.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${selectedAddOns.includes(item.id) ? "border-blue-300 bg-blue-50/50" : "hover:bg-slate-50"}`}><Checkbox checked={selectedAddOns.includes(item.id)} onCheckedChange={(checked) => toggleAddOn(item.id, checked === true)} /><span className="flex-1"><strong className="block text-sm">{item.name}</strong><span className="mt-1 block text-xs text-slate-500">{money(item.price)} {item.unit}</span></span></label>)}</div>
          {availableAddOns.length === 0 && <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No optional services are enabled. Use Services & add-ons to activate them for this resort.</div>}
        </QuoteSection>
      </div>

      <div className="xl:sticky xl:top-[100px] xl:self-start">
        <div className={`quote-print-area overflow-hidden rounded-2xl border bg-white shadow-sm ${generated ? "ring-2 ring-emerald-300" : ""}`}>
          <div className="bg-[#004bad] p-6 text-white"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-[#febb02]">Cardamom Rock Resort</p><h2 className="mt-2 text-2xl font-bold">Stay quotation</h2><p className="mt-1 text-sm text-white/55">QTN-2026-018 · Valid for 48 hours</p></div><span className="grid size-11 place-items-center rounded-xl bg-[#febb02] text-[#003b95]"><CalendarRange /></span></div></div>
          <div className="p-6"><div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5"><div><p className="text-xs uppercase tracking-wider text-slate-400">Prepared for</p><strong className="mt-1 block text-lg">{guest || "Guest name"}</strong><span className="text-sm text-slate-500">{phone}</span></div><div className="text-right"><p className="text-xs uppercase tracking-wider text-slate-400">Stay</p><strong className="mt-1 block text-sm">{checkIn} → {checkOut}</strong><span className="text-sm text-slate-500">{quote.nights} nights · {adults + olderChildren + youngChildren} guests</span></div></div>
            <div className="py-5"><div className="mb-4 flex items-center justify-between"><div><strong className="block">{quote.room.name}</strong><span className="text-sm text-slate-500">{quote.meal.name} · {quote.season.name}</span></div><Badge variant="outline">{adults} adults · {olderChildren + youngChildren} kids</Badge></div><div className="space-y-3 text-sm"><Line label={`${quote.nights} nights × dynamic room rate`} value={quote.roomSubtotal} />{quote.extraAdults > 0 && <Line label="Extra adult occupancy" value={quote.extraAdults} />}{quote.olderChildCharge > 0 && <Line label="Children ages 6–12" value={quote.olderChildCharge} />}{quote.mealSubtotal > 0 && <Line label={quote.meal.name} value={quote.mealSubtotal} />}{availableAddOns.filter((item) => selectedAddOns.includes(item.id)).map((item) => <Line key={item.id} label={item.name} value={item.price} />)}</div></div>
            <div className="border-t pt-5"><div className="grid gap-3 sm:grid-cols-2"><Field label="Direct-booking discount"><div className="relative"><Input type="number" min="0" max="30" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="pr-8" /><span className="absolute right-3 top-2 text-sm text-slate-400">%</span></div></Field><Field label="Redeem loyalty points"><select value={rewardId} onChange={(e) => setRewardId(e.target.value)} className="h-10 w-full rounded-md border bg-white px-3 text-sm">{loyaltyRewards.map((reward) => <option key={reward.id} value={reward.id}>{reward.id === "none" ? reward.name : `${reward.points.toLocaleString("en-IN")} pts · ${reward.name}`}</option>)}</select></Field><Field label="Card / payment offer"><select value={cardOfferId} onChange={(e) => setCardOfferId(e.target.value)} className="h-10 w-full rounded-md border bg-white px-3 text-sm">{cardOffers.map((offer) => <option key={offer.id} value={offer.id}>{offer.name}</option>)}</select></Field></div><div className="mt-5 space-y-3"><Line label="Subtotal" value={quote.subtotal} />{quote.discountAmount > 0 && <Line label={`Direct discount (${discount}%)`} value={-quote.discountAmount} accent />}{quote.rewardAmount > 0 && <Line label={`${quote.reward.name} · ${quote.reward.points.toLocaleString("en-IN")} points`} value={-quote.rewardAmount} accent />}{quote.cardDiscount > 0 && <Line label={quote.cardOffer.name} value={-quote.cardDiscount} accent />}<Line label="Taxes (12%)" value={quote.tax} /></div><div className="mt-4 flex items-end justify-between rounded-xl bg-blue-50 p-4"><span><span className="block text-xs uppercase tracking-wider text-slate-500">Quotation total</span><span className="mt-1 block text-xs text-slate-500">All taxes included</span></span><strong className="text-2xl text-[#003b95]">{money(quote.total)}</strong></div></div>
            <div className="mt-5 flex gap-2"><Button className="flex-1 bg-[#003b95]" onClick={share}><MessageCircleMore /> Share on WhatsApp</Button><Button variant="outline" onClick={() => window.print()} aria-label="Print or save quotation as PDF"><Download /> PDF</Button></div>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border bg-white p-4"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><UsersRound className="size-4" /></span><div className="min-w-0 flex-1"><strong className="block text-sm">Conversion workflow</strong><span className="text-xs text-slate-500">Draft → Sent → Viewed → Accepted → Reservation</span></div><ChevronRight className="size-4 text-slate-400" /></div></div>
      </div>
    </section>
  </>;
}

function QuoteSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) { return <section className="rounded-2xl border bg-white p-5 shadow-sm"><div className="mb-5"><h2 className="font-bold">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></div>{children}</section>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid flex-1 gap-2 text-sm font-semibold">{label}{children}</label>; }
function NumberField({ label, value, setValue, min }: { label: string; value: number; setValue: (value: number) => void; min: number }) { return <Field label={label}><Input type="number" min={min} max="12" value={value} onChange={(e) => setValue(Math.max(min, Number(e.target.value)))} /></Field>; }
function Line({ label, value, accent }: { label: string; value: number; accent?: boolean }) { return <div className={`flex items-center justify-between gap-4 text-sm ${accent ? "font-semibold text-[#006ce4]" : "text-slate-600"}`}><span>{label}</span><span className="font-semibold text-slate-900">{value < 0 ? "−" : ""}{money(Math.abs(value))}</span></div>; }
function QuoteMetric({ icon: Icon, label, value, note }: { icon: typeof FileCheck2; label: string; value: string; note: string }) { return <div className="rounded-2xl border bg-white p-5"><div className="flex items-start justify-between"><div><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-slate-500">{note}</p></div><span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-[#003b95]"><Icon className="size-5" /></span></div></div>; }

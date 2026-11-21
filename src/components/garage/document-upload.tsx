"use client";

import { useState } from "react";
import { FileUploader } from "@/components/ui/file-uploader";
import { Field, Input, Select } from "@/components/ui/form";
import { registerDocument } from "@/lib/actions/garage";

const CATS: [string, string][] = [["fattura", "Fattura"], ["ricevuta", "Ricevuta"], ["preventivo", "Preventivo"], ["manutenzione", "Documento di manutenzione"], ["tecnico", "Documento tecnico"], ["foto", "Foto dell'intervento"], ["altro", "Altro"]];

/** Caricamento documenti privati: scelta di auto, categoria e intervento prima del caricamento. */
export function DocumentUpload({ userId, vehicles, records }: { userId: string; vehicles: { id: string; label: string }[]; records: { id: string; label: string; vehicleId: string }[] }) {
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? "");
  const [category, setCategory] = useState("fattura");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [recordId, setRecordId] = useState("");
  if (!vehicles.length) return <p className="text-sm text-muted">Aggiungi prima un&apos;automobile al garage.</p>;
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="du-v" label="Automobile"><Select id="du-v" value={vehicleId} onChange={(e) => { setVehicleId(e.target.value); setRecordId(""); }}>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}</Select></Field>
        <Field id="du-c" label="Categoria"><Select id="du-c" value={category} onChange={(e) => setCategory(e.target.value)}>{CATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
        <Field id="du-t" label="Titolo" optional hint="Se vuoto useremo il nome del file."><Input id="du-t" value={title} maxLength={160} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field id="du-d" label="Data del documento" optional><Input id="du-d" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field id="du-r" label="Intervento collegato" optional className="sm:col-span-2"><Select id="du-r" value={recordId} onChange={(e) => setRecordId(e.target.value)}><option value="">Nessuno</option>{records.filter((r) => r.vehicleId === vehicleId).map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</Select></Field>
      </div>
      <FileUploader bucket="vehicle-documents" folder={userId} kind="document" label="Scegli i file (PDF, JPG, PNG o WebP, max 10 MB)" multiple max={5}
        onUploaded={(path, name, size) => registerDocument({ vehicleId, recordId: recordId || null, category, title, date: date || null }, path, name, size)} />
      <p className="text-xs text-muted">I documenti sono privati: solo tu puoi vederli. Si aprono con collegamenti temporanei validi pochi minuti.</p>
    </div>
  );
}

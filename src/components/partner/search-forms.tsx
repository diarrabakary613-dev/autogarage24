import { Field, Input, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

/** Moduli di ricerca delle landing: inviano alle pagine reali della piattaforma (GET, nessun dato personale). */
export function NeoSearchForm() {
  return (
    <form action="/auto-usate" method="get" className="grid gap-4 sm:grid-cols-2" role="search">
      <input type="hidden" name="neo" value="compatibili" />
      <Field id="ls-ma" label="Marca" optional><Input id="ls-ma" name="marca" placeholder="Es. fiat" /></Field>
      <Field id="ls-pm" label="Prezzo massimo (€)" optional><Input id="ls-pm" name="prezzo_max" inputMode="numeric" placeholder="Es. 12000" /></Field>
      <Field id="ls-ci" label="Città" optional><Input id="ls-ci" name="citta" defaultValue="Milano" /></Field>
      <Field id="ls-al" label="Alimentazione" optional>
        <Select id="ls-al" name="alimentazione" defaultValue=""><option value="">Qualsiasi</option><option value="benzina">Benzina</option><option value="diesel">Diesel</option><option value="gpl">GPL</option><option value="metano">Metano</option><option value="ibrida">Ibrida</option><option value="ibrida_plugin">Ibrida plug-in</option><option value="elettrica">Elettrica</option></Select>
      </Field>
      <Button type="submit" size="lg" className="sm:col-span-2" data-track="cta" data-track-label="Cerca auto neopatentati">Cerca auto compatibili</Button>
    </form>
  );
}

export function WorkshopSearchForm({ base = "/garages" }: { base?: "/garages" | "/meccanici" }) {
  return (
    <form action={base} method="get" className="grid gap-4 sm:grid-cols-2" role="search">
      <Field id="ws-ci" label="Città" optional><Input id="ws-ci" name="citta" defaultValue="Milano" /></Field>
      <Field id="ws-cap" label="CAP" optional><Input id="ws-cap" name="cap" inputMode="numeric" maxLength={5} placeholder="Es. 20135" /></Field>
      <Field id="ws-q" label="Servizio o problema" optional><Input id="ws-q" name="q" placeholder="Es. tagliando, freni" /></Field>
      <Field id="ws-ma" label="Marca dell'auto" optional><Input id="ws-ma" name="marca" placeholder="Es. volkswagen" /></Field>
      <Button type="submit" size="lg" className="sm:col-span-2" data-track="cta" data-track-label="Cerca officine">Cerca officine</Button>
    </form>
  );
}

export function PartsSearchForm() {
  return (
    <form action="/ricambi" method="get" className="grid gap-4 sm:grid-cols-2" role="search">
      <Field id="ps-co" label="Codice OEM o produttore" optional><Input id="ps-co" name="codice" placeholder="Es. 1K0615301AA" /></Field>
      <Field id="ps-q" label="Cosa cerchi" optional><Input id="ps-q" name="q" placeholder="Es. dischi freno" /></Field>
      <Field id="ps-am" label="Marca dell'auto" optional><Input id="ps-am" name="auto_marca" placeholder="Es. fiat" /></Field>
      <Field id="ps-an" label="Anno" optional><Input id="ps-an" name="anno" inputMode="numeric" maxLength={4} /></Field>
      <Button type="submit" size="lg" className="sm:col-span-2" data-track="cta" data-track-label="Cerca ricambi">Cerca ricambi</Button>
    </form>
  );
}

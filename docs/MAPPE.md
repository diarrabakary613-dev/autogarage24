# Mappe e geolocalizzazione (Fase 19)

## Provider scelto: OpenStreetMap + Leaflet (già nel progetto)
| Opzione | Costi | Limiti | Uso commerciale | Chiave nel frontend |
|---|---|---|---|---|
| **OSM tile + Leaflet** (scelta per la Beta) | 0 € | Policy d'uso: niente traffico intenso, attribuzione obbligatoria | Consentito con attribuzione e uso moderato | Nessuna |
| MapTiler / Stadia (tile OSM commerciali) | piano gratuito, poi a pagamento | Quote mensili | Sì | Chiave pubblica limitata al dominio |
| Google Maps Platform | a consumo dopo il credito mensile | Quote | Sì | Chiave pubblica limitata al dominio |
| Mapbox | piano gratuito, poi a consumo | Quote | Sì | Token pubblico limitato |

**Raccomandazione:** restare su OSM durante la Beta; passare a un fornitore di tile commerciale (MapTiler o Stadia) prima della Beta pubblica o al superamento di qualche migliaio di visualizzazioni al giorno. Basta cambiare l'URL delle tile in `src/components/maps/*.tsx` e aggiungere `NEXT_PUBLIC_MAP_TILES_URL` (chiave pubblica limitata al dominio). Da approvare (costi).

## Geocodifica di città e CAP
Nominatim (OpenStreetMap), chiamato **dal server** (`src/lib/geo/geocode.ts`), risultati in cache per settimane, User-Agent identificabile, timeout 4 s. Se non risponde, la ricerca ripiega sul filtro per città/CAP senza distanze. Per volumi elevati serve un fornitore commerciale (stessa scelta delle tile).

## Database
Nessuna dipendenza da PostGIS: distanza calcolata con la formula dell'emisenoverso (`private.distance_km`) e indici su latitudine/longitudine. PostGIS (disponibile su Supabase) va valutato oltre ~50.000 punti.

## Privacy
- Posizione dell'utente solo dopo clic e consenso del browser, arrotondata a ~1 km, mai salvata (solo nell'URL della ricerca); per le richieste di intervento salvata arrotondata e mai mostrata.
- Professionisti: indirizzo e punto esatto solo se scelgono di mostrarli; altrimenti zona (~1 km).
- Auto e ricambi: sempre zona (~1 km).
- Indicazioni stradali: link esterno a OpenStreetMap solo per indirizzi pubblici.

## Variabili d'ambiente
Nessuna richiesta oggi. In futuro: `NEXT_PUBLIC_MAP_TILES_URL` (con chiave pubblica limitata), mai chiavi segrete nel frontend.

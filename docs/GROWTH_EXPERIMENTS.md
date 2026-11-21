# Esperimenti di growth

Gestione in `/admin/marketing/esperimenti`. Ogni esperimento: ipotesi, pubblico, modifica, metrica, durata, risultato, decisione.

## Regole statistiche (applicate dalla piattaforma)
- Una variante si può dichiarare vincente solo con **≥ 100 osservazioni per variante** (vincolo nel database).
- La pagina calcola un test z a due proporzioni (95%): se la differenza non è significativa lo dice esplicitamente.
- Una sola modifica per volta; durata minima 7 giorni (cicli settimanali); niente interruzioni anticipate «perché sembra andare bene».

## Backlog iniziale
| # | Ipotesi | Pubblico | Modifica | Metrica | Durata |
|---|---|---|---|---|---|
| 1 | Una headline sul problema convince più di una sulla promessa | Neopatentati | «Patente nuova? Controlla prima di innamorarti» vs «La tua prima auto merita una scelta intelligente» | CTR inserzione → ingressi `/prima-auto` | 14 gg |
| 2 | Un video con persone reali converte più di uno senza persone | Neopatentati | Video 3.3 vs screencast | Conversioni (iscrizione Beta) / ingressi | 14 gg |
| 3 | La CTA «Controlla la compatibilità» genera più ricerche di «Cerca un'auto» | Neopatentati | Testo del pulsante principale di `/prima-auto` | Clic CTA / ingressi | 14 gg |
| 4 | La landing dedicata converte più della pagina generale | Officine | `/diventa-officina-partner` vs `/diventa-partner` | Candidature / ingressi | 21 gg |
| 5 | Creatività neopatentati vs generalista | Milano 18–24 | Due creatività con lo stesso budget | Costo per iscrizione Beta | 14 gg |

## Decisioni possibili
Adotta A · Adotta B · Ripeti il test · Abbandona · Nessuna decisione (dati insufficienti).

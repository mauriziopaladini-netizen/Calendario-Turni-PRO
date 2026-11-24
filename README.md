# Calendario Turni PRO – Web Edition (MVP 0.1)

Webapp PWA mobile-first ispirata all'APK Android `Calendario di Lavoro per turni 2.0.7.5`.

## Funzioni incluse
- Calendario mensile navigabile con selezione del giorno.
- Assegnazione turno e note giornaliere.
- Configurazione codici turno, orari e colori.
- Calcolo ore (inclusi turni che attraversano la mezzanotte).
- Riepilogo mensile e distribuzione dei turni.
- Esportazione/importazione backup JSON.
- Stampa e tema scuro.
- PWA installabile e cache offline.
- Persistenza locale tramite localStorage.

## Avvio
Aprire `index.html` oppure pubblicare la cartella su GitHub Pages / hosting statico HTTPS. Per installare come PWA usare il menu del browser e scegliere "Installa app" o "Aggiungi a schermata Home".

## Prossime fasi
1. Importazione/esportazione calendario in formati aggiuntivi e gestione multi-calendario completa.
2. Confronto calendari, festività, ore extra, notifiche e allarmi.
3. Backend con autenticazione e sincronizzazione cloud per account personali, con conflitti e backup gestiti in modo sicuro.

La sincronizzazione cloud non è ancora implementata nell'MVP: i dati attuali restano sul browser/dispositivo e vanno trasferiti con il backup JSON.

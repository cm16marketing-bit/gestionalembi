// ═══════════════════════════════════════════════════
// CONFIGURAZIONE — modifica questi valori prima del deploy
// ═══════════════════════════════════════════════════

// Stesso Client ID usato dal Partner CRM esistente.
// Verifica in Google Cloud Console > Credenziali che l'origine
// (es. https://cm16marketing-bit.github.io) sia tra le "Authorized JavaScript origins".
const CLIENT_ID = '525708495290-u14oducrh67egbjcueh8o1pd088oe60c.apps.googleusercontent.com';

// Scope: Sheets (dati), Drive (trovare/creare il foglio), Calendar (reminder via invito)
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/calendar.events';

// ID del Google Sheet condiviso. Lascialo vuoto al primo avvio:
// l'app te lo crea in automatico e te lo mostra a schermo.
// Copialo qui subito dopo, così tutti i colleghi useranno LO STESSO foglio.
const SPREADSHEET_ID = '';

const SHEET_TITLE = 'Gestionale Partner - Dati';
const TAB_CONTRATTI = 'Contratti';
const TAB_PAGAMENTI = 'Pagamenti';
const TAB_PROMOZIONI = 'Promozioni';

// Intestazioni fisse del tab Contratti (l'ordine conta)
const CONTRATTI_HEADERS = [
  'ID','Nome Azienda','Nome Partner','Email Partner',
  'Piattaforma','Stato Contratto','Company','Data Firma','Note',
  'Data Creazione','Ultima Modifica'
];

// Opzioni fisse per i menu a tendina
const PIATTAFORME = ['Affilka','Exalogic','Entrambe'];
const STATI = ['Da creare','Pending','Firmato'];
const COMPANIES = ['Revando','Alpaugh','MBI'];

// Email abilitate ad accedere al sito (aggiungi qui i colleghi).
// NB: questo è solo un filtro lato interfaccia — la sicurezza vera
// è data dalla condivisione del Google Sheet via permessi Drive
// e dall'aggiunta di queste stesse email come "test user" in
// Google Cloud Console > OAuth consent screen (l'app non è pubblica/verificata).
const ALLOWED_EMAILS = [
  // 'christophermitoli@gmail.com',
  // 'giuliano.v@marathonbet.it',
];

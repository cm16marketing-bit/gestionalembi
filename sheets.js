// ═══════════════════════════════════════════════════
// SHEETS / DRIVE / CALENDAR API — helper condivisi
// ═══════════════════════════════════════════════════

function CL(n) { // indice colonna -> lettera (0->A, 25->Z, 26->AA...)
  let s = ''; n++;
  while (n > 0) { n--; s = String.fromCharCode(65 + n % 26) + s; n = Math.floor(n / 26); }
  return s;
}

async function sheetsApi(path, method = 'GET', body = null) {
  const r = await fetch('https://sheets.googleapis.com/v4/spreadsheets' + path, {
    method,
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error?.message || 'Errore Sheets ' + r.status);
  return d;
}

async function driveApi(path, opts = {}) {
  const r = await fetch('https://www.googleapis.com/drive/v3' + path, {
    headers: { Authorization: 'Bearer ' + token },
    ...opts
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error?.message || 'Errore Drive ' + r.status);
  return d;
}

// Crea (se manca) il foglio condiviso con i 3 tab. Ritorna { id, justCreated }.
async function ensureSpreadsheet() {
  if (SPREADSHEET_ID) {
    await sheetsApi('/' + SPREADSHEET_ID + '?fields=spreadsheetId');
    return { id: SPREADSHEET_ID, justCreated: false };
  }
  const ss = await sheetsApi('', 'POST', {
    properties: { title: SHEET_TITLE },
    sheets: [
      { properties: { title: TAB_CONTRATTI, sheetId: 0 } },
      { properties: { title: TAB_PAGAMENTI, sheetId: 1 } },
      { properties: { title: TAB_PROMOZIONI, sheetId: 2 } }
    ]
  });
  const id = ss.spreadsheetId;
  await sheetsApi(`/${id}/values/${TAB_CONTRATTI}!A1?valueInputOption=RAW`, 'PUT', { values: [CONTRATTI_HEADERS] });
  await sheetsApi(`/${id}:batchUpdate`, 'POST', {
    requests: [
      { repeatCell: { range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
        cell: { userEnteredFormat: { backgroundColor: { red: .083, green: .396, blue: .753 },
          textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true } } },
        fields: 'userEnteredFormat(backgroundColor,textFormat)' } },
      { updateSheetProperties: { properties: { sheetId: 0, gridProperties: { frozenRowCount: 1 } }, fields: 'gridProperties.frozenRowCount' } }
    ]
  });
  return { id, justCreated: true };
}

async function readContratti(spreadsheetId) {
  const range = `${TAB_CONTRATTI}!A1:${CL(CONTRATTI_HEADERS.length - 1)}`;
  const d = await sheetsApi(`/${spreadsheetId}/values/${range}`);
  const rows = d.values || [];
  if (!rows.length) return [];
  const headers = rows[0];
  return rows.slice(1).map((row, i) => {
    const obj = { _rowIndex: i + 2 }; // riga reale nel foglio (1-based + header)
    headers.forEach((h, ci) => obj[h] = row[ci] || '');
    return obj;
  }).filter(o => o['ID']);
}

async function appendContratti(spreadsheetId, rows) {
  // rows: array di array, già nell'ordine di CONTRATTI_HEADERS
  const range = `${TAB_CONTRATTI}!A1:${CL(CONTRATTI_HEADERS.length - 1)}`;
  await sheetsApi(`/${spreadsheetId}/values/${range}:append?valueInputOption=RAW`, 'POST', { values: rows });
}

async function updateContrattoRow(spreadsheetId, rowIndex, rowValues) {
  const range = `${TAB_CONTRATTI}!A${rowIndex}:${CL(CONTRATTI_HEADERS.length - 1)}${rowIndex}`;
  await sheetsApi(`/${spreadsheetId}/values/${range}?valueInputOption=RAW`, 'PUT', { values: [rowValues] });
}

async function deleteContrattoRow(spreadsheetId, rowIndex) {
  await sheetsApi(`/${spreadsheetId}:batchUpdate`, 'POST', {
    requests: [{ deleteDimension: { range: { sheetId: 0, dimension: 'ROWS', startIndex: rowIndex - 1, endIndex: rowIndex } } }]
  });
}

// ═══════════════════════════════════════════════════
// REMINDER — crea un invito Google Calendar (arriva via email al destinatario)
// ═══════════════════════════════════════════════════
async function createReminderEvent({ title, description, date, start, end, guestEmail }) {
  const r = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summary: title,
      description,
      start: { dateTime: `${date}T${start}:00`, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      end:   { dateTime: `${date}T${end}:00`,   timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      attendees: guestEmail ? [{ email: guestEmail }] : []
    })
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error?.message || 'Errore Calendar ' + r.status);
  return d;
}

// ═══════════════════════════════════════════════════
// FUZZY MATCH — per l'import CSV su campi a opzioni fisse
// ═══════════════════════════════════════════════════
function levenshtein(a, b) {
  a = (a || '').toLowerCase().trim(); b = (b || '').toLowerCase().trim();
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

// Ritorna il valore fisso più vicino se abbastanza simile, altrimenti il valore grezzo (nuova entry)
function fuzzyMatchOption(raw, options) {
  const val = (raw || '').trim();
  if (!val) return '';
  const exact = options.find(o => o.toLowerCase() === val.toLowerCase());
  if (exact) return exact;
  let best = null, bestDist = Infinity;
  options.forEach(o => {
    const d = levenshtein(val, o);
    if (d < bestDist) { bestDist = d; best = o; }
  });
  const threshold = Math.max(2, Math.floor(best.length * 0.34));
  return bestDist <= threshold ? best : val; // val = nuova entry creata automaticamente
}

function esc(s) { return (s || '').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function fmtDate(d) { return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; }

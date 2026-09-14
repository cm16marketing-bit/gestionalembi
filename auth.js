// ═══════════════════════════════════════════════════
// AUTH — condiviso tra tutte le pagine (usa sessionStorage
// cosi non serve rifare login passando da una pagina all'altra)
// ═══════════════════════════════════════════════════
let token      = sessionStorage.getItem('gp_token') || null;
let tokenExp   = parseInt(sessionStorage.getItem('gp_token_exp') || '0');
let userEmail  = sessionStorage.getItem('gp_email') || null;

function tokenValid() {
  return !!token && Date.now() < tokenExp;
}

async function fetchEmail() {
  const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: 'Bearer ' + token }
  });
  if (!r.ok) throw new Error('Impossibile leggere l\'email dell\'account Google');
  const d = await r.json();
  return d.email;
}

function doSignIn(onSuccess, onDenied) {
  const client = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: async r => {
      if (r.error) { alert('Errore login: ' + r.error); return; }
      token = r.access_token;
      tokenExp = Date.now() + (r.expires_in * 1000 - 60000);
      sessionStorage.setItem('gp_token', token);
      sessionStorage.setItem('gp_token_exp', String(tokenExp));
      try {
        const email = await fetchEmail();
        if (!ALLOWED_EMAILS.map(e => e.toLowerCase()).includes(email.toLowerCase())) {
          onDenied ? onDenied(email) : alert('Accesso non abilitato per ' + email);
          doSignOut();
          return;
        }
        userEmail = email;
        sessionStorage.setItem('gp_email', email);
        onSuccess();
      } catch (e) {
        alert('❌ ' + e.message);
      }
    }
  });
  client.requestAccessToken();
}

function doSignOut() {
  if (token) { try { google.accounts.oauth2.revoke(token); } catch (e) {} }
  token = null; userEmail = null;
  sessionStorage.removeItem('gp_token');
  sessionStorage.removeItem('gp_token_exp');
  sessionStorage.removeItem('gp_email');
}

// Chiama onReady() se già loggato e abilitato, altrimenti mostra la schermata di login
// (deve esistere un elemento #login-screen e #app-screen in ogni pagina)
function bootAuth(onReady) {
  const ls = document.getElementById('login-screen');
  const app = document.getElementById('app-screen');
  if (tokenValid() && userEmail && ALLOWED_EMAILS.map(e => e.toLowerCase()).includes(userEmail.toLowerCase())) {
    ls.style.display = 'none';
    app.style.display = 'block';
    onReady();
  } else {
    ls.style.display = 'flex';
    app.style.display = 'none';
  }
}

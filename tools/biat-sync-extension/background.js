// ================= A REGLER (2 lignes) =================
// SECRET doit etre EXACTEMENT la meme valeur que la variable BANK_SYNC_SECRET
// posee sur Vercel. C'est la seule cle a coller ici. Aucun mot de passe banque.
const SECRET = 'CHANGE_ME_SAME_AS_VERCEL';
const MONEY_HUB_URL = 'https://money-radar-six.vercel.app';
// =======================================================

const TX_URL = 'https://onlinecorporate.mybiat.tn/fr/AccountsAndCards/Transactions/Transactions';
let syncTabId = null;

// Ouvre un onglet en arriere-plan sur la page des mouvements. Le content script
// s'occupe de la connexion (si besoin) puis de la lecture. Filet : on ferme
// l'onglet au bout de 2 min quoi qu'il arrive.
async function runSync() {
  try {
    const tab = await chrome.tabs.create({ url: TX_URL, active: false });
    syncTabId = tab.id;
    setTimeout(() => {
      if (syncTabId) { chrome.tabs.remove(syncTabId).catch(() => {}); syncTabId = null; }
    }, 120000);
  } catch (e) { /* ignore */ }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('biat-sync', { periodInMinutes: 60, delayInMinutes: 1 });
});
chrome.alarms.onAlarm.addListener((a) => { if (a.name === 'biat-sync') runSync(); });

// Clic sur l'icone = sync tout de suite (pour tester).
chrome.action.onClicked.addListener(() => runSync());

// Le content script (meme origine que la banque) a lu les mouvements et nous les
// passe. C'est LE service worker qui poste vers MONEY HUB : pas de blocage CORS.
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!msg || msg.type !== 'biat-data') return;
  (async () => {
    try {
      await fetch(MONEY_HUB_URL + '/api/bank-sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-bank-sync-secret': SECRET },
        body: JSON.stringify({ accounts: msg.accounts }),
      });
    } catch (e) { /* ignore */ }
    const tid = (sender.tab && sender.tab.id) || syncTabId;
    if (tid) { chrome.tabs.remove(tid).catch(() => {}); if (tid === syncTabId) syncTabId = null; }
  })();
});

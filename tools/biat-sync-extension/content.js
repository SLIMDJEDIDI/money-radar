// S'execute sur les pages MyBIAT. Deux cas selon l'hote.
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const host = location.host;

  // 1) PAGE DE CONNEXION : cliquer « Connexion » UNE fois que Chrome a rempli le
  //    mot de passe. On ne clique jamais tant que le champ est vide (sinon on
  //    tenterait une connexion sans mot de passe). L'extension ne lit ni ne
  //    stocke le mot de passe : c'est Chrome qui le remplit.
  if (host === 'authcorporate.mybiat.tn') {
    for (let i = 0; i < 24; i++) {
      const pw = document.querySelector('input[type=password]');
      const btn = document.querySelector('button[type=submit], input[type=submit]');
      if (pw && pw.value && btn) { btn.click(); return; }
      await sleep(500);
    }
    return; // pas de mot de passe enregistre -> rien a faire
  }

  // 2) APPLICATION : attendre le jeton, lire les comptes puis leurs mouvements,
  //    et passer le tout au service worker (qui postera vers MONEY HUB).
  if (host === 'onlinecorporate.mybiat.tn') {
    let tok = null;
    for (let i = 0; i < 40; i++) {
      tok = localStorage.getItem('access_token');
      if (tok) break;
      await sleep(500);
    }
    if (!tok) return;

    const H = { credentials: 'include', headers: { Accept: 'application/json', Authorization: 'Bearer ' + tok } };
    const AR = '/api/arrangement-manager/client-api/v2/productsummary/context/arrangements'
      + '?withLatestBalances=true&businessFunction=Product%20Summary&resourceName=Product%20Summary'
      + '&privilege=view&productKindName=Savings%20Account%2CCurrent%20Account&searchTerm=&favoriteFirst=true&from=0&size=50';

    let arr = [];
    try {
      const j = await (await fetch(AR, H)).json();
      arr = Array.isArray(j) ? j : (j.arrangementItems || j.items || j.data || []);
    } catch (e) { return; }

    const accounts = [];
    for (const a of arr) {
      const id = a.id || a.arrangementId || (a.arrangement && a.arrangement.id);
      if (!id) continue;
      const title = a.name || a.displayName || (a.arrangement && a.arrangement.name) || '';
      const iban = a.IBAN || a.iban || a.BBAN || a.number || '';
      try {
        const rows = await (await fetch(
          '/api/transaction-manager/client-api/v2/transactions?arrangementsIds=' + id +
          '&from=0&size=400&orderBy=bookingDate&direction=DESC', H)).json();
        if (Array.isArray(rows) && rows.length) accounts.push({ accountTitle: title, iban, rows });
      } catch (e) { /* compte suivant */ }
    }

    if (accounts.length) {
      try { chrome.runtime.sendMessage({ type: 'biat-data', accounts }); } catch (e) {}
    }
  }
})();

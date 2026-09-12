// S'execute sur les pages MyBIAT. Deux cas selon l'hote.
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const host = location.host;

  // 1) PAGE DE CONNEXION : cliquer « Connexion ». Chrome remplit identifiant et
  //    mot de passe, mais il CACHE la valeur du mot de passe aux scripts tant
  //    qu'il n'y a pas eu d'interaction : on ne peut donc pas attendre que le
  //    champ « soit rempli ». On laisse a Chrome le temps de remplir, puis on
  //    clique. L'extension ne lit ni ne stocke le mot de passe.
  if (host === 'authcorporate.mybiat.tn') {
    // Le bouton demande DEUX clics (le 1er valide la saisie auto de Chrome, le
    // 2e envoie). On laisse Chrome remplir, puis on clique en boucle tant qu'on
    // reste sur la page de connexion : dès que ça part, location.host change et
    // la boucle s'arrête. Un clic « à vide » avant le remplissage est sans effet.
    await sleep(1500);
    for (let i = 0; i < 8 && location.host === 'authcorporate.mybiat.tn'; i++) {
      const btn = document.querySelector('button[type=submit], input[type=submit]');
      if (btn) btn.click();
      await sleep(1500);
    }
    return;
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

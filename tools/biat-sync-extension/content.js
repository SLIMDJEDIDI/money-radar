// S'execute sur les pages MyBIAT. Deux cas selon l'hote.
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const host = location.host;
  // Balise de diagnostic : dit au serveur ou on en est. Rien de sensible.
  const beacon = (stage, extra) => { try { chrome.runtime.sendMessage({ type: 'biat-debug', stage, extra: extra == null ? null : String(extra).slice(0, 120) }); } catch (e) {} };

  // 1) PAGE DE CONNEXION : cliquer « Connexion ». Chrome remplit identifiant et
  //    mot de passe mais CACHE la valeur aux scripts ; on ne peut donc pas
  //    attendre que « ce soit rempli ». Le bouton demande DEUX clics (1er valide
  //    la saisie auto, 2e envoie) : on clique en boucle tant qu'on reste ici.
  if (host === 'authcorporate.mybiat.tn') {
    beacon('login-page', location.pathname);
    await sleep(1500);
    for (let i = 0; i < 8 && location.host === 'authcorporate.mybiat.tn'; i++) {
      const btn = document.querySelector('button[type=submit], input[type=submit]');
      if (btn) btn.click();
      await sleep(1500);
    }
    return;
  }

  // 2) APPLICATION : jeton -> (choix societe si demande) -> comptes -> mouvements.
  if (host === 'onlinecorporate.mybiat.tn') {
    let tok = null;
    for (let i = 0; i < 40; i++) { tok = localStorage.getItem('access_token'); if (tok) break; await sleep(500); }
    if (!tok) { beacon('no-token', location.pathname); return; }
    beacon('token-ok', location.pathname);

    const H = { credentials: 'include', headers: { Accept: 'application/json', Authorization: 'Bearer ' + tok } };
    const AR = '/api/arrangement-manager/client-api/v2/productsummary/context/arrangements'
      + '?withLatestBalances=true&businessFunction=Product%20Summary&resourceName=Product%20Summary'
      + '&privilege=view&productKindName=Savings%20Account%2CCurrent%20Account&searchTerm=&favoriteFirst=true&from=0&size=50';

    // Ecran « choisir la societe » : cliquer la carte de la societe (jamais un
    // bouton deconnexion). ponytail: heuristique par texte, a affiner si MyBIAT
    // change ses libelles.
    if (/select-context/.test(location.pathname)) {
      beacon('select-context');
      await sleep(1500);
      const cands = [...document.querySelectorAll('button, [role=button], a, li, .mat-list-item, .card, div')]
        .filter((e) => /voltrop|motors|societe|société/i.test(e.innerText || '') && (e.innerText || '').trim().length < 80);
      for (const c of cands.slice(0, 4)) { try { c.click(); } catch (e) {} await sleep(1000); if (!/select-context/.test(location.pathname)) break; }
      await sleep(2000);
    }

    // Comptes : reessayer, le contexte peut mettre un instant a s'appliquer.
    let arr = [], lastStatus = 0;
    for (let i = 0; i < 6; i++) {
      try {
        const r = await fetch(AR, H); lastStatus = r.status;
        if (r.status === 200) { const j = await r.json(); arr = Array.isArray(j) ? j : (j.arrangementItems || j.items || j.data || []); if (arr.length) break; }
      } catch (e) {}
      await sleep(1500);
    }
    if (!arr.length) { beacon('no-accounts', 'httpStatus=' + lastStatus); return; }
    beacon('accounts', arr.length);

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
      } catch (e) {}
    }
    beacon('read', accounts.map((a) => a.accountTitle + ':' + a.rows.length).join(' | '));
    if (accounts.length) { try { chrome.runtime.sendMessage({ type: 'biat-data', accounts }); } catch (e) {} }
  }
})();

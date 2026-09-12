# BIAT → MONEY HUB — synchro automatique

Toutes les heures, tant que ce PC est allumé et Chrome ouvert : l'extension
ouvre MyBIAT Corporate, se connecte (Chrome remplit le mot de passe), lit les
mouvements de chaque compte et envoie **seulement les nouvelles lignes** à
MONEY HUB. **Aucun mot de passe banque n'est stocké** par l'extension.

## Limites (à savoir)
- Marche **uniquement** si Chrome a le mot de passe MyBIAT enregistré et le
  remplit tout seul. Si BIAT ajoute un code SMS à la connexion, la synchro
  s'arrête (il faudra se connecter à la main).
- Le PC doit être allumé et Chrome ouvert. Rien ne tourne côté serveur.
- Ne gère que les comptes du **contexte** (société) actuellement chargé dans
  MyBIAT. Si VOLTROP et VLT MOTORS sont deux sociétés séparées, il faut lancer
  la synchro dans chacune (non vérifié — à tester à la première connexion).

## Installation (une fois)

### 1. Choisir un secret et le poser sur Vercel
Générer une clé (PowerShell) :
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }))
```
- Copier la valeur.
- Vercel → projet money-radar → **Settings → Environment Variables** → ajouter
  `BANK_SYNC_SECRET` = cette valeur (Production) → **Save** → **Redeploy**.

### 2. Coller le même secret dans l'extension
- Ouvrir `background.js`, ligne `const SECRET = '...'`, y coller la même valeur.
- Vérifier `MONEY_HUB_URL` (déjà `https://money-radar-six.vercel.app`).

### 3. Charger l'extension dans Chrome
- Chrome → `chrome://extensions` → activer **Mode développeur** (haut droite).
- **Charger l'extension non empaquetée** → choisir ce dossier
  `tools/biat-sync-extension`.
- S'assurer que Chrome a bien **enregistré le mot de passe** MyBIAT (sinon la
  connexion automatique ne peut pas remplir le champ).

## Tester
- Cliquer l'icône de l'extension = synchro immédiate.
- Un onglet s'ouvre, se connecte, puis se ferme seul.
- Dans MONEY HUB → BANQUE → le compte : les nouvelles lignes apparaissent.
- Relancer : 0 ligne ajoutée (rien n'est compté deux fois).

## Ce que fait le serveur
`POST /api/bank-sync` (dans l'app) vérifie le secret, puis rejoue la même
logique que le bouton « Importer un relevé BIAT (CSV) » : seules les lignes
absentes sont ajoutées, avec leur vraie date, et une ligne d'audit `BANK_SYNC`
garde la liste. Le CSV manuel et la synchro auto ne se doublent jamais (même
clé date|référence|montant).

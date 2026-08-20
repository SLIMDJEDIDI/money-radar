// ---------------------------------------------------------------------------
// NOM AFFICHÉ  ≠  IDENTIFIANT DE CONNEXION
//
// La plateforme affiche un nom court et lisible. L'identifiant de connexion,
// lui, ne change JAMAIS : chaque compte garde le sien et son mot de passe.
//
// La base garde elle aussi l'identifiant réel dans chaque écriture
// (performedBy, modifiedBy, createdBy, paidBy) : c'est la signature du journal
// d'audit, on n'y touche pas. On traduit uniquement au moment de l'affichage —
// donc tout l'historique déjà enregistré apparaît immédiatement au nouveau nom,
// sans qu'une seule ligne de données soit réécrite.
//
// Pour renommer quelqu'un d'autre : ajouter une ligne ci-dessous.
// La clé est l'identifiant de connexion, en minuscules.
// ---------------------------------------------------------------------------
const DISPLAY_NAMES: Record<string, string> = {
  soumaya: 'SOU',
};

// Les clés sont des identifiants de connexion (lettres/chiffres), mais on
// échappe quand même avant d'en faire une expression de recherche.
const escapeForSearch = (s: string) => s.replace(/[^a-z0-9_]/gi, (ch) => '\\' + ch);

/** Le nom d'un utilisateur tel qu'il doit apparaître à l'écran. */
export function displayUser(raw?: string | null): string {
  if (!raw) return '';
  return DISPLAY_NAMES[raw.trim().toLowerCase()] ?? raw;
}

/**
 * Idem, mais pour une phrase du journal d'audit où le nom est noyé dans le
 * texte (« Connexion réussie de soumaya »). À réserver aux textes écrits par
 * la plateforme — jamais aux notes tapées par un utilisateur.
 */
export function displayNamesIn(text?: string | null): string {
  if (!text) return '';
  let out = text;
  for (const [stored, shown] of Object.entries(DISPLAY_NAMES)) {
    out = out.replace(new RegExp('\\b' + escapeForSearch(stored) + '\\b', 'gi'), shown);
  }
  return out;
}

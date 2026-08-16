'use client';

import React, { memo } from 'react';

/**
 * COFFRE FORT ADMINISTRATION — logo coffre-fort (proposition E, « PORTE »).
 *
 * Vue rapprochée de la porte : corps, molette avec son axe, barre de poignée,
 * deux pieds. Cinq éléments seulement — c'est volontaire : la version précédente
 * reprenait tout le visuel source (clavier 3x3, charnières, écran, aiguille) et
 * devenait illisible à 14px dans le menu du bas. Une icône à cette taille ne
 * supporte que 3 ou 4 formes.
 *
 * `currentColor` → prend le bleu du Coffre partout sans image à recolorer,
 * net à toutes les tailles, fond transparent, quelques centaines d'octets.
 * Même grille 24x24 et même langage de tracé que les icônes lucide voisines
 * (Landmark, Archive, Receipt) pour rester aligné visuellement.
 */
const CoffreIcon = memo(({ className, strokeWidth = 1.7 }: { className?: string; strokeWidth?: number }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    {/* corps du coffre */}
    <rect x="3.4" y="2.8" width="17.2" height="16" rx="2.4" />
    {/* pieds */}
    <path d="M6.6 18.8v2.2M17.4 18.8v2.2" />
    {/* molette + axe */}
    <circle cx="11.4" cy="10.8" r="3.1" />
    <circle cx="11.4" cy="10.8" r=".9" />
    {/* poignée */}
    <path d="M16.4 8.4v4.8" />
  </svg>
));
CoffreIcon.displayName = 'CoffreIcon';

export default CoffreIcon;

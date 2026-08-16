'use client';

import React, { memo } from 'react';

/**
 * COFFRE FORT ADMINISTRATION — logo coffre-fort.
 *
 * Redessiné en SVG d'après le visuel fourni (coffre de banque : corps, porte,
 * deux charnières, clavier à 9 touches avec écran, molette, deux pieds).
 * Le JPG source est sur fond blanc : inutilisable à 14px sur fond noir. En SVG :
 *  - `currentColor` → prend le bleu du Coffre partout, sans image à recolorer
 *  - net à toutes les tailles, du menu (14px) au watermark du hero (48px+)
 *  - fond transparent, quelques centaines d'octets
 *
 * Même grille 24x24 et même langage de tracé que les icônes lucide autour, pour
 * qu'il s'aligne visuellement avec Landmark / Archive / Receipt.
 */
const CoffreIcon = memo(({ className, strokeWidth = 1.6 }: { className?: string; strokeWidth?: number }) => (
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
    <rect x="2.4" y="2.6" width="19.2" height="16.8" rx="2.1" />
    {/* pieds */}
    <path d="M5.6 19.4v1.6h2.9v-1.6M15.5 19.4v1.6h2.9v-1.6" />
    {/* porte */}
    <rect x="5.5" y="5.2" width="13.4" height="11.6" rx="1.3" />
    {/* charnières */}
    <rect x="4.5" y="6.7" width="1.9" height="2.3" rx="0.6" />
    <rect x="4.5" y="13" width="1.9" height="2.3" rx="0.6" />
    {/* clavier : écran en haut + grille 3x3 */}
    <rect x="7.7" y="7.5" width="4.8" height="7" rx="0.5" />
    <path d="M7.7 9.6h4.8M9.3 9.6v4.9M10.9 9.6v4.9M7.7 11.2h4.8M7.7 12.8h4.8" />
    {/* molette + aiguille */}
    <circle cx="15.9" cy="9.7" r="1.6" />
    <path d="M15.2 11.1l.35 3.1a.36.36 0 0 0 .7 0l.35-3.1" />
  </svg>
));
CoffreIcon.displayName = 'CoffreIcon';

export default CoffreIcon;

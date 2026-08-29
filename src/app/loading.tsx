import MoneyHubLogo from '@/components/MoneyHubLogo';

// ÉCRAN NOIR AU DÉMARRAGE — la cause et le remède.
//
// La page est entièrement dynamique : le serveur répond en 66 ms, puis GARDE la
// main pendant ~3 s le temps d'interroger la base. Sans ce fichier, Next n'a
// rien à envoyer entre les deux et le téléphone reste noir tout ce temps.
//
// Ce composant est le repli d'un Suspense automatique : il part dans le PREMIER
// paquet, donc l'écran s'allume tout de suite avec l'identité de l'app, et le
// contenu réel le remplace dès que les données arrivent. On n'accélère pas la
// base ici — on arrête de faire attendre les yeux devant du noir.
export default function Loading() {
  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 px-8">
      <div className="animate-pulse">
        <MoneyHubLogo size={64} showWordmark />
      </div>
      {/* Trois barres à la place des trois cartes de solde : l'oeil retrouve la
          forme de l'écran qui arrive, au lieu d'un vide. */}
      <div className="w-full max-w-sm flex flex-col gap-3" aria-hidden="true">
        <div className="h-20 rounded-[28px] bg-neutral-900/60 border border-neutral-800 animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-16 rounded-[24px] bg-neutral-900/40 border border-neutral-800 animate-pulse" />
          <div className="h-16 rounded-[24px] bg-neutral-900/40 border border-neutral-800 animate-pulse" />
        </div>
      </div>
      <p className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.25em]">Chargement des comptes</p>
    </main>
  );
}

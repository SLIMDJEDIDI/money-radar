'use client';

import { useEffect, useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const INSTALLED_KEY = 'money_hub_pwa_installed';
const DISMISSED_THIS_SESSION_KEY = 'money_hub_pwa_prompt_dismissed_session';

export default function PwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<InstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    const isAndroid = /Android/i.test(window.navigator.userAgent);
    if (standalone || !isAndroid || localStorage.getItem(INSTALLED_KEY) === '1' || sessionStorage.getItem(DISMISSED_THIS_SESSION_KEY) === '1') return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as InstallPromptEvent);
      setShow(true);
    };
    const onInstalled = () => {
      localStorage.setItem(INSTALLED_KEY, '1');
      setShow(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    // Never display again after successful installation. If merely dismissed, leave the browser in control.
    if (result.outcome === 'accepted') localStorage.setItem(INSTALLED_KEY, '1');
    setShow(false);
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    // A manual close suppresses the prompt only for this visit; only installation is permanent.
    sessionStorage.setItem(DISMISSED_THIS_SESSION_KEY, '1');
    setShow(false);
  };

  if (!show || !deferredPrompt) return null;
  return (
    <div className="fixed bottom-5 left-4 right-4 z-[500] mx-auto max-w-md animate-in slide-in-from-bottom-5 duration-500">
      <div className="relative overflow-hidden rounded-[30px] border border-emerald-400/35 bg-neutral-950/95 p-5 shadow-2xl shadow-emerald-950/40 backdrop-blur-xl ring-1 ring-white/10">
        <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-emerald-400/15 blur-2xl" />
        <button onClick={dismiss} aria-label="Ne plus afficher" className="absolute right-3 top-3 rounded-xl p-2 text-neutral-500 transition hover:bg-neutral-800 hover:text-white"><X className="h-4 w-4" /></button>
        <div className="relative flex items-start gap-4 pr-8">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-400 text-black shadow-lg shadow-emerald-500/20"><Smartphone className="h-6 w-6" /></div>
          <div className="min-w-0"><p className="text-sm font-black uppercase tracking-tight text-white">Installer Money Hub</p><p className="mt-1 text-[11px] font-bold leading-relaxed text-neutral-400">Accès rapide depuis l’écran d’accueil, en plein écran.</p></div>
        </div>
        <button onClick={install} className="relative mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 py-3.5 text-[11px] font-black uppercase tracking-[0.16em] text-black transition active:scale-[0.98] hover:bg-emerald-300"><Download className="h-4 w-4" /> Installer l’application</button>
      </div>
    </div>
  );
}

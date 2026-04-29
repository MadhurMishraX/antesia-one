import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;

    // ✅ Check if event was already captured before React mounted
    const cached = (window as any).__installPromptEvent;
    if (cached) {
      setDeferredPrompt(cached);
      setShowPrompt(true);
    }

    // ✅ Also listen in case it fires after mount
    const handleInstallReady = () => {
      const e = (window as any).__installPromptEvent;
      if (e) {
        setDeferredPrompt(e);
        setShowPrompt(true);
      }
    };

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      (window as any).__installPromptEvent = e;
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('pwa-install-ready', handleInstallReady);
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('pwa-install-ready', handleInstallReady);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, [dismissed]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('PWA install outcome:', outcome);
    (window as any).__installPromptEvent = null;
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    // Optional: remember dismissal in session
    sessionStorage.setItem('pwa-prompt-dismissed', '1');
  };

  if (!showPrompt || !deferredPrompt) return null;

  return (
    <div className="fixed top-0 left-0 right-0 p-4 z-50 animate-in slide-in-from-top fade-in duration-300">
      <div className="bg-primary text-white rounded-2xl shadow-xl p-4 flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="font-bold text-sm">Install Antesia App</span>
          <span className="text-xs text-white/80">Add to home screen for a better experience</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleInstallClick}
            className="flex items-center gap-1 bg-white text-primary px-3 py-1.5 rounded-full text-sm font-bold shadow-sm"
          >
            <Download size={16} />
            Install
          </button>
          <button 
            onClick={handleDismiss}
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

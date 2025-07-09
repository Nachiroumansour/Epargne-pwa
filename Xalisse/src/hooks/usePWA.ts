import { useState, useEffect } from 'react';

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOffline: boolean;
  swRegistration: ServiceWorkerRegistration | null;
  updateAvailable: boolean;
}

interface PWAActions {
  installApp: () => Promise<void>;
  updateApp: () => Promise<void>;
  checkForUpdates: () => Promise<void>;
}

export const usePWA = (): PWAState & PWAActions => {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isOffline: !navigator.onLine,
    swRegistration: null,
    updateAvailable: false,
  });

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Vérifier si l'app est déjà installée
    const checkInstallStatus = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isInStandaloneMode = (window.navigator as any).standalone === true;
      
      setState(prev => ({
        ...prev,
        isInstalled: isStandalone || (isIOS && isInStandaloneMode)
      }));
    };

    checkInstallStatus();

    // Enregistrer le Service Worker
    const registerServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          
          setState(prev => ({ ...prev, swRegistration: registration }));
          
          console.log('🎯 Service Worker enregistré:', registration);

          // Vérifier les mises à jour
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setState(prev => ({ ...prev, updateAvailable: true }));
                  console.log('🔄 Mise à jour disponible!');
                }
              });
            }
          });

        } catch (error) {
          console.error('❌ Erreur enregistrement Service Worker:', error);
        }
      }
    };

    registerServiceWorker();

    // Événement pour l'installation PWA
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setState(prev => ({ ...prev, isInstallable: true }));
      console.log('💾 App installable détectée');
    };

    // Événement après installation
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setState(prev => ({ 
        ...prev, 
        isInstallable: false, 
        isInstalled: true 
      }));
      console.log('✅ App installée avec succès');
    };

    // Gestion de l'état en ligne/hors ligne
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOffline: false }));
      console.log('🌐 Connexion rétablie');
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOffline: true }));
      console.log('📱 Mode hors ligne activé');
    };

    // Ajouter les event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Nettoyage
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fonction pour installer l'app
  const installApp = async (): Promise<void> => {
    if (!deferredPrompt) {
      throw new Error('App non installable pour le moment');
    }

    try {
      const result = await deferredPrompt.prompt();
      console.log('👤 Choix utilisateur pour installation:', result.outcome);
      
      if (result.outcome === 'accepted') {
        setDeferredPrompt(null);
        setState(prev => ({ ...prev, isInstallable: false }));
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'installation:', error);
      throw error;
    }
  };

  // Fonction pour mettre à jour l'app
  const updateApp = async (): Promise<void> => {
    if (!state.swRegistration) {
      throw new Error('Service Worker non disponible');
    }

    try {
      if (state.swRegistration.waiting) {
        // Demande au SW en attente de prendre le contrôle
        state.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
        
        // Recharger la page après la mise à jour
        window.location.reload();
      }
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour:', error);
      throw error;
    }
  };

  // Fonction pour vérifier manuellement les mises à jour
  const checkForUpdates = async (): Promise<void> => {
    if (!state.swRegistration) {
      throw new Error('Service Worker non disponible');
    }

    try {
      await state.swRegistration.update();
      console.log('🔍 Vérification de mise à jour terminée');
    } catch (error) {
      console.error('❌ Erreur lors de la vérification de mise à jour:', error);
      throw error;
    }
  };

  return {
    ...state,
    installApp,
    updateApp,
    checkForUpdates,
  };
};

// Hook pour la gestion du cache
export const useOfflineData = () => {
  const [cachedData, setCachedData] = useState<{ [key: string]: any }>({});
  
  useEffect(() => {
    // Charger les données en cache au démarrage
    const loadCachedData = async () => {
      if ('caches' in window) {
        try {
          const cache = await caches.open('calebasse-v1.0.0');
          const requests = await cache.keys();
          
          const data: { [key: string]: any } = {};
          
          for (const request of requests) {
            if (request.url.includes('/api/')) {
              try {
                const response = await cache.match(request);
                if (response) {
                  const jsonData = await response.json();
                  data[request.url] = jsonData;
                }
              } catch (error) {
                console.warn('Erreur lecture cache pour:', request.url);
              }
            }
          }
          
          setCachedData(data);
        } catch (error) {
          console.error('Erreur chargement données en cache:', error);
        }
      }
    };

    loadCachedData();
  }, []);

  return { cachedData };
}; 
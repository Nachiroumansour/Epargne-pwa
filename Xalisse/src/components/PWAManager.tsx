import React from 'react';
import { usePWA } from '../hooks/usePWA';
import toast from 'react-hot-toast';
import { 
  Download, 
  RefreshCw, 
  WifiOff, 
  Wifi,
  Smartphone,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

export const PWAManager: React.FC = () => {
  const { 
    isInstallable, 
    isInstalled, 
    isOffline, 
    updateAvailable,
    installApp, 
    updateApp,
    checkForUpdates
  } = usePWA();

  const handleInstall = async () => {
    try {
      await installApp();
      toast.success('Application installée avec succès! 🎉');
    } catch (error) {
      toast.error('Erreur lors de l\'installation');
      console.error(error);
    }
  };

  const handleUpdate = async () => {
    try {
      await updateApp();
      toast.success('Application mise à jour! 🔄');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
      console.error(error);
    }
  };

  const handleCheckUpdates = async () => {
    try {
      await checkForUpdates();
      toast.success('Vérification terminée');
    } catch (error) {
      toast.error('Erreur lors de la vérification');
      console.error(error);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {/* Statut de connexion */}
      <div 
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium shadow-lg transition-all ${
          isOffline 
            ? 'bg-red-100 text-red-800 border border-red-200' 
            : 'bg-green-100 text-green-800 border border-green-200'
        }`}
      >
        {isOffline ? (
          <>
            <WifiOff size={16} />
            <span>Hors ligne</span>
          </>
        ) : (
          <>
            <Wifi size={16} />
            <span>En ligne</span>
          </>
        )}
      </div>

      {/* Bouton d'installation PWA */}
      {isInstallable && (
        <button
          onClick={handleInstall}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg transition-all transform hover:scale-105"
        >
          <Download size={16} />
          <span>Installer l'app</span>
        </button>
      )}

      {/* Badge app installée */}
      {isInstalled && (
        <div className="flex items-center space-x-2 bg-green-600 text-white px-3 py-2 rounded-lg shadow-lg">
          <Smartphone size={16} />
          <span>App installée</span>
        </div>
      )}

      {/* Notification de mise à jour */}
      {updateAvailable && (
        <div className="bg-orange-600 text-white p-4 rounded-lg shadow-lg max-w-sm">
          <div className="flex items-start space-x-3">
            <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium mb-2">Mise à jour disponible</p>
              <p className="text-sm opacity-90 mb-3">
                Une nouvelle version de l'application est prête.
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={handleUpdate}
                  className="flex items-center space-x-1 bg-white text-orange-600 px-3 py-1.5 rounded text-sm font-medium hover:bg-orange-50 transition-colors"
                >
                  <RefreshCw size={14} />
                  <span>Mettre à jour</span>
                </button>
                <button 
                  onClick={() => window.location.reload()}
                  className="text-white/80 hover:text-white text-sm underline"
                >
                  Plus tard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Menu de développement (en mode dev seulement) */}
      {import.meta.env.DEV && (
        <div className="bg-gray-800 text-white p-3 rounded-lg shadow-lg">
          <p className="text-sm font-medium mb-2">PWA Debug</p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Installable:</span>
              <span className={isInstallable ? 'text-green-400' : 'text-red-400'}>
                {isInstallable ? '✓' : '✗'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Installée:</span>
              <span className={isInstalled ? 'text-green-400' : 'text-red-400'}>
                {isInstalled ? '✓' : '✗'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Offline:</span>
              <span className={isOffline ? 'text-orange-400' : 'text-green-400'}>
                {isOffline ? '✓' : '✗'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>MAJ dispo:</span>
              <span className={updateAvailable ? 'text-orange-400' : 'text-gray-400'}>
                {updateAvailable ? '✓' : '✗'}
              </span>
            </div>
          </div>
          <button
            onClick={handleCheckUpdates}
            className="mt-2 w-full bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-xs transition-colors"
          >
            Vérifier MAJ
          </button>
        </div>
      )}
    </div>
  );
};

// Composant pour afficher les informations de cache offline
export const OfflineIndicator: React.FC = () => {
  const { isOffline } = usePWA();

  if (!isOffline) return null;

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <WifiOff className="h-5 w-5 text-yellow-400" />
        </div>
        <div className="ml-3">
          <p className="text-sm text-yellow-700">
            <strong>Mode hors ligne actif.</strong> Vous consultez des données mises en cache. 
            Certaines fonctionnalités peuvent être limitées.
          </p>
        </div>
      </div>
    </div>
  );
};

// Composant pour bannière d'installation PWA dans le header
export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, installApp } = usePWA();

  if (!isInstallable) return null;

  const handleInstall = async () => {
    try {
      await installApp();
      toast.success('Application installée! Vous pouvez maintenant l\'utiliser comme une app native. 📱');
    } catch (error) {
      toast.error('Erreur lors de l\'installation');
    }
  };

  return (
    <div className="bg-blue-600 text-white px-4 py-2">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-3">
          <Smartphone size={20} />
          <div>
            <p className="font-medium">Installer Calebasse</p>
            <p className="text-xs opacity-90">
              Accédez rapidement à vos cotisations et crédits
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleInstall}
            className="bg-white text-blue-600 px-4 py-1.5 rounded font-medium text-sm hover:bg-blue-50 transition-colors"
          >
            Installer
          </button>
          <button className="text-white/80 hover:text-white text-sm">
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}; 
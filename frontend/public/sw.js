const CACHE_NAME = 'calebasse-v1.0.0';
const OFFLINE_URL = '/offline.html';

// Ressources à mettre en cache pour le fonctionnement offline
const CACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// URLs de l'API qui doivent être mises en cache
const API_CACHE_PATTERNS = [
  '/api/auth/me',
  '/api/statistics/members/',
  '/api/contributions/my-contributions',
  '/api/loans/my-loans',
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installation en cours...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: Mise en cache des ressources statiques');
        return cache.addAll(CACHE_URLS);
      })
      .then(() => {
        console.log('✅ Service Worker: Installation terminée');
        // Force l'activation immédiate
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Service Worker: Erreur lors de l\'installation', error);
      })
  );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activation en cours...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        // Supprime les anciens caches
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Service Worker: Suppression ancien cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Activation terminée');
        // Prend le contrôle de toutes les pages
        return self.clients.claim();
      })
  );
});

// Gestion des requêtes (stratégie de cache)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore les requêtes non-HTTP
  if (!request.url.startsWith('http')) {
    return;
  }

  // Stratégie pour les ressources statiques
  if (request.destination === 'document') {
    event.respondWith(handleDocumentRequest(request));
    return;
  }

  // Stratégie pour les requêtes API
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Stratégie pour les autres ressources (CSS, JS, images)
  event.respondWith(handleStaticRequest(request));
});

// Gestion des documents HTML (pages)
async function handleDocumentRequest(request) {
  try {
    // Essaie d'abord le réseau
    const networkResponse = await fetch(request);
    
    // Met en cache la réponse si elle est valide
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('📱 Service Worker: Mode offline - recherche en cache');
    
    // Si le réseau échoue, essaie le cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Si rien n'est trouvé, retourne la page offline
    const offlineResponse = await caches.match(OFFLINE_URL);
    if (offlineResponse) {
      return offlineResponse;
    }
    
    // Page offline de fallback basique
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Calebasse - Hors ligne</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .offline-container { max-width: 400px; margin: 0 auto; }
            .icon { font-size: 64px; margin-bottom: 20px; }
            h1 { color: #1e40af; }
            p { color: #666; }
            button { 
              background: #1e40af; color: white; border: none; 
              padding: 10px 20px; border-radius: 5px; cursor: pointer; 
            }
          </style>
        </head>
        <body>
          <div class="offline-container">
            <div class="icon">📱</div>
            <h1>Mode Hors Ligne</h1>
            <p>Vous êtes actuellement hors ligne. Certaines fonctionnalités peuvent être limitées.</p>
            <p>Les données précédemment consultées restent disponibles.</p>
            <button onclick="window.location.reload()">Réessayer</button>
          </div>
        </body>
      </html>`,
      {
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}

// Gestion des requêtes API avec cache intelligent
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  // Vérifie si c'est une API qu'on veut mettre en cache
  const shouldCache = API_CACHE_PATTERNS.some(pattern => 
    url.pathname.includes(pattern)
  );

  if (!shouldCache) {
    // Pour les APIs non mises en cache, essaie juste le réseau
    try {
      return await fetch(request);
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          status: 'error', 
          message: 'Fonctionnalité indisponible hors ligne',
          offline: true 
        }),
        { 
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }

  try {
    // Stratégie: Network First pour les données importantes
    const networkResponse = await fetch(request, {
      timeout: 3000 // Timeout rapide pour améliorer l'UX
    });
    
    if (networkResponse.ok) {
      // Met en cache les réponses réussies
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('🌐 Service Worker: API offline - recherche en cache');
    
    // Si le réseau échoue, utilise le cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Ajoute un header pour indiquer que c'est en cache
      const response = cachedResponse.clone();
      response.headers.set('X-From-Cache', 'true');
      return response;
    }
    
    // Aucune donnée disponible
    return new Response(
      JSON.stringify({ 
        status: 'error', 
        message: 'Aucune donnée disponible hors ligne',
        offline: true 
      }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Gestion des ressources statiques
async function handleStaticRequest(request) {
  try {
    // Cache First pour les ressources statiques
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Si pas en cache, va chercher sur le réseau
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('📁 Service Worker: Ressource statique indisponible:', request.url);
    
    // Pour les ressources statiques, on peut retourner une ressource de fallback
    if (request.destination === 'image') {
      // Image de fallback (optionnel)
      return new Response(
        '<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#f3f4f6"/><text x="100" y="100" text-anchor="middle" fill="#9ca3af">Image indisponible</text></svg>',
        { headers: { 'Content-Type': 'image/svg+xml' } }
      );
    }
    
    throw error;
  }
}

// Gestion des messages du client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_CACHE_STATUS') {
    // Envoie des infos sur le cache au client
    caches.keys().then(cacheNames => {
      event.ports[0].postMessage({
        caches: cacheNames,
        current: CACHE_NAME
      });
    });
  }
});

// Gestion de la synchronisation en arrière-plan (optionnel)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('🔄 Service Worker: Synchronisation en arrière-plan');
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Ici tu peux implémenter la logique de synchronisation
  // Par exemple, envoyer les données qui étaient en attente
  console.log('🔄 Synchronisation des données en attente...');
}

console.log('🎯 Service Worker: Chargé et prêt!'); 
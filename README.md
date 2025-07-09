# 💰 Calebasse - Application de Tontine PWA

Application Progressive Web App (PWA) pour la gestion de tontines - épargne et crédit.

## 🏗️ Architecture

- **Frontend PWA** : React + TypeScript + Vite + Tailwind CSS
- **Backend API** : Node.js + Express + MongoDB + Socket.io
- **Déploiement** : Vercel (Frontend + Backend)

## ✨ Fonctionnalités

### 💰 Gestion des Cotisations
- Enregistrement des cotisations membres
- Historique et suivi des paiements
- Génération de rapports

### 💳 Gestion des Crédits
- Demande et approbation de crédits
- Suivi des remboursements
- Conversion automatique intérêts → épargne

### 👥 Gestion des Membres
- Profils membres complets
- Tableau de bord personnalisé
- Notifications temps réel

### 📱 Fonctionnalités PWA
- ✅ Installation sur mobile/desktop
- ✅ Fonctionnement offline
- ✅ Synchronisation automatique
- ✅ Notifications push
- ✅ Cache intelligent

## 🚀 Déploiement Vercel

### Backend
1. Déployer le dossier `backend/` sur Vercel
2. Variables d'environnement requises (voir `backend/env.example`)
3. MongoDB Atlas pour la base de données

### Frontend PWA
1. Déployer le dossier `frontend/` sur Vercel  
2. Variable d'environnement : `VITE_API_URL=https://ton-backend.vercel.app/api`
3. Build automatique avec PWA

## 📁 Structure du projet

```
Epargne-pwa/
├── backend/          # API Node.js + Express + MongoDB
│   ├── server.js
│   ├── vercel.json
│   └── env.example
├── frontend/         # PWA React + TypeScript + Vite
│   ├── src/
│   ├── public/
│   ├── vercel.json
│   └── env.example
└── README.md
```

## 🛠️ Variables d'environnement

### Backend (`backend/env.example`)
```bash
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
NODE_ENV=production
```

### Frontend 
```bash
VITE_API_URL=https://ton-backend.vercel.app
```

## 📱 Test PWA

Après déploiement :
1. Ouvrir l'app dans Chrome/Edge
2. Icône "Installer" apparaît
3. Tester mode offline
4. Vérifier synchronisation

## 🔧 Technologies

- React 18 + TypeScript
- Vite + PWA
- Tailwind CSS
- Socket.io (temps réel)
- Chart.js (graphiques)
- React Query (cache)
- Express.js
- MongoDB + Mongoose 
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/database');
const { errorHandler } = require('./middlewares/errorHandler');
const http = require('http');
const { Server } = require('socket.io');

// Routes
const authRoutes = require('./routes/auth');
const memberRoutes = require('./routes/members');
const contributionRoutes = require('./routes/contributions');
const loanRoutes = require('./routes/loans');
const statisticsRoutes = require('./routes/statistics');

// Initialiser l'application Express
const app = express();

// Middlewares
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], // Accepte les requêtes de ton frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/contributions', contributionRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/statistics', statisticsRoutes);

// Route de base
app.get('/', (req, res) => {
  res.json({ message: 'Bienvenue sur l\'API Xalisse - Épargne et Crédit' });
});

// Route de santé pour la PWA
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    server: 'Calebasse API',
    uptime: process.uptime()
  });
});

// Middleware de gestion des erreurs
app.use(errorHandler);

// Connexion à la base de données et démarrage du serveur
const PORT = process.env.PORT || 8000;

// Connexion à MongoDB
connectDB()
  .then(() => {
    // Création du serveur HTTP
    const server = http.createServer(app);

    // Initialisation de Socket.IO
    const io = new Server(server, {
      cors: {
        origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      }
    });

    // Store des connexions actives avec leurs infos
    const activeConnections = new Map();

    // Listener de connexion Socket.IO
    io.on('connection', (socket) => {
      console.log('👤 Nouvel utilisateur connecté:', socket.id);
      
      // Récupérer les infos d'authentification depuis le handshake
      const { userId, role, memberId } = socket.handshake.auth;
      
      console.log('📋 Infos utilisateur reçues:', { userId, role, memberId });
      console.log('🔍 Types des données reçues:', {
        userId: typeof userId,
        role: typeof role,
        memberId: typeof memberId
      });
      
      // Stocker les infos de connexion
      activeConnections.set(socket.id, { userId, role, memberId });
      console.log(`💾 Connexion stockée: ${role}${memberId ? ` (membre: ${memberId})` : ''}`);
      console.log(`📊 Total connexions actives: ${activeConnections.size}`);

      socket.on('disconnect', () => {
        console.log('👋 Utilisateur déconnecté:', socket.id);
        activeConnections.delete(socket.id);
        console.log(`📊 Total connexions actives après déconnexion: ${activeConnections.size}`);
      });
    });

    // Fonction helper pour envoyer des événements ciblés
    io.sendToRole = (role, eventName, data) => {
      activeConnections.forEach((userInfo, socketId) => {
        if (userInfo.role === role) {
          io.to(socketId).emit(eventName, data);
        }
      });
    };

    io.sendToMember = (memberId, eventName, data) => {
      console.log(`🎯 Tentative d'envoi événement "${eventName}" au membre ${memberId}`);
      console.log(`🎯 Type de memberId recherché:`, typeof memberId, memberId);
      
      let found = false;
      activeConnections.forEach((userInfo, socketId) => {
        console.log(`🔍 Connexion active: ${socketId} - role: ${userInfo.role}, memberId: ${userInfo.memberId} (type: ${typeof userInfo.memberId})`);
        
        // Comparer en convertissant les deux en string pour éviter les problèmes de type
        if (userInfo.role === 'member' && String(userInfo.memberId) === String(memberId)) {
          console.log(`✅ MATCH trouvé! Envoi événement "${eventName}" au membre ${memberId} (socket: ${socketId})`);
          io.to(socketId).emit(eventName, data);
          found = true;
        }
      });
      
      if (!found) {
        console.log(`❌ Aucune connexion trouvée pour le membre ${memberId}`);
        console.log(`📋 Connexions actives:`, Array.from(activeConnections.entries()));
      }
    };

    // Rendre io accessible dans les routes/controllers
    app.set('io', io);

    server.listen(PORT, () => {
      console.log(`Serveur démarré sur le port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Erreur de connexion à MongoDB:', err.message);
    process.exit(1);
  });

// Gestion des erreurs non capturées
process.on('unhandledRejection', (err) => {
  console.error('Erreur non gérée:', err);
  process.exit(1);
});

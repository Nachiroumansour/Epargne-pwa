const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware pour vérifier si l'utilisateur est authentifié
exports.protect = async (req, res, next) => {
  try {
    let token;
    
    // Vérifier si le token est présent dans les en-têtes
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Vous n\'êtes pas connecté. Veuillez vous connecter pour accéder à cette ressource.'
      });
    }
    
    // Vérifier si le token est valide
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Vérifier si l'utilisateur existe toujours
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        status: 'error',
        message: 'L\'utilisateur associé à ce token n\'existe plus.'
      });
    }
    
    // Vérifier si l'utilisateur est actif
    if (!currentUser.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'Ce compte a été désactivé. Veuillez contacter l\'administrateur.'
      });
    }
    
    // Ajouter l'utilisateur à la requête
    req.user = currentUser;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: 'Token invalide. Veuillez vous reconnecter.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Votre session a expiré. Veuillez vous reconnecter.'
      });
    }
    
    next(error);
  }
};

// Middleware pour restreindre l'accès aux rôles spécifiés
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Vous n\'avez pas la permission d\'effectuer cette action.'
      });
    }
    
    next();
  };
};

// Middleware pour restreindre l'accès aux admins uniquement
exports.requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Accès réservé aux administrateurs.'
    });
  }
  next();
};

// Middleware pour restreindre l'accès aux membres uniquement
exports.requireMember = (req, res, next) => {
  if (req.user.role !== 'member') {
    return res.status(403).json({
      status: 'error',
      message: 'Accès réservé aux membres.'
    });
  }
  next();
};

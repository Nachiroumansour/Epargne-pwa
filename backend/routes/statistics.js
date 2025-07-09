const express = require('express');
const statisticsController = require('../controllers/statisticsController');
const { protect, restrictTo } = require('../middlewares/auth');

const router = express.Router();

// Protéger toutes les routes
router.use(protect);

// Route pour les statistiques administrateur (admin uniquement)
router.get('/admin', restrictTo('admin'), statisticsController.getAdminStats);

// Route pour les statistiques d'un membre spécifique
// Les admins peuvent voir les stats de n'importe quel membre
// Les membres ne peuvent voir que leurs propres stats
router.get('/members/:id', (req, res, next) => {
  // Si l'utilisateur est un membre, vérifier qu'il accède à ses propres stats
  if (req.user.role === 'member' && req.user.memberId.toString() !== req.params.id) {
    return res.status(403).json({
      status: 'error',
      message: 'Vous n\'avez pas la permission d\'accéder aux statistiques d\'un autre membre.'
    });
  }
  next();
}, statisticsController.getMemberStats);

// Route pour le rapport d'accompte (admin uniquement)
router.get('/accompte', restrictTo('admin'), statisticsController.getAccompteReport);

module.exports = router;

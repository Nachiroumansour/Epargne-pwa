const express = require('express');
const { body } = require('express-validator');
const memberController = require('../controllers/memberController');
const { protect, restrictTo } = require('../middlewares/auth');
const contributionController = require('../controllers/contributionController');
const loanController = require('../controllers/loanController');

const router = express.Router();

// Protéger toutes les routes
router.use(protect);

// Validation des données pour la création/mise à jour d'un membre
const memberValidation = [
  body('fullName').notEmpty().withMessage('Le nom complet est requis'),
  body('phone').notEmpty().withMessage('Le numéro de téléphone est requis'),
  body('email').isEmail().withMessage('Veuillez fournir un email valide'),
  body('address').notEmpty().withMessage("L'adresse est requise")
];

// --- Routes Mixtes (Membre/Admin) ---
// Un membre peut voir ses propres contributions, un admin peut voir celles de n'importe qui
router.get('/:id/contributions', contributionController.getMemberContributions);
// Un membre peut voir son propre profil, un admin peut voir celui de n'importe qui
router.get('/:id', memberController.getMemberById);


// --- Routes Admin Uniquement ---

// Voir les prêts d'un membre spécifique (admin-only)
router.get('/:id/loans', restrictTo('admin'), loanController.getMemberLoans);

// Obtenir la liste de tous les membres (admin-only)
router.get('/', restrictTo('admin'), memberController.getAllMembers);

// Créer un nouveau membre (admin-only)
router.post('/', restrictTo('admin'), memberValidation, memberController.createMember);

// Mettre à jour et supprimer un membre (admin-only)
router.route('/:id')
  .put(restrictTo('admin'), memberValidation, memberController.updateMember)
  .delete(restrictTo('admin'), memberController.deleteMember);

// Obtenir le résumé financier d'un membre (admin-only)
router.get('/:id/summary', restrictTo('admin'), memberController.getMemberSummary);

module.exports = router;

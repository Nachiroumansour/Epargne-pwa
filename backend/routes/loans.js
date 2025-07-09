const express = require('express');
const { body } = require('express-validator');
const loanController = require('../controllers/loanController');
const { protect, restrictTo } = require('../middlewares/auth');

const router = express.Router();

// Protéger toutes les routes
router.use(protect);

// Route pour un membre pour récupérer ses propres prêts
router.get('/my-loans', loanController.getMyLoans);

// Validation des données pour la création/mise à jour d'un prêt
const loanValidation = [
  body('amount').isNumeric().withMessage('Le montant doit être un nombre')
    .isFloat({ min: 0 }).withMessage('Le montant ne peut pas être négatif'),
  body('interestRate').optional().isNumeric().withMessage('Le taux d\'intérêt doit être un nombre')
    .isFloat({ min: 0 }).withMessage('Le taux d\'intérêt ne peut pas être négatif'),
  body('term').isInt({ min: 1 }).withMessage('La durée du prêt doit être d\'au moins 1 mois'),
  body('purpose').notEmpty().withMessage('L\'objet du prêt est requis')
];

// Validation des données pour la mise à jour du statut d'un prêt
const statusUpdateValidation = [
  body('status').isIn(['pending', 'approved', 'rejected', 'disbursed', 'repaid', 'defaulted'])
    .withMessage('Statut invalide')
];

// Validation des données pour l'ajout d'un remboursement
const repaymentValidation = [
  body('amount').isNumeric().withMessage('Le montant doit être un nombre')
    .isFloat({ min: 0 }).withMessage('Le montant ne peut pas être négatif'),
  body('paymentMethod').isIn(['cash', 'transfer', 'mobile_money']).withMessage('Méthode de paiement invalide')
];

console.log('Route POST /api/loans accessible');
router.post('/', loanValidation, loanController.createLoan);

// --- Routes Admin ---

// Obtenir tous les prêts (admin seulement)
router.get('/', restrictTo('admin'), loanController.getAllLoans);

router.route('/:id')
  .get(restrictTo('admin'), loanController.getLoanById)
  .put(restrictTo('admin'), loanValidation, loanController.updateLoan)
  .delete(restrictTo('admin'), loanController.deleteLoan);

router.patch('/:id/status', restrictTo('admin'), statusUpdateValidation, loanController.updateLoanStatus);
router.post('/:id/repayments', restrictTo('admin'), repaymentValidation, loanController.addRepayment);

// Routes d'approbation/refus par l'admin
router.patch('/:id/approve', restrictTo('admin'), loanController.approveLoan);
router.patch('/:id/reject', restrictTo('admin'), loanController.rejectLoan);

// Route pour ajouter un remboursement (admin seulement)
router.post('/:id/repayments', restrictTo('admin'), loanController.addRepayment);

module.exports = router;

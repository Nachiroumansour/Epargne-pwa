const express = require('express');
const { body } = require('express-validator');
const contributionController = require('../controllers/contributionController');
const { protect, restrictTo } = require('../middlewares/auth');

const router = express.Router();

// Protéger toutes les routes
router.use(protect);

// Validation des données pour la création/mise à jour d'une contribution
const contributionValidation = [
  body('memberId').notEmpty().withMessage('L\'identifiant du membre est requis'),
  body('amount').isNumeric().withMessage('Le montant doit être un nombre')
    .isFloat({ min: 0 }).withMessage('Le montant ne peut pas être négatif'),
  body('type').isIn(['savings', 'shares', 'fees']).withMessage('Type de contribution invalide'),
  body('paymentMethod').isIn(['cash', 'transfer', 'mobile_money']).withMessage('Méthode de paiement invalide')
];

// Validation des données pour la création en masse de contributions
const bulkContributionValidation = [
  body('contributions').isArray().withMessage('Les contributions doivent être un tableau'),
  body('contributions.*.memberId').notEmpty().withMessage('L\'identifiant du membre est requis'),
  body('contributions.*.amount').isNumeric().withMessage('Le montant doit être un nombre')
    .isFloat({ min: 0 }).withMessage('Le montant ne peut pas être négatif')
];

// Routes accessibles aux membres (lecture seule de leurs propres contributions)
router.get('/my-contributions', contributionController.getMyContributions);
router.get('/member/:id', contributionController.getMemberContributions);

// Routes admin
router.route('/')
  .get(restrictTo('admin'), contributionController.getAllContributions)
  .post(restrictTo('admin'), contributionValidation, contributionController.createContribution);

router.post('/bulk', restrictTo('admin'), bulkContributionValidation, contributionController.createBulkContributions);

router.route('/:id')
  .get(restrictTo('admin'), contributionController.getContributionById)
  .put(restrictTo('admin'), contributionValidation, contributionController.updateContribution)
  .delete(restrictTo('admin'), contributionController.deleteContribution);

module.exports = router;

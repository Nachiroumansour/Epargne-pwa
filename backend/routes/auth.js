const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { protect, restrictTo } = require('../middlewares/auth');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

// Validation des données pour la connexion
const loginValidation = [
  body('email').isEmail().withMessage('Veuillez fournir un email valide'),
  body('password').notEmpty().withMessage('Le mot de passe est requis')
];

// Validation des données pour le changement de mot de passe
const passwordUpdateValidation = [
  body('currentPassword').notEmpty().withMessage('Le mot de passe actuel est requis'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Le nouveau mot de passe doit contenir au moins 6 caractères')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre')
];

// Validation des données pour la création d'utilisateur
const createUserValidation = [
  body('email')
    .isEmail()
    .withMessage('Veuillez fournir un email valide')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Le mot de passe doit contenir au moins 6 caractères')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre'),
  body('role')
    .optional()
    .isIn(['admin', 'member'])
    .withMessage('Le rôle doit être admin ou member')
];

// Routes publiques
router.post('/login', loginValidation, authController.login);
router.post('/logout', authController.logout);

// Routes protégées
router.use(protect);

// Routes accessibles à tous les utilisateurs authentifiés
router.get('/me', authController.getMe);
router.put('/password', passwordUpdateValidation, authController.updatePassword);

// Routes accessibles uniquement aux administrateurs
router.post('/users', restrictTo('admin'), createUserValidation, authController.createUser);

// Notifications in-app
router.get('/notifications', notificationController.getMyNotifications);
router.patch('/notifications/:id/read', notificationController.markAsRead);

module.exports = router;

const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const Member = require('../models/Member');

// Fonction utilitaire pour générer un token JWT
const generateToken = (user) => {
  // Inclure id, memberId (si présent) et role dans le token
  return jwt.sign(
    {
      id: user._id,
      memberId: user.memberId,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN,
    }
  );
};

// Connexion utilisateur
exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        status: 'error',
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    // Vérifier si l'utilisateur existe
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Email ou mot de passe incorrect',
      });
    }

    // Vérifier si l'utilisateur est actif
    if (!user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'Ce compte a été désactivé. Veuillez contacter l\'administrateur.',
      });
    }

    // Vérifier si le mot de passe est correct
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        status: 'error',
        message: 'Email ou mot de passe incorrect',
      });
    }

    // Mettre à jour la date de dernière connexion
    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });

    // Générer un token JWT
    const token = generateToken(user);

    // Supprimer le mot de passe de la réponse
    user.password = undefined;

    // Récupérer les informations du membre si c'est un membre
    let memberInfo = null;
    if (user.role === 'member' && user.memberId) {
      memberInfo = await Member.findById(user.memberId);
    }

    res.status(200).json({
      status: 'success',
      message: 'Connexion réussie',
      token,
      data: {
        user,
        memberInfo,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Déconnexion
exports.logout = async (req, res, next) => {
  try {
    // Mettre à jour la date de dernière connexion
    if (req.user) {
      await User.findByIdAndUpdate(req.user.id, {
        lastLogin: Date.now()
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Déconnexion réussie',
    });
  } catch (error) {
    next(error);
  }
};

// Obtenir les informations de l'utilisateur connecté
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Utilisateur non trouvé',
      });
    }

    // Vérifier si l'utilisateur est actif
    if (!user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'Ce compte a été désactivé. Veuillez contacter l\'administrateur.',
      });
    }

    // Récupérer les informations du membre si c'est un membre
    let memberInfo = null;
    if (user.role === 'member' && user.memberId) {
      memberInfo = await Member.findById(user.memberId);
    }

    res.status(200).json({
      status: 'success',
      data: {
        user,
        memberInfo,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Changer le mot de passe
exports.updatePassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        status: 'error',
        errors: errors.array() 
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Récupérer l'utilisateur avec son mot de passe
    const user = await User.findById(req.user.id).select('+password');

    // Vérifier si le mot de passe actuel est correct
    const isPasswordCorrect = await user.comparePassword(currentPassword);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        status: 'error',
        message: 'Mot de passe actuel incorrect',
      });
    }

    // Vérifier si le nouveau mot de passe est différent de l'ancien
    if (currentPassword === newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Le nouveau mot de passe doit être différent de l\'ancien',
      });
    }

    // Mettre à jour le mot de passe
    user.password = newPassword;
    await user.save();

    // Générer un nouveau token
    const token = generateToken(user);

    res.status(200).json({
      status: 'success',
      message: 'Mot de passe mis à jour avec succès',
      token,
    });
  } catch (error) {
    next(error);
  }
};

// Créer un nouvel utilisateur (admin uniquement)
exports.createUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        status: 'error',
        errors: errors.array() 
      });
    }

    const { email, password, role } = req.body;

    // Vérifier si l'email existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'Cet email est déjà utilisé',
      });
    }

    // Créer un nouvel utilisateur
    const newUser = await User.create({
      email,
      password,
      role: role || 'member',
    });

    // Supprimer le mot de passe de la réponse
    newUser.password = undefined;

    res.status(201).json({
      status: 'success',
      message: 'Utilisateur créé avec succès',
      data: {
        user: newUser,
      },
    });
  } catch (error) {
    next(error);
  }
};

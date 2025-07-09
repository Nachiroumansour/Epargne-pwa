const { validationResult } = require('express-validator');
const Member = require('../models/Member');
const User = require('../models/User');
const { sendCredentialsEmail } = require('../services/mailService');
const mongoose = require('mongoose');
const Contribution = require('../models/Contribution');
const Loan = require('../models/Loan');
const { sendWhatsAppCredentials } = require('../services/whatsappService');

// Obtenir tous les membres (avec pagination)
exports.getAllMembers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = Member.find().sort({ createdAt: -1 }).skip(skip).limit(limit);
    
    // Ajouter des filtres si nécessaire
    if (req.query.status) {
      query.where('status').equals(req.query.status);
    }
    
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.or([
        { firstName: searchRegex },
        { lastName: searchRegex },
        { phoneNumber: searchRegex }
      ]);
    }

    const members = await query;
    const total = await Member.countDocuments(query.getFilter());

    // Enrichir chaque membre avec total_savings et active_loans_count
    const enrichedMembers = await Promise.all(members.map(async (member) => {
      // Somme des cotisations
      const contributions = await Contribution.find({ memberId: member._id });
      const totalSavings = contributions.reduce((sum, c) => sum + c.amount, 0);
      // Nombre de crédits actifs
      const activeLoansCount = await Loan.countDocuments({ memberId: member._id, status: { $in: ['approved', 'in_progress', 'late'] } });
      // Nombre de crédits en attente
      const pendingLoansCount = await Loan.countDocuments({ memberId: member._id, status: 'pending' });
      const memberObj = member.toObject();
      memberObj.total_savings = totalSavings;
      memberObj.active_loans_count = activeLoansCount;
      memberObj.pending_loans_count = pendingLoansCount;
      return memberObj;
    }));

    res.status(200).json({
      status: 'success',
      results: enrichedMembers.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      },
      data: {
        members: enrichedMembers
      }
    });
  } catch (error) {
    next(error);
  }
};

// Obtenir un membre par son ID
exports.getMemberById = async (req, res, next) => {
  try {
    // Vérification d'accès : admin ou membre concerné
    if (req.user.role === 'member' && req.user.memberId.toString() !== req.params.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Vous n\'avez pas la permission d\'accéder à ce profil.'
      });
    }
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({
        status: 'error',
        message: 'Membre non trouvé'
      });
    }
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({
        status: 'error',
        message: 'Membre non trouvé'
      });
    }

    // Récupérer les cotisations du membre
    const contributions = await Contribution.find({ memberId: req.params.id });
    // Calculer la somme totale des cotisations
    const totalContributions = contributions.reduce((sum, contribution) => sum + contribution.amount, 0);

    // Récupérer tous les crédits du membre
    const loans = await Loan.find({ memberId: req.params.id });

    // Calcul des intérêts remboursés et du capital restant dû
    let totalInterestPaid = 0;
    let totalCapitalRemaining = 0;
    loans.forEach((loan) => {
      const totalRepaid = loan.repayments?.reduce((sum, r) => sum + r.amount, 0) || 0;
      const totalCapital = loan.amount;
      const totalInterest = loan.amount * (loan.interestRate / 100);
      // Capital remboursé = min(totalRepaid, capital)
      const capitalRepaid = Math.min(totalRepaid, totalCapital);
      // Intérêts remboursés = max(0, totalRepaid - capital)
      const interestRepaid = Math.max(0, totalRepaid - totalCapital);
      totalInterestPaid += interestRepaid;
      // Capital restant dû (pour crédits non soldés)
      if (totalRepaid < totalCapital) {
        totalCapitalRemaining += (totalCapital - totalRepaid);
      }
    });

    // Calcul de l'épargne totale
    const totalSavings = totalContributions + totalInterestPaid - totalCapitalRemaining;

    // Ajouter la somme à l'objet membre
    const memberWithSavings = member.toObject();
    memberWithSavings.total_savings = totalSavings;
    memberWithSavings.interest_paid = totalInterestPaid;
    memberWithSavings.capital_remaining = totalCapitalRemaining;

    res.status(200).json({
      status: 'success',
      data: { member: memberWithSavings }
    });
  } catch (error) {
    next(error);
  }
};

// Créer un nouveau membre
exports.createMember = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      fullName,
      phone,
      email,
      address,
      profileImage
    } = req.body;

    // Vérifier si l'email existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'Cet email est déjà utilisé'
      });
    }

    // Générer un mot de passe temporaire
    const password = Math.random().toString(36).slice(-8);

    // Créer un nouvel utilisateur
    const newUser = await User.create({
      email,
      password,
      role: 'member',
      fullName,
      profile_image: profileImage || undefined
    });

    // Créer un nouveau membre
    const newMember = await Member.create({
      userId: newUser._id,
      fullName,
      phone,
      email,
      address,
      profileImage: profileImage || undefined
    });

    // Mettre à jour l'utilisateur avec l'ID du membre
    await User.findByIdAndUpdate(newUser._id, { memberId: newMember._id });

    // --- EMISSION SOCKET.IO POUR NOUVEAU MEMBRE ---
    const io = req.app.get('io');
    if (io && io.sendToRole) {
      const eventData = {
        member: newMember
      };
      
      // Notifier tous les admins du nouveau membre
      io.sendToRole('admin', 'member:created', eventData);
      console.log(`📤 Événement 'member:created' envoyé à tous les admins`);
    }
    // --- FIN EMISSION SOCKET.IO ---

    // Envoi des identifiants par email
    try {
      await sendCredentialsEmail(email, email, password);
    } catch (mailErr) {
      console.error('Erreur lors de l\'envoi de l\'email :', mailErr);
    }

    // Envoi des identifiants par WhatsApp
    try {
      await sendWhatsAppCredentials(phone, email, password);
      console.log(`✅ Identifiants WhatsApp envoyés avec succès à ${phone}`);
    } catch (err) {
      console.error("❌ Erreur lors de l'envoi WhatsApp :", err.message);
      // On continue même si l'envoi WhatsApp échoue
    }

    res.status(201).json({
      status: 'success',
      data: {
        member: newMember,
        temporaryPassword: password
      }
    });
  } catch (error) {
    console.error("Erreur lors de la création du membre :", error);
    next(error);
  }
};

// Mettre à jour un membre
exports.updateMember = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      fullName,
      phone,
      email,
      address,
      dateOfBirth,
      occupation,
      profileImage,
      isActive
    } = req.body;

    const member = await Member.findByIdAndUpdate(
      req.params.id,
      {
        fullName,
        phone,
        email,
        address,
        dateOfBirth,
        occupation,
        profileImage,
        isActive
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!member) {
      return res.status(404).json({
        status: 'error',
        message: 'Membre non trouvé'
      });
    }

    // --- EMISSION SOCKET.IO POUR MISE À JOUR MEMBRE ---
    const io = req.app.get('io');
    if (io && io.sendToRole && io.sendToMember) {
      const eventData = {
        member
      };

      // Notifier tous les admins
      io.sendToRole('admin', 'member:updated', eventData);
      console.log(`📤 Événement 'member:updated' envoyé à tous les admins`);
      
      // Notifier le membre concerné de sa propre mise à jour
      io.sendToMember(req.params.id, 'member:profile:updated', eventData);
      console.log(`📤 Événement 'member:profile:updated' envoyé au membre ${req.params.id}`);
    }
    // --- FIN EMISSION SOCKET.IO ---

    res.status(200).json({
      status: 'success',
      data: {
        member
      }
    });
  } catch (error) {
    next(error);
  }
};

// Supprimer un membre
exports.deleteMember = async (req, res, next) => {
  try {
    const member = await Member.findById(req.params.id);
    
    if (!member) {
      return res.status(404).json({
        status: 'error',
        message: 'Membre non trouvé'
      });
    }

    // --- EMISSION SOCKET.IO POUR SUPPRESSION MEMBRE ---
    const io = req.app.get('io');
    if (io && io.sendToRole && io.sendToMember) {
      const eventData = {
        memberId: req.params.id,
        member: {
          _id: member._id,
          fullName: member.fullName,
          email: member.email
        }
      };

      // Notifier tous les admins
      io.sendToRole('admin', 'member:deleted', eventData);
      console.log(`📤 Événement 'member:deleted' envoyé à tous les admins`);
      
      // Notifier le membre qu'il va être supprimé (pour le déconnecter proprement)
      io.sendToMember(req.params.id, 'member:account:deleted', eventData);
      console.log(`📤 Événement 'member:account:deleted' envoyé au membre ${req.params.id}`);
    }
    // --- FIN EMISSION SOCKET.IO ---

    // Supprimer l'utilisateur associé
    if (member.userId) {
      await User.findByIdAndDelete(member.userId);
    }

    // Supprimer le membre
    await Member.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Membre supprimé avec succès'
    });
  } catch (error) {
    next(error);
  }
};

// Obtenir un résumé des activités d'un membre
exports.getMemberSummary = async (req, res, next) => {
  try {
    const member = await Member.findById(req.params.id)
      .populate('contributions')
      .populate('loans');
    
    if (!member) {
      return res.status(404).json({
        status: 'error',
        message: 'Membre non trouvé'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        member,
        contributionsCount: member.contributions ? member.contributions.length : 0,
        loansCount: member.loans ? member.loans.length : 0
      }
    });
  } catch (error) {
    next(error);
  }
};

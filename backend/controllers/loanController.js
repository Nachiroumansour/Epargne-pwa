const { validationResult } = require('express-validator');
const Loan = require('../models/Loan');
const Member = require('../models/Member');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Contribution = require('../models/Contribution');

// Obtenir tous les prêts (avec pagination)
exports.getAllLoans = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = Loan.find()
      .populate('memberId', 'firstName lastName')
      .populate('approvedBy', 'email')
      .populate('guarantors.memberId', 'firstName lastName')
      .sort({ applicationDate: -1 })
      .skip(skip)
      .limit(limit);
    
    // Ajouter des filtres si nécessaire
    if (req.query.status) {
      query.where('status').equals(req.query.status);
    }
    
    if (req.query.startDate && req.query.endDate) {
      query.where('applicationDate').gte(new Date(req.query.startDate)).lte(new Date(req.query.endDate));
    }

    const loans = await query;
    const total = await Loan.countDocuments(query.getFilter());

    res.status(200).json({
      status: 'success',
      results: loans.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      },
      data: {
        loans
      }
    });
  } catch (error) {
    next(error);
  }
};

// Obtenir un prêt par son ID
exports.getLoanById = async (req, res, next) => {
  try {
    const loan = await Loan.findById(req.params.id)
      .populate('memberId', 'firstName lastName')
      .populate('approvedBy', 'email')
      .populate('guarantors.memberId', 'firstName lastName');
    
    if (!loan) {
      return res.status(404).json({
        status: 'error',
        message: 'Prêt non trouvé'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        loan
      }
    });
  } catch (error) {
    next(error);
  }
};

// Obtenir les prêts d'un membre
exports.getMemberLoans = async (req, res, next) => {
  try {
    const memberId = req.params.id;
    
    // Vérifier si le membre existe
    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({
        status: 'error',
        message: 'Membre non trouvé'
      });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = Loan.find({ memberId })
      .populate('approvedBy', 'email')
      .populate('guarantors.memberId', 'firstName lastName')
      .sort({ applicationDate: -1 })
      .skip(skip)
      .limit(limit);
    
    // Ajouter des filtres si nécessaire
    if (req.query.status) {
      query.where('status').equals(req.query.status);
    }

    const loans = await query;
    const total = await Loan.countDocuments({ memberId, ...query.getFilter() });

    res.status(200).json({
      status: 'success',
      results: loans.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      },
      data: {
        loans
      }
    });
  } catch (error) {
    next(error);
  }
};

// Obtenir les prêts de l'utilisateur connecté (membre)
exports.getMyLoans = async (req, res, next) => {
  try {
    const member = await Member.findOne({ userId: req.user._id });

    // Si aucun profil de membre n'est trouvé, renvoyer une liste vide
    // au lieu d'une erreur. C'est plus robuste côté client.
    if (!member) {
      return res.status(200).json({
        status: 'success',
        results: 0,
        data: { loans: [] }
      });
    }

    // 2. Récupérer les prêts de ce membre
    const loans = await Loan.find({ memberId: member._id })
      .sort({ applicationDate: -1 });

    res.status(200).json({
      status: 'success',
      results: loans.length,
      data: {
        loans
      }
    });
  } catch (error) {
    next(error);
  }
};

// Créer un nouveau prêt
exports.createLoan = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // --- LOGIQUE ADMIN/MEMBRE ROBUSTE ---
    let member;
    if (req.user.role && req.user.role.toLowerCase() === 'admin') {
      if (!req.body.memberId) {
        return res.status(400).json({
          status: 'error',
          message: "L'admin doit fournir un memberId pour créer un crédit pour un membre."
        });
      }
      member = await Member.findById(req.body.memberId);
      if (!member) {
        return res.status(404).json({
          status: 'error',
          message: 'Membre non trouvé pour l\'ID fourni.'
        });
      }
    } else {
      // Cas membre classique
      member = await Member.findOne({ userId: req.user._id });
      if (!member) {
        return res.status(404).json({
          status: 'error',
          message: 'Profil de membre non trouvé pour cet utilisateur.'
        });
      }
    }

    let { 
      amount, 
      interestRate, 
      term, 
      purpose, 
      guarantors,
      documents,
      notes 
    } = req.body;

    // Appliquer un taux d'intérêt par défaut si non fourni
    if (interestRate === undefined || interestRate === null) {
      interestRate = 10;
    }

    // Vérifier si les garants existent
    if (guarantors && guarantors.length > 0) {
      const guarantorIds = guarantors.map(g => g.memberId);
      const foundGuarantors = await Member.find({ _id: { $in: guarantorIds } });
      
      if (foundGuarantors.length !== guarantorIds.length) {
        return res.status(404).json({
          status: 'error',
          message: 'Un ou plusieurs garants non trouvés'
        });
      }
    }

    // Créer un nouveau prêt
    const newLoan = await Loan.create({
      memberId: member._id, // Utiliser l'ID du membre trouvé
      amount,
      interestRate,
      term,
      purpose,
      applicationDate: Date.now(),
      guarantors: guarantors || [],
      documents: documents || [],
      notes,
      status: 'pending'
    });

    // --- EMISSION SOCKET.IO ---
    const io = req.app.get('io');
    if (io && io.sendToRole) {
      const eventData = {
        loan: newLoan,
        member: {
          _id: member._id,
          fullName: member.fullName,
          email: member.email
        }
      };

      // Notifier tous les admins d'une nouvelle demande de crédit
      io.sendToRole('admin', 'loan:new', eventData);
      console.log(`📤 Événement 'loan:new' envoyé à tous les admins`);
    }
    // --- FIN EMISSION SOCKET.IO ---

    // Notifier tous les admins
    const admins = await User.find({ role: /admin/i });
    const notifPromises = admins.map(admin => Notification.create({
      userId: admin._id,
      type: 'credit_request',
      message: `Nouvelle demande de crédit de ${member.fullName || member.email}`,
      data: { loanId: newLoan._id, memberId: member._id }
    }));
    await Promise.all(notifPromises);

    res.status(201).json({
      status: 'success',
      data: {
        loan: newLoan
      }
    });
  } catch (error) {
    next(error);
  }
};

// Mettre à jour un prêt
exports.updateLoan = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      amount, 
      interestRate, 
      term, 
      purpose, 
      guarantors,
      documents,
      notes 
    } = req.body;

    // Vérifier si le prêt existe et n'est pas déjà approuvé ou déboursé
    const existingLoan = await Loan.findById(req.params.id);
    if (!existingLoan) {
      return res.status(404).json({
        status: 'error',
        message: 'Prêt non trouvé'
      });
    }

    if (['approved', 'disbursed', 'repaid', 'defaulted'].includes(existingLoan.status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Ce prêt ne peut plus être modifié dans son état actuel'
      });
    }

    // Vérifier si les garants existent
    if (guarantors && guarantors.length > 0) {
      const guarantorIds = guarantors.map(g => g.memberId);
      const foundGuarantors = await Member.find({ _id: { $in: guarantorIds } });
      
      if (foundGuarantors.length !== guarantorIds.length) {
        return res.status(404).json({
          status: 'error',
          message: 'Un ou plusieurs garants non trouvés'
        });
      }
    }

    const loan = await Loan.findByIdAndUpdate(
      req.params.id,
      {
        amount,
        interestRate,
        term,
        purpose,
        guarantors,
        documents,
        notes
      },
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      status: 'success',
      data: {
        loan
      }
    });
  } catch (error) {
    next(error);
  }
};

// Mettre à jour le statut d'un prêt
exports.updateLoanStatus = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status } = req.body;

    // Vérifier si le statut est valide
    const validStatuses = ['pending', 'approved', 'rejected', 'disbursed', 'repaid', 'defaulted'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Statut invalide'
      });
    }

    // Vérifier si le prêt existe
    const existingLoan = await Loan.findById(req.params.id);
    if (!existingLoan) {
      return res.status(404).json({
        status: 'error',
        message: 'Prêt non trouvé'
      });
    }

    // Mettre à jour les dates en fonction du statut
    const updateData = { status };
    
    if (status === 'approved') {
      updateData.approvalDate = Date.now();
      updateData.approvedBy = req.user.id;
    } else if (status === 'disbursed') {
      updateData.disbursementDate = Date.now();
      
      // Calculer la date d'échéance (terme en mois)
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + existingLoan.term);
      updateData.dueDate = dueDate;
    }

    const loan = await Loan.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).populate('memberId', 'fullName email');

    // --- EMISSION SOCKET.IO POUR CHANGEMENT DE STATUT ---
    const io = req.app.get('io');
    if (io && io.sendToRole && io.sendToMember) {
      const eventData = {
        loan,
        member: {
          _id: loan.memberId._id,
          fullName: loan.memberId.fullName,
          email: loan.memberId.email
        },
        oldStatus: existingLoan.status,
        newStatus: status
      };

      // Notifier tous les admins
      io.sendToRole('admin', 'loan:status:changed', eventData);
      console.log(`📤 Événement 'loan:status:changed' envoyé à tous les admins`);

      // Notifier le membre concerné
      io.sendToMember(loan.memberId._id, 'loan:status:changed', eventData);
      console.log(`📤 Événement 'loan:status:changed' envoyé au membre ${loan.memberId._id}`);
    }
    // --- FIN EMISSION SOCKET.IO ---

    res.status(200).json({
      status: 'success',
      data: {
        loan
      }
    });
  } catch (error) {
    next(error);
  }
};

// Ajouter un remboursement à un prêt
exports.addRepayment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, date, paymentMethod, receiptNumber, notes } = req.body;
    const loan = await Loan.findById(req.params.id);

    if (!loan) {
      return res.status(404).json({ status: 'error', message: 'Prêt non trouvé' });
    }

    if (!['approved', 'disbursed', 'defaulted'].includes(loan.status)) {
      return res.status(400).json({
        status: 'error',
        message: `Ce prêt ne peut pas être remboursé car son statut est "${loan.status}"`,
      });
    }

    // --- LOGIQUE DE REMBOURSEMENT & ÉPARGNE D'INTÉRÊTS ---

    // 1. Calculer l'état AVANT le remboursement
    const totalRepaidBefore = loan.totalRepaid;
    const capital = loan.amount;

    // 2. Ajouter le nouveau remboursement
    const newRepayment = {
      amount: Number(amount),
      date: date || Date.now(),
      paymentMethod: paymentMethod || 'cash',
      receiptNumber,
      notes,
    };
    loan.repayments.push(newRepayment);
    
    // 3. Calculer l'état APRÈS le remboursement
    // Le virtual `loan.totalRepaid` se met à jour automatiquement
    const totalRepaidAfter = loan.totalRepaid;

    // 4. Déterminer quelle part des intérêts a été payée dans CETTE transaction
    const interestPaidPortionBefore = Math.max(0, totalRepaidBefore - capital);
    const interestPaidPortionAfter = Math.max(0, totalRepaidAfter - capital);
    const interestPaidInThisTransaction = interestPaidPortionAfter - interestPaidPortionBefore;

    // 5. Si des intérêts ont été payés, les convertir en épargne
    if (interestPaidInThisTransaction > 0) {
      await Contribution.create({
        memberId: loan.memberId,
        amount: interestPaidInThisTransaction,
        type: 'savings',
        paymentMethod: 'transfer', // Indique un virement interne
        notes: `Conversion des intérêts payés pour le prêt ID: ${loan._id} en épargne.`,
        createdBy: req.user.id,
        date: newRepayment.date,
      });
    }
    
    // 6. Si le prêt est maintenant entièrement soldé, mettre à jour son statut de façon permanente
    if (loan.remainingBalance <= 0 && loan.status !== 'repaid') {
      loan.status = 'repaid';
    }

    await loan.save();

    // --- EMISSION SOCKET.IO ---
    const io = req.app.get('io');
    if (io && io.sendToRole && io.sendToMember) {
      const eventData = {
        loan,
        newRepayment,
        interestPaidInThisTransaction
      };

      // Notifier tous les admins
      io.sendToRole('admin', 'loan:repaid', eventData);
      console.log(`📤 Événement 'loan:repaid' envoyé à tous les admins`);

      // Notifier le membre concerné
      io.sendToMember(loan.memberId, 'loan:repaid', eventData);
      console.log(`📤 Événement 'loan:repaid' envoyé au membre ${loan.memberId}`);
    }
    // --- FIN EMISSION SOCKET.IO ---

    res.status(200).json({
      status: 'success',
      data: { loan, newRepayment },
    });
  } catch (error) {
    next(error);
  }
};

// Supprimer un prêt
exports.deleteLoan = async (req, res, next) => {
  try {
    const loan = await Loan.findById(req.params.id);
    
    if (!loan) {
      return res.status(404).json({
        status: 'error',
        message: 'Prêt non trouvé'
      });
    }

    // Vérifier si le prêt peut être supprimé (seulement si en attente ou rejeté)
    if (!['pending', 'rejected'].includes(loan.status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Ce prêt ne peut pas être supprimé dans son état actuel'
      });
    }

    await Loan.findByIdAndDelete(req.params.id);

    // --- EMISSION SOCKET.IO ---
    const io = req.app.get('io');
    if (io && io.sendToRole && io.sendToMember) {
      const eventData = {
        loanId: req.params.id,
        loan: {
          _id: loan._id,
          amount: loan.amount,
          purpose: loan.purpose,
          status: loan.status
        },
        member: {
          _id: loan.memberId,
          // On pourrait populate si nécessaire
        }
      };

      // Notifier tous les admins
      io.sendToRole('admin', 'loan:deleted', eventData);
      console.log(`📤 Événement 'loan:deleted' envoyé à tous les admins`);

      // Notifier le membre concerné
      io.sendToMember(loan.memberId, 'loan:deleted', eventData);
      console.log(`📤 Événement 'loan:deleted' envoyé au membre ${loan.memberId}`);
    }
    // --- FIN EMISSION SOCKET.IO ---

    res.status(200).json({
      status: 'success',
      message: 'Prêt supprimé avec succès'
    });
  } catch (error) {
    next(error);
  }
};

// Ajoute une route d'approbation de crédit par l'admin
exports.approveLoan = async (req, res, next) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) {
      return res.status(404).json({ status: 'error', message: 'Prêt non trouvé' });
    }
    loan.status = 'approved';
    loan.approvalDate = Date.now();
    loan.approvedBy = req.user._id;
    await loan.save();

    // Notifier le membre
    const member = await Member.findById(loan.memberId);
    const user = await User.findOne({ memberId: member._id });
    if (user) {
      await Notification.create({
        userId: user._id,
        type: 'credit_approved',
        message: 'Votre demande de crédit a été approuvée.',
        data: { loanId: loan._id }
      });
    }

    // --- EMISSION SOCKET.IO ---
    const io = req.app.get('io');
    if (io && io.sendToRole && io.sendToMember) {
      const eventData = {
        loan,
        member: {
          _id: member._id,
          fullName: member.fullName,
          email: member.email
        }
      };

      // Notifier tous les admins
      io.sendToRole('admin', 'loan:approved', eventData);
      console.log(`📤 Événement 'loan:approved' envoyé à tous les admins`);

      // Notifier le membre concerné
      io.sendToMember(member._id, 'loan:approved', eventData);
      console.log(`📤 Événement 'loan:approved' envoyé au membre ${member._id}`);
    }
    // --- FIN EMISSION SOCKET.IO ---

    res.status(200).json({
      status: 'success',
      message: 'Crédit approuvé',
      data: { loan }
    });
  } catch (error) {
    next(error);
  }
};

// Reject a loan
exports.rejectLoan = async (req, res, next) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) {
      return res.status(404).json({ status: 'error', message: 'Prêt non trouvé' });
    }
    loan.status = 'rejected';
    loan.approvalDate = Date.now();
    loan.approvedBy = req.user._id;
    await loan.save();

    // Notifier le membre
    const member = await Member.findById(loan.memberId);
    const user = await User.findOne({ memberId: member._id });
    if (user) {
      await Notification.create({
        userId: user._id,
        type: 'credit_rejected',
        message: 'Votre demande de crédit a été refusée.',
        data: { loanId: loan._id }
      });
    }

    // --- EMISSION SOCKET.IO ---
    const io = req.app.get('io');
    if (io && io.sendToRole && io.sendToMember) {
      const eventData = {
        loan,
        member: {
          _id: member._id,
          fullName: member.fullName,
          email: member.email
        }
      };

      // Notifier tous les admins
      io.sendToRole('admin', 'loan:rejected', eventData);
      console.log(`📤 Événement 'loan:rejected' envoyé à tous les admins`);

      // Notifier le membre concerné
      io.sendToMember(member._id, 'loan:rejected', eventData);
      console.log(`📤 Événement 'loan:rejected' envoyé au membre ${member._id}`);
    }
    // --- FIN EMISSION SOCKET.IO ---

    res.status(200).json({
      status: 'success',
      message: 'Crédit refusé',
      data: { loan }
    });
  } catch (error) {
    next(error);
  }
};

const { validationResult } = require('express-validator');
const Contribution = require('../models/Contribution');
const Member = require('../models/Member');

// Obtenir toutes les contributions (avec pagination)
exports.getAllContributions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = Contribution.find()
      .populate('memberId', 'fullName')
      .populate('createdBy', 'email')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);
    
    // Ajouter des filtres si nécessaire
    if (req.query.type) {
      query.where('type').equals(req.query.type);
    }
    
    if (req.query.startDate && req.query.endDate) {
      query.where('date').gte(new Date(req.query.startDate)).lte(new Date(req.query.endDate));
    }

    const contributions = await query;
    const total = await Contribution.countDocuments(query.getFilter());

    res.status(200).json({
      status: 'success',
      results: contributions.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      },
      data: {
        contributions
      }
    });
  } catch (error) {
    next(error);
  }
};

// Obtenir une contribution par son ID
exports.getContributionById = async (req, res, next) => {
  try {
    const contribution = await Contribution.findById(req.params.id)
      .populate('memberId', 'fullName')
      .populate('createdBy', 'email');
    
    if (!contribution) {
      return res.status(404).json({
        status: 'error',
        message: 'Contribution non trouvée'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        contribution
      }
    });
  } catch (error) {
    next(error);
  }
};

// Obtenir les contributions d'un membre
exports.getMemberContributions = async (req, res, next) => {
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

    const query = Contribution.find({ memberId })
      .populate('createdBy', 'email')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);
    
    // Ajouter des filtres si nécessaire
    if (req.query.type) {
      query.where('type').equals(req.query.type);
    }
    
    if (req.query.startDate && req.query.endDate) {
      query.where('date').gte(new Date(req.query.startDate)).lte(new Date(req.query.endDate));
    }

    const contributions = await query;
    const total = await Contribution.countDocuments({ memberId, ...query.getFilter() });

    res.status(200).json({
      status: 'success',
      results: contributions.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      },
      data: {
        contributions
      }
    });
  } catch (error) {
    next(error);
  }
};

// Obtenir les contributions de l'utilisateur connecté (membre)
exports.getMyContributions = async (req, res, next) => {
  try {
    const member = await Member.findOne({ userId: req.user._id });
    if (!member) {
      // Renvoie une liste vide si le membre n'est pas trouvé, pour la robustesse
      return res.status(200).json({
        status: 'success',
        results: 0,
        data: { contributions: [] }
      });
    }
    const contributions = await Contribution.find({ memberId: member._id })
      .sort({ date: -1 });
    res.status(200).json({
      status: 'success',
      results: contributions.length,
      data: { contributions }
    });
  } catch (error) {
    next(error);
  }
};

// Créer une nouvelle contribution
exports.createContribution = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      memberId, 
      amount, 
      date, 
      type, 
      paymentMethod, 
      receiptNumber, 
      notes 
    } = req.body;

    // Vérifier si le membre existe
    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({
        status: 'error',
        message: 'Membre non trouvé'
      });
    }

    // Créer une nouvelle contribution
    const newContribution = await Contribution.create({
      memberId,
      amount,
      date: date || Date.now(),
      type: type || 'savings',
      paymentMethod: paymentMethod || 'cash',
      receiptNumber,
      notes,
      createdBy: req.user.id
    });

    // --- EMISSION SOCKET.IO POUR TEMPS RÉEL ---
    const io = req.app.get('io');
    if (io && io.sendToRole && io.sendToMember) {
      const eventData = {
        contribution: newContribution,
        member: {
          _id: member._id,
          fullName: member.fullName,
          email: member.email
        }
      };

      // Émettre à tous les admins
      io.sendToRole('admin', 'contribution:created', eventData);
      console.log(`📤 Événement 'contribution:created' envoyé à tous les admins`);

      // Émettre spécifiquement au membre concerné (si connecté)
      io.sendToMember(memberId, 'contribution:created', eventData);
      console.log(`📤 Événement 'contribution:created' envoyé au membre ${memberId}`);
    }
    // --- FIN EMISSION SOCKET.IO ---

    res.status(201).json({
      status: 'success',
      data: {
        contribution: newContribution
      }
    });
  } catch (error) {
    next(error);
  }
};

// Créer plusieurs contributions en masse
exports.createBulkContributions = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { contributions } = req.body;

    if (!Array.isArray(contributions) || contributions.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Aucune contribution à créer'
      });
    }

    // Vérifier si tous les membres existent
    const memberIds = [...new Set(contributions.map(c => c.memberId))];
    const members = await Member.find({ _id: { $in: memberIds } });
    
    if (members.length !== memberIds.length) {
      return res.status(404).json({
        status: 'error',
        message: 'Un ou plusieurs membres non trouvés'
      });
    }

    // Préparer les contributions avec l'ID de l'utilisateur créateur
    const contributionsToCreate = contributions.map(c => ({
      ...c,
      date: c.date || Date.now(),
      type: c.type || 'savings',
      paymentMethod: c.paymentMethod || 'cash',
      createdBy: req.user.id
    }));

    // Créer les contributions en masse
    const createdContributions = await Contribution.insertMany(contributionsToCreate);

    // --- EMISSION SOCKET.IO POUR CONTRIBUTIONS EN MASSE ---
    const io = req.app.get('io');
    if (io && io.sendToRole && io.sendToMember) {
      const eventData = {
        contributions: createdContributions,
        count: createdContributions.length
      };

      // Émettre à tous les admins
      io.sendToRole('admin', 'contributions:bulk:created', eventData);
      console.log(`📤 Événement 'contributions:bulk:created' envoyé à tous les admins`);

      // Émettre aux membres concernés avec leurs cotisations spécifiques
      const uniqueMemberIds = [...new Set(createdContributions.map(c => c.memberId))];
      uniqueMemberIds.forEach(memberId => {
        const memberContributions = createdContributions.filter(c => c.memberId.toString() === memberId.toString());
        const memberEventData = {
          contributions: memberContributions,
          count: memberContributions.length
        };
        io.sendToMember(memberId, 'contributions:bulk:created', memberEventData);
        console.log(`📤 Événement 'contributions:bulk:created' envoyé au membre ${memberId}`);
      });
    }
    // --- FIN EMISSION SOCKET.IO ---

    res.status(201).json({
      status: 'success',
      results: createdContributions.length,
      data: {
        contributions: createdContributions
      }
    });
  } catch (error) {
    next(error);
  }
};

// Mettre à jour une contribution
exports.updateContribution = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      amount, 
      date, 
      type, 
      paymentMethod, 
      receiptNumber, 
      notes 
    } = req.body;

    const contribution = await Contribution.findByIdAndUpdate(
      req.params.id,
      {
        amount,
        date,
        type,
        paymentMethod,
        receiptNumber,
        notes
      },
      {
        new: true,
        runValidators: true
      }
    ).populate('memberId', 'fullName email');

    if (!contribution) {
      return res.status(404).json({
        status: 'error',
        message: 'Contribution non trouvée'
      });
    }

    // --- EMISSION SOCKET.IO POUR MISE À JOUR COTISATION ---
    const io = req.app.get('io');
    if (io && io.sendToRole && io.sendToMember) {
      const eventData = {
        contribution,
        member: {
          _id: contribution.memberId._id,
          fullName: contribution.memberId.fullName,
          email: contribution.memberId.email
        }
      };

      // Notifier tous les admins
      io.sendToRole('admin', 'contribution:updated', eventData);
      console.log(`📤 Événement 'contribution:updated' envoyé à tous les admins`);

      // Notifier le membre concerné
      io.sendToMember(contribution.memberId._id, 'contribution:updated', eventData);
      console.log(`📤 Événement 'contribution:updated' envoyé au membre ${contribution.memberId._id}`);
    }
    // --- FIN EMISSION SOCKET.IO ---

    res.status(200).json({
      status: 'success',
      data: {
        contribution
      }
    });
  } catch (error) {
    next(error);
  }
};

// Supprimer une contribution
exports.deleteContribution = async (req, res, next) => {
  try {
    const contribution = await Contribution.findById(req.params.id).populate('memberId', 'fullName email');
    
    if (!contribution) {
      return res.status(404).json({
        status: 'error',
        message: 'Contribution non trouvée'
      });
    }

    // --- EMISSION SOCKET.IO POUR SUPPRESSION COTISATION ---
    const io = req.app.get('io');
    if (io && io.sendToRole && io.sendToMember) {
      const eventData = {
        contributionId: req.params.id,
        contribution,
        member: {
          _id: contribution.memberId._id,
          fullName: contribution.memberId.fullName,
          email: contribution.memberId.email
        }
      };

      // Notifier tous les admins
      io.sendToRole('admin', 'contribution:deleted', eventData);
      console.log(`📤 Événement 'contribution:deleted' envoyé à tous les admins`);

      // Notifier le membre concerné
      io.sendToMember(contribution.memberId._id, 'contribution:deleted', eventData);
      console.log(`📤 Événement 'contribution:deleted' envoyé au membre ${contribution.memberId._id}`);
    }
    // --- FIN EMISSION SOCKET.IO ---

    await Contribution.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Contribution supprimée avec succès'
    });
  } catch (error) {
    next(error);
  }
};

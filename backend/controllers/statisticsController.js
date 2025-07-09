const Contribution = require('../models/Contribution');
const Loan = require('../models/Loan');
const Member = require('../models/Member');

// Obtenir les statistiques pour l'administrateur
exports.getAdminStats = async (req, res, next) => {
  try {
    // Statistiques des membres
    const totalMembers = await Member.countDocuments();
    const activeMembers = await Member.countDocuments({ status: 'active' });
    const inactiveMembers = await Member.countDocuments({ status: 'inactive' });
    const suspendedMembers = await Member.countDocuments({ status: 'suspended' });
    
    // Statistiques des contributions
    const totalContributions = await Contribution.countDocuments();
    const totalContributionAmount = await Contribution.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    // Statistiques par type de contribution
    const contributionsByType = await Contribution.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 }, total: { $sum: '$amount' } } }
    ]);
    
    // Statistiques des prêts
    const totalLoans = await Loan.countDocuments();
    const pendingLoans = await Loan.countDocuments({ status: 'pending' });
    const approvedLoans = await Loan.countDocuments({ status: 'approved' });
    const disbursedLoans = await Loan.countDocuments({ status: 'disbursed' });
    const repaidLoans = await Loan.countDocuments({ status: 'repaid' });
    const defaultedLoans = await Loan.countDocuments({ status: 'defaulted' });
    
    // Montant total des prêts
    const totalLoanAmount = await Loan.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    // Montant total des remboursements
    const totalRepayments = await Loan.aggregate([
      { $unwind: '$repayments' },
      { $group: { _id: null, total: { $sum: '$repayments.amount' } } }
    ]);
    
    // Tendances mensuelles (contributions et prêts des 6 derniers mois)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyContributions = await Contribution.aggregate([
      { $match: { date: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { 
            year: { $year: '$date' }, 
            month: { $month: '$date' } 
          },
          count: { $sum: 1 },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    const monthlyLoans = await Loan.aggregate([
      { $match: { applicationDate: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { 
            year: { $year: '$applicationDate' }, 
            month: { $month: '$applicationDate' } 
          },
          count: { $sum: 1 },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        members: {
          total: totalMembers,
          active: activeMembers,
          inactive: inactiveMembers,
          suspended: suspendedMembers
        },
        contributions: {
          total: totalContributions,
          amount: totalContributionAmount.length > 0 ? totalContributionAmount[0].total : 0,
          byType: contributionsByType
        },
        loans: {
          total: totalLoans,
          pending: pendingLoans,
          approved: approvedLoans,
          disbursed: disbursedLoans,
          repaid: repaidLoans,
          defaulted: defaultedLoans,
          amount: totalLoanAmount.length > 0 ? totalLoanAmount[0].total : 0,
          repayments: totalRepayments.length > 0 ? totalRepayments[0].total : 0
        },
        trends: {
          monthlyContributions,
          monthlyLoans
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Obtenir les statistiques pour un membre spécifique
exports.getMemberStats = async (req, res, next) => {
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
    
    // Statistiques des contributions
    const totalContributions = await Contribution.countDocuments({ memberId });
    const totalContributionAmount = await Contribution.aggregate([
      { $match: { memberId: member._id } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    // Statistiques par type de contribution
    const contributionsByType = await Contribution.aggregate([
      { $match: { memberId: member._id } },
      { $group: { _id: '$type', count: { $sum: 1 }, total: { $sum: '$amount' } } }
    ]);
    
    // Statistiques des prêts
    const totalLoans = await Loan.countDocuments({ memberId });
    const activeLoans = await Loan.countDocuments({ 
      memberId, 
      status: { $in: ['approved', 'disbursed'] } 
    });
    const repaidLoans = await Loan.countDocuments({ memberId, status: 'repaid' });
    const defaultedLoans = await Loan.countDocuments({ memberId, status: 'defaulted' });
    
    // Montant total des prêts
    const totalLoanAmount = await Loan.aggregate([
      { $match: { memberId: member._id } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    // Montant total des remboursements
    const totalRepayments = await Loan.aggregate([
      { $match: { memberId: member._id } },
      { $unwind: '$repayments' },
      { $group: { _id: null, total: { $sum: '$repayments.amount' } } }
    ]);
    
    // Tendances mensuelles (contributions des 6 derniers mois)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyContributions = await Contribution.aggregate([
      { $match: { memberId: member._id, date: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { 
            year: { $year: '$date' }, 
            month: { $month: '$date' } 
          },
          count: { $sum: 1 },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        member: {
          id: member._id,
          name: `${member.firstName} ${member.lastName}`,
          status: member.status,
          joinDate: member.joinDate
        },
        contributions: {
          total: totalContributions,
          amount: totalContributionAmount.length > 0 ? totalContributionAmount[0].total : 0,
          byType: contributionsByType
        },
        loans: {
          total: totalLoans,
          active: activeLoans,
          repaid: repaidLoans,
          defaulted: defaultedLoans,
          amount: totalLoanAmount.length > 0 ? totalLoanAmount[0].total : 0,
          repayments: totalRepayments.length > 0 ? totalRepayments[0].total : 0
        },
        trends: {
          monthlyContributions
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Rapport d'accompte des cotisations par membre
exports.getAccompteReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    // 1. Définir le filtre de base pour les contributions
    const matchFilter = { type: 'savings' }; // On ne veut que les épargnes

    // 2. Ajouter le filtre de date s'il est fourni
    if (startDate || endDate) {
      matchFilter.date = {};
      if (startDate) matchFilter.date.$gte = new Date(startDate);
      if (endDate) matchFilter.date.$lte = new Date(endDate);
    }

    // 3. Agrégation pour calculer le total de l'épargne par membre
    const savingsReport = await Contribution.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$memberId',
          totalSavings: { $sum: '$amount' },
          savingsBreakdown: {
            $push: {
              date: '$date',
              amount: '$amount',
              notes: '$notes',
            },
          },
        },
      },
      {
        $lookup: {
          from: 'members', // la collection des membres
          localField: '_id',
          foreignField: '_id',
          as: 'memberInfo',
        },
      },
      { $unwind: '$memberInfo' },
      {
        $project: {
          _id: 1,
          memberName: '$memberInfo.fullName',
          joinDate: '$memberInfo.joinDate',
          totalSavings: 1,
          savingsBreakdown: 1,
        },
      },
      { $sort: { totalSavings: -1 } },
    ]);

    // 4. Calculer les totaux généraux pour le résumé
    const totalAmount = savingsReport.reduce((sum, member) => sum + member.totalSavings, 0);
    const totalMembers = savingsReport.length;
    const averageAmount = totalMembers > 0 ? totalAmount / totalMembers : 0;

    res.status(200).json({
      status: 'success',
      data: {
        summary: {
          totalAmount,
          totalMembers,
          averageAmount: Math.round(averageAmount),
          period: { startDate: startDate || null, endDate: endDate || null },
        },
        members: savingsReport,
      },
    });
  } catch (error) {
    next(error);
  }
};

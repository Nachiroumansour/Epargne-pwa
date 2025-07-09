const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: [true, 'L\'identifiant du membre est requis'],
    },
    amount: {
      type: Number,
      required: [true, 'Le montant est requis'],
      min: [0, 'Le montant ne peut pas être négatif'],
    },
    interestRate: {
      type: Number,
      required: [true, 'Le taux d\'intérêt est requis'],
      min: [0, 'Le taux d\'intérêt ne peut pas être négatif'],
    },
    term: {
      type: Number,
      required: [true, 'La durée du prêt est requise'],
      min: [1, 'La durée du prêt doit être d\'au moins 1 mois'],
      comment: 'Durée en mois',
    },
    purpose: {
      type: String,
      required: [true, 'L\'objet du prêt est requis'],
      trim: true,
    },
    applicationDate: {
      type: Date,
      default: Date.now,
    },
    approvalDate: {
      type: Date,
    },
    disbursementDate: {
      type: Date,
    },
    dueDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'disbursed', 'repaid', 'defaulted'],
      default: 'pending',
    },
    guarantors: [
      {
        memberId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Member',
        },
        approvalStatus: {
          type: String,
          enum: ['pending', 'approved', 'rejected'],
          default: 'pending',
        },
        approvalDate: {
          type: Date,
        },
      },
    ],
    repayments: [
      {
        amount: {
          type: Number,
          required: true,
        },
        date: {
          type: Date,
          default: Date.now,
        },
        paymentMethod: {
          type: String,
          enum: ['cash', 'transfer', 'mobile_money'],
          default: 'cash',
        },
        receiptNumber: {
          type: String,
        },
        notes: {
          type: String,
        },
      },
    ],
    documents: [
      {
        type: String,
      },
    ],
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --- VIRTUALS ---

// Montant total dû (capital + intérêts)
loanSchema.virtual('totalOwed').get(function () {
  return this.amount * (1 + this.interestRate / 100);
});

// Montant total déjà remboursé
loanSchema.virtual('totalRepaid').get(function () {
  if (!this.repayments || this.repayments.length === 0) {
    return 0;
  }
  return this.repayments.reduce((sum, repayment) => sum + repayment.amount, 0);
});

// Solde restant à payer, arrondi pour la précision
loanSchema.virtual('remainingBalance').get(function () {
  const balance = this.totalOwed - this.totalRepaid;
  // Arrondir à 2 décimales pour éviter les erreurs de calcul flottant, puis s'assurer que ce n'est pas négatif.
  return Math.max(0, Math.round(balance * 100) / 100);
});

// Statut effectif du prêt
loanSchema.virtual('effectiveStatus').get(function () {
  // Si le statut est déjà 'repaid' ou 'rejected' ou 'defaulted', on le garde.
  if (['repaid', 'rejected', 'defaulted'].includes(this.status)) {
    return this.status;
  }
  // Si le solde est à zéro (ou moins) et que le prêt a été déboursé, il est considéré comme remboursé.
  if (this.remainingBalance <= 0 && this.status !== 'pending') {
    return 'repaid';
  }
  // Sinon, on retourne le statut actuel.
  return this.status;
});

// Index pour améliorer les performances des requêtes
loanSchema.index({ memberId: 1, status: 1 });
loanSchema.index({ applicationDate: -1 });

const Loan = mongoose.model('Loan', loanSchema);

module.exports = Loan;

const mongoose = require('mongoose');

const contributionSchema = new mongoose.Schema(
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
    date: {
      type: Date,
      default: Date.now,
    },
    type: {
      type: String,
      enum: ['savings', 'shares', 'fees'],
      default: 'savings',
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'transfer', 'mobile_money'],
      default: 'cash',
    },
    receiptNumber: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Index pour améliorer les performances des requêtes
contributionSchema.index({ memberId: 1, date: -1 });

const Contribution = mongoose.model('Contribution', contributionSchema);

module.exports = Contribution;

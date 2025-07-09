const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: [true, 'Le nom complet est requis'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'L\'email est requis'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Le numéro de téléphone est requis'],
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'L\'adresse est requise'],
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      required: false,
    },
    gender: {
      type: String,
      enum: ['M', 'F'],
      required: false,
    },
    occupation: {
      type: String,
      required: false,
      trim: true,
    },
    profileImage: {
      type: String,
      default: 'https://via.placeholder.com/150',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    membershipDate: {
      type: Date,
      default: Date.now,
    },
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String,
    },
    documents: [{
      type: {
        type: String,
        enum: ['CNI', 'Passeport', 'Autre'],
        required: true,
      },
      number: String,
      issueDate: Date,
      expiryDate: Date,
      fileUrl: String,
    }],
    notes: String,
  },
  {
    timestamps: true,
  }
);

// Index pour la recherche
memberSchema.index({ fullName: 'text', email: 'text', phone: 'text' });

const Member = mongoose.model('Member', memberSchema);

module.exports = Member;

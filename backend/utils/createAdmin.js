require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function createAdmin() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'calebasse' });

  const email = 'mansour@gmail.com';
  const password = 'Admin123'; // choisis un mot de passe fort
  const fullName = 'Super Administrateur';

  // Vérifie si l'admin existe déjà
  const existing = await User.findOne({ email });
  if (existing) {
    console.log('Cet admin existe déjà.');
    process.exit(0);
  }

  // Crée l'admin (le hashage se fait automatiquement)
  const admin = await User.create({
    email,
    password,
    role: 'admin',
    fullName,
    isActive: true,
  });

  console.log('Nouvel admin créé :', admin.email);
  process.exit(0);
}

createAdmin();

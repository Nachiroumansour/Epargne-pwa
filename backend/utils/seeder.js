require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Member = require('../models/Member');

const adminUser = {
  email: 'admin@xalisse.com',
  password: 'Admin@123',
  role: 'admin',
  fullName: 'Administrateur Xalisse',
  profile_image: '', // ou une URL d'avatar par défaut
  isActive: true
};

const fakeMembers = [
  {
    fullName: 'Saido Mamadou',
    email: 'saido@example.com',
    phone: '770000000',
    address: 'Dakar',
    dateOfBirth: new Date('1990-01-01'),
    gender: 'M',
    occupation: 'Comptable',
    profileImage: 'https://via.placeholder.com/150',
    isActive: true,
    membershipDate: new Date('2023-01-10'),
    emergencyContact: { name: 'Aminata Diallo', phone: '771111111', relationship: 'Amie' },
    documents: [],
    notes: 'Membre fondateur',
  },
  {
    fullName: 'Aminata Diallo',
    email: 'aminata@example.com',
    phone: '771111111',
    address: 'Thiès',
    dateOfBirth: new Date('1992-05-12'),
    gender: 'F',
    occupation: 'Enseignante',
    profileImage: 'https://via.placeholder.com/150',
    isActive: true,
    membershipDate: new Date('2022-11-05'),
    emergencyContact: { name: 'Saido Mamadou', phone: '770000000', relationship: 'Ami' },
    documents: [],
    notes: '',
  },
];

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'calebasse'
    });
    console.log('MongoDB connecté avec succès');
  } catch (error) {
    console.error('Erreur de connexion à MongoDB:', error.message);
    process.exit(1);
  }
};

const createAdminUser = async () => {
  try {
    // Vérifier si l'admin existe déjà
    const existingAdmin = await User.findOne({ email: adminUser.email });
    if (existingAdmin) {
      console.log('L\'utilisateur admin existe déjà');
      return;
    }

    // Hasher le mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminUser.password, salt);

    // Créer l'admin avec le mot de passe hashé
    const admin = await User.create({
      ...adminUser,
      password: hashedPassword
    });

    console.log('Utilisateur admin créé avec succès:');
    console.log('Email:', admin.email);
    console.log('Mot de passe:', adminUser.password);
    console.log('Role:', admin.role);

  } catch (error) {
    console.error('Erreur lors de la création de l\'admin:', error.message);
  }
};

const createFakeMembers = async () => {
  for (const memberData of fakeMembers) {
    try {
      // Créer d'abord l'utilisateur
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Membre@123', salt);
      
      const user = await User.create({
        email: memberData.email,
        password: hashedPassword,
        role: 'member',
        fullName: memberData.fullName,
        isActive: true
      });

      // Créer ensuite le membre avec l'ID de l'utilisateur
      const member = await Member.create({
        ...memberData,
        userId: user._id // Ajouter l'ID de l'utilisateur
      });

      // Mettre à jour l'utilisateur avec l'ID du membre
      await User.findByIdAndUpdate(user._id, { memberId: member._id });

      console.log(`Membre créé: ${member.fullName}`);
    } catch (error) {
      console.error(`Erreur lors de la création du membre ${memberData.fullName}:`, error.message);
    }
  }
};

const cleanDB = async () => {
  await User.deleteMany({});
  await Member.deleteMany({});
  console.log('Base de données nettoyée');
};

const seedDB = async () => {
  try {
    await connectDB();
    await cleanDB();
    await createAdminUser();
    await createFakeMembers();
    console.log('Base de données initialisée avec succès');
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors de l\'initialisation:', error);
    process.exit(1);
  }
};

seedDB(); 
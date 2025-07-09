const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendCredentialsEmail(to, email, password) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: 'Vos identifiants de connexion',
    text: `Bonjour,\n\nVoici vos identifiants de connexion à la plateforme :\nEmail : ${email}\nMot de passe : ${password}\n\nMerci de changer votre mot de passe après la première connexion.`,
  };
  await transporter.sendMail(mailOptions);
}

module.exports = { sendCredentialsEmail }; 
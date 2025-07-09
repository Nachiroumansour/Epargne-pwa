const twilio = require('twilio');

// Configuration Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

// Vérifier la configuration Twilio
if (!accountSid || !authToken) {
  console.warn('⚠️  Configuration Twilio manquante. Les messages WhatsApp ne seront pas envoyés.');
}

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

// Fonction pour valider et formater le numéro de téléphone
function formatPhoneNumber(phoneNumber) {
  // Supprimer tous les espaces, tirets et parenthèses
  let cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
  
  // Si le numéro commence par 0, le remplacer par +221 (Sénégal)
  if (cleaned.startsWith('0')) {
    cleaned = '+221' + cleaned.substring(1);
  }
  
  // Si le numéro ne commence pas par +, ajouter +221
  if (!cleaned.startsWith('+')) {
    cleaned = '+221' + cleaned;
  }
  
  return cleaned;
}

async function sendWhatsAppCredentials(to, email, password) {
  // Vérifier si Twilio est configuré
  if (!client) {
    console.error('❌ Twilio non configuré. Impossible d\'envoyer le message WhatsApp.');
    throw new Error('Service WhatsApp non configuré');
  }

  try {
    // Formater le numéro de téléphone
    const formattedNumber = formatPhoneNumber(to);
    
    console.log(`📱 Envoi des identifiants WhatsApp à ${formattedNumber}...`);
    
    const message = await client.messages.create({
      from: fromNumber,
      to: `whatsapp:${formattedNumber}`,
      body: `🔐 Bienvenue sur Calebasse (EpargneCredit) !

Vos identifiants de connexion :
📧 Email : ${email}
🔑 Mot de passe : ${password}

⚠️ Veuillez changer votre mot de passe lors de votre première connexion.

Bonne épargne ! 💰`
    });

    console.log(`✅ Message WhatsApp envoyé avec succès. SID: ${message.sid}`);
    return message;
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi WhatsApp:', error);
    
    // Log plus détaillé selon le type d'erreur
    if (error.code === 21211) {
      console.error('❌ Numéro de téléphone invalide:', to);
    } else if (error.code === 63016) {
      console.error('❌ Numéro non autorisé dans Twilio Sandbox. Ajoutez le numéro dans votre sandbox Twilio.');
    } else if (error.code === 20003) {
      console.error('❌ Erreur d\'authentification Twilio. Vérifiez vos identifiants.');
    }
    
    throw error;
  }
}

// Fonction de test pour vérifier la configuration
async function testTwilioConfig() {
  if (!client) {
    return { success: false, message: 'Configuration Twilio manquante' };
  }
  
  try {
    // Tester la configuration en récupérant les informations du compte
    const account = await client.api.accounts(accountSid).fetch();
    return { 
      success: true, 
      message: `Configuration Twilio OK. Compte: ${account.friendlyName}` 
    };
  } catch (error) {
    return { 
      success: false, 
      message: `Erreur de configuration Twilio: ${error.message}` 
    };
  }
}

module.exports = { 
  sendWhatsAppCredentials, 
  testTwilioConfig,
  formatPhoneNumber 
};
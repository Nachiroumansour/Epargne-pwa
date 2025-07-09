// Middleware de gestion globale des erreurs
module.exports.errorHandler = (err, req, res, next) => {
  // Log complet de l'erreur
  console.error('--- ERREUR BACKEND ---');
  console.error('URL:', req.originalUrl);
  console.error('Méthode:', req.method);
  console.error('Body:', req.body);
  console.error('Erreur:', err);
  console.error('Stack:', err.stack);

  // Erreur de validation Mongoose
  if (err.name === 'ValidationError') {
    const errors = {};
    
    for (const field in err.errors) {
      errors[field] = err.errors[field].message;
    }
    
    return res.status(400).json({
      status: 'error',
      message: 'Erreur de validation',
      errors
    });
  }
  
  // Erreur de duplication MongoDB
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      status: 'error',
      message: `La valeur '${err.keyValue[field]}' pour le champ '${field}' existe déjà.`
    });
  }
  
  // Erreur de cast MongoDB (ID invalide)
  if (err.name === 'CastError') {
    return res.status(400).json({
      status: 'error',
      message: `Valeur invalide '${err.value}' pour le champ '${err.path}'.`
    });
  }
  
  // Erreur par défaut
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Une erreur est survenue sur le serveur.';
  
  res.status(statusCode).json({
    status: 'error',
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

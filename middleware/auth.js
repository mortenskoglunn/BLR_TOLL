const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Access token mangler',
      message: 'Du må være innlogget for å få tilgang til denne ressursen'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      console.log('Token verification error:', err.message);
      
      if (err.name === 'TokenExpiredError') {
        return res.status(403).json({ 
          error: 'Token utløpt',
          message: 'Din økt har utløpt. Vennligst logg inn på nytt.'
        });
      }
      
      if (err.name === 'JsonWebTokenError') {
        return res.status(403).json({ 
          error: 'Ugyldig token',
          message: 'Token er ugyldig. Vennligst logg inn på nytt.'
        });
      }
      
      return res.status(403).json({ 
        error: 'Token verifiseringsfeil',
        message: 'Kunne ikke verifisere token.'
      });
    }
    
    req.user = user;
    next();
  });
};

// Middleware for å sjekke brukerrolle
const requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Ikke autentisert',
        message: 'Du må være innlogget for å få tilgang'
      });
    }

    if (req.user.role !== requiredRole && req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Utilstrekkelige rettigheter',
        message: `Du trenger ${requiredRole}-rettigheter for å få tilgang til denne ressursen`
      });
    }

    next();
  };
};

// Middleware for å logge brukeraktivitet
const logActivity = (action) => {
  return (req, res, next) => {
    // Legg til aktivitetslogging senere
    req.activity = {
      action,
      timestamp: new Date(),
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    };
    next();
  };
};

module.exports = { 
  authenticateToken, 
  requireRole,
  logActivity
};
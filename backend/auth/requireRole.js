const { ForbiddenError } = require('../utils/errors');

/**
 * Middleware to require specific user roles
 * @param {...string} roles - Allowed roles for this route
 * @returns {Function} Express middleware function
 */
function requireRole(...roles) {
  return (req, res, next) => {
    // Requires requireAuth middleware to be used first
    if (!req.user) {
      return next(new ForbiddenError('Authentication required'));
    }
    
    // If no roles specified, allow access
    if (roles.length === 0) {
      return next();
    }
    
    // Check if user's role is in the allowed roles
    const userRole = req.user.role.toLowerCase();
    
    // Special case: 'admin' role has access to everything
    if (userRole === 'admin') {
      return next();
    }
    
    if (roles.some(role => role.toLowerCase() === userRole)) {
      return next();
    }
    
    // User doesn't have required role
    next(new ForbiddenError('Insufficient permissions'));
  };
}

module.exports = { requireRole };
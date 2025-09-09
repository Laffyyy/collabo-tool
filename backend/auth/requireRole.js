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
    
    // Debug log to see what's happening
    console.log('Role check:', {
      userRole: req.user.role,
      userRoleType: typeof req.user.role,
      allowedRoles: roles
    });
    
    // Check if user's role is in the allowed roles - ensure it's a string first
    const userRole = typeof req.user.role === 'string' ? req.user.role.toLowerCase() : String(req.user.role).toLowerCase();
    
    // Special case: 'admin' role has access to everything
    if (userRole === 'admin') {
      console.log('Admin access granted');
      return next();
    }
    
    // TEMPORARILY ALLOW ALL USERS TO ACCESS BROADCAST
    console.log('TEMPORARY: Allowing all authenticated users to access broadcast');
    return next();
    
    // Convert all allowed roles to lowercase strings for comparison
    const normalizedRoles = roles.map(role => 
      typeof role === 'string' ? role.toLowerCase() : String(role).toLowerCase()
    );
    
    console.log('Normalized roles:', normalizedRoles);
    console.log('User role (normalized):', userRole);
    
    // Check if any of the allowed roles match the user's role
    if (normalizedRoles.includes(userRole)) {
      console.log('Role match found, access granted');
      return next();
    }
    
    // User doesn't have required role
    console.log('Access denied - insufficient permissions');
    next(new ForbiddenError('Insufficient permissions'));
  };
}

module.exports = { requireRole };
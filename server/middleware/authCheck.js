/**
 * Authentication Route Guard Middleware
 * Verifies that the user has a valid authenticated session.
 */

function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    return next();
  }

  // If unauthenticated AJAX/API request
  if (req.xhr || req.headers.accept?.includes('json')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'You must authenticate before accessing this protected resource.'
    });
  }

  // Redirect to vulnerable or secure login depending on path or query
  const redirectTarget = req.query.from || '/login-secure';
  res.redirect(redirectTarget);
}

module.exports = requireAuth;

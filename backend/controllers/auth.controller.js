const authService = require('../services/auth.service');

/**
 * Login controller - handles user authentication requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    const result = await authService.login({ username, password });
    
    // For the initial integration, we'll return a simple response
    // that the frontend can use to show an alert
    res.status(200).json({ 
      ok: true,
      exists: result.exists, 
      message: result.message,
      step: result.step
    });
  } catch (err) {
    next(err);
  }
}

async function verifyOtp(req, res, next) {
  try {
    const { username, otp } = req.body;
    const result = await authService.verifyOtp({ username, otp });
    res.status(200).json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function firstTimeSetup(req, res, next) {
  try {
    const { username, password } = req.body;
    const result = await authService.firstTimeSetup({ username, password });
    res.status(201).json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    const result = await authService.changePassword({ userId, currentPassword, newPassword });
    res.status(200).json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function setSecurityQuestions(req, res, next) {
  try {
    const userId = req.user.id;
    const { questions } = req.body;
    const result = await authService.setSecurityQuestions({ userId, questions });
    res.status(200).json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { username } = req.body;
    const result = await authService.forgotPassword({ username });
    res.status(200).json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function sendResetLink(req, res, next) {
  try {
    const { username } = req.body;
    const result = await authService.sendResetLink({ username });
    res.status(200).json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function answerSecurityQuestions(req, res, next) {
  try {
    const { username, answers } = req.body;
    const result = await authService.answerSecurityQuestions({ username, answers });
    res.status(200).json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  verifyOtp,
  firstTimeSetup,
  changePassword,
  setSecurityQuestions,
  forgotPassword,
  sendResetLink,
  answerSecurityQuestions,
};


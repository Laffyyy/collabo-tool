const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { env } = require('../config');
const { BadRequestError, UnauthorizedError } = require('../utils/errors');
const { generateOtp, verifyOtpCode } = require('../utils/otp');

// In-memory demo store (replace with DB later)
const users = new Map();
const pendingOtps = new Map(); // username -> { code, expiresAt }

function signToken(payload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: `${env.TOKEN_EXP_MINUTES}m` });
}

async function login({ username, password }) {
  const user = users.get(username);
  if (!user) throw new UnauthorizedError('Invalid credentials');
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) throw new UnauthorizedError('Invalid credentials');

  // Simulate OTP requirement
  const otp = generateOtp();
  pendingOtps.set(username, otp);
  return {
    step: 'OTP_REQUIRED',
    message: 'OTP sent',
    otpPreview: (env.NODE_ENV || 'development') === 'development' ? otp.code : undefined,
  };
}

async function verifyOtp({ username, otp }) {
  const expected = pendingOtps.get(username);
  if (!expected || !verifyOtpCode(expected, otp)) {
    throw new UnauthorizedError('Invalid or expired OTP');
  }
  pendingOtps.delete(username);

  const user = users.get(username);
  const token = signToken({ id: user.id, username });
  return { token, user: { id: user.id, username } };
}

async function firstTimeSetup({ username, password }) {
  if (users.has(username)) throw new BadRequestError('User already exists');
  const passwordHash = await bcrypt.hash(password, 10);
  const user = { id: `u_${Date.now()}`, username, passwordHash, securityQuestions: [] };
  users.set(username, user);
  return { user: { id: user.id, username } };
}

async function changePassword({ userId, currentPassword, newPassword }) {
  const user = [...users.values()].find((u) => u.id === userId);
  if (!user) throw new UnauthorizedError('User not found');
  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) throw new UnauthorizedError('Invalid current password');
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  return { message: 'Password updated' };
}

async function setSecurityQuestions({ userId, questions }) {
  const user = [...users.values()].find((u) => u.id === userId);
  if (!user) throw new UnauthorizedError('User not found');
  user.securityQuestions = questions;
  return { message: 'Security questions set' };
}

async function forgotPassword({ username }) {
  const user = users.get(username);
  if (!user) throw new BadRequestError('User not found');
  // In real implementation, kick off flow (questions or email)
  return { next: 'ANSWER_SECURITY_QUESTIONS' };
}

async function sendResetLink({ username }) {
  const user = users.get(username);
  if (!user) throw new BadRequestError('User not found');
  // Simulate email send
  return { message: 'Reset link sent (simulated)' };
}

async function answerSecurityQuestions({ username, answers }) {
  const user = users.get(username);
  if (!user) throw new BadRequestError('User not found');
  const ok = Array.isArray(answers) && answers.length > 0;
  if (!ok) throw new UnauthorizedError('Incorrect answers');
  const token = signToken({ id: user.id, username });
  return { token };
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


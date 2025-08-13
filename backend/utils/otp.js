function generateOtp() {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins
  return { code, expiresAt };
}

function verifyOtpCode(expected, provided) {
  if (!expected) return false;
  const notExpired = expected.expiresAt > Date.now();
  return notExpired && String(expected.code) === String(provided);
}

module.exports = { generateOtp, verifyOtpCode };


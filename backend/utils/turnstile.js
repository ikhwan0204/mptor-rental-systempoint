async function verifyTurnstileToken(token, remoteIp) {
  if (!process.env.TURNSTILE_SECRET_KEY) {
    return true; // belum configured — skip (dev mode)
  }
  if (!token) return false;

  const formData = new URLSearchParams();
  formData.append('secret', process.env.TURNSTILE_SECRET_KEY);
  formData.append('response', token);
  if (remoteIp) formData.append('remoteip', remoteIp);

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.error('Turnstile verification failed:', err.message);
    return false;
  }
}

module.exports = { verifyTurnstileToken };
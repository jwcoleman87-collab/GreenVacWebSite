// Vercel Node function. Secrets stay in environment variables, never in the browser.
module.exports = async function handler(req, res) {
  const { handleEstimate } = await import('../lib/estimates/delivery.mjs');
  return handleEstimate(req, res);
};

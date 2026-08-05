// Small shared helpers used across handlers.

// Keeps "days ahead" sane: an integer between 1 and 7 (default 7 if missing).
function clampDays(d) {
  const n = parseInt(d);
  if (isNaN(n)) return 7;
  return Math.min(7, Math.max(1, n));
}

module.exports = { clampDays };

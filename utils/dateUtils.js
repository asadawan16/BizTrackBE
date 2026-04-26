// Pakistan Standard Time = UTC+5
const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

/**
 * Returns a UTC Date representing midnight of the given date in PKT,
 * regardless of the server's local timezone.
 *
 * "2025-04-26" (ISO string, parsed as UTC midnight) → still April 26 in PKT ✓
 * new Date() at 21:00 UTC → 02:00 PKT next day → returns next day's midnight ✓
 */
const toPKTMidnight = (d) => {
  const date = d ? new Date(d) : new Date();
  const pkt = new Date(date.getTime() + PKT_OFFSET_MS);
  return new Date(Date.UTC(pkt.getUTCFullYear(), pkt.getUTCMonth(), pkt.getUTCDate()));
};

/** PKT date string YYYY-MM-DD for today */
const pktTodayStr = () => {
  const pkt = new Date(Date.now() + PKT_OFFSET_MS);
  return pkt.toISOString().split('T')[0];
};

module.exports = { toPKTMidnight, pktTodayStr };

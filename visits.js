export function isBotVisit(userAgent, purpose) {
  var ua = typeof userAgent === "string" ? userAgent.trim() : "";
  if (ua.length < 12) return true;
  if (/bot\b|bot\/|crawl|spider|slurp|headless|phantom|wget|curl\/|python-requests|go-http-client|scrapy|semrush|ahrefs|mj12bot|dotbot|petalbot|bytespider|gptbot|claudebot|amazonbot|applebot|bingbot|duckduckbot|yandex|baiduspider|sogou|exabot|ia_archiver|archive.org_bot|lighthouse|pagespeed|pingdom|uptimerobot|statuscake/i.test(ua)) {
    return true;
  }
  var why = typeof purpose === "string" ? purpose : "";
  if (/prefetch|preview/i.test(why)) return true;
  return false;
}

export function nextCount(current) {
  if (current === null || current === undefined || current === "") return 1;
  var value = typeof current === "number" ? current : Number(current);
  if (!isFinite(value) || value < 0) return null;
  return Math.floor(value) + 1;
}

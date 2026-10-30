import { isBotVisit, nextCount } from "../visits.js";

function check(label, ok) {
  if (!ok) {
    console.error("FAIL " + label);
    process.exit(1);
  }
  console.log("PASS " + label);
}

var chrome = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

check("a normal browser is counted", isBotVisit(chrome, "") === false);
check("Googlebot is skipped", isBotVisit("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)", "") === true);
check("Bingbot is skipped", isBotVisit("Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)", "") === true);
check("Headless Chrome is skipped", isBotVisit("Mozilla/5.0 HeadlessChrome/131.0.0.0 Safari/537.36", "") === true);
check("curl is skipped", isBotVisit("curl/8.5.0", "") === true);
check("an empty agent is skipped", isBotVisit("", "") === true);
check("a short agent is skipped", isBotVisit("Mozilla", "") === true);
check("prefetch is skipped", isBotVisit(chrome, "prefetch") === true);
check("a missing count starts at 1", nextCount(null) === 1 && nextCount("") === 1);
check("a count increments by one", nextCount(12) === 13 && nextCount("12") === 13);
check("a corrupt count is not replaced", nextCount(-1) === null && nextCount("nope") === null && nextCount(Infinity) === null);

import { isBotVisit, nextCount } from "../../visits.js";

var JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

function json(body, status) {
  return new Response(JSON.stringify(body), { status: status, headers: JSON_HEADERS });
}

async function readCount(env) {
  if (!env || !env.VISITS || typeof env.VISITS.get !== "function") return null;
  var raw = await env.VISITS.get("count");
  if (raw === null || raw === undefined || raw === "") return 0;
  var next = nextCount(raw);
  if (next === null) return null;
  return next - 1;
}

async function writeCount(env, count) {
  await env.VISITS.put("count", String(count));
}

export async function onRequest(context) {
  try {
    return await handle(context);
  } catch (err) {
    return json({ error: "count unavailable" }, 503);
  }
}

async function handle(context) {
  var method = context.request.method;
  if (method !== "GET" && method !== "POST") {
    return new Response(null, { status: 405, headers: { allow: "GET, POST" } });
  }

  var current = await readCount(context.env);
  if (current === null) return json({ error: "count unavailable" }, 503);

  if (method === "GET") return json({ count: current, counted: false }, 200);

  var purpose = (context.request.headers.get("purpose") || "") + " " +
    (context.request.headers.get("sec-purpose") || "");
  var site = context.request.headers.get("sec-fetch-site");
  var bot = isBotVisit(context.request.headers.get("user-agent"), purpose);
  if (bot || site !== "same-origin") {
    return json({ count: current, counted: false }, 200);
  }

  var count = nextCount(current);
  if (count === null) return json({ error: "count unavailable" }, 503);
  try {
    await writeCount(context.env, count);
  } catch (err) {
    return json({ error: "count unavailable" }, 503);
  }
  return json({ count: count, counted: true }, 200);
}

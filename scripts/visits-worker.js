const ALLOWED = ["https://mobilemoneyratesug.cc", "https://www.mobilemoneyratesug.cc"];

function allowed(request) {
  const origin = request.headers.get("Origin") || "";
  const referer = request.headers.get("Referer") || "";
  const site = request.headers.get("Sec-Fetch-Site") || "";
  if (site === "same-origin") return true;
  return ALLOWED.some((item) => origin === item || referer === item || referer.startsWith(item + "/"));
}

export default {
  async fetch(request, env) {
    if (!allowed(request)) return new Response("Forbidden", { status: 403 });
    let visits = Number(await env.VISITS.get("total")) || 0;
    if (request.method === "POST") {
      visits += 1;
      await env.VISITS.put("total", String(visits));
    } else if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }
    return Response.json(
      { visits },
      { headers: { "cache-control": "no-store", "access-control-allow-origin": request.headers.get("Origin") || ALLOWED[0] } }
    );
  }
};

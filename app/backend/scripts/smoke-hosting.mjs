const base = (process.env.BASE_URL || "http://127.0.0.1:5000").replace(/\/+$/, "");

const htmlRoutes = [
  "/",
  "/Admin",
  "/Admin/Ops",
  "/App",
  "/App/Tools/ExcelReformat",
  "/App/HR",
  "/Mobile",
  "/ESS",
  "/yourstop",
  "/yourstop/about",
];

async function checkHtml(path) {
  const url = `${base}${path}`;
  const res = await fetch(url, { redirect: "manual" });
  const ct = res.headers.get("content-type") || "";
  const body = await res.text();
  const looksLikeHtml =
    ct.includes("text/html") &&
    (body.toLowerCase().includes("<!doctype html") || body.includes('id="root"') || body.includes("vite"));

  const ok = res.status >= 200 && res.status < 400 && looksLikeHtml;
  console.log(`[html] ${res.status} ${ct.split(";")[0] || ""} ${path}`);
  if (!ok) {
    console.log(body.slice(0, 300));
    throw new Error(`HTML route check failed: ${path}`);
  }
}

async function checkJson(path) {
  const url = `${base}${path}`;
  const res = await fetch(url, { redirect: "manual", headers: { Accept: "application/json" } });
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    // ignore
  }

  const ok = res.status >= 200 && res.status < 400 && ct.includes("application/json") && parsed && typeof parsed === "object";
  console.log(`[json] ${res.status} ${ct.split(";")[0] || ""} ${path}`);
  if (!ok) {
    console.log(text.slice(0, 300));
    throw new Error(`JSON route check failed: ${path}`);
  }
}

async function checkJsonNonHtml(path) {
  const url = `${base}${path}`;
  const res = await fetch(url, { redirect: "manual", headers: { Accept: "application/json" } });
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();
  const looksLikeHtml = text.toLowerCase().includes("<!doctype html") || text.includes('id="root"');
  const ok = ct.includes("application/json") && !looksLikeHtml;
  console.log(`[json-ish] ${res.status} ${ct.split(";")[0] || ""} ${path}`);
  if (!ok) {
    console.log(text.slice(0, 300));
    throw new Error(`API returned HTML or non-JSON: ${path}`);
  }
}

async function main() {
  for (const p of htmlRoutes) {
    await checkHtml(p);
  }

  await checkJson("/api/version");
  // Should return JSON (typically 401/403) — never HTML.
  await checkJsonNonHtml("/api/ops");
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exitCode = 1;
});


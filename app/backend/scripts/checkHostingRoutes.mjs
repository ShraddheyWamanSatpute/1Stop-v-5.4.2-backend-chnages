const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 5000;

async function resolveHostingBaseUrl() {
  // Best-effort: ask the Emulator Hub which port Hosting actually bound to.
  // `firebase emulators:exec` typically sets FIREBASE_EMULATOR_HUB=host:port
  const hub = process.env.FIREBASE_EMULATOR_HUB;
  if (hub) {
    try {
      const hubUrl = hub.startsWith("http") ? hub : `http://${hub}`;
      const res = await fetch(`${hubUrl}/emulators`);
      if (res.ok) {
        const json = await res.json();
        const hosting = json?.hosting;
        if (hosting?.host && hosting?.port) {
          return `http://${hosting.host}:${hosting.port}`;
        }
      }
    } catch {
      // fall through to env/defaults
    }
  }

  // Next: env vars (may not be set, but keep for compatibility)
  const host =
    process.env.FIREBASE_HOSTING_EMULATOR_HOST ||
    process.env.FIREBASE_EMULATOR_HOST ||
    DEFAULT_HOST;

  const port = Number(process.env.FIREBASE_HOSTING_EMULATOR_PORT || DEFAULT_PORT);
  return `http://${host}:${port}`;
}

const baseUrl = await resolveHostingBaseUrl();

const paths = [
  "/",
  "/App",
  "/App/Dashboard",
  "/Admin",
  "/Admin/Dashboard",
  "/Mobile",
  "/ESS",
  "/Tools/SmokeTop3",
];

function summarizeHtml(body) {
  return body.slice(0, 120).replace(/\s+/g, " ").trim();
}

let hasFailures = false;

for (const p of paths) {
  const url = `${baseUrl}${p}`;
  const res = await fetch(url, { redirect: "manual" });
  const ct = (res.headers.get("content-type") || "").split(";")[0].trim();
  const body = await res.text();

  const okStatus = res.status >= 200 && res.status < 400;
  const looksLikeHtml = ct === "text/html" || body.toLowerCase().includes("<!doctype html");

  // For SPA shell routes, we expect HTML.
  const ok = okStatus && looksLikeHtml;
  if (!ok) hasFailures = true;

  console.log(
    `${p} -> ${res.status} ${ct || "(no content-type)"} | ${summarizeHtml(body)}`
  );
}

if (hasFailures) {
  console.error("Route check failed: one or more routes did not return HTML successfully.");
  process.exit(1);
}


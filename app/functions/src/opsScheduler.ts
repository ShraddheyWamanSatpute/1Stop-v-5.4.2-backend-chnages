import { onSchedule } from "firebase-functions/v2/scheduler"
import { enrichDeploymentsWithJiraKeys, githubSync, jiraSync, jenkinsSync } from "./opsProviders"

const SYSTEM_ACTOR = { uid: "system", email: "system@ops" }

export const opsSyncAll = onSchedule("every 30 minutes", async () => {
  const results: any = {}
  // Each sync function checks env vars and will throw if configured but broken.
  // We intentionally isolate failures so one provider doesn't block the others.
  try {
    results.github = await githubSync(SYSTEM_ACTOR)
  } catch (e: any) {
    results.github = { ok: false, error: String(e?.message || e || "Failed") }
  }
  try {
    results.jira = await jiraSync(SYSTEM_ACTOR)
  } catch (e: any) {
    results.jira = { ok: false, error: String(e?.message || e || "Failed") }
  }
  try {
    results.jenkins = await jenkinsSync(SYSTEM_ACTOR)
  } catch (e: any) {
    results.jenkins = { ok: false, error: String(e?.message || e || "Failed") }
  }

  // Linking: attach Jira keys to recent deployments where possible.
  try {
    results.enrichDeployments = await enrichDeploymentsWithJiraKeys(200, SYSTEM_ACTOR)
  } catch (e: any) {
    results.enrichDeployments = { ok: false, error: String(e?.message || e || "Failed") }
  }

  return results
})


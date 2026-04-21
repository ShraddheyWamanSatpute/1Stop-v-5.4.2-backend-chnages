export type OpsEnvironmentKey = "dev" | "prod"
export type OpsServiceKey = "frontend" | "app" | "admin" | "mobile" | "main-site" | "api" | "all"

export type VersionPayload = {
  app?: string
  service?: OpsServiceKey | string
  environment?: string
  version?: string
  gitSha?: string
  buildTime?: string
  deployTime?: string
  source?: string
}

export type OpsDeployment = {
  id: string
  environment: OpsEnvironmentKey
  service: OpsServiceKey
  baseUrl?: string
  version?: string
  gitSha?: string
  buildTime?: string
  deployTime?: number
  createdAt: number
  source?: string
  actionId?: string
  executionUrl?: string
  actor?: {
    uid?: string
    email?: string
  }
  notes?: string
  jiraKeys?: string[]
}

export type OpsRelease = {
  id: string
  version: string
  gitSha?: string
  notes?: string
  createdAt: number
  actionId?: string
  deploymentId?: string
  executionUrl?: string
  actor?: {
    uid?: string
    email?: string
  }
}

export type OpsActionStatus = "requested" | "approved" | "running" | "succeeded" | "failed" | "cancelled"

export type OpsAction = {
  id: string
  kind: "deploy"
  status: OpsActionStatus
  environment: OpsEnvironmentKey
  service: OpsServiceKey
  requiredApprovals?: number
  deploymentId?: string
  requestedAt: number
  requestedBy?: { uid?: string; email?: string }
  approvals?: Array<{ uid?: string; email?: string; at?: number }>
  approvedAt?: number
  approvedBy?: { uid?: string; email?: string }
  cancelledAt?: number
  cancelledBy?: { uid?: string; email?: string }
  desired?: { version?: string; gitSha?: string; notes?: string }
  execution?: {
    startedAt?: number
    finishedAt?: number
    updatedAt?: number
    provider?: "none" | "jenkins" | "githubActions"
    externalUrl?: string
    message?: string
    ok?: boolean
  }
}


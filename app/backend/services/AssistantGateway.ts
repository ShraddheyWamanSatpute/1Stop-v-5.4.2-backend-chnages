import { auth } from './Firebase'
import { APP_KEYS, getFunctionsBaseUrl } from '../config/keys'
import { analyzeChatPrompt } from './VertexService'
import {
  tryResolveChangeSummaryQuery,
  tryResolveComparisonQuery,
  tryResolveMetricQuery,
  tryResolvePeriodComparisonQuery,
  tryResolveRankingQuery,
  tryResolveTrendQuery,
} from '../../frontend/components/assistant/assistantAnalytics'

type AssistantResponseMode = 'metric' | 'comparison' | 'summary' | 'action'

type AssistantGatewayPayload = {
  userMessage: string
  basePath?: string
  snapshot: any
  derived: Record<string, any>
  metricDictionary: any[]
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  learnedPreferences: Array<{ timestamp?: string; text: string }>
  dateRangeLabel?: string
}

export function inferAssistantResponseMode(message: string): AssistantResponseMode {
  const q = message.toLowerCase()
  if (/\b(compare|comparison|vs|versus|difference|better|worse)\b/.test(q)) return 'comparison'
  if (/\b(what should|what do you recommend|recommend|suggest|next step|action|plan)\b/.test(q)) return 'action'
  if (/\b(kpi|metric|how many|what is|whats|total|rate|sales|revenue|profit|bookings|occup)\b/.test(q)) return 'metric'
  return 'summary'
}

export function cleanAssistantResponse(content: string): string {
  return content
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/^\s+|\s+$/g, '')
}

async function tryRemoteAssistantReply(
  payload: AssistantGatewayPayload,
  responseMode: AssistantResponseMode,
): Promise<string | null> {
  try {
    const currentUser = auth?.currentUser
    if (!currentUser) return null

    const token = await currentUser.getIdToken()
    if (!token) return null

    const baseUrl = getFunctionsBaseUrl({
      projectId: APP_KEYS.firebase.projectId,
      region: APP_KEYS.firebase.functionsRegion,
    })

    const response = await fetch(`${baseUrl}/assistantGateway`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        userMessage: payload.userMessage,
        contextData: {
          basePath: payload.basePath,
          analyticsSnapshot: payload.snapshot,
          derivedMetrics: payload.derived,
          metricDictionary: payload.metricDictionary,
          chatHistory: payload.chatHistory,
          learnedPreferences: payload.learnedPreferences,
        },
        options: {
          responseMode,
          dateRangeLabel: payload.dateRangeLabel || payload.snapshot?.dateRange?.label,
        },
      }),
    })

    if (!response.ok) return null
    const data = await response.json()
    const text = typeof data?.text === 'string' ? data.text : ''
    return text.trim() ? text : null
  } catch {
    return null
  }
}

export async function generateAssistantReply(payload: AssistantGatewayPayload): Promise<string> {
  const {
    userMessage,
    basePath,
    snapshot,
    derived,
    metricDictionary,
    chatHistory,
    learnedPreferences,
    dateRangeLabel,
  } = payload

  const quickMetric = tryResolveMetricQuery(
    userMessage,
    metricDictionary,
    snapshot?.dateRange?.label,
    learnedPreferences || [],
  )
  if (quickMetric) return quickMetric

  const quickComparison = tryResolveComparisonQuery(
    userMessage,
    metricDictionary,
    snapshot?.dateRange?.label,
  )
  if (quickComparison) return quickComparison

  const quickRanking = tryResolveRankingQuery(userMessage, snapshot)
  if (quickRanking) return quickRanking

  const quickPeriodComparison = tryResolvePeriodComparisonQuery(userMessage, snapshot)
  if (quickPeriodComparison) return quickPeriodComparison

  const quickTrend = tryResolveTrendQuery(userMessage, snapshot)
  if (quickTrend) return quickTrend

  const quickChangeSummary = tryResolveChangeSummaryQuery(userMessage, snapshot)
  if (quickChangeSummary) return quickChangeSummary

  const responseMode = inferAssistantResponseMode(userMessage)
  const remoteResponse = await tryRemoteAssistantReply(payload, responseMode)
  if (remoteResponse) return cleanAssistantResponse(remoteResponse)

  const response = await analyzeChatPrompt(
    userMessage,
    {
      basePath,
      analyticsSnapshot: snapshot,
      derivedMetrics: derived,
      metricDictionary,
      chatHistory,
      learnedPreferences,
    },
    {
      responseMode,
      dateRangeLabel: dateRangeLabel || snapshot?.dateRange?.label,
    },
  )

  return cleanAssistantResponse(response)
}

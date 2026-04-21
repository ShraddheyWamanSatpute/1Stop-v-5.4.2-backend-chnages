// Import centralized Firebase configuration
import { ai, getGenerativeModel } from './Firebase'

type GenerationOptions = {
  temperature?: number
  maxOutputTokens?: number
  topP?: number
  topK?: number
  model?: string
}

const defaultGenOptions = {
  temperature: 0.4,
  maxOutputTokens: 2048,
  topP: 0.8,
  topK: 40,
  // Use latest Gemini model as recommended
  model: 'gemini-2.5-flash',
}

const MAX_CONTEXT_CHARS = 120000

function getModel(modelName?: string) {
  // Use centralized AI instance from Firebase.ts
  return getGenerativeModel(ai, { model: modelName || defaultGenOptions.model })
}

function safeSerializeContext(value: unknown, maxChars = MAX_CONTEXT_CHARS): string {
  const seen = new WeakSet<object>()
  const json = JSON.stringify(
    value,
    (_key, currentValue) => {
      if (typeof currentValue === 'object' && currentValue !== null) {
        if (seen.has(currentValue)) return '[Circular]'
        seen.add(currentValue)
      }
      return currentValue
    },
    2,
  )

  if (!json) return '{}'
  if (json.length <= maxChars) return json

  return `${json.slice(0, maxChars)}\n... [truncated ${json.length - maxChars} chars]`
}

function extractJsonPayload(text: string): string | null {
  const trimmed = String(text || '').trim()
  if (!trimmed) return null

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fencedMatch?.[1]?.trim() || trimmed

  const firstBrace = candidate.indexOf('{')
  const lastBrace = candidate.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null

  return candidate.slice(firstBrace, lastBrace + 1)
}

function buildSystemPreface(systemContext?: string, structuredData?: unknown): string {
  if (systemContext) return systemContext;
  if (structuredData) {
    // Enhanced system context for comprehensive business analysis
    const dataSize = JSON.stringify(structuredData).length;
    const hasModules = structuredData && typeof structuredData === 'object' && 'modules' in structuredData;
    const hasContext = structuredData && typeof structuredData === 'object' && 'context' in structuredData;
    const hasOrgStructure = structuredData && typeof structuredData === 'object' && 'organizationStructure' in structuredData;
    
    // Extract context information if available
    let contextInfo = '';
    if (hasContext && (structuredData as any).context) {
      const ctx = (structuredData as any).context;
      contextInfo = `
CURRENT BUSINESS CONTEXT:
- Company: ${ctx.companyName || 'Unknown'} (ID: ${ctx.companyId || 'N/A'})
- Site: ${ctx.siteName || 'No Site Selected'} (ID: ${ctx.siteId || 'N/A'})
- Subsite: ${ctx.subsiteName || 'No Subsite Selected'} (ID: ${ctx.subsiteId || 'N/A'})
- User: ${ctx.userName || 'Unknown User'} (${ctx.userEmail || 'No Email'})
- Data Scope: ${(structuredData as any).metadata?.dataScope || 'Unknown'} level analysis
- Hierarchy Level: ${(structuredData as any).metadata?.hierarchyLevel || 'Unknown'}`;
    }

    // Extract organizational structure if available
    let orgInfo = '';
    if (hasOrgStructure && (structuredData as any).organizationStructure) {
      const org = (structuredData as any).organizationStructure;
      orgInfo = `
ORGANIZATIONAL STRUCTURE:
- Total Sites: ${org.allSites?.length || 0}
- Current Site Location: ${org.site?.description || 'Not specified'}
- Current Subsite: ${org.subsite?.name || 'None selected'}
- Available Modules: ${(structuredData as any).metadata?.modulesWithData?.join(', ') || 'None'}`;
    }
    
    return `You are an advanced AI business analyst with access to comprehensive company management data for a specific business location.

DATA CONTEXT:
- Data size: ${dataSize} characters
- Multi-module dataset: ${hasModules ? 'Yes' : 'No'}
- Analysis scope: ${hasModules ? 'Cross-functional business intelligence' : 'Single-domain analysis'}
- Contextual analysis: ${hasContext ? 'Site/Subsite specific' : 'General business data'}
${contextInfo}${orgInfo}

ANALYSIS FOCUS:
You are analyzing data specifically for the selected business location. Consider:
1. Location-specific performance metrics and KPIs
2. Site/subsite operational efficiency and resource utilization
3. Local market conditions and customer behavior patterns
4. Staff performance and scheduling optimization for this location
5. Inventory management and supply chain efficiency at this site
6. Financial performance relative to other locations (if applicable)
7. Compliance and safety metrics specific to this location

Your role is to:
1. Identify key patterns, trends, and correlations across all business functions FOR THIS SPECIFIC LOCATION
2. Provide actionable insights with specific metrics and KPIs relevant to the current site/subsite
3. Recommend data-driven strategies for optimization at this location
4. Highlight location-specific risks and opportunities
5. Suggest concrete next steps with measurable outcomes for this business location
6. Compare performance against company-wide benchmarks when relevant

IMPORTANT: Focus your analysis on the currently selected business location context. All recommendations should be specific to this site/subsite's operational needs and constraints.

Provide analysis that is:
- Location-specific and contextually relevant
- Quantitative with site-specific metrics where possible
- Actionable with clear, implementable recommendations
- Strategic with both immediate and long-term perspectives for this location
- Risk-aware with location-specific mitigation strategies`;
  }
  return 'You are an AI assistant helping with business tasks. You can help with writing emails, creating reports, making announcements, and analyzing business data.';
}

async function generateText(prompt: string, options?: GenerationOptions): Promise<string> {
  const candidates = [
    options?.model,
    defaultGenOptions.model,
    'gemini-2.0-flash',
    'gemini-1.5-flash-001',
  ].filter(Boolean) as string[]

  let lastError: unknown = null
  for (const m of candidates) {
    try {
      const model = getModel(m)
      const response: any = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }]}],
        generationConfig: {
          temperature: options?.temperature ?? defaultGenOptions.temperature,
          maxOutputTokens: options?.maxOutputTokens ?? defaultGenOptions.maxOutputTokens,
          topP: options?.topP ?? defaultGenOptions.topP,
          topK: options?.topK ?? defaultGenOptions.topK,
        },
      } as unknown as any)
      const text = response.response?.text?.()
      if (text && String(text).trim().length > 0) return text
    } catch (e) {
      lastError = e
      // try next model
    }
  }
  throw lastError ?? new Error('Vertex AI text generation failed with all model fallbacks')
}

async function analyzeData(
  data: any,
  prompt: string,
  systemContext?: string,
  options?: GenerationOptions,
): Promise<string> {
  const preface = buildSystemPreface(systemContext, data);
  const enhancedPrompt = `${preface}\n\nANALYSIS REQUEST:\n${prompt}\n\nPlease structure your response with:\n1. **Executive Summary** - Key findings in 2-3 sentences\n2. **Key Metrics** - Quantitative insights with specific numbers\n3. **Trends & Patterns** - Notable patterns in the data\n4. **Strategic Insights** - Business implications and opportunities\n5. **Recommendations** - Specific, actionable next steps\n6. **Risk Assessment** - Potential challenges and mitigation strategies`;
  return generateText(enhancedPrompt, { ...options, temperature: options?.temperature ?? 0.3 });
}

export async function analyzeHRData(hrData: any) {
  const prompt = `Conduct a comprehensive HR analytics review focusing on:

**WORKFORCE ANALYTICS:**
1. Employee turnover trends and retention rates by department/role
2. Headcount growth patterns and workforce planning insights
3. Performance distribution and high/low performer identification
4. Compensation analysis and pay equity assessment

**OPERATIONAL EFFICIENCY:**
5. Recruitment funnel effectiveness and time-to-hire metrics
6. Training program ROI and skill development outcomes
7. Employee engagement scores and satisfaction trends
8. Absenteeism patterns and productivity correlations

**STRATEGIC INSIGHTS:**
9. Succession planning readiness and leadership pipeline
10. Skills gap analysis and future workforce needs
11. Diversity, equity, and inclusion metrics
12. Cost-per-hire and HR budget optimization opportunities

Provide specific metrics, trend analysis, and actionable recommendations for HR strategy optimization.`;
  return analyzeData(hrData, prompt, undefined, { temperature: 0.3, maxOutputTokens: 3072 });
}

export async function analyzeStockData(stockData: any) {
  const prompt = `Perform comprehensive inventory analytics covering:

**INVENTORY PERFORMANCE:**
1. Stock turnover rates by category, supplier, and location
2. Inventory aging analysis and slow-moving stock identification
3. Stockout frequency and lost sales impact assessment
4. Carrying cost analysis and working capital optimization

**DEMAND FORECASTING:**
5. Seasonal demand patterns and cyclical trends
6. ABC analysis for inventory prioritization
7. Lead time variability and supplier performance metrics
8. Demand volatility and safety stock optimization

**OPERATIONAL EFFICIENCY:**
9. Reorder point and economic order quantity recommendations
10. Warehouse space utilization and storage optimization
11. Procurement efficiency and bulk purchase opportunities
12. Inventory accuracy and cycle count performance

**STRATEGIC OPPORTUNITIES:**
13. Product lifecycle stage analysis
14. Supplier diversification and risk assessment
15. Technology integration opportunities (RFID, automation)
16. Sustainability and waste reduction initiatives

Provide specific KPIs, trend analysis, and actionable recommendations for inventory optimization.`;
  return analyzeData(stockData, prompt, undefined, { temperature: 0.3, maxOutputTokens: 3072 });
}

export async function analyzeBookingsData(bookingsData: any) {
  const prompt = `Perform comprehensive bookings and reservation analytics:

**DEMAND PATTERNS:**
1. Peak booking times by day, week, and season
2. Booking lead time analysis and advance reservation trends
3. Capacity utilization rates and occupancy optimization
4. No-show and cancellation pattern analysis

**CUSTOMER BEHAVIOR:**
5. Customer segmentation and booking preferences
6. Repeat customer rates and loyalty patterns
7. Average booking value and revenue per customer
8. Service/table popularity and demand distribution

**OPERATIONAL EFFICIENCY:**
9. Staff scheduling optimization based on booking patterns
10. Resource allocation and table/room turnover rates
11. Booking channel performance (online, phone, walk-in)
12. Wait time analysis and customer satisfaction correlation

**REVENUE OPTIMIZATION:**
13. Dynamic pricing opportunities and yield management
14. Upselling and cross-selling potential identification
15. Package deal effectiveness and bundling opportunities
16. Seasonal promotion impact and ROI analysis

Provide specific metrics, trend insights, and actionable recommendations for booking optimization and revenue maximization.`;
  return analyzeData(bookingsData, prompt, undefined, { temperature: 0.3, maxOutputTokens: 3072 });
}

export async function analyzeFinanceData(financeData: any) {
  const prompt = `Conduct comprehensive financial analytics covering:

**REVENUE ANALYSIS:**
1. Revenue growth trends and seasonality patterns
2. Revenue stream diversification and concentration risk
3. Customer lifetime value and acquisition cost analysis
4. Pricing strategy effectiveness and margin optimization

**PROFITABILITY METRICS:**
5. Gross, operating, and net profit margin trends
6. Cost structure analysis and expense categorization
7. Break-even analysis and contribution margin by product/service
8. EBITDA trends and cash generation capability

**FINANCIAL HEALTH:**
9. Liquidity ratios (current, quick, cash) and working capital management
10. Leverage ratios and debt service coverage analysis
11. Return on assets (ROA) and return on equity (ROE) performance
12. Cash flow patterns and cash conversion cycle optimization

**STRATEGIC INSIGHTS:**
13. Budget variance analysis and forecasting accuracy
14. Capital allocation efficiency and investment ROI
15. Financial risk assessment and scenario planning
16. Benchmarking against industry standards and competitors

Provide specific financial KPIs, trend analysis, and strategic recommendations for financial performance improvement.`;
  return analyzeData(financeData, prompt, undefined, { temperature: 0.3, maxOutputTokens: 3072 });
}

export async function analyzeLocationData(locationData: any) {
  const prompt = `Analyze this location data and provide insights on:
1. Location performance comparison
2. Geographic distribution
3. Location-specific trends
4. Expansion opportunities
Please provide specific metrics and strategic recommendations.`;
  return analyzeData(locationData, prompt);
}

export async function analyzePOSData(posData: any) {
  const prompt = `Analyze this POS (Point of Sale) data and provide insights on:
1. Sales performance by product/category
2. Transaction patterns
3. Payment method preferences
4. Peak sales periods
5. Staff performance metrics
Please provide specific metrics and recommendations for improving sales and efficiency.`;
  return analyzeData(posData, prompt);
}

export async function analyzeCompanyData(companyData: any) {
  const prompt = `Analyze this company data and provide insights on:
1. Overall business performance
2. Cross-departmental efficiency
3. Resource utilization
4. Growth indicators
5. Operational bottlenecks
Please provide comprehensive insights and strategic recommendations.`;
  return analyzeData(companyData, prompt);
}

export async function analyzeChatPrompt(
  userMessage: string,
  contextData?: any,
  options?: { responseMode?: 'metric' | 'comparison' | 'summary' | 'action'; dateRangeLabel?: string }
): Promise<string> {
  // Chat mode should be brief and "answer-only" by default. We do NOT want the long analytics
  // template (Executive Summary / Recommendations / etc.) unless the user explicitly asks for it.
  const ctxJson = contextData ? safeSerializeContext(contextData, 45000) : '{}';
  const responseMode = options?.responseMode || 'summary';
  const dateRangeLabel = options?.dateRangeLabel || contextData?.analyticsSnapshot?.dateRange?.label || 'selected period';
  const responseSchema =
    responseMode === 'metric'
      ? `Return ONLY JSON with keys: answer (string), timeframe (string, optional), caveat (string, optional).`
      : responseMode === 'comparison'
        ? `Return ONLY JSON with keys: lead (string), bullets (array of up to 3 short strings), caveat (string, optional).`
        : responseMode === 'action'
          ? `Return ONLY JSON with keys: lead (string), actions (array of up to 4 short strings), caveat (string, optional).`
          : `Return ONLY JSON with keys: lead (string), bullets (array of 2 to 4 short strings), caveat (string, optional).`;

  const system = `You are a helpful AI assistant for a hospitality business (restaurant, pub, bar, hotel, events, quick service).
Assume currency is GBP (£) unless the user specifies otherwise.

You will receive a JSON context that includes:
- analyticsSnapshot: actual metric names/keys and values (KPIs + small charts)
- metricDictionary: canonical metric keys/labels you MUST treat as the real names of data
- derivedMetrics: metrics calculated from available data
- chatHistory: recent conversation turns
- learnedPreferences: user-stated preferences to follow (from earlier in this assistant chat)

RULES (IMPORTANT):
- Be brief. Answer only what was asked for. No long preambles.
- Understand bad grammar and misspellings; infer intent.
- If the user asks for a specific metric, return just the value + timeframe. If you used a derived metric, say "(calculated)".
- Do not invent numbers. If missing, try to compute from available data; if still missing, ask ONE clarifying question.
- When referencing metrics internally, prefer the provided metricDictionary keys/labels.
- Start with the answer, not a recap of the question.
- Mention the timeframe when giving numbers. Use "${dateRangeLabel}" when relevant.
- Do not use markdown headings unless the user explicitly asks for a report.
- Prefer these response shapes:
  - metric: one sentence or one short line
  - comparison: up to 3 bullets
  - summary: 2-4 short bullets or 2 short paragraphs
  - action: up to 4 bullets focused on what to do next
- If the data is partial, say so briefly and answer from what is available.

CURRENT RESPONSE MODE: ${responseMode}`;

  const prompt = `${system}

CONTEXT (JSON):
${ctxJson}

USER:
${userMessage}

${responseSchema}

Respond now as valid JSON only.`;

  const text = await generateText(prompt, { temperature: 0.25, maxOutputTokens: 768 });

  try {
    const payload = extractJsonPayload(text);
    if (!payload) throw new Error('No JSON payload returned');
    const parsed = JSON.parse(payload);

    if (responseMode === 'metric') {
      const answer = String(parsed.answer || '').trim();
      const timeframe = String(parsed.timeframe || '').trim();
      const caveat = String(parsed.caveat || '').trim();
      return [answer, timeframe ? `(${timeframe})` : '', caveat ? ` ${caveat}` : ''].join('').trim();
    }

    const lead = String(parsed.lead || '').trim();
    const list = Array.isArray(parsed.actions)
      ? parsed.actions
      : Array.isArray(parsed.bullets)
        ? parsed.bullets
        : [];
    const caveat = String(parsed.caveat || '').trim();
    const renderedList = list
      .map((item: unknown) => String(item || '').trim())
      .filter(Boolean)
      .slice(0, responseMode === 'action' ? 4 : responseMode === 'comparison' ? 3 : 4)
      .map((item: string) => `- ${item}`)
      .join('\n');

    return [lead, renderedList, caveat].filter(Boolean).join('\n').trim();
  } catch {
    return text;
  }
}

export async function draftEmailResponse(input: string, options?: { tone?: 'formal' | 'friendly' | 'concise' | 'apologetic'; language?: string }): Promise<{ subject: string; body: string }>
{
  const tone = options?.tone || 'formal';
  const language = options?.language || 'English';
  const prompt = `Draft a professional email reply in ${language} with a ${tone} tone. 
Input (quoted email and/or context/instructions):\n${input}

Return ONLY JSON with keys subject and body.`;
  const text = await generateText(prompt, { temperature: 0.3 });
  try {
    const payload = extractJsonPayload(text);
    if (!payload) throw new Error('No JSON payload returned');
    const parsed = JSON.parse(payload);
    return { subject: parsed.subject || 'Re:', body: parsed.body || text };
  } catch {
    return { subject: 'Re:', body: text };
  }
}

export async function generateBusinessReport(request: string, context?: any): Promise<string> {
  const compactContext = context ? safeSerializeContext(context, 80000) : '{}'
  const preface = buildSystemPreface(undefined, context);
  const isComprehensive = context && typeof context === 'object' && ('modules' in context || Object.keys(context).length > 3);
  
  const prompt = `${preface}\n\nBUSINESS CONTEXT (JSON):\n${compactContext}\n\n**BUSINESS REPORT REQUEST:**\n"""\n${request}\n"""\n\n**REPORT REQUIREMENTS:**\nCreate a comprehensive, data-driven business report in Markdown format with the following structure:\n\n# [Report Title]\n\n## Executive Summary\n- Key findings and business impact\n- Critical metrics and performance indicators\n- Primary recommendations\n\n## Current State Analysis\n${isComprehensive ? '- Cross-functional performance overview\n- Module-specific insights (Finance, HR, Operations, etc.)\n' : '- Domain-specific performance metrics\n'}- Comparative analysis and benchmarks\n\n## Key Performance Indicators\n- Quantitative metrics with trend analysis\n- Performance against targets/industry standards\n- Risk indicators and alerts\n\n## Strategic Insights\n- Business opportunities and growth potential\n- Operational efficiency improvements\n- Market positioning and competitive advantages\n\n## Recommendations\n- **Immediate Actions** (0-30 days)\n- **Short-term Initiatives** (1-3 months)\n- **Long-term Strategy** (3-12 months)\n- Resource requirements and ROI projections\n\n## Implementation Roadmap\n- Priority matrix with impact/effort assessment\n- Success metrics and KPIs to track\n- Risk mitigation strategies\n\n## Next Steps\n- Specific action items with owners and timelines\n- Required resources and budget considerations\n- Follow-up review schedule\n\n**FORMATTING GUIDELINES:**\n- Use clear headings and bullet points\n- Include specific numbers and percentages where available\n- Highlight critical insights with **bold** text\n- Use tables for comparative data when appropriate\n- Keep language professional but accessible`;
  
  return generateText(prompt, { 
    temperature: 0.25, 
    maxOutputTokens: isComprehensive ? 4096 : 2048,
    topP: 0.9,
    topK: 40
  });
}

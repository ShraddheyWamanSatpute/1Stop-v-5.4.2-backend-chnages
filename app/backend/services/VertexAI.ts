import { VertexAI } from '@google-cloud/vertexai';

// Initialize Vertex AI
const vertex_ai = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT_ID || 'your-project-id',
  location: process.env.VERTEX_AI_LOCATION || 'us-central1',
});

// Initialize the model
const model = vertex_ai.preview.getGenerativeModel({
  model: 'gemini-1.5-pro-preview-0409',
});

export interface VertexAIRequest {
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
}

export interface VertexAIResponse {
  text: string;
  usage?: {
    promptTokens: number;
    candidatesTokens: number;
    totalTokens: number;
  };
}

/**
 * Generate content using Vertex AI Gemini model
 */
export async function generateContent(request: VertexAIRequest): Promise<VertexAIResponse> {
  try {
    const generationConfig = {
      temperature: request.temperature || 0.7,
      maxOutputTokens: request.maxOutputTokens || 8192,
      topP: request.topP || 0.8,
      topK: request.topK || 40,
    };

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
      generationConfig,
    });

    const response = result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      text,
      usage: {
        promptTokens: response.usageMetadata?.promptTokenCount || 0,
        candidatesTokens: response.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: response.usageMetadata?.totalTokenCount || 0,
      },
    };
  } catch (error) {
    console.error('Vertex AI Error:', error);
    throw new Error(`Vertex AI generation failed: ${error}`);
  }
}

/**
 * Generate business analytics using Vertex AI
 */
export async function generateBusinessAnalytics(
  dataSnapshot: any,
  analysisType: 'comprehensive' | 'hr' | 'finance' | 'stock' | 'bookings' = 'comprehensive'
): Promise<string> {
  const systemContext = `You are an expert business analyst with deep expertise in ${analysisType} analytics. 
Analyze the provided business data and generate actionable insights.`;

  const prompt = `${systemContext}

Business Data Analysis Request:
Analysis Type: ${analysisType}
Data Size: ${JSON.stringify(dataSnapshot).length} characters

Data Snapshot:
${JSON.stringify(dataSnapshot, null, 2)}

Please provide a comprehensive analysis including:
1. Executive Summary
2. Key Performance Indicators
3. Trends and Patterns
4. Strategic Insights
5. Actionable Recommendations
6. Risk Assessment

Format the response in clear sections with bullet points and specific metrics where applicable.`;

  const response = await generateContent({
    prompt,
    temperature: 0.3, // Lower temperature for more factual analysis
    maxOutputTokens: 4096,
  });

  return response.text;
}

/**
 * Generate HR-specific insights
 */
export async function generateHRInsights(hrData: any): Promise<string> {
  const prompt = `Analyze this HR data and provide insights on:
- Employee performance trends
- Attendance patterns
- Training effectiveness
- Turnover analysis
- Recruitment metrics
- Payroll optimization opportunities

HR Data: ${JSON.stringify(hrData, null, 2)}`;

  const response = await generateContent({
    prompt,
    temperature: 0.2,
    maxOutputTokens: 2048,
  });

  return response.text;
}

/**
 * Generate cross-module correlation analysis
 */
export async function analyzeCrossModuleCorrelations(
  hrData: any,
  stockData: any,
  financeData: any,
  bookingsData: any
): Promise<string> {
  const prompt = `Analyze correlations between these business modules and identify:
- How employee performance affects sales/bookings
- Inventory impact on financial performance
- Booking patterns correlation with staffing levels
- Cross-functional optimization opportunities

HR Data: ${JSON.stringify(hrData, null, 2)}
Stock Data: ${JSON.stringify(stockData, null, 2)}
Finance Data: ${JSON.stringify(financeData, null, 2)}
Bookings Data: ${JSON.stringify(bookingsData, null, 2)}`;

  const response = await generateContent({
    prompt,
    temperature: 0.4,
    maxOutputTokens: 3072,
  });

  return response.text;
}

export default {
  generateContent,
  generateBusinessAnalytics,
  generateHRInsights,
  analyzeCrossModuleCorrelations,
};

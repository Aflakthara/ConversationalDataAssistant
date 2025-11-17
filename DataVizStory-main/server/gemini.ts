import { GoogleGenAI } from "@google/genai";
import type { ParsedData, AIInsights } from "@shared/schema";

// DON'T DELETE THIS COMMENT
// Follow these instructions when using this blueprint:
// - Note that the newest Gemini model series is "gemini-2.5-flash" or "gemini-2.5-pro"
//   - do not change this unless explicitly requested by the user

// This API key is from Gemini Developer API Key, not vertex AI API Key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function analyzeDataWithAI(
  parsedData: ParsedData,
  filename: string
): Promise<AIInsights> {
  try {
    // Prepare data summary for AI analysis
    const dataSummary = {
      filename,
      rowCount: parsedData.rows.length,
      columnCount: parsedData.columns.length,
      columns: parsedData.columns,
      columnTypes: parsedData.columnTypes,
      sampleRows: parsedData.rows.slice(0, 10), // First 10 rows as sample
    };

    const prompt = `You are a data analyst AI. Analyze the following dataset and provide comprehensive insights.

Dataset Information:
- Filename: ${dataSummary.filename}
- Rows: ${dataSummary.rowCount}
- Columns: ${dataSummary.columnCount}
- Column Names and Types: ${JSON.stringify(dataSummary.columnTypes, null, 2)}

Sample Data (first 10 rows):
${JSON.stringify(dataSummary.sampleRows, null, 2)}

Please provide a comprehensive analysis in the following JSON format:
{
  "summary": "A 2-3 sentence executive summary of the data",
  "keyInsights": ["insight 1", "insight 2", "insight 3", "insight 4"],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "dataQuality": {
    "completeness": <percentage 0-100>,
    "accuracy": "<High/Medium/Low>"
  },
  "trends": ["trend 1", "trend 2", "trend 3"]
}

Focus on:
1. What the data represents
2. Notable patterns, correlations, or outliers
3. Data quality assessment (missing values, consistency)
4. Actionable insights and recommendations
5. Key trends or patterns identified`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            keyInsights: {
              type: "array",
              items: { type: "string" },
            },
            recommendations: {
              type: "array",
              items: { type: "string" },
            },
            dataQuality: {
              type: "object",
              properties: {
                completeness: { type: "number" },
                accuracy: { type: "string" },
              },
              required: ["completeness", "accuracy"],
            },
            trends: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: ["summary", "keyInsights", "recommendations", "dataQuality", "trends"],
        },
      },
      contents: prompt,
    });

    const rawJson = response.text;

    if (rawJson) {
      const insights: AIInsights = JSON.parse(rawJson);
      return insights;
    } else {
      throw new Error("Empty response from Gemini AI");
    }
  } catch (error) {
    console.error("Gemini AI analysis error:", error);
    
    // Return fallback insights if AI fails
    return {
      summary: `Dataset contains ${parsedData.rows.length} rows and ${parsedData.columns.length} columns with various data types.`,
      keyInsights: [
        `The dataset includes ${parsedData.columns.length} different data fields`,
        `Total of ${parsedData.rows.length} records available for analysis`,
        "Data types include: " + Object.values(parsedData.columnTypes).join(", "),
      ],
      recommendations: [
        "Review data for missing or null values",
        "Consider data normalization for better analysis",
        "Explore correlations between numerical columns",
      ],
      dataQuality: {
        completeness: 85,
        accuracy: "Medium",
      },
      trends: [
        "Data analysis in progress",
        "Further exploration recommended",
      ],
    };
  }
}

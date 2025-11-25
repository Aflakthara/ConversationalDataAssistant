import { GoogleGenAI } from "@google/genai";
import type { ParsedData, AIInsights } from "@shared/schema";
import { extractMetrics } from "./metrics-extractor";

// DON'T DELETE THIS COMMENT
// Follow these instructions when using this blueprint:
// - Note that the newest Gemini model series is "gemini-2.5-flash" or "gemini-2.5-pro"
//  - do not change this unless explicitly requested by the user

// This API key is from Gemini Developer API Key, not vertex AI API Key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// +++ NEW +++
/**
 * Defines the structure for our calculated data statistics.
 */
interface DataStatistics {
  overallCompleteness: number;
  missingPerColumn: Record<string, number>;
  numericalStats: Record<string, {
    min: number;
    max: number;
    mean: number;
    median: number;
    sum: number;
    count: number;
  }>;
  categoricalStats: Record<string, {
    uniqueCount: number;
    topValues: Record<string, number>;
  }>;
}

// +++ NEW +++
/**
 * Calculates comprehensive statistics for the entire dataset.
 * This is the key to providing the AI with full context.
 */
function calculateDataSummary(parsedData: ParsedData): DataStatistics {
  const { rows, columns, columnTypes } = parsedData;
  const rowCount = rows.length;

  const stats: DataStatistics = {
    overallCompleteness: 0,
    missingPerColumn: {},
    numericalStats: {},
    categoricalStats: {},
  };

  let totalCells = 0;
  let missingCells = 0;

  for (const col of columns) {
    const colType = columnTypes[col];
    stats.missingPerColumn[col] = 0;

    const values: any[] = [];
    
    for (const row of rows) {
      const value = row[col];
      totalCells++;

      if (value === null || value === undefined || value === "") {
        stats.missingPerColumn[col]++;
        missingCells++;
      } else {
        values.push(value);
      }
    }

    if (colType === "number") {
      const numbers = values.map(Number).filter(n => !isNaN(n));
      if (numbers.length > 0) {
        numbers.sort((a, b) => a - b);
        const sum = numbers.reduce((a, b) => a + b, 0);
        const mean = sum / numbers.length;
        const median = numbers.length % 2 === 0
          ? (numbers[numbers.length / 2 - 1] + numbers[numbers.length / 2]) / 2
          : numbers[Math.floor(numbers.length / 2)];
        
        stats.numericalStats[col] = {
          min: numbers[0],
          max: numbers[numbers.length - 1],
          mean: parseFloat(mean.toFixed(2)),
          median: median,
          sum: parseFloat(sum.toFixed(2)),
          count: numbers.length,
        };
      }
    } else { // Treat 'string', 'date', etc., as categorical for this summary
      const frequencies: Record<string, number> = {};
      for (const val of values) {
        const key = String(val);
        frequencies[key] = (frequencies[key] || 0) + 1;
      }
      
      const uniqueCount = Object.keys(frequencies).length;
      
      // Get top 10 most frequent values
      const topValues = Object.entries(frequencies)
        .sort(([, countA], [, countB]) => countB - countA)
        .slice(0, 10)
        .reduce((acc, [val, count]) => {
          acc[val] = count;
          return acc;
        }, {} as Record<string, number>);

      stats.categoricalStats[col] = {
        uniqueCount,
        topValues,
      };
    }
  }

  stats.overallCompleteness = totalCells > 0 
    ? parseFloat((((totalCells - missingCells) / totalCells) * 100).toFixed(2))
    : 100;

  return stats;
}


export async function analyzeDataWithAI(
  parsedData: ParsedData,
  filename: string
): Promise<AIInsights> {
  // Calculate comprehensive statistics and metrics
  const stats = calculateDataSummary(parsedData);
  const metrics = extractMetrics(parsedData);

  try {
    // Prepare enhanced data summary for AI analysis
    const dataSummary = {
      filename,
      rowCount: parsedData.rows.length,
      columnCount: parsedData.columns.length,
      columns: parsedData.columns,
      columnTypes: parsedData.columnTypes,
      sampleRows: parsedData.rows.slice(0, 15), // More sample rows for context
    };

    // Build detailed column analysis
    const columnAnalysis = parsedData.columns.map(col => {
      const colType = parsedData.columnTypes[col];
      const colMetrics = metrics.columnMetrics[col];
      const analysis: any = {
        name: col,
        type: colType,
        missingPercentage: colMetrics.nullPercentage,
        uniqueValues: colMetrics.uniqueCount,
      };

      if (colType === 'number' && colMetrics.mean !== undefined) {
        analysis.statistics = {
          min: colMetrics.min,
          max: colMetrics.max,
          mean: colMetrics.mean,
          median: colMetrics.median,
          stdDev: colMetrics.stdDev,
          sum: colMetrics.sum,
        };
        // Calculate skewness indicator
        if (colMetrics.mean && colMetrics.median) {
          const skew = (colMetrics.mean - colMetrics.median) / (colMetrics.stdDev || 1);
          analysis.skewness = Math.abs(skew) > 0.5 ? (skew > 0 ? 'right-skewed' : 'left-skewed') : 'normal';
        }
      } else if (colType === 'string' && colMetrics.topValues) {
        analysis.topValues = colMetrics.topValues.slice(0, 5);
        analysis.dominance = colMetrics.topValues[0]?.percentage || 0;
      }

      return analysis;
    });

    // Build correlation insights
    const correlationInsights: string[] = [];
    if (metrics.correlations) {
      for (const [col1, corrs] of Object.entries(metrics.correlations)) {
        for (const [col2, corr] of Object.entries(corrs)) {
          if (col1 < col2 && Math.abs(corr) > 0.5) {
            const strength = Math.abs(corr) > 0.8 ? 'strong' : Math.abs(corr) > 0.6 ? 'moderate' : 'weak';
            const direction = corr > 0 ? 'positive' : 'negative';
            correlationInsights.push(`${col1} and ${col2} have a ${strength} ${direction} correlation (${corr.toFixed(2)})`);
          }
        }
      }
    }

    // Enhanced prompt with more context and structure
    const prompt = `You are an expert data analyst and business intelligence consultant. Analyze this dataset deeply and provide actionable, insightful analysis.

DATASET OVERVIEW:
- Filename: ${dataSummary.filename}
- Total Records: ${dataSummary.rowCount.toLocaleString()}
- Total Columns: ${dataSummary.columnCount}
- Data Completeness: ${stats.overallCompleteness}%

COLUMN DETAILED ANALYSIS:
${JSON.stringify(columnAnalysis, null, 2)}

CORRELATION INSIGHTS:
${correlationInsights.length > 0 ? correlationInsights.join('\n') : 'No significant correlations detected'}

KEY METRICS INSIGHTS:
${metrics.keyInsights.join('\n')}

SAMPLE DATA (first 15 rows for context):
${JSON.stringify(dataSummary.sampleRows, null, 2)}

---
YOUR TASK: Provide a comprehensive, business-focused analysis in JSON format.

REQUIREMENTS FOR INSIGHTS:
1. **Be Specific**: Use actual numbers, percentages, and column names from the data
2. **Be Actionable**: Provide insights that can drive business decisions
3. **Identify Patterns**: Look for anomalies, trends, distributions, and relationships
4. **Assess Impact**: Explain what the findings mean for business operations
5. **Prioritize**: Focus on the most significant findings first

EXAMPLE OF GOOD INSIGHTS:
- "Revenue shows significant right-skewness (mean $45,000 vs median $28,000), indicating 20% of transactions drive 60% of revenue - focus on high-value customer segment"
- "Customer region is highly concentrated: 'North America' represents 68% of all records, suggesting potential market expansion opportunities in other regions"
- "Strong positive correlation (0.87) between 'Marketing Spend' and 'Sales' suggests marketing ROI is effective and scalable"

EXAMPLE OF BAD INSIGHTS (AVOID):
- "The data has some columns" (too vague)
- "There are numbers in the dataset" (not actionable)
- "Data quality is good" (not specific)

JSON FORMAT:
{
  "summary": "A compelling 3-4 sentence executive summary that identifies what this dataset represents, its primary purpose, and the most critical finding. Make it engaging and informative.",
  "keyInsights": [
    "Specific, quantified insight with business implications (minimum 5 insights, maximum 8)",
    "Each insight should be 1-2 sentences, include numbers/percentages, and explain 'so what'",
    "Focus on: outliers, distributions, patterns, correlations, data quality issues, business opportunities"
  ],
  "recommendations": [
    "Actionable recommendation 1 - specific action to take based on insights",
    "Actionable recommendation 2 - what to investigate or optimize",
    "Actionable recommendation 3 - strategic next steps (minimum 3, maximum 5)"
  ],
  "dataQuality": {
    "completeness": ${stats.overallCompleteness},
    "accuracy": "High/Medium/Low - assess based on missing data patterns, outliers, and data consistency"
  },
  "trends": [
    "Identified trend 1 - what patterns emerge over time or across categories",
    "Identified trend 2 - distribution patterns or concentration",
    "Identified trend 3 - growth, decline, or stability patterns (minimum 3, maximum 5)"
  ]
}

CRITICAL: Make your insights specific, quantified, and business-relevant. Avoid generic statements.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        responseMimeType: "application/json",
        // The schema remains the same, which is good
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
      
      // --- MODIFIED ---
      // We override the AI's completeness value with our *actual* calculated one
      // to ensure 100% accuracy on this metric.
      insights.dataQuality.completeness = stats.overallCompleteness;
      
      return insights;
    } else {
      throw new Error("Empty response from Gemini AI");
    }
  } catch (error) {
    console.error("Gemini AI analysis error:", error);
    
    // --- MODIFIED ---
    // Calculate stats even for the fallback to provide better default info
    const fallbackStats = calculateDataSummary(parsedData); 

    // Return fallback insights if AI fails
    return {
      summary: `Dataset contains ${parsedData.rows.length} rows and ${parsedData.columns.length} columns.`,
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
        completeness: fallbackStats.overallCompleteness,
        accuracy: metrics.keyInsights.length > 0 ? "Medium" : "High",
      },
      trends: metrics.keyInsights.slice(0, 3).length > 0 
        ? metrics.keyInsights.slice(0, 3)
        : [
            "Dataset contains structured data ready for analysis",
            "Multiple data types present indicating rich information",
            "Further statistical analysis recommended",
          ],
    };
  }
}

export async function answerDataQuestion(
  parsedData: ParsedData,
  question: string
): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is not set. Please configure your API key in Replit Secrets.");
  }
  
  // Calculate the full data statistics and metrics
  const stats = calculateDataSummary(parsedData);
  const metrics = extractMetrics(parsedData);

  try {
    // Filter out columns with bad names for better context
    const validColumns = parsedData.columns.filter(col => 
      !/^empty\d+$/i.test(col) && 
      !/^column\d+$/i.test(col) &&
      col.trim() !== ''
    );
    
    // Build column description with types
    const columnDescriptions = validColumns.map(col => {
      const type = parsedData.columnTypes[col];
      const colMetrics = metrics.columnMetrics[col];
      let desc = `"${col}" (${type})`;
      if (colMetrics) {
        if (type === 'number' && colMetrics.mean !== undefined) {
          desc += ` - Range: ${colMetrics.min} to ${colMetrics.max}, Mean: ${colMetrics.mean}`;
        } else if (type === 'string' && colMetrics.topValues && colMetrics.topValues.length > 0) {
          desc += ` - Top value: "${colMetrics.topValues[0].value}" (${colMetrics.topValues[0].percentage}%)`;
        }
      }
      return desc;
    }).join('\n');

    const dataSummary = {
      columns: validColumns.length > 0 ? validColumns : parsedData.columns,
      columnTypes: parsedData.columnTypes,
      rowCount: parsedData.rows.length,
      sampleRows: parsedData.rows.slice(0, 25), // More sample rows for better context
    };

    // Enhanced prompt with better column context
    const prompt = `You are a data analysis assistant. Answer the following question about the dataset using ONLY the information provided.

DATASET OVERVIEW:
- Total Rows: ${dataSummary.rowCount.toLocaleString()}
- Total Columns: ${dataSummary.columns.length}

COLUMN INFORMATION:
${columnDescriptions}

STATISTICAL SUMMARY (calculated from ALL ${dataSummary.rowCount} rows):
- Missing Values per Column: ${JSON.stringify(stats.missingPerColumn, null, 2)}
- Numerical Column Statistics: ${JSON.stringify(stats.numericalStats, null, 2)}
- Categorical Column Statistics: ${JSON.stringify(stats.categoricalStats, null, 2)}

KEY METRICS INSIGHTS:
${metrics.keyInsights.slice(0, 5).join('\n')}

SAMPLE DATA (first 25 rows for context):
${JSON.stringify(dataSummary.sampleRows, null, 2)}

---
USER QUESTION: ${question}

INSTRUCTIONS:
1. **Use Column Names Correctly**: Reference columns by their actual names from the COLUMN INFORMATION section above. If a column name seems generic (like "Column_1"), still use it but explain what it represents based on the data.

2. **Prioritize Statistical Summary**: For questions about totals, averages, counts, min/max, or overall properties, use the 'numericalStats' or 'categoricalStats' from the STATISTICAL SUMMARY.

3. **Use Categorical Stats**: For questions about categories, distributions, or "what are the top X", use 'categoricalStats' which shows top values and their counts.

4. **Sample Data for Examples**: Only use the Sample Data for specific row examples or to understand data structure.

5. **Be Specific**: Include actual numbers, percentages, and column names in your answer. Reference the exact column names from the dataset.

6. **Handle Ambiguity**: If column names are unclear (like "Column_1"), infer their meaning from the data values and statistical patterns.

7. **If Information Missing**: If the question can't be answered with the provided data, clearly state what information is missing and what you can tell them instead.

Provide a clear, helpful answer with specific numbers and column references:`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text || "I couldn't generate an answer. Please try rephrasing your question.";
  } catch (error) {
    console.error("Data chat error:", error);
    return "Sorry, I encountered an error processing your question. Please try again with a different question.";
  }
}
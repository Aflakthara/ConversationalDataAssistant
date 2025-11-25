/**
 * ML-Based Chart Recommendation System
 * Uses feature extraction and machine learning to recommend optimal chart types
 */

import type { ParsedData, ChartConfig } from "@shared/schema";

// Chart type options
export type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'area';

// Features extracted from data for ML model
export interface DataFeatures {
  // Column statistics
  numNumericColumns: number;
  numStringColumns: number;
  numDateColumns: number;
  numBooleanColumns: number;
  totalColumns: number;
  totalRows: number;
  
  // Data characteristics
  hasTimeSeries: boolean;
  hasCategoricalData: boolean;
  hasMultipleMetrics: boolean;
  dataCompleteness: number;
  
  // Distribution characteristics
  uniqueValueRatio: number; // Average unique values / total rows per column
  valueRange: number; // Max - Min for numeric columns
  valueVariance: number; // Variance across numeric columns
  
  // Column name patterns (heuristics)
  hasDateKeywords: boolean;
  hasTimeKeywords: boolean;
  hasCategoryKeywords: boolean;
  hasMetricKeywords: boolean;
}

// Chart recommendation with confidence score
export interface ChartRecommendation {
  chartType: ChartType;
  confidence: number;
  xAxis?: string;
  yAxis?: string;
  dataKey?: string;
  title: string;
  reasoning: string;
}

/**
 * Extract features from parsed data for ML model
 */
export function extractFeatures(parsedData: ParsedData): DataFeatures {
  const { columns, rows, columnTypes } = parsedData;
  
  const numericColumns = columns.filter(col => columnTypes[col] === 'number');
  const stringColumns = columns.filter(col => columnTypes[col] === 'string');
  const dateColumns = columns.filter(col => columnTypes[col] === 'date');
  const booleanColumns = columns.filter(col => columnTypes[col] === 'boolean');
  
  // Calculate unique value ratios
  const uniqueRatios: number[] = [];
  for (const col of columns) {
    const uniqueValues = new Set(rows.map(row => String(row[col] || '')));
    uniqueRatios.push(uniqueValues.size / Math.max(rows.length, 1));
  }
  const avgUniqueRatio = uniqueRatios.reduce((a, b) => a + b, 0) / uniqueRatios.length;
  
  // Calculate value range and variance for numeric columns
  let valueRange = 0;
  let valueVariance = 0;
  if (numericColumns.length > 0) {
    const ranges: number[] = [];
    const variances: number[] = [];
    
    for (const col of numericColumns) {
      const values = rows
        .map(row => Number(row[col]))
        .filter(v => !isNaN(v));
      
      if (values.length > 0) {
        const min = Math.min(...values);
        const max = Math.max(...values);
        ranges.push(max - min);
        
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
        variances.push(variance);
      }
    }
    
    valueRange = ranges.length > 0 ? ranges.reduce((a, b) => a + b, 0) / ranges.length : 0;
    valueVariance = variances.length > 0 ? variances.reduce((a, b) => a + b, 0) / variances.length : 0;
  }
  
  // Check for time series patterns
  const hasTimeSeries = dateColumns.length > 0 || 
    columns.some(col => 
      /date|time|year|month|day|week|quarter/i.test(col)
    );
  
  // Check for categorical data
  const hasCategoricalData = stringColumns.length > 0 && 
    stringColumns.some(col => {
      const uniqueCount = new Set(rows.map(row => String(row[col] || ''))).size;
      return uniqueCount < rows.length * 0.5; // Less than 50% unique values
    });
  
  // Calculate data completeness
  let totalCells = 0;
  let filledCells = 0;
  for (const row of rows) {
    for (const col of columns) {
      totalCells++;
      if (row[col] !== null && row[col] !== undefined && row[col] !== '') {
        filledCells++;
      }
    }
  }
  const dataCompleteness = totalCells > 0 ? filledCells / totalCells : 1;
  
  // Keyword detection
  const columnNamesLower = columns.map(c => c.toLowerCase());
  const hasDateKeywords = columnNamesLower.some(name => 
    /date|time|year|month|day|week|quarter|period/i.test(name)
  );
  const hasTimeKeywords = columnNamesLower.some(name => 
    /time|hour|minute|second|timestamp/i.test(name)
  );
  const hasCategoryKeywords = columnNamesLower.some(name => 
    /category|type|class|group|status|label|name/i.test(name)
  );
  const hasMetricKeywords = columnNamesLower.some(name => 
    /value|amount|price|cost|revenue|sales|count|total|sum|avg|average|metric|score|rating/i.test(name)
  );
  
  return {
    numNumericColumns: numericColumns.length,
    numStringColumns: stringColumns.length,
    numDateColumns: dateColumns.length,
    numBooleanColumns: booleanColumns.length,
    totalColumns: columns.length,
    totalRows: rows.length,
    hasTimeSeries,
    hasCategoricalData,
    hasMultipleMetrics: numericColumns.length > 1,
    dataCompleteness,
    uniqueValueRatio: avgUniqueRatio,
    valueRange,
    valueVariance,
    hasDateKeywords,
    hasTimeKeywords,
    hasCategoryKeywords,
    hasMetricKeywords,
  };
}

/**
 * ML-based chart recommendation using rule-based model (can be replaced with trained model)
 * This uses heuristics and feature analysis to recommend charts
 */
export function recommendCharts(
  parsedData: ParsedData,
  features: DataFeatures
): ChartRecommendation[] {
  const { columns, rows, columnTypes } = parsedData;
  const recommendations: ChartRecommendation[] = [];
  
  const numericColumns = columns.filter(col => columnTypes[col] === 'number');
  const stringColumns = columns.filter(col => columnTypes[col] === 'string');
  const dateColumns = columns.filter(col => columnTypes[col] === 'date');
  
  // Recommendation 1: Bar Chart
  // Best for: Categorical data with numeric metrics (HIGHEST PRIORITY)
  if (features.hasCategoricalData && features.numNumericColumns > 0) {
    // Filter out identifier columns
    const goodStringColumns = stringColumns.filter(col => !isIdentifierColumn(col));
    const goodNumericColumns = numericColumns.filter(col => !isIdentifierColumn(col));
    
    // Find best categorical column (not too many unique values, not too few)
    const categoryCol = goodStringColumns.find(col => {
      const uniqueCount = new Set(rows.map(r => String(r[col] || ''))).size;
      // Prefer columns with 2-20 unique values for bar charts
      return uniqueCount >= 2 && uniqueCount <= 20 && uniqueCount < rows.length * 0.7;
    }) || goodStringColumns.find(col => {
      const uniqueCount = new Set(rows.map(r => String(r[col] || ''))).size;
      return uniqueCount > 1;
    }) || stringColumns.find(col => {
      const uniqueCount = new Set(rows.map(r => String(r[col] || ''))).size;
      return uniqueCount >= 2 && uniqueCount <= 20 && uniqueCount < rows.length * 0.7;
    }) || stringColumns[0];
    
    // Find best numeric column (prefer columns with meaningful names, not "empty1" or identifiers)
    const valueCol = goodNumericColumns.find(col => 
      !/^empty\d+$/i.test(col) && 
      !/^column\d+$/i.test(col)
    ) || numericColumns.find(col => 
      !/^empty\d+$/i.test(col) && 
      !/^column\d+$/i.test(col)
    ) || numericColumns[0];
    
    if (categoryCol && valueCol && 
        !isIdentifierColumn(categoryCol) &&
        !isIdentifierColumn(valueCol) &&
        !/^empty\d+$/i.test(categoryCol) && 
        !/^column\d+$/i.test(categoryCol)) {
      recommendations.push({
        chartType: 'bar',
        confidence: 0.95, // Higher confidence - bar charts are preferred
        xAxis: categoryCol,
        yAxis: valueCol,
        title: `${valueCol} by ${categoryCol}`,
        reasoning: 'Categorical data with numeric metrics - ideal for bar charts showing comparisons',
      });
    }
  }
  
  // Recommendation 2: Line Chart
  // Best for: Time series or sequential numeric data
  if (features.hasTimeSeries && features.numNumericColumns > 0) {
    const goodNumericColumns = numericColumns.filter(col => !isIdentifierColumn(col));
    const timeCol = dateColumns[0] || columns.find(col => 
      /date|time|year|month|day|week|quarter/i.test(col) && !isIdentifierColumn(col)
    ) || goodNumericColumns[0] || numericColumns[0];
    const valueCol = goodNumericColumns.find(col => col !== timeCol) || 
                     numericColumns.find(col => col !== timeCol && !isIdentifierColumn(col)) || 
                     numericColumns[0];
    
    if (timeCol && valueCol && !isIdentifierColumn(valueCol)) {
      recommendations.push({
        chartType: 'line',
        confidence: 0.95,
        xAxis: timeCol,
        yAxis: valueCol,
        title: `${valueCol} over Time`,
        reasoning: 'Time series data detected - line chart shows trends over time',
      });
    }
  } else if (features.numNumericColumns >= 2 && features.totalRows > 10) {
    // Sequential numeric data - use good columns
    const goodNumericColumns = numericColumns.filter(col => !isIdentifierColumn(col));
    if (goodNumericColumns.length >= 2) {
      recommendations.push({
        chartType: 'line',
        confidence: 0.75,
        xAxis: goodNumericColumns[0],
        yAxis: goodNumericColumns[1],
        title: `${goodNumericColumns[1]} vs ${goodNumericColumns[0]}`,
        reasoning: 'Multiple numeric columns with sufficient data points for trend analysis',
      });
    } else if (numericColumns.length >= 2) {
      // Fallback if not enough good columns
      recommendations.push({
        chartType: 'line',
        confidence: 0.65,
        xAxis: numericColumns[0],
        yAxis: numericColumns[1],
        title: `${numericColumns[1]} vs ${numericColumns[0]}`,
        reasoning: 'Multiple numeric columns with sufficient data points for trend analysis',
      });
    }
  }
  
  // Recommendation 3: Pie Chart
  // Best for: Single categorical column with distribution (but lower priority than bar charts)
  // Only recommend pie if we don't have good bar chart options
  if (features.hasCategoricalData && stringColumns.length > 0 && numericColumns.length === 0) {
    const goodStringColumns = stringColumns.filter(col => !isIdentifierColumn(col));
    const categoryCol = goodStringColumns.find(col => {
      const uniqueCount = new Set(rows.map(r => String(r[col] || ''))).size;
      return uniqueCount >= 2 && uniqueCount <= 10; // 2-10 categories ideal for pie (reduced from 15)
    }) || stringColumns.find(col => {
      const uniqueCount = new Set(rows.map(r => String(r[col] || ''))).size;
      return uniqueCount >= 2 && uniqueCount <= 10 && !isIdentifierColumn(col);
    }) || stringColumns[0];
    
    if (categoryCol && !isIdentifierColumn(categoryCol)) {
      const uniqueCount = new Set(rows.map(r => String(r[categoryCol] || ''))).size;
      // Only recommend pie if we have 2-10 categories AND no numeric columns for bar charts
      if (uniqueCount >= 2 && uniqueCount <= 10 && numericColumns.length === 0) {
        recommendations.push({
          chartType: 'pie',
          confidence: 0.65, // Lower confidence - prefer bar charts when possible
          dataKey: 'value',
          title: `Distribution of ${categoryCol}`,
          reasoning: `Categorical distribution with ${uniqueCount} categories - suitable for pie chart`,
        });
      }
    }
  }
  
  // Recommendation 4: Scatter Plot
  // Best for: Correlation analysis between two numeric variables
  if (features.numNumericColumns >= 2 && features.totalRows >= 20) {
    const goodNumericColumns = numericColumns.filter(col => !isIdentifierColumn(col));
    if (goodNumericColumns.length >= 2) {
      recommendations.push({
        chartType: 'scatter',
        confidence: 0.8,
        xAxis: goodNumericColumns[0],
        yAxis: goodNumericColumns[1],
        title: `${goodNumericColumns[0]} vs ${goodNumericColumns[1]}`,
        reasoning: 'Two numeric variables with sufficient data points - ideal for correlation analysis',
      });
    } else if (numericColumns.length >= 2) {
      // Fallback if not enough good columns
      recommendations.push({
        chartType: 'scatter',
        confidence: 0.6,
        xAxis: numericColumns[0],
        yAxis: numericColumns[1],
        title: `${numericColumns[0]} vs ${numericColumns[1]}`,
        reasoning: 'Two numeric variables with sufficient data points - ideal for correlation analysis',
      });
    }
  }
  
  // Recommendation 5: Area Chart
  // Best for: Time series with cumulative or stacked data
  if (features.hasTimeSeries && features.numNumericColumns > 0) {
    const goodNumericColumns = numericColumns.filter(col => !isIdentifierColumn(col));
    const timeCol = dateColumns[0] || columns.find(col => 
      /date|time|year|month|day/i.test(col) && !isIdentifierColumn(col)
    );
    const valueCol = goodNumericColumns[0] || numericColumns[0];
    
    if (timeCol && valueCol && !isIdentifierColumn(valueCol)) {
      recommendations.push({
        chartType: 'area',
        confidence: 0.7,
        xAxis: timeCol,
        yAxis: valueCol,
        title: `${valueCol} Trend (Area)`,
        reasoning: 'Time series data - area chart emphasizes volume and trends',
      });
    }
  }
  
  // Sort by confidence (highest first)
  return recommendations.sort((a, b) => b.confidence - a.confidence);
}

/**
 * A list of common identifier names.
 * We'll use this to AVOID plotting these columns as values.
 */
const IDENTIFIER_PATTERNS = [
  /^sl_?no$/i,
  /^id$/i,
  /_id$/i,
  /^serial_?no/i,
  /^index$/i,
];

/**
 * Checks if a column name looks like a useless identifier.
 */
function isIdentifierColumn(columnName: string): boolean {
  return IDENTIFIER_PATTERNS.some(pattern => pattern.test(columnName));
}

/**
 * Generate a specific chart type with given axes
 */
export function generateChart(
  parsedData: ParsedData,
  chartType: ChartType,
  xAxis?: string,
  yAxis?: string,
  dataKey?: string
): ChartConfig | null {
  const { columns, rows, columnTypes } = parsedData;
  const numericColumns = columns.filter(col => columnTypes[col] === 'number');
  const stringColumns = columns.filter(col => columnTypes[col] === 'string');
  
  // --- SMART FILTERING ---
  // Filter out columns that look like identifiers!
  const goodNumericColumns = numericColumns.filter(
    col => !isIdentifierColumn(col)
  );
  const goodStringColumns = stringColumns.filter(
    col => !isIdentifierColumn(col)
  );
  
  let data: any[] = [];
  let title = '';
  let finalXAxis = xAxis;
  let finalYAxis = yAxis;
  let finalDataKey = dataKey;
  
  if (chartType === 'bar') {
    // Bar chart needs categorical x-axis and numeric y-axis
    if (!finalXAxis) {
      // Use goodStringColumns first, fallback to stringColumns if needed
      finalXAxis = goodStringColumns.find(col => 
        !/^empty\d+$/i.test(col) && 
        !/^column\d+$/i.test(col)
      ) || stringColumns.find(col => 
        !/^empty\d+$/i.test(col) && 
        !/^column\d+$/i.test(col)
      ) || stringColumns[0];
    }
    if (!finalYAxis) {
      // Use goodNumericColumns first, fallback to numericColumns if needed
      finalYAxis = goodNumericColumns.find(col => 
        !/^empty\d+$/i.test(col) && 
        !/^column\d+$/i.test(col)
      ) || numericColumns.find(col => 
        !/^empty\d+$/i.test(col) && 
        !/^column\d+$/i.test(col)
      ) || numericColumns[0];
    }
    
    if (!finalXAxis || !finalYAxis) return null;
    
    const aggregated: Record<string, number[]> = {};
    for (const row of rows) {
      const category = String(row[finalXAxis] || 'Unknown').trim();
      const value = Number(row[finalYAxis]) || 0;
      if (!aggregated[category]) aggregated[category] = [];
      aggregated[category].push(value);
    }
    
    data = Object.entries(aggregated)
      .map(([category, values]) => ({
        [finalXAxis!]: category,
        [finalYAxis!]: values.reduce((a, b) => a + b, 0) / values.length,
      }))
      .slice(0, 20);
    
    title = `${finalYAxis} by ${finalXAxis}`;
    
  } else if (chartType === 'pie') {
    // Pie chart needs categorical column
    if (!finalXAxis) {
      // Use goodStringColumns first, fallback to stringColumns if needed
      finalXAxis = goodStringColumns.find(col => 
        !/^empty\d+$/i.test(col) && 
        !/^column\d+$/i.test(col)
      ) || stringColumns.find(col => 
        !/^empty\d+$/i.test(col) && 
        !/^column\d+$/i.test(col)
      ) || stringColumns[0];
    }
    
    if (!finalXAxis) return null;
    
    const counts: Record<string, number> = {};
    for (const row of rows) {
      const value = String(row[finalXAxis] || 'Unknown').trim();
      if (value && value !== 'Unknown') {
        counts[value] = (counts[value] || 0) + 1;
      }
    }
    
    data = Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);
    
    finalDataKey = 'value';
    title = `Distribution of ${finalXAxis}`;
    
  } else if (chartType === 'scatter' || chartType === 'line') {
    // Scatter and line charts need numeric x and y axes
    if (!finalXAxis) {
      // Use goodNumericColumns first, fallback to numericColumns if needed
      finalXAxis = goodNumericColumns.find(col => 
        !/^empty\d+$/i.test(col) && 
        !/^column\d+$/i.test(col)
      ) || numericColumns.find(col => 
        !/^empty\d+$/i.test(col) && 
        !/^column\d+$/i.test(col)
      ) || numericColumns[0];
    }
    if (!finalYAxis) {
      // Use goodNumericColumns first, fallback to numericColumns if needed
      finalYAxis = goodNumericColumns.find(col => 
        col !== finalXAxis &&
        !/^empty\d+$/i.test(col) && 
        !/^column\d+$/i.test(col)
      ) || numericColumns.find(col => 
        col !== finalXAxis &&
        !/^empty\d+$/i.test(col) && 
        !/^column\d+$/i.test(col)
      ) || numericColumns[1] || numericColumns[0];
    }
    
    if (!finalXAxis || !finalYAxis) return null;
    
    data = rows
      .filter(row => {
        const xVal = row[finalXAxis!];
        const yVal = row[finalYAxis!];
        return xVal !== null && 
               yVal !== null && 
               xVal !== undefined && 
               yVal !== undefined &&
               !isNaN(Number(xVal)) && 
               !isNaN(Number(yVal));
      })
      .map(row => ({
        [finalXAxis!]: Number(row[finalXAxis!]),
        [finalYAxis!]: Number(row[finalYAxis!]),
      }))
      .slice(0, chartType === 'scatter' ? 200 : 100);
    
    title = chartType === 'scatter' 
      ? `${finalYAxis} vs ${finalXAxis}`
      : `${finalYAxis} over ${finalXAxis}`;
  }
  
  if (data.length === 0) return null;
  
  return {
    id: `${chartType}-${Date.now()}`,
    type: chartType,
    title,
    xAxis: finalXAxis,
    yAxis: finalYAxis,
    dataKey: finalDataKey,
    data,
  };
}

/**
 * Generate visualizations using ML recommendations - ALWAYS generates all 4 chart types
 */
export function generateMLVisualizations(parsedData: ParsedData): ChartConfig[] {
  const { columns, columnTypes } = parsedData;
  const numericColumns = columns.filter(col => columnTypes[col] === 'number');
  const stringColumns = columns.filter(col => columnTypes[col] === 'string');
  
  // Filter out identifier columns for better chart generation
  const goodNumericColumns = numericColumns.filter(col => !isIdentifierColumn(col));
  const goodStringColumns = stringColumns.filter(col => !isIdentifierColumn(col));
  
  const visualizations: ChartConfig[] = [];
  
  // Always generate all 4 chart types if data allows
  // 1. Bar Chart - needs good categorical and numeric columns
  if (goodStringColumns.length > 0 && goodNumericColumns.length > 0) {
    const barChart = generateChart(parsedData, 'bar');
    if (barChart) visualizations.push(barChart);
  } else if (stringColumns.length > 0 && numericColumns.length > 0) {
    // Fallback if no good columns found
    const barChart = generateChart(parsedData, 'bar');
    if (barChart) visualizations.push(barChart);
  }
  
  // 2. Pie Chart - needs good categorical columns
  if (goodStringColumns.length > 0) {
    const pieChart = generateChart(parsedData, 'pie');
    if (pieChart) visualizations.push(pieChart);
  } else if (stringColumns.length > 0) {
    // Fallback if no good columns found
    const pieChart = generateChart(parsedData, 'pie');
    if (pieChart) visualizations.push(pieChart);
  }
  
  // 3. Scatter Plot - needs at least 2 good numeric columns
  if (goodNumericColumns.length >= 2) {
    const scatterChart = generateChart(parsedData, 'scatter');
    if (scatterChart) visualizations.push(scatterChart);
  } else if (numericColumns.length >= 2) {
    // Fallback if not enough good columns
    const scatterChart = generateChart(parsedData, 'scatter');
    if (scatterChart) visualizations.push(scatterChart);
  }
  
  // 4. Line Chart - needs at least 2 good numeric columns
  if (goodNumericColumns.length >= 2) {
    const lineChart = generateChart(parsedData, 'line');
    if (lineChart) visualizations.push(lineChart);
  } else if (numericColumns.length >= 2) {
    // Fallback if not enough good columns
    const lineChart = generateChart(parsedData, 'line');
    if (lineChart) visualizations.push(lineChart);
  }
  
  return visualizations;
}


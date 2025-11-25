/**
 * Metrics Extractor - Extracts key metrics and statistics from data
 */

import type { ParsedData } from "@shared/schema";

export interface ExtractedMetrics {
  // Basic statistics
  rowCount: number;
  columnCount: number;
  dataCompleteness: number;
  
  // Column-level metrics
  columnMetrics: Record<string, {
    type: string;
    nullCount: number;
    nullPercentage: number;
    uniqueCount: number;
    // For numeric columns
    min?: number;
    max?: number;
    mean?: number;
    median?: number;
    stdDev?: number;
    sum?: number;
    // For categorical columns
    topValues?: Array<{ value: string; count: number; percentage: number }>;
  }>;
  
  // Cross-column metrics
  correlations?: Record<string, Record<string, number>>;
  keyInsights: string[];
}

/**
 * Extract comprehensive metrics from parsed data
 */
export function extractMetrics(parsedData: ParsedData): ExtractedMetrics {
  const { columns, rows, columnTypes } = parsedData;
  
  // Calculate overall completeness
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
  
  // Column-level metrics
  const columnMetrics: ExtractedMetrics['columnMetrics'] = {};
  
  for (const col of columns) {
    const values = rows.map(row => row[col]);
    const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
    const nullCount = values.length - nonNullValues.length;
    const nullPercentage = (nullCount / values.length) * 100;
    const uniqueCount = new Set(nonNullValues.map(String)).size;
    
    const metrics: ExtractedMetrics['columnMetrics'][string] = {
      type: columnTypes[col],
      nullCount,
      nullPercentage: parseFloat(nullPercentage.toFixed(2)),
      uniqueCount,
    };
    
    // Numeric column statistics
    if (columnTypes[col] === 'number') {
      const numbers = nonNullValues
        .map(v => Number(v))
        .filter(n => !isNaN(n));
      
      if (numbers.length > 0) {
        numbers.sort((a, b) => a - b);
        const sum = numbers.reduce((a, b) => a + b, 0);
        const mean = sum / numbers.length;
        const median = numbers.length % 2 === 0
          ? (numbers[numbers.length / 2 - 1] + numbers[numbers.length / 2]) / 2
          : numbers[Math.floor(numbers.length / 2)];
        
        const variance = numbers.reduce((acc, n) => acc + Math.pow(n - mean, 2), 0) / numbers.length;
        const stdDev = Math.sqrt(variance);
        
        metrics.min = numbers[0];
        metrics.max = numbers[numbers.length - 1];
        metrics.mean = parseFloat(mean.toFixed(2));
        metrics.median = parseFloat(median.toFixed(2));
        metrics.stdDev = parseFloat(stdDev.toFixed(2));
        metrics.sum = parseFloat(sum.toFixed(2));
      }
    }
    
    // Categorical column statistics
    if (columnTypes[col] === 'string' && nonNullValues.length > 0) {
      const counts: Record<string, number> = {};
      for (const val of nonNullValues) {
        const key = String(val);
        counts[key] = (counts[key] || 0) + 1;
      }
      
      const topValues = Object.entries(counts)
        .map(([value, count]) => ({
          value,
          count,
          percentage: parseFloat(((count / nonNullValues.length) * 100).toFixed(2)),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      metrics.topValues = topValues;
    }
    
    columnMetrics[col] = metrics;
  }
  
  // Calculate correlations for numeric columns
  const numericColumns = columns.filter(col => columnTypes[col] === 'number');
  const correlations: Record<string, Record<string, number>> = {};
  
  if (numericColumns.length >= 2) {
    for (let i = 0; i < numericColumns.length; i++) {
      for (let j = i + 1; j < numericColumns.length; j++) {
        const col1 = numericColumns[i];
        const col2 = numericColumns[j];
        
        const values1: number[] = [];
        const values2: number[] = [];
        
        for (const row of rows) {
          const v1 = Number(row[col1]);
          const v2 = Number(row[col2]);
          if (!isNaN(v1) && !isNaN(v2)) {
            values1.push(v1);
            values2.push(v2);
          }
        }
        
        if (values1.length > 1) {
          const correlation = calculateCorrelation(values1, values2);
          if (!correlations[col1]) correlations[col1] = {};
          if (!correlations[col2]) correlations[col2] = {};
          correlations[col1][col2] = correlation;
          correlations[col2][col1] = correlation;
        }
      }
    }
  }
  
  // Generate key insights
  const keyInsights: string[] = [];
  
  if (dataCompleteness < 0.8) {
    keyInsights.push(`Data completeness is ${(dataCompleteness * 100).toFixed(1)}% - consider data cleaning`);
  }
  
  for (const [col, metrics] of Object.entries(columnMetrics)) {
    if (metrics.nullPercentage > 20) {
      keyInsights.push(`${col} has ${metrics.nullPercentage.toFixed(1)}% missing values`);
    }
    
    if (metrics.type === 'number' && metrics.stdDev !== undefined && metrics.mean !== undefined) {
      const cv = metrics.stdDev / metrics.mean; // Coefficient of variation
      if (cv > 1) {
        keyInsights.push(`${col} shows high variability (CV: ${cv.toFixed(2)})`);
      }
    }
    
    if (metrics.type === 'string' && metrics.uniqueCount === rows.length) {
      keyInsights.push(`${col} appears to be a unique identifier`);
    }
  }
  
  // Find strong correlations
  for (const [col1, corrs] of Object.entries(correlations)) {
    for (const [col2, corr] of Object.entries(corrs)) {
      if (Math.abs(corr) > 0.7 && col1 < col2) {
        keyInsights.push(`Strong ${corr > 0 ? 'positive' : 'negative'} correlation (${corr.toFixed(2)}) between ${col1} and ${col2}`);
      }
    }
  }
  
  return {
    rowCount: rows.length,
    columnCount: columns.length,
    dataCompleteness: parseFloat((dataCompleteness * 100).toFixed(2)),
    columnMetrics,
    correlations: Object.keys(correlations).length > 0 ? correlations : undefined,
    keyInsights,
  };
}

/**
 * Calculate Pearson correlation coefficient
 */
function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;
  
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  if (denominator === 0) return 0;
  return parseFloat((numerator / denominator).toFixed(3));
}


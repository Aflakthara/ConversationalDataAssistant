/**
 * ML Training Utilities
 * Collects user feedback and training data to improve chart recommendations
 */

import type { ParsedData, ChartConfig } from "@shared/schema";
import { extractFeatures, type DataFeatures, type ChartType } from "./ml-chart-recommender";
import * as fs from "fs";
import * as path from "path";

export interface TrainingSample {
  features: DataFeatures;
  recommendedChart: ChartType;
  userSelectedChart: ChartType;
  userRating: number; // 1-5 rating
  timestamp: Date;
}

const TRAINING_DATA_PATH = path.join(process.cwd(), 'training-data.json');

/**
 * Save training sample to file
 */
export function saveTrainingSample(sample: TrainingSample): void {
  try {
    let trainingData: TrainingSample[] = [];
    
    // Load existing training data
    if (fs.existsSync(TRAINING_DATA_PATH)) {
      const data = fs.readFileSync(TRAINING_DATA_PATH, 'utf-8');
      trainingData = JSON.parse(data);
    }
    
    // Add new sample
    trainingData.push({
      ...sample,
      timestamp: new Date(),
    });
    
    // Save back to file
    fs.writeFileSync(TRAINING_DATA_PATH, JSON.stringify(trainingData, null, 2));
    console.log(`Training sample saved. Total samples: ${trainingData.length}`);
  } catch (error) {
    console.error("Failed to save training sample:", error);
  }
}

/**
 * Load all training samples
 */
export function loadTrainingSamples(): TrainingSample[] {
  try {
    if (!fs.existsSync(TRAINING_DATA_PATH)) {
      return [];
    }
    
    const data = fs.readFileSync(TRAINING_DATA_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to load training samples:", error);
    return [];
  }
}

/**
 * Record user feedback on chart recommendations
 */
export function recordChartFeedback(
  parsedData: ParsedData,
  recommendedChart: ChartConfig,
  userSelectedChart?: ChartType,
  userRating?: number
): void {
  const features = extractFeatures(parsedData);
  
  const sample: TrainingSample = {
    features,
    recommendedChart: recommendedChart.type as ChartType,
    userSelectedChart: userSelectedChart || recommendedChart.type as ChartType,
    userRating: userRating || 3, // Default neutral rating
    timestamp: new Date(),
  };
  
  saveTrainingSample(sample);
}

/**
 * Analyze training data to improve recommendations
 * This can be used to adjust recommendation weights
 */
export function analyzeTrainingData(): {
  totalSamples: number;
  averageRating: number;
  chartTypeAccuracy: Record<ChartType, number>;
  commonPatterns: string[];
} {
  const samples = loadTrainingSamples();
  
  if (samples.length === 0) {
    return {
      totalSamples: 0,
      averageRating: 0,
      chartTypeAccuracy: {} as Record<ChartType, number>,
      commonPatterns: [],
    };
  }
  
  // Calculate average rating
  const averageRating = samples.reduce((sum, s) => sum + s.userRating, 0) / samples.length;
  
  // Calculate accuracy per chart type
  const chartTypeAccuracy: Record<ChartType, { correct: number; total: number }> = {
    bar: { correct: 0, total: 0 },
    line: { correct: 0, total: 0 },
    pie: { correct: 0, total: 0 },
    scatter: { correct: 0, total: 0 },
    area: { correct: 0, total: 0 },
  };
  
  for (const sample of samples) {
    chartTypeAccuracy[sample.recommendedChart].total++;
    if (sample.recommendedChart === sample.userSelectedChart) {
      chartTypeAccuracy[sample.recommendedChart].correct++;
    }
  }
  
  const accuracy: Record<ChartType, number> = {} as Record<ChartType, number>;
  for (const [type, stats] of Object.entries(chartTypeAccuracy)) {
    accuracy[type as ChartType] = stats.total > 0 
      ? stats.correct / stats.total 
      : 0;
  }
  
  // Identify common patterns (simplified)
  const commonPatterns: string[] = [];
  
  // Pattern: High categorical data -> bar chart preference
  const barChartSamples = samples.filter(s => 
    s.userSelectedChart === 'bar' && s.features.hasCategoricalData
  );
  if (barChartSamples.length > samples.length * 0.3) {
    commonPatterns.push("Users prefer bar charts for categorical data with metrics");
  }
  
  // Pattern: Time series -> line chart preference
  const lineChartSamples = samples.filter(s => 
    s.userSelectedChart === 'line' && s.features.hasTimeSeries
  );
  if (lineChartSamples.length > samples.length * 0.3) {
    commonPatterns.push("Users prefer line charts for time series data");
  }
  
  return {
    totalSamples: samples.length,
    averageRating: parseFloat(averageRating.toFixed(2)),
    chartTypeAccuracy: accuracy,
    commonPatterns,
  };
}

/**
 * Export training data for external ML model training
 */
export function exportTrainingDataForML(): {
  features: number[][];
  labels: string[];
} {
  const samples = loadTrainingSamples();
  
  // Convert features to numeric array (simplified feature vector)
  const features: number[][] = [];
  const labels: string[] = [];
  
  for (const sample of samples) {
    const f = sample.features;
    features.push([
      f.numNumericColumns,
      f.numStringColumns,
      f.numDateColumns,
      f.numBooleanColumns,
      f.totalColumns,
      f.totalRows,
      f.hasTimeSeries ? 1 : 0,
      f.hasCategoricalData ? 1 : 0,
      f.hasMultipleMetrics ? 1 : 0,
      f.dataCompleteness,
      f.uniqueValueRatio,
      f.valueRange,
      f.valueVariance,
      f.hasDateKeywords ? 1 : 0,
      f.hasTimeKeywords ? 1 : 0,
      f.hasCategoryKeywords ? 1 : 0,
      f.hasMetricKeywords ? 1 : 0,
    ]);
    labels.push(sample.userSelectedChart);
  }
  
  return { features, labels };
}


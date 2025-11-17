import { z } from "zod";

// Data schema for uploaded files and analysis results

export interface DataFile {
  id: string;
  filename: string;
  fileType: 'csv' | 'xlsx' | 'json';
  uploadedAt: Date;
  rowCount: number;
  columnCount: number;
}

export interface ParsedData {
  columns: string[];
  rows: Record<string, any>[];
  columnTypes: Record<string, 'number' | 'string' | 'date' | 'boolean'>;
}

export interface ChartConfig {
  id: string;
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'area';
  title: string;
  xAxis?: string;
  yAxis?: string;
  dataKey?: string;
  data: any[];
  colors?: string[];
}

export interface AIInsights {
  summary: string;
  keyInsights: string[];
  recommendations: string[];
  dataQuality: {
    completeness: number;
    accuracy: string;
  };
  trends: string[];
}

export interface AnalysisResult {
  file: DataFile;
  parsedData: ParsedData;
  visualizations: ChartConfig[];
  aiInsights: AIInsights;
}

// Zod schemas for validation
export const uploadFileSchema = z.object({
  file: z.any(),
});

export type UploadFileInput = z.infer<typeof uploadFileSchema>;

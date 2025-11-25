/**
 * PDF Parser - Extracts data from PDF files and converts to structured format
 * Uses Gemini API for intelligent extraction, falls back to text parsing if needed
 */

import { GoogleGenAI } from "@google/genai";
import type { ParsedData } from "@shared/schema";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

/**
 * Parse PDF file using Gemini API to extract tabular data
 */
export async function parsePDF(fileBuffer: Buffer): Promise<ParsedData> {
  // First, try using Gemini API for intelligent extraction
  if (process.env.GEMINI_API_KEY) {
    try {
      return await parsePDFWithGemini(fileBuffer);
    } catch (geminiError: any) {
      console.warn("Gemini PDF extraction failed, falling back to text parsing:", geminiError.message);
      // Fall back to text-based parsing
    }
  }
  
  // Fallback to text-based parsing
  return await parsePDFTextBased(fileBuffer);
}

/**
 * Parse PDF using Gemini API - more accurate for complex PDFs
 */
async function parsePDFWithGemini(fileBuffer: Buffer): Promise<ParsedData> {
  try {
    // Convert buffer to base64 for Gemini
    const base64PDF = fileBuffer.toString('base64');
    
    const prompt = `You are an expert data extraction assistant. Analyze this PDF document and extract all tabular data.

Extract all tables, lists, or structured data from the PDF. Return the data as a clean JSON object with this exact structure:

{
  "columns": ["column1", "column2", "column3", ...],
  "rows": [
    {"column1": "value1", "column2": "value2", "column3": "value3", ...},
    {"column1": "value4", "column2": "value5", "column3": "value6", ...}
  ]
}

IMPORTANT RULES:
1. Identify column headers from the first row or header section
2. Extract ALL data rows from tables in the PDF
3. For numeric values, return them as numbers (not strings)
4. For text values, return them as strings
5. If a cell is empty, use null
6. Column names should be clean and descriptive (remove special characters, extra spaces)
7. If you see multiple tables, extract the largest/most important one
8. Only return valid JSON, no additional text or explanation

Return ONLY the JSON object, nothing else.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            columns: {
              type: "array",
              items: { type: "string" },
            },
            rows: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: true,
              },
            },
          },
          required: ["columns", "rows"],
        },
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: "application/pdf",
                data: base64PDF,
              },
            },
            { text: prompt },
          ],
        },
      ],
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("Empty response from Gemini");
    }

    const extracted = JSON.parse(jsonText);
    
    if (!extracted.columns || !Array.isArray(extracted.columns) || extracted.columns.length === 0) {
      throw new Error("No columns extracted from PDF");
    }
    
    if (!extracted.rows || !Array.isArray(extracted.rows) || extracted.rows.length === 0) {
      throw new Error("No rows extracted from PDF");
    }

    // Clean up column names
    const columns = extracted.columns.map((col: string) => {
      const cleaned = String(col || '').trim()
        .replace(/^[#\-\s]+|[#\-\s]+$/g, '')
        .replace(/\s+/g, '_');
      return cleaned || `Column_${extracted.columns.indexOf(col) + 1}`;
    });

    // Clean up rows - ensure all rows have all columns
    const rows = extracted.rows.map((row: any) => {
      const cleanedRow: Record<string, any> = {};
      for (const col of columns) {
        let value = row[col] !== undefined ? row[col] : null;
        
        // Try to convert to number if it looks like a number
        if (value !== null && value !== undefined && value !== '') {
          const strVal = String(value).trim();
          const numVal = Number(strVal.replace(/[$,\s]/g, ''));
          if (!isNaN(numVal) && strVal !== '' && strVal !== '-') {
            value = numVal;
          } else {
            value = strVal;
          }
        }
        
        cleanedRow[col] = value;
      }
      return cleanedRow;
    });

    // Detect column types
    const columnTypes: Record<string, 'number' | 'string' | 'date' | 'boolean'> = {};
    
    for (const col of columns) {
      const sampleValues = rows
        .slice(0, Math.min(100, rows.length))
        .map(row => row[col])
        .filter(val => val !== null && val !== undefined && val !== '');
      
      if (sampleValues.length === 0) {
        columnTypes[col] = 'string';
        continue;
      }
      
      // Check if all are numbers
      const allNumbers = sampleValues.every(val => 
        typeof val === 'number' || (!isNaN(Number(val)) && String(val).trim() !== '')
      );
      
      if (allNumbers) {
        columnTypes[col] = 'number';
        continue;
      }
      
      // Check if dates
      const allDates = sampleValues.every(val => {
        const date = new Date(val);
        return !isNaN(date.getTime());
      });
      
      if (allDates) {
        columnTypes[col] = 'date';
        continue;
      }
      
      columnTypes[col] = 'string';
    }

    return {
      columns,
      rows,
      columnTypes,
    };
  } catch (error: any) {
    throw new Error(`Gemini PDF extraction failed: ${error.message}`);
  }
}

/**
 * Fallback: Parse PDF using text-based extraction
 */
async function parsePDFTextBased(fileBuffer: Buffer): Promise<ParsedData> {
  // Dynamic import to avoid loading pdf-parse if not needed
  const pdfParse = (await import("pdf-parse")).default;
  
  try {
    const data = await pdfParse(fileBuffer);
    const text = data.text;
    
    // Try to extract table-like structures from PDF
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    if (lines.length === 0) {
      throw new Error("PDF contains no extractable text");
    }
    
    // Enhanced header detection - look for patterns that suggest headers
    let headerIndex = 0;
    let headers: string[] = [];
    let maxColumns = 0;
    
    // First pass: find the line with most columns (likely header)
    for (let i = 0; i < Math.min(15, lines.length); i++) {
      const line = lines[i];
      // Try multiple delimiters: tabs, commas, pipes, semicolons, multiple spaces
      const potentialHeaders = line
        .split(/[\t,|;]+|  +/) // Split by tabs, commas, pipes, semicolons, or multiple spaces
        .map(h => h.trim())
        .filter(h => h.length > 0);
      
      if (potentialHeaders.length > maxColumns && potentialHeaders.length >= 2) {
        maxColumns = potentialHeaders.length;
        headers = potentialHeaders;
        headerIndex = i;
      }
    }
    
    // If we found headers, clean them up
    if (headers.length > 0) {
      headers = headers.map(h => {
        // Remove common header artifacts
        h = h.replace(/^[#\-\s]+|[#\-\s]+$/g, '').trim();
        // If header looks like "empty1", "empty2", try to infer better name
        if (/^empty\d+$/i.test(h) || /^column\d+$/i.test(h) || h === '') {
          return `Column_${headers.indexOf(h) + 1}`;
        }
        return h || `Column_${headers.indexOf(h) + 1}`;
      });
    }
    
    // If no clear headers found, use generic column names
    if (headers.length === 0) {
      // Try to detect columns from first data row
      const firstDataLine = lines[0];
      const potentialCols = firstDataLine
        .split(/[\t,|;]+|  +/)
        .map(h => h.trim())
        .filter(h => h.length > 0);
      
      if (potentialCols.length >= 2) {
        headers = potentialCols.map((_, i) => `Column_${i + 1}`);
      } else {
        // Single column fallback
        headers = ['Content'];
      }
    }
    
    // Extract data rows with improved parsing
    const rows: Record<string, any>[] = [];
    const dataStartIndex = headers.length > 0 && headerIndex >= 0 ? headerIndex + 1 : 0;
    
    for (let i = dataStartIndex; i < lines.length; i++) {
      const line = lines[i];
      // Use same delimiter pattern as header detection
      const values = line
        .split(/[\t,|;]+|  +/) // Split by tabs, commas, pipes, semicolons, or multiple spaces
        .map(v => v.trim())
        .filter(v => v.length > 0);
      
      if (values.length === 0) continue;
      
      // Skip lines that look like headers or separators (e.g., "---", "===")
      if (values.length === 1 && /^[-=_\s]+$/.test(values[0])) {
        continue;
      }
      
      // Pad or truncate to match header count
      const row: Record<string, any> = {};
      for (let j = 0; j < headers.length; j++) {
        const header = headers[j];
        const value = values[j] || '';
        
        // Clean up the value
        let cleanedValue = value.replace(/^[#\-\s]+|[#\-\s]+$/g, '').trim();
        
        // Try to convert to number if possible
        if (cleanedValue !== '') {
          // Remove currency symbols and commas for number detection
          const numString = cleanedValue.replace(/[$,\s]/g, '');
          const numValue = Number(numString);
          
          // Only convert if it's actually a number (not NaN) and the original wasn't just whitespace
          if (!isNaN(numValue) && numString !== '' && numString !== '-') {
            row[header] = numValue;
          } else {
            row[header] = cleanedValue;
          }
        } else {
          row[header] = null;
        }
      }
      
      // Only add rows that have at least one non-empty value
      if (Object.values(row).some(v => v !== null && v !== '')) {
        rows.push(row);
      }
    }
    
    if (rows.length === 0) {
      throw new Error("Could not extract table data from PDF");
    }
    
    // Detect column types
    const columnTypes: Record<string, 'number' | 'string' | 'date' | 'boolean'> = {};
    
    for (const header of headers) {
      const sampleValues = rows
        .slice(0, Math.min(100, rows.length))
        .map(row => row[header])
        .filter(val => val !== null && val !== undefined && val !== '');
      
      if (sampleValues.length === 0) {
        columnTypes[header] = 'string';
        continue;
      }
      
      // Check if all are numbers
      const allNumbers = sampleValues.every(val => 
        typeof val === 'number' || (!isNaN(Number(val)) && String(val).trim() !== '')
      );
      
      if (allNumbers) {
        columnTypes[header] = 'number';
        continue;
      }
      
      // Check if dates
      const allDates = sampleValues.every(val => {
        const date = new Date(val);
        return !isNaN(date.getTime());
      });
      
      if (allDates) {
        columnTypes[header] = 'date';
        continue;
      }
      
      columnTypes[header] = 'string';
    }
    
    return {
      columns: headers,
      rows,
      columnTypes,
    };
  } catch (error: any) {
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
}

/**
 * Extract metrics and key statistics from PDF text
 */
export function extractMetricsFromPDF(text: string): Record<string, any> {
  const metrics: Record<string, any> = {};
  
  // Common metric patterns
  const patterns = [
    { name: 'total', regex: /total[:\s]+([\d,]+\.?\d*)/i },
    { name: 'average', regex: /average[:\s]+([\d,]+\.?\d*)/i },
    { name: 'sum', regex: /sum[:\s]+([\d,]+\.?\d*)/i },
    { name: 'count', regex: /count[:\s]+([\d,]+\.?\d*)/i },
    { name: 'percentage', regex: /(\d+\.?\d*)%/g },
    { name: 'currency', regex: /\$([\d,]+\.?\d*)/g },
  ];
  
  for (const pattern of patterns) {
    const matches = text.matchAll(pattern.regex);
    const values: number[] = [];
    
    for (const match of matches) {
      const value = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(value)) {
        values.push(value);
      }
    }
    
    if (values.length > 0) {
      metrics[pattern.name] = values.length === 1 ? values[0] : values;
    }
  }
  
  return metrics;
}


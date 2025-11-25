/**
 * PDF Extractor - Uses Gemini API to extract tables from PDFs
 * Implements "Extract, then Analyze" workflow
 */

import { GoogleGenAI } from "@google/genai";
import type { ParsedData } from "@shared/schema";
import * as fs from "fs";
import * as path from "path";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

/**
 * Helper function to convert file buffer to GenerativePart format
 * @param fileBuffer - Buffer containing PDF data
 * @returns GenerativePart for Gemini API
 */
function bufferToGenerativePart(fileBuffer: Buffer): { inlineData: { mimeType: string; data: string } } {
  const base64Data = fileBuffer.toString('base64');
  
  return {
    inlineData: {
      mimeType: "application/pdf",
      data: base64Data,
    },
  };
}

/**
 * Helper function to convert file path to GenerativePart format (for file-based usage)
 * @param filePath - Path to the PDF file
 * @returns GenerativePart for Gemini API
 */
function fileToGenerativePart(filePath: string): { inlineData: { mimeType: string; data: string } } {
  const fileBuffer = fs.readFileSync(filePath);
  return bufferToGenerativePart(fileBuffer);
}

/**
 * Extract table from PDF using Gemini API (from buffer)
 * @param fileBuffer - Buffer containing PDF data
 * @returns Promise<any[]> - Array of objects representing table rows
 */
export async function extractTableFromPDFBuffer(fileBuffer: Buffer): Promise<any[]> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    // Convert buffer to GenerativePart
    const filePart = bufferToGenerativePart(fileBuffer);

    // Exact prompt as specified - updated with data cleaning instructions
    const prompt = `You are an expert data extraction AI. Analyze this PDF.

Your single goal is to find the main data table in the document and return it as clean JSON.

Identify the largest, most significant table.

Use the table's header row as the keys for each object.

CLEAN THE DATA:

- Remove any commas from numbers (e.g., '237,706' becomes '237706').
- Remove any text like '(Approx.)' from values.
- Convert any dashes ('---'), 'NIL', or 'NA' to null.
- Trim all whitespace.

Convert every row of that table into a JSON object in an array.

If there are no clear tables, return an empty array.

Respond ONLY with the single JSON array: [ { ... }, { ... } ]`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        generationConfig: {
          responseMimeType: "application/json",
        },
      },
      contents: [
        {
          role: "user",
          parts: [
            filePart,
            { text: prompt },
          ],
        },
      ],
    });

    const jsonText = response.text;
    
    if (!jsonText || jsonText.trim() === '') {
      console.warn("Empty response from Gemini for PDF extraction");
      return [];
    }

    // Parse the JSON response
    let jsonData: any[];
    try {
      // Try to parse as JSON
      jsonData = JSON.parse(jsonText);
      
      // Ensure it's an array
      if (!Array.isArray(jsonData)) {
        console.warn("Gemini returned non-array data, wrapping in array");
        jsonData = [jsonData];
      }
    } catch (parseError: any) {
      // Sometimes Gemini returns JSON wrapped in markdown code blocks
      const jsonMatch = jsonText.match(/```(?:json)?\s*(\[[\s\S]*\])\s*```/);
      if (jsonMatch) {
        jsonData = JSON.parse(jsonMatch[1]);
      } else {
        // Try to extract JSON array from text
        const arrayMatch = jsonText.match(/(\[[\s\S]*\])/);
        if (arrayMatch) {
          jsonData = JSON.parse(arrayMatch[1]);
        } else {
          throw new Error(`Failed to parse JSON from Gemini response: ${parseError.message}`);
        }
      }
    }

    return jsonData || [];
  } catch (error: any) {
    console.error("Error extracting table from PDF buffer:", error);
    // Return empty array on failure as specified
    return [];
  }
}

/**
 * Extract table from PDF using Gemini API (from file path)
 * @param filePath - Path to the PDF file
 * @returns Promise<any[]> - Array of objects representing table rows
 */
export async function extractTableFromPDF(filePath: string): Promise<any[]> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`PDF file not found: ${filePath}`);
    }

    // Convert file to GenerativePart
    const filePart = fileToGenerativePart(filePath);

    // Exact prompt as specified - updated with data cleaning instructions
    const prompt = `You are an expert data extraction AI. Analyze this PDF.

Your single goal is to find the main data table in the document and return it as clean JSON.

Identify the largest, most significant table.

Use the table's header row as the keys for each object.

CLEAN THE DATA:

- Remove any commas from numbers (e.g., '237,706' becomes '237706').
- Remove any text like '(Approx.)' from values.
- Convert any dashes ('---'), 'NIL', or 'NA' to null.
- Trim all whitespace.

Convert every row of that table into a JSON object in an array.

If there are no clear tables, return an empty array.

Respond ONLY with the single JSON array: [ { ... }, { ... } ]`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        generationConfig: {
          responseMimeType: "application/json",
        },
      },
      contents: [
        {
          role: "user",
          parts: [
            filePart,
            { text: prompt },
          ],
        },
      ],
    });

    const jsonText = response.text;
    
    if (!jsonText || jsonText.trim() === '') {
      console.warn("Empty response from Gemini for PDF extraction");
      return [];
    }

    // Parse the JSON response
    let jsonData: any[];
    try {
      // Try to parse as JSON
      jsonData = JSON.parse(jsonText);
      
      // Ensure it's an array
      if (!Array.isArray(jsonData)) {
        console.warn("Gemini returned non-array data, wrapping in array");
        jsonData = [jsonData];
      }
    } catch (parseError: any) {
      // Sometimes Gemini returns JSON wrapped in markdown code blocks
      const jsonMatch = jsonText.match(/```(?:json)?\s*(\[[\s\S]*\])\s*```/);
      if (jsonMatch) {
        jsonData = JSON.parse(jsonMatch[1]);
      } else {
        // Try to extract JSON array from text
        const arrayMatch = jsonText.match(/(\[[\s\S]*\])/);
        if (arrayMatch) {
          jsonData = JSON.parse(arrayMatch[1]);
        } else {
          throw new Error(`Failed to parse JSON from Gemini response: ${parseError.message}`);
        }
      }
    }

    return jsonData || [];
  } catch (error: any) {
    console.error("Error extracting table from PDF:", error);
    // Return empty array on failure as specified
    return [];
  }
}

/**
 * Cleans common messy string values from PDF/Excel.
 */
function cleanValue(value: any): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  let strVal = String(value).trim();

  // 1. Remove commas used as thousand separators
  strVal = strVal.replace(/,/g, '');

  // 2. Remove (Approx.) text
  strVal = strVal.replace(/(Approx.)/i, '').trim();

  // 3. Check for "empty" or "null" markers
  if (strVal === '---' || strVal === '-' || strVal === 'NIL' || strVal === 'NA' || strVal === '') {
    return null;
  }

  return strVal;
}

/**
 * Converts a generic JSON array (from PDF extraction) into the
 * ParsedData format that your analysis functions expect.
 */
export function convertJsonToParsedData(jsonData: any[]): ParsedData {
  if (!jsonData || jsonData.length === 0) {
    return {
      columns: [],
      rows: [],
      columnTypes: {},
    };
  }

  // Extract columns from first object's keys
  const firstRow = jsonData[0];
  const columns = Object.keys(firstRow).filter(key => key !== null && key !== undefined);

  if (columns.length === 0) {
    return {
      columns: [],
      rows: [],
      columnTypes: {},
    };
  }

  // Clean column names
  const cleanedColumns = columns.map((col, index) => {
    const cleaned = String(col || '').trim()
      .replace(/^[#\-\s]+|[#\-\s]+$/g, '')
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '');
    return cleaned || `Column_${index + 1}`;
  });

  const columnTypes: Record<string, 'string' | 'number' | 'date' | 'boolean'> = {};

  // --- THIS IS THE NEW, CLEANED ROW DATA ---
  const cleanedRows = jsonData.map(row => {
    const newRow: Record<string, any> = {};
    for (let i = 0; i < cleanedColumns.length; i++) {
      const originalCol = columns[i];
      const cleanedCol = cleanedColumns[i];
      newRow[cleanedCol] = cleanValue(row[originalCol]);
    }
    return newRow;
  });

  // Now, infer types based on the cleaned data
  if (cleanedRows.length > 0) {
    // Sample multiple rows for better type detection
    const sampleSize = Math.min(100, cleanedRows.length);
    const samples: Record<string, any[]> = {};
    
    for (const col of cleanedColumns) {
      samples[col] = [];
    }

    // Collect samples
    for (let i = 0; i < sampleSize; i++) {
      const row = cleanedRows[i];
      for (const col of cleanedColumns) {
        if (row[col] !== null && row[col] !== undefined) {
          samples[col].push(row[col]);
        }
      }
    }

    // Infer types from samples
    for (const col of cleanedColumns) {
      const colSamples = samples[col];
      
      if (colSamples.length === 0) {
        columnTypes[col] = 'string'; // Default to string for nulls
        continue;
      }

      // Check if all are booleans
      const allBooleans = colSamples.every(val => 
        typeof val === 'boolean' ||
        val === 'true' || val === 'false' ||
        val === true || val === false
      );

      if (allBooleans) {
        columnTypes[col] = 'boolean';
        continue;
      }

      // Check if all are numbers (after cleaning, strings like "237706" or "3510.00" should parse as numbers)
      const allNumbers = colSamples.every(val => {
        if (typeof val === 'number') return true;
        if (typeof val === 'string') {
          const numVal = Number(val);
          return !isNaN(numVal) && val.trim() !== '';
        }
        return false;
      });

      if (allNumbers) {
        columnTypes[col] = 'number';
        continue;
      }

      // Check if all are dates
      const allDates = colSamples.every(val => {
        if (typeof val === 'string') {
          const date = new Date(val);
          return !isNaN(date.getTime()) && val.length > 5; // Basic date check
        }
        return false;
      });

      if (allDates) {
        columnTypes[col] = 'date';
        continue;
      }

      // Default to string
      columnTypes[col] = 'string';
    }
  }

  // Final pass to convert number-type columns to actual Numbers
  const finalRows = cleanedRows.map(row => {
    const newRow = { ...row };
    for (const col of cleanedColumns) {
      if (columnTypes[col] === 'number' && newRow[col] !== null) {
        newRow[col] = Number(newRow[col]);
      }
    }
    return newRow;
  });

  return {
    columns: cleanedColumns,
    rows: finalRows,
    columnTypes,
  };
}

import * as XLSX from "xlsx";
import Papa from "papaparse";
import type { ParsedData, ChartConfig } from "@shared/schema";

export function parseCSV(fileBuffer: Buffer): ParsedData {
  const csvContent = fileBuffer.toString("utf-8");
  
  const result = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  if (result.errors.length > 0) {
    throw new Error(`CSV parsing error: ${result.errors[0].message}`);
  }

  const rows = result.data as Record<string, any>[];
  const columns = result.meta.fields || [];
  const columnTypes = detectColumnTypes(rows, columns);

  return { columns, rows, columnTypes };
}

export function parseExcel(fileBuffer: Buffer): ParsedData {
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  
  // Use the first sheet
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to JSON
  const rows = XLSX.utils.sheet_to_json(worksheet, { 
    raw: false,
    defval: null 
  }) as Record<string, any>[];

  if (rows.length === 0) {
    throw new Error("Excel file contains no data");
  }

  const columns = Object.keys(rows[0]);
  const columnTypes = detectColumnTypes(rows, columns);

  return { columns, rows, columnTypes };
}

export function parseJSON(fileBuffer: Buffer): ParsedData {
  const jsonContent = fileBuffer.toString("utf-8");
  const data = JSON.parse(jsonContent);

  let rows: Record<string, any>[];
  
  // Handle both array of objects and single object
  if (Array.isArray(data)) {
    rows = data;
  } else if (typeof data === "object" && data !== null) {
    // If it's a single object, convert to array
    rows = [data];
  } else {
    throw new Error("JSON must be an object or array of objects");
  }

  if (rows.length === 0) {
    throw new Error("JSON file contains no data");
  }

  const columns = Object.keys(rows[0]);
  const columnTypes = detectColumnTypes(rows, columns);

  return { columns, rows, columnTypes };
}

function detectColumnTypes(
  rows: Record<string, any>[],
  columns: string[]
): Record<string, "number" | "string" | "date" | "boolean"> {
  const types: Record<string, "number" | "string" | "date" | "boolean"> = {};

  for (const column of columns) {
    const sampleValues = rows
      .slice(0, 100)
      .map((row) => row[column])
      .filter((val) => val !== null && val !== undefined && val !== "");

    if (sampleValues.length === 0) {
      types[column] = "string";
      continue;
    }

    // Check if all values are numbers
    const allNumbers = sampleValues.every(
      (val) => typeof val === "number" || !isNaN(Number(val))
    );
    if (allNumbers) {
      types[column] = "number";
      continue;
    }

    // Check if all values are booleans
    const allBooleans = sampleValues.every(
      (val) =>
        typeof val === "boolean" ||
        val === "true" ||
        val === "false" ||
        val === true ||
        val === false
    );
    if (allBooleans) {
      types[column] = "boolean";
      continue;
    }

    // Check if values might be dates
    const allDates = sampleValues.every((val) => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    });
    if (allDates) {
      types[column] = "date";
      continue;
    }

    types[column] = "string";
  }

  return types;
}

export function generateVisualizations(parsedData: ParsedData): ChartConfig[] {
  const visualizations: ChartConfig[] = [];
  const { columns, rows, columnTypes } = parsedData;

  // Find numerical columns for charts
  const numericColumns = columns.filter((col) => columnTypes[col] === "number");
  const stringColumns = columns.filter((col) => columnTypes[col] === "string");

  // Generate bar chart if we have categorical and numerical data
  if (stringColumns.length > 0 && numericColumns.length > 0) {
    const categoryCol = stringColumns[0];
    const valueCol = numericColumns[0];
    
    // Aggregate data by category
    const aggregated = aggregateData(rows, categoryCol, valueCol);
    
    visualizations.push({
      id: "bar-1",
      type: "bar",
      title: `${valueCol} by ${categoryCol}`,
      xAxis: categoryCol,
      yAxis: valueCol,
      data: aggregated.slice(0, 15), // Limit to 15 categories for readability
    });
  }

  // Generate line chart for time series or sequential data
  if (numericColumns.length >= 2) {
    visualizations.push({
      id: "line-1",
      type: "line",
      title: `${numericColumns[1]} over ${numericColumns[0]}`,
      xAxis: numericColumns[0],
      yAxis: numericColumns[1],
      data: rows.slice(0, 50), // Limit to 50 points for performance
    });
  }

  // Generate pie chart for categorical distribution
  if (stringColumns.length > 0) {
    const categoryCol = stringColumns[0];
    const distribution = calculateDistribution(rows, categoryCol);
    
    visualizations.push({
      id: "pie-1",
      type: "pie",
      title: `Distribution of ${categoryCol}`,
      dataKey: "value",
      data: distribution.slice(0, 10), // Top 10 categories
    });
  }

  // Generate scatter plot if we have multiple numerical columns
  if (numericColumns.length >= 2) {
    visualizations.push({
      id: "scatter-1",
      type: "scatter",
      title: `${numericColumns[0]} vs ${numericColumns[1]}`,
      xAxis: numericColumns[0],
      yAxis: numericColumns[1],
      data: rows.slice(0, 100), // Limit to 100 points
    });
  }

  return visualizations;
}

function aggregateData(
  rows: Record<string, any>[],
  categoryCol: string,
  valueCol: string
): Record<string, any>[] {
  const aggregated: Record<string, number[]> = {};

  for (const row of rows) {
    const category = String(row[categoryCol] || "Unknown");
    const value = Number(row[valueCol]) || 0;

    if (!aggregated[category]) {
      aggregated[category] = [];
    }
    aggregated[category].push(value);
  }

  return Object.entries(aggregated).map(([category, values]) => ({
    [categoryCol]: category,
    [valueCol]: values.reduce((a, b) => a + b, 0) / values.length, // Average
  }));
}

function calculateDistribution(
  rows: Record<string, any>[],
  column: string
): Array<{ name: string; value: number }> {
  const counts: Record<string, number> = {};

  for (const row of rows) {
    const value = String(row[column] || "Unknown");
    counts[value] = (counts[value] || 0) + 1;
  }

  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

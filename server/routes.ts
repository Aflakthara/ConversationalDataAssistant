import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { parseCSV, parseExcel, parseJSON, generateVisualizations } from "./parsers";
import { parsePDF } from "./pdf-parser";
import { extractTableFromPDFBuffer, convertJsonToParsedData } from "./pdf-extractor";
import { extractMetrics } from "./metrics-extractor";
import { recordChartFeedback, analyzeTrainingData } from "./ml-training";
import { generateChart, type ChartType } from "./ml-chart-recommender";
import { analyzeDataWithAI, answerDataQuestion } from "./gemini";
import type { AnalysisResult, DataFile, ChartConfig } from "@shared/schema";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "text/csv",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/json",
      "application/pdf",
    ];
    
    if (allowedTypes.includes(file.mimetype) || 
        file.originalname.match(/\.(csv|xlsx|xls|json|pdf)$/i)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only CSV, Excel, JSON, and PDF files are allowed."));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // File upload and analysis endpoint
  app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const file = req.file;
      const filename = file.originalname;
      const fileBuffer = file.buffer;

      // Determine file type
      let fileType: "csv" | "xlsx" | "json" | "pdf";
      if (filename.endsWith(".csv")) {
        fileType = "csv";
      } else if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
        fileType = "xlsx";
      } else if (filename.endsWith(".json")) {
        fileType = "json";
      } else if (filename.endsWith(".pdf")) {
        fileType = "pdf";
      } else {
        return res.status(400).json({ error: "Unsupported file type" });
      }

      // Parse the file based on type
      let parsedData;
      try {
        if (fileType === "csv") {
          parsedData = parseCSV(fileBuffer);
        } else if (fileType === "xlsx") {
          parsedData = parseExcel(fileBuffer);
        } else if (fileType === "pdf") {
          // Use Gemini-based PDF extraction (Extract, then Analyze workflow)
          try {
            // Extract table using Gemini API directly from buffer
            const jsonData = await extractTableFromPDFBuffer(fileBuffer);
            
            if (jsonData.length === 0) {
              // Fallback to original PDF parser if Gemini extraction returns empty
              console.warn("Gemini returned empty array, using fallback parser");
              parsedData = await parsePDF(fileBuffer);
            } else {
              // Convert JSON to ParsedData format
              parsedData = convertJsonToParsedData(jsonData);
            }
          } catch (geminiError: any) {
            // Fallback to original PDF parser on error
            console.warn("Gemini PDF extraction failed, using fallback:", geminiError.message);
            parsedData = await parsePDF(fileBuffer);
          }
        } else {
          parsedData = parseJSON(fileBuffer);
        }
      } catch (parseError: any) {
        return res.status(400).json({ 
          error: "Failed to parse file",
          details: parseError.message 
        });
      }

      // Extract metrics from data
      const metrics = extractMetrics(parsedData);

      // Generate visualizations using ML recommendations
      const visualizations = generateVisualizations(parsedData, true);

      // Analyze data with AI
      const aiInsights = await analyzeDataWithAI(parsedData, filename);

      // Create file metadata
      const fileData: DataFile = {
        id: "", // Will be set by storage
        filename,
        fileType,
        uploadedAt: new Date(),
        rowCount: parsedData.rows.length,
        columnCount: parsedData.columns.length,
      };

      // Create analysis result
      const analysisResult: AnalysisResult = {
        file: fileData,
        parsedData,
        visualizations,
        aiInsights,
        metrics,
      };

      // Save to storage
      const id = await storage.saveAnalysis(analysisResult);
      analysisResult.file.id = id;

      // Return the ID to redirect to analysis page
      res.json({ id });
    } catch (error: any) {
      console.error("Upload error:", error);
      res.status(500).json({ 
        error: "Failed to process file",
        details: error.message 
      });
    }
  });

  // Get analysis by ID
  app.get("/api/analysis/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const analysis = await storage.getAnalysis(id);

      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      res.json(analysis);
    } catch (error: any) {
      console.error("Get analysis error:", error);
      res.status(500).json({ 
        error: "Failed to retrieve analysis",
        details: error.message 
      });
    }
  });

  // Get metrics for an analysis
  app.get("/api/analysis/:id/metrics", async (req, res) => {
    try {
      const { id } = req.params;
      const analysis = await storage.getAnalysis(id);

      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      // Extract metrics if not already present
      const metrics = analysis.metrics || extractMetrics(analysis.parsedData);
      res.json(metrics);
    } catch (error: any) {
      console.error("Get metrics error:", error);
      res.status(500).json({ 
        error: "Failed to retrieve metrics",
        details: error.message 
      });
    }
  });

  // Record user feedback on chart recommendations (for ML training)
  app.post("/api/analysis/:id/feedback", async (req, res) => {
    try {
      const { id } = req.params;
      const { chartId, userSelectedChart, rating } = req.body;

      const analysis = await storage.getAnalysis(id);
      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      const chart = analysis.visualizations.find(v => v.id === chartId);
      if (!chart) {
        return res.status(404).json({ error: "Chart not found" });
      }

      // Record feedback for ML training
      recordChartFeedback(
        analysis.parsedData,
        chart,
        userSelectedChart,
        rating
      );

      res.json({ success: true, message: "Feedback recorded" });
    } catch (error: any) {
      console.error("Feedback error:", error);
      res.status(500).json({ 
        error: "Failed to record feedback",
        details: error.message 
      });
    }
  });

  // Get ML training statistics
  app.get("/api/ml/stats", async (req, res) => {
    try {
      const stats = analyzeTrainingData();
      res.json(stats);
    } catch (error: any) {
      console.error("ML stats error:", error);
      res.status(500).json({ 
        error: "Failed to get ML statistics",
        details: error.message 
      });
    }
  });

  // Create custom chart with user-selected axes
  app.post("/api/analysis/:id/chart", async (req, res) => {
    try {
      const { id } = req.params;
      const { chartType, xAxis, yAxis, dataKey } = req.body;

      if (!chartType || !['bar', 'line', 'pie', 'scatter'].includes(chartType)) {
        return res.status(400).json({ error: "Valid chartType is required (bar, line, pie, scatter)" });
      }

      const analysis = await storage.getAnalysis(id);
      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      // Validate axes exist in the data
      if (xAxis && !analysis.parsedData.columns.includes(xAxis)) {
        return res.status(400).json({ error: `Column "${xAxis}" not found in dataset` });
      }
      if (yAxis && !analysis.parsedData.columns.includes(yAxis)) {
        return res.status(400).json({ error: `Column "${yAxis}" not found in dataset` });
      }

      const chart = generateChart(
        analysis.parsedData,
        chartType as ChartType,
        xAxis,
        yAxis,
        dataKey
      );

      if (!chart) {
        return res.status(400).json({ 
          error: "Could not generate chart with selected axes. Check that axes are compatible with chart type." 
        });
      }

      res.json(chart);
    } catch (error: any) {
      console.error("Create chart error:", error);
      res.status(500).json({ 
        error: "Failed to create chart",
        details: error.message 
      });
    }
  });

  // Get available columns for chart creation
  app.get("/api/analysis/:id/columns", async (req, res) => {
    try {
      const { id } = req.params;
      const analysis = await storage.getAnalysis(id);

      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      const columns = analysis.parsedData.columns.map(col => ({
        name: col,
        type: analysis.parsedData.columnTypes[col],
      }));

      res.json({ columns });
    } catch (error: any) {
      console.error("Get columns error:", error);
      res.status(500).json({ 
        error: "Failed to retrieve columns",
        details: error.message 
      });
    }
  });

  // Data chat endpoint - natural language queries
  app.post("/api/data-chat/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { question } = req.body;

      if (!question || typeof question !== "string") {
        return res.status(400).json({ error: "Question is required" });
      }

      const analysis = await storage.getAnalysis(id);
      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      const answer = await answerDataQuestion(analysis.parsedData, question);
      res.json({ answer });
    } catch (error: any) {
      console.error("Data chat error:", error);
      res.status(500).json({ 
        error: "Failed to process question",
        details: error.message 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

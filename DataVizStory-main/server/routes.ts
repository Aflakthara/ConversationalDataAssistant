import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { parseCSV, parseExcel, parseJSON, generateVisualizations } from "./parsers";
import { analyzeDataWithAI } from "./gemini";
import type { AnalysisResult, DataFile } from "@shared/schema";

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
    ];
    
    if (allowedTypes.includes(file.mimetype) || 
        file.originalname.match(/\.(csv|xlsx|xls|json)$/i)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only CSV, Excel, and JSON files are allowed."));
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
      let fileType: "csv" | "xlsx" | "json";
      if (filename.endsWith(".csv")) {
        fileType = "csv";
      } else if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
        fileType = "xlsx";
      } else if (filename.endsWith(".json")) {
        fileType = "json";
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
        } else {
          parsedData = parseJSON(fileBuffer);
        }
      } catch (parseError: any) {
        return res.status(400).json({ 
          error: "Failed to parse file",
          details: parseError.message 
        });
      }

      // Generate visualizations
      const visualizations = generateVisualizations(parsedData);

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

  const httpServer = createServer(app);
  return httpServer;
}

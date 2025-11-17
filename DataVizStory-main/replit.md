# DataViz AI - Intelligent Data Analysis Platform

## Overview
DataViz AI is an intelligent data analysis and visualization platform that automatically processes uploaded files, generates appropriate visualizations, and uses Gemini AI to create narrative summaries and insights.

**Last Updated:** November 11, 2025

## Features
- **Multi-Format Support**: Upload CSV, Excel (XLSX/XLS), or JSON files
- **Smart Visualizations**: Automatic chart generation (bar, line, pie, scatter, area)
- **AI-Powered Insights**: Gemini AI analyzes data and provides:
  - Executive summaries
  - Key insights and patterns
  - Data quality assessment
  - Trend identification
  - Actionable recommendations
- **Interactive Data Preview**: Sortable table with first 100 rows
- **Professional UI**: Clean, modern design following Material Design principles

## Technology Stack

### Frontend
- React with TypeScript
- Wouter for routing
- TanStack Query for data fetching
- Shadcn UI components
- Tailwind CSS for styling
- Recharts for visualizations
- React Dropzone for file uploads

### Backend
- Express.js
- Multer for file uploads
- Google Gemini AI (gemini-2.5-flash)
- XLSX for Excel parsing
- PapaParse for CSV parsing
- In-memory storage (MemStorage)

## Project Structure

```
/client
  /src
    /pages
      upload.tsx          - Main upload page with drag-and-drop
      analysis.tsx        - Analysis results dashboard
    /components
      upload-zone.tsx     - File upload component
      ai-insights-panel.tsx - AI insights display
      data-table.tsx      - Interactive data table
      visualization-card.tsx - Chart container
      chart-renderer.tsx  - Recharts wrapper
    App.tsx              - Main app with routing
    index.css            - Design tokens and styles

/server
  routes.ts              - API endpoints
  parsers.ts             - File parsing logic
  gemini.ts              - Gemini AI integration
  storage.ts             - In-memory data storage

/shared
  schema.ts              - TypeScript types and interfaces
```

## API Endpoints

### POST /api/upload
Uploads and analyzes a data file
- Accepts: CSV, XLSX, XLS, JSON files (max 10MB)
- Returns: `{ id: string }` for redirect to analysis page
- Process:
  1. Parses file based on type
  2. Detects column types
  3. Generates visualizations
  4. Runs Gemini AI analysis
  5. Stores results

### GET /api/analysis/:id
Retrieves analysis results
- Returns: Complete AnalysisResult object with:
  - File metadata
  - Parsed data
  - Visualizations (charts)
  - AI insights

## Environment Variables

```
GEMINI_API_KEY=<your-gemini-api-key>
```

Get your API key at: https://aistudio.google.com/apikey

## Data Models

### AnalysisResult
- file: DataFile
- parsedData: ParsedData
- visualizations: ChartConfig[]
- aiInsights: AIInsights

### ParsedData
- columns: string[]
- rows: Record<string, any>[]
- columnTypes: Record<string, 'number' | 'string' | 'date' | 'boolean'>

### AIInsights
- summary: string
- keyInsights: string[]
- recommendations: string[]
- dataQuality: { completeness: number, accuracy: string }
- trends: string[]

## Design System

### Colors
- Primary: Blue (#1e6db8)
- Chart colors: 5-color palette for visualizations
- Semantic colors for quality indicators

### Typography
- Font: Inter (headings and body)
- Monospace: JetBrains Mono (data tables)

### Spacing
- Consistent use of 4, 6, 8, 12, 16, 24 spacing units
- Component padding: p-6 to p-8
- Section spacing: py-12 to py-16

## Development

### Running the Project
```bash
npm run dev
```
Starts Express server (backend) and Vite dev server (frontend) on port 5000

### Adding New Chart Types
1. Add type to ChartConfig in `shared/schema.ts`
2. Implement renderer in `client/src/components/chart-renderer.tsx`
3. Update visualization generation logic in `server/parsers.ts`

### Modifying AI Analysis
Edit `server/gemini.ts` to adjust:
- AI prompt structure
- Response schema
- Fallback behavior

## Known Limitations
- In-memory storage (data lost on restart)
- Max file size: 10MB
- Data table shows first 100 rows only
- Visualization limited to 15 categories/50-100 data points

## Future Enhancements
- Database persistence
- User accounts with analysis history
- Advanced filtering and data transformations
- Chart customization options
- Report export (PDF, PowerPoint)
- Data comparison across multiple files
- Predictive analytics

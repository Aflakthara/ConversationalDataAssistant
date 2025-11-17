import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AIInsightsPanel } from "@/components/ai-insights-panel";
import { DataTable } from "@/components/data-table";
import { VisualizationCard } from "@/components/visualization-card";
import type { AnalysisResult } from "@shared/schema";

export default function AnalysisPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();

  const { data: analysis, isLoading } = useQuery<AnalysisResult>({
    queryKey: ['/api/analysis', id],
    enabled: !!id,
  });

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!analysis) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground" />
          <h2 className="text-2xl font-semibold">Analysis Not Found</h2>
          <p className="text-muted-foreground">The analysis you're looking for doesn't exist.</p>
          <Button onClick={() => setLocation("/")} data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const { file, parsedData, visualizations, aiInsights } = analysis;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/")}
                data-testid="button-back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold" data-testid="text-filename">{file.filename}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <Badge variant="secondary" data-testid="badge-filetype">{file.fileType.toUpperCase()}</Badge>
                  <span className="text-sm text-muted-foreground" data-testid="text-stats">
                    {file.rowCount.toLocaleString()} rows × {file.columnCount} columns
                  </span>
                </div>
              </div>
            </div>
            <Button variant="outline" data-testid="button-download">
              <Download className="w-4 h-4 mr-2" />
              Download Report
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* AI Insights */}
        <AIInsightsPanel insights={aiInsights} />

        {/* Visualizations Grid */}
        <div>
          <h2 className="text-2xl font-semibold mb-6">Visualizations</h2>
          {visualizations.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {visualizations.map((viz) => (
                <VisualizationCard key={viz.id} visualization={viz} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No visualizations available for this data.</p>
            </div>
          )}
        </div>

        {/* Data Table */}
        <div>
          <h2 className="text-2xl font-semibold mb-6">Data Preview</h2>
          <DataTable data={parsedData} />
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Skeleton className="w-10 h-10 rounded-md" />
            <div className="space-y-2">
              <Skeleton className="w-48 h-6" />
              <Skeleton className="w-32 h-4" />
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <Skeleton className="w-full h-48 rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="w-full h-80 rounded-lg" />
          <Skeleton className="w-full h-80 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

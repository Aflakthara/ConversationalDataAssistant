import React from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AIInsightsPanel } from "@/components/ai-insights-panel";
import { DataTable } from "@/components/data-table";
import { VisualizationCard } from "@/components/visualization-card";
import { CreateChartDialog } from "@/components/create-chart-dialog";
import type { AnalysisResult, ChartConfig } from "@shared/schema";

export default function AnalysisPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  
  // All hooks must be called before any conditional returns
  const [customCharts, setCustomCharts] = React.useState<ChartConfig[]>([]);

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

  const { file, parsedData, visualizations: initialVisualizations, aiInsights } = analysis;
  const visualizations = [...initialVisualizations, ...customCharts];

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
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="insights" className="w-full">
          <TabsList className="!grid !w-full !max-w-6xl !mx-auto !grid-cols-4 !h-auto !p-2 !bg-transparent !gap-4 mb-8 !flex-none">
            <TabsTrigger 
              value="insights" 
              className="!text-base !font-medium !py-4 !px-6 !rounded-lg !bg-cyan-500 !text-white !shadow-md hover:!bg-cyan-600 data-[state=active]:!bg-cyan-600 data-[state=active]:!shadow-lg data-[state=inactive]:!bg-cyan-500 data-[state=inactive]:!opacity-80"
            >
              Insights & Recommendations
            </TabsTrigger>
            <TabsTrigger 
              value="visualizations" 
              className="!text-base !font-medium !py-4 !px-6 !rounded-lg !bg-cyan-500 !text-white !shadow-md hover:!bg-cyan-600 data-[state=active]:!bg-cyan-600 data-[state=active]:!shadow-lg data-[state=inactive]:!bg-cyan-500 data-[state=inactive]:!opacity-80"
            >
              Visualizations
            </TabsTrigger>
            <TabsTrigger 
              value="data" 
              className="!text-base !font-medium !py-4 !px-6 !rounded-lg !bg-cyan-500 !text-white !shadow-md hover:!bg-cyan-600 data-[state=active]:!bg-cyan-600 data-[state=active]:!shadow-lg data-[state=inactive]:!bg-cyan-500 data-[state=inactive]:!opacity-80"
            >
              Data Preview
            </TabsTrigger>
            <TabsTrigger 
              value="chat" 
              className="!text-base !font-medium !py-4 !px-6 !rounded-lg !bg-cyan-500 !text-white !shadow-md hover:!bg-cyan-600 data-[state=active]:!bg-cyan-600 data-[state=active]:!shadow-lg data-[state=inactive]:!bg-cyan-500 data-[state=inactive]:!opacity-80"
            >
              Data Chat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="insights" className="mt-0">
            <AIInsightsPanel insights={aiInsights} />
          </TabsContent>

          <TabsContent value="visualizations" className="mt-0">
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold">Visualizations</h2>
                <CreateChartDialog
                  analysisId={id!}
                  onChartCreated={(chart) => {
                    setCustomCharts(prev => [...prev, chart]);
                  }}
                />
              </div>
              {visualizations.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {visualizations.map((viz) => (
                    <VisualizationCard key={viz.id} visualization={viz} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No visualizations available for this data.</p>
                  <p className="mt-2 text-sm">Click "Create Custom Chart" to get started.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="data" className="mt-0">
            <div>
              <h2 className="text-2xl font-semibold mb-6">Data Preview</h2>
              <DataTable data={parsedData} />
            </div>
          </TabsContent>

          <TabsContent value="chat" className="mt-0">
            <DataChatInterface analysisId={id!} parsedData={parsedData} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function DataChatInterface({ analysisId, parsedData }: { analysisId: string; parsedData: any }) {
  const [messages, setMessages] = React.useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/data-chat/${analysisId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMessage }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to get response');
      }

      setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (error: any) {
      const errorMessage = error.message || 'Sorry, I encountered an error processing your question. Please check that your Gemini API key is configured correctly.';
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: errorMessage
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Data Chat</h2>
      <div className="bg-card rounded-lg border shadow-sm">
        <div className="h-[500px] overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <p className="text-lg mb-4">Ask questions about your data in natural language!</p>
              <div className="text-sm space-y-2">
                <p>Examples:</p>
                <p className="text-cyan-600">• "How many rows have sales greater than 1000?"</p>
                <p className="text-cyan-600">• "What is the average price?"</p>
                <p className="text-cyan-600">• "Show me the top 5 products by revenue"</p>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg p-4 ${
                  msg.role === 'user' 
                    ? 'bg-cyan-500 text-white' 
                    : 'bg-muted'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-4">
                <p className="text-muted-foreground">Thinking...</p>
              </div>
            </div>
          )}
        </div>
        <div className="border-t p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask a question about your data..."
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              disabled={isLoading}
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={!input.trim() || isLoading}
              className="bg-cyan-500 hover:bg-cyan-600"
            >
              Send
            </Button>
          </div>
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

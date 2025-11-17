import { useState } from "react";
import { useLocation } from "wouter";
import { Upload, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UploadZone } from "@/components/upload-zone";
import { useToast } from "@/hooks/use-toast";

export default function UploadPage() {
  const [, setLocation] = useLocation();
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(errorData.error || "Upload failed");
      }

      const result = await response.json();
      toast({
        title: "Success!",
        description: "Your file has been analyzed successfully.",
      });
      setLocation(`/analysis/${result.id}`);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload and analyze your file. Please try again.",
        variant: "destructive",
      });
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-primary/10 via-background to-background min-h-[400px] flex items-center justify-center px-6 py-16">
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        <div className="relative max-w-4xl mx-auto text-center space-y-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="w-10 h-10 text-primary" />
            <h1 className="text-5xl font-bold text-foreground">DataViz AI</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Upload your data files and get instant AI-powered visualizations, insights, and summaries.
            Transform raw data into actionable intelligence.
          </p>
        </div>
      </div>

      {/* Upload Section */}
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <UploadZone onFileSelect={handleFileUpload} isUploading={isUploading} />

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <Card className="hover-elevate transition-all duration-300" data-testid="card-feature-upload">
            <CardContent className="p-6 space-y-3">
              <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Multi-Format Support</h3>
              <p className="text-sm text-muted-foreground">
                Upload CSV, Excel (XLSX/XLS), or JSON files. We automatically detect and parse your data format.
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate transition-all duration-300" data-testid="card-feature-visualization">
            <CardContent className="p-6 space-y-3">
              <div className="w-12 h-12 rounded-md bg-chart-1/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-chart-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold">Smart Visualizations</h3>
              <p className="text-sm text-muted-foreground">
                Our AI analyzes your data structure and automatically generates the most appropriate chart types.
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate transition-all duration-300" data-testid="card-feature-ai">
            <CardContent className="p-6 space-y-3">
              <div className="w-12 h-12 rounded-md bg-chart-3/10 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-chart-3" />
              </div>
              <h3 className="text-lg font-semibold">AI-Powered Insights</h3>
              <p className="text-sm text-muted-foreground">
                Get narrative summaries, key insights, trends, and data-driven recommendations powered by Gemini AI.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Supported Formats */}
        <div className="text-center space-y-4 pt-8">
          <p className="text-sm text-muted-foreground">Supported File Formats</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Badge variant="secondary" className="text-sm" data-testid="badge-csv">CSV</Badge>
            <Badge variant="secondary" className="text-sm" data-testid="badge-xlsx">XLSX</Badge>
            <Badge variant="secondary" className="text-sm" data-testid="badge-xls">XLS</Badge>
            <Badge variant="secondary" className="text-sm" data-testid="badge-json">JSON</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Sparkles, TrendingUp, AlertCircle, CheckCircle, FileText, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AIInsights } from "@shared/schema";

interface AIInsightsPanelProps {
  insights: AIInsights;
}

export function AIInsightsPanel({ insights }: AIInsightsPanelProps) {
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent" data-testid="card-ai-insights">
      <CardHeader className="space-y-0 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <CardTitle className="text-2xl">AI-Powered Insights</CardTitle>
          </div>
          <Badge variant="secondary" className="gap-1.5">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Powered by Gemini AI
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold flex items-center gap-2" data-testid="heading-summary">
            <FileText className="w-5 h-5 text-primary" />
            Executive Summary
          </h3>
          <p className="text-muted-foreground leading-relaxed" data-testid="text-summary">
            {insights.summary}
          </p>
        </div>

        {/* Key Insights */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2" data-testid="heading-insights">
            <CheckCircle className="w-5 h-5 text-chart-2" />
            Key Insights
          </h3>
          <ul className="space-y-2">
            {insights.keyInsights.map((insight, index) => (
              <li
                key={index}
                className="flex gap-3 p-3 rounded-md bg-card hover-elevate transition-all duration-200"
                data-testid={`text-insight-${index}`}
              >
                <span className="text-primary font-semibold mt-0.5">•</span>
                <span className="text-sm text-foreground flex-1">{insight}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Data Quality */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-md bg-card border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Data Completeness</span>
              <Badge variant="outline" data-testid="badge-completeness">
                {Math.round(insights.dataQuality.completeness)}%
              </Badge>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-chart-2 transition-all duration-500"
                style={{ width: `${insights.dataQuality.completeness}%` }}
              />
            </div>
          </div>

          <div className="p-4 rounded-md bg-card border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Data Quality</span>
              <Badge variant="outline" data-testid="badge-quality">
                {insights.dataQuality.accuracy}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <AlertCircle className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">AI Assessment</span>
            </div>
          </div>
        </div>

        {/* Trends */}
        {insights.trends.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2" data-testid="heading-trends">
              <TrendingUp className="w-5 h-5 text-chart-4" />
              Identified Trends
            </h3>
            <div className="flex flex-wrap gap-2">
              {insights.trends.map((trend, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="text-sm"
                  data-testid={`badge-trend-${index}`}
                >
                  {trend}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {insights.recommendations.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2" data-testid="heading-recommendations">
              <Lightbulb className="w-5 h-5 text-chart-3" />
              Recommendations
            </h3>
            <ul className="space-y-2">
              {insights.recommendations.map((rec, index) => (
                <li
                  key={index}
                  className="flex gap-3 p-3 rounded-md bg-card hover-elevate transition-all duration-200"
                  data-testid={`text-recommendation-${index}`}
                >
                  <span className="text-chart-3 font-semibold mt-0.5">→</span>
                  <span className="text-sm text-foreground flex-1">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

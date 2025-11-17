import { Download, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChartRenderer } from "@/components/chart-renderer";
import type { ChartConfig } from "@shared/schema";

interface VisualizationCardProps {
  visualization: ChartConfig;
}

export function VisualizationCard({ visualization }: VisualizationCardProps) {
  const chartTypeLabels: Record<string, string> = {
    bar: 'Bar Chart',
    line: 'Line Chart',
    pie: 'Pie Chart',
    scatter: 'Scatter Plot',
    area: 'Area Chart',
  };

  return (
    <Card className="hover-elevate transition-all duration-300" data-testid={`card-chart-${visualization.id}`}>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 space-y-0 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg" data-testid={`text-chart-title-${visualization.id}`}>
              {visualization.title}
            </CardTitle>
            <Badge variant="secondary" className="mt-1 text-xs" data-testid={`badge-chart-type-${visualization.id}`}>
              {chartTypeLabels[visualization.type] || visualization.type}
            </Badge>
          </div>
        </div>
        <Button variant="ghost" size="icon" data-testid={`button-download-${visualization.id}`}>
          <Download className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="min-h-[320px] w-full">
          <ChartRenderer config={visualization} />
        </div>
      </CardContent>
    </Card>
  );
}

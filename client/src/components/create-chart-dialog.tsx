import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";
import type { ChartConfig } from "@shared/schema";

interface Column {
  name: string;
  type: string;
}

interface CreateChartDialogProps {
  analysisId: string;
  onChartCreated: (chart: ChartConfig) => void;
}

export function CreateChartDialog({ analysisId, onChartCreated }: CreateChartDialogProps) {
  const [open, setOpen] = useState(false);
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie' | 'scatter'>('bar');
  const [xAxis, setXAxis] = useState<string>('');
  const [yAxis, setYAxis] = useState<string>('');

  // Fetch available columns
  const { data: columnsData, isLoading: columnsLoading } = useQuery<{ columns: Column[] }>({
    queryKey: [`/api/analysis/${analysisId}/columns`],
    enabled: open && !!analysisId,
  });

  const columns = columnsData?.columns || [];
  const numericColumns = columns.filter(col => col.type === 'number');
  const stringColumns = columns.filter(col => col.type === 'string');

  // Reset selections when dialog opens
  useEffect(() => {
    if (open) {
      setChartType('bar');
      setXAxis('');
      setYAxis('');
    }
  }, [open]);

  // Auto-select first available columns when columns load
  useEffect(() => {
    if (columns.length > 0 && open) {
      if (chartType === 'pie') {
        // Pie chart only needs x-axis (categorical)
        if (!xAxis && stringColumns.length > 0) {
          setXAxis(stringColumns[0].name);
        }
      } else if (chartType === 'bar') {
        // Bar chart needs categorical x and numeric y
        if (!xAxis && stringColumns.length > 0) {
          setXAxis(stringColumns[0].name);
        }
        if (!yAxis && numericColumns.length > 0) {
          setYAxis(numericColumns[0].name);
        }
      } else if (chartType === 'line' || chartType === 'scatter') {
        // Line and scatter need numeric x and y
        if (!xAxis && numericColumns.length > 0) {
          setXAxis(numericColumns[0].name);
        }
        if (!yAxis && numericColumns.length > 1) {
          setYAxis(numericColumns.find(col => col.name !== xAxis)?.name || numericColumns[0].name);
        }
      }
    }
  }, [columns, chartType, open, xAxis, yAxis, numericColumns, stringColumns]);

  const createChartMutation = useMutation({
    mutationFn: async (data: { chartType: string; xAxis?: string; yAxis?: string }) => {
      const response = await fetch(`/api/analysis/${analysisId}/chart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.details || 'Failed to create chart');
      }

      return response.json() as Promise<ChartConfig>;
    },
    onSuccess: (chart) => {
      onChartCreated(chart);
      setOpen(false);
    },
  });

  const handleCreate = () => {
    if (chartType === 'pie') {
      if (!xAxis) return;
      createChartMutation.mutate({ chartType, xAxis });
    } else {
      if (!xAxis || !yAxis) return;
      createChartMutation.mutate({ chartType, xAxis, yAxis });
    }
  };

  const canCreate = () => {
    if (chartType === 'pie') {
      return !!xAxis;
    }
    return !!xAxis && !!yAxis;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-cyan-500 hover:bg-cyan-600 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Create Custom Chart
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Custom Chart</DialogTitle>
          <DialogDescription>
            Select chart type and axes to create a custom visualization
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Chart Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="chart-type">Chart Type</Label>
            <Select
              value={chartType}
              onValueChange={(value) => {
                setChartType(value as 'bar' | 'line' | 'pie' | 'scatter');
                setXAxis('');
                setYAxis('');
              }}
            >
              <SelectTrigger id="chart-type">
                <SelectValue placeholder="Select chart type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">Bar Chart</SelectItem>
                <SelectItem value="line">Line Chart</SelectItem>
                <SelectItem value="pie">Pie Chart</SelectItem>
                <SelectItem value="scatter">Scatter Plot</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* X-Axis Selection */}
          <div className="space-y-2">
            <Label htmlFor="x-axis">
              X-Axis {chartType === 'pie' && '(Category)'}
              {chartType === 'bar' && '(Category)'}
              {(chartType === 'line' || chartType === 'scatter') && '(Numeric)'}
            </Label>
            {columnsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading columns...
              </div>
            ) : (
              <Select value={xAxis} onValueChange={setXAxis}>
                <SelectTrigger id="x-axis">
                  <SelectValue placeholder="Select X-axis column" />
                </SelectTrigger>
                <SelectContent>
                  {(chartType === 'pie' || chartType === 'bar'
                    ? stringColumns
                    : numericColumns
                  ).map((col) => (
                    <SelectItem key={col.name} value={col.name}>
                      {col.name} ({col.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Y-Axis Selection (not for pie charts) */}
          {chartType !== 'pie' && (
            <div className="space-y-2">
              <Label htmlFor="y-axis">
                Y-Axis {chartType === 'bar' && '(Numeric)'}
                {(chartType === 'line' || chartType === 'scatter') && '(Numeric)'}
              </Label>
              {columnsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading columns...
                </div>
              ) : (
                <Select value={yAxis} onValueChange={setYAxis}>
                  <SelectTrigger id="y-axis">
                    <SelectValue placeholder="Select Y-axis column" />
                  </SelectTrigger>
                  <SelectContent>
                    {numericColumns.map((col) => (
                      <SelectItem key={col.name} value={col.name}>
                        {col.name} ({col.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Help Text */}
          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
            <p className="font-medium mb-1">Chart Requirements:</p>
            <ul className="list-disc list-inside space-y-1">
              {chartType === 'bar' && (
                <>
                  <li>X-axis: Categorical column (string)</li>
                  <li>Y-axis: Numeric column (number)</li>
                </>
              )}
              {chartType === 'pie' && (
                <li>Category: Categorical column (string)</li>
              )}
              {(chartType === 'line' || chartType === 'scatter') && (
                <>
                  <li>X-axis: Numeric column (number)</li>
                  <li>Y-axis: Numeric column (number)</li>
                </>
              )}
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={createChartMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!canCreate() || createChartMutation.isPending}
            className="bg-cyan-500 hover:bg-cyan-600"
          >
            {createChartMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Chart'
            )}
          </Button>
        </DialogFooter>
        {createChartMutation.isError && (
          <div className="text-sm text-red-500 mt-2">
            {createChartMutation.error?.message || 'Failed to create chart'}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}


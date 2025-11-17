import { useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ParsedData } from "@shared/schema";

interface DataTableProps {
  data: ParsedData;
}

export function DataTable({ data }: DataTableProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedRows = [...data.rows].sort((a, b) => {
    if (!sortColumn) return 0;
    
    const aVal = a[sortColumn];
    const bVal = b[sortColumn];
    
    if (aVal === bVal) return 0;
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    
    const comparison = aVal > bVal ? 1 : -1;
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const displayRows = sortedRows.slice(0, 100); // Limit to 100 rows for performance

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full" data-testid="table-data">
          <thead className="bg-muted/50 sticky top-0 z-10">
            <tr>
              {data.columns.map((column) => (
                <th
                  key={column}
                  className="px-4 py-3 text-left border-b"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort(column)}
                    className="h-auto p-0 hover:bg-transparent font-semibold text-sm gap-2"
                    data-testid={`button-sort-${column}`}
                  >
                    <span>{column}</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                  <Badge variant="outline" className="ml-2 text-xs">
                    {data.columnTypes[column]}
                  </Badge>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b hover-elevate transition-all duration-150"
                data-testid={`row-data-${rowIndex}`}
              >
                {data.columns.map((column) => (
                  <td
                    key={column}
                    className="px-4 py-3 text-sm font-mono"
                    data-testid={`cell-${rowIndex}-${column}`}
                  >
                    {row[column] !== null && row[column] !== undefined
                      ? String(row[column])
                      : <span className="text-muted-foreground italic">null</span>
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.rows.length > 100 && (
        <div className="px-4 py-3 bg-muted/30 text-sm text-muted-foreground text-center border-t">
          Showing first 100 rows of {data.rows.length.toLocaleString()} total rows
        </div>
      )}
    </Card>
  );
}

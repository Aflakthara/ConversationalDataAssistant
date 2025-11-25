import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  isUploading: boolean;
}

export function UploadZone({ onFileSelect, isUploading }: UploadZoneProps) {
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const onDropRejected = useCallback(() => {
    toast({
      title: "Unsupported File Type",
      description: "Please upload a CSV, Excel (XLSX/XLS), JSON, or PDF file.",
      variant: "destructive",
    });
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/json': ['.json'],
      'application/pdf': ['.pdf'],
    },
    multiple: false,
    disabled: isUploading,
  });

  return (
    <Card
      {...getRootProps()}
      className={`
        border-2 border-dashed transition-all duration-300 cursor-pointer
        ${isDragActive ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-border hover-elevate'}
        ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      data-testid="upload-zone"
    >
      <input {...getInputProps()} data-testid="input-file" />
      <div className="p-12 flex flex-col items-center justify-center space-y-6 min-h-[320px]">
        <div className={`
          w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300
          ${isDragActive ? 'bg-primary/20 scale-110' : 'bg-primary/10'}
        `}>
          {isUploading ? (
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <Upload className={`w-10 h-10 ${isDragActive ? 'text-primary' : 'text-primary/70'}`} />
          )}
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-2xl font-semibold">
            {isUploading ? 'Uploading...' : isDragActive ? 'Drop your file here' : 'Upload Your Data'}
          </h3>
          <p className="text-muted-foreground max-w-md">
            {isUploading 
              ? 'Processing your file and generating insights...'
              : 'Drag and drop your CSV, Excel, JSON, or PDF file here, or click to browse'
            }
          </p>
        </div>

        {!isUploading && (
          <Button size="lg" variant="default" data-testid="button-browse">
            <File className="w-5 h-5 mr-2" />
            Browse Files
          </Button>
        )}

        <div className="text-xs text-muted-foreground">
          Maximum file size: 10MB
        </div>
      </div>
    </Card>
  );
}

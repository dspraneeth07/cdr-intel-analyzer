
import React, { useCallback, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, X, CheckCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import Papa from 'papaparse';
import { processCDRData } from '@/utils/cdrProcessor';

interface CDRUploaderProps {
  onFilesUploaded: (files: any[]) => void;
  onProcessingStart: () => void;
  onProcessingComplete: (data: any[]) => void;
}

const CDRUploader: React.FC<CDRUploaderProps> = ({
  onFilesUploaded,
  onProcessingStart,
  onProcessingComplete
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    const csvFiles = droppedFiles.filter(file => 
      file.name.toLowerCase().endsWith('.csv')
    );

    if (csvFiles.length === 0) {
      toast({
        title: "Invalid File Type",
        description: "Please upload CSV files only.",
        variant: "destructive"
      });
      return;
    }

    setFiles(prev => [...prev, ...csvFiles]);
    toast({
      title: "Files Added",
      description: `${csvFiles.length} CSV file(s) added for processing.`
    });
  }, [toast]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const csvFiles = selectedFiles.filter(file => 
      file.name.toLowerCase().endsWith('.csv')
    );
    
    setFiles(prev => [...prev, ...csvFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processFiles = async () => {
    if (files.length === 0) {
      toast({
        title: "No Files Selected",
        description: "Please select CSV files to process.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    onProcessingStart();

    try {
      const processedData = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(((i + 1) / files.length) * 100);

        const csvData = await new Promise<any[]>((resolve, reject) => {
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              if (results.errors.length > 0) {
                console.log('CSV parsing warnings:', results.errors);
              }
              resolve(results.data);
            },
            error: (error) => reject(error)
          });
        });

        const processed = processCDRData(csvData, file.name);
        processedData.push(processed);
      }

      onFilesUploaded(files);
      onProcessingComplete(processedData);
      
      toast({
        title: "Processing Complete",
        description: `Successfully processed ${files.length} CDR file(s).`
      });

    } catch (error) {
      console.error('Error processing files:', error);
      toast({
        title: "Processing Error",
        description: "An error occurred while processing the files.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="space-y-6">
      {/* Drag & Drop Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          dragActive 
            ? 'border-blue-500 bg-blue-500/10' 
            : 'border-slate-600 hover:border-slate-500'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center space-y-4">
          <div className="p-4 bg-slate-700/50 rounded-full">
            <Upload className="h-8 w-8 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Drop CDR Files Here
            </h3>
            <p className="text-slate-400 mb-4">
              Or click to browse and select multiple CSV files
            </p>
          </div>
          <input
            type="file"
            multiple
            accept=".csv"
            onChange={handleFileInput}
            className="hidden"
            id="file-input"
          />
          <Button 
            asChild 
            variant="outline" 
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <label htmlFor="file-input" className="cursor-pointer">
              Browse Files
            </label>
          </Button>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <Card className="bg-slate-800/30 border-slate-700">
          <CardContent className="p-4">
            <h4 className="text-white font-medium mb-4">Selected Files ({files.length})</h4>
            <div className="space-y-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-4 w-4 text-blue-400" />
                    <span className="text-sm text-white">{file.name}</span>
                    <span className="text-xs text-slate-400">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeFile(index)}
                    className="text-slate-400 hover:text-red-400"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Process Button & Progress */}
      <div className="space-y-4">
        <Button 
          onClick={processFiles}
          disabled={files.length === 0 || isProcessing}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing Files...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Process {files.length} File(s)
            </>
          )}
        </Button>

        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-slate-400">
              <span>Processing Progress</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}
      </div>
    </div>
  );
};

export default CDRUploader;

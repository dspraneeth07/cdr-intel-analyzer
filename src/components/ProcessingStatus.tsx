
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, FileText, AlertCircle } from 'lucide-react';

interface ProcessingStatusProps {
  uploadedFiles: File[];
  isProcessing: boolean;
  processedData: any[];
}

const ProcessingStatus: React.FC<ProcessingStatusProps> = ({
  uploadedFiles,
  isProcessing,
  processedData
}) => {
  const getStatusIcon = (file: File, index: number) => {
    if (isProcessing && index < processedData.length) {
      return <CheckCircle className="h-4 w-4 text-green-400" />;
    } else if (isProcessing) {
      return <Clock className="h-4 w-4 text-yellow-400 animate-spin" />;
    } else if (!isProcessing && processedData.length > index) {
      return <CheckCircle className="h-4 w-4 text-green-400" />;
    } else {
      return <FileText className="h-4 w-4 text-slate-400" />;
    }
  };

  const getStatusText = (file: File, index: number) => {
    if (isProcessing && index < processedData.length) {
      return "Completed";
    } else if (isProcessing) {
      return "Processing...";
    } else if (!isProcessing && processedData.length > index) {
      return "Ready for Download";
    } else {
      return "Pending";
    }
  };

  const getStatusBadge = (file: File, index: number) => {
    const status = getStatusText(file, index);
    const variant = status === "Completed" || status === "Ready for Download" 
      ? "default" 
      : status === "Processing..." 
      ? "secondary" 
      : "outline";
    
    return (
      <Badge variant={variant} className={
        status === "Completed" || status === "Ready for Download" 
          ? "bg-green-600 hover:bg-green-700" 
          : status === "Processing..." 
          ? "bg-yellow-600 hover:bg-yellow-700" 
          : ""
      }>
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Clock className="h-5 w-5 mr-2 text-blue-400" />
            Processing Status
          </CardTitle>
          <CardDescription className="text-slate-400">
            Monitor the processing status of your uploaded CDR files
          </CardDescription>
        </CardHeader>
        <CardContent>
          {uploadedFiles.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400">No files uploaded yet</p>
              <p className="text-sm text-slate-500">Upload CDR files to start processing</p>
            </div>
          ) : (
            <div className="space-y-4">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(file, index)}
                    <div>
                      <h4 className="text-white font-medium">{file.name}</h4>
                      <p className="text-sm text-slate-400">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(file, index)}
                    {processedData[index] && (
                      <div className="text-sm text-slate-400">
                        MSISDN: {processedData[index].msisdn}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {processedData.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Processing Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-600/20 rounded-lg border border-green-600/30">
                <div className="text-2xl font-bold text-green-400">{processedData.length}</div>
                <div className="text-sm text-slate-400">Files Processed</div>
              </div>
              <div className="text-center p-4 bg-blue-600/20 rounded-lg border border-blue-600/30">
                <div className="text-2xl font-bold text-blue-400">
                  {processedData.reduce((sum, data) => sum + data.callDetails.length, 0)}
                </div>
                <div className="text-sm text-slate-400">Total Call Records</div>
              </div>
              <div className="text-center p-4 bg-purple-600/20 rounded-lg border border-purple-600/30">
                <div className="text-2xl font-bold text-purple-400">8</div>
                <div className="text-sm text-slate-400">Sheets per File</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProcessingStatus;

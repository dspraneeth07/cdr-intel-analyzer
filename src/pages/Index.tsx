
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Download, FileSpreadsheet, Activity } from 'lucide-react';
import CDRUploader from '@/components/CDRUploader';
import BulkDownloader from '@/components/BulkDownloader';

const Index = () => {
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header */}
      <div className="border-b border-blue-200 bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-blue-600 rounded-lg">
                <img 
                  src="/lovable-uploads/267315df-bfd6-4db7-b92e-d2eaf39b0875.png" 
                  alt="EAGLE Logo" 
                  className="h-12 w-12 object-contain"
                />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-blue-900">EAGLE INTEL</h1>
                <p className="text-sm text-blue-600">Elite Action Group For Drug Law Enforcement</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-blue-600">
              <Activity className="h-5 w-5" />
              <span className="text-sm font-medium">CDR Analysis Platform</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8 text-center">
          <h2 className="text-4xl font-bold text-blue-900 mb-3">Call Data Record Analysis</h2>
          <p className="text-lg text-blue-700">Upload your CDR files and get comprehensive Excel reports instantly</p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Upload Section */}
          <Card className="bg-white/90 border-blue-200 shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-blue-900 flex items-center justify-center text-2xl">
                <Upload className="h-6 w-6 mr-3 text-blue-600" />
                Upload CDR Files
              </CardTitle>
              <CardDescription className="text-blue-600 text-base">
                Upload single or multiple CDR CSV files for instant analysis and Excel report generation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CDRUploader 
                onFilesUploaded={() => {}}
                onProcessingStart={() => setIsProcessing(true)}
                onProcessingComplete={(data) => {
                  setProcessedData(data);
                  setIsProcessing(false);
                }}
              />
            </CardContent>
          </Card>

          {/* Processing Status */}
          {isProcessing && (
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-center space-x-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  <span className="text-lg font-medium">Analyzing CDR Data...</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Download Section */}
          {processedData.length > 0 && (
            <Card className="bg-white/90 border-green-200 shadow-lg">
              <CardHeader className="text-center">
                <CardTitle className="text-green-800 flex items-center justify-center text-2xl">
                  <Download className="h-6 w-6 mr-3 text-green-600" />
                  Download Excel Reports
                </CardTitle>
                <CardDescription className="text-green-600 text-base">
                  Your CDR analysis is complete. Download the comprehensive Excel reports below.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BulkDownloader processedData={processedData} />
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">How to Use:</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">1</div>
                  <div>
                    <h4 className="font-medium text-blue-900">Upload</h4>
                    <p className="text-sm text-blue-700">Upload your CDR CSV files</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">2</div>
                  <div>
                    <h4 className="font-medium text-blue-900">Analyze</h4>
                    <p className="text-sm text-blue-700">Automatic analysis & processing</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">3</div>
                  <div>
                    <h4 className="font-medium text-blue-900">Download</h4>
                    <p className="text-sm text-blue-700">Get comprehensive Excel reports</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;

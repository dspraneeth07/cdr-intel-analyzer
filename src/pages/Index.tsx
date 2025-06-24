
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Download, FileSpreadsheet, Shield, Activity } from 'lucide-react';
import CDRUploader from '@/components/CDRUploader';
import ProcessingStatus from '@/components/ProcessingStatus';
import BulkDownloader from '@/components/BulkDownloader';

const Index = () => {
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">CDRIntel</h1>
                <p className="text-sm text-slate-400">Criminal Investigation CDR Analysis Platform</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-slate-400">
              <Activity className="h-4 w-4" />
              <span className="text-sm">TG ANB Intelligence Division</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Call Data Record Analysis</h2>
          <p className="text-slate-400">Upload CDR files to generate comprehensive Excel reports with detailed analysis</p>
        </div>

        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800 border-slate-700">
            <TabsTrigger value="upload" className="data-[state=active]:bg-blue-600">
              <Upload className="h-4 w-4 mr-2" />
              Upload CDRs
            </TabsTrigger>
            <TabsTrigger value="processing" className="data-[state=active]:bg-blue-600">
              <Activity className="h-4 w-4 mr-2" />
              Processing
            </TabsTrigger>
            <TabsTrigger value="download" className="data-[state=active]:bg-blue-600">
              <Download className="h-4 w-4 mr-2" />
              Download Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <FileSpreadsheet className="h-5 w-5 mr-2 text-blue-400" />
                  CDR File Upload
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Upload single or multiple CDR CSV files for analysis. Supports Vodafone, Airtel, BSNL, and other telecom formats.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CDRUploader 
                  onFilesUploaded={setUploadedFiles}
                  onProcessingStart={() => setIsProcessing(true)}
                  onProcessingComplete={(data) => {
                    setProcessedData(data);
                    setIsProcessing(false);
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="processing" className="space-y-6">
            <ProcessingStatus 
              uploadedFiles={uploadedFiles}
              isProcessing={isProcessing}
              processedData={processedData}
            />
          </TabsContent>

          <TabsContent value="download" className="space-y-6">
            <BulkDownloader processedData={processedData} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;

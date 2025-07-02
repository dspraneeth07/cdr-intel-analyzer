
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, Network } from 'lucide-react';
import { Link } from 'react-router-dom';
import CDRUploader from '@/components/CDRUploader';
import ProcessingStatus from '@/components/ProcessingStatus';
import BulkDownloader from '@/components/BulkDownloader';

const Index = () => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedData, setProcessedData] = useState<any[]>([]);

  const handleFilesUploaded = (files: File[]) => {
    setUploadedFiles(files);
  };

  const handleProcessingStart = () => {
    setIsProcessing(true);
  };

  const handleProcessingComplete = (data: any[]) => {
    setProcessedData(data);
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            CDR Analysis Tool
          </h1>
          <p className="text-xl text-slate-300 mb-8">
            Process and analyze Call Detail Records with advanced insights
          </p>
          
          {/* Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
            <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <FileText className="h-6 w-6 mr-2 text-blue-400" />
                  CDR Processing
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Upload and process individual CDR files into multiple analysis sheets
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Link to="/network-analysis">
              <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Network className="h-6 w-6 mr-2 text-purple-400" />
                    Network Analysis
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Analyze multiple CDR files to identify network relationships and patterns
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </div>

        <Tabs defaultValue="upload" className="max-w-6xl mx-auto">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800/50">
            <TabsTrigger value="upload" className="text-slate-300">Upload & Process</TabsTrigger>
            <TabsTrigger value="status" className="text-slate-300">Processing Status</TabsTrigger>
            <TabsTrigger value="download" className="text-slate-300">Download Results</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-6">
            <Card className="bg-slate-800/30 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">CDR File Processing</CardTitle>
                <CardDescription className="text-slate-400">
                  Upload your CDR CSV files and process them into comprehensive analysis sheets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CDRUploader
                  onFilesUploaded={handleFilesUploaded}
                  onProcessingStart={handleProcessingStart}
                  onProcessingComplete={handleProcessingComplete}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="status" className="mt-6">
            <ProcessingStatus
              uploadedFiles={uploadedFiles}
              isProcessing={isProcessing}
              processedData={processedData}
            />
          </TabsContent>

          <TabsContent value="download" className="mt-6">
            <Card className="bg-slate-800/30 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Download className="h-5 w-5 mr-2 text-green-400" />
                  Download Processed Files
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Download your processed CDR analysis files in Excel format
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BulkDownloader processedData={processedData} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;

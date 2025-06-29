
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Download, FileSpreadsheet, Activity, Shield } from 'lucide-react';
import CDRUploader from '@/components/CDRUploader';
import BulkDownloader from '@/components/BulkDownloader';

const Index = () => {
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 font-poppins">
      {/* Professional Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 shadow-2xl">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-xl blur opacity-75"></div>
                <div className="relative p-3 bg-white rounded-xl shadow-lg">
                  <img 
                    src="/lovable-uploads/267315df-bfd6-4db7-b92e-d2eaf39b0875.png" 
                    alt="EAGLE Logo" 
                    className="h-16 w-16 object-contain"
                  />
                </div>
              </div>
              <div className="text-white">
                <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                  EAGLE INTEL
                </h1>
                <p className="text-xl font-medium text-blue-200 mt-1 tracking-wide">
                  ELITE ACTION GROUP FOR DRUG LAW ENFORCEMENT
                </p>
                <p className="text-sm text-blue-300 mt-2 font-light">
                  CDR Analysis Tool
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 border border-white/20">
                <Shield className="h-6 w-6 text-blue-300" />
                <span className="text-white font-medium">Secure Analysis Platform</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12">
        <div className="mb-12 text-center">
          <h2 className="text-4xl font-bold text-slate-800 mb-4">Call Data Record Analysis</h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Upload your CDR files and get comprehensive Excel reports with detailed analysis instantly
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Upload Section */}
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-xl">
            <CardHeader className="text-center bg-gradient-to-r from-blue-50 to-slate-50 rounded-t-lg">
              <CardTitle className="text-slate-800 flex items-center justify-center text-2xl font-semibold">
                <Upload className="h-7 w-7 mr-3 text-blue-600" />
                Upload CDR Files
              </CardTitle>
              <CardDescription className="text-slate-600 text-base">
                Upload single or multiple CDR CSV files for instant analysis and Excel report generation
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
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
            <Card className="bg-gradient-to-r from-blue-600 to-slate-700 text-white shadow-xl">
              <CardContent className="p-8">
                <div className="flex items-center justify-center space-x-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  <span className="text-xl font-medium">Analyzing CDR Data...</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Download Section */}
          {processedData.length > 0 && (
            <Card className="bg-white/80 backdrop-blur-sm border-emerald-200 shadow-xl">
              <CardHeader className="text-center bg-gradient-to-r from-emerald-50 to-green-50 rounded-t-lg">
                <CardTitle className="text-emerald-800 flex items-center justify-center text-2xl font-semibold">
                  <Download className="h-7 w-7 mr-3 text-emerald-600" />
                  Download Excel Reports
                </CardTitle>
                <CardDescription className="text-emerald-600 text-base">
                  Your CDR analysis is complete. Download the comprehensive Excel reports below.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <BulkDownloader processedData={processedData} />
              </CardContent>
            </Card>
          )}

          {/* Professional Instructions */}
          <Card className="bg-gradient-to-r from-slate-50 to-blue-50 border-slate-200 shadow-lg">
            <CardContent className="p-8">
              <h3 className="text-2xl font-semibold text-slate-800 mb-6 text-center">How to Use</h3>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full blur opacity-20"></div>
                    <div className="relative bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto shadow-lg">1</div>
                  </div>
                  <h4 className="font-semibold text-slate-800 text-lg mb-2">Upload Files</h4>
                  <p className="text-slate-600">Upload your CDR CSV files securely</p>
                </div>
                <div className="text-center">
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur opacity-20"></div>
                    <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto shadow-lg">2</div>
                  </div>
                  <h4 className="font-semibold text-slate-800 text-lg mb-2">Auto Analysis</h4>
                  <p className="text-slate-600">Automatic processing & analysis</p>
                </div>
                <div className="text-center">
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full blur opacity-20"></div>
                    <div className="relative bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto shadow-lg">3</div>
                  </div>
                  <h4 className="font-semibold text-slate-800 text-lg mb-2">Download Reports</h4>
                  <p className="text-slate-600">Get comprehensive Excel reports</p>
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

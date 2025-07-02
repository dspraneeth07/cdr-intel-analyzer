import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Download, FileSpreadsheet, Activity, Shield, Network } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import CDRUploader from '@/components/CDRUploader';
import BulkDownloader from '@/components/BulkDownloader';

const Index = () => {
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

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
                  CDR Analysis Tool - Multi-Provider Support
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => navigate('/network-analysis')}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-full font-semibold shadow-lg"
              >
                <Network className="h-5 w-5 mr-2" />
                Network Analysis
              </Button>
              <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 border border-white/20">
                <Shield className="h-6 w-6 text-blue-300" />
                <span className="text-white font-medium">Multi-Provider Analysis</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12">
        <div className="mb-12 text-center">
          <h2 className="text-4xl font-bold text-slate-800 mb-4">
            Advanced CDR Analysis Platform
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Upload CDR files from Airtel, BSNL, Jio, Vodafone and get comprehensive Excel reports 
            with 16 detailed analysis sheets instantly
          </p>
          <div className="flex justify-center space-x-4 mt-6">
            <div className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              Airtel Support
            </div>
            <div className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              BSNL Support
            </div>
            <div className="px-4 py-2 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
              Jio Support
            </div>
            <div className="px-4 py-2 bg-red-100 text-red-800 rounded-full text-sm font-medium">
              Vodafone Support
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Upload Section */}
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-xl">
            <CardHeader className="text-center bg-gradient-to-r from-blue-50 to-slate-50 rounded-t-lg">
              <CardTitle className="text-slate-800 flex items-center justify-center text-2xl font-semibold">
                <Upload className="h-7 w-7 mr-3 text-blue-600" />
                Upload Multi-Provider CDR Files
              </CardTitle>
              <CardDescription className="text-slate-600 text-base">
                Upload mixed CDR CSV files from different providers. Auto-detection and processing 
                with 16 comprehensive analysis sheets per file.
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
                  <span className="text-xl font-medium">
                    Analyzing Multi-Provider CDR Data...
                  </span>
                </div>
                <p className="text-center text-blue-200 mt-4">
                  Auto-detecting providers and generating comprehensive analysis
                </p>
              </CardContent>
            </Card>
          )}

          {/* Download Section */}
          {processedData.length > 0 && (
            <Card className="bg-white/80 backdrop-blur-sm border-emerald-200 shadow-xl">
              <CardHeader className="text-center bg-gradient-to-r from-emerald-50 to-green-50 rounded-t-lg">
                <CardTitle className="text-emerald-800 flex items-center justify-center text-2xl font-semibold">
                  <Download className="h-7 w-7 mr-3 text-emerald-600" />
                  Download Comprehensive Reports
                </CardTitle>
                <CardDescription className="text-emerald-600 text-base">
                  Your multi-provider CDR analysis is complete. Each file contains 16 detailed 
                  analysis sheets with comprehensive insights.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <BulkDownloader processedData={processedData} />
              </CardContent>
            </Card>
          )}

          {/* Enhanced Instructions */}
          <Card className="bg-gradient-to-r from-slate-50 to-blue-50 border-slate-200 shadow-lg">
            <CardContent className="p-8">
              <h3 className="text-2xl font-semibold text-slate-800 mb-6 text-center">
                How to Use - Multi-Provider Analysis
              </h3>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full blur opacity-20"></div>
                    <div className="relative bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto shadow-lg">1</div>
                  </div>
                  <h4 className="font-semibold text-slate-800 text-lg mb-2">Upload Mixed Files</h4>
                  <p className="text-slate-600">Upload CDR files from any provider - Airtel, BSNL, Jio, Vodafone</p>
                </div>
                <div className="text-center">
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur opacity-20"></div>
                    <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto shadow-lg">2</div>
                  </div>
                  <h4 className="font-semibold text-slate-800 text-lg mb-2">Auto Detection</h4>
                  <p className="text-slate-600">Automatic provider detection & comprehensive analysis</p>
                </div>
                <div className="text-center">
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full blur opacity-20"></div>
                    <div className="relative bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto shadow-lg">3</div>
                  </div>
                  <h4 className="font-semibold text-slate-800 text-lg mb-2">Get 16 Analysis Sheets</h4>
                  <p className="text-slate-600">Comprehensive reports with detailed insights</p>
                </div>
              </div>
              
              <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-3">16 Analysis Sheets Include:</h4>
                <div className="grid md:grid-cols-2 gap-3 text-sm text-blue-800">
                  <div>• Mapping & Summary Analysis</div>
                  <div>• Max Calls & Duration Reports</div>
                  <div>• Location & Stay Analysis</div>
                  <div>• Roaming & Period Reports</div>
                  <div>• IMEI & IMSI Tracking</div>
                  <div>• Night & Day Activity Maps</div>
                  <div>• Work/Home Location Analysis</div>
                  <div>• And 9 more detailed sheets</div>
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

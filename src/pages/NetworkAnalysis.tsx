
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Network, MapPin, Users, Activity } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import NetworkGraphView from '@/components/NetworkGraphView';
import LocationMapView from '@/components/LocationMapView';
import { analyzeNetworkFromCDRs } from '@/utils/networkAnalyzer';
import type { NetworkAnalysisResult } from '@/utils/networkAnalyzer';

const NetworkAnalysis = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<NetworkAnalysisResult | null>(null);
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(event.target.files || []);
    setFiles(prev => [...prev, ...uploadedFiles]);
    toast({
      title: "Files Added",
      description: `${uploadedFiles.length} CDR files added for analysis`,
    });
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const analyzeNetwork = async () => {
    if (files.length === 0) {
      toast({
        title: "No Files",
        description: "Please upload CDR files to analyze",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      console.log('Starting network analysis for', files.length, 'files');
      const result = await analyzeNetworkFromCDRs(files);
      console.log('Analysis result:', result);
      setAnalysisResult(result);
      toast({
        title: "Analysis Complete",
        description: `Network analysis completed for ${files.length} CDR files`,
      });
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze CDR network. Please check file formats.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 font-poppins">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 shadow-2xl">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-xl blur opacity-75"></div>
                <div className="relative p-3 bg-white rounded-xl shadow-lg">
                  <Network className="h-16 w-16 text-blue-600" />
                </div>
              </div>
              <div className="text-white">
                <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                  CDR NETWORK ANALYZER
                </h1>
                <p className="text-xl font-medium text-blue-200 mt-1 tracking-wide">
                  Criminal Network Detection & Role Classification
                </p>
                <p className="text-sm text-blue-300 mt-2 font-light">
                  Kingpin • Middleman • Peddler Identification System
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 border border-white/20">
                <Users className="h-6 w-6 text-blue-300" />
                <span className="text-white font-medium">Multi-CDR Analysis</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12">
        <div className="mb-12 text-center">
          <h2 className="text-4xl font-bold text-slate-800 mb-4">
            Criminal Network Analysis Platform
          </h2>
          <p className="text-xl text-slate-600 max-w-4xl mx-auto">
            Upload multiple CDR files to analyze criminal networks, identify key players, 
            and visualize connections through advanced graph theory and behavioral pattern mining
          </p>
        </div>

        <div className="max-w-6xl mx-auto space-y-8">
          {/* Upload Section */}
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-xl">
            <CardHeader className="text-center bg-gradient-to-r from-blue-50 to-slate-50 rounded-t-lg">
              <CardTitle className="text-slate-800 flex items-center justify-center text-2xl font-semibold">
                <Upload className="h-7 w-7 mr-3 text-blue-600" />
                Upload Multiple CDR Files
              </CardTitle>
              <CardDescription className="text-slate-600 text-base">
                Upload CDR files from multiple suspects to analyze criminal network patterns
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div>
                <Label htmlFor="cdr-files" className="text-base font-medium">Select CDR Files (CSV format)</Label>
                <Input
                  id="cdr-files"
                  type="file"
                  multiple
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="mt-2"
                />
              </div>

              {files.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-base font-medium">Uploaded Files ({files.length})</Label>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                        <span className="text-sm">{file.name}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={analyzeNetwork}
                disabled={isAnalyzing || files.length === 0}
                className="w-full bg-gradient-to-r from-blue-600 to-slate-700 hover:from-blue-700 hover:to-slate-800 text-white py-3 text-lg"
              >
                {isAnalyzing ? (
                  <>
                    <Activity className="h-5 w-5 mr-2 animate-spin" />
                    Analyzing Network...
                  </>
                ) : (
                  <>
                    <Network className="h-5 w-5 mr-2" />
                    Analyze Criminal Network
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results Section */}
          {analysisResult && (
            <Card className="bg-white/80 backdrop-blur-sm border-emerald-200 shadow-xl">
              <CardHeader className="text-center bg-gradient-to-r from-emerald-50 to-green-50 rounded-t-lg">
                <CardTitle className="text-emerald-800 flex items-center justify-center text-2xl font-semibold">
                  <Network className="h-7 w-7 mr-3 text-emerald-600" />
                  Network Analysis Results
                </CardTitle>
                <CardDescription className="text-emerald-600 text-base">
                  Criminal network visualization and role classification
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <Tabs defaultValue="internal-graph" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="internal-graph">Internal Network</TabsTrigger>
                    <TabsTrigger value="internal-map">Internal Map</TabsTrigger>
                    <TabsTrigger value="external-graph">Full Network</TabsTrigger>
                    <TabsTrigger value="external-map">Full Map</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="internal-graph" className="mt-6">
                    <NetworkGraphView 
                      data={analysisResult.internalNetwork}
                      title="Internal CDR Network"
                      description="Connections between CDR holders only"
                    />
                  </TabsContent>
                  
                  <TabsContent value="internal-map" className="mt-6">
                    <LocationMapView
                      data={analysisResult.internalNetwork}
                      title="Internal Network Location Map"
                    />
                  </TabsContent>
                  
                  <TabsContent value="external-graph" className="mt-6">
                    <NetworkGraphView 
                      data={analysisResult.fullNetwork}
                      title="Complete Criminal Network"
                      description="All connections including external contacts"
                    />
                  </TabsContent>
                  
                  <TabsContent value="external-map" className="mt-6">
                    <LocationMapView
                      data={analysisResult.fullNetwork}
                      title="Complete Network Location Map"
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default NetworkAnalysis;

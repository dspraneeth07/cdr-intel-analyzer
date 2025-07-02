
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Network, Users, Crown, Layers, TrendingUp } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import Papa from 'papaparse';
import { processCDRData, ProcessedCDRData } from '@/utils/cdrProcessor';
import { analyzeNetworkData, NetworkAnalysis } from '@/utils/networkAnalyzer';
import NetworkMap from '@/components/NetworkMap';

const NetworkAnalysis: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [networkAnalysis, setNetworkAnalysis] = useState<NetworkAnalysis | null>(null);
  const { toast } = useToast();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const csvFiles = selectedFiles.filter(file => 
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
      description: `${csvFiles.length} CSV file(s) added for network analysis.`
    });
  };

  const processNetworkAnalysis = async () => {
    if (files.length === 0) {
      toast({
        title: "No Files Selected",
        description: "Please upload CDR files for network analysis.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      const processedData: ProcessedCDRData[] = [];
      
      for (const file of files) {
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

      const analysis = analyzeNetworkData(processedData);
      setNetworkAnalysis(analysis);
      
      toast({
        title: "Network Analysis Complete",
        description: `Analyzed ${files.length} CDR files and found ${analysis.nodes.length} network participants.`
      });

    } catch (error) {
      console.error('Error processing network analysis:', error);
      toast({
        title: "Processing Error",
        description: "An error occurred while analyzing the network.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const resetAnalysis = () => {
    setFiles([]);
    setNetworkAnalysis(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center">
            <Network className="h-8 w-8 mr-3 text-purple-400" />
            CDR Network Analysis
          </h1>
          <p className="text-slate-300">
            Analyze multiple CDR files to identify network relationships, kingpins, middlemen, and peddlers
          </p>
        </div>

        {!networkAnalysis ? (
          <div className="space-y-6">
            {/* File Upload Section */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Upload className="h-5 w-5 mr-2 text-blue-400" />
                  Upload CDR Files
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Upload multiple CDR CSV files for network analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <input
                    type="file"
                    multiple
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-slate-400
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-purple-600 file:text-white
                      hover:file:bg-purple-700
                      file:cursor-pointer cursor-pointer"
                  />
                  
                  {files.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-white font-medium">Selected Files ({files.length})</h4>
                      {files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                          <span className="text-slate-300 text-sm">{file.name}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFile(index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <Button 
                    onClick={processNetworkAnalysis}
                    disabled={files.length === 0 || isProcessing}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {isProcessing ? "Analyzing Network..." : `Analyze ${files.length} File(s)`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Network Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-4 text-center">
                  <Users className="h-8 w-8 mx-auto mb-2 text-blue-400" />
                  <div className="text-2xl font-bold text-white">{networkAnalysis.statistics.totalNodes}</div>
                  <div className="text-sm text-slate-400">Total Participants</div>
                </CardContent>
              </Card>
              
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-4 text-center">
                  <Crown className="h-8 w-8 mx-auto mb-2 text-red-400" />
                  <div className="text-2xl font-bold text-white">{networkAnalysis.kingpins.length}</div>
                  <div className="text-sm text-slate-400">Kingpins</div>
                </CardContent>
              </Card>
              
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-4 text-center">
                  <Layers className="h-8 w-8 mx-auto mb-2 text-orange-400" />
                  <div className="text-2xl font-bold text-white">{networkAnalysis.middlemen.length}</div>
                  <div className="text-sm text-slate-400">Middlemen</div>
                </CardContent>
              </Card>
              
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-4 text-center">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-400" />
                  <div className="text-2xl font-bold text-white">{networkAnalysis.peddlers.length}</div>
                  <div className="text-sm text-slate-400">Peddlers</div>
                </CardContent>
              </Card>
            </div>

            {/* Network Visualization and Analysis */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-white">Network Visualization</CardTitle>
                  <CardDescription className="text-slate-400">
                    Interactive network map showing relationships and participant roles
                  </CardDescription>
                </div>
                <Button onClick={resetAnalysis} variant="outline" className="border-slate-600 text-slate-300">
                  New Analysis
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs defaultValue="map" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-slate-700">
                    <TabsTrigger value="map" className="text-slate-300">Network Map</TabsTrigger>
                    <TabsTrigger value="participants" className="text-slate-300">Participants</TabsTrigger>
                    <TabsTrigger value="common" className="text-slate-300">Common Contacts</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="map" className="h-96">
                    <NetworkMap 
                      networkNodes={networkAnalysis.nodes} 
                      networkEdges={networkAnalysis.edges} 
                    />
                  </TabsContent>
                  
                  <TabsContent value="participants" className="p-6">
                    <div className="space-y-6">
                      {networkAnalysis.kingpins.length > 0 && (
                        <div>
                          <h3 className="text-white font-semibold mb-3 flex items-center">
                            <Crown className="h-4 w-4 mr-2 text-red-400" />
                            Kingpins ({networkAnalysis.kingpins.length})
                          </h3>
                          <div className="grid gap-3">
                            {networkAnalysis.kingpins.map(node => (
                              <div key={node.id} className="p-3 bg-red-900/20 border border-red-800 rounded-lg">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="text-white font-medium">{node.label}</div>
                                    <div className="text-sm text-slate-400">
                                      {node.totalCalls} calls • {Math.round(node.totalDuration / 60)} min • {node.uniqueContacts} contacts
                                    </div>
                                  </div>
                                  <Badge variant="destructive">Kingpin</Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {networkAnalysis.middlemen.length > 0 && (
                        <div>
                          <h3 className="text-white font-semibold mb-3 flex items-center">
                            <Layers className="h-4 w-4 mr-2 text-orange-400" />
                            Middlemen ({networkAnalysis.middlemen.length})
                          </h3>
                          <div className="grid gap-3">
                            {networkAnalysis.middlemen.map(node => (
                              <div key={node.id} className="p-3 bg-orange-900/20 border border-orange-800 rounded-lg">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="text-white font-medium">{node.label}</div>
                                    <div className="text-sm text-slate-400">
                                      {node.totalCalls} calls • {Math.round(node.totalDuration / 60)} min • {node.uniqueContacts} contacts
                                    </div>
                                  </div>
                                  <Badge className="bg-orange-600">Middleman</Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {networkAnalysis.peddlers.length > 0 && (
                        <div>
                          <h3 className="text-white font-semibold mb-3 flex items-center">
                            <TrendingUp className="h-4 w-4 mr-2 text-green-400" />
                            Peddlers ({networkAnalysis.peddlers.length})
                          </h3>
                          <div className="grid gap-3">
                            {networkAnalysis.peddlers.map(node => (
                              <div key={node.id} className="p-3 bg-green-900/20 border border-green-800 rounded-lg">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="text-white font-medium">{node.label}</div>
                                    <div className="text-sm text-slate-400">
                                      {node.totalCalls} calls • {Math.round(node.totalDuration / 60)} min • {node.uniqueContacts} contacts
                                    </div>
                                  </div>
                                  <Badge variant="secondary">Peddler</Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="common" className="p-6">
                    <div>
                      <h3 className="text-white font-semibold mb-3">
                        Common Contacts ({networkAnalysis.commonContacts.length})
                      </h3>
                      <div className="text-sm text-slate-400 mb-4">
                        Phone numbers that appear in multiple CDR files
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {networkAnalysis.commonContacts.map((contact, index) => (
                          <div key={index} className="p-2 bg-slate-700/30 rounded text-slate-300 text-sm">
                            {contact}
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default NetworkAnalysis;

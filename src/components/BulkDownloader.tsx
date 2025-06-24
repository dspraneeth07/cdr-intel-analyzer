import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, Package } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';

interface BulkDownloaderProps {
  processedData: any[];
}

const BulkDownloader: React.FC<BulkDownloaderProps> = ({ processedData }) => {
  const { toast } = useToast();

  const generateExcelFile = (data: any) => {
    const workbook = XLSX.utils.book_new();

    // Shortened sheet names to comply with Excel's 31-character limit
    const sheets = [
      { name: `SUMMARY_${data.msisdn.slice(-4)}`, data: data.summary },
      { name: `CALLDETAILS_${data.msisdn.slice(-4)}`, data: data.callDetails },
      { name: `NIGHT_CALLS_${data.msisdn.slice(-4)}`, data: data.nightCallDetails },
      { name: `DAY_CALLS_${data.msisdn.slice(-4)}`, data: data.dayCallDetails },
      { name: `IMEI_SUMMARY_${data.msisdn.slice(-4)}`, data: data.imeiSummary },
      { name: `CDAT_CONTACTS_${data.msisdn.slice(-4)}`, data: data.cdatContacts },
      { name: `DAY_LOCATION_${data.msisdn.slice(-4)}`, data: data.dayLocationAbstract },
      { name: `NIGHT_LOCATION_${data.msisdn.slice(-4)}`, data: data.nightLocationAbstract }
    ];

    sheets.forEach(sheet => {
      const worksheet = XLSX.utils.json_to_sheet(sheet.data);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
    });

    return workbook;
  };

  const downloadSingleFile = (data: any) => {
    try {
      const workbook = generateExcelFile(data);
      const fileName = `CDR_Analysis_${data.msisdn}_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      XLSX.writeFile(workbook, fileName);
      
      toast({
        title: "Download Complete",
        description: `Excel file for ${data.msisdn} has been downloaded.`
      });
    } catch (error) {
      console.error('Error generating Excel file:', error);
      toast({
        title: "Download Error",
        description: "Failed to generate Excel file.",
        variant: "destructive"
      });
    }
  };

  const downloadAllFiles = async () => {
    if (processedData.length === 0) {
      toast({
        title: "No Data",
        description: "No processed data available for download.",
        variant: "destructive"
      });
      return;
    }

    try {
      for (const data of processedData) {
        const workbook = generateExcelFile(data);
        const fileName = `CDR_Analysis_${data.msisdn}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, fileName);
        
        // Small delay between downloads to prevent browser issues
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      toast({
        title: "Bulk Download Complete",
        description: `${processedData.length} Excel files have been downloaded.`
      });
    } catch (error) {
      console.error('Error in bulk download:', error);
      toast({
        title: "Bulk Download Error",
        description: "Failed to download some files.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Download className="h-5 w-5 mr-2 text-blue-400" />
            Download Excel Reports
          </CardTitle>
          <CardDescription className="text-slate-400">
            Download processed CDR data as structured Excel files with multiple analysis sheets
          </CardDescription>
        </CardHeader>
        <CardContent>
          {processedData.length === 0 ? (
            <div className="text-center py-8">
              <FileSpreadsheet className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400">No processed data available</p>
              <p className="text-sm text-slate-500">Process CDR files first to enable downloads</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Bulk Download Section */}
              <div className="p-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-lg border border-blue-600/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-medium">Bulk Download All Files</h3>
                    <p className="text-sm text-slate-400">
                      Download all {processedData.length} processed CDR files at once
                    </p>
                  </div>
                  <Button 
                    onClick={downloadAllFiles}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Download All ({processedData.length})
                  </Button>
                </div>
              </div>

              {/* Individual Files */}
              <div className="space-y-4">
                <h3 className="text-white font-medium">Individual Downloads</h3>
                {processedData.map((data, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileSpreadsheet className="h-5 w-5 text-green-400" />
                      <div>
                        <h4 className="text-white font-medium">CDR Analysis - {data.msisdn}</h4>
                        <p className="text-sm text-slate-400">
                          {data.callDetails.length} call records • 8 analysis sheets
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-sm text-slate-400">
                        Excel File
                      </div>
                      <Button
                        size="sm"
                        onClick={() => downloadSingleFile(data)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkDownloader;

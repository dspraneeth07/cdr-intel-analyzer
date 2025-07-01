
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

    const sheets = [
      { name: `MAPPING_${data.msisdn.slice(-4)}`, data: data.mapping },
      { name: `SUMMARY_${data.msisdn.slice(-4)}`, data: data.summary },
      { name: `MAX_CALLS_${data.msisdn.slice(-4)}`, data: data.maxCalls },
      { name: `MAX_DURATION_${data.msisdn.slice(-4)}`, data: data.maxDuration },
      { name: `MAX_STAY_${data.msisdn.slice(-4)}`, data: data.maxStay },
      { name: `OTHER_STATE_${data.msisdn.slice(-4)}`, data: data.otherStateContactSummary },
      { name: `ROAMING_PERIOD_${data.msisdn.slice(-4)}`, data: data.roamingPeriod },
      { name: `IMEI_PERIOD_${data.msisdn.slice(-4)}`, data: data.imeiPeriod },
      { name: `IMSI_PERIOD_${data.msisdn.slice(-4)}`, data: data.imsiPeriod },
      { name: `OFF_UNUSED_${data.msisdn.slice(-4)}`, data: data.offUnusedPeriod },
      { name: `NIGHT_MAPPING_${data.msisdn.slice(-4)}`, data: data.nightMapping },
      { name: `NIGHT_MAX_STAY_${data.msisdn.slice(-4)}`, data: data.nightMaxStay },
      { name: `DAY_MAPPING_${data.msisdn.slice(-4)}`, data: data.dayMapping },
      { name: `DAY_MAX_STAY_${data.msisdn.slice(-4)}`, data: data.dayMaxStay },
      { name: `WORK_HOME_LOC_${data.msisdn.slice(-4)}`, data: data.workHomeLocation },
      { name: `HOME_LOC_DAY_${data.msisdn.slice(-4)}`, data: data.homeLocationBasedOnDayFirst }
    ];

    sheets.forEach(sheet => {
      if (Array.isArray(sheet.data) && sheet.data.length > 0) {
        const worksheet = XLSX.utils.json_to_sheet(sheet.data);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
      }
    });

    return workbook;
  };

  const downloadSingleFile = (data: any) => {
    try {
      const workbook = generateExcelFile(data);
      const fileName = `CDR_Analysis_${data.provider}_${data.msisdn}_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      XLSX.writeFile(workbook, fileName);
      
      toast({
        title: "Download Complete",
        description: `Excel file for ${data.provider} ${data.msisdn} has been downloaded with 16 analysis sheets.`
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
        const fileName = `CDR_Analysis_${data.provider}_${data.msisdn}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, fileName);
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      toast({
        title: "Bulk Download Complete",
        description: `${processedData.length} Excel files have been downloaded with comprehensive analysis.`
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
      {processedData.length === 0 ? (
        <div className="text-center py-8">
          <FileSpreadsheet className="h-12 w-12 text-blue-400 mx-auto mb-4" />
          <p className="text-blue-600">No processed data available</p>
          <p className="text-sm text-blue-500">Process CDR files first to enable downloads</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Bulk Download Section */}
          <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-green-800 font-semibold text-lg">Bulk Download All Files</h3>
                <p className="text-green-600">
                  Download all {processedData.length} processed CDR files at once (16 sheets each)
                </p>
              </div>
              <Button 
                onClick={downloadAllFiles}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Package className="h-4 w-4 mr-2" />
                Download All ({processedData.length})
              </Button>
            </div>
          </div>

          {/* Individual Files */}
          <div className="space-y-4">
            <h3 className="text-blue-900 font-semibold text-lg">Individual Downloads</h3>
            {processedData.map((data, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-white rounded-lg border border-blue-200 shadow-sm">
                <div className="flex items-center space-x-3">
                  <FileSpreadsheet className="h-6 w-6 text-blue-600" />
                  <div>
                    <h4 className="text-blue-900 font-medium">
                      CDR Analysis - {data.provider} {data.msisdn}
                    </h4>
                    <p className="text-sm text-blue-600">
                      {data.mapping?.length || 0} call records • 16 analysis sheets
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-sm text-blue-600 font-medium">
                    Excel File
                  </div>
                  <Button
                    size="sm"
                    onClick={() => downloadSingleFile(data)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
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
    </div>
  );
};

export default BulkDownloader;

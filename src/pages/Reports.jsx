import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReportProvider } from '../components/reports/ReportContext';
import PropertyReport from '../components/reports/PropertyReport';
// Import other reports...

export default function ReportsPage() {
  return (
    <ReportProvider>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">דוחות</h1>
        
        <Tabs defaultValue="properties">
          <TabsList>
            <TabsTrigger value="properties">נכסים</TabsTrigger>
            <TabsTrigger value="financial">פיננסי</TabsTrigger>
            <TabsTrigger value="maintenance">תחזוקה</TabsTrigger>
            <TabsTrigger value="occupancy">תפוסה</TabsTrigger>
          </TabsList>

          <TabsContent value="properties">
            <PropertyReport />
          </TabsContent>
          
          {/* Add other report tabs here */}
        </Tabs>
      </div>
    </ReportProvider>
  );
}
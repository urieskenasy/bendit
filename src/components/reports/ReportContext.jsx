import React, { createContext, useContext, useState } from 'react';

// Create context
const ReportContext = createContext();

// Create provider component
export function ReportProvider({ children }) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const updateLastUpdate = (date) => {
    setLastUpdate(date || new Date());
  };

  const refreshData = () => {
    // This will be implemented by the specific report components
    console.log('Refresh data requested');
  };

  return (
    <ReportContext.Provider value={{ 
      isLoading, 
      setIsLoading, 
      lastUpdate, 
      updateLastUpdate,
      refreshData
    }}>
      {children}
    </ReportContext.Provider>
  );
}

// Custom hook to use the report context
export function useReportData() {
  const context = useContext(ReportContext);
  if (!context) {
    throw new Error('useReportData must be used within a ReportProvider');
  }
  return context;
}

// Add default export for the ReportContext
export default ReportContext;
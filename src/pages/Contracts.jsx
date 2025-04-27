
import React, { useState, useEffect } from 'react';
import { Contract, Tenant, Property, Guarantee, Document, Payment, Building, Owner } from '@/api/entities';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FileText, Plus, Search, CalendarCheck, CalendarX, AlertCircle } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ContractList from '../components/contracts/ContractList';
import ContractForm from '../components/contracts/ContractForm';
import { format, addMonths, parseISO } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import entitySync from '../components/utils/entitySync';
import syncAllFromContract from '../components/utils/entitySync';

export default function ContractsPage() {
  const [contracts, setContracts] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [owners, setOwners] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('all');
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [activeTab, setActiveTab] = useState('active');
  const [payments, setPayments] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showPropertyHistory, setShowPropertyHistory] = useState(false);
  const [historyData, setHistoryData] = useState(null);
  const [propertyHistoryData, setPropertyHistoryData] = useState(null);
  const [showSyncIssuesDialog, setShowSyncIssuesDialog] = useState(false);
  const [syncIssues, setSyncIssues] = useState([]);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [showResolutionDialog, setShowResolutionDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadData();
    
    // בדיקת חוזים שהסתיימו
    const checkExpiredContracts = async () => {
      const today = new Date();
      const expiredContracts = contracts.filter(contract => 
        contract.status === 'active' && new Date(contract.end_date) < today
      );

      // עדכון סטטוס החוזים שהסתיימו ועדכון סטטוס הנכסים לפנויים
      for (const contract of expiredContracts) {
        await Contract.update(contract.id, { ...contract, status: 'expired' });
        
        // שינוי סטטוס הנכס לפנוי
        const property = properties.find(p => p.id === contract.property_id);
        if (property && property.rental_details?.status === 'rented') {
          // בדיקה שאין חוזים אחרים פעילים על אותו נכס
          const otherActiveContracts = contracts.filter(c => 
            c.id !== contract.id && 
            c.property_id === contract.property_id && 
            c.status === 'active'
          );
          
          if (otherActiveContracts.length === 0) {
            // אין חוזים אחרים פעילים - שחרר את הנכס
            await Property.update(property.id, {
              ...property,
              rental_details: {
                ...property.rental_details,
                status: 'available'
              }
            });
          }
        }
        
        // עדכון סטטוס הדייר גם כן
        for (const tenantRef of contract.tenants || []) {
          const tenant = tenants.find(t => t.id === tenantRef.tenant_id);
          if (tenant && tenant.status === 'active') {
            // בדיקה שאין חוזים אחרים פעילים של אותו דייר
            const otherActiveTenantContracts = contracts.filter(c => 
              c.id !== contract.id && 
              c.tenants && c.tenants.some(t => t.tenant_id === tenant.id) && 
              c.status === 'active'
            );
            
            if (otherActiveTenantContracts.length === 0) {
              // אין חוזים אחרים פעילים - סמן את הדייר כלא פעיל
              await Tenant.update(tenant.id, {
                ...tenant,
                status: 'past',
                contract_end: contract.end_date
              });
            }
          }
        }
      }

      if (expiredContracts.length > 0) {
        loadData(); // טעינה מחדש אם היו שינויים
      }
    };

    checkExpiredContracts();
  }, []);

  useEffect(() => {
    // בדוק בעיות סנכרון לאחר טעינת הנתונים
    if (contracts.length > 0 && tenants.length > 0 && properties.length > 0) {
      checkSyncIssues();
    }
  }, [contracts, tenants, properties]);

  useEffect(() => {
    // כאשר משנים בניין, אפס את בחירת הנכס אם לא קיים נכס מתאים
    if (selectedBuilding !== 'all') {
      const validPropertyExists = properties.some(
        p => p.building_id === selectedBuilding && 
            (selectedProperty === 'all' || p.id === selectedProperty)
      );
      
      if (!validPropertyExists) {
        setSelectedProperty('all');
      }
    }
  }, [selectedBuilding, properties]);

  const loadData = async () => {
    const [contractsData, tenantsData, propertiesData, buildingsData, paymentsData, documentsData, ownersData] = await Promise.all([
      Contract.list(),
      Tenant.list(),
      Property.list(),
      Building.list(),
      Payment.list(),
      Document.list(),
      Owner.list()
    ]);
    setContracts(contractsData);
    setTenants(tenantsData);
    setProperties(propertiesData);
    setBuildings(buildingsData);
    setPayments(paymentsData);
    setDocuments(documentsData);
    setOwners(ownersData);
  };

  // פונקציה ליצירת תשלומים אוטומטיים מתוך חוזה
  const createPaymentsForContract = async (contractData) => {
    try {
      // בדיקה שהחוזה פעיל
      if (contractData.status !== 'active') {
        console.log('לא יוצר תשלומים לחוזה לא פעיל');
        return;
      }

      const startDate = parseISO(contractData.start_date);
      const endDate = parseISO(contractData.end_date);
      
      // חישוב מספר החודשים
      const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
        (endDate.getMonth() - startDate.getMonth()) + 1;
      
      // מציאת הנכס והבעלים
      const property = properties.find(p => p.id === contractData.property_id);
      let ownerId = null;
      
      // אם יש לנכס בעלים, קח את הראשון
      if (property && property.owners && property.owners.length > 0) {
        ownerId = property.owners[0].owner_id;
      }
      
      console.log(`יוצר ${months} תשלומים לחוזה מ-${contractData.start_date} עד ${contractData.end_date}`);
      
      const payments = [];
      
      // וודא שיש tenant_id זמין
      if (!contractData.tenants || contractData.tenants.length === 0) {
        console.error('אין דיירים בחוזה');
        throw new Error('אין דיירים בחוזה, לא ניתן ליצור תשלומים');
      }

      const tenantId = contractData.tenants[0].tenant_id;
      
      // יצירת תשלום עבור כל חודש
      for (let i = 0; i < months; i++) {
        const paymentDate = new Date(startDate);
        paymentDate.setMonth(paymentDate.getMonth() + i);
        
        // הגדרת יום התשלום בחודש
        const paymentDay = contractData.payment_terms?.payment_day || startDate.getDate();
        paymentDate.setDate(paymentDay);
        
        const formattedDate = format(paymentDate, 'yyyy-MM-dd');
        
        const payment = {
          related_to: {
            type: 'tenant',
            id: tenantId // חובה לציין id
          },
          property_id: contractData.property_id,
          owner_id: ownerId,
          date: formattedDate, // תאריך חייב להיות מחרוזת תקינה, לא null
          due_date: formattedDate,
          amount: contractData.monthly_rent,
          type: 'rent',
          status: 'pending',
          contract_id: contractData.id,
          payment_number: i + 1,
          total_payments: months,
          building_committee_status: contractData.includes_building_committee ? 'included' : 'unpaid'
        };
        
        payments.push(payment);
      }
      
      // יצירת כל התשלומים בזה אחר זה
      for (const payment of payments) {
        await Payment.create(payment);
      }
      
      console.log(`נוצרו ${payments.length} תשלומים עבור חוזה ${contractData.id}`);
      
      toast({
        title: "התשלומים נוצרו בהצלחה",
        description: `${payments.length} תשלומים חודשיים נוצרו עבור החוזה`,
      });
    } catch (error) {
      console.error('שגיאה ביצירת תשלומים אוטומטיים:', error);
      toast({
        variant: "destructive",
        title: "שגיאה ביצירת תשלומים",
        description: "לא ניתן היה ליצור תשלומים אוטומטיים. אנא נסה שוב.",
      });
    }
  };

  const checkSyncIssues = () => {
    const issues = [];
    
    // בדיקת התאמה בין חוזים לנכסים
    contracts.filter(c => c.status === 'active').forEach(contract => {
      const property = properties.find(p => p.id === contract.property_id);
      const tenant = tenants.find(t => t.id === contract.tenant_id);
      
      if (!property) {
        issues.push({
          type: 'missing_property',
          contract,
          tenant,
          message: `החוזה של ${tenant?.full_name || 'דייר לא ידוע'} מקושר לנכס שלא קיים`
        });
        return;
      }
      
      // בדיקה שהנכס מסומן כמושכר
      if (property.rental_details?.status !== 'rented') {
        issues.push({
          type: 'property_status',
          contract,
          property,
          tenant,
          message: `נכס ${property.property_number} יש לו חוזה פעיל עם ${tenant?.full_name} אבל מסומן כפנוי`
        });
      }
      
      // בדיקה שהדייר מקושר לנכס הנכון
      if (tenant && tenant.property_id !== contract.property_id) {
        issues.push({
          type: 'tenant_property_mismatch',
          contract,
          property,
          tenant,
          message: `הדייר ${tenant.full_name} מקושר לנכס אחר מהחוזה שלו`
        });
      }
    });
    
    // בדיקת דיירים פעילים ללא נכס
    tenants.filter(t => t.status === 'active').forEach(tenant => {
      if (!tenant.property_id) {
        issues.push({
          type: 'tenant_no_property',
          tenant,
          message: `הדייר ${tenant.full_name} מסומן כפעיל אבל לא מקושר לנכס`
        });
      }
    });
    
    // בדיקת נכסים מושכרים ללא חוזים פעילים
    properties.filter(p => p.rental_details?.status === 'rented').forEach(property => {
      const hasActiveContract = contracts.some(c => 
        c.property_id === property.id && c.status === 'active'
      );
      
      if (!hasActiveContract) {
        issues.push({
          type: 'property_no_contract',
          property,
          message: `נכס ${property.property_number} מסומן כמושכר אבל אין לו חוזה פעיל`
        });
      }
    });
    
    setSyncIssues(issues);
    
    // הצג דיאלוג אם יש בעיות
    if (issues.length > 0) {
      setShowSyncIssuesDialog(true);
    }
  };

  const fixSyncIssues = async () => {
    try {
      // תיקון בעיות
      for (const issue of syncIssues) {
        switch (issue.type) {
          case 'property_status':
            // תיקון סטטוס של נכס
            if (issue.property) {
              await Property.update(issue.property.id, {
                ...issue.property,
                rental_details: {
                  ...issue.property.rental_details,
                  status: 'rented'
                }
              });
            }
            break;
            
          case 'tenant_property_mismatch':
            // תיקון קישור בין דייר לנכס
            if (issue.tenant && issue.contract) {
              await Tenant.update(issue.tenant.id, {
                ...issue.tenant,
                property_id: issue.contract.property_id,
                contract_start: issue.contract.start_date,
                contract_end: issue.contract.end_date
              });
            }
            break;
            
          case 'property_no_contract':
            // שחרור נכס שמסומן כמושכר אבל אין לו חוזה
            if (issue.property) {
              await Property.update(issue.property.id, {
                ...issue.property,
                rental_details: {
                  ...issue.property.rental_details,
                  status: 'available'
                }
              });
            }
            break;
            
          case 'tenant_no_property':
            // סימון דייר ללא נכס כלא פעיל
            if (issue.tenant) {
              await Tenant.update(issue.tenant.id, {
                ...issue.tenant,
                status: 'past'
              });
            }
            break;
        }
      }
      
      // טען מחדש את הנתונים
      await loadData();
      setShowSyncIssuesDialog(false);
      toast({
        title: "תיקון בעיות הסתיים בהצלחה",
        description: `${syncIssues.length} בעיות סונכרנו בהצלחה`,
      });
    } catch (error) {
      console.error('Error fixing sync issues:', error);
      toast({
        title: "שגיאה בתיקון בעיות",
        description: "אירעה שגיאה בתהליך הסנכרון, נסה שוב",
        variant: "destructive",
      });
    }
  };

  const handleResolveIssue = async (issue, resolution) => {
    try {
      switch (issue.type) {
        case 'tenant_property_mismatch':
          if (resolution === 'update_tenant') {
            // עדכן את הדייר לפי החוזה
            await Tenant.update(issue.tenant.id, {
              ...issue.tenant,
              property_id: issue.contract.property_id
            });
          } else if (resolution === 'update_contract') {
            // עדכן את החוזה לפי הדייר
            await Contract.update(issue.contract.id, {
              ...issue.contract,
              property_id: issue.tenant.property_id
            });
            
            // עדכן את סטטוס הנכסים
            const oldProperty = properties.find(p => p.id === issue.contract.property_id);
            const newProperty = properties.find(p => p.id === issue.tenant.property_id);
            
            if (oldProperty) {
              await Property.update(oldProperty.id, {
                ...oldProperty,
                rental_details: { ...oldProperty.rental_details, status: 'available' }
              });
            }
            if (newProperty) {
              await Property.update(newProperty.id, {
                ...newProperty,
                rental_details: { ...newProperty.rental_details, status: 'rented' }
              });
            }
          }
          break;

        case 'property_status':
          if (resolution === 'mark_rented') {
            await Property.update(issue.property.id, {
              ...issue.property,
              rental_details: { ...issue.property.rental_details, status: 'rented' }
            });
          } else if (resolution === 'end_contract') {
            await Contract.update(issue.contract.id, {
              ...issue.contract,
              status: 'expired'
            });
            await Tenant.update(issue.tenant.id, {
              ...issue.tenant,
              status: 'past'
            });
          }
          break;

        case 'property_no_contract':
          if (resolution === 'mark_available') {
            await Property.update(issue.property.id, {
              ...issue.property,
              rental_details: { ...issue.property.rental_details, status: 'available' }
            });
          }
          break;

        case 'tenant_no_property':
          if (resolution === 'mark_inactive') {
            await Tenant.update(issue.tenant.id, {
              ...issue.tenant,
              status: 'past'
            });
          }
          break;
      }

      // רענן את הנתונים
      await loadData();
      toast({
        title: "הבעיה תוקנה בהצלחה",
        description: "המערכת עודכנה בהתאם לבחירתך",
      });
    } catch (error) {
      console.error('Error resolving issue:', error);
      toast({
        title: "שגיאה בתיקון הבעיה",
        description: "אירעה שגיאה בתהליך העדכון",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (contractData) => {
    console.log("Starting contract submission with data:", contractData);
    setIsLoading(true);
    
    try {
      let savedContract;
    
      // Clean and validate the contract data
      const cleanedContractData = {
        ...contractData,
        monthly_rent: parseFloat(contractData.monthly_rent) || 0
      };
      
      // Ensure meter readings are numbers, not empty strings
      if (cleanedContractData.meter_readings) {
        cleanedContractData.meter_readings = {
          ...cleanedContractData.meter_readings,
          electricity: cleanedContractData.meter_readings.electricity === '' ? 0 : parseFloat(cleanedContractData.meter_readings.electricity),
          water: cleanedContractData.meter_readings.water === '' ? 0 : parseFloat(cleanedContractData.meter_readings.water),
          gas: cleanedContractData.meter_readings.gas === '' ? 0 : parseFloat(cleanedContractData.meter_readings.gas)
        };
      }
      
      if (selectedContract) {
        console.log("Updating existing contract:", selectedContract.id);
        savedContract = await Contract.update(selectedContract.id, cleanedContractData);
      } else {
        console.log("Creating new contract");
        savedContract = await Contract.create(cleanedContractData);
      }
      console.log("Contract saved successfully:", savedContract);

      // ביצוע סנכרון
      try {
        console.log("Starting entity synchronization");
        await syncAllFromContract(savedContract);
        console.log("Entity synchronization completed");
      } catch (syncError) {
        console.error("Error in entity sync:", syncError);
        toast({
          variant: "warning",
          title: "אזהרה: סנכרון חלקי",
          description: "החוזה נשמר אך ייתכן שחלק מהנתונים הקשורים לא עודכנו"
        });
      }

      setShowForm(false);
      setSelectedContract(null);
      
      // רענן את כל הנתונים
      await loadData();

      toast({
        title: selectedContract ? "החוזה עודכן בהצלחה" : "החוזה נוצר בהצלחה",
        description: "הנתונים עודכנו בכל המערכת"
      });

    } catch (error) {
      console.error('Error saving contract:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בשמירת החוזה",
        description: error.message || "אירעה שגיאה בעת שמירת החוזה"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // פונקציית סנכרון מקומית בתוך הקומפוננטה
  const syncEntities = async (contract) => {
    try {
      console.log("Syncing entities for contract:", contract);
      
      // 1. עדכון הנכס
      if (contract.property_id) {
        const property = await Property.get(contract.property_id);
        if (property) {
          await Property.update(property.id, {
            rental_details: {
              ...(property.rental_details || {}),
              status: contract.status === 'active' ? 'rented' : 'available',
              monthly_rent: contract.monthly_rent
            }
          });
          console.log(`Property ${property.id} synchronized`);
        }
      }

      // 2. עדכון הדיירים
      if (contract.tenants && contract.tenants.length > 0) {
        for (const tenantRef of contract.tenants) {
          if (!tenantRef.tenant_id) continue;
          
          const tenant = await Tenant.get(tenantRef.tenant_id);
          if (!tenant) continue;
          
          const tenantRent = Math.round(contract.monthly_rent * (tenantRef.share_percentage || 100) / 100);
          
          await Tenant.update(tenant.id, {
            property_id: contract.property_id,
            status: contract.status === 'active' ? 'active' : 'past',
            contract_id: contract.id,
            contract_start: contract.start_date,
            contract_end: contract.end_date,
            monthly_rent: tenantRent,
            share_percentage: tenantRef.share_percentage || 100
          });
          console.log(`Tenant ${tenant.id} synchronized`);
        }
      }

      // 3. עדכון תשלומים
      const allPayments = await Payment.list();
      const contractPayments = allPayments.filter(p => p.contract_id === contract.id);
      
      for (const payment of contractPayments) {
        if (payment.status === 'paid') continue;
        
        for (const tenantRef of contract.tenants || []) {
          if (payment.related_to?.id === tenantRef.tenant_id) {
            const tenantRent = Math.round(contract.monthly_rent * (tenantRef.share_percentage || 100) / 100);
            
            await Payment.update(payment.id, {
              amount: tenantRent,
              property_id: contract.property_id
            });
            console.log(`Payment ${payment.id} synchronized`);
            break;
          }
        }
      }
      
      console.log("Entity synchronization completed successfully");
    } catch (error) {
      console.error("Error syncing entities:", error);
      // הודעת שגיאה אבל לא נכשלים כדי לאפשר המשך התהליך
    }
  };

  // פונקציה לחישוב שכר דירה לפי אחוז
  const calculateTenantRent = (totalRent, sharePercentage) => {
    const numericRent = parseFloat(totalRent) || 0;
    const numericPercentage = parseFloat(sharePercentage) || 100;
    // נוודא שמוחזר מספר ולא מחרוזת
    return Math.round(numericRent * (numericPercentage / 100));
  };

  const handleEdit = (contract) => {
    console.log("Editing contract:", contract);
    setSelectedContract(contract);
    setShowForm(true);
  };

  const handleDelete = async (contractId) => {
    try {
      await Contract.delete(contractId);
      loadData();
      toast({
        title: "החוזה נמחק בהצלחה",
        description: "החוזה הוסר מהמערכת",
      });
    } catch (error) {
      console.error('Error deleting contract:', error);
      toast({
        variant: "destructive",
        title: "שגיאה במחיקת החוזה",
        description: "אירעה שגיאה בעת מחיקת החוזה",
      });
    }
  };

  const filteredContracts = contracts.filter(contract => {
    const matchesStatus = contract.status === activeTab;
    
    // פילטור לפי בניין ונכס
    let matchesBuilding = true;
    let matchesProperty = true;
    
    if (selectedProperty !== 'all') {
      // אם נבחר נכס ספציפי
      matchesProperty = contract.property_id === selectedProperty;
    } else if (selectedBuilding !== 'all') {
      // אם נבחר רק בניין
      const property = properties.find(p => p.id === contract.property_id);
      matchesBuilding = property && property.building_id === selectedBuilding;
    }
    
    // פילטור לפי חיפוש טקסטואלי
    const tenant = tenants.find(t => t.id === contract.tenant_id);
    const property = properties.find(p => p.id === contract.property_id);
    
    const searchMatch = searchTerm === '' || (
      (tenant && tenant.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (property && property.property_number.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return matchesStatus && matchesBuilding && matchesProperty && searchMatch;
  });

  const handleViewHistory = async (tenantId) => {
    if (!tenantId) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "לא נמצא דייר לחוזה זה"
      });
      return;
    }
    
    // סינון החוזים לפי הדייר
    const tenantContracts = contracts.filter(c => 
      c.tenants && c.tenants.some(t => t.tenant_id === tenantId)
    );
    const tenant = tenants.find(t => t.id === tenantId);
    
    // מיון לפי תאריך התחלה
    tenantContracts.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
    
    // הצגת דיאלוג עם היסטוריית החוזים
    setHistoryData({
      tenant,
      contracts: tenantContracts
    });
    setShowHistory(true);
  };

  const handleViewPropertyHistory = async (propertyId) => {
    // סינון החוזים לפי הנכס
    const propertyContracts = contracts.filter(c => c.property_id === propertyId);
    const property = properties.find(p => p.id === propertyId);
    
    // מיון לפי תאריך התחלה מהחדש לישן
    propertyContracts.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
    
    // חישוב סך כל התשלומים לכל חוזה
    const contractsWithPayments = propertyContracts.map(contract => {
      const contractPayments = payments.filter(p => 
        p.related_to?.type === 'tenant' && 
        p.contract_id === contract.id
      );
      
      const totalPaid = contractPayments.reduce((sum, payment) => 
        payment.status === 'paid' ? sum + payment.amount : sum, 0
      );
      
      const tenant = tenants.find(t => t.id === contract.tenant_id);
      
      return {
        ...contract,
        totalPaid,
        payments: contractPayments,
        tenant
      };
    });
    
    setPropertyHistoryData({
      property,
      contracts: contractsWithPayments
    });
    setShowPropertyHistory(true);
  };

  const handleBuildingChange = (buildingId) => {
    setSelectedBuilding(buildingId);
    setSelectedProperty('all'); // ריסט בחירת הנכס
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6" />
          חוזים
        </h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowSyncIssuesDialog(true)}
            disabled={syncIssues.length === 0}
            className="flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4" />
            בדיקת סנכרון מידע {syncIssues.length > 0 && `(${syncIssues.length})`}
          </Button>
          <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 ml-2" />
            חוזה חדש
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
        <Tabs defaultValue="active" onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="active" className="flex items-center gap-2">
              <CalendarCheck className="w-4 h-4" />
              חוזים פעילים
            </TabsTrigger>
            <TabsTrigger value="expired" className="flex items-center gap-2">
              <CalendarX className="w-4 h-4" />
              חוזים שהסתיימו
            </TabsTrigger>
            <TabsTrigger value="terminated" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              חוזים שבוטלו
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap gap-4">
          <Select value={selectedBuilding} onValueChange={handleBuildingChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="בחר בניין" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הבניינים</SelectItem>
              {buildings.map(building => (
                <SelectItem key={building.id} value={building.id}>
                  {building.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select 
            value={selectedProperty} 
            onValueChange={setSelectedProperty}
            disabled={selectedBuilding === 'all'}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="בחר נכס" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הנכסים</SelectItem>
              {properties
                .filter(p => selectedBuilding === 'all' || p.building_id === selectedBuilding)
                .map(property => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.property_number}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          <Card className="p-2">
            <div className="relative">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="חיפוש לפי דייר/נכס..."
                className="pr-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </Card>
        </div>
      </div>

      {showForm && (
        <ContractForm
          contract={selectedContract}
          tenants={tenants}
          properties={properties}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setSelectedContract(null);
          }}
        />
      )}

      <ContractList
        contracts={filteredContracts}
        tenants={tenants}
        properties={properties}
        payments={payments}
        documents={documents}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onViewHistory={handleViewHistory}
        onViewPropertyHistory={handleViewPropertyHistory}
      />

      {/* דיאלוג היסטוריית חוזים לפי שוכר */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              היסטוריית חוזים - {historyData?.tenant?.full_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {historyData?.contracts.map((contract) => {
              const property = properties.find(p => p.id === contract.property_id);
              const contractPayments = payments.filter(p => 
                p.related_to?.type === 'tenant' && 
                p.contract_id === contract.id
              );
              const totalPaid = contractPayments.reduce((sum, payment) => 
                payment.status === 'paid' ? sum + payment.amount : sum, 0
              );

              return (
                <Card key={contract.id} className="p-4">
                  <div className="flex justify-between mb-4">
                    <div>
                      <h3 className="font-semibold">
                        {property?.property_number}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {format(new Date(contract.start_date), 'dd/MM/yyyy')} - {format(new Date(contract.end_date), 'dd/MM/yyyy')}
                      </p>
                    </div>
                    <Badge variant={contract.status === 'active' ? 'success' : 'secondary'}>
                      {contract.status === 'active' ? 'פעיל' : 'הסתיים'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>שכ"ד חודשי:</span>
                      <span>₪{contract.monthly_rent.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>סה"כ שולם:</span>
                      <span>₪{totalPaid.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-medium mb-2">תשלומים:</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>תאריך</TableHead>
                          <TableHead>סכום</TableHead>
                          <TableHead>סטטוס</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contractPayments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>
                              {format(new Date(payment.date || payment.due_date), 'dd/MM/yyyy')}
                            </TableCell>
                            <TableCell>₪{payment.amount.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant={
                                payment.status === 'paid' ? 'success' :
                                payment.status === 'pending' ? 'warning' :
                                'destructive'
                              }>
                                {payment.status === 'paid' ? 'שולם' :
                                 payment.status === 'pending' ? 'ממתין' :
                                 'באיחור'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* דיאלוג היסטוריית חוזים לפי נכס */}
      <Dialog open={showPropertyHistory} onOpenChange={setShowPropertyHistory}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              היסטוריית חוזים - נכס {propertyHistoryData?.property?.property_number}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {propertyHistoryData?.contracts.map((contract) => (
              <Card key={contract.id} className="p-4">
                <div className="flex justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">
                      {contract.tenant?.full_name || 'שוכר לא ידוע'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {formatDate(contract.start_date)} - {formatDate(contract.end_date)}
                    </p>
                  </div>
                  <Badge variant={contract.status === 'active' ? 'success' : 'secondary'}>
                    {contract.status === 'active' ? 'פעיל' : 'הסתיים'}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>שכ"ד חודשי:</span>
                    <span>₪{contract.monthly_rent.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>סה"כ שולם בחוזה זה:</span>
                    <span>₪{contract.totalPaid.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>מספר תשלומים:</span>
                    <span>{contract.payments.length} תשלומים</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-medium mb-2">תקציר תשלומים:</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-blue-50 p-2 rounded-md">
                      <div className="text-sm font-medium">תשלומים ששולמו</div>
                      <div className="text-lg font-bold">
                        ₪{contract.payments
                          .filter(p => p.status === 'paid')
                          .reduce((sum, p) => sum + p.amount, 0)
                          .toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-yellow-50 p-2 rounded-md">
                      <div className="text-sm font-medium">תשלומים ממתינים</div>
                      <div className="text-lg font-bold">
                        ₪{contract.payments
                          .filter(p => p.status === 'pending')
                          .reduce((sum, p) => sum + p.amount, 0)
                          .toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
            {propertyHistoryData?.contracts.length === 0 && (
              <p className="text-center text-gray-500 p-4">אין היסטוריית חוזים לנכס זה</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* דיאלוג בעיות סנכרון */}
      <Dialog open={showSyncIssuesDialog} onOpenChange={setShowSyncIssuesDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>בעיות סנכרון מידע במערכת</DialogTitle>
            <DialogDescription>
              המערכת זיהתה {syncIssues.length} בעיות סנכרון. בחר בעיה כדי לראות את אפשרויות התיקון.
            </DialogDescription>
          </DialogHeader>
          
          {syncIssues.length > 0 ? (
            <div className="space-y-4">
              <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>סוג בעיה</TableHead>
                      <TableHead>תיאור</TableHead>
                      <TableHead>פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syncIssues.map((issue, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {issue.type === 'property_status' && 'סטטוס נכס'}
                            {issue.type === 'tenant_property_mismatch' && 'אי התאמת נכס-דייר'}
                            {issue.type === 'property_no_contract' && 'נכס ללא חוזה'}
                            {issue.type === 'tenant_no_property' && 'דייר ללא נכס'}
                            {issue.type === 'missing_property' && 'נכס חסר'}
                          </Badge>
                        </TableCell>
                        <TableCell>{issue.message}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {issue.type === 'tenant_property_mismatch' && (
                              <>
                                <Button 
                                  size="sm"
                                  onClick={() => handleResolveIssue(issue, 'update_tenant')}
                                >
                                  עדכן דייר לפי חוזה
                                </Button>
                                <Button 
                                  size="sm"
                                  onClick={() => handleResolveIssue(issue, 'update_contract')}
                                >
                                  עדכן חוזה לפי דייר
                                </Button>
                              </>
                            )}
                            
                            {issue.type === 'property_status' && (
                              <>
                                <Button 
                                  size="sm"
                                  onClick={() => handleResolveIssue(issue, 'mark_rented')}
                                >
                                  סמן נכס כמושכר
                                </Button>
                                <Button 
                                  size="sm"
                                  onClick={() => handleResolveIssue(issue, 'end_contract')}
                                >
                                  סיים חוזה
                                </Button>
                              </>
                            )}
                            
                            {issue.type === 'property_no_contract' && (
                              <Button 
                                size="sm"
                                onClick={() => handleResolveIssue(issue, 'mark_available')}
                              >
                                סמן נכס כפנוי
                              </Button>
                            )}
                            
                            {issue.type === 'tenant_no_property' && (
                              <Button 
                                size="sm"
                                onClick={() => handleResolveIssue(issue, 'mark_inactive')}
                              >
                                סמן דייר כלא פעיל
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSyncIssuesDialog(false)}>
                  סגור
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="py-6 text-center">
              <p className="text-green-600 font-medium">אין בעיות סנכרון במערכת</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// פונקציית פורמט תאריכים
function formatDate(dateString) {
  if (!dateString) return 'לא צוין';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'תאריך לא תקין';
    }
    return format(date, 'dd/MM/yyyy');
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'תאריך לא תקין';
  }
}


import React, { useState, useEffect } from 'react';
import { Document, Tenant, Property, Supplier, Institution } from '@/api/entities';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FileText, Plus, Search, Filter } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DocumentList from '../components/documents/DocumentList';
import DocumentForm from '../components/documents/DocumentForm';
import processDocument from '../components/utils/documentSync';
import { toast } from "@/components/ui/use-toast"

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [relatedEntities, setRelatedEntities] = useState({
    tenants: [],
    properties: [],
    suppliers: [],
    institutions: []
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedEntityType, setSelectedEntityType] = useState('all');
  const [selectedEntityId, setSelectedEntityId] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [
      documentsData,
      tenantsData,
      propertiesData,
      suppliersData,
      institutionsData
    ] = await Promise.all([
      Document.list('-date'),
      Tenant.list(),
      Property.list(),
      Supplier.list(),
      Institution.list()
    ]);
    
    setDocuments(documentsData);
    setRelatedEntities({
      tenants: tenantsData,
      properties: propertiesData,
      suppliers: suppliersData,
      institutions: institutionsData
    });
  };

  const handleSubmit = async (documentData) => {
    try {
      let savedDocument;
      if (selectedDocument) {
        savedDocument = await Document.update(selectedDocument.id, documentData);
      } else {
        savedDocument = await Document.create(documentData);
      }
      
      // עיבוד המסמך ועדכון ישויות קשורות
      try {
        await processDocument(savedDocument);
      } catch (processError) {
        console.error("Error processing document:", processError);
        toast({
          variant: "warning",
          title: "אזהרה: עיבוד חלקי",
          description: "המסמך נשמר אך ייתכן שחלק מהנתונים הקשורים לא עודכנו"
        });
      }
      
      setShowForm(false);
      setSelectedDocument(null);
      loadData();
      
      toast({
        title: selectedDocument ? "המסמך עודכן בהצלחה" : "המסמך נוצר בהצלחה",
        description: "המסמך נשמר במערכת בהצלחה",
      });
    } catch (error) {
      console.error('Error saving document:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בשמירת המסמך",
        description: error.message || "אירעה שגיאה בעת שמירת המסמך",
      });
    }
  };

  const handleEdit = (document) => {
    setSelectedDocument(document);
    setShowForm(true);
  };

  const filteredDocuments = documents
    .filter(document => {
      // Filter by type
      if (activeTab !== 'all' && document.type !== activeTab) {
        return false;
      }
      
      // Filter by related entity type and id
      if (selectedEntityType !== 'all') {
        if (!document.related_to || document.related_to.type !== selectedEntityType) {
          return false;
        }
        
        if (selectedEntityId && document.related_to.id !== selectedEntityId) {
          return false;
        }
      }
      
      // Filter by search term
      if (!searchTerm) return true;
      
      if (document.number && document.number.toLowerCase().includes(searchTerm.toLowerCase())) {
        return true;
      }
      
      // Search in the related entity name
      if (document.related_to) {
        if (document.related_to.type === 'tenant') {
          const tenant = relatedEntities.tenants.find(t => t.id === document.related_to.id);
          if (tenant && tenant.full_name.toLowerCase().includes(searchTerm.toLowerCase())) {
            return true;
          }
        } else if (document.related_to.type === 'property') {
          const property = relatedEntities.properties.find(p => p.id === document.related_to.id);
          if (property && property.address.toLowerCase().includes(searchTerm.toLowerCase())) {
            return true;
          }
        } else if (document.related_to.type === 'supplier') {
          const supplier = relatedEntities.suppliers.find(s => s.id === document.related_to.id);
          if (supplier && supplier.name.toLowerCase().includes(searchTerm.toLowerCase())) {
            return true;
          }
        } else if (document.related_to.type === 'institution') {
          const institution = relatedEntities.institutions.find(i => i.id === document.related_to.id);
          if (institution && institution.name.toLowerCase().includes(searchTerm.toLowerCase())) {
            return true;
          }
        }
      }
      
      return false;
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6" />
          מסמכים
        </h1>
        <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 ml-2" />
          מסמך חדש
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <Tabs defaultValue="all" onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">הכל</TabsTrigger>
            <TabsTrigger value="invoice">חשבוניות</TabsTrigger>
            <TabsTrigger value="receipt">קבלות</TabsTrigger>
            <TabsTrigger value="contract">חוזים</TabsTrigger>
            <TabsTrigger value="tax_document">מסמכי מס</TabsTrigger>
            <TabsTrigger value="insurance">ביטוח</TabsTrigger>
            <TabsTrigger value="other">אחר</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex flex-col md:flex-row gap-4">
          <Card className="p-2 flex-grow">
            <div className="relative">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="חיפוש..."
                className="pr-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </Card>

          <div className="flex gap-2">
            <Select value={selectedEntityType} onValueChange={setSelectedEntityType}>
              <SelectTrigger className="w-36">
                <Filter className="w-4 h-4 ml-2" />
                <SelectValue placeholder="סינון לפי" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">הכל</SelectItem>
                <SelectItem value="tenant">דיירים</SelectItem>
                <SelectItem value="property">נכסים</SelectItem>
                <SelectItem value="supplier">ספקים</SelectItem>
                <SelectItem value="institution">מוסדות</SelectItem>
              </SelectContent>
            </Select>
            
            {selectedEntityType !== 'all' && (
              <Select
                value={selectedEntityId}
                onValueChange={setSelectedEntityId}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={`בחר ${
                    selectedEntityType === 'tenant' ? 'דייר' :
                    selectedEntityType === 'property' ? 'נכס' :
                    selectedEntityType === 'supplier' ? 'ספק' :
                    'מוסד'
                  }`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>הכל</SelectItem>
                  {selectedEntityType === 'tenant' && relatedEntities.tenants.map(tenant => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.full_name}
                    </SelectItem>
                  ))}
                  {selectedEntityType === 'property' && relatedEntities.properties.map(property => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.address}
                    </SelectItem>
                  ))}
                  {selectedEntityType === 'supplier' && relatedEntities.suppliers.map(supplier => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                  {selectedEntityType === 'institution' && relatedEntities.institutions.map(institution => (
                    <SelectItem key={institution.id} value={institution.id}>
                      {institution.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      {showForm && (
        <DocumentForm
          document={selectedDocument}
          relatedEntities={relatedEntities}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setSelectedDocument(null);
          }}
        />
      )}

      <DocumentList
        documents={filteredDocuments}
        relatedEntities={relatedEntities}
        onEdit={handleEdit}
      />
    </div>
  );
}

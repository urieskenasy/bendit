
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UploadFile } from '@/api/integrations';
import { Upload, FileText, X } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast"
import processDocument from '../utils/documentSync';
import * as Document from '../data/documents';

export default function DocumentForm({ document, relatedEntities, onSubmit, onCancel }) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState(document?.file_url || '');
  const [formData, setFormData] = useState(document || {
    type: 'invoice',
    number: '',
    date: new Date().toISOString().split('T')[0],
    related_to: {
      type: '',
      id: ''
    },
    amount: '',
    file_url: '',
    status: 'final',
    notes: ''
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRelatedToChange = (type, id) => {
    setFormData(prev => ({
      ...prev,
      related_to: { type, id }
    }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      setFileUrl(file_url);
      setFormData(prev => ({
        ...prev,
        file_url: file_url
      }));
      toast({
        title: "הקובץ הועלה בהצלחה",
        description: "קובץ המסמך הועלה לשרת בהצלחה",
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        variant: "destructive",
        title: "שגיאה בהעלאת הקובץ",
        description: "אירעה שגיאה בעת העלאת קובץ המסמך",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (!formData.file_url) {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: "יש להעלות קובץ למסמך",
        });
        return;
      }

      let savedDocument;
      if (document) {
        // עדכון מסמך קיים
        savedDocument = await Document.update(document.id, formData);
      } else {
        // יצירת מסמך חדש
        savedDocument = await Document.create(formData);
      }

      // עיבוד המסמך ועדכון ישויות קשורות
      try {
        await processDocument(savedDocument);
      } catch (processError) {
        console.error("Error processing document:", processError);
        // לא נכשיל את התהליך כולו אם העיבוד נכשל
      }

      toast({
        title: document ? "המסמך עודכן בהצלחה" : "המסמך נוצר בהצלחה",
        description: "המסמך נשמר במערכת בהצלחה",
      });

      onSubmit(savedDocument);
    } catch (error) {
      console.error("Error saving document:", error);
      toast({
        variant: "destructive",
        title: "שגיאה בשמירת המסמך",
        description: error.message || "אירעה שגיאה בעת שמירת המסמך",
      });
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-6">{document ? 'עריכת מסמך' : 'מסמך חדש'}</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="type">סוג מסמך</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => handleInputChange('type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="בחר סוג מסמך" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="invoice">חשבונית</SelectItem>
                <SelectItem value="receipt">קבלה</SelectItem>
                <SelectItem value="contract">חוזה</SelectItem>
                <SelectItem value="tax_document">מסמך מס</SelectItem>
                <SelectItem value="insurance">ביטוח</SelectItem>
                <SelectItem value="permit">אישור/היתר</SelectItem>
                <SelectItem value="other">אחר</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="number">מספר מסמך</Label>
            <Input
              id="number"
              value={formData.number}
              onChange={(e) => handleInputChange('number', e.target.value)}
              placeholder="הכנס מספר מסמך"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">תאריך</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">סטטוס</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleInputChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">טיוטה</SelectItem>
                <SelectItem value="final">סופי</SelectItem>
                <SelectItem value="cancelled">מבוטל</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">סכום</Label>
            <Input
              id="amount"
              type="number"
              value={formData.amount || ''}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              placeholder="הכנס סכום"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="related_to_type">קשור ל-</Label>
            <Select
              value={formData.related_to?.type}
              onValueChange={(value) => handleRelatedToChange(value, '')}
            >
              <SelectTrigger>
                <SelectValue placeholder="בחר סוג" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tenant">דייר</SelectItem>
                <SelectItem value="property">נכס</SelectItem>
                <SelectItem value="supplier">ספק</SelectItem>
                <SelectItem value="institution">מוסד</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.related_to?.type && (
            <div className="space-y-2">
              <Label htmlFor="related_to_id">בחר {
                formData.related_to?.type === 'tenant' ? 'דייר' :
                  formData.related_to?.type === 'property' ? 'נכס' :
                    formData.related_to?.type === 'supplier' ? 'ספק' :
                      formData.related_to?.type === 'institution' ? 'מוסד' : 'ישות'
              }</Label>
              <Select
                value={formData.related_to?.id}
                onValueChange={(value) => handleRelatedToChange(formData.related_to?.type, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`בחר ${
                    formData.related_to?.type === 'tenant' ? 'דייר' :
                      formData.related_to?.type === 'property' ? 'נכס' :
                        formData.related_to?.type === 'supplier' ? 'ספק' :
                          formData.related_to?.type === 'institution' ? 'מוסד' : 'ישות'
                  }`} />
                </SelectTrigger>
                <SelectContent>
                  {formData.related_to?.type === 'tenant' && relatedEntities.tenants.map(tenant => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.full_name}
                    </SelectItem>
                  ))}
                  {formData.related_to?.type === 'property' && relatedEntities.properties.map(property => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.address}
                    </SelectItem>
                  ))}
                  {formData.related_to?.type === 'supplier' && relatedEntities.suppliers.map(supplier => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                  {formData.related_to?.type === 'institution' && relatedEntities.institutions.map(institution => (
                    <SelectItem key={institution.id} value={institution.id}>
                      {institution.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="file">קובץ מסמך</Label>
          <div className="flex items-center gap-2">
            <Input
              id="file"
              type="file"
              onChange={handleFileUpload}
              className="flex-1"
              disabled={isUploading}
            />
            {isUploading && <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent" />}
          </div>
          {fileUrl && (
            <div className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-100 mt-2">
              <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-sm">
                צפה בקובץ שהועלה
              </a>
              <span className="text-xs text-gray-500">
                הקובץ הועלה בהצלחה
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">הערות</Label>
          <Textarea
            id="notes"
            value={formData.notes || ''}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="הכנס הערות"
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="outline" onClick={onCancel}>
            ביטול
          </Button>
          <Button
            type="submit"
            disabled={isUploading || !fileUrl}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {document ? 'עדכן מסמך' : 'צור מסמך'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

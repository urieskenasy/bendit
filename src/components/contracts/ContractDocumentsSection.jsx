import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X, FileText, Download } from 'lucide-react';
import { UploadFile } from '@/api/integrations';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function ContractDocumentsSection({ documents = [], onDocumentAdd, onDocumentRemove }) {
  const [isUploading, setIsUploading] = useState(false);
  const [docType, setDocType] = useState('contract');

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      
      onDocumentAdd({
        type: docType,
        file_url,
        date: format(new Date(), 'yyyy-MM-dd'),
        status: 'final',
        number: `DOC-${Date.now()}`,
        related_to: {
          type: 'contract',
          id: ''  // יעודכן בשמירת החוזה
        }
      });
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const getDocumentTypeLabel = (type) => {
    const types = {
      'contract': 'חוזה',
      'appendix': 'נספח',
      'guarantee': 'ערבות',
      'payment': 'תשלום',
      'other': 'אחר'
    };
    return types[type] || type;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label className="text-lg font-semibold">מסמכים</Label>
        <div className="flex gap-2">
          <Select value={docType} onValueChange={setDocType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="סוג מסמך" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="contract">חוזה</SelectItem>
              <SelectItem value="appendix">נספח</SelectItem>
              <SelectItem value="guarantee">ערבות</SelectItem>
              <SelectItem value="payment">תשלום</SelectItem>
              <SelectItem value="other">אחר</SelectItem>
            </SelectContent>
          </Select>
          
          <label className="cursor-pointer">
            <Input
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
            <Button variant="outline" asChild>
              <span>
                <Upload className="w-4 h-4 mr-2" />
                {isUploading ? 'מעלה...' : 'העלאת מסמך'}
              </span>
            </Button>
          </label>
        </div>
      </div>

      <div className="grid gap-4">
        {documents.map((doc, index) => (
          <Card key={index} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium">{doc.number}</div>
                  <div className="text-sm text-gray-500">{format(new Date(doc.date), 'dd/MM/yyyy')}</div>
                </div>
                <Badge variant="outline">{getDocumentTypeLabel(doc.type)}</Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => window.open(doc.file_url, '_blank')}
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDocumentRemove(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
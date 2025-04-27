import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Upload, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * הגדרת זרימת נתונים וירושה בין ישויות במערכת
 */
const DATA_INHERITANCE = [
  {
    sourceEntity: 'בניין',
    targetEntity: 'נכס',
    attributes: [
      'כתובת מלאה',
      'סוג בניין',
      'ועד בית (סכום ואיש קשר)',
      'ספקי שירות רלוונטיים'
    ]
  },
  {
    sourceEntity: 'נכס',
    targetEntity: 'חוזה',
    attributes: [
      'מזהה נכס',
      'סוג נכס',
      'מידות ומאפיינים',
      'הגדרות ברירת מחדל למע"מ',
      'בעלי נכס ואחוזי בעלות'
    ]
  },
  {
    sourceEntity: 'חוזה',
    targetEntity: 'דייר',
    attributes: [
      'תאריכי חוזה',
      'שכר דירה חודשי',
      'הגדרות מע"מ ספציפיות לחוזה'
    ]
  },
  {
    sourceEntity: 'חוזה',
    targetEntity: 'תשלומים',
    attributes: [
      'שכר דירה חודשי',
      'אופן התשלום',
      'הצמדה למדד',
      'תשלומים נוספים קבועים'
    ]
  },
  {
    sourceEntity: 'חוזה',
    targetEntity: 'ערבויות',
    attributes: [
      'דמי ביטחון (פיקדון)',
      'תאריכי חוזה (תקופת תוקף)',
      'פרטי דייר'
    ]
  },
  {
    sourceEntity: 'דייר',
    targetEntity: 'תשלומים',
    attributes: [
      'פרטי זיהוי',
      'צורת תשלום מועדפת'
    ]
  },
  {
    sourceEntity: 'דייר',
    targetEntity: 'מסמכים',
    attributes: [
      'פרטי זיהוי',
      'סטטוס העברת חשבונות'
    ]
  },
  {
    sourceEntity: 'תשלומים',
    targetEntity: 'מסמכים',
    attributes: [
      'תאריך וסכום תשלום',
      'סטטוס',
      'אופן תשלום'
    ]
  }
];

/**
 * רכיב המציג את מבנה הירושה ויצוא נתונים בין ישויות
 */
export default function EntityImportExport() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5 rotate-90" /> 
          ירושת והעברת נתונים בין ישויות
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ישות מקור</TableHead>
              <TableHead className="w-10"></TableHead>
              <TableHead>ישות יעד</TableHead>
              <TableHead>מידע מועבר</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {DATA_INHERITANCE.map((inheritance, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-medium">{inheritance.sourceEntity}</TableCell>
                <TableCell>
                  <ChevronRight className="w-4 h-4 text-blue-500" />
                </TableCell>
                <TableCell>{inheritance.targetEntity}</TableCell>
                <TableCell>
                  <ul className="list-disc list-inside text-sm">
                    {inheritance.attributes.map((attr, attrIdx) => (
                      <li key={attrIdx}>{attr}</li>
                    ))}
                  </ul>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        <div className="mt-8 border rounded-lg p-4 bg-blue-50">
          <h3 className="text-lg font-semibold text-blue-700 mb-2">כללי ירושת מידע:</h3>
          <ul className="list-disc list-inside text-sm space-y-2 text-blue-800">
            <li>המידע נשמר פעם אחת בלבד, והישויות מקבלות אותו בירושה בצורה היררכית.</li>
            <li>יש אפשרות למידע להשתנות ברמת החוזה (למשל, שינוי אחוז המע"מ מהגדרת ברירת מחדל בנכס).</li>
            <li>כל שינוי בישות מקור ישפיע על הישויות שמקבלות ממנה מידע, אלא אם שונה באופן מקומי.</li>
            <li>דוחות שואבים מידע מכל הישויות בהתאם לסוג הדוח המבוקש ולא משנים את המידע.</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
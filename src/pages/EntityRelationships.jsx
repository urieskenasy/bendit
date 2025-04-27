import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Network, Upload, FileText, Database } from 'lucide-react';
import EntityRelationshipMapper from '../components/entityRelationships/EntityRelationshipMapper';
import EntityImportExport from '../components/entityRelationships/EntityImportExport';

export default function EntityRelationshipsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Network className="w-6 h-6" />
          מבנה ישויות וקשרים
        </h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>תיעוד מבנה המערכת</CardTitle>
          <CardDescription>
            מסמך זה מתאר את היררכיית הישויות, הקשרים ביניהן ואת אופן זרימת הנתונים במערכת NechesNet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="hierarchy">
            <TabsList className="mb-4">
              <TabsTrigger value="hierarchy" className="flex items-center gap-2">
                <Network className="w-4 h-4" />
                מפת קשרים וישויות
              </TabsTrigger>
              <TabsTrigger value="inheritance" className="flex items-center gap-2">
                <Upload className="w-4 h-4 rotate-90" />
                ירושת נתונים
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="hierarchy">
              <EntityRelationshipMapper />
            </TabsContent>
            
            <TabsContent value="inheritance">
              <EntityImportExport />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            עקרונות מבנה הנתונים
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="border rounded-md p-4 bg-white">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  היררכיה בסיסית
                </h3>
                <ul className="list-disc list-inside space-y-2 pr-2 text-gray-700">
                  <li><span className="font-medium">בניין</span> → יכול להכיל מספר נכסים</li>
                  <li><span className="font-medium">נכס</span> → יכול להיות קשור לחוזה אחד פעיל</li>
                  <li><span className="font-medium">חוזה</span> → יכול להיות קשור למספר דיירים (שותפים), תשלומים וערבויות</li>
                  <li><span className="font-medium">תשלומים</span> → קשורים לחוזה ולדייר ספציפי</li>
                  <li><span className="font-medium">מסמכים</span> → יכולים להיות משויכים לכל ישות במערכת</li>
                </ul>
              </div>
              
              <div className="border rounded-md p-4 bg-white">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-600" />
                  עקרונות מנחים
                </h3>
                <ul className="list-disc list-inside space-y-2 pr-2 text-gray-700">
                  <li>נתון נשמר פעם אחת בלבד במקום הלוגי שלו</li>
                  <li>ישויות בהיררכיה נמוכה יותר יורשות נתונים מישויות גבוהות יותר</li>
                  <li>ניתן לעדכן נתונים שנירשו ברמה המקומית (למשל, שינוי אחוז המע"מ בחוזה ספציפי)</li>
                  <li>דוחות מושכים מידע מכל הישויות הרלוונטיות לפי הצורך</li>
                  <li>ישויות בצד (ספקים, תחזוקה וכד') מקושרות לישויות בהיררכיה הראשית</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-blue-50 rounded-md p-4 border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">כללים נוספים חשובים</h3>
              <ul className="list-disc list-inside space-y-2 pr-2 text-blue-800">
                <li>המידע נשמר פעם אחת בלבד, והישויות מקבלות אותו בירושה בצורה היררכית.</li>
                <li>יש לאפשר למידע להשתנות ברמת החוזה (למשל, שינוי אחוז המע"מ מהגדרת ברירת מחדל בנכס).</li>
                <li>המערכת תומכת בהוספה פשוטה של קשרים חדשים.</li>
                <li>כל שינוי בישות יתעדכן אוטומטית בדוחות הרלוונטיים.</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
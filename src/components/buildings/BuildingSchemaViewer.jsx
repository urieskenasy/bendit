import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, 
  ArrowRight, 
  Home, 
  FileText, 
  Users, 
  Receipt, 
  Truck, 
  Wrench, 
  User, 
  PieChart
} from 'lucide-react';

export default function BuildingSchemaViewer() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-600" />
          מבנה הנתונים - בניין
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="hierarchy">
          <TabsList className="mb-4">
            <TabsTrigger value="hierarchy">היררכיה</TabsTrigger>
            <TabsTrigger value="schema">מבנה נתונים</TabsTrigger>
            <TabsTrigger value="inheritance">ירושת מידע</TabsTrigger>
          </TabsList>

          <TabsContent value="hierarchy">
            <div className="border rounded-lg p-6 bg-blue-50">
              <div className="flex flex-col items-center">
                <div className="bg-white p-4 rounded-lg shadow-sm border-2 border-blue-400 mb-6">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-8 w-8 text-blue-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-blue-800">בניין</h3>
                      <p className="text-sm text-blue-600">ישות בסיסית ביותר במערכת</p>
                    </div>
                  </div>
                </div>

                <div className="h-8 w-px bg-blue-400 relative">
                  <ArrowRight className="absolute w-4 h-4 text-blue-400 -left-2 -bottom-2 rotate-90" />
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
                  <div className="flex items-center gap-3">
                    <Home className="h-8 w-8 text-indigo-600" />
                    <div>
                      <h3 className="text-lg font-semibold">נכס</h3>
                      <p className="text-sm text-gray-500">יורש מידע מהבניין</p>
                    </div>
                  </div>
                </div>

                <div className="h-8 w-px bg-gray-300 relative">
                  <ArrowRight className="absolute w-4 h-4 text-gray-300 -left-2 -bottom-2 rotate-90" />
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border mb-1 opacity-70">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-gray-500" />
                    <div>
                      <h3 className="text-lg font-semibold">חוזה...</h3>
                      <p className="text-sm text-gray-500">הדרגה הבאה בהיררכיה</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t">
                <h3 className="text-lg font-semibold mb-4">קשרים צדדיים:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-white border">
                    <Truck className="h-6 w-6 text-green-600" />
                    <div>
                      <span className="font-medium">ספקים</span>
                      <div className="text-xs text-gray-500">רבים לרבים</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-white border">
                    <Wrench className="h-6 w-6 text-orange-600" />
                    <div>
                      <span className="font-medium">תחזוקה</span>
                      <div className="text-xs text-gray-500">אחד לרבים</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-white border">
                    <PieChart className="h-6 w-6 text-purple-600" />
                    <div>
                      <span className="font-medium">דוחות</span>
                      <div className="text-xs text-gray-500">אחד לרבים</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="schema">
            <div className="border rounded-lg p-4 bg-white space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SchemaField 
                  name="name" 
                  type="string" 
                  description="שם הבניין"
                  required={true}
                />
                
                <SchemaField 
                  name="address" 
                  type="object" 
                  description="כתובת הבניין"
                  required={true}
                  subfields={[
                    { name: "street", type: "string", description: "רחוב" },
                    { name: "number", type: "string", description: "מספר בית" },
                    { name: "city", type: "string", description: "עיר" },
                    { name: "postal_code", type: "string", description: "מיקוד" }
                  ]}
                />
                
                <SchemaField 
                  name="building_type"
                  type="string (enum)"
                  description="סוג הבניין"
                  required={true}
                  options={["מגורים", "מסחרי", "מעורב"]}
                />
                
                <SchemaField 
                  name="details"
                  type="object"
                  description="פרטי הבניין"
                  subfields={[
                    { name: "total_floors", type: "number", description: "מספר קומות" },
                    { name: "total_apartments", type: "number", description: "מספר דירות" },
                    { name: "year_built", type: "number", description: "שנת בנייה" }
                  ]}
                />
                
                <SchemaField 
                  name="building_committee"
                  type="object"
                  description="פרטי ועד הבית"
                  subfields={[
                    { name: "name", type: "string", description: "שם איש קשר" },
                    { name: "phone", type: "string", description: "טלפון" },
                    { name: "email", type: "string", description: "דוא\"ל" },
                    { name: "monthly_fee", type: "number", description: "דמי ועד חודשיים" }
                  ]}
                />
                
                <SchemaField 
                  name="amenities"
                  type="array of strings"
                  description="מתקנים בבניין"
                  options={["מעלית", "חניה", "מחסן", "לובי", "אבטחה", "מצלמות", "גינה", "גינת משחקים"]}
                />
                
                <SchemaField 
                  name="status"
                  type="string (enum)"
                  description="סטטוס הבניין"
                  options={["פעיל", "לא פעיל"]}
                  defaultValue="פעיל"
                />
              </div>
              
              <div className="mt-6 text-sm text-gray-500 p-2 bg-gray-50 rounded">
                * כל המידע המוגדר בישות "בניין" זמין ליישויות ילד (נכסים) דרך מנגנון הירושה
              </div>
            </div>
          </TabsContent>

          <TabsContent value="inheritance">
            <div className="border rounded-lg p-4 bg-white">
              <h3 className="text-lg font-semibold mb-4">ירושת מידע מבניין לנכסים:</h3>
              
              <div className="rounded-lg border overflow-hidden mb-8">
                <div className="bg-blue-50 p-3 border-b">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    <h4 className="font-semibold">בניין</h4>
                    <ArrowRight className="h-4 w-4 mx-2 text-blue-400" />
                    <Home className="h-5 w-5 text-indigo-600" />
                    <h4 className="font-semibold">נכס</h4>
                  </div>
                </div>
                
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-4 py-2 text-right">שדה</th>
                      <th className="px-4 py-2 text-right">תיאור</th>
                      <th className="px-4 py-2 text-right">שימוש בנכס</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="px-4 py-2 font-medium">כתובת</td>
                      <td className="px-4 py-2">כתובת מלאה של הבניין</td>
                      <td className="px-4 py-2">מתמלא אוטומטית בכל נכס</td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-2 font-medium">ועד בית</td>
                      <td className="px-4 py-2">פרטי ועד הבית ודמי הוועד</td>
                      <td className="px-4 py-2">חיוב אוטומטי של דיירים</td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-2 font-medium">מתקנים בבניין</td>
                      <td className="px-4 py-2">מעלית, חניה, לובי וכו'</td>
                      <td className="px-4 py-2">מוצג בפרטי הנכסים להשכרה</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium">ספקי שירות</td>
                      <td className="px-4 py-2">ספקים המשויכים לבניין</td>
                      <td className="px-4 py-2">זמינים אוטומטית לכל הנכסים</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="p-4 rounded-lg border bg-yellow-50 border-yellow-200">
                <h4 className="text-lg font-semibold text-yellow-800 mb-2">חשוב לדעת:</h4>
                <ul className="list-disc list-inside space-y-1 text-yellow-700">
                  <li>שינוי בפרטי הבניין ישתקף אוטומטית בכל הנכסים המשויכים</li>
                  <li>חלק מהמידע המועבר משמש לתצוגה בלבד, וחלקו משמש לפעולות אוטומטיות (כמו חיוב דמי ועד)</li>
                  <li>ניתן לדרוס את המידע הנירש בכל נכס באופן ספציפי (למשל, אם יש הסדר מיוחד לגבי דמי ועד)</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// רכיב להצגת שדה במבנה הנתונים
function SchemaField({ name, type, description, required, subfields, options, defaultValue }) {
  return (
    <div className="p-3 border rounded-md bg-gray-50">
      <div className="flex items-start justify-between mb-1">
        <div className="font-mono font-medium">{name}</div>
        <div className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">{type}</div>
      </div>
      <p className="text-sm text-gray-600 mb-1">{description}</p>
      
      {required && (
        <div className="text-xs text-red-600 mb-1">חובה</div>
      )}
      
      {defaultValue && (
        <div className="text-xs text-gray-500 mb-1">ברירת מחדל: {defaultValue}</div>
      )}
      
      {options && options.length > 0 && (
        <div className="text-xs text-gray-600 mt-1">
          אפשרויות: {options.join(', ')}
        </div>
      )}
      
      {subfields && subfields.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="text-xs font-medium text-gray-600 mb-1">שדות משנה:</div>
          <div className="space-y-1">
            {subfields.map((subfield, index) => (
              <div key={index} className="text-xs text-gray-600 flex">
                <span className="font-mono font-medium w-1/3">{subfield.name}</span>
                <span className="w-1/4">{subfield.type}</span>
                <span className="text-gray-500">{subfield.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
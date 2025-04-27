import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  Home, 
  Truck, 
  Wrench, 
  ChevronRight, 
  BarChart, 
  Link as LinkIcon,
  FileText,
  AlertCircle,
  PlusCircle
} from 'lucide-react';
import { Building, Property, Supplier, Maintenance } from '@/api/entities';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function BuildingRelationships({ buildingId }) {
  const [building, setBuilding] = useState(null);
  const [properties, setProperties] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (buildingId) {
      loadRelationships();
    }
  }, [buildingId]);

  const loadRelationships = async () => {
    setIsLoading(true);
    try {
      // טעינת הבניין
      const buildingData = await Building.filter({ id: buildingId });
      const targetBuilding = buildingData[0];
      setBuilding(targetBuilding);

      // טעינת הנכסים בבניין
      const propertiesData = await Property.filter({ building_id: buildingId });
      setProperties(propertiesData);

      // טעינת הספקים הקשורים לבניין
      const suppliersData = await Supplier.list();
      const relatedSuppliers = suppliersData.filter(supplier => 
        supplier.related_buildings?.includes(buildingId)
      );
      setSuppliers(relatedSuppliers);

      // טעינת משימות תחזוקה הקשורות לבניין
      const maintenanceData = await Maintenance.list();
      const relatedMaintenance = maintenanceData.filter(task => 
        task.related_to?.type === 'building' && task.related_to.id === buildingId
      );
      setMaintenance(relatedMaintenance);
    } catch (error) {
      console.error('Error loading building relationships:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">טוען נתונים...</div>;
  }

  if (!building) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-yellow-500 mb-4" />
          <h3 className="text-lg font-medium mb-2">לא נמצאו נתונים</h3>
          <p className="text-gray-500">הבניין המבוקש לא נמצא או שאין לך הרשאות לצפייה בו.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-blue-600" />
          קשרי ישויות בבניין: {building.name}
        </CardTitle>
        <CardDescription>
          מציג את כל הישויות הקשורות לבניין זה והמידע המועבר ביניהן
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="structure">
          <TabsList className="mb-4">
            <TabsTrigger value="structure">מבנה קשרים</TabsTrigger>
            <TabsTrigger value="properties">נכסים ({properties.length})</TabsTrigger>
            <TabsTrigger value="suppliers">ספקים ({suppliers.length})</TabsTrigger>
            <TabsTrigger value="maintenance">תחזוקה ({maintenance.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="structure">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ישות</TableHead>
                  <TableHead>סוג קשר</TableHead>
                  <TableHead>מידע מועבר</TableHead>
                  <TableHead>שימושים</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4 text-indigo-600" />
                      <span className="font-medium">נכס</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-blue-100 text-blue-800">אחד לרבים</Badge>
                  </TableCell>
                  <TableCell>
                    <ul className="list-disc list-inside text-sm">
                      <li>כתובת מלאה</li>
                      <li>פרטי ועד בית</li>
                      <li>מתקנים בבניין</li>
                      <li>ספקי שירות שכונתיים</li>
                    </ul>
                  </TableCell>
                  <TableCell>
                    <ul className="list-disc list-inside text-sm">
                      <li>פרטי כתובת אוטומטיים</li>
                      <li>תשלומי ועד בית אוטומטיים</li>
                      <li>רשימת ספקים רלוונטיים</li>
                    </ul>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" asChild size="sm">
                      <Link to={createPageUrl(`Properties?building=${buildingId}`)}>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-green-600" />
                      <span className="font-medium">ספקים</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-green-100 text-green-800">רבים לרבים</Badge>
                  </TableCell>
                  <TableCell>
                    <ul className="list-disc list-inside text-sm">
                      <li>שיוך ספקים לבניין</li>
                      <li>חוזי שירות ברמת הבניין</li>
                    </ul>
                  </TableCell>
                  <TableCell>
                    <ul className="list-disc list-inside text-sm">
                      <li>תחזוקה שוטפת של הבניין</li>
                      <li>תשלומים לספקים</li>
                      <li>דוחות ספקים ועלויות</li>
                    </ul>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" asChild size="sm">
                      <Link to={createPageUrl(`Suppliers?building=${buildingId}`)}>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-orange-600" />
                      <span className="font-medium">תחזוקה</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-orange-100 text-orange-800">אחד לרבים</Badge>
                  </TableCell>
                  <TableCell>
                    <ul className="list-disc list-inside text-sm">
                      <li>משימות תחזוקה לבניין</li>
                      <li>היסטוריית תחזוקה</li>
                      <li>עלויות תחזוקה</li>
                    </ul>
                  </TableCell>
                  <TableCell>
                    <ul className="list-disc list-inside text-sm">
                      <li>מעקב תחזוקה לפי מבנה</li>
                      <li>ניתוח עלויות תחזוקה</li>
                      <li>ניטור ספקים פעילים</li>
                    </ul>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" asChild size="sm">
                      <Link to={createPageUrl(`Maintenance?building=${buildingId}`)}>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <BarChart className="h-4 w-4 text-purple-600" />
                      <span className="font-medium">דוחות</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-purple-100 text-purple-800">אחד לרבים</Badge>
                  </TableCell>
                  <TableCell>
                    <ul className="list-disc list-inside text-sm">
                      <li>נתוני בניין כמסנן לדוחות</li>
                      <li>נתוני תפוסה בבניין</li>
                      <li>נתוני רווחיות לבניין</li>
                    </ul>
                  </TableCell>
                  <TableCell>
                    <ul className="list-disc list-inside text-sm">
                      <li>סינון לפי בניין ספציפי</li>
                      <li>ניתוח רווחיות לפי בניין</li>
                      <li>השוואת ביצועים בין בניינים</li>
                    </ul>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" asChild size="sm">
                      <Link to={createPageUrl(`Reports?building=${buildingId}`)}>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                העברת וירושת מידע
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-4 text-sm">
                  <div className="flex-shrink-0 mt-1">
                    <Building2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-blue-800">העברת מידע לנכסים</p>
                    <p className="text-blue-700">הבניין מהווה את הישות הבסיסית ביותר בהיררכיה, וכל הנכסים השייכים אליו יורשים באופן אוטומטי את פרטי הכתובת, מידע על ועד הבית, תיאור המתקנים בבניין ופרטים נוספים הרלוונטיים לכל הנכסים בבניין.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 text-sm">
                  <div className="flex-shrink-0 mt-1">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-blue-800">הערות חשובות</p>
                    <ul className="list-disc list-inside text-blue-700 space-y-1">
                      <li>שינוי פרטים ברמת הבניין ישפיע אוטומטית על כל הנכסים המשוייכים אליו</li>
                      <li>כל פעולות התחזוקה ברמת הבניין שונות מהתחזוקה ברמת הנכס</li>
                      <li>ביצוע ניתוח עלויות ברמת הבניין מסייע באיתור בניינים רווחיים</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="properties">
            {properties.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>יחידה/דירה</TableHead>
                      <TableHead>סוג נכס</TableHead>
                      <TableHead>קומה</TableHead>
                      <TableHead>שטח (במ"ר)</TableHead>
                      <TableHead>סטטוס</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {properties.map(property => (
                      <TableRow key={property.id}>
                        <TableCell className="font-medium">{property.property_number}</TableCell>
                        <TableCell>
                          {property.type === 'apartment' && 'דירה'}
                          {property.type === 'office' && 'משרד'}
                          {property.type === 'store' && 'חנות'}
                          {property.type === 'warehouse' && 'מחסן'}
                          {property.type === 'parking' && 'חניה'}
                          {property.type === 'storage' && 'מחסן'}
                        </TableCell>
                        <TableCell>{property.floor}</TableCell>
                        <TableCell>{property.measurements?.total_sqm}</TableCell>
                        <TableCell>
                          <Badge className={
                            property.status === 'rented' ? 'bg-green-100 text-green-800' :
                            property.status === 'available' ? 'bg-blue-100 text-blue-800' :
                            property.status === 'under_renovation' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {property.status === 'rented' && 'מושכר'}
                            {property.status === 'available' && 'פנוי'}
                            {property.status === 'under_renovation' && 'בשיפוץ'}
                            {property.status === 'not_available' && 'לא זמין'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" asChild size="sm">
                            <Link to={createPageUrl(`Properties/View?id=${property.id}`)}>
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center p-8 border rounded-md">
                <Home className="mx-auto h-10 w-10 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium mb-2">אין נכסים</h3>
                <p className="text-gray-500 mb-4">לא נמצאו נכסים בבניין זה</p>
                <Button asChild>
                  <Link to={createPageUrl(`Properties/Create?building=${buildingId}`)}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    הוסף נכס חדש
                  </Link>
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="suppliers">
            {suppliers.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>שם הספק</TableHead>
                      <TableHead>סוג שירות</TableHead>
                      <TableHead>איש קשר</TableHead>
                      <TableHead>פרטי קשר</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.map(supplier => (
                      <TableRow key={supplier.id}>
                        <TableCell className="font-medium">{supplier.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {supplier.service_type === 'plumbing' && 'אינסטלציה'}
                            {supplier.service_type === 'electricity' && 'חשמל'}
                            {supplier.service_type === 'cleaning' && 'ניקיון'}
                            {supplier.service_type === 'maintenance' && 'תחזוקה כללית'}
                            {supplier.service_type === 'construction' && 'בנייה'}
                            {supplier.service_type === 'gardening' && 'גינון'}
                            {supplier.service_type === 'security' && 'אבטחה'}
                            {supplier.service_type === 'other' && 'אחר'}
                          </Badge>
                        </TableCell>
                        <TableCell>{supplier.contact_name || '—'}</TableCell>
                        <TableCell>
                          <div>{supplier.phone}</div>
                          <div className="text-xs text-gray-500">{supplier.email}</div>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" asChild size="sm">
                            <Link to={createPageUrl(`Suppliers/View?id=${supplier.id}`)}>
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center p-8 border rounded-md">
                <Truck className="mx-auto h-10 w-10 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium mb-2">אין ספקים</h3>
                <p className="text-gray-500 mb-4">לא נמצאו ספקים משויכים לבניין זה</p>
                <Button asChild>
                  <Link to={createPageUrl(`Suppliers/Create?building=${buildingId}`)}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    הוסף ספק חדש
                  </Link>
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="maintenance">
            {maintenance.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>משימה</TableHead>
                      <TableHead>סטטוס</TableHead>
                      <TableHead>דחיפות</TableHead>
                      <TableHead>תאריך</TableHead>
                      <TableHead>ספק מטפל</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maintenance.map(task => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">{task.title}</TableCell>
                        <TableCell>
                          <Badge className={
                            task.status === 'open' ? 'bg-red-100 text-red-800' :
                            task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            task.status === 'completed' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {task.status === 'open' && 'פתוח'}
                            {task.status === 'in_progress' && 'בטיפול'}
                            {task.status === 'completed' && 'הושלם'}
                            {task.status === 'cancelled' && 'בוטל'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            task.priority === 'urgent' ? 'border-red-200 text-red-800' :
                            task.priority === 'high' ? 'border-orange-200 text-orange-800' :
                            task.priority === 'medium' ? 'border-yellow-200 text-yellow-800' :
                            'border-blue-200 text-blue-800'
                          }>
                            {task.priority === 'urgent' && 'דחוף'}
                            {task.priority === 'high' && 'גבוהה'}
                            {task.priority === 'medium' && 'בינונית'}
                            {task.priority === 'low' && 'נמוכה'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {task.scheduled_date && new Date(task.scheduled_date).toLocaleDateString('he-IL')}
                        </TableCell>
                        <TableCell>{task.supplier_name || '—'}</TableCell>
                        <TableCell>
                          <Button variant="ghost" asChild size="sm">
                            <Link to={createPageUrl(`Maintenance/View?id=${task.id}`)}>
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center p-8 border rounded-md">
                <Wrench className="mx-auto h-10 w-10 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium mb-2">אין משימות תחזוקה</h3>
                <p className="text-gray-500 mb-4">לא נמצאו משימות תחזוקה לבניין זה</p>
                <Button asChild>
                  <Link to={createPageUrl(`Maintenance/Create?building=${buildingId}`)}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    הוסף משימת תחזוקה
                  </Link>
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
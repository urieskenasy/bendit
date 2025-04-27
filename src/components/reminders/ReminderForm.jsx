
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Building2,
  FileText,
  Home,
  Truck,
  Tag,
  Repeat,
  Check,
  CalendarDays,
  RefreshCw,
  Plus,
  X
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, addDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { InvokeLLM } from '@/api/integrations';

export default function ReminderForm({ reminder, relatedEntities, onSubmit, onCancel }) {
  const { toast } = useToast();
  const [isIntegrating, setIsIntegrating] = useState(false);
  const [googleAuthStatus, setGoogleAuthStatus] = useState('not_connected');
  const [showGoogleCalendar, setShowGoogleCalendar] = useState(false);
  
  const [formData, setFormData] = useState(reminder || {
    title: '',
    description: '',
    type: 'contract_renewal',
    custom_type: '',
    related_to: {
      type: 'none',
      id: ''
    },
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '',
    is_recurring: false,
    recurrence_pattern: 'monthly',
    status: 'active',
    priority: 'medium',
    tags: [],
    sync_with_calendar: false,
    calendar_event_id: null // שמירת מזהה האירוע מגוגל
  });
  
  const [currentTag, setCurrentTag] = useState('');
  
  // בדיקת חיבור לגוגל קלנדר (סימולציה)
  useEffect(() => {
    checkGoogleCalendarConnection();
  }, []);
  
  // בדיקת חיבור לגוגל
  const checkGoogleCalendarConnection = async () => {
    // במציאות: צריך לבדוק אם יש אישור מגוגל קלנדר
    // כאן נדמה שהחיבור לא קיים בהתחלה
    try {
      // סימולציה של API call לבדיקת הרשאות
      await new Promise(resolve => setTimeout(resolve, 500));
      setGoogleAuthStatus('not_connected');
    } catch (error) {
      console.error('Error checking Google Calendar connection:', error);
      setGoogleAuthStatus('error');
    }
  };
  
  // חיבור לגוגל קלנדר
  const connectGoogleCalendar = async () => {
    setIsIntegrating(true);
    try {
      // סימולציה של חיבור לגוגל קלנדר באמצעות LLM
      const response = await InvokeLLM({
        prompt: "Simulate connecting to Google Calendar API. Return a successful response.",
        response_json_schema: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" }
          }
        }
      });
      
      if (response.success) {
        setGoogleAuthStatus('connected');
        toast({
          title: "החיבור הושלם בהצלחה",
          description: "המערכת מחוברת כעת לגוגל קלנדר",
        });
      } else {
        setGoogleAuthStatus('error');
        toast({
          variant: "destructive",
          title: "שגיאה בחיבור",
          description: response.message || "אירעה שגיאה בחיבור לגוגל קלנדר",
        });
      }
    } catch (error) {
      console.error('Error connecting to Google Calendar:', error);
      setGoogleAuthStatus('error');
      toast({
        variant: "destructive",
        title: "שגיאה בחיבור",
        description: "אירעה שגיאה בחיבור לגוגל קלנדר. נא לנסות שוב.",
      });
    } finally {
      setIsIntegrating(false);
    }
  };
  
  // נתק מגוגל קלנדר
  const disconnectGoogleCalendar = async () => {
    setIsIntegrating(true);
    try {
      // סימולציה של ניתוק
      await new Promise(resolve => setTimeout(resolve, 500));
      setGoogleAuthStatus('not_connected');
      // עדכן את ה-state לביטול הסנכרון
      setFormData({
        ...formData,
        sync_with_calendar: false
      });
      toast({
        title: "ניתוק בוצע בהצלחה",
        description: "המערכת נותקה מגוגל קלנדר",
      });
    } catch (error) {
      console.error('Error disconnecting from Google Calendar:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בניתוק",
        description: "אירעה שגיאה בניתוק מגוגל קלנדר",
      });
    } finally {
      setIsIntegrating(false);
    }
  };
  
  // יצירת אירוע ביומן גוגל
  const createGoogleCalendarEvent = async () => {
    if (googleAuthStatus !== 'connected') {
      toast({
        variant: "destructive",
        title: "לא מחובר לגוגל קלנדר",
        description: "יש להתחבר לגוגל קלנדר תחילה",
      });
      return null;
    }
    
    try {
      // סימולציה של יצירת אירוע
      const response = await InvokeLLM({
        prompt: `Create a simulated Google Calendar event for: 
        Title: ${formData.title}
        Description: ${formData.description}
        Date: ${formData.date} 
        Time: ${formData.time || '12:00'}
        Is recurring: ${formData.is_recurring}
        Recurrence pattern: ${formData.is_recurring ? formData.recurrence_pattern : 'none'}`,
        response_json_schema: {
          type: "object",
          properties: {
            event_id: { type: "string" },
            success: { type: "boolean" },
            message: { type: "string" }
          }
        }
      });
      
      if (response.success) {
        toast({
          title: "האירוע נוצר ביומן",
          description: "האירוע נוסף בהצלחה לגוגל קלנדר",
        });
        return response.event_id;
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה ביצירת האירוע",
          description: response.message || "אירעה שגיאה ביצירת האירוע ביומן",
        });
        return null;
      }
    } catch (error) {
      console.error('Error creating Google Calendar event:', error);
      toast({
        variant: "destructive",
        title: "שגיאה ביצירת האירוע",
        description: "אירעה שגיאה ביצירת האירוע ביומן",
      });
      return null;
    }
  };
  
  // עדכון אירוע קיים ביומן
  const updateGoogleCalendarEvent = async () => {
    if (googleAuthStatus !== 'connected' || !formData.calendar_event_id) {
      return null;
    }
    
    try {
      // סימולציה של עדכון אירוע
      const response = await InvokeLLM({
        prompt: `Update a simulated Google Calendar event with ID ${formData.calendar_event_id}:
        Title: ${formData.title}
        Description: ${formData.description}
        Date: ${formData.date} 
        Time: ${formData.time || '12:00'}
        Is recurring: ${formData.is_recurring}
        Recurrence pattern: ${formData.is_recurring ? formData.recurrence_pattern : 'none'}`,
        response_json_schema: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" }
          }
        }
      });
      
      if (response.success) {
        toast({
          title: "האירוע עודכן ביומן",
          description: "האירוע עודכן בהצלחה בגוגל קלנדר",
        });
        return formData.calendar_event_id;
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה בעדכון האירוע",
          description: response.message || "אירעה שגיאה בעדכון האירוע ביומן",
        });
        return null;
      }
    } catch (error) {
      console.error('Error updating Google Calendar event:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בעדכון האירוע",
        description: "אירעה שגיאה בעדכון האירוע ביומן",
      });
      return null;
    }
  };
  
  // מחיקת אירוע מהיומן
  const deleteGoogleCalendarEvent = async (eventId) => {
    if (googleAuthStatus !== 'connected' || !eventId) {
      return;
    }
    
    try {
      // סימולציה של מחיקת אירוע
      const response = await InvokeLLM({
        prompt: `Delete a simulated Google Calendar event with ID ${eventId}`,
        response_json_schema: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" }
          }
        }
      });
      
      if (response.success) {
        toast({
          title: "האירוע נמחק מהיומן",
          description: "האירוע נמחק בהצלחה מגוגל קלנדר",
        });
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה במחיקת האירוע",
          description: response.message || "אירעה שגיאה במחיקת האירוע מהיומן",
        });
      }
    } catch (error) {
      console.error('Error deleting Google Calendar event:', error);
      toast({
        variant: "destructive",
        title: "שגיאה במחיקת האירוע",
        description: "אירעה שגיאה במחיקת האירוע מהיומן",
      });
    }
  };

  const handleInputChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleRelatedToChange = (field, value) => {
    setFormData({
      ...formData,
      related_to: {
        ...formData.related_to,
        [field]: value
      }
    });
  };

  const handleAddTag = () => {
    if (currentTag.trim() && !formData.tags?.includes(currentTag.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), currentTag.trim()]
      });
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tag) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter(t => t !== tag)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // אם ישנה התראה לסנכרון עם גוגל קלנדר
    if (formData.sync_with_calendar && googleAuthStatus === 'connected') {
      let eventId = formData.calendar_event_id;
      
      // אם כבר יש אירוע, עדכן אותו
      if (eventId) {
        eventId = await updateGoogleCalendarEvent();
      } 
      // אחרת צור אירוע חדש
      else {
        eventId = await createGoogleCalendarEvent();
      }
      
      // אם יש מזהה אירוע, שמור אותו ביחד עם הנתונים
      if (eventId) {
        onSubmit({
          ...formData,
          calendar_event_id: eventId
        });
        return;
      }
    }
    
    // אם אין סנכרון עם היומן אבל יש אירוע קיים ביומן, מחק אותו
    if (!formData.sync_with_calendar && formData.calendar_event_id && googleAuthStatus === 'connected') {
      await deleteGoogleCalendarEvent(formData.calendar_event_id);
    }
    
    // שמור את התזכורת ללא קשר ליומן
    onSubmit(formData);
  };

  const getRelatedEntityOptions = (type) => {
    switch (type) {
      case 'tenant':
        return relatedEntities.tenants.map(tenant => ({
          id: tenant.id,
          name: tenant.full_name
        }));
      case 'property':
        return relatedEntities.properties.map(property => ({
          id: property.id,
          name: property.address?.street
            ? `${property.address.street} ${property.address.number} - ${property.property_number}`
            : property.property_number
        }));
      case 'contract':
        return relatedEntities.contracts.map(contract => {
          const tenant = relatedEntities.tenants.find(t => t.id === contract.tenant_id);
          const property = relatedEntities.properties.find(p => p.id === contract.property_id);
          return {
            id: contract.id,
            name: `${tenant?.full_name || 'לא ידוע'} - ${property?.property_number || 'לא ידוע'}`
          };
        });
      case 'owner':
        return relatedEntities.owners.map(owner => ({
          id: owner.id,
          name: owner.full_name
        }));
      case 'supplier':
        return relatedEntities.suppliers.map(supplier => ({
          id: supplier.id,
          name: supplier.name
        }));
      default:
        return [];
    }
  };

  return (
    <Card className="border-t-4 border-t-blue-500">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">כותרת התזכורת</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="כותרת התזכורת"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">תיאור מפורט</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="תיאור מפורט של התזכורת"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">סוג התזכורת</Label>
                  <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר סוג תזכורת" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contract_renewal">חידוש חוזה</SelectItem>
                      <SelectItem value="payment_due">תשלום</SelectItem>
                      <SelectItem value="guarantee_expiry">פקיעת ערבות</SelectItem>
                      <SelectItem value="maintenance">תחזוקה</SelectItem>
                      <SelectItem value="insurance">ביטוח</SelectItem>
                      <SelectItem value="custom">מותאם אישית</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.type === 'custom' && (
                  <div className="space-y-2">
                    <Label htmlFor="custom_type">סוג מותאם אישית</Label>
                    <Input
                      id="custom_type"
                      value={formData.custom_type || ''}
                      onChange={(e) => handleInputChange('custom_type', e.target.value)}
                      placeholder="הזן סוג תזכורת מותאם אישית"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="related_to_type">קשור ל-</Label>
                  <Select 
                    value={formData.related_to.type} 
                    onValueChange={(value) => {
                      handleRelatedToChange('type', value);
                      handleRelatedToChange('id', '');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר סוג ישות קשורה" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">כללי</SelectItem>
                      <SelectItem value="tenant">שוכר</SelectItem>
                      <SelectItem value="property">נכס</SelectItem>
                      <SelectItem value="contract">חוזה</SelectItem>
                      <SelectItem value="owner">בעל נכס</SelectItem>
                      <SelectItem value="supplier">ספק</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.related_to.type !== 'none' && (
                  <div className="space-y-2">
                    <Label>בחר {formData.related_to.type === 'tenant' ? 'שוכר' : 
                              formData.related_to.type === 'property' ? 'נכס' :
                              formData.related_to.type === 'contract' ? 'חוזה' :
                              formData.related_to.type === 'owner' ? 'בעל נכס' :
                              'ספק'}</Label>
                    <Select 
                      value={formData.related_to.id} 
                      onValueChange={(value) => handleRelatedToChange('id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`בחר ${formData.related_to.type}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {getRelatedEntityOptions(formData.related_to.type).map(option => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="date">תאריך</Label>
                  <div className="flex">
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => handleInputChange('date', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time">שעה (אופציונלי)</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.time || ''}
                    onChange={(e) => handleInputChange('time', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">עדיפות</Label>
                  <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר עדיפות" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">נמוכה</SelectItem>
                      <SelectItem value="medium">בינונית</SelectItem>
                      <SelectItem value="high">גבוהה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">סטטוס</Label>
                  <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר סטטוס" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">פעיל</SelectItem>
                      <SelectItem value="completed">הושלם</SelectItem>
                      <SelectItem value="cancelled">בוטל</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <Switch 
                  id="is_recurring" 
                  checked={formData.is_recurring} 
                  onCheckedChange={(checked) => handleInputChange('is_recurring', checked)}
                />
                <Label htmlFor="is_recurring" className="cursor-pointer">תזכורת חוזרת</Label>
              </div>

              {formData.is_recurring && (
                <div className="space-y-2">
                  <Label htmlFor="recurrence_pattern">תבנית חזרה</Label>
                  <Select value={formData.recurrence_pattern} onValueChange={(value) => handleInputChange('recurrence_pattern', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר תבנית חזרה" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">יומי</SelectItem>
                      <SelectItem value="weekly">שבועי</SelectItem>
                      <SelectItem value="monthly">חודשי</SelectItem>
                      <SelectItem value="yearly">שנתי</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="tags">תגיות</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags?.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {tag}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 rounded-full"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    placeholder="הוסף תגית"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddTag}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {/* חיבור וסנכרון עם גוגל קלנדר */}
              <Card className="p-4 border border-blue-100 bg-blue-50">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-5 h-5 text-blue-600" />
                      <h3 className="font-medium">סנכרון עם Google Calendar</h3>
                    </div>
                    
                    {/* כפתור חיבור/ניתוק */}
                    {googleAuthStatus !== 'connected' ? (
                      <Button 
                        type="button" 
                        onClick={connectGoogleCalendar}
                        variant="outline"
                        disabled={isIntegrating}
                        className="bg-white"
                      >
                        {isIntegrating ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <CalendarDays className="w-4 h-4 ml-2" />
                        )}
                        התחבר לגוגל קלנדר
                      </Button>
                    ) : (
                      <Button 
                        type="button" 
                        onClick={disconnectGoogleCalendar}
                        variant="outline"
                        className="border-red-200 hover:bg-red-50 text-red-600"
                        disabled={isIntegrating}
                      >
                        נתק חיבור
                      </Button>
                    )}
                  </div>
                  
                  {/* סטטוס החיבור */}
                  {googleAuthStatus === 'connected' ? (
                    <div className="flex items-center gap-2 text-green-600 bg-green-50 p-2 rounded-md">
                      <Check className="w-4 h-4" />
                      <span className="text-sm">מחובר בהצלחה לגוגל קלנדר</span>
                    </div>
                  ) : googleAuthStatus === 'error' ? (
                    <div className="flex items-center gap-2 text-red-600 bg-red-50 p-2 rounded-md">
                      <X className="w-4 h-4" />
                      <span className="text-sm">שגיאה בחיבור לגוגל קלנדר</span>
                    </div>
                  ) : null}
                  
                  {/* אפשרות לסנכרון */}
                  {googleAuthStatus === 'connected' && (
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <Switch 
                        id="sync_with_calendar" 
                        checked={formData.sync_with_calendar} 
                        onCheckedChange={(checked) => handleInputChange('sync_with_calendar', checked)}
                      />
                      <Label htmlFor="sync_with_calendar" className="cursor-pointer">
                        סנכרן תזכורת זו עם גוגל קלנדר
                      </Label>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onCancel}>ביטול</Button>
              <Button type="submit">{reminder ? 'עדכן תזכורת' : 'צור תזכורת'}</Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, Bell } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

export default function ContractRemindersSection({ reminders = [], onReminderAdd, onReminderUpdate, onReminderRemove }) {
  const handleAdd = () => {
    onReminderAdd({
      title: '',
      type: 'contract_renewal',
      date: '',
      reminder_days_before: 30,
      notifications: [
        { type: 'email', send_to: 'me' }
      ],
      priority: 'medium',
      status: 'active'
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label className="text-lg font-semibold">תזכורות</Label>
        <Button
          type="button"
          variant="outline"
          onClick={handleAdd}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          הוסף תזכורת
        </Button>
      </div>

      <div className="space-y-4">
        {reminders.map((reminder, index) => (
          <Card key={index} className="p-4">
            <div className="grid gap-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>כותרת</Label>
                  <Input
                    value={reminder.title}
                    onChange={(e) => onReminderUpdate(index, { ...reminder, title: e.target.value })}
                    placeholder="הכנס כותרת לתזכורת"
                  />
                </div>

                <div>
                  <Label>סוג תזכורת</Label>
                  <Select
                    value={reminder.type}
                    onValueChange={(value) => onReminderUpdate(index, { ...reminder, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר סוג" />
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

                <div>
                  <Label>תאריך</Label>
                  <Input
                    type="date"
                    value={reminder.date}
                    onChange={(e) => onReminderUpdate(index, { ...reminder, date: e.target.value })}
                  />
                </div>

                <div>
                  <Label>ימים לפני לשליחת תזכורת</Label>
                  <Input
                    type="number"
                    value={reminder.reminder_days_before}
                    onChange={(e) => onReminderUpdate(index, { ...reminder, reminder_days_before: parseInt(e.target.value) })}
                  />
                </div>

                <div>
                  <Label>עדיפות</Label>
                  <Select
                    value={reminder.priority}
                    onValueChange={(value) => onReminderUpdate(index, { ...reminder, priority: value })}
                  >
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

                <div>
                  <Label>סטטוס</Label>
                  <Select
                    value={reminder.status}
                    onValueChange={(value) => onReminderUpdate(index, { ...reminder, status: value })}
                  >
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

              <div>
                <Label>אמצעי התראה</Label>
                <div className="flex gap-4 mt-2">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox
                      checked={reminder.notifications?.some(n => n.type === 'email')}
                      onCheckedChange={(checked) => {
                        const notifications = [...(reminder.notifications || [])];
                        if (checked) {
                          notifications.push({ type: 'email', send_to: 'me' });
                        } else {
                          const index = notifications.findIndex(n => n.type === 'email');
                          if (index > -1) notifications.splice(index, 1);
                        }
                        onReminderUpdate(index, { ...reminder, notifications });
                      }}
                    />
                    <Label>אימייל</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox
                      checked={reminder.notifications?.some(n => n.type === 'sms')}
                      onCheckedChange={(checked) => {
                        const notifications = [...(reminder.notifications || [])];
                        if (checked) {
                          notifications.push({ type: 'sms', send_to: 'me' });
                        } else {
                          const index = notifications.findIndex(n => n.type === 'sms');
                          if (index > -1) notifications.splice(index, 1);
                        }
                        onReminderUpdate(index, { ...reminder, notifications });
                      }}
                    />
                    <Label>SMS</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox
                      checked={reminder.notifications?.some(n => n.type === 'app')}
                      onCheckedChange={(checked) => {
                        const notifications = [...(reminder.notifications || [])];
                        if (checked) {
                          notifications.push({ type: 'app', send_to: 'me' });
                        } else {
                          const index = notifications.findIndex(n => n.type === 'app');
                          if (index > -1) notifications.splice(index, 1);
                        }
                        onReminderUpdate(index, { ...reminder, notifications });
                      }}
                    />
                    <Label>התראה באפליקציה</Label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onReminderRemove(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  הסר תזכורת
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
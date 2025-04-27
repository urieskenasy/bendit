import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, parseISO, isWithinInterval, addMonths, subMonths } from 'date-fns';
import { heIL } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function CalendarWidget({ contracts = [], payments = [], maintenance = [], size = 'large' }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // חישוב תאריכי היום והחודש הנוכחי
  const today = new Date();
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // החודש הקודם והבא
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  
  // איסוף כל האירועים מכל המקורות
  const collectEvents = () => {
    const events = [];
    
    // הוספת מועדי חוזים
    contracts.forEach(contract => {
      if (contract.start_date) {
        events.push({
          date: contract.start_date,
          title: 'תחילת חוזה',
          type: 'contract_start',
          entity_id: contract.id,
          color: 'bg-green-100 text-green-800'
        });
      }
      
      if (contract.end_date) {
        events.push({
          date: contract.end_date,
          title: 'סיום חוזה',
          type: 'contract_end',
          entity_id: contract.id,
          color: 'bg-red-100 text-red-800'
        });
      }
    });
    
    // הוספת תשלומים
    payments.forEach(payment => {
      if (payment.due_date) {
        events.push({
          date: payment.due_date,
          title: 'תשלום',
          type: 'payment',
          entity_id: payment.id,
          color: 'bg-blue-100 text-blue-800'
        });
      }
    });
    
    // הוספת משימות תחזוקה
    maintenance.forEach(task => {
      if (task.scheduled_date) {
        events.push({
          date: task.scheduled_date,
          title: 'תחזוקה',
          type: 'maintenance',
          entity_id: task.id,
          color: 'bg-orange-100 text-orange-800'
        });
      }
    });
    
    return events;
  };
  
  const events = collectEvents();
  
  // קבלת אירועים ליום ספציפי
  const getEventsForDay = (day) => {
    return events.filter(event => {
      if (!event.date) return false;
      const eventDate = parseISO(event.date);
      return isSameDay(eventDate, day);
    });
  };
  
  // בדיקה האם יש אירועים ביום מסוים
  const hasEventsOnDay = (day) => {
    return getEventsForDay(day).length > 0;
  };
  
  // הצגת אירועים לחודש
  const getMonthEvents = () => {
    return events.filter(event => {
      if (!event.date) return false;
      const eventDate = parseISO(event.date);
      return isWithinInterval(eventDate, { start: monthStart, end: monthEnd });
    });
  };
  
  const monthEvents = getMonthEvents();
  const displayedEvents = monthEvents.slice(0, 5);
  
  // ימי השבוע העבריים
  const weekdays = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
  
  return (
    <Card className="p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold">לוח שנה</h2>
        </div>
        
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={prevMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="font-medium mx-2 min-w-24 text-center">
            {format(currentMonth, 'MMMM yyyy', { locale: heIL })}
          </div>
          <Button variant="ghost" size="icon" onClick={nextMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekdays.map((day, i) => (
          <div key={i} className="text-center text-sm font-medium text-gray-700 py-1">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-4">
        {daysInMonth.map((day, i) => {
          const eventsOnDay = getEventsForDay(day);
          const hasEvents = eventsOnDay.length > 0;
          
          return (
            <TooltipProvider key={i}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    className={`
                      h-10 flex flex-col items-center justify-center rounded-md
                      ${!isSameMonth(day, currentMonth) ? 'text-gray-300' : ''}
                      ${isSameDay(day, today) ? 'bg-blue-50 font-bold' : ''}
                      ${hasEvents ? 'font-medium' : ''}
                    `}
                  >
                    {format(day, 'd')}
                    {hasEvents && (
                      <div className="flex -space-x-1 mt-1">
                        {eventsOnDay.slice(0, 3).map((event, j) => (
                          <div 
                            key={j} 
                            className={`w-1.5 h-1.5 rounded-full ${event.color.split(' ')[0]}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                {hasEvents && (
                  <TooltipContent>
                    <div className="text-center mb-1 font-medium">
                      {format(day, 'EEEE, d MMMM', { locale: heIL })}
                    </div>
                    <ul className="space-y-1">
                      {eventsOnDay.map((event, j) => (
                        <li key={j}>
                          <Badge className={event.color}>
                            {event.title}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
      
      {displayedEvents.length > 0 && (
        <div className="mt-auto">
          <h3 className="text-sm font-medium mb-2">אירועים החודש:</h3>
          <div className="space-y-2">
            {displayedEvents.map((event, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <Badge className={event.color}>
                  {event.title}
                </Badge>
                <span className="text-gray-500">
                  {format(parseISO(event.date), 'd MMMM', { locale: heIL })}
                </span>
              </div>
            ))}
            
            {monthEvents.length > 5 && (
              <div className="text-xs text-gray-500 text-center mt-2">
                + עוד {monthEvents.length - 5} אירועים
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
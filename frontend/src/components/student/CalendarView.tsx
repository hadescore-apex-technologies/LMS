import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Calendar, ChevronLeft, ChevronRight, Clock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface CalendarEvent {
  id: number;
  type: 'LIVE_CLASS';
  title: string;
  course_title: string;
  datetime: string;
  url?: string;
}

import { useQuery } from '@tanstack/react-query';

const CalendarView: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayEvents, setSelectedDayEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { data: events = [] } = useQuery<CalendarEvent[]>({
    queryKey: ['student-calendar-events'],
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const res = await api.get('courses/live/');
      const eventsList: CalendarEvent[] = [];
      res.data.forEach((live: any) => {
        eventsList.push({
          id: live.id,
          type: 'LIVE_CLASS',
          title: live.title,
          course_title: live.course_title || 'Assigned Course',
          datetime: live.scheduled_time,
          url: live.meeting_url
        });
      });
      return eventsList;
    }
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Days in month
  const totalDays = new Date(year, month + 1, 0).getDate();
  const startDayOfWeek = new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleSelectDay = (day: number) => {
    const targetDate = new Date(year, month, day);
    setSelectedDate(targetDate);

    const dayEvents = events.filter(event => {
      const eDate = new Date(event.datetime);
      return (
        eDate.getDate() === day &&
        eDate.getMonth() === month &&
        eDate.getFullYear() === year
      );
    });
    setSelectedDayEvents(dayEvents);
  };

  return (
    <div className="w-full grid gap-4 lg:grid-cols-3 animate-fade-in text-xs">
      {/* 🗓️ Left Column - Calendar Layout (66% width) */}
      <div className="lg:col-span-2 cyber-glass-card p-5 rounded-2xl shadow-sm space-y-4">
        {/* Navigation header */}
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="text-cyan-400" size={16} />
            <h3 className="font-bold text-sm text-white">
              {monthNames[month]} {year}
            </h3>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="p-1.5 hover:bg-muted rounded-lg transition-colors border border-border">
              <ChevronLeft size={14} />
            </button>
            <button onClick={nextMonth} className="p-1.5 hover:bg-muted rounded-lg transition-colors border border-border">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1 text-center font-bold text-muted-foreground text-[10px] uppercase tracking-wider mb-2">
          <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for preceding month */}
          {Array.from({ length: startDayOfWeek }).map((_, idx) => (
            <div key={`empty-${idx}`} className="h-10 border border-transparent" />
          ))}

          {/* Actual day cells */}
          {Array.from({ length: totalDays }).map((_, idx) => {
            const day = idx + 1;
            const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
            const isSelected = selectedDate && day === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear();

            // Find events for this day to show dot indicator
            const dayEvents = events.filter(e => {
              const d = new Date(e.datetime);
              return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
            });
            const hasLive = dayEvents.some(e => e.type === 'LIVE_CLASS');

            return (
              <button
                key={`day-${day}`}
                onClick={() => handleSelectDay(day)}
                className={`h-11 border border-border/50 rounded-xl relative flex flex-col items-center justify-between p-1 transition-all ${
                  isSelected 
                    ? 'bg-primary text-primary-foreground border-primary font-bold shadow-md shadow-primary/10' 
                    : isToday 
                      ? 'bg-primary/10 border-primary/30 text-primary font-bold' 
                      : 'hover:bg-muted/40 text-foreground'
                }`}
              >
                <span className="text-[10px] leading-none self-start ml-0.5">{day}</span>
                <div className="flex gap-1 justify-center pb-0.5">
                  {hasLive && <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Calendar Legend */}
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-semibold pt-2 border-t border-border/40">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <span>Scheduled Doubt Clearing Session</span>
          </div>
        </div>
      </div>

      {/* 🗓️ Right Column - Selected Day details (33% width) */}
      <div className="cyber-glass-card p-5 rounded-2xl shadow-sm space-y-4">
        <h3 className="text-xs font-bold border-b border-cyan-500/20 pb-3 text-white">
          {selectedDate ? `Tasks for ${selectedDate.toLocaleDateString()}` : 'Select a Date to View Tasks'}
        </h3>

        <div className="space-y-3">
          {selectedDayEvents.map(event => (
            <div
              key={`${event.type}-${event.id}`}
              className="p-3 border rounded-xl space-y-1.5 transition-all bg-blue-500/5 border-blue-500/20"
            >
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-500">
                  Doubt Session
                </span>
                <div className="flex items-center gap-1 text-[9px] text-muted-foreground font-semibold">
                  <Clock size={10} />
                  <span>{new Date(event.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
              <h4 className="font-bold text-xs leading-snug">{event.title}</h4>
              <p className="text-[10px] text-muted-foreground font-medium">{event.course_title}</p>
              
              {event.type === 'LIVE_CLASS' && event.url && (
                <a
                  href={event.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-primary hover:underline font-bold block pt-1"
                >
                  Join Room &rarr;
                </a>
              )}
            </div>
          ))}

          {selectedDate && selectedDayEvents.length === 0 && (
            <p className="text-[10px] text-muted-foreground italic text-center py-8">No tasks or classes scheduled for this date.</p>
          )}

          {!selectedDate && (
            <p className="text-[10px] text-muted-foreground italic text-center py-8">Please pick a day from the grid calendar to inspect scheduled items.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarView;

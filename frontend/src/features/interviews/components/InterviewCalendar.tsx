import { useState, type DragEvent } from 'react';
import { Icon } from '../../../shared/components/Icon';
import type { InterviewCalendarDay, InterviewCalendarEntry, InterviewCalendarView } from '../types/interview';

interface InterviewCalendarProps {
  view: InterviewCalendarView;
  days: InterviewCalendarDay[];
  entriesByDay: Map<string, InterviewCalendarEntry[]>;
  conflictCount: number;
  onViewChange: (view: InterviewCalendarView) => void;
  onDateChange: (value: string) => void;
  onMove: (direction: -1 | 1) => void;
  onToday: () => void;
  onSelectInterview: (interviewId: string) => void;
  onDropInterview: (interviewId: string, date: string, time: string) => void;
  onSchedule?: () => void;
}

const hours = Array.from({ length: 14 }, (_, index) => index + 7);

const formatHour = (hour: number): string => {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:00 ${suffix}`;
};

const formatTitle = (days: InterviewCalendarDay[], view: InterviewCalendarView): string => {
  if (days.length === 0) return 'Calendar';
  if (view === 'day') return days[0].date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const start = days[0].date;
  const end = days[days.length - 1].date;
  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ${start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`;
  }
  return `${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
};

const entryClass = (entry: InterviewCalendarEntry): string => {
  if (entry.conflicts.length > 0) return 'border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-100';
  if (entry.interview.status === 'evaluation' || entry.interview.status === 'in-progress') return 'border-violet-200 bg-violet-50 text-violet-900 hover:bg-violet-100';
  if (entry.interview.status === 'completed') return 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100';
  return 'border-cyan-200 bg-cyan-50 text-cyan-900 hover:bg-cyan-100';
};

const EntryCard = ({ entry, compact, onSelect, onDragStart, onDragEnd }: { entry: InterviewCalendarEntry; compact?: boolean; onSelect: (id: string) => void; onDragStart: (event: DragEvent<HTMLButtonElement>, id: string) => void; onDragEnd: () => void }) => {
  const draggable = entry.interview.status === 'scheduled';
  return <button type="button" draggable={draggable} onDragStart={(event) => onDragStart(event, entry.interview.id)} onDragEnd={onDragEnd} onClick={() => onSelect(entry.interview.id)} className={`w-full border text-left transition focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-1 ${entryClass(entry)} ${compact ? 'rounded-lg px-2 py-2' : 'rounded-xl px-2.5 py-2.5'}`} aria-label={`Open interview ${entry.interview.reference} for ${entry.interview.candidateName}${draggable ? '. Drag to another calendar slot to reschedule.' : ''}`} title={draggable ? 'Drag to another date and time to reschedule, or click to open details' : 'Open interview details'}>
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0"><p className="truncate text-[11px] font-black">{entry.interview.candidateName}</p><p className="mt-0.5 truncate text-[9px] font-semibold opacity-70">{entry.interview.time} · {entry.interview.type}</p></div>
      {entry.conflicts.length > 0 && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/75 px-1.5 py-1 text-[8px] font-black text-rose-700" title={entry.conflicts.join('; ')}><Icon name="alert" size={10}/>{entry.conflicts.length}</span>}
    </div>
    {!compact && <p className="mt-2 truncate text-[9px] font-medium opacity-70">{entry.interview.location}</p>}
    {entry.conflicts.length > 0 && <p className="mt-1 truncate text-[8px] font-bold text-rose-700">Conflict detected</p>}
  </button>;
};

export const InterviewCalendar = ({ view, days, entriesByDay, conflictCount, onViewChange, onDateChange, onMove, onToday, onSelectInterview, onDropInterview, onSchedule }: InterviewCalendarProps) => {
  const [draggingInterviewId, setDraggingInterviewId] = useState<string | null>(null);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const firstDay = days[0];
  const visibleEntryCount = days.reduce((total, day) => total + (entriesByDay.get(day.isoDate)?.length ?? 0), 0);

  const handleDragStart = (event: DragEvent<HTMLButtonElement>, interviewId: string) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/interview-id', interviewId);
    setDraggingInterviewId(interviewId);
  };

  const clearDrag = () => {
    setDraggingInterviewId(null);
    setDragOverCell(null);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>, isoDate: string, hour: number) => {
    event.preventDefault();
    const interviewId = event.dataTransfer.getData('text/interview-id') || draggingInterviewId;
    if (interviewId) onDropInterview(interviewId, isoDate, `${String(hour).padStart(2, '0')}:00`);
    clearDrag();
  };

  return (
    <section className="flex min-h-full flex-col bg-slate-50" aria-label="Interview calendar">
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-black tracking-tight text-slate-950">{formatTitle(days, view)}</h2>{conflictCount > 0 && <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-700" title="Number of appointments with an active schedule conflict"><Icon name="alert" size={11}/> {conflictCount} conflict{conflictCount === 1 ? '' : 's'}</span>}</div><p className="mt-1 text-xs text-slate-500">{visibleEntryCount} interview{visibleEntryCount === 1 ? '' : 's'} in view. Drag scheduled cards to another hour to reschedule; use the details action for keyboard or touch.</p></div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1" role="group" aria-label="Calendar view"><button type="button" aria-pressed={view === 'day'} title="Show one day for focused scheduling" onClick={() => onViewChange('day')} className={`rounded-lg px-3 py-2 text-[11px] font-bold ${view === 'day' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Day</button><button type="button" aria-pressed={view === 'week'} title="Show seven days for capacity and workload planning" onClick={() => onViewChange('week')} className={`rounded-lg px-3 py-2 text-[11px] font-bold ${view === 'week' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Week</button></div>
            <button type="button" onClick={onToday} title="Jump the calendar back to today" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50">Today</button>
            <div className="inline-flex rounded-xl border border-slate-200 bg-white"><button type="button" onClick={() => onMove(-1)} aria-label={view === 'week' ? 'Previous week' : 'Previous day'} title={view === 'week' ? 'Show the previous week' : 'Show the previous day'} className="grid size-9 place-items-center text-slate-500 hover:bg-slate-50"><Icon name="chevron-left" size={16}/></button><button type="button" onClick={() => onMove(1)} aria-label={view === 'week' ? 'Next week' : 'Next day'} title={view === 'week' ? 'Show the next week' : 'Show the next day'} className="grid size-9 place-items-center border-l border-slate-200 text-slate-500 hover:bg-slate-50"><Icon name="chevron-right" size={16}/></button></div>
            {onSchedule && <button type="button" onClick={onSchedule} title="Open single-interview scheduling" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2.5 text-[11px] font-bold text-white shadow-sm hover:bg-slate-800"><Icon name="plus" size={14}/> Schedule</button>
          </div>
        </div>
        <label className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2" title="Jump directly to a calendar date"><span className="text-[10px] font-bold text-slate-400">Jump to</span><input aria-label="Jump to calendar date" title="Select the date to display" type="date" value={firstDay?.isoDate ?? ''} onChange={(event) => event.target.value && onDateChange(event.target.value)} className="bg-transparent text-xs font-bold text-slate-700 outline-none"/></label>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-4">
        <div className="hidden min-w-[920px] md:block">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="grid" style={{ gridTemplateColumns: `76px repeat(${days.length}, minmax(0, 1fr))` }}>
              <div className="border-b border-r border-slate-200 bg-slate-50 p-3 text-[9px] font-bold uppercase tracking-wider text-slate-400" title="Appointment start times">Time</div>
              {days.map((day) => <div key={day.isoDate} className={`border-b border-slate-200 bg-slate-50 p-3 ${day.isToday ? 'bg-cyan-50/60' : ''}`} title={`Appointments for ${day.label}`}><p className="text-[10px] font-black text-slate-400">{day.shortLabel.toUpperCase()}</p><p className={`mt-1 text-sm font-black ${day.isToday ? 'text-cyan-700' : 'text-slate-800'}`}>{day.date.getDate()}</p></div>)}
            </div>

            {hours.map((hour) => (
              <div key={hour} className="grid min-h-[78px]" style={{ gridTemplateColumns: `76px repeat(${days.length}, minmax(0, 1fr))` }}>
                <div className="border-b border-r border-slate-100 bg-white px-3 py-2 text-[9px] font-semibold text-slate-400" title={`Appointments starting around ${formatHour(hour)}`}>{formatHour(hour)}</div>
                {days.map((day) => {
                  const entries = (entriesByDay.get(day.isoDate) ?? []).filter((entry) => Math.floor(entry.startMinutes / 60) === hour);
                  const cellKey = `${day.isoDate}-${hour}`;
                  return <div key={cellKey} onDragOver={(event) => { if (!draggingInterviewId) return; event.preventDefault(); setDragOverCell(cellKey); event.dataTransfer.dropEffect = 'move'; }} onDrop={(event) => handleDrop(event, day.isoDate, hour)} className={`border-b border-r border-slate-100 p-1.5 last:border-r-0 ${dragOverCell === cellKey ? 'bg-cyan-100/70 ring-2 ring-inset ring-cyan-300' : day.isToday ? 'bg-cyan-50/20' : 'bg-white'}`} title={draggingInterviewId ? `Move interview to ${day.label} at ${formatHour(hour)}` : `Drop a scheduled interview here to move it to ${day.label} at ${formatHour(hour)}`}>
                    <div className="space-y-1.5">{entries.map((entry) => <EntryCard key={entry.interview.id} entry={entry} compact={entries.length > 1} onSelect={onSelectInterview} onDragStart={handleDragStart} onDragEnd={clearDrag}/>)}</div>
                  </div>;
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="md:hidden">
          {visibleEntryCount === 0 ? <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm"><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-50 text-slate-300" title="Calendar"><Icon name="calendar" size={22}/></div><h3 className="mt-3 text-sm font-black text-slate-800">No interviews in this range</h3><p className="mt-1 text-xs leading-5 text-slate-500">Move to another day or schedule a new interview.</p></div> : <div className="space-y-3">{days.map((day) => { const dayEntries = entriesByDay.get(day.isoDate) ?? []; if (dayEntries.length === 0) return null; return <section key={day.isoDate} aria-labelledby={`mobile-calendar-${day.isoDate}`}><div className={`sticky top-0 z-10 rounded-xl border border-slate-200 px-3 py-2 backdrop-blur ${day.isToday ? 'bg-cyan-50/95' : 'bg-white/95'}`}><p id={`mobile-calendar-${day.isoDate}`} className={`text-xs font-black ${day.isToday ? 'text-cyan-800' : 'text-slate-800'}`} title="Calendar day">{day.label}</p></div><div className="mt-2 space-y-2">{dayEntries.map((entry) => <EntryCard key={entry.interview.id} entry={entry} onSelect={onSelectInterview} onDragStart={handleDragStart} onDragEnd={clearDrag}/>)}</div></section>; })}</div>}
        </div>
      </div>
    </section>
  );
};

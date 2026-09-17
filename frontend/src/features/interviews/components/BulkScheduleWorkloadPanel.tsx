import { Icon } from '../../../shared/components/Icon';
import type { BulkInterviewInterviewerLoad } from '../types/interview';

interface BulkScheduleWorkloadPanelProps {
  loads: BulkInterviewInterviewerLoad[];
}

export const BulkScheduleWorkloadPanel = ({ loads }: BulkScheduleWorkloadPanelProps) => {
  if (loads.length === 0) return null;
  const maxLoad = Math.max(...loads.map((load) => load.totalCount), 1);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Interviewer workload">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><Icon name="users" size={15} className="text-cyan-700"/><h3 className="text-sm font-black text-slate-900">Interviewer workload</h3></div>
          <p className="mt-1 text-[10px] leading-4 text-slate-500">The planner includes existing active interviews and this batch when balancing the pool.</p>
        </div>
        <span className="rounded-full bg-cyan-50 px-2 py-1 text-[9px] font-black text-cyan-700">Balanced allocation</span>
      </div>
      <div className="mt-4 space-y-3">
        {loads.map((load) => (
          <div key={load.interviewerId}>
            <div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-[11px] font-black text-slate-800">{load.interviewerName}</p><p className="mt-0.5 text-[9px] text-slate-400">{load.existingCount} existing · {load.plannedCount} planned</p></div><span className="shrink-0 text-[10px] font-black text-slate-600">{load.totalCount} total · {load.utilizationPercent}%</span></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true"><div className="h-full rounded-full bg-slate-900 transition-[width] duration-200" style={{ width: `${Math.min(100, Math.max(4, Math.round((load.totalCount / maxLoad) * 100)))}%` }}/></div>
          </div>
        ))}
      </div>
    </section>
  );
};

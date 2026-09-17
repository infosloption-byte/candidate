import { Icon } from '../../../shared/components/Icon';
import type { SelectionHistoryView } from '../hooks/useSelectionWorkspace';

interface SelectionHistoryPanelProps {
  entries: SelectionHistoryView[];
}

const actionClass: Record<SelectionHistoryView['action'], string> = {
  decision_changed: 'bg-cyan-50 text-cyan-700',
  reassigned: 'bg-violet-50 text-violet-700',
  approval_changed: 'bg-amber-50 text-amber-700',
};

const actionIcon: Record<SelectionHistoryView['action'], 'target' | 'arrow-right' | 'check'> = {
  decision_changed: 'target',
  reassigned: 'arrow-right',
  approval_changed: 'check',
};

export const SelectionHistoryPanel = ({ entries }: SelectionHistoryPanelProps) => (
  <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="selection-history-title">
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-xl bg-slate-900 text-white"><Icon name="chart" size={14}/></span><div><h2 id="selection-history-title" className="text-sm font-black text-slate-900">Selection history</h2><p className="text-[10px] font-semibold text-slate-400">Decision and approval changes for this job</p></div></div>
      </div>
      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black text-slate-500">{entries.length} events</span>
    </div>

    {entries.length === 0 ? (
      <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center"><p className="text-xs font-black text-slate-700">No history yet</p><p className="mt-1 text-[10px] leading-5 text-slate-500">Bulk decisions, reassignment, and approval changes will appear here.</p></div>
    ) : (
      <div className="mt-4 max-h-[30rem] overflow-y-auto pr-1">
        <div className="space-y-3">
          {entries.map((entry) => (
            <article key={entry.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
              <div className="flex items-start gap-3">
                <span className={`grid size-8 shrink-0 place-items-center rounded-xl ${actionClass[entry.action]}`}><Icon name={actionIcon[entry.action]} size={13}/></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5"><p className="text-xs font-black text-slate-900">{entry.candidateName}</p><span className={`rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-wider ${actionClass[entry.action]}`}>{entry.actionLabel}</span></div>
                  <p className="mt-1 text-[10px] font-bold text-slate-600">{entry.summary}</p>
                  <p className="mt-1 text-[10px] leading-5 text-slate-500"><span className="font-bold text-slate-600">Reason:</span> {entry.reason}</p>
                  <p className="text-[10px] leading-5 text-slate-500"><span className="font-bold text-slate-600">Note:</span> {entry.note}</p>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[9px] font-bold text-slate-400"><span>{entry.occurredAt}</span><span>{entry.occurredBy}</span>{entry.relatedJobTitle && <span>Target: {entry.relatedJobTitle}</span>}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    )}
  </section>
);

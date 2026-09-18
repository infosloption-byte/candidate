import { Icon } from '../../../shared/components/Icon';
import { SelectionCandidateCard } from './SelectionCandidateCard';
import { SelectionEvidencePanel } from './SelectionEvidencePanel';
import { SelectionDecisionPanel } from './SelectionDecisionPanel';
import { SelectionApprovalPanel } from './SelectionApprovalPanel';
import { SelectionBulkToolbar } from './SelectionBulkToolbar';
import { SelectionHistoryPanel } from './SelectionHistoryPanel';
import type { SelectionCandidateRow, SelectionHistoryView } from '../hooks/useSelectionWorkspace';
import type { SelectionSuitabilityBreakdown } from '../hooks/useSelectionSuitability';
import type { ApprovalStatus, SelectionJob, SelectionDecision, SelectionScoringWeights, SelectionTab } from '../types/selection';

interface SelectionBoardProps {
  canDecide?: boolean;
  canApprove?: boolean;
  job: SelectionJob;
  jobs: SelectionJob[];
  tabRows: SelectionCandidateRow[];
  selectedRow: SelectionCandidateRow | null;
  suitability: SelectionSuitabilityBreakdown | null;
  history: SelectionHistoryView[];
  activeTab: SelectionTab;
  selectedCount: number;
  reserveCount: number;
  recommendedCount: number;
  remaining: number;
  approvalStatus: ApprovalStatus;
  approvalReady: boolean;
  approvalNote: string;
  bulkSelectedIds: string[];
  bulkAllVisibleSelected: boolean;
  bulkReason: string;
  bulkNote: string;
  bulkTargetJobId: string;
  bulkError: string | null;
  onChangeJob: (jobId: string) => void;
  onTabChange: (tab: SelectionTab) => void;
  onSelectCandidate: (candidateId: string) => void;
  onToggleBulkCandidate: (candidateId: string) => void;
  onToggleAllBulk: () => void;
  onClearBulk: () => void;
  onBulkReasonChange: (value: string) => void;
  onBulkNoteChange: (value: string) => void;
  onBulkTargetJobChange: (value: string) => void;
  onBulkSelect: () => void;
  onBulkReserve: () => void;
  onBulkReject: () => void;
  onBulkReassign: () => void;
  onDecision: (decision: SelectionDecision, reason: string, note: string) => void;
  onApproval: (status: ApprovalStatus, note: string) => void;
  onWeightChange: (key: keyof SelectionScoringWeights, value: number) => void;
}

const tabs: Array<{ value: SelectionTab; label: string }> = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'selected', label: 'Selected' },
  { value: 'reserve', label: 'Reserve' },
  { value: 'rejected', label: 'Rejected' },
];

export const SelectionBoard = ({ canDecide = true, canApprove = true, job, jobs, tabRows, selectedRow, suitability, history, activeTab, selectedCount, reserveCount, recommendedCount, remaining, approvalStatus, approvalReady, approvalNote, bulkSelectedIds, bulkAllVisibleSelected, bulkReason, bulkNote, bulkTargetJobId, bulkError, onChangeJob, onTabChange, onSelectCandidate, onToggleBulkCandidate, onToggleAllBulk, onClearBulk, onBulkReasonChange, onBulkNoteChange, onBulkTargetJobChange, onBulkSelect, onBulkReserve, onBulkReject, onBulkReassign, onDecision, onApproval, onWeightChange }: SelectionBoardProps) => (
  <div className="flex min-h-full flex-col bg-slate-50">
    <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6"><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-2 py-1 text-[10px] font-black text-cyan-700"><Icon name="target" size={11}/> Selection board</span><span className="text-[10px] font-bold text-slate-400">{job.client}</span></div><h1 className="mt-2 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">{job.title}</h1><p className="mt-1 text-xs text-slate-500">{job.location} · Minimum {job.requiredExperience} years · {job.requiredSkills.length ? `Required skills: ${job.requiredSkills.join(', ')}` : 'No additional skill requirements'}</p></div><label className="flex w-full max-w-sm items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5"><span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Job</span><select value={job.id} onChange={(event) => onChangeJob(event.target.value)} aria-label="Select job requirement" className="min-w-0 flex-1 bg-transparent text-xs font-bold text-slate-800 outline-none">{jobs.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><div className="rounded-2xl bg-slate-50 p-3"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Openings</p><p className="mt-1 text-lg font-black text-slate-900">{job.openings}</p></div><div className="rounded-2xl bg-emerald-50 p-3"><p className="text-[9px] font-bold uppercase tracking-wider text-emerald-600">Selected</p><p className="mt-1 text-lg font-black text-emerald-800">{selectedCount}</p></div><div className="rounded-2xl bg-amber-50 p-3"><p className="text-[9px] font-bold uppercase tracking-wider text-amber-600">Reserve</p><p className="mt-1 text-lg font-black text-amber-800">{reserveCount}</p></div><div className="rounded-2xl bg-cyan-50 p-3"><p className="text-[9px] font-bold uppercase tracking-wider text-cyan-600">Remaining</p><p className="mt-1 text-lg font-black text-cyan-800">{remaining}</p></div></div></header>
    <div className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6"><div className="flex gap-1.5 overflow-x-auto" role="tablist" aria-label="Selection status"><span className="mr-1 inline-flex items-center whitespace-nowrap rounded-xl bg-slate-50 px-3 py-2 text-[10px] font-black text-slate-400">{recommendedCount} candidates to review</span>{tabs.map((tab) => <button key={tab.value} type="button" role="tab" aria-selected={activeTab === tab.value} onClick={() => onTabChange(tab.value)} className={`whitespace-nowrap rounded-xl px-3 py-2 text-[10px] font-black ${activeTab === tab.value ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>{tab.label}</button>)}</div></div>
    {canDecide && <SelectionBulkToolbar selectedCount={bulkSelectedIds.length} visibleCount={tabRows.length} allVisibleSelected={bulkAllVisibleSelected} reason={bulkReason} note={bulkNote} targetJobId={bulkTargetJobId} jobs={jobs} currentJobId={job.id} error={bulkError} onToggleAll={onToggleAllBulk} onClear={onClearBulk} onReasonChange={onBulkReasonChange} onNoteChange={onBulkNoteChange} onTargetJobChange={onBulkTargetJobChange} onSelect={onBulkSelect} onReserve={onBulkReserve} onReject={onBulkReject} onReassign={onBulkReassign}/>} 
    <div className="grid min-h-0 flex-1 xl:grid-cols-[420px_minmax(0,1fr)]"><section className="min-h-0 border-r border-slate-200 bg-slate-100/70" aria-label="Candidates for selection"><div className="max-h-[44dvh] overflow-y-auto p-3 sm:p-4 xl:h-full xl:max-h-none"><div className="space-y-2">{tabRows.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center"><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-50 text-slate-300"><Icon name="users" size={22}/></div><h2 className="mt-3 text-sm font-black text-slate-800">Nothing here yet</h2><p className="mt-1 text-xs leading-5 text-slate-500">This status has no candidates for the current requirement.</p></div> : tabRows.map((row) => <SelectionCandidateCard key={row.candidate.id} row={row} selected={selectedRow?.candidate.id === row.candidate.id} bulkSelected={bulkSelectedIds.includes(row.candidate.id)} onSelect={onSelectCandidate} onToggleBulk={onToggleBulkCandidate}/>)}</div></div></section><section className="min-w-0 overflow-y-auto p-3 sm:p-4 xl:p-5"><div className="mx-auto max-w-3xl space-y-4"><SelectionEvidencePanel row={selectedRow} suitability={suitability} onWeightChange={onWeightChange}/>{canDecide ? <SelectionDecisionPanel row={selectedRow} job={job} selectedCount={selectedCount} onSubmit={onDecision}/> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-xs leading-5 text-slate-500">Decision actions are restricted for your role. Candidate evidence and selection history remain visible.</div>}{canApprove && selectedCount > 0 && <SelectionApprovalPanel job={job} selectedCount={selectedCount} reserveCount={reserveCount} approvalStatus={approvalStatus} approvalNote={approvalNote} approvalReady={approvalReady} onSetApproval={onApproval}/>}<SelectionHistoryPanel entries={history}/></div></section></div>
  </div>
);

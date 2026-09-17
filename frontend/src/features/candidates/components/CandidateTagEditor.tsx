import { useCandidateTags } from '../hooks/useCandidateTags';
import { Icon } from '../../../shared/components/Icon';

interface CandidateTagEditorProps {
  candidateId: string;
  tags: string[];
  onAdd: (candidateId: string, tag: string) => void;
  onRemove: (candidateId: string, tag: string) => void;
}

const suggestions = ['High potential', 'Re-contact', 'Urgent documents', 'Client-ready', 'Multi-skilled'];

export const CandidateTagEditor = ({ candidateId, tags, onAdd, onRemove }: CandidateTagEditorProps) => {
  const form = useCandidateTags({ onAdd: (tag) => onAdd(candidateId, tag) });

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold text-slate-800">Recruiter tags</p><p className="mt-0.5 text-[10px] text-slate-400">Use lightweight labels to find and follow up with candidates.</p></div><Icon name="sparkles" size={15} className="text-cyan-600"/></div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {tags.map((tag) => <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2.5 py-1.5 text-[10px] font-bold text-cyan-800">{tag}<button type="button" onClick={() => onRemove(candidateId, tag)} aria-label={`Remove tag ${tag}`} className="grid size-4 place-items-center rounded-full text-cyan-600 hover:bg-cyan-100"><span aria-hidden="true">×</span></button></span>)}
        {tags.length === 0 && <span className="text-[10px] text-slate-400">No tags yet.</span>}
      </div>
      <div className="mt-2 flex gap-2"><input value={form.value} onChange={(event) => form.setValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); form.add(); } }} className="field-input !mt-0" placeholder="Add a recruiter tag" aria-label="New recruiter tag"/><button type="button" onClick={form.add} className="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-900 text-white hover:bg-slate-800" aria-label="Add tag"><Icon name="plus" size={17}/></button></div>
      <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Suggested tags">{suggestions.filter((suggestion) => !tags.some((tag) => tag.toLowerCase() === suggestion.toLowerCase())).map((suggestion) => <button key={suggestion} type="button" onClick={() => onAdd(candidateId, suggestion)} className="rounded-full border border-dashed border-slate-300 px-2.5 py-1.5 text-[10px] font-semibold text-slate-500 hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700">+ {suggestion}</button>)}</div>
    </div>
  );
};

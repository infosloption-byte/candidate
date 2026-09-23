import type { InterviewCriterionAssignment } from '../../domain/types';

interface Props {
  assignment: InterviewCriterionAssignment;
  scoreValue: string;
  textValue: string;
  selectedOptions: string[];
  customTagValue: string;
  disabled: boolean;
  onScoreChange: (value: string) => void;
  onTextChange: (value: string) => void;
  onSelectedOptionsChange: (value: string[]) => void;
  onCustomTagValueChange: (value: string) => void;
}

export const CriterionResponseField = ({
  assignment,
  scoreValue,
  textValue,
  selectedOptions,
  customTagValue,
  disabled,
  onScoreChange,
  onTextChange,
  onSelectedOptionsChange,
  onCustomTagValueChange,
}: Props) => {
  const toggleOption = (option: string) => {
    onSelectedOptionsChange(
      selectedOptions.includes(option)
        ? selectedOptions.filter((value) => value !== option)
        : [...selectedOptions, option],
    );
  };

  const addCustomTag = () => {
    const value = customTagValue.trim();
    if (!value || selectedOptions.some((option) => option.toLowerCase() === value.toLowerCase())) return;
    onSelectedOptionsChange([...selectedOptions, value]);
    onCustomTagValueChange('');
  };

  return (
    <div className="min-w-0">
      {assignment.responseType === 'SCORE' && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400">/ {assignment.maxPoints}</span>
          <input
            type="number"
            min="0"
            max={assignment.maxPoints}
            disabled={disabled}
            className="field-input !mt-0 w-20 px-2 text-sm font-bold"
            value={scoreValue}
            onChange={(event) => onScoreChange(event.target.value)}
          />
        </div>
      )}

      {assignment.responseType === 'TEXT' && (
        <textarea
          className="field-input min-h-20 resize-y"
          disabled={disabled}
          value={textValue}
          onChange={(event) => onTextChange(event.target.value)}
          placeholder="Enter answer..."
        />
      )}

      {assignment.responseType === 'SINGLE_SELECT' && (
        <select className="field-input !mt-0 sm:w-64" disabled={disabled} value={textValue} onChange={(event) => onTextChange(event.target.value)}>
          <option value="">Select an option</option>
          {(assignment.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      )}

      {assignment.responseType === 'BOOLEAN' && (
        <select className="field-input !mt-0 sm:w-40" disabled={disabled} value={textValue} onChange={(event) => onTextChange(event.target.value)}>
          <option value="">Select</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      )}

      {assignment.responseType === 'MULTI_SELECT' && (
        <div className="space-y-2">
          {selectedOptions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleOption(option)}
                  className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[10px] font-extrabold text-cyan-800 transition hover:bg-cyan-100 disabled:opacity-60"
                  title="Remove tag"
                >
                  {option} ×
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {(assignment.options ?? []).map((option) => {
              const selected = selectedOptions.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleOption(option)}
                  className={selected
                    ? "rounded-full border border-cyan-300 bg-cyan-100 px-2.5 py-1 text-[10px] font-extrabold text-cyan-800"
                    : "rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50"}
                >
                  {selected ? '✓ ' : '+ '}{option}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <input
              className="field-input !mt-0 min-w-0 flex-1"
              disabled={disabled}
              value={customTagValue}
              onChange={(event) => onCustomTagValueChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addCustomTag();
                }
              }}
              placeholder="Add custom skill..."
            />
            <button
              type="button"
              disabled={disabled || !customTagValue.trim()}
              onClick={addCustomTag}
              className="rounded-xl border border-slate-200 bg-white px-3 text-xs font-extrabold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

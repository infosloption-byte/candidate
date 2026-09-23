import type { KeyboardEvent } from 'react';
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
  const addCustomTags = (rawValue: string) => {
    const values = rawValue
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (!values.length) return;

    const next = [...selectedOptions];
    for (const value of values) {
      if (!next.some((option) => option.toLowerCase() === value.toLowerCase())) {
        next.push(value);
      }
    }

    onSelectedOptionsChange(next);
    onCustomTagValueChange('');
  };

  const toggleOption = (option: string) => {
    onSelectedOptionsChange(
      selectedOptions.includes(option)
        ? selectedOptions.filter((value) => value !== option)
        : [...selectedOptions, option],
    );
  };

  const handleTagKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addCustomTags(customTagValue);
    }
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
            className="field-input !mt-0 w-24 px-2 text-sm font-bold"
            value={scoreValue}
            onChange={(event) => onScoreChange(event.target.value)}
            aria-label={assignment.name + ' points'}
          />
        </div>
      )}

      {assignment.responseType === 'TEXT' && (
        <textarea
          className="field-input min-h-24 resize-y"
          disabled={disabled}
          value={textValue}
          onChange={(event) => onTextChange(event.target.value)}
          placeholder="Enter the interviewer's answer or notes..."
          aria-label={assignment.name + ' text answer'}
        />
      )}

      {assignment.responseType === 'MULTI_SELECT' && (
        <div className="space-y-3">
          {selectedOptions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleOption(option)}
                  className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1.5 text-[10px] font-extrabold text-cyan-800 transition hover:bg-cyan-100 disabled:opacity-60"
                  title="Remove tag"
                >
                  {option} ×
                </button>
              ))}
            </div>
          )}

          {(assignment.options ?? []).length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-bold text-slate-400">Suggested tags</p>
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
                        ? 'rounded-full border border-cyan-300 bg-cyan-100 px-2.5 py-1.5 text-[10px] font-extrabold text-cyan-800'
                        : 'rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50'}
                    >
                      {selected ? '✓ ' : '+ '}{option}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <p className="mb-1.5 text-[10px] font-bold text-slate-400">Add professions / skills</p>
            <div className="flex gap-2">
              <input
                className="field-input !mt-0 min-w-0 flex-1"
                disabled={disabled}
                value={customTagValue}
                onChange={(event) => onCustomTagValueChange(event.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Type a profession or skill, then press Enter"
                aria-label={assignment.name + ' tags'}
              />
              <button
                type="button"
                disabled={disabled || !customTagValue.trim()}
                onClick={() => addCustomTags(customTagValue)}
                className="rounded-xl border border-slate-200 bg-white px-3 text-xs font-extrabold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
              >
                Add
              </button>
            </div>
            <p className="mt-1.5 text-[9px] text-slate-400">You can enter several values separated by commas, for example: Plumber, Tile Worker.</p>
          </div>
        </div>
      )}
    </div>
  );
};

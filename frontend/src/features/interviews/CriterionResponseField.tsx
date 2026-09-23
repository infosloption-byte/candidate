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
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Answer</p>

        {assignment.responseType === 'MULTI_SELECT' ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-2.5">
            {!!assignment.options?.length && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {assignment.options.map((option) => {
                  const selected = selectedOptions.includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleOption(option)}
                      className={`rounded-full border px-2.5 py-1.5 text-[10px] font-bold transition ${selected ? 'border-cyan-500 bg-cyan-500 text-white' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-cyan-200 hover:bg-cyan-50'}`}
                    >
                      {selected ? '✓ ' : ''}{option}
                    </button>
                  );
                })}
              </div>
            )}
            <input
              type="text"
              disabled={disabled}
              className="field-input !mt-0"
              value={customTagValue}
              onChange={(event) => onCustomTagValueChange(event.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={() => addCustomTags(customTagValue)}
              placeholder="Type a tag and press Enter"
              aria-label={assignment.name + ' answer'}
            />
            {!!selectedOptions.length && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    disabled={disabled}
                    onClick={() => onSelectedOptionsChange(selectedOptions.filter((value) => value !== option))}
                    className="rounded-full bg-cyan-50 px-2.5 py-1.5 text-[10px] font-bold text-cyan-800"
                  >
                    {option} ×
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <textarea
            className="field-input min-h-24 resize-y"
            disabled={disabled}
            value={textValue}
            onChange={(event) => onTextChange(event.target.value)}
            placeholder="Enter the candidate's answer"
            aria-label={assignment.name + ' answer'}
          />
        )}
      </div>

      <div className="w-full lg:w-28">
        <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Points</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            max={assignment.maxPoints}
            disabled={disabled}
            className="field-input !mt-0 w-full px-2 text-sm font-bold"
            value={scoreValue}
            onChange={(event) => onScoreChange(event.target.value)}
            aria-label={assignment.name + ' points'}
          />
          <span className="shrink-0 text-[10px] font-bold text-slate-400">/ {assignment.maxPoints}</span>
        </div>
      </div>
    </div>
  );
};

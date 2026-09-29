import { Fragment, useEffect, useMemo, useState } from 'react';
import { Card } from '../../shared/components/Card';
import { Icon } from '../../shared/components/Icon';
import { StateMessage } from '../../shared/components/StateMessage';
import { StatusPill } from '../../shared/components/StatusPill';
import { apiFetch } from '../../shared/lib/api';
import type { CandidateComparisonRow, JobComparison } from '../../domain/types';

interface CandidateComparisonCardProps {
  jobId: string;
  /** Live backend only. In development (fixture) mode there are no persisted scorecards to aggregate. */
  developmentMode: boolean;
  /** Changes whenever interviews change, so the table refreshes after scoring. */
  refreshKey: string;
}

type SortKey = 'rank' | 'name' | string; // string = a criterion-group id

const pct = (value: number | null | undefined): string => (value === null || value === undefined ? '—' : value.toFixed(1) + '%');

const scoreTone = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return 'text-slate-300';
  if (value >= 75) return 'text-emerald-700';
  if (value >= 50) return 'text-amber-700';
  return 'text-rose-700';
};

const ScoreBar = ({ value }: { value: number | null }) => (
  <div className="flex min-w-28 items-center gap-2">
    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full bg-cyan-500" style={{ width: (value ?? 0) + '%' }} />
    </div>
    <span className={'text-xs font-black ' + scoreTone(value)}>{pct(value)}</span>
  </div>
);

export const CandidateComparisonCard = ({ jobId, developmentMode, refreshKey }: CandidateComparisonCardProps) => {
  const [data, setData] = useState<JobComparison | null>(null);
  const [loading, setLoading] = useState(!developmentMode);
  const [error, setError] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortDesc, setSortDesc] = useState(false);
  const [scoredOnly, setScoredOnly] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (developmentMode) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    apiFetch<JobComparison>('/jobs/' + jobId + '/comparison')
      .then((result) => { if (!cancelled) setData(result); })
      .catch((requestError: unknown) => { if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to load the candidate comparison.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [developmentMode, jobId, refreshKey]);

  const rows = useMemo(() => {
    if (!data) return [];
    const base = scoredOnly ? data.rows.filter((row) => row.averagePercentage !== null) : data.rows;
    const valueOf = (row: CandidateComparisonRow): number | string | null => {
      if (sortKey === 'name') return row.name.toLowerCase();
      if (sortKey === 'rank') return row.averagePercentage; // rank order == descending score
      return row.groupScores.find((item) => item.groupId === sortKey)?.percentage ?? null;
    };
    const defaultDescending = sortKey !== 'name';
    return [...base].sort((a, b) => {
      const left = valueOf(a);
      const right = valueOf(b);
      // Unscored candidates always sink to the bottom regardless of direction.
      if (left === null && right === null) return a.name.localeCompare(b.name);
      if (left === null) return 1;
      if (right === null) return -1;
      const order = left < right ? -1 : left > right ? 1 : 0;
      return (defaultDescending ? -order : order) * (sortDesc ? -1 : 1);
    });
  }, [data, scoredOnly, sortKey, sortDesc]);

  const changeSort = (key: SortKey) => {
    if (key === sortKey) setSortDesc((value) => !value);
    else { setSortKey(key); setSortDesc(false); }
  };

  const sortIndicator = (key: SortKey) => (sortKey === key
    ? <Icon name={sortDesc ? 'arrow-up' : 'arrow-down'} size={10} />
    : null);

  const headerButton = (key: SortKey, text: string) => (
    <button type="button" className="inline-flex items-center gap-1 font-extrabold uppercase tracking-wider hover:text-slate-700" onClick={() => changeSort(key)}>
      {text}{sortIndicator(key)}
    </button>
  );

  const scoredCount = data?.rows.filter((row) => row.averagePercentage !== null).length ?? 0;

  return (
    <Card className="min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-black text-slate-950">Candidate comparison</h2>
          <p className="mt-1 text-xs text-slate-400">
            Completed interview scores for every candidate in this job, normalised to % of available points so different scorecards stay comparable.
          </p>
        </div>
        <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 text-[11px] font-bold text-slate-500">
          <input type="checkbox" checked={scoredOnly} onChange={(event) => setScoredOnly(event.target.checked)} />
          Scored candidates only ({scoredCount})
        </label>
      </div>

      <div className="mt-4">
        {developmentMode ? (
          <StateMessage kind="empty" title="Comparison needs the live backend" description="Scorecards are aggregated on the server, so this table is not available in fixture mode." />
        ) : loading ? (
          <StateMessage kind="loading" title="Loading comparison" description="Aggregating submitted scorecards." />
        ) : error ? (
          <StateMessage kind="error" title="Comparison unavailable" description={error} />
        ) : !data || !data.rows.length ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center"><p className="text-sm font-bold text-slate-700">No candidates in this job pool yet.</p></div>
        ) : !rows.length ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center"><p className="text-sm font-bold text-slate-700">No candidate has a completed interview yet.</p><p className="mt-1 text-xs text-slate-400">Scores appear here once every panelist has submitted their scorecard.</p></div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] text-slate-400">
                <tr>
                  <th className="px-3 py-3">{headerButton('rank', 'Rank')}</th>
                  <th className="px-3 py-3">{headerButton('name', 'Candidate')}</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">{headerButton('rank', 'Overall')}</th>
                  {data.groups.map((group) => <th key={group.groupId} className="px-3 py-3">{headerButton(group.groupId, group.groupName)}</th>)}
                  <th className="px-3 py-3 font-extrabold uppercase tracking-wider">Interviews</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => {
                  const open = expanded === row.candidateId;
                  const canExpand = row.interviews.length > 0;
                  return (
                    <Fragment key={row.candidateId}>
                      <tr className={canExpand ? 'cursor-pointer hover:bg-slate-50/70' : ''} onClick={() => canExpand && setExpanded(open ? null : row.candidateId)}>
                        <td className="px-3 py-3 font-black text-slate-900">{row.rank ?? '—'}</td>
                        <td className="px-3 py-3">
                          <p className="font-black text-slate-900">{row.name}</p>
                          <p className="text-[10px] text-slate-400">{row.reference} · {row.requestedProfession || 'Profession not set'}</p>
                        </td>
                        <td className="px-3 py-3"><StatusPill value={row.poolStatus} /></td>
                        <td className="px-3 py-3"><ScoreBar value={row.averagePercentage} /></td>
                        {data.groups.map((group) => {
                          const value = row.groupScores.find((item) => item.groupId === group.groupId)?.percentage ?? null;
                          return <td key={group.groupId} className={'px-3 py-3 font-black ' + scoreTone(value)}>{pct(value)}</td>;
                        })}
                        <td className="px-3 py-3 text-[10px] font-semibold text-slate-500">
                          {row.scoredInterviews} scored{row.pendingInterviews > 0 ? ' · ' + row.pendingInterviews + ' pending' : ''}
                          {canExpand && <span className="ml-1 inline-block align-middle text-slate-400"><Icon name={open ? 'chevron-up' : 'chevron-down'} size={12} /></span>}
                        </td>
                      </tr>
                      {open && (
                        <tr className="bg-slate-50/60">
                          <td />
                          <td colSpan={data.groups.length + 4} className="px-3 py-3">
                            <div className="grid gap-2 md:grid-cols-2">
                              {row.interviews.map((interview) => (
                                <div key={interview.interviewId} className="rounded-xl border border-slate-200 bg-white p-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-[11px] font-black text-slate-800">{interview.type.replaceAll('_', ' ')} · {new Date(interview.scheduledAt).toLocaleDateString()}</p>
                                    <span className={'text-xs font-black ' + scoreTone(interview.percentage)}>{pct(interview.percentage)}</span>
                                  </div>
                                  <ul className="mt-2 space-y-1">
                                    {interview.interviewerTotals.map((panelist) => (
                                      <li key={panelist.interviewerId} className="flex items-center justify-between text-[10px] text-slate-500">
                                        <span className="truncate">{panelist.name}</span>
                                        <span className={'font-black ' + scoreTone(panelist.percentage)}>{pct(panelist.percentage)}</span>
                                      </li>
                                    ))}
                                  </ul>
                                  <p className="mt-2 text-[10px] text-slate-400">{interview.submittedInterviewers} / {interview.requiredInterviewers} panelists submitted</p>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
};

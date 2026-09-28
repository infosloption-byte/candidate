import { useEffect, useMemo, useState } from 'react';
import { Card } from '../../shared/components/Card';
import { StateMessage } from '../../shared/components/StateMessage';
import { StatusPill } from '../../shared/components/StatusPill';
import { Button } from '../../shared/components/Button';
import { Icon } from '../../shared/components/Icon';
import { apiFetch } from '../../shared/lib/api';

interface AuditEvent {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  createdAt: string;
  actor?: { id: string; name: string; email: string; role: string } | null;
}

const csvEscape = (value: unknown) => '"' + String(value ?? '').replaceAll('"', '""') + '"';

const downloadCsv = (events: AuditEvent[]) => {
  const rows = [
    ['Time', 'Actor', 'Actor role', 'Action', 'Entity', 'Entity ID', 'Summary'],
    ...events.map((event) => [
      new Date(event.createdAt).toISOString(),
      event.actor?.email ?? 'System / unknown',
      event.actor?.role ?? '',
      event.action,
      event.entityType,
      event.entityId,
      event.summary,
    ]),
  ];
  const blob = new Blob([rows.map((row) => row.map(csvEscape).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'buildhire-platform-activity.csv';
  anchor.click();
  URL.revokeObjectURL(url);
};

export const PlatformActivityPage = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'security'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch<AuditEvent[]>('/audit-events')
      .then((result) => {
        if (!cancelled) setEvents(result);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to load platform activity.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return events.filter((event) => {
      const security = event.action.includes('LOGIN_') || event.action.includes('PASSWORD') || event.action.includes('USER_') || event.action.includes('DEACTIVATED');
      if (tab === 'security' && !security) return false;
      if (!query) return true;
      return [
        event.action,
        event.entityType,
        event.entityId,
        event.summary,
        event.actor?.name,
        event.actor?.email,
        event.actor?.role,
      ].some((value) => value?.toLowerCase().includes(query));
    });
  }, [events, search, tab]);

  const failedLogins = events.filter((event) => event.action === 'LOGIN_FAILED').length;
  const securityEvents = events.filter((event) => event.action.includes('LOGIN_') || event.action.includes('PASSWORD') || event.action.includes('USER_')).length;
  const unusualCount = events.filter((event) => event.action === 'LOGIN_FAILED' || event.action.includes('DEACTIVATED')).length;

  if (loading) return <section className="mx-auto max-w-7xl p-4 sm:p-8"><StateMessage kind="loading" title="Loading platform activity" description="Reading the latest audit and security events." /></section>;
  if (error) return <section className="mx-auto max-w-7xl p-4 sm:p-8"><StateMessage kind="error" title="Activity log unavailable" description={error} /></section>;

  return (
    <section className="mx-auto max-w-7xl space-y-5 p-3 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-600">Platform operations</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Activity & security log</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Review administrative activity, authentication events and unusual actions across the platform.</p>
        </div>
        <Button variant="secondary" onClick={() => downloadCsv(filtered)}><Icon name="download" size={16} /> Export log</Button>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[
          ['Events loaded', events.length, 'chart'],
          ['Security events', securityEvents, 'settings'],
          ['Failed logins', failedLogins, 'alert'],
          ['Unusual events', unusualCount, 'alert'],
        ].map(([label, value, icon]) => (
          <Card key={String(label)}>
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-2 text-2xl font-black text-slate-950">{value}</p></div>
              <div className="grid size-10 place-items-center rounded-2xl bg-slate-100 text-slate-700"><Icon name={icon as 'chart' | 'settings' | 'alert'} size={18} /></div>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid grid-cols-2 rounded-2xl border border-slate-200 bg-slate-100 p-1 sm:w-fit">
            <button type="button" onClick={() => setTab('all')} className={`rounded-xl px-4 py-2 text-xs font-extrabold ${tab === 'all' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}>All activity</button>
            <button type="button" onClick={() => setTab('security')} className={`rounded-xl px-4 py-2 text-xs font-extrabold ${tab === 'security' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}>Security</button>
          </div>
          <input className="field-input w-full lg:max-w-sm" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search actor, action, entity or summary…" />
        </div>

        <div className="mt-4 space-y-2.5">
          {filtered.map((event) => (
            <div key={event.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-black text-slate-900">{event.action.replaceAll('_', ' ')}</p>
                    <StatusPill value={event.actor?.role ?? 'SYSTEM'} />
                    {event.action === 'LOGIN_FAILED' && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-rose-700">Attention</span>}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{event.summary}</p>
                  <p className="mt-1 text-[10px] font-semibold text-slate-400">{event.entityType} · {event.entityId}</p>
                </div>
                <div className="shrink-0 text-left sm:text-right">
                  <p className="text-[10px] font-bold text-slate-500">{event.actor?.name ?? 'System / unknown'}</p>
                  <p className="mt-1 text-[9px] text-slate-400">{new Date(event.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
          {!filtered.length && <p className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs font-semibold text-slate-400">No events match the current filter.</p>}
        </div>
      </Card>
    </section>
  );
};

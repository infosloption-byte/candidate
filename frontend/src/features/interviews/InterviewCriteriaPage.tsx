import { useEffect, useState } from 'react';
import { useAuth } from '../../domain/authContext';
import { useRecruitment } from '../../domain/recruitmentContext';
import { SectionHeading } from '../../shared/components/SectionHeading';
import { StatusPill } from '../../shared/components/StatusPill';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { FormField } from '../../shared/components/FormField';
import { StateMessage } from '../../shared/components/StateMessage';
import { apiFetch } from '../../shared/lib/api';
import type { Agency, InterviewCriterion, UserRole } from '../../domain/types';

interface Props { role: UserRole; }

const emptyForm = { name: '', description: '', maxPoints: '5' };

export const InterviewCriteriaPage = ({ role }: Props) => {
  const { user, developmentMode } = useAuth();
  const { state } = useRecruitment();
  const [agencies, setAgencies] = useState<Agency[]>(developmentMode ? state.agencies : []);
  const [agencyId, setAgencyId] = useState(user?.role === 'ADMIN' ? '' : (user?.agencyId ?? 'agency-1'));
  const [criteria, setCriteria] = useState<InterviewCriterion[]>(developmentMode ? state.interviewCriteria : []);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(!developmentMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (developmentMode) {
      setAgencies(state.agencies);
      setCriteria(state.interviewCriteria.filter((item) => item.agencyId === agencyId));
      setLoading(false);
      return;
    }
    if (!agencyId) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    const requests: [Promise<InterviewCriterion[]>, Promise<Agency[]>] = [
      apiFetch<InterviewCriterion[]>('/agencies/' + agencyId + '/interview-criteria'),
      role === 'ADMIN' ? apiFetch<Agency[]>('/agencies') : Promise.resolve([] as Agency[]),
    ];
    Promise.all(requests)
      .then(([result, agencyResult]) => {
        if (cancelled) return;
        setCriteria(result);
        if (role === 'ADMIN') setAgencies(agencyResult);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to load interview criteria.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [agencyId, developmentMode, role, state.agencies, state.interviewCriteria]);

  const createCriterion = async () => {
    if (!agencyId || form.name.trim().length < 2) {
      setError('Select an agency and enter a criterion name.');
      return;
    }
    const maxPoints = Number(form.maxPoints);
    if (!Number.isInteger(maxPoints) || maxPoints < 1 || maxPoints > 100) {
      setError('Maximum points must be a whole number from 1 to 100.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const created = developmentMode
        ? { id: 'criterion-' + Date.now(), agencyId, name: form.name.trim(), description: form.description.trim() || null, maxPoints, active: true }
        : await apiFetch<InterviewCriterion>('/agencies/' + agencyId + '/interview-criteria', {
            method: 'POST',
            body: JSON.stringify({ name: form.name.trim(), description: form.description.trim() || null, maxPoints }),
          });
      if (developmentMode) {
        setCriteria((current) => [created, ...current]);
        // The fixture state is intentionally simple; local criteria are reflected by the page.
      } else {
        setCriteria((current) => [created, ...current]);
      }
      setForm(emptyForm);
      setShowForm(false);
      setSuccess('Criterion "' + created.name + '" was added.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create the criterion.');
    } finally {
      setSaving(false);
    }
  };

  const toggleCriterion = async (criterion: InterviewCriterion) => {
    setError('');
    try {
      const updated = developmentMode
        ? { ...criterion, active: !criterion.active }
        : await apiFetch<InterviewCriterion>('/interview-criteria/' + criterion.id, {
            method: 'PATCH',
            body: JSON.stringify({ active: !criterion.active }),
          });
      setCriteria((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSuccess('Criterion "' + criterion.name + '" is now ' + (updated.active ? 'active' : 'inactive') + '.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update the criterion.');
    }
  };

  return (
    <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <SectionHeading
        eyebrow="Interview setup"
        title="Interview criteria"
        description="Define the scoring criteria interviewers use when evaluating candidates. Deactivate criteria instead of deleting them so historical evaluations remain understandable."
        action={<Button onClick={() => { setShowForm((value) => !value); setError(''); }}>{showForm ? 'Close' : 'New criterion'}</Button>}
      />

      {role === 'ADMIN' && (
        <Card>
          <FormField label="Agency workspace" hint="Admin can configure criteria on behalf of any agency.">
            <select className="field-input" value={agencyId} onChange={(event) => setAgencyId(event.target.value)}>
              <option value="">Select an agency</option>
              {agencies.filter((item) => item.status === 'ACTIVE').map((agency) => <option key={agency.id} value={agency.id}>{agency.name}</option>)}
            </select>
          </FormField>
        </Card>
      )}

      {error && <StateMessage kind="error" title="Criteria action failed" description={error} />}
      {success && <StateMessage kind="success" title="Saved" description={success} />}
      {loading && <StateMessage kind="loading" title="Loading criteria" description="Fetching the configured scoring criteria." />}

      {showForm && !loading && (
        <Card>
          <h2 className="text-sm font-black text-slate-950">Create scoring criterion</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <FormField label="Criterion name">
              <input className="field-input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Technical skill" />
            </FormField>
            <FormField label="Maximum points">
              <input type="number" min="1" max="100" className="field-input" value={form.maxPoints} onChange={(event) => setForm({ ...form, maxPoints: event.target.value })} />
            </FormField>
            <div className="md:col-span-2">
              <FormField label="Description">
                <textarea className="field-input min-h-20 resize-y" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="What should the interviewer assess?" />
              </FormField>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button disabled={saving || !agencyId} onClick={() => void createCriterion()}>{saving ? 'Saving…' : 'Create criterion'}</Button>
          </div>
        </Card>
      )}

      {!loading && criteria.length === 0 && (
        <StateMessage kind="empty" title="No criteria configured" description="Add at least one active criterion before interviewers can submit scores." />
      )}

      {!loading && criteria.length > 0 && (
        <div className="grid gap-3">
          {criteria.map((criterion) => (
            <Card key={criterion.id}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-black text-slate-950">{criterion.name}</h2>
                    <StatusPill value={criterion.active ? 'ACTIVE' : 'INACTIVE'} />
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{criterion.description ?? 'No description provided.'}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Max</p>
                    <p className="text-sm font-black text-slate-900">{criterion.maxPoints}</p>
                  </div>
                  <Button size="sm" variant={criterion.active ? 'danger' : 'secondary'} onClick={() => void toggleCriterion(criterion)}>
                    {criterion.active ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
};

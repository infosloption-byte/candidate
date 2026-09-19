import { useEffect, useState } from 'react';
import { useAuth } from '../../domain/authContext';
import { agencies as fixtureAgencies } from '../../domain/fixtures';
import { SectionHeading } from '../../shared/components/SectionHeading';
import { StatusPill } from '../../shared/components/StatusPill';
import { Icon } from '../../shared/components/Icon';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { FormField } from '../../shared/components/FormField';
import { DataTable } from '../../shared/components/DataTable';
import { StateMessage } from '../../shared/components/StateMessage';
import { apiFetch } from '../../shared/lib/api';
import type { Agency, User, UserRole } from '../../domain/types';

interface AgencyRecord extends Agency {
  counts?: { users: number; jobs: number; candidates: number };
}

interface UserForm {
  name: string;
  email: string;
  password: string;
  role: 'AGENCY' | 'INTERVIEWER';
}

const emptyUser: UserForm = { name: '', email: '', password: '', role: 'AGENCY' };

export const AgenciesPage = () => {
  const { user, developmentMode } = useAuth();
  const [agencies, setAgencies] = useState<AgencyRecord[]>(developmentMode ? fixtureAgencies : []);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [showAgencyForm, setShowAgencyForm] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [agencyName, setAgencyName] = useState('');
  const [agencySlug, setAgencySlug] = useState('');
  const [userForm, setUserForm] = useState(emptyUser);
  const [loading, setLoading] = useState(!developmentMode);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (developmentMode) {
      setAgencies(fixtureAgencies);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    apiFetch<AgencyRecord[]>('/agencies')
      .then((result) => {
        if (!cancelled) setAgencies(result);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to load agencies.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [developmentMode, user?.id]);

  useEffect(() => {
    if (!selectedAgencyId || developmentMode) {
      setUsers([]);
      return;
    }

    let cancelled = false;
    setLoadingUsers(true);

    apiFetch<User[]>('/agencies/' + selectedAgencyId + '/users')
      .then((result) => {
        if (!cancelled) setUsers(result);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to load agency users.');
      })
      .finally(() => {
        if (!cancelled) setLoadingUsers(false);
      });

    return () => {
      cancelled = true;
    };
  }, [developmentMode, selectedAgencyId]);

  const createAgency = async () => {
    if (!agencyName.trim() || !agencySlug.trim()) {
      setError('Agency name and slug are required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const created = await apiFetch<AgencyRecord>('/agencies', {
        method: 'POST',
        body: JSON.stringify({ name: agencyName.trim(), slug: agencySlug.trim() }),
      });

      setAgencies((current) => [{ ...created, counts: { users: 0, jobs: 0, candidates: 0 } }, ...current]);
      setAgencyName('');
      setAgencySlug('');
      setShowAgencyForm(false);
      setSuccess('Agency "' + created.name + '" was created.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create the agency.');
    } finally {
      setSaving(false);
    }
  };

  const toggleAgency = async (agency: AgencyRecord) => {
    if (developmentMode) return;

    try {
      setError('');
      const updated = await apiFetch<AgencyRecord>('/agencies/' + agency.id, {
        method: 'PATCH',
        body: JSON.stringify({ status: agency.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }),
      });
      setAgencies((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSuccess('Agency "' + agency.name + '" is now ' + updated.status.toLowerCase() + '.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update the agency.');
    }
  };

  const createUser = async () => {
    if (!selectedAgencyId) return;
    if (!userForm.name.trim() || !userForm.email.trim() || userForm.password.length < 8) {
      setError('User name, email, and an 8+ character password are required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const created = await apiFetch<User>('/agencies/' + selectedAgencyId + '/users', {
        method: 'POST',
        body: JSON.stringify({
          name: userForm.name.trim(),
          email: userForm.email.trim(),
          password: userForm.password,
          role: userForm.role,
        }),
      });

      setUsers((current) => [created, ...current]);
      setUserForm(emptyUser);
      setShowUserForm(false);
      setSuccess('User "' + created.name + '" was created.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create the user.');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: 'agency',
      header: 'Agency',
      render: (agency: AgencyRecord) => (
        <div>
          <p className="font-bold text-slate-900">{agency.name}</p>
          <p className="mt-1 text-[11px] text-slate-400">{agency.slug}</p>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (agency: AgencyRecord) => <StatusPill value={agency.status} /> },
    {
      key: 'users',
      header: 'Users',
      render: (agency: AgencyRecord) => <span className="font-bold text-slate-700">{agency.counts?.users ?? agency.userCount}</span>,
    },
    {
      key: 'jobs',
      header: 'Jobs',
      render: (agency: AgencyRecord) => <span className="font-bold text-slate-700">{agency.counts?.jobs ?? agency.jobCount}</span>,
    },
    {
      key: 'candidates',
      header: 'Candidates',
      render: (agency: AgencyRecord) => <span className="font-bold text-slate-700">{agency.counts?.candidates ?? agency.candidateCount}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (agency: AgencyRecord) => (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => setSelectedAgencyId((current) => current === agency.id ? null : agency.id)}>Manage users</Button>
          <Button size="sm" variant="secondary" onClick={() => void toggleAgency(agency)} disabled={developmentMode}>
            {agency.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <SectionHeading
        eyebrow="System administration"
        title="Agencies & Users"
        description="Admin manages agency workspaces and their Agency and Interviewer users. Agency data remains isolated by agency ownership."
        action={!developmentMode ? (
          <Button onClick={() => { setShowAgencyForm((value) => !value); setError(''); }}>
            <Icon name="plus" size={16} /> New agency
          </Button>
        ) : undefined}
      />

      {loading && <StateMessage kind="loading" title="Loading agencies" description="Fetching agency workspaces." />}
      {error && <StateMessage kind="error" title="Agency action failed" description={error} />}
      {success && <StateMessage kind="success" title="Saved" description={success} />}

      {showAgencyForm && !developmentMode && (
        <Card>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Agency name">
              <input className="field-input" value={agencyName} onChange={(event) => setAgencyName(event.target.value)} placeholder="Example Recruitment" />
            </FormField>
            <FormField label="Slug" hint="Lowercase URL-safe identifier.">
              <input className="field-input" value={agencySlug} onChange={(event) => setAgencySlug(event.target.value)} placeholder="example-recruitment" />
            </FormField>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAgencyForm(false)}>Cancel</Button>
            <Button disabled={saving} onClick={() => void createAgency()}>{saving ? 'Saving…' : 'Create agency'}</Button>
          </div>
        </Card>
      )}

      {!loading && agencies.length === 0 && <StateMessage kind="empty" title="No agencies yet" description="Create the first agency workspace to begin onboarding agency users." />}

      {!loading && agencies.length > 0 && <DataTable columns={columns} rows={agencies} getRowKey={(agency) => agency.id} />}

      {selectedAgencyId && !developmentMode && (
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-950">Agency users</h2>
              <p className="mt-1 text-xs text-slate-400">{users.length} user(s) in this agency</p>
            </div>
            <Button onClick={() => { setShowUserForm((value) => !value); setError(''); }}>Add user</Button>
          </div>

          {showUserForm && (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <FormField label="Name"><input className="field-input" value={userForm.name} onChange={(event) => setUserForm({ ...userForm, name: event.target.value })} /></FormField>
              <FormField label="Email"><input type="email" className="field-input" value={userForm.email} onChange={(event) => setUserForm({ ...userForm, email: event.target.value })} /></FormField>
              <FormField label="Password" hint="Minimum 8 characters."><input type="password" className="field-input" value={userForm.password} onChange={(event) => setUserForm({ ...userForm, password: event.target.value })} /></FormField>
              <FormField label="Role">
                <select className="field-input" value={userForm.role} onChange={(event) => setUserForm({ ...userForm, role: event.target.value as UserForm['role'] })}>
                  <option value="AGENCY">Agency</option>
                  <option value="INTERVIEWER">Interviewer</option>
                </select>
              </FormField>
              <div className="md:col-span-2 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setShowUserForm(false)}>Cancel</Button>
                <Button disabled={saving} onClick={() => void createUser()}>{saving ? 'Saving…' : 'Create user'}</Button>
              </div>
            </div>
          )}

          {loadingUsers ? (
            <div className="mt-5"><StateMessage kind="loading" title="Loading users" /></div>
          ) : users.length === 0 ? (
            <div className="mt-5"><StateMessage kind="empty" title="No agency users" description="Add an Agency or Interviewer account for this workspace." /></div>
          ) : (
            <div className="mt-5 divide-y divide-slate-100 rounded-2xl border border-slate-200">
              {users.map((item) => (
                <div key={item.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="text-sm font-bold text-slate-900">{item.name}</p><p className="mt-1 text-xs text-slate-400">{item.email}</p></div>
                  <div className="flex items-center gap-2"><StatusPill value={item.role} /><StatusPill value={item.active ? 'ACTIVE' : 'INACTIVE'} /></div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </section>
  );
};

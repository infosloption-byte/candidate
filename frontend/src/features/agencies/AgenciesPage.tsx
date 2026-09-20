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
  const { state } = useRecruitment();
  const [agencies, setAgencies] = useState<AgencyRecord[]>(developmentMode ? fixtureAgencies : []);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [globalInterviewers, setGlobalInterviewers] = useState<User[]>(developmentMode ? state.users.filter((item) => item.role === 'INTERVIEWER' && item.agencyId === null) : []);
  const [showGlobalInterviewerForm, setShowGlobalInterviewerForm] = useState(false);
  const [globalInterviewerForm, setGlobalInterviewerForm] = useState({ name: '', email: '', password: '' });
  const [loadingGlobalInterviewers, setLoadingGlobalInterviewers] = useState(false);
  const [showAgencyForm, setShowAgencyForm] = useState(false);
  const [editingAgencyId, setEditingAgencyId] = useState<string | null>(null);
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
    if (developmentMode) {
      setGlobalInterviewers(state.users.filter((item) => item.role === 'INTERVIEWER' && item.agencyId === null));
      setLoadingGlobalInterviewers(false);
      return;
    }

    let cancelled = false;
    setLoadingGlobalInterviewers(true);

    apiFetch<User[]>('/interviewers/global')
      .then((result) => {
        if (!cancelled) setGlobalInterviewers(result);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to load global interviewers.');
      })
      .finally(() => {
        if (!cancelled) setLoadingGlobalInterviewers(false);
      });

    return () => { cancelled = true; };
  }, [developmentMode, state.users]);

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

  const beginEditAgency = (agency: AgencyRecord) => {
    setEditingAgencyId(agency.id);
    setAgencyName(agency.name);
    setAgencySlug(agency.slug);
    setShowAgencyForm(true);
    setError('');
    setSuccess('');
  };

  const saveAgency = async () => {
    if (!agencyName.trim() || !agencySlug.trim()) {
      setError('Agency name and slug are required.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (!editingAgencyId) {
        const created = await apiFetch<AgencyRecord>('/agencies', {
          method: 'POST',
          body: JSON.stringify({ name: agencyName.trim(), slug: agencySlug.trim() }),
        });
        setAgencies((current) => [{ ...created, counts: { users: 0, jobs: 0, candidates: 0 } }, ...current]);
        setSuccess('Agency "' + created.name + '" was created.');
      } else {
        const existing = agencies.find((item) => item.id === editingAgencyId);
        const updated = await apiFetch<AgencyRecord>('/agencies/' + editingAgencyId, {
          method: 'PATCH',
          body: JSON.stringify({ name: agencyName.trim(), slug: agencySlug.trim() }),
        });
        setAgencies((current) => current.map((item) => item.id === updated.id ? { ...item, ...updated, counts: existing?.counts } : item));
        setSuccess('Agency "' + updated.name + '" was updated.');
      }
      setAgencyName('');
      setAgencySlug('');
      setEditingAgencyId(null);
      setShowAgencyForm(false);
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save the agency.');
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

  const toggleUserActive = async (item: User) => {
    if (!selectedAgencyId || developmentMode) return;

    try {
      setError('');
      const updated = await apiFetch<User>('/agencies/' + selectedAgencyId + '/users/' + item.id, {
        method: 'PATCH',
        body: JSON.stringify({ active: !item.active }),
      });
      setUsers((current) => current.map((userItem) => userItem.id === updated.id ? updated : userItem));
      setSuccess('User "' + item.name + '" is now ' + (updated.active ? 'active' : 'inactive') + '.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update the user.');
    }
  };

  const createGlobalInterviewer = async () => {
    if (!globalInterviewerForm.name.trim() || !globalInterviewerForm.email.trim() || globalInterviewerForm.password.length < 8) {
      setError('Global interviewer name, email, and an 8+ character password are required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (developmentMode) {
        const created: User = {
          id: 'dev-global-interviewer-' + Date.now(),
          agencyId: null,
          candidateId: null,
          name: globalInterviewerForm.name.trim(),
          email: globalInterviewerForm.email.trim(),
          role: 'INTERVIEWER',
          active: true,
        };
        setGlobalInterviewers((current) => [created, ...current]);
      } else {
        const created = await apiFetch<User>('/interviewers', {
          method: 'POST',
          body: JSON.stringify({
            name: globalInterviewerForm.name.trim(),
            email: globalInterviewerForm.email.trim(),
            password: globalInterviewerForm.password,
          }),
        });
        setGlobalInterviewers((current) => [created, ...current]);
      }

      setGlobalInterviewerForm({ name: '', email: '', password: '' });
      setShowGlobalInterviewerForm(false);
      setSuccess('Global interviewer was created.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create the global interviewer.');
    } finally {
      setSaving(false);
    }
  };

  const toggleGlobalInterviewer = async (item: User) => {
    if (developmentMode) {
      setGlobalInterviewers((current) => current.map((userItem) => userItem.id === item.id ? { ...userItem, active: !userItem.active } : userItem));
      setSuccess('Global interviewer "' + item.name + '" is now ' + (item.active ? 'inactive' : 'active') + '.');
      return;
    }

    try {
      setError('');
      const updated = await apiFetch<User>('/interviewers/' + item.id, {
        method: 'PATCH',
        body: JSON.stringify({ active: !item.active }),
      });
      setGlobalInterviewers((current) => current.map((userItem) => userItem.id === updated.id ? updated : userItem));
      setSuccess('Global interviewer "' + item.name + '" is now ' + (updated.active ? 'active' : 'inactive') + '.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update the global interviewer.');
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
          <Button size="sm" variant="secondary" onClick={() => { setSelectedAgencyId((current) => current === agency.id ? null : agency.id); setError(''); }}>Manage users</Button>
          {!developmentMode && <Button size="sm" variant="secondary" onClick={() => beginEditAgency(agency)}>Edit</Button>}
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
          <div className="mb-4">
            <h2 className="text-sm font-black text-slate-950">{editingAgencyId ? 'Edit agency' : 'Create agency'}</h2>
            <p className="mt-1 text-xs text-slate-400">{editingAgencyId ? 'Update the agency workspace name or slug.' : 'Create a new agency workspace.'}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Agency name">
              <input className="field-input" value={agencyName} onChange={(event) => setAgencyName(event.target.value)} placeholder="Example Recruitment" />
            </FormField>
            <FormField label="Slug" hint="Lowercase URL-safe identifier.">
              <input className="field-input" value={agencySlug} onChange={(event) => setAgencySlug(event.target.value)} placeholder="example-recruitment" />
            </FormField>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowAgencyForm(false); setEditingAgencyId(null); }}>Cancel</Button>
            <Button disabled={saving} onClick={() => void saveAgency()}>{saving ? 'Saving…' : editingAgencyId ? 'Save changes' : 'Create agency'}</Button>
          </div>
        </Card>
      )}

      {!loading && agencies.length === 0 && <StateMessage kind="empty" title="No agencies yet" description="Create the first agency workspace to begin onboarding agency users." />}

      {!loading && agencies.length > 0 && <DataTable columns={columns} rows={agencies} getRowKey={(agency) => agency.id} />}

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-600">Shared interviewer pool</p>
            <h2 className="text-sm font-black text-slate-950">Global interviewers</h2>
            <p className="mt-1 text-xs text-slate-400">Available to every agency when assigned to an interview.</p>
          </div>
          {!developmentMode && (
            <Button onClick={() => { setShowGlobalInterviewerForm((value) => !value); setError(''); }}>
              Add global interviewer
            </Button>
          )}
        </div>

        {showGlobalInterviewerForm && !developmentMode && (
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <FormField label="Name">
              <input className="field-input" value={globalInterviewerForm.name} onChange={(event) => setGlobalInterviewerForm({ ...globalInterviewerForm, name: event.target.value })} placeholder="David Perera" />
            </FormField>
            <FormField label="Email">
              <input type="email" className="field-input" value={globalInterviewerForm.email} onChange={(event) => setGlobalInterviewerForm({ ...globalInterviewerForm, email: event.target.value })} placeholder="interviewer@example.com" />
            </FormField>
            <FormField label="Password" hint="Minimum 8 characters.">
              <input type="password" className="field-input" value={globalInterviewerForm.password} onChange={(event) => setGlobalInterviewerForm({ ...globalInterviewerForm, password: event.target.value })} />
            </FormField>
            <div className="md:col-span-3 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowGlobalInterviewerForm(false)}>Cancel</Button>
              <Button disabled={saving} onClick={() => void createGlobalInterviewer()}>{saving ? 'Saving…' : 'Create global interviewer'}</Button>
            </div>
          </div>
        )}

        {loadingGlobalInterviewers ? (
          <div className="mt-5"><StateMessage kind="loading" title="Loading global interviewers" /></div>
        ) : globalInterviewers.length === 0 ? (
          <div className="mt-5"><StateMessage kind="empty" title="No global interviewers" description="Create an interviewer without an agency when you need a shared interviewer available across agencies." /></div>
        ) : (
          <div className="mt-5 grid gap-2 md:grid-cols-2">
            {globalInterviewers.map((item) => (
              <div key={item.id} className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">{item.name}</p>
                  <p className="mt-1 truncate text-xs text-slate-400">{item.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusPill value="GLOBAL" />
                  <StatusPill value={item.active ? 'ACTIVE' : 'INACTIVE'} />
                  <Button
                    size="sm"
                    variant={item.active ? 'danger' : 'secondary'}
                    onClick={() => void toggleGlobalInterviewer(item)}
                    disabled={item.id === user?.id}
                  >
                    {item.active ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

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
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill value={item.role} />
                    <StatusPill value={item.active ? 'ACTIVE' : 'INACTIVE'} />
                    <Button
                      size="sm"
                      variant={item.active ? 'danger' : 'secondary'}
                      onClick={() => void toggleUserActive(item)}
                    >
                      {item.active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </section>
  );
};

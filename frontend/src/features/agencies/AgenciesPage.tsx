import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../../domain/authContext';
import { useRecruitment } from '../../domain/recruitmentContext';
import { agencies as fixtureAgencies } from '../../domain/fixtures';
import { SectionHeading } from '../../shared/components/SectionHeading';
import { StatusPill } from '../../shared/components/StatusPill';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { FormField } from '../../shared/components/FormField';
import { DataTable } from '../../shared/components/DataTable';
import { StateMessage } from '../../shared/components/StateMessage';
import { SelectMenu } from '../../shared/components/SelectMenu';
import { useFocusTrap } from '../../shared/hooks/useFocusTrap';
import { apiFetch } from '../../shared/lib/api';
import type { Agency, User } from '../../domain/types';

interface AgencyRecord extends Agency {
  counts?: { users: number; jobs: number; candidates: number };
}

type ActiveTab = 'system-users' | 'agencies' | 'interviewers';
type SystemUserRole = 'ADMIN' | 'AGENCY';
type InterviewerScope = 'AGENCY' | 'GLOBAL';
type ModalMode = 'SYSTEM_USER' | 'AGENCY' | 'INTERVIEWER' | null;

const emptySystemUser = { name: '', email: '', password: '', role: 'AGENCY' as SystemUserRole, agencyId: '' };
const emptyAgency = { name: '', slug: '' };
const emptyInterviewer = { name: '', email: '', password: '', scope: 'GLOBAL' as InterviewerScope, agencyId: '' };

const AdminModal = ({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}) => {
  const modalRef = useFocusTrap<HTMLDivElement>({ enabled: true, onEscape: onClose });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-5" role="presentation">
      <button type="button" aria-label="Close dialog" className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-dialog-title"
        tabIndex={-1}
        className="relative z-10 my-auto w-full max-w-2xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100dvh-2.5rem)]"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white/95 px-4 py-4 backdrop-blur sm:px-5">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-600">System administration</p>
            <h2 id="admin-dialog-title" className="mt-1 text-base font-black text-slate-950 sm:text-lg">{title}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>
        </div>
        <div className="p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
};

export const AgenciesPage = () => {
  const { user, developmentMode } = useAuth();
  const { state } = useRecruitment();

  const [activeTab, setActiveTab] = useState<ActiveTab>('system-users');
  const [agencies, setAgencies] = useState<AgencyRecord[]>(developmentMode ? fixtureAgencies : []);
  const [systemUsers, setSystemUsers] = useState<User[]>(developmentMode ? state.users.filter((item) => item.role === 'ADMIN' || item.role === 'AGENCY') : []);
  const [interviewers, setInterviewers] = useState<User[]>(developmentMode ? state.users.filter((item) => item.role === 'INTERVIEWER') : []);

  const [loading, setLoading] = useState(!developmentMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [systemUserForm, setSystemUserForm] = useState(emptySystemUser);
  const [agencyForm, setAgencyForm] = useState(emptyAgency);
  const [interviewerForm, setInterviewerForm] = useState(emptyInterviewer);

  useEffect(() => {
    if (developmentMode) {
      setAgencies(fixtureAgencies);
      setSystemUsers(state.users.filter((item) => item.role === 'ADMIN' || item.role === 'AGENCY'));
      setInterviewers(state.users.filter((item) => item.role === 'INTERVIEWER'));
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    Promise.all([
      apiFetch<AgencyRecord[]>('/agencies'),
      apiFetch<User[]>('/system-users'),
      apiFetch<User[]>('/interviewers/all'),
    ])
      .then(([agencyResult, systemUserResult, interviewerResult]) => {
        if (cancelled) return;
        setAgencies(agencyResult);
        setSystemUsers(systemUserResult);
        setInterviewers(interviewerResult);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to load administration data.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [developmentMode, state.users, user?.id]);

  const activeAgencies = agencies.filter((item) => item.status === 'ACTIVE');

  const closeModal = () => {
    setModalMode(null);
    setSaving(false);
    setError('');
  };

  const openCreateSystemUser = () => {
    setSystemUserForm({ ...emptySystemUser });
    setError('');
    setSuccess('');
    setModalMode('SYSTEM_USER');
  };

  const openCreateAgency = () => {
    setAgencyForm({ ...emptyAgency });
    setError('');
    setSuccess('');
    setModalMode('AGENCY');
  };

  const openCreateInterviewer = () => {
    setInterviewerForm({ ...emptyInterviewer });
    setError('');
    setSuccess('');
    setModalMode('INTERVIEWER');
  };

  const createSystemUser = async () => {
    if (!systemUserForm.name.trim() || !systemUserForm.email.trim() || systemUserForm.password.length < 8) {
      setError('Name, email, and an 8+ character password are required.');
      return;
    }
    if (systemUserForm.role === 'AGENCY' && !systemUserForm.agencyId) {
      setError('Select an agency for an Agency user.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (developmentMode) {
        const created: User = {
          id: 'dev-system-user-' + Date.now(),
          agencyId: systemUserForm.role === 'AGENCY' ? systemUserForm.agencyId : null,
          candidateId: null,
          name: systemUserForm.name.trim(),
          email: systemUserForm.email.trim(),
          role: systemUserForm.role,
          active: true,
        };
        setSystemUsers((current) => [created, ...current]);
      } else {
        const created = await apiFetch<User>('/system-users', {
          method: 'POST',
          body: JSON.stringify({
            name: systemUserForm.name.trim(),
            email: systemUserForm.email.trim(),
            password: systemUserForm.password,
            role: systemUserForm.role,
            agencyId: systemUserForm.role === 'AGENCY' ? systemUserForm.agencyId : null,
          }),
        });
        setSystemUsers((current) => [created, ...current]);
      }

      setSystemUserForm({ ...emptySystemUser });
      closeModal();
      setSuccess(systemUserForm.role === 'ADMIN' ? 'System administrator was created.' : 'Agency user was created.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create the system user.');
    } finally {
      setSaving(false);
    }
  };

  const createAgency = async () => {
    if (!agencyForm.name.trim() || !agencyForm.slug.trim()) {
      setError('Agency name and slug are required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (developmentMode) {
        const created: AgencyRecord = {
          id: 'dev-agency-' + Date.now(),
          name: agencyForm.name.trim(),
          slug: agencyForm.slug.trim(),
          status: 'ACTIVE',
          userCount: 0,
          jobCount: 0,
          candidateCount: 0,
          counts: { users: 0, jobs: 0, candidates: 0 },
        };
        setAgencies((current) => [created, ...current]);
      } else {
        const created = await apiFetch<AgencyRecord>('/agencies', {
          method: 'POST',
          body: JSON.stringify({ name: agencyForm.name.trim(), slug: agencyForm.slug.trim() }),
        });
        setAgencies((current) => [{ ...created, counts: { users: 0, jobs: 0, candidates: 0 } }, ...current]);
      }

      setAgencyForm({ ...emptyAgency });
      closeModal();
      setSuccess('Agency was created.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create the agency.');
    } finally {
      setSaving(false);
    }
  };

  const createInterviewer = async () => {
    if (!interviewerForm.name.trim() || !interviewerForm.email.trim() || interviewerForm.password.length < 8) {
      setError('Name, email, and an 8+ character password are required.');
      return;
    }
    if (interviewerForm.scope === 'AGENCY' && !interviewerForm.agencyId) {
      setError('Select an agency for an agency interviewer.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      let created: User;

      if (developmentMode) {
        created = {
          id: 'dev-interviewer-' + Date.now(),
          agencyId: interviewerForm.scope === 'AGENCY' ? interviewerForm.agencyId : null,
          candidateId: null,
          name: interviewerForm.name.trim(),
          email: interviewerForm.email.trim(),
          role: 'INTERVIEWER',
          active: true,
        };
      } else if (interviewerForm.scope === 'GLOBAL') {
        created = await apiFetch<User>('/interviewers', {
          method: 'POST',
          body: JSON.stringify({
            name: interviewerForm.name.trim(),
            email: interviewerForm.email.trim(),
            password: interviewerForm.password,
          }),
        });
      } else {
        created = await apiFetch<User>('/agencies/' + interviewerForm.agencyId + '/users', {
          method: 'POST',
          body: JSON.stringify({
            name: interviewerForm.name.trim(),
            email: interviewerForm.email.trim(),
            password: interviewerForm.password,
            role: 'INTERVIEWER',
          }),
        });
      }

      setInterviewers((current) => [created, ...current]);
      setInterviewerForm({ ...emptyInterviewer });
      closeModal();
      setSuccess(interviewerForm.scope === 'GLOBAL' ? 'Global interviewer was created.' : 'Agency interviewer was created.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create the interviewer.');
    } finally {
      setSaving(false);
    }
  };

  const toggleSystemUser = async (item: User) => {
    if (item.id === user?.id && item.active) {
      setError('You cannot deactivate your own account.');
      return;
    }

    try {
      setError('');
      if (developmentMode) {
        const updated = { ...item, active: !item.active };
        setSystemUsers((current) => current.map((row) => row.id === updated.id ? updated : row));
        setSuccess('User "' + item.name + '" is now ' + (updated.active ? 'active' : 'inactive') + '.');
        return;
      }

      const updated = await apiFetch<User>('/system-users/' + item.id, {
        method: 'PATCH',
        body: JSON.stringify({ active: !item.active }),
      });
      setSystemUsers((current) => current.map((row) => row.id === updated.id ? updated : row));
      setSuccess('User "' + item.name + '" is now ' + (updated.active ? 'active' : 'inactive') + '.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update the system user.');
    }
  };

  const toggleAgency = async (item: AgencyRecord) => {
    try {
      setError('');
      if (developmentMode) {
        const updated = { ...item, status: item.status === 'ACTIVE' ? 'INACTIVE' as const : 'ACTIVE' as const };
        setAgencies((current) => current.map((row) => row.id === updated.id ? updated : row));
        setSuccess('Agency "' + item.name + '" is now ' + updated.status.toLowerCase() + '.');
        return;
      }

      const updated = await apiFetch<AgencyRecord>('/agencies/' + item.id, {
        method: 'PATCH',
        body: JSON.stringify({ status: item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }),
      });
      setAgencies((current) => current.map((row) => row.id === updated.id ? { ...row, ...updated } : row));
      setSuccess('Agency "' + item.name + '" is now ' + updated.status.toLowerCase() + '.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update the agency.');
    }
  };

  const toggleInterviewer = async (item: User) => {
    try {
      setError('');
      if (developmentMode) {
        const updated = { ...item, active: !item.active };
        setInterviewers((current) => current.map((row) => row.id === updated.id ? updated : row));
        setSuccess('Interviewer "' + item.name + '" is now ' + (updated.active ? 'active' : 'inactive') + '.');
        return;
      }

      const endpoint = item.agencyId
        ? '/agencies/' + item.agencyId + '/users/' + item.id
        : '/interviewers/' + item.id;
      const updated = await apiFetch<User>(endpoint, {
        method: 'PATCH',
        body: JSON.stringify({ active: !item.active }),
      });
      setInterviewers((current) => current.map((row) => row.id === updated.id ? updated : row));
      setSuccess('Interviewer "' + item.name + '" is now ' + (updated.active ? 'active' : 'inactive') + '.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update the interviewer.');
    }
  };

  const agencyNameFor = (agencyId: string | null) => agencies.find((item) => item.id === agencyId)?.name ?? '—';

  const systemUserColumns = [
    {
      key: 'name',
      header: 'User',
      render: (item: User) => (
        <div>
          <p className="font-bold text-slate-900">{item.name}</p>
          <p className="mt-1 text-[11px] text-slate-400">{item.email}</p>
        </div>
      ),
    },
    { key: 'role', header: 'Role', render: (item: User) => <StatusPill value={item.role} /> },
    {
      key: 'agency',
      header: 'Agency',
      render: (item: User) => <span className="text-xs font-semibold text-slate-600">{item.role === 'ADMIN' ? 'System' : agencyNameFor(item.agencyId)}</span>,
    },
    { key: 'status', header: 'Status', render: (item: User) => <StatusPill value={item.active ? 'ACTIVE' : 'INACTIVE'} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: User) => (
        <Button
          size="sm"
          variant={item.active ? 'danger' : 'secondary'}
          onClick={() => void toggleSystemUser(item)}
          disabled={item.id === user?.id}
        >
          {item.active ? 'Deactivate' : 'Activate'}
        </Button>
      ),
    },
  ];

  const agencyColumns = [
    {
      key: 'agency',
      header: 'Agency',
      render: (item: AgencyRecord) => (
        <div>
          <p className="font-bold text-slate-900">{item.name}</p>
          <p className="mt-1 text-[11px] text-slate-400">{item.slug}</p>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (item: AgencyRecord) => <StatusPill value={item.status} /> },
    { key: 'users', header: 'Users', render: (item: AgencyRecord) => <span className="font-bold text-slate-700">{item.counts?.users ?? item.userCount}</span> },
    { key: 'jobs', header: 'Jobs', render: (item: AgencyRecord) => <span className="font-bold text-slate-700">{item.counts?.jobs ?? item.jobCount}</span> },
    { key: 'candidates', header: 'Candidates', render: (item: AgencyRecord) => <span className="font-bold text-slate-700">{item.counts?.candidates ?? item.candidateCount}</span> },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: AgencyRecord) => (
        <Button size="sm" variant={item.status === 'ACTIVE' ? 'danger' : 'secondary'} onClick={() => void toggleAgency(item)}>
          {item.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        </Button>
      ),
    },
  ];

  const interviewerColumns = [
    {
      key: 'name',
      header: 'Interviewer',
      render: (item: User) => (
        <div>
          <p className="font-bold text-slate-900">{item.name}</p>
          <p className="mt-1 text-[11px] text-slate-400">{item.email}</p>
        </div>
      ),
    },
    {
      key: 'scope',
      header: 'Scope',
      render: (item: User) => item.agencyId
        ? <div><StatusPill value="AGENCY" /><p className="mt-1 text-[10px] font-semibold text-slate-400">{agencyNameFor(item.agencyId)}</p></div>
        : <StatusPill value="GLOBAL" />,
    },
    { key: 'status', header: 'Status', render: (item: User) => <StatusPill value={item.active ? 'ACTIVE' : 'INACTIVE'} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: User) => (
        <Button size="sm" variant={item.active ? 'danger' : 'secondary'} onClick={() => void toggleInterviewer(item)}>
          {item.active ? 'Deactivate' : 'Activate'}
        </Button>
      ),
    },
  ];

  const tab = (id: ActiveTab, label: string, count: number) => (
    <button
      type="button"
      role="tab"
      aria-selected={activeTab === id}
      onClick={() => { setActiveTab(id); setError(''); }}
      className={`flex min-w-max items-center gap-2 border-b-2 px-4 py-3 text-xs font-extrabold transition ${activeTab === id ? 'border-cyan-600 text-slate-950' : 'border-transparent text-slate-500 hover:border-slate-200 hover:text-slate-800'}`}
    >
      {label}
      <span className={`rounded-full px-2 py-0.5 text-[10px] ${activeTab === id ? 'bg-cyan-50 text-cyan-700' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
    </button>
  );

  return (
    <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <SectionHeading
        eyebrow="System administration"
        title="Users & Agencies"
        description="Manage platform users, agency workspaces, and interviewers from one administration area. Interviewers can belong to one agency or remain global."
      />

      {loading && <StateMessage kind="loading" title="Loading administration" description="Fetching users, agencies, and interviewers." />}
      {error && <StateMessage kind="error" title="Administration action failed" description={error} floating={Boolean(modalMode)} />}
      {success && <StateMessage kind="success" title="Saved" description={success} />}

      <Card padded={false}>
        <div role="tablist" aria-label="Administration sections" className="flex overflow-x-auto border-b border-slate-200 px-2 sm:px-4">
          {tab('system-users', 'System Users', systemUsers.length)}
          {tab('agencies', 'Agencies', agencies.length)}
          {tab('interviewers', 'Interviewers', interviewers.length)}
        </div>

        <div className="p-4 sm:p-5">
          {activeTab === 'system-users' && (
            <div>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-600">Platform access</p>
                  <h2 className="text-lg font-black text-slate-950">System Users</h2>
                  <p className="mt-1 text-xs text-slate-500">Manage Admin and Agency accounts. Interviewers are maintained in their own tab.</p>
                </div>
                {!developmentMode && <Button onClick={openCreateSystemUser}>Add system user</Button>}
              </div>
              {systemUsers.length ? (
                <DataTable columns={systemUserColumns} rows={systemUsers} getRowKey={(item) => item.id} />
              ) : (
                <StateMessage kind="empty" title="No system users" description="Add an Admin or Agency account to get started." />
              )}
            </div>
          )}

          {activeTab === 'agencies' && (
            <div>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-600">Workspaces</p>
                  <h2 className="text-lg font-black text-slate-950">Agencies</h2>
                  <p className="mt-1 text-xs text-slate-500">Create and manage agency workspaces without opening a separate user screen.</p>
                </div>
                {!developmentMode && <Button onClick={openCreateAgency}>Add agency</Button>}
              </div>
              {agencies.length ? (
                <DataTable columns={agencyColumns} rows={agencies} getRowKey={(item) => item.id} />
              ) : (
                <StateMessage kind="empty" title="No agencies" description="Create the first agency workspace to begin onboarding." />
              )}
            </div>
          )}

          {activeTab === 'interviewers' && (
            <div>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-600">Interview panel pool</p>
                  <h2 className="text-lg font-black text-slate-950">Interviewers</h2>
                  <p className="mt-1 text-xs text-slate-500">Agency interviewers are limited to their agency. Global interviewers can be assigned across agencies.</p>
                </div>
                {!developmentMode && <Button onClick={openCreateInterviewer}>Add interviewer</Button>}
              </div>
              {interviewers.length ? (
                <DataTable columns={interviewerColumns} rows={interviewers} getRowKey={(item) => item.id} />
              ) : (
                <StateMessage kind="empty" title="No interviewers" description="Add an agency or global interviewer to build your interview panel pool." />
              )}
            </div>
          )}
        </div>
      </Card>

      {modalMode === 'SYSTEM_USER' && (
        <AdminModal
          title="Add system user"
          description="Create an Admin account or an Agency account. Interviewers are created from the Interviewers tab."
          onClose={closeModal}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Name">
              <input className="field-input" value={systemUserForm.name} onChange={(event) => setSystemUserForm({ ...systemUserForm, name: event.target.value })} placeholder="Operations Manager" />
            </FormField>
            <FormField label="Email">
              <input type="email" className="field-input" value={systemUserForm.email} onChange={(event) => setSystemUserForm({ ...systemUserForm, email: event.target.value })} placeholder="manager@example.com" />
            </FormField>
            <FormField label="Password" hint="Minimum 8 characters.">
              <input type="password" className="field-input" value={systemUserForm.password} onChange={(event) => setSystemUserForm({ ...systemUserForm, password: event.target.value })} />
            </FormField>
            <FormField label="Role">
              <SelectMenu
                value={systemUserForm.role}
                onChange={(value) => setSystemUserForm({ ...systemUserForm, role: value as SystemUserRole, agencyId: value === 'ADMIN' ? '' : systemUserForm.agencyId })}
                options={[
                  { value: 'AGENCY', label: 'Agency' },
                  { value: 'ADMIN', label: 'Admin' },
                ]}
                ariaLabel="Select system user role"
              />
            </FormField>
            {systemUserForm.role === 'AGENCY' && (
              <div className="md:col-span-2">
                <FormField label="Agency">
                  <SelectMenu
                    value={systemUserForm.agencyId}
                    onChange={(value) => setSystemUserForm({ ...systemUserForm, agencyId: value })}
                    options={[
                      { value: '', label: 'Select an agency' },
                      ...activeAgencies.map((item) => ({ value: item.id, label: item.name })),
                    ]}
                    ariaLabel="Select agency for system user"
                  />
                </FormField>
              </div>
            )}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button disabled={saving} onClick={() => void createSystemUser()}>{saving ? 'Creating…' : 'Create user'}</Button>
          </div>
        </AdminModal>
      )}

      {modalMode === 'AGENCY' && (
        <AdminModal
          title="Add agency"
          description="Create a new agency workspace. You can add its Agency users from the System Users tab."
          onClose={closeModal}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Agency name">
              <input className="field-input" value={agencyForm.name} onChange={(event) => setAgencyForm({ ...agencyForm, name: event.target.value })} placeholder="Example Recruitment" />
            </FormField>
            <FormField label="Slug" hint="Lowercase URL-safe identifier.">
              <input className="field-input" value={agencyForm.slug} onChange={(event) => setAgencyForm({ ...agencyForm, slug: event.target.value })} placeholder="example-recruitment" />
            </FormField>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button disabled={saving} onClick={() => void createAgency()}>{saving ? 'Creating…' : 'Create agency'}</Button>
          </div>
        </AdminModal>
      )}

      {modalMode === 'INTERVIEWER' && (
        <AdminModal
          title="Add interviewer"
          description="Choose whether the interviewer belongs to one agency or is available globally across agencies."
          onClose={closeModal}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Name">
              <input className="field-input" value={interviewerForm.name} onChange={(event) => setInterviewerForm({ ...interviewerForm, name: event.target.value })} placeholder="David Perera" />
            </FormField>
            <FormField label="Email">
              <input type="email" className="field-input" value={interviewerForm.email} onChange={(event) => setInterviewerForm({ ...interviewerForm, email: event.target.value })} placeholder="interviewer@example.com" />
            </FormField>
            <FormField label="Password" hint="Minimum 8 characters.">
              <input type="password" className="field-input" value={interviewerForm.password} onChange={(event) => setInterviewerForm({ ...interviewerForm, password: event.target.value })} />
            </FormField>
            <FormField label="Interviewer scope">
              <SelectMenu
                value={interviewerForm.scope}
                onChange={(value) => setInterviewerForm({ ...interviewerForm, scope: value as InterviewerScope, agencyId: value === 'GLOBAL' ? '' : interviewerForm.agencyId })}
                options={[
                  { value: 'GLOBAL', label: 'Global interviewer' },
                  { value: 'AGENCY', label: 'Agency interviewer' },
                ]}
                ariaLabel="Select interviewer scope"
              />
            </FormField>
            {interviewerForm.scope === 'AGENCY' && (
              <div className="md:col-span-2">
                <FormField label="Agency">
                  <SelectMenu
                    value={interviewerForm.agencyId}
                    onChange={(value) => setInterviewerForm({ ...interviewerForm, agencyId: value })}
                    options={[
                      { value: '', label: 'Select an agency' },
                      ...activeAgencies.map((item) => ({ value: item.id, label: item.name })),
                    ]}
                    ariaLabel="Select interviewer agency"
                  />
                </FormField>
              </div>
            )}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button disabled={saving} onClick={() => void createInterviewer()}>{saving ? 'Creating…' : 'Create interviewer'}</Button>
          </div>
        </AdminModal>
      )}
    </section>
  );
};

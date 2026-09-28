import { useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { useAuth } from '../../domain/authContext';
import type { User } from '../../domain/types';
import { SectionHeading } from '../../shared/components/SectionHeading';
import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { FormField } from '../../shared/components/FormField';
import { StateMessage } from '../../shared/components/StateMessage';
import { StatusPill } from '../../shared/components/StatusPill';
import { useFocusTrap } from '../../shared/hooks/useFocusTrap';
import { apiFetch } from '../../shared/lib/api';

type TeamRole = 'AGENCY' | 'INTERVIEWER';
type ModalMode = 'CREATE' | 'EDIT' | null;

const emptyForm = {
  name: '',
  email: '',
  password: '',
  role: 'INTERVIEWER' as TeamRole,
};

const roleLabel = (role: TeamRole) => role === 'AGENCY' ? 'Agency user' : 'Interviewer';

const TeamModal = ({
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
      <div ref={modalRef} role="dialog" aria-modal="true" tabIndex={-1} className="relative z-10 my-auto w-full max-w-xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-600">Company administration</p>
            <h2 className="mt-1 text-base font-black text-slate-950 sm:text-lg">{title}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>
        </div>
        <div className="p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
};

export const CompanyUsersPage = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadUsers = async () => {
    if (!user?.agencyId) {
      setError('Your company workspace is not linked to an agency yet.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      setUsers(await apiFetch<User[]>('/agencies/' + user.agencyId + '/users'));
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load company users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, [user?.agencyId]);

  const closeModal = () => {
    setModalMode(null);
    setEditingId(null);
    setForm({ ...emptyForm });
    setSaving(false);
  };

  const openCreate = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setError('');
    setModalMode('CREATE');
  };

  const openEdit = (item: User) => {
    setForm({
      name: item.name,
      email: item.email,
      password: '',
      role: item.role === 'AGENCY' ? 'AGENCY' : 'INTERVIEWER',
    });
    setEditingId(item.id);
    setError('');
    setModalMode('EDIT');
  };

  const save = async () => {
    if (!user?.agencyId || !form.name.trim() || !form.email.trim()) {
      setError('Name and email are required.');
      return;
    }
    if (modalMode === 'CREATE' && form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (modalMode === 'EDIT' && form.password && form.password.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (modalMode === 'CREATE') {
        const created = await apiFetch<User>('/agencies/' + user.agencyId + '/users', {
          method: 'POST',
          body: JSON.stringify({
            name: form.name.trim(),
            email: form.email.trim(),
            password: form.password,
            role: form.role,
          }),
        });
        setUsers((current) => [created, ...current]);
        setSuccess(roleLabel(form.role) + ' account created.');
      } else if (modalMode === 'EDIT' && editingId) {
        const updated = await apiFetch<User>('/agencies/' + user.agencyId + '/users/' + editingId, {
          method: 'PATCH',
          body: JSON.stringify({
            name: form.name.trim(),
            email: form.email.trim(),
            role: form.role,
            ...(form.password ? { password: form.password } : {}),
          }),
        });
        setUsers((current) => current.map((item) => item.id === updated.id ? updated : item));
        setSuccess('Company user account updated.');
      }
      closeModal();
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save this company user.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: User) => {
    if (item.id === user?.id && item.active) {
      setError('You cannot deactivate your own account.');
      return;
    }

    try {
      setError('');
      const updated = await apiFetch<User>('/agencies/' + user!.agencyId + '/users/' + item.id, {
        method: 'PATCH',
        body: JSON.stringify({ active: !item.active }),
      });
      setUsers((current) => current.map((row) => row.id === updated.id ? updated : row));
      setSuccess(updated.active ? 'User activated.' : 'User deactivated.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update the user status.');
    }
  };

  return (
    <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <SectionHeading
        eyebrow="Company administration"
        title="Company Users"
        description="Create company administrators and interviewers who belong only to this company workspace."
        action={<Button onClick={openCreate}>Add company user</Button>}
      />

      {loading && <StateMessage kind="loading" title="Loading company users" description="Fetching the current company team." />}
      {error && <StateMessage kind="error" title="Company user action failed" description={error} floating={Boolean(modalMode)} />}
      {success && <StateMessage kind="success" title="Saved" description={success} />}

      <Card>
        <div className="space-y-3">
          {users.length === 0 && !loading ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
              <p className="text-sm font-bold text-slate-700">No additional company users yet.</p>
              <p className="mt-1 text-xs text-slate-400">Add another Company Admin or an Interviewer to start building your team.</p>
            </div>
          ) : users.map((item) => (
            <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-black text-slate-950">{item.name}</p>
                  <StatusPill value={roleLabel(item.role as TeamRole)} />
                  {item.id === user?.id && <span className="rounded-full bg-slate-200 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-slate-600">You</span>}
                </div>
                <p className="mt-1 truncate text-xs font-medium text-slate-500">{item.email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <StatusPill value={item.active ? 'ACTIVE' : 'INACTIVE'} />
                <Button size="sm" variant="secondary" onClick={() => openEdit(item)}>Edit</Button>
                <Button size="sm" variant={item.active ? 'danger' : 'secondary'} onClick={() => void toggleActive(item)} disabled={item.id === user?.id}>
                  {item.active ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {modalMode && (
        <TeamModal
          title={modalMode === 'CREATE' ? 'Add company user' : 'Edit company user'}
          description="Company administrators can manage the workspace; interviewers can access assigned interviews."
          onClose={closeModal}
        >
          <div className="space-y-4">
            <FormField label="Full name">
              <input className="field-input" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} autoComplete="name" />
            </FormField>
            <FormField label="Email">
              <input type="email" className="field-input" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} autoComplete="email" />
            </FormField>
            <FormField label="Role">
              <select className="field-input" value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as TeamRole }))}>
                <option value="AGENCY">Company Admin</option>
                <option value="INTERVIEWER">Interviewer</option>
              </select>
            </FormField>
            <FormField label={modalMode === 'CREATE' ? 'Password' : 'New password'} hint={modalMode === 'EDIT' ? 'Leave blank to keep the current password.' : undefined}>
              <input type="password" className="field-input" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} autoComplete={modalMode === 'CREATE' ? 'new-password' : 'new-password'} />
            </FormField>
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={closeModal} disabled={saving}>Cancel</Button>
              <Button onClick={() => void save()} disabled={saving}>{saving ? 'Saving…' : modalMode === 'CREATE' ? 'Create user' : 'Save changes'}</Button>
            </div>
          </div>
        </TeamModal>
      )}
    </section>
  );
};

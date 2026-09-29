import { useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { useAuth, type EnterWorkspaceInput } from '../../domain/authContext';
import type { Company } from '../../domain/types';
import { SectionHeading } from '../../shared/components/SectionHeading';
import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { FormField } from '../../shared/components/FormField';
import { StateMessage } from '../../shared/components/StateMessage';
import { StatusPill } from '../../shared/components/StatusPill';
import { Icon } from '../../shared/components/Icon';
import { SelectMenu } from '../../shared/components/SelectMenu';
import { useFocusTrap } from '../../shared/hooks/useFocusTrap';
import { apiFetch } from '../../shared/lib/api';

interface CompanyForm {
  name: string;
  slug: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

const emptyForm: CompanyForm = { name: '', slug: '', adminName: '', adminEmail: '', adminPassword: '' };

const CompanyModal = ({
  onClose,
  onSave,
  form,
  setForm,
  saving,
}: {
  onClose: () => void;
  onSave: () => void;
  form: CompanyForm;
  setForm: Dispatch<SetStateAction<CompanyForm>>;
  saving: boolean;
}) => {
  const modalRef = useFocusTrap<HTMLDivElement>({ enabled: true, onEscape: onClose });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5" role="presentation">
      <button type="button" aria-label="Close dialog" className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]" onClick={onClose} />
      <div ref={modalRef} role="dialog" aria-modal="true" tabIndex={-1} className="relative z-10 w-full max-w-xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-600">System administration</p>
            <h2 className="mt-1 text-lg font-black text-slate-950">Create company</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">Manage your company profile and current tenant workspace.</p>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>
        </div>
        <div className="space-y-4 p-4 sm:p-5">
          <FormField label="Company name">
            <input className="field-input" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} autoComplete="organization" placeholder="Example Manpower Services" />
          </FormField>
          <FormField label="Company identifier" hint="Lowercase letters, numbers and hyphens only.">
            <input className="field-input" value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-') }))} placeholder="example-manpower" />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Company administrator">
              <input className="field-input" value={form.adminName} onChange={(event) => setForm((current) => ({ ...current, adminName: event.target.value }))} placeholder="Admin name" />
            </FormField>
            <FormField label="Administrator email">
              <input className="field-input" type="email" value={form.adminEmail} onChange={(event) => setForm((current) => ({ ...current, adminEmail: event.target.value }))} placeholder="admin@example.com" />
            </FormField>
          </div>
          <FormField label="Administrator password">
            <input className="field-input" type="password" value={form.adminPassword} onChange={(event) => setForm((current) => ({ ...current, adminPassword: event.target.value }))} placeholder="Minimum 8 characters" autoComplete="new-password" />
          </FormField>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button onClick={onSave} disabled={saving}>{saving ? 'Creating…' : 'Create company'}</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const EnterWorkspaceModal = ({
  company,
  onClose,
  onEnter,
}: {
  company: Company;
  onClose: () => void;
  onEnter: (input: EnterWorkspaceInput) => Promise<void>;
}) => {
  const modalRef = useFocusTrap<HTMLDivElement>({ enabled: true, onEscape: onClose });
  const [reason, setReason] = useState('');
  const [mode, setMode] = useState<EnterWorkspaceInput['mode']>('READ_ONLY');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (reason.trim().length < 5) {
      setError('Enter a reason (for example a support ticket number).');
      return;
    }
    if (mode === 'READ_WRITE' && !password) {
      setError('Write mode requires your password.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onEnter({ reason: reason.trim(), mode, ...(mode === 'READ_WRITE' ? { password } : {}) });
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to open the workspace.');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5" role="presentation">
      <button type="button" aria-label="Close dialog" className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]" onClick={onClose} />
      <div ref={modalRef} role="dialog" aria-modal="true" tabIndex={-1} className="relative z-10 w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-5 py-4">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-600">Platform support</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">Open {company.name}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">Access lasts 60 minutes, is limited to this company, and is recorded in the company&apos;s access log with your reason.</p>
        </div>
        <div className="space-y-4 p-5">
          <FormField label="Reason" hint="Support ticket or customer request. Visible to the company administrators.">
            <input className="field-input" value={reason} maxLength={255} onChange={(event) => setReason(event.target.value)} placeholder="Ticket #1234 - customer cannot see interview" />
          </FormField>
          <FormField label="Access level">
            <SelectMenu
              value={mode}
              onChange={(value) => setMode(value as EnterWorkspaceInput['mode'])}
              options={[
                { value: 'READ_ONLY', label: 'Read-only (recommended)' },
                { value: 'READ_WRITE', label: 'Write mode (every change is logged)' },
              ]}
              ariaLabel="Workspace access mode"
            />
          </FormField>
          {mode === 'READ_WRITE' && (
            <FormField label="Confirm your password">
              <input className="field-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
            </FormField>
          )}
          {error && <p role="alert" className="text-xs font-bold text-rose-600">{error}</p>}
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button onClick={() => void submit()} disabled={busy}>{busy ? 'Opening…' : 'Open workspace'}</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface AccessLogItem { id: string; action: string; summary: string; createdAt: string; actor: { id: string; name: string } | null }

/** Transparency for customers: when platform support entered this workspace and what they changed. */
const AccessLogCard = () => {
  const [items, setItems] = useState<AccessLogItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    apiFetch<AccessLogItem[]>('/company/access-log').then(setItems).catch(() => setFailed(true));
  }, []);

  if (failed) return null;

  return (
    <Card>
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-600">Platform support access</p>
      <h3 className="mt-1 text-base font-black text-slate-950">Who has accessed this workspace</h3>
      {items === null && <p className="mt-3 text-xs font-semibold text-slate-400">Loading…</p>}
      {items?.length === 0 && <p className="mt-3 text-xs font-semibold text-slate-500">BuildHire support has not accessed your workspace.</p>}
      <ul className="mt-3 divide-y divide-slate-100">
        {items?.map((item) => (
          <li key={item.id} className="py-2">
            <p className="text-xs font-bold text-slate-800">{item.summary}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
};

export const CompaniesPage = () => {
  const { user, enterWorkspace } = useAuth();
  const isPlatformAdmin = user?.role === 'ADMIN';
  const [companies, setCompanies] = useState<Array<Company & { counts?: { users: number; jobs: number; candidates: number; interviews?: number } }>>([]);
  const [form, setForm] = useState(emptyForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [workspaceTarget, setWorkspaceTarget] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setCompanies(await apiFetch<Array<Company & { counts?: { users: number; jobs: number; candidates: number; interviews?: number } }>>('/companies'));
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load companies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const createCompany = async () => {
    if (!form.name.trim() || !form.slug.trim() || !form.adminName.trim() || !form.adminEmail.trim() || form.adminPassword.length < 8) {
      setError('Company name, identifier, administrator name, email, and an 8+ character password are required.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const created = await apiFetch<Company>('/companies', {
        method: 'POST',
        body: JSON.stringify({ name: form.name.trim(), slug: form.slug.trim(), adminName: form.adminName.trim(), adminEmail: form.adminEmail.trim(), adminPassword: form.adminPassword }),
      });
      setCompanies((current) => [created, ...current]);
      setModalOpen(false);
      setForm(emptyForm);
      setSuccess('Company profile created.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create company.');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (company: Company) => {
    try {
      setError('');
      const updated = await apiFetch<Company>('/companies/' + company.id, {
        method: 'PATCH',
        body: JSON.stringify({ status: company.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }),
      });
      setCompanies((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSuccess('Company is now ' + updated.status.toLowerCase() + '.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update company status.');
    }
  };

  return (
    <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <SectionHeading
        eyebrow={isPlatformAdmin ? 'Platform administration' : 'Company administration'}
        title="Companies"
        description={isPlatformAdmin
          ? 'Manage company tenants across the BuildHire platform.'
          : 'Manage your company profile and company workspace.'}
        action={isPlatformAdmin
          ? <Button onClick={() => { setForm(emptyForm); setError(''); setModalOpen(true); }}>Add company</Button>
          : undefined}
      />

      {loading && <StateMessage kind="loading" title="Loading companies" description="Fetching all company workspaces." />}
      {error && <StateMessage kind="error" title="Company action failed" description={error} floating={modalOpen} />}
      {success && <StateMessage kind="success" title="Saved" description={success} />}

      <Card padded={false}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="border-b border-slate-100 bg-slate-50/80">
              <tr>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Company</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Status</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Users</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Jobs</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Candidates</th>
                <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wider text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr key={company.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-4">
                    <p className="text-sm font-black text-slate-950">{company.name}</p>
                    <p className="mt-1 text-[11px] font-semibold text-slate-400">{company.slug}</p>
                  </td>
                  <td className="px-4 py-4"><StatusPill value={company.status} /></td>
                  <td className="px-4 py-4 text-sm font-bold text-slate-700">{company.counts?.users ?? 0}</td>
                  <td className="px-4 py-4 text-sm font-bold text-slate-700">{company.counts?.jobs ?? 0}</td>
                  <td className="px-4 py-4 text-sm font-bold text-slate-700">{company.counts?.candidates ?? 0}</td>
                  <td className="space-x-2 px-4 py-4 text-right">
                    {isPlatformAdmin && company.status === 'ACTIVE' && (
                      <Button size="sm" variant="secondary" className="!size-9 !min-h-9 !p-0" title="Open workspace" aria-label="Open workspace" onClick={() => setWorkspaceTarget(company)}><Icon name="eye" size={15} /></Button>
                    )}
                    <Button size="sm" variant={company.status === 'ACTIVE' ? 'danger' : 'secondary'} className="!size-9 !min-h-9 !p-0" title={company.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} aria-label={company.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} onClick={() => void toggleStatus(company)}>
                      <Icon name={company.status === 'ACTIVE' ? 'lock' : 'check'} size={15} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!companies.length && !loading && <p className="p-10 text-center text-xs font-semibold text-slate-400">No companies yet.</p>}
        </div>
      </Card>

      {user?.role === 'COMPANY_ADMIN' && !user.actingAs && <AccessLogCard />}

      {workspaceTarget && isPlatformAdmin && (
        <EnterWorkspaceModal
          company={workspaceTarget}
          onClose={() => setWorkspaceTarget(null)}
          onEnter={async (input) => { await enterWorkspace(workspaceTarget.id, input); }}
        />
      )}

      {modalOpen && isPlatformAdmin && (
        <CompanyModal
          onClose={() => { if (!saving) setModalOpen(false); }}
          onSave={() => void createCompany()}
          form={form}
          setForm={setForm}
          saving={saving}
        />
      )}
    </section>
  );
};

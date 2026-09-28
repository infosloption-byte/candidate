import { useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import type { Company } from '../../domain/types';
import { SectionHeading } from '../../shared/components/SectionHeading';
import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { FormField } from '../../shared/components/FormField';
import { StateMessage } from '../../shared/components/StateMessage';
import { StatusPill } from '../../shared/components/StatusPill';
import { useFocusTrap } from '../../shared/hooks/useFocusTrap';
import { apiFetch } from '../../shared/lib/api';

interface CompanyForm {
  name: string;
  slug: string;
}

const emptyForm: CompanyForm = { name: '', slug: '' };

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
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button onClick={onSave} disabled={saving}>{saving ? 'Creating…' : 'Create company'}</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const CompaniesPage = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setCompanies(await apiFetch<Company[]>('/companies'));
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
    if (!form.name.trim() || !form.slug.trim()) {
      setError('Company name and identifier are required.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const created = await apiFetch<Company>('/companies', {
        method: 'POST',
        body: JSON.stringify({ name: form.name.trim(), slug: form.slug.trim() }),
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
        eyebrow="System administration"
        title="Companies"
        description="Each company is an isolated BuildHire tenant containing its jobs, candidates, interviews and company users."
        action={}
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
                  <td className="px-4 py-4 text-sm font-bold text-slate-700">{company.userCount ?? 0}</td>
                  <td className="px-4 py-4 text-sm font-bold text-slate-700">{company.jobCount ?? 0}</td>
                  <td className="px-4 py-4 text-sm font-bold text-slate-700">{company.candidateCount ?? 0}</td>
                  <td className="px-4 py-4 text-right">
                    <Button size="sm" variant={company.status === 'ACTIVE' ? 'danger' : 'secondary'} onClick={() => void toggleStatus(company)}>
                      {company.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!companies.length && !loading && <p className="p-10 text-center text-xs font-semibold text-slate-400">No companies yet.</p>}
        </div>
      </Card>

      {modalOpen && (
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

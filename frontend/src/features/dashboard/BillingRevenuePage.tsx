import { Card } from '../../shared/components/Card';
import { Icon } from '../../shared/components/Icon';

const items = [
  ['Revenue', 'No billing records connected', 'Connect the subscription/payment provider before showing MRR, ARR or collected revenue.', 'chart'],
  ['Payments', 'Payment transactions unavailable', 'A billing ledger or payment-provider connector is required to show successful, failed and refunded payments.', 'check'],
  ['Subscriptions', 'Subscription lifecycle unavailable', 'Plans, trials, upgrades, downgrades, renewals and cancellations need a billing data source.', 'refresh'],
  ['Invoices', 'Invoice statistics unavailable', 'Invoice generation, due dates, paid status and outstanding balances are not stored yet.', 'file'],
] as const;

export const BillingRevenuePage = () => (
  <section className="mx-auto max-w-7xl space-y-5 p-3 sm:p-6 lg:p-8">
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">Finance operations</p>
      <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Billing & revenue</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
        This is the platform finance workspace. The current BuildHire database has no payment, subscription or invoice records, so financial figures are intentionally not fabricated.
      </p>
    </div>

    <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-700"><Icon name="alert" size={18} /></div>
        <div>
          <p className="text-sm font-black text-amber-950">Billing integration is not connected yet</p>
          <p className="mt-1 text-xs leading-5 text-amber-800">
            The next platform layer should connect a provider such as Stripe or your chosen payment gateway and persist customers, subscriptions, invoices, transactions, refunds and webhook events.
          </p>
        </div>
      </div>
    </div>

    <div className="grid gap-3 sm:grid-cols-2">
      {items.map(([title, value, description, icon]) => (
        <Card key={title}>
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-700"><Icon name={icon} size={18} /></div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{title}</p>
              <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
              <p className="mt-1.5 text-xs leading-5 text-slate-500">{description}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>

    <Card>
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Recommended finance model</p>
      <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
        {['Plans & pricing', 'Customers / companies', 'Subscriptions & trials', 'Invoices & taxes', 'Payments & refunds', 'Webhook / reconciliation log'].map((item) => (
          <div key={item} className="rounded-xl bg-slate-50 px-3 py-2.5">{item}</div>
        ))}
      </div>
    </Card>
  </section>
);

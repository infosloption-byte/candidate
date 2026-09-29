import { useEffect, useState } from 'react';
import { useAuth } from '../../domain/authContext';

const minutesLeft = (until: string): number => Math.max(0, Math.ceil((new Date(until).getTime() - Date.now()) / 60_000));

/** Always-visible reminder that a platform administrator is working inside a customer's workspace. */
export const ActingBanner = () => {
  const { user, exitWorkspace, refreshUser } = useAuth();
  const acting = user?.actingAs ?? null;
  const [, tick] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!acting) return undefined;
    const interval = window.setInterval(() => tick((value) => value + 1), 30_000);
    // When the window ends the server silently drops the context; re-read the session to match it.
    const expiry = window.setTimeout(() => void refreshUser(), Math.max(0, new Date(acting.until).getTime() - Date.now()) + 1_000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(expiry);
    };
  }, [acting?.until]);

  if (!acting) return null;

  return (
    <div role="status" className={`flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs font-bold ${acting.mode === 'READ_WRITE' ? 'bg-amber-400 text-amber-950' : 'bg-cyan-300 text-slate-950'}`}>
      <span>
        Platform support · viewing <strong>{acting.companyName}</strong> · {acting.mode === 'READ_WRITE' ? 'write mode (changes are logged)' : 'read-only'} · {minutesLeft(acting.until)} min left
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={() => { setBusy(true); void exitWorkspace().finally(() => setBusy(false)); }}
        className="rounded-lg bg-slate-950 px-3 py-1 text-[11px] font-black text-white disabled:opacity-60"
      >
        {busy ? 'Leaving…' : 'Exit workspace'}
      </button>
    </div>
  );
};

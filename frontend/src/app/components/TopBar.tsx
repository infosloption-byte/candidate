import { useEffect, useRef, useState } from 'react';
import { Icon } from '../../shared/components/Icon';
import { useAuth } from '../../domain/authContext';
import { apiFetch } from '../../shared/lib/api';
import type { AppView } from './AppShell';
import type { User, UserRole } from '../../domain/types';

interface NotificationRecord {
  id: string;
  type: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

interface TopBarProps {
  role: UserRole;
  activeView: AppView;
  user: User;
  showDevelopmentRoleSelector: boolean;
  onOpenMobileNav: () => void;
  onRoleChange: (role: UserRole) => void;
  onLogout: () => void;
}

const titles: Record<AppView, string> = {
  dashboard: 'Dashboard',
  jobs: 'Jobs',
  candidates: 'Candidates',
  applications: 'Applications',
  interviews: 'Interviews',
  agencies: 'Agencies & Users',
  settings: 'Settings',
};

const roleLabels: Record<UserRole, string> = {
  ADMIN: 'Admin',
  AGENCY: 'Agency',
  INTERVIEWER: 'Interviewer',
  INTERVIEWEE: 'Interviewee',
};

export const TopBar = ({
  role,
  activeView,
  user,
  showDevelopmentRoleSelector,
  onOpenMobileNav,
  onRoleChange,
  onLogout,
}: TopBarProps) => {
  const { developmentMode } = useAuth();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  useEffect(() => {
    if (developmentMode) return;

    let cancelled = false;
    const loadNotifications = async () => {
      try {
        const result = await apiFetch<{ notifications: NotificationRecord[]; unreadCount: number }>('/notifications');
        if (!cancelled) {
          setNotifications(result.notifications);
          setUnreadCount(result.unreadCount);
        }
      } catch {
        // Notifications stay optional when the operational endpoint is unavailable.
      }
    };

    void loadNotifications();
    const interval = window.setInterval(() => void loadNotifications(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [developmentMode, user.id]);

  const markRead = async (notification: NotificationRecord) => {
    if (notification.readAt) return;
    try {
      await apiFetch('/notifications/' + notification.id + '/read', { method: 'PATCH', body: JSON.stringify({}) });
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item));
      setUnreadCount((current) => Math.max(0, current - 1));
    } catch {
      // Keep the notification visible when a read acknowledgement fails.
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 backdrop-blur-xl">
      <div className="flex min-h-[72px] items-center gap-3 px-3 sm:px-5 lg:px-7">
        <button type="button" onClick={onOpenMobileNav} aria-label="Open navigation" className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 lg:hidden">
          <Icon name="menu" size={19} />
        </button>

        <div className="min-w-0 flex-1">
          <div className="hidden items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 sm:flex">
            <span>Workspace</span>
            <Icon name="chevron-right" size={11} />
            <span className="text-slate-500">{titles[activeView]}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <h1 className="truncate text-[15px] font-extrabold tracking-[-0.01em] text-slate-950 sm:text-base">{titles[activeView]}</h1>
            <span className="hidden rounded-full border border-cyan-100 bg-cyan-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-cyan-700 md:inline-flex">
              {roleLabels[role]}
            </span>
          </div>
        </div>

        {showDevelopmentRoleSelector && (
          <div className="hidden items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 sm:flex">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Dev role</span>
            <select value={role} onChange={(event) => onRoleChange(event.target.value as UserRole)} className="bg-transparent text-[11px] font-bold text-slate-700 outline-none">
              {(Object.keys(roleLabels) as UserRole[]).map((item) => <option key={item} value={item}>{roleLabels[item]}</option>)}
            </select>
          </div>
        )}

        <div className="relative">
          <button type="button" onClick={() => setNotificationsOpen((current) => !current)} aria-label={unreadCount > 0 ? unreadCount + ' unread notifications' : 'Notifications'} className="relative grid size-10 place-items-center rounded-xl border border-transparent text-slate-500 transition hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900">
            <Icon name="bell" size={18} />
            {unreadCount > 0 && <span className="absolute right-1 top-1 min-w-4 rounded-full bg-cyan-600 px-1 text-[9px] font-black leading-4 text-white shadow-sm">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
          {notificationsOpen && (
            <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[350px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
                <div><p className="text-xs font-extrabold text-slate-950">Notifications</p><p className="mt-0.5 text-[10px] text-slate-400">{unreadCount} unread</p></div>
                <button type="button" onClick={() => setNotificationsOpen(false)} className="text-xs font-bold text-slate-400 hover:text-slate-700">Close</button>
              </div>
              <div className="max-h-80 overflow-auto p-1.5">
                {notifications.length === 0 ? (
                  <p className="px-3 py-10 text-center text-xs text-slate-400">No notifications yet.</p>
                ) : notifications.slice(0, 8).map((notification) => (
                  <button key={notification.id} type="button" onClick={() => void markRead(notification)} className={`block w-full rounded-xl px-3 py-3 text-left transition hover:bg-slate-50 ${notification.readAt ? 'opacity-60' : ''}`}>
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs font-bold text-slate-900">{notification.title}</p>
                      {!notification.readAt && <span className="mt-1 size-1.5 shrink-0 rounded-full bg-cyan-600" />}
                    </div>
                    <p className="mt-1 text-[11px] leading-5 text-slate-500">{notification.message}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{new Date(notification.createdAt).toLocaleString()}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div ref={profileMenuRef} className="relative">
          <button type="button" onClick={() => setProfileOpen((current) => !current)} aria-expanded={profileOpen} aria-haspopup="menu" className="flex items-center gap-2 rounded-xl border border-transparent px-1.5 py-1.5 text-left transition hover:border-slate-200 hover:bg-slate-50">
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-950 text-[11px] font-extrabold text-white shadow-sm">
              {role === 'INTERVIEWEE' ? 'IN' : role === 'INTERVIEWER' ? 'IR' : role === 'AGENCY' ? 'AG' : 'AD'}
            </div>
            <div className="hidden min-w-0 lg:block">
              <p className="max-w-44 truncate text-xs font-extrabold text-slate-900">{user.name}</p>
              <p className="max-w-44 truncate text-[10px] text-slate-500">{user.email}</p>
            </div>
            <Icon name="chevron-right" size={14} className={`hidden text-slate-400 transition-transform lg:block ${profileOpen ? 'rotate-90' : ''}`} />
          </button>
          {profileOpen && (
            <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl shadow-slate-900/10">
              <div className="rounded-xl bg-slate-50 px-3 py-3">
                <p className="truncate text-xs font-extrabold text-slate-950">{user.name}</p>
                <p className="mt-0.5 truncate text-[10px] text-slate-500">{user.email}</p>
                <span className="mt-2 inline-flex rounded-full border border-cyan-100 bg-cyan-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-cyan-700">{roleLabels[role]}</span>
              </div>
              <button type="button" onClick={() => { setProfileOpen(false); onLogout(); }} className="mt-1.5 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950">
                <span>Sign out</span>
                <span className="text-slate-400">↗</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

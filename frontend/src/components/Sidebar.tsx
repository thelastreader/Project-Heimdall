import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Activity, CircleUserRound, HeartPulse, History, LayoutDashboard, LogOut, MoreHorizontal, ScanSearch, Settings, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../auth/useAuth';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/analysis', icon: ScanSearch, label: 'New Analysis' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/patients', icon: Users, label: 'Patients' },
];

type SidebarProps = { collapsed: boolean; mobileOpen: boolean; onToggleCollapse: () => void; onCloseMobile: () => void };

export default function Sidebar({ collapsed, mobileOpen, onToggleCollapse, onCloseMobile }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!profileOpen) return;
    const onPointerDown = (event: MouseEvent) => { if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false); };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setProfileOpen(false); profileButtonRef.current?.focus(); }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onEscape);
    return () => { document.removeEventListener('mousedown', onPointerDown); document.removeEventListener('keydown', onEscape); };
  }, [profileOpen]);

  async function handleLogout() {
    try { await logout(); navigate('/login', { replace: true }); }
    catch { toast.error('Could not end the session. Please try again.'); }
  }

  useEffect(() => {
    if (!mobileOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onCloseMobile(); };
    document.addEventListener('keydown', closeOnEscape);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', closeOnEscape); document.body.style.overflow = ''; };
  }, [mobileOpen, onCloseMobile]);

  return <>
    <button className={`drawer-backdrop ${mobileOpen ? 'is-open' : ''}`} aria-label="Close navigation" onClick={onCloseMobile} tabIndex={mobileOpen ? 0 : -1} />
    <aside className={`sidebar ${collapsed ? 'is-collapsed' : ''} ${mobileOpen ? 'is-open' : ''}`} aria-label="Main navigation">
      <div className="px-5 py-6 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 shrink-0 rounded-[14px] bg-gradient-to-br from-primary-500 to-emerald-500 flex items-center justify-center shadow-md shadow-primary-500/20">
            <HeartPulse size={20} className="text-white" aria-hidden="true" />
          </div>
          {!collapsed && <div className="min-w-0"><h1 className="text-[16px] font-bold tracking-tight text-white">TB<span className="text-gradient"> Detect</span></h1><p className="text-[10px] text-slate-500 font-medium">AI-assisted screening</p></div>}
        </div>
        <button className="nav-more" onClick={onToggleCollapse} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}><MoreHorizontal size={19} /></button>
        <button className="nav-close" onClick={onCloseMobile} aria-label="Close navigation"><X size={18} /></button>
      </div>

      <nav className="flex-1 px-3 mt-2" aria-label="Primary">
        {!collapsed && <p className="text-[10px] text-slate-500 uppercase tracking-[0.12em] font-semibold px-3 mb-3">Workspace</p>}
        <div className="space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to || (to !== '/dashboard' && location.pathname.startsWith(to));
            return <NavLink key={to} to={to} title={collapsed ? label : undefined} aria-label={collapsed ? label : undefined} onClick={onCloseMobile} className={`sidebar-link ${active ? 'active' : ''}`}>
              <Icon size={18} aria-hidden="true" /><span className={collapsed ? 'sr-only' : ''}>{label}</span>
            </NavLink>;
          })}
        </div>
        {!collapsed && <div className="mt-8 mx-2 rounded-xl border border-[#e2edf2] bg-[#f5fafc] p-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.12em] font-semibold mb-2">Patient tracking</p>
          <p className="text-[12px] text-slate-500 leading-relaxed">Open a patient from the dashboard to view their scan progression.</p>
        </div>}
      </nav>

      <div className="sidebar-account px-5 py-5 border-t border-[#e8eff3]">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0"><div className="w-8 h-8 rounded-xl bg-[#e7f8f5] flex items-center justify-center"><Activity size={15} className="text-emerald-400" /></div><div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 glow-dot" /></div>
          {!collapsed && <div><p className="text-[12px] font-medium text-slate-500">System</p><p className="text-[11px] text-emerald-400 font-semibold">Operational</p></div>}
        </div>
        <div className="profile-area" ref={profileRef}>
          <button ref={profileButtonRef} type="button" className="profile-trigger" onClick={() => setProfileOpen(value => !value)} aria-haspopup="menu" aria-expanded={profileOpen} aria-label="Open account menu" title={collapsed ? 'Account menu' : undefined}>
            <span className="profile-avatar"><CircleUserRound size={17} /></span>{!collapsed && <span className="profile-trigger-label">Account</span>}
          </button>
          {profileOpen && <div className="profile-menu" role="menu" aria-label="Account menu">
            <div className="profile-menu-user"><strong>{user?.first_name} {user?.last_name}</strong><span>@{user?.username}</span>{user?.role === 'admin' && <em>Administrator</em>}</div>
            <button role="menuitem" onClick={() => { setProfileOpen(false); toast('Settings are not available yet.'); }}><Settings size={15} />Settings</button>
            <button role="menuitem" className="logout-item" onClick={() => void handleLogout()}><LogOut size={15} />Log out</button>
          </div>}
        </div>
      </div>
    </aside>
  </>;
}

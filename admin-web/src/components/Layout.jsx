import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

const nav = [
  { to: '/', label: 'Dashboard', icon: '📊', end: true },
  { to: '/drivers', label: 'Conductores', icon: '🚗' },
  { to: '/b2g', label: 'Auditoría B2G', icon: '🏛️' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-ink-600 bg-ink-800 p-5">
        <div className="mb-8">
          <h1 className="text-xl font-extrabold text-brand">ChaskiRutas</h1>
          <p className="text-xs text-slate-500">Panel Administrativo</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  isActive ? 'bg-brand text-white' : 'text-slate-300 hover:bg-ink-700'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-4 border-t border-ink-600 pt-4">
          <p className="text-sm font-semibold text-slate-200">{user?.fullName || 'Usuario'}</p>
          <p className="mb-3 text-xs text-slate-500">{(user?.roles || []).join(', ')}</p>
          <button
            onClick={handleLogout}
            className="w-full rounded-xl border border-ink-600 px-3 py-2 text-sm text-slate-300 hover:bg-ink-700"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}

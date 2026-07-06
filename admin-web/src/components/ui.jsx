// Componentes UI reutilizables (Tailwind puro, sin dependencia de shadcn).

export function Card({ children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-ink-600 bg-ink-700/60 p-5 shadow-lg ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, sub, accent = 'text-brand' }) {
  return (
    <Card>
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-extrabold ${accent}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </Card>
  );
}

export function Spinner({ label = 'Cargando…' }) {
  return (
    <div className="flex items-center gap-3 text-slate-400">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      {label}
    </div>
  );
}

export function Badge({ children, tone = 'gray' }) {
  const tones = {
    green: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    red: 'bg-red-500/15 text-red-400 border-red-500/30',
    amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    gray: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  };
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tones[tone] || tones.gray}`}>
      {children}
    </span>
  );
}

export function Button({ children, onClick, disabled, tone = 'brand', className = '' }) {
  const tones = {
    brand: 'bg-brand hover:bg-brand-dark text-white',
    green: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    red: 'bg-red-600 hover:bg-red-500 text-white',
    ghost: 'bg-transparent border border-ink-600 hover:bg-ink-600 text-slate-200',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-40 ${tones[tone]} ${className}`}
    >
      {children}
    </button>
  );
}

// Traduce el estado del conductor a un tono de Badge.
export function driverStatusTone(status) {
  if (status === 'ACTIVO') return 'green';
  if (status === 'SUSPENDIDO' || status === 'BAJA') return 'red';
  return 'amber';
}

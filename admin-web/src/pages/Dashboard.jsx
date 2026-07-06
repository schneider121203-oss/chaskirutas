import { useEffect, useState } from 'react';
import { api, apiError } from '../api.js';
import { StatCard, Card, Spinner } from '../components/ui.jsx';

const money = (n) => `S/ ${Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get('/admin/dashboard')
      .then((res) => setData(res.data))
      .catch((e) => setError(apiError(e, 'No se pudo cargar el dashboard')));
  }, []);

  if (error) return <p className="text-red-400">{error}</p>;
  if (!data) return <Spinner />;

  const fin = data.financials || {};

  return (
    <div>
      <h2 className="mb-1 text-2xl font-extrabold">Dashboard</h2>
      <p className="mb-6 text-sm text-slate-400">Métricas operativas y financieras en tiempo real.</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Viajes totales" value={data.tripsTotal ?? 0} />
        <StatCard label="Conductores activos" value={data.activeDrivers ?? 0} accent="text-emerald-400" />
        <StatCard label="Rutas activas" value={data.activeRoutes ?? 0} accent="text-sky-400" />
        <StatCard label="Incidentes SOS" value={data.sosIncidents ?? 0} accent="text-red-400" />
      </div>

      <h3 className="mb-3 mt-8 text-lg font-bold">Finanzas</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-400">Ingreso bruto</p>
          <p className="mt-2 text-2xl font-extrabold text-brand">{money(fin.grossRevenue)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">Comisión plataforma (15%)</p>
          <p className="mt-2 text-2xl font-extrabold text-emerald-400">{money(fin.platformCommission)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">Pagos netos a conductores</p>
          <p className="mt-2 text-2xl font-extrabold text-sky-400">{money(fin.netPayouts)}</p>
        </Card>
      </div>
    </div>
  );
}

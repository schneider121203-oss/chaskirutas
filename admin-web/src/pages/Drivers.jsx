import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, apiError } from '../api.js';
import { Card, Spinner, Badge, driverStatusTone } from '../components/ui.jsx';

export default function Drivers() {
  const [drivers, setDrivers] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get('/admin/drivers')
      .then((res) => setDrivers(res.data))
      .catch((e) => setError(apiError(e, 'No se pudieron cargar los conductores')));
  }, []);

  if (error) return <p className="text-red-400">{error}</p>;
  if (!drivers) return <Spinner />;

  return (
    <div>
      <h2 className="mb-1 text-2xl font-extrabold">Conductores</h2>
      <p className="mb-6 text-sm text-slate-400">
        Revisa y activa conductores aprobando sus documentos (DNI, Licencia, SOAT, CITV, Tarjeta de Propiedad).
      </p>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink-600 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3">Nombre</th>
              <th className="px-5 py-3">DNI</th>
              <th className="px-5 py-3">Teléfono</th>
              <th className="px-5 py-3">Formalización</th>
              <th className="px-5 py-3">Estado</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {drivers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                  No hay conductores registrados aún.
                </td>
              </tr>
            )}
            {drivers.map((d) => (
              <tr key={d.userId} className="border-b border-ink-700/50 hover:bg-ink-700/40">
                <td className="px-5 py-3 font-semibold">{d.user?.fullName || '—'}</td>
                <td className="px-5 py-3 text-slate-400">{d.user?.dni || '—'}</td>
                <td className="px-5 py-3 text-slate-400">{d.user?.phoneE164 || '—'}</td>
                <td className="px-5 py-3 text-slate-400">{d.formalizationPct ?? 0}%</td>
                <td className="px-5 py-3">
                  <Badge tone={driverStatusTone(d.status)}>{d.status}</Badge>
                </td>
                <td className="px-5 py-3 text-right">
                  <Link to={`/drivers/${d.userId}`} className="font-semibold text-brand hover:underline">
                    Revisar →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

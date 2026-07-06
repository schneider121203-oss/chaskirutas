import { useEffect, useState } from 'react';
import { api, apiError } from '../api.js';
import { Card, Spinner } from '../components/ui.jsx';

// Renderiza una lista de objetos (filas de una vista SQL) como tabla genérica.
function DynamicTable({ rows }) {
  if (!rows || rows.length === 0) return <p className="text-sm text-slate-500">Sin datos.</p>;
  const cols = Object.keys(rows[0]);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-ink-600 text-xs uppercase text-slate-500">
          <tr>
            {cols.map((c) => (
              <th key={c} className="px-3 py-2 whitespace-nowrap">{c.replace(/_/g, ' ')}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-ink-700/50">
              {cols.map((c) => (
                <td key={c} className="px-3 py-2 whitespace-nowrap text-slate-300">{String(row[c] ?? '—')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function B2G() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get('/admin/b2g/reports')
      .then((res) => setData(res.data))
      .catch((e) => setError(apiError(e, 'No se pudo cargar el reporte B2G')));
  }, []);

  if (error) return <p className="text-red-400">{error}</p>;
  if (!data) return <Spinner />;

  const audits = data.audits || {};

  return (
    <div>
      <h2 className="mb-1 text-2xl font-extrabold">Auditoría B2G</h2>
      <p className="mb-6 text-sm text-slate-400">
        Trazabilidad y cumplimiento legal para presentación a la ATU / MTC.
      </p>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm text-slate-400">Último convenio de intercambio de datos</p>
          <p className="mt-1 font-semibold text-slate-100">{audits.lastDataSharingAgreement || '—'}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">Jurisdicciones activas</p>
          <p className="mt-1 text-2xl font-extrabold text-brand">{audits.activeJurisdictionsCount ?? '—'}</p>
        </Card>
      </div>

      <Card className="mb-6">
        <h3 className="mb-3 font-bold">Cumplimiento vehicular (SOAT / CITV)</h3>
        <DynamicTable rows={data.compliance} />
      </Card>

      <Card>
        <h3 className="mb-3 font-bold">Demanda por ruta (últimos 30 días)</h3>
        <DynamicTable rows={data.routeDemand30d} />
      </Card>
    </div>
  );
}

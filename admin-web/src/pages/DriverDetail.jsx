import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, apiError } from '../api.js';
import { Card, Spinner, Badge, Button, driverStatusTone } from '../components/ui.jsx';

const DOC_LABELS = {
  DNI: 'DNI',
  LICENCIA: 'Licencia de conducir',
  SOAT: 'SOAT',
  REVISION_TECNICA: 'CITV (Revisión Técnica)',
  TARJETA_PROPIEDAD: 'Tarjeta de Propiedad',
  TUC: 'TUC',
  ANTECEDENTES: 'Antecedentes',
  DECLARACION_JURADA: 'Declaración Jurada TUC',
  OTRO: 'Otro',
};

// Etiqueta legible de un documento (detecta la Declaración Jurada por su número).
function docLabel(doc) {
  if (doc.documentNumber === 'DJ-TUC') return 'Declaración Jurada TUC';
  return DOC_LABELS[doc.kind] || doc.kind;
}

export default function DriverDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/admin/drivers/${id}`);
      setData(res.data);
    } catch (e) {
      setError(apiError(e, 'No se pudo cargar el conductor'));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const verifyDoc = async (docId, isVerified) => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await api.patch(`/admin/documents/${docId}/verify`, { isVerified });
      if (res.data.driverActivated) setNotice('✅ ¡Conductor activado! Todos los documentos verificados.');
      await load();
    } catch (e) {
      setError(apiError(e, 'No se pudo actualizar el documento'));
    } finally {
      setBusy(false);
    }
  };

  const approveAll = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await api.patch(`/admin/drivers/${id}/approve-all`);
      if (res.data.driverActivated) {
        setNotice('✅ ¡Conductor activado! Todos los documentos fueron aprobados.');
      } else {
        const missing = (res.data.missing || []).map((k) => DOC_LABELS[k] || k).join(', ');
        setNotice(`⚠️ Documentos aprobados, pero faltan por cargar: ${missing || '—'}`);
      }
      await load();
    } catch (e) {
      setError(apiError(e, 'No se pudo aprobar todo'));
    } finally {
      setBusy(false);
    }
  };

  if (error) return <p className="text-red-400">{error}</p>;
  if (!data) return <Spinner />;

  const { driver, vehicle, documents = [] } = data;
  const user = driver?.user || {};
  const veh = vehicle || {};

  return (
    <div>
      <Link to="/drivers" className="text-sm text-slate-400 hover:text-slate-200">← Volver a conductores</Link>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold">{user.fullName || 'Conductor'}</h2>
          <p className="text-sm text-slate-400">DNI {user.dni || '—'} · {user.phoneE164 || '—'}</p>
        </div>
        <Badge tone={driverStatusTone(driver?.status)}>{driver?.status}</Badge>
      </div>

      {notice && <p className="mt-4 rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{notice}</p>}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Info + vehículo */}
        <Card>
          <h3 className="mb-3 font-bold">Vehículo</h3>
          {veh.v_plate || veh.plate ? (
            <ul className="space-y-1 text-sm text-slate-300">
              <li>Placa: <b>{veh.v_plate || veh.plate}</b></li>
              <li>Marca/Modelo: {veh.v_brand || veh.brand} {veh.v_model || veh.model}</li>
              <li>Año: {veh.v_year || veh.year || '—'}</li>
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Sin vehículo registrado.</p>
          )}
          <h3 className="mb-3 mt-6 font-bold">Formalización</h3>
          <div className="h-2 w-full overflow-hidden rounded-full bg-ink-600">
            <div className="h-full bg-brand" style={{ width: `${driver?.formalizationPct || 0}%` }} />
          </div>
          <p className="mt-1 text-xs text-slate-500">{driver?.formalizationPct || 0}% · Paso {driver?.formalizationStep || 0} de 6</p>
        </Card>

        {/* Documentos */}
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold">Documentos ({documents.length})</h3>
            <Button tone="green" onClick={approveAll} disabled={busy || driver?.status === 'ACTIVO'}>
              ✔ Aprobar todo y activar
            </Button>
          </div>

          {documents.length === 0 && <p className="text-sm text-slate-500">El conductor aún no ha cargado documentos.</p>}

          <ul className="space-y-2">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between rounded-xl border border-ink-600 bg-ink-800/50 px-4 py-3">
                <div>
                  <p className="font-semibold">{docLabel(doc)}</p>
                  <p className="text-xs text-slate-500">N° {doc.documentNumber || '—'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={doc.isVerified ? 'green' : 'amber'}>
                    {doc.isVerified ? 'Verificado' : 'Pendiente'}
                  </Badge>
                  {doc.fileUrl && (
                    <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-sky-400 hover:underline">
                      Ver archivo
                    </a>
                  )}
                  {!doc.isVerified ? (
                    <Button tone="green" onClick={() => verifyDoc(doc.id, true)} disabled={busy}>Aprobar</Button>
                  ) : (
                    <Button tone="ghost" onClick={() => verifyDoc(doc.id, false)} disabled={busy}>Revocar</Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

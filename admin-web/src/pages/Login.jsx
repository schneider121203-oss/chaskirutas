import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { apiError } from '../api.js';
import { Card, Button } from '../components/ui.jsx';

export default function Login() {
  const { user, sendOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();

  const [phone, setPhone] = useState('+51900000000');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [devCode, setDevCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (user) {
    navigate('/', { replace: true });
    return null;
  }

  const handleSend = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await sendOtp(phone);
      setDevCode(res?.devCode || null);
      setStep('otp');
    } catch (e) {
      setError(apiError(e, 'No se pudo enviar el código'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError(null);
    setLoading(true);
    try {
      await verifyOtp(phone, code);
      navigate('/', { replace: true });
    } catch (e) {
      setError(e.message?.includes('acceso al panel') ? e.message : apiError(e, 'Código inválido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-extrabold text-brand">ChaskiRutas</h1>
        <p className="mb-6 text-sm text-slate-400">Panel Administrativo — acceso ADMIN / OPERADOR / SUPERVISOR</p>

        {step === 'phone' && (
          <div className="space-y-4">
            <label className="block text-sm text-slate-300">
              Teléfono (formato +51…)
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-xl border border-ink-600 bg-ink-800 px-4 py-3 text-slate-100 outline-none focus:border-brand"
                placeholder="+51900000000"
              />
            </label>
            <Button onClick={handleSend} disabled={loading} className="w-full">
              {loading ? 'Enviando…' : 'Enviar código'}
            </Button>
          </div>
        )}

        {step === 'otp' && (
          <div className="space-y-4">
            {devCode && (
              <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
                Código de desarrollo: <b>{devCode}</b>
              </p>
            )}
            <label className="block text-sm text-slate-300">
              Código OTP
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mt-1 w-full rounded-xl border border-ink-600 bg-ink-800 px-4 py-3 text-center text-2xl tracking-[0.5em] text-slate-100 outline-none focus:border-brand"
                placeholder="1234"
                maxLength={6}
              />
            </label>
            <Button onClick={handleVerify} disabled={loading} className="w-full">
              {loading ? 'Verificando…' : 'Ingresar'}
            </Button>
            <button onClick={() => setStep('phone')} className="w-full text-xs text-slate-500 hover:text-slate-300">
              ← Cambiar teléfono
            </button>
          </div>
        )}

        {error && <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
      </Card>
    </div>
  );
}

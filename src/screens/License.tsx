import React, { useEffect, useState } from 'react';
import { fetchLicenseStatus, activateLicense, type LicenseStatus } from '../services/license';
import { getDeviceId } from '../utils/deviceId';

export default function LicenseScreen() {
  const [state, setState] = useState<LicenseStatus|undefined>();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string|undefined>();
  const [activating, setActivating] = useState(false);
  const [keyInput, setKeyInput] = useState('');

  async function load() {
    setErr(undefined); setLoading(true);
    try {
      const s = await fetchLicenseStatus();
      setState(s);
    } catch (e:any) {
      setErr(e?.message || 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }

  async function onActivate(e: React.FormEvent) {
    e.preventDefault(); setErr(undefined); setActivating(true);
    try {
      await activateLicense(keyInput);
      setKeyInput('');
      await load();
    } catch (e:any) {
      setErr(e?.message || 'Activation error');
    } finally {
      setActivating(false);
    }
  }

  useEffect(() => { load(); }, []);
  const deviceId = getDeviceId();

  return (
    <div style={{ padding: 20, color:'#eaeaea' }}>
      <h2>Compte & licence</h2>
      {loading && <p>Chargement…</p>}
      {err && <p style={{color:'#ff6b6b'}}>Erreur: {err} <button onClick={load}>Réessayer</button></p>}

      <section style={card}>
        <h3>Clé de licence</h3>
        <p style={{opacity:.85}}>
          {state?.hasLicense ? (state.licenseKeyMasked ?? '—') : 'Aucune licence détectée'}
        </p>
        <form onSubmit={onActivate} style={{ display:'flex', gap:8, marginTop:10 }}>
          <input
            value={keyInput}
            onChange={e=>setKeyInput(e.target.value)}
            placeholder="PM-XXXX-XXXX-XXXX"
            style={input}
          />
          <button disabled={activating} type="submit" style={btnPrimary}>
            {activating ? 'Activation…' : 'Activer'}
          </button>
        </form>
      </section>

      <section style={card}>
        <h3>Type de licence</h3>
        <p>Plan : <b>{state?.plan ?? '—'}</b></p>
        <p>Statut : <Badge status={state?.status} /></p>
        <p>Échéance : {state?.expiresAt ? new Date(state.expiresAt).toLocaleDateString() : '—'}</p>
        <p>Appareils : {state?.activations ? `${state.activations.count}/${state.activations.max}` : '—'}</p>
      </section>

      <section style={card}>
        <h3>Empreinte appareil</h3>
        <p style={{fontFamily:'monospace'}}>{deviceId}</p>
        <small style={{opacity:.7}}>
          Identifiant local utilisé pour lier la licence à cet appareil.
        </small>
      </section>
    </div>
  );
}

function Badge({ status }: { status?: string }) {
  const color = status==='active' ? '#2ecc71'
    : status==='expired' ? '#e67e22'
    : status==='revoked' ? '#e74c3c'
    : '#7f8c8d';
  return <span style={{ background:color, color:'#000', padding:'2px 8px', borderRadius:6 }}>{status ?? '—'}</span>;
}

const card: React.CSSProperties = { background:'#111', border:'1px solid #222', borderRadius:12, padding:16, margin:'12px 0' };
const input: React.CSSProperties = { flex:1, padding:'10px 12px', borderRadius:10, border:'1px solid #333', background:'#0b0b0b', color:'#eaeaea' };
const btnPrimary: React.CSSProperties = { padding:'10px 14px', borderRadius:10, border:'1px solid #444', background:'#3b82f6', color:'#fff', cursor:'pointer' };

import React, { useState, useEffect } from 'react';
import { signInWithMagicLink, verifyEmailOtp, setSessionFromDeepLink, onAuth, signOut } from '../lib/auth';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [status, setStatus] = useState<'idle'|'sending'|'sent'|'verifying'|'ok'|'error'>('idle');
  const [err, setErr] = useState<string|undefined>();
  const [logged, setLogged] = useState(false);

  useEffect(() => onAuth(setLogged), []);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault(); setErr(undefined); setStatus('sending');
    try {
      await signInWithMagicLink(email.trim());
      setStatus('sent');
    } catch (e:any) { setErr(e.message||'Erreur'); setStatus('error'); }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault(); setErr(undefined); setStatus('verifying');
    try {
      await verifyEmailOtp(email.trim(), otp.trim());
      setStatus('ok');
    } catch (e:any) { setErr(e.message||'Erreur'); setStatus('error'); }
  }

  // Deep-link manuel (coller l’URL si l’app ne capte pas automatiquement)
  async function pasteDeepLink(url: string) {
    setErr(undefined);
    const s = await setSessionFromDeepLink(url);
    if (!s) setErr('Lien invalide');
  }

  return (
    <div style={wrap}>
      <h2>Authentification</h2>
      {logged ? (
        <div style={box}>
          <p>Connecté.</p>
          <button onClick={() => signOut()}>Se déconnecter</button>
        </div>
      ) : (
        <>
          <form onSubmit={sendLink} style={box}>
            <h3>Connexion par email (Magic Link)</h3>
            <input style={inp} type="email" placeholder="email@exemple.com" value={email} onChange={e=>setEmail(e.target.value)} required />
            <button type="submit" disabled={!email || status==='sending'}>Envoyer le lien</button>
            {status==='sent' && <small>Vérifie ta boîte mail. Clique le lien (ou utilise le code ci-dessous).</small>}
          </form>

          <form onSubmit={verifyCode} style={box}>
            <h3>Ou saisis le code OTP</h3>
            <input style={inp} placeholder="Code à 6 chiffres" value={otp} onChange={e=>setOtp(e.target.value)} />
            <button type="submit" disabled={!email || !otp || status==='verifying'}>Valider le code</button>
          </form>

          <div style={box}>
            <h3>Ou colle l’URL de deep-link</h3>
            <small>Ex: pm://auth#access_token=...&refresh_token=...</small>
            <button onClick={async ()=>{
              const url = prompt('Colle ici le lien reçu');
              if (url) await pasteDeepLink(url);
            }}>Coller le lien</button>
          </div>

          {err && <p style={{color:'#ff6b6b'}}>Erreur: {err}</p>}
        </>
      )}
    </div>
  );
}

const wrap: React.CSSProperties = { padding: 20, color:'#eaeaea' };
const box: React.CSSProperties  = { background:'#111', border:'1px solid #222', borderRadius:12, padding:16, margin:'12px 0', display:'flex', gap:8, flexDirection:'column' };
const inp: React.CSSProperties  = { padding:'10px 12px', borderRadius:10, border:'1px solid #333', background:'#0b0b0b', color:'#eaeaea' };

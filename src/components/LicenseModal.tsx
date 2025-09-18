import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { LicenseStatus } from '../services/licenseClient';

interface LicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  status?: LicenseStatus;
  initialEmail?: string;
  initialLicenseKey?: string;
  maskedDeviceId?: string;
  submitting?: boolean;
  resetInProgress?: boolean;
  error?: string | null;
  message?: string | null;
  onSubmit: (email: string, licenseKey: string) => Promise<void> | void;
  onRequestReset: (email: string, licenseKey: string) => Promise<void> | void;
}

const STATUS_LABELS: Record<LicenseStatus, string> = {
  active: 'Licence active',
  invalid: 'Licence invalide',
  deactivated: 'Licence désactivée',
  unregistered: 'Aucune licence enregistrée',
};

const STATUS_STYLES: Record<LicenseStatus, string> = {
  active: 'bg-emerald-500/20 border border-emerald-400 text-emerald-300',
  invalid: 'bg-red-500/20 border border-red-400 text-red-200',
  deactivated: 'bg-amber-500/20 border border-amber-400 text-amber-200',
  unregistered: 'bg-white/10 border border-white/30 text-white/70',
};

export function LicenseModal({
  isOpen,
  onClose,
  status = 'unregistered',
  initialEmail = '',
  initialLicenseKey = '',
  maskedDeviceId,
  submitting = false,
  resetInProgress = false,
  error,
  message,
  onSubmit,
  onRequestReset,
}: LicenseModalProps) {
  const [email, setEmail] = useState(initialEmail);
  const [licenseKey, setLicenseKey] = useState(initialLicenseKey);

  useEffect(() => {
    if (isOpen) {
      setEmail(initialEmail);
      setLicenseKey(initialLicenseKey);
    }
  }, [isOpen, initialEmail, initialLicenseKey]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit(email.trim(), licenseKey.trim());
  };

  const handleReset = async () => {
    await onRequestReset(email.trim(), licenseKey.trim());
  };

  const statusLabel = STATUS_LABELS[status];
  const statusClass = STATUS_STYLES[status];

  const disableActions = submitting || resetInProgress;
  const canRequestReset = Boolean(email.trim()) && Boolean(licenseKey.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="glass-card relative w-full max-w-xl border border-white/20 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-white/70 hover:text-white transition-colors"
          aria-label="Fermer la fenêtre de licence"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="px-8 py-6">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-white">Gestion de la licence</h2>
            <p className="text-sm text-white/70">
              Activez votre licence ou demandez une réinitialisation pour votre appareil.
            </p>
            <div className={`mt-3 inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${statusClass}`}>
              {statusLabel}
            </div>
            {maskedDeviceId && (
              <p className="mt-2 text-xs text-white/60">
                Empreinte de l'appareil&nbsp;: <span className="font-semibold text-white">{maskedDeviceId}</span>
              </p>
            )}
          </div>

          {message && (
            <div className="mb-4 rounded-lg border border-emerald-400/70 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              {message}
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-lg border border-red-400/70 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="license-email" className="block text-sm font-medium text-white/80">
                Adresse email
              </label>
              <input
                id="license-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/40 focus:border-white/60 focus:outline-none"
                placeholder="prenom.nom@example.com"
              />
            </div>

            <div>
              <label htmlFor="license-key" className="block text-sm font-medium text-white/80">
                Clé de licence
              </label>
              <input
                id="license-key"
                name="licenseKey"
                type="text"
                required
                value={licenseKey}
                onChange={(event) => setLicenseKey(event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/40 focus:border-white/60 focus:outline-none"
                placeholder="XXXX-XXXX-XXXX-XXXX"
              />
              <p className="mt-1 text-xs text-white/50">
                Votre clé reste associée à cet appareil via une empreinte sécurisée.
              </p>
            </div>

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between sm:pt-4">
              <button
                type="button"
                onClick={handleReset}
                disabled={disableActions || !canRequestReset}
                className="glass-button-secondary rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resetInProgress ? 'Demande en cours…' : 'Demander réinitialisation'}
              </button>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="glass-button-secondary rounded-lg px-4 py-2 text-sm font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={disableActions}
                  className="glass-button rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Enregistrement…' : 'Enregistrer la licence'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

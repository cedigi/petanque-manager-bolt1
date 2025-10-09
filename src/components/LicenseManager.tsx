import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchLicenseDetails,
  submitLicenseCredentials,
  requestLicenseReset,
  type LicenseDetails,
  type LicenseStatus,
  getHashedDeviceId,
} from '../services/licenseClient';
import { onAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import AuthScreen from '../screens/Auth';
import { LicenseModal } from './LicenseModal';

function maskIdentifier(value?: string): string {
  if (!value) {
    return '—';
  }

  if (value.length <= 12) {
    return value;
  }

  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function formatLicenseKey(value?: string): string {
  if (!value) {
    return '—';
  }

  return value.replace(/\s+/g, '').toUpperCase();
}

const STATUS_BADGES: Record<LicenseStatus, string> = {
  active: 'bg-emerald-500/20 border border-emerald-400 text-emerald-200',
  invalid: 'bg-red-500/20 border border-red-400 text-red-200',
  deactivated: 'bg-amber-500/20 border border-amber-400 text-amber-200',
  unregistered: 'bg-white/10 border border-white/30 text-white/70',
};

const STATUS_TEXT: Record<LicenseStatus, string> = {
  active: 'Licence active',
  invalid: 'Licence invalide',
  deactivated: 'Licence désactivée',
  unregistered: 'Aucune licence détectée',
};

export function LicenseManager() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [showAuthScreen, setShowAuthScreen] = useState<boolean>(false);
  const [license, setLicense] = useState<LicenseDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [deviceHash, setDeviceHash] = useState<string>('');

  const loadLicense = useCallback(async () => {
    setLoading(true);
    setError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      const hashed = await getHashedDeviceId();
      setDeviceHash(hashed);
      setLicense(null);
      setLoading(false);
      return;
    }

    try {
      const details = await fetchLicenseDetails();
      setLicense(details);
      setDeviceHash(details.deviceHash);
    } catch (err) {
      const hashed = await getHashedDeviceId();
      setLicense({
        status: 'unregistered',
        deviceHash: hashed,
      });
      setDeviceHash(hashed);
      setError(err instanceof Error ? err.message : 'Impossible de charger la licence.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    void (async () => {
      const hashed = await getHashedDeviceId();
      if (active) {
        setDeviceHash((current) => current || hashed);
      }
    })();

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) {
        return;
      }
      setIsAuthenticated(!!session);
      if (session) {
        void loadLicense();
      } else {
        setLicense(null);
        setActionMessage(null);
        setActionError(null);
        setError(null);
        setLoading(false);
      }
    });

    onAuth((hasSession) => {
      if (!active) {
        return;
      }
      setIsAuthenticated(hasSession);
      if (hasSession) {
        setShowAuthScreen(false);
        setActionError(null);
        setActionMessage(null);
        void loadLicense();
      } else {
        setLicense(null);
        setActionError(null);
        setActionMessage(null);
        setError(null);
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [loadLicense]);

  const currentStatus: LicenseStatus = license?.status ?? 'unregistered';

  const maskedDevice = useMemo(() => maskIdentifier(license?.deviceHash ?? deviceHash), [license, deviceHash]);

  const handleSubmit = useCallback(
    async (email: string, licenseKey: string) => {
      if (!isAuthenticated) {
        setActionError('Veuillez vous connecter pour gérer votre licence.');
        setShowAuthScreen(true);
        return;
      }

      setIsSubmitting(true);
      setActionError(null);
      setActionMessage(null);

      try {
        const details = await submitLicenseCredentials(email, licenseKey);
        setLicense(details);
        setDeviceHash(details.deviceHash);
        setActionMessage(details.message ?? 'Licence enregistrée avec succès.');
        setModalOpen(false);
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : "Une erreur est survenue lors de l'enregistrement."
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [isAuthenticated]
  );

  const handleReset = useCallback(
    async (email: string, licenseKey: string) => {
      if (!isAuthenticated) {
        setActionError('Veuillez vous connecter pour demander une réinitialisation.');
        setShowAuthScreen(true);
        return;
      }
      if (!email || !licenseKey) {
        setActionError('Veuillez renseigner votre email et votre clé de licence.');
        return;
      }

      setIsResetting(true);
      setActionError(null);
      setActionMessage(null);

      try {
        const message = await requestLicenseReset(email, licenseKey);
        setActionMessage(message);
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : 'La demande de réinitialisation a échoué.'
        );
      } finally {
        setIsResetting(false);
      }
    },
    [isAuthenticated]
  );

  const handlePanelReset = useCallback(() => {
    if (!isAuthenticated) {
      setActionError('Veuillez vous connecter pour demander une réinitialisation.');
      setShowAuthScreen(true);
      return;
    }
    if (!license?.email || !license.licenseKey) {
      setActionError('Veuillez renseigner vos informations de licence pour demander une réinitialisation.');
      setModalOpen(true);
      return;
    }

    void handleReset(license.email, license.licenseKey);
  }, [handleReset, isAuthenticated, license]);

  const handleRefresh = useCallback(() => {
    if (!isAuthenticated) {
      setShowAuthScreen(true);
      return;
    }
    void loadLicense();
  }, [isAuthenticated, loadLicense]);

  useEffect(() => {
    if (modalOpen) {
      setActionError(null);
      setActionMessage(null);
    }
  }, [modalOpen]);

  const statusBadgeClass = isAuthenticated
    ? STATUS_BADGES[currentStatus]
    : 'bg-white/10 border border-white/30 text-white/70';
  const statusText = loading
    ? 'Chargement…'
    : isAuthenticated
    ? STATUS_TEXT[currentStatus]
    : 'Connexion requise';

  return (
    <section className="mx-6 mt-6">
      <div className="glass-card border border-white/20 px-6 py-6 shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">Compte &amp; licence</h2>
            <p className="text-sm text-white/70">
              Gérez votre clé de licence et l'association de cet appareil.
            </p>
            <div className={`mt-3 inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${statusBadgeClass}`}>
              {statusText}
            </div>
            {!loading && !isAuthenticated && (
              <p className="mt-2 text-xs text-white/70">
                Connectez-vous pour gérer votre licence et activer vos clés.
              </p>
            )}
            {!loading && isAuthenticated && license?.message && (
              <p className="mt-2 text-xs text-white/60">{license.message}</p>
            )}
            {error && (
              <p className="mt-3 text-sm text-red-200">
                {error}{' '}
                <button
                  type="button"
                  className="underline decoration-dotted decoration-red-200/70 transition hover:text-red-100"
                  onClick={handleRefresh}
                >
                  Réessayer
                </button>
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {!isAuthenticated && (
              <button
                type="button"
                onClick={() => setShowAuthScreen(true)}
                className="glass-button-secondary rounded-lg px-4 py-2 text-sm font-semibold"
              >
                Se connecter
              </button>
            )}
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="glass-button rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!isAuthenticated}
            >
              {currentStatus === 'unregistered' ? 'Activer une licence' : 'Mettre à jour la licence'}
            </button>
            <button
              type="button"
              onClick={handlePanelReset}
              disabled={isResetting || !isAuthenticated}
              className="glass-button-secondary rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isResetting ? 'Demande en cours…' : 'Demander réinitialisation'}
            </button>
          </div>
        </div>

        {(actionMessage || actionError) && (
          <div
            className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
              actionMessage
                ? 'border-emerald-400/70 bg-emerald-500/10 text-emerald-200'
                : 'border-red-400/70 bg-red-500/10 text-red-200'
            }`}
          >
            {actionMessage ?? actionError}
          </div>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Clé de licence</p>
            <p className="mt-2 break-all text-lg font-semibold text-white">
              {loading ? '—' : formatLicenseKey(license?.licenseKey)}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Type de licence</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {loading ? '—' : license?.licenseType ?? '—'}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Empreinte appareil</p>
            <p className="mt-2 text-lg font-semibold text-white">{maskedDevice}</p>
            <p className="mt-1 text-xs text-white/50">Utilisée pour lier la licence à cet appareil.</p>
          </div>
        </div>
      </div>

      {showAuthScreen && (
        <div className="mt-6">
          <div className="glass-card border border-white/20 bg-black/70 px-4 py-4 shadow-xl">
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAuthScreen(false)}
                className="glass-button-secondary rounded-lg px-3 py-1 text-xs font-semibold"
              >
                Fermer
              </button>
            </div>
            <AuthScreen />
          </div>
        </div>
      )}

      <LicenseModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        status={currentStatus}
        initialEmail={license?.email}
        initialLicenseKey={license?.licenseKey}
        maskedDeviceId={maskedDevice}
        submitting={isSubmitting}
        resetInProgress={isResetting}
        error={actionError}
        message={actionMessage}
        onSubmit={handleSubmit}
        onRequestReset={handleReset}
      />
    </section>
  );
}

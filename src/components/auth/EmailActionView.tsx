import React, { useEffect, useState } from 'react';
import {
  applyActionCode,
  verifyPasswordResetCode,
  confirmPasswordReset,
} from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ChefHat, CheckCircle2, AlertCircle, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

interface EmailActionViewProps {
  onDone: () => void;
}

export const EmailActionView: React.FC<EmailActionViewProps> = ({ onDone }) => {
  const { showToast } = useToast();
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  const oobCode = params.get('oobCode') || '';

  const [status, setStatus] = useState<'loading' | 'ready' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!auth || !oobCode || !mode) {
      setStatus('error');
      setErrorMsg('Invalid or incomplete email action link.');
      return;
    }

    if (mode === 'verifyEmail') {
      applyActionCode(auth, oobCode)
        .then(() => {
          setStatus('success');
          showToast('Email verified! Your registration is complete. Please sign in.', 'success');
          setTimeout(() => {
            window.history.replaceState({}, document.title, '/login');
            onDone();
          }, 2000);
        })
        .catch(() => {
          setStatus('error');
          setErrorMsg('This verification link is invalid or has already expired.');
        });
    } else if (mode === 'resetPassword') {
      verifyPasswordResetCode(auth, oobCode)
        .then((email) => {
          setTargetEmail(email);
          setStatus('ready');
        })
        .catch(() => {
          setStatus('error');
          setErrorMsg('This password reset link is invalid or has expired.');
        });
    } else {
      setStatus('error');
      setErrorMsg('Unsupported email action.');
    }
  }, [mode, oobCode]);

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters.', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setStatus('success');
      showToast('Password updated successfully! Please sign in.', 'success');
      setTimeout(() => {
        window.history.replaceState({}, document.title, '/login');
        onDone();
      }, 2000);
    } catch {
      showToast('Failed to reset password. The link may have expired.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border-x border-slate-200/70 dark:border-slate-800/70 border-t-2 border-t-orange-500/80 border-b-2 border-b-indigo-500/45 p-6 sm:p-8 text-center space-y-5">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-xl shadow-orange-500/25">
          <ChefHat className="w-7 h-7" />
        </div>

        <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
          Ponda Kitchen ERP
        </h1>

        {status === 'loading' && (
          <div className="py-6 flex flex-col items-center space-y-3">
            <LoadingSpinner size="md" className="text-orange-500" />
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Verifying your request...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="py-4 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              {mode === 'verifyEmail' ? 'Email Verified!' : 'Password Reset Complete!'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Redirecting you to the Sign In page...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="py-4 space-y-4">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{errorMsg}</p>
            <button
              type="button"
              onClick={() => {
                window.history.replaceState({}, document.title, '/login');
                onDone();
              }}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl text-xs font-bold modern-btn-primary"
            >
              Back to Sign In
            </button>
          </div>
        )}

        {status === 'ready' && mode === 'resetPassword' && (
          <form onSubmit={handleResetSubmit} className="space-y-4 text-left">
            <div className="text-center">
              <h2 className="text-sm font-extrabold text-slate-800 dark:text-white">
                Set New Password
              </h2>
              {targetEmail && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  for <strong>{targetEmail}</strong>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl text-xs font-bold modern-btn-primary flex items-center justify-center space-x-2 disabled:opacity-60"
            >
              {submitting ? <LoadingSpinner size="xs" /> : <ArrowRight className="w-4 h-4" />}
              <span>{submitting ? 'Updating Password...' : 'Update Password'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

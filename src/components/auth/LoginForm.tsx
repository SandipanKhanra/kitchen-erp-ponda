import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { LoadingSpinner } from '../common/LoadingSpinner';

const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

interface LoginFormProps {
  onSwitchToSignup: () => void;
  onSuccess?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToSignup, onSuccess }) => {
  const {
    login,
    loginWithGoogle,
    resetPassword,
    isAuthLoading,
    sessionExpiredNotice,
    clearSessionExpiredNotice,
  } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const formatErrorMessage = (err: any): string => {
    const code = err?.code || '';
    if (code === 'auth/popup-blocked') {
      return 'Popup was blocked by your browser. Please allow popups for this site to sign in with Google.';
    }
    if (code === 'auth/user-not-found') {
      return 'Email not registered. Please sign up first.';
    }
    if (code === 'auth/wrong-password') {
      return 'Incorrect password. Please try again.';
    }
    if (code === 'auth/invalid-credential') {
      return 'Invalid email or password.';
    }
    if (code === 'auth/too-many-requests') {
      return 'Too many failed attempts. Try again later.';
    }
    if (code === 'auth/invalid-email') {
      return 'Invalid email address.';
    }
    return err?.message || 'Failed to sign in. Please try again.';
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      showToast('Please provide both email and password.', 'error');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      onSuccess?.();
    } catch (err: any) {
      showToast(formatErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      onSuccess?.();
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        showToast(formatErrorMessage(err), 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      showToast('Please enter your email to receive a password reset link.', 'error');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(resetEmail);
      setResetSent(true);
      showToast('Password reset link sent! Check your email inbox.', 'success');
      setTimeout(() => {
        setShowResetModal(false);
        setResetSent(false);
      }, 3000);
    } catch (err: any) {
      showToast(formatErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {sessionExpiredNotice && (
        <div className="mb-4 p-3.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start justify-between space-x-2.5 text-amber-800 dark:text-amber-300 text-xs">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
            <span>{sessionExpiredNotice}</span>
          </div>
          <button
            type="button"
            onClick={clearSessionExpiredNotice}
            className="text-[10px] font-bold underline ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Google Sign In */}
      {!showResetModal && (
        <>
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading || isAuthLoading}
            className="w-full mb-3.5 py-2.5 px-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm flex items-center justify-center space-x-2.5 transition disabled:opacity-50 cursor-pointer"
          >
            <GoogleIcon />
            <span>Continue with Google</span>
          </button>

          <div className="relative mb-4 flex items-center justify-center">
            <div className="border-t border-slate-200 dark:border-slate-700 w-full" />
            <span className="bg-white dark:bg-slate-900 px-3 text-[10px] text-slate-400 uppercase font-bold tracking-wider absolute">
              or sign in with email
            </span>
          </div>
        </>
      )}

      {showResetModal ? (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="text-center mb-2">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Reset Your Password
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Enter your registered account email to receive a secure recovery link.
            </p>
          </div>

          {resetSent ? (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center space-x-2 text-emerald-700 dark:text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4" />
              <span>Reset link sent! Please check your email inbox.</span>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="devotee@iskcon.org"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowResetModal(false);
              }}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || resetSent}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white transition disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="devotee@iskcon.org"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setResetEmail(email);
                  setShowResetModal(true);
                }}
                className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || isAuthLoading}
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-500/20 flex items-center justify-center space-x-2 transition disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <>
                <LoadingSpinner size="xs" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In to Ponda Kitchen ERP</span>
              </>
            )}
          </button>

          <div className="pt-3 text-center border-t border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              New devotee to this center?{' '}
              <button
                type="button"
                onClick={onSwitchToSignup}
                className="font-bold text-orange-600 dark:text-orange-400 hover:underline inline-flex items-center space-x-1"
              >
                <span>Create an Account</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </p>
          </div>
        </form>
      )}
    </div>
  );
};

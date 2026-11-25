import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Mail, Lock, User, Building2, Key, Eye, EyeOff, UserPlus, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
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

interface SignupFormProps {
  onSwitchToLogin: () => void;
  onSuccess?: () => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({ onSwitchToLogin, onSuccess }) => {
  const { signUp, loginWithGoogle, availableCenters, isAuthLoading } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [centerId, setCenterId] = useState(availableCenters[0]?.id || 'center_ponda');
  const [passcode, setPasscode] = useState('');
  const [showPasscodeField, setShowPasscodeField] = useState(false);
  const [loading, setLoading] = useState(false);

  const formatErrorMessage = (err: any): string => {
    const code = err?.code || '';
    if (code === 'auth/popup-blocked') {
      return 'Popup was blocked by your browser. Please allow popups for this site to sign in with Google.';
    }
    if (code === 'auth/email-already-in-use') {
      return 'An account with this email already exists. Please sign in instead.';
    }
    if (code === 'auth/weak-password') {
      return 'Password should be at least 6 characters long.';
    }
    if (code === 'auth/invalid-email') {
      return 'Please enter a valid email address.';
    }
    return err?.message || 'Failed to create account. Please try again.';
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showToast('Please provide your full or initiated name.', 'warning');
      return;
    }
    if (!email.trim()) {
      showToast('Please provide an email address.', 'warning');
      return;
    }
    if (password.length < 6) {
      showToast('Password must be at least 6 characters.', 'warning');
      return;
    }
    if (password !== confirmPassword) {
      showToast('Passwords do not match.', 'warning');
      return;
    }

    const selectedCenter = availableCenters.find((c) => c.id === centerId) || availableCenters[0];
    if (!selectedCenter) {
      showToast('Please select an active Center.', 'warning');
      return;
    }

    setLoading(true);
    try {
      await signUp({
        name: name.trim(),
        email: email.trim(),
        password,
        centerId: selectedCenter.id,
        centerName: selectedCenter.name,
        passcode: passcode.trim(),
      });
      showToast(
        'Verification email sent! Please click the link in your inbox within 15 minutes to complete registration.',
        'success'
      );
      setTimeout(() => {
        onSwitchToLogin();
      }, 2200);
    } catch (err: any) {
      showToast(formatErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    try {
      await loginWithGoogle(undefined, undefined, 'signup');
      onSuccess?.();
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        showToast(formatErrorMessage(err), 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Google Sign Up */}
      <button
        type="button"
        onClick={handleGoogleSignup}
        disabled={loading || isAuthLoading}
        className="w-full mb-3.5 py-2.5 px-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm flex items-center justify-center space-x-2.5 transition disabled:opacity-50 cursor-pointer"
      >
        <GoogleIcon />
        <span>Register with Google</span>
      </button>

      <div className="relative mb-4 flex items-center justify-center">
        <div className="border-t border-slate-200 dark:border-slate-700 w-full" />
        <span className="bg-white dark:bg-slate-900 px-3 text-[10px] text-slate-400 uppercase font-bold tracking-wider absolute">
          or register with email
        </span>
      </div>

      <form onSubmit={handleSignup} className="space-y-3.5">
        {/* Full Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Devotee Name / Full Name
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Radharani Devi Dasi"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
              required
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
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

        {/* Center Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Assigned Kitchen Center
          </label>
          <div className="relative">
            <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <select
              value={centerId}
              onChange={(e) => setCenterId(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white cursor-pointer"
            >
              {availableCenters.map((c) => (
                <option key={c.id} value={c.id} className="dark:bg-slate-900">
                  {c.name} ({c.city})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Password Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 chars"
                className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>
        </div>

        {/* Optional Admin Passcode Section */}
        <div className="pt-1">
          {!showPasscodeField ? (
            <button
              type="button"
              onClick={() => setShowPasscodeField(true)}
              className="text-[11px] text-orange-600 dark:text-orange-400 hover:underline flex items-center space-x-1"
            >
              <Key className="w-3 h-3" />
              <span>Have an Admin or SAdmin Passcode?</span>
            </button>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                  <Key className="w-3.5 h-3.5 text-amber-500" />
                  <span>Admin / SAdmin Passkey (Optional)</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasscodeField(false);
                    setPasscode('');
                  }}
                  className="text-[10px] text-slate-400 hover:underline"
                >
                  Hide
                </button>
              </div>
              <input
                type="text"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="e.g. ISKCON-ADMIN or ISKCON-SADMIN"
                className="w-full px-3 py-2 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || isAuthLoading}
          className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-500/20 flex items-center justify-center space-x-2 transition disabled:opacity-60 cursor-pointer"
        >
          {loading ? (
            <>
              <LoadingSpinner size="xs" />
              <span>Creating Profile...</span>
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              <span>Create Devotee Account</span>
            </>
          )}
        </button>

        <div className="pt-3 text-center border-t border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Already registered with your center?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="font-bold text-orange-600 dark:text-orange-400 hover:underline inline-flex items-center space-x-1"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Sign In here</span>
            </button>
          </p>
        </div>
      </form>
    </div>
  );
};

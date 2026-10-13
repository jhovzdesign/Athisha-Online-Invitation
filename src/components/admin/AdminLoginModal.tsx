import React, { useState } from 'react';
import { SacredCrossIcon } from '../common/DecorativeIcons';
import { Lock, User, Eye, EyeOff, ShieldCheck, AlertCircle, X, Sparkles, Cloud, LogIn } from 'lucide-react';
import { auth, googleProvider } from '../../lib/firebase';
import { signInWithPopup } from 'firebase/auth';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onLoginSuccess: () => void;
  savedUsername: string;
  savedPasswordHash: string;
  canCancel?: boolean;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  savedUsername,
  savedPasswordHash,
  canCancel = true,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedUser = username.trim().toLowerCase();
    const expectedUser = (savedUsername || 'admin').toLowerCase();
    const expectedPass = savedPasswordHash || 'admin123';

    if (trimmedUser === expectedUser && password === expectedPass) {
      if (rememberMe) {
        localStorage.setItem('blessed_admin_session', 'true');
      } else {
        sessionStorage.setItem('blessed_admin_session', 'true');
      }
      onLoginSuccess();
    } else {
      setErrorMsg('Invalid admin username or password. Please try again.');
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setIsGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        if (rememberMe) {
          localStorage.setItem('blessed_admin_session', 'true');
        } else {
          sessionStorage.setItem('blessed_admin_session', 'true');
        }
        onLoginSuccess();
      }
    } catch (err: any) {
      console.warn('Google sign-in status:', err);
      if (err?.code !== 'auth/popup-closed-by-user') {
        setErrorMsg(err?.message || 'Google sign-in could not be completed.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleFillDemo = () => {
    setUsername(savedUsername || 'admin');
    setPassword(savedPasswordHash || 'admin123');
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-fade-in font-montserrat">
      <div
        className="relative w-full max-w-md bg-[#FFFDF9] rounded-3xl p-7 sm:p-8 shadow-2xl border border-stone-200 overflow-hidden"
        style={{
          boxShadow: '0 25px 50px -12px rgba(201, 169, 106, 0.25)',
        }}
      >
        {/* Subtle decorative glow */}
        <div className="absolute -top-20 -right-20 w-44 h-44 rounded-full blur-3xl opacity-40 pointer-events-none bg-amber-200" />

        {/* Close Button if cancel is allowed */}
        {canCancel && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-colors cursor-pointer"
            aria-label="Close login portal"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header with Sacred Cross & Dove */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200/60 shadow-xs mb-3 text-amber-800">
            <SacredCrossIcon color="#C9A96A" className="w-7 h-7" />
          </div>

          <div className="flex items-center justify-center gap-1.5 text-xs font-bold tracking-widest uppercase text-amber-800 mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>ADMIN SECURE ACCESS</span>
          </div>

          <h2 className="font-cormorant text-2xl sm:text-3xl font-bold text-stone-900 leading-tight">
            Invitation Studio Portal
          </h2>

          <div className="flex items-center justify-center gap-1.5 mt-1.5 text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/80 w-fit mx-auto">
            <Cloud className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>Centralized Cloud Database Connected</span>
          </div>
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1-Click Google Sign In */}
        <div className="mb-4">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
            className="w-full py-2.5 px-4 bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 text-xs font-semibold rounded-2xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer active:scale-[0.99] disabled:opacity-50"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
            <span>{isGoogleLoading ? 'Signing in...' : 'Sign in with Google Account'}</span>
          </button>

          <div className="relative my-3 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200"></div>
            </div>
            <span className="relative bg-[#FFFDF9] px-2 text-[10px] text-stone-400 uppercase tracking-wider font-semibold">
              Or with Cloud Password
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Input */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Admin Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter admin username"
                className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-600 transition-all text-stone-800 placeholder:text-stone-400"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Admin Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full pl-10 pr-10 py-2.5 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-600 transition-all text-stone-800 placeholder:text-stone-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center justify-between text-xs text-stone-600 pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
              />
              <span>Keep me logged in</span>
            </label>

            <button
              type="button"
              onClick={handleFillDemo}
              className="text-amber-800 hover:text-amber-900 font-semibold text-[11px] hover:underline cursor-pointer"
            >
              Fill Default Credentials
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3.5 px-6 rounded-2xl text-xs font-semibold text-white shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 transform active:scale-[0.99] cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #C9A96A, #A87D43)',
            }}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Login to Admin Studio</span>
          </button>
        </form>

        {/* Demo Credentials Hint Box */}
        <div className="mt-5 p-3 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-center">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-800 mb-0.5">
            Synced Cloud Host Credentials
          </span>
          <div className="flex items-center justify-center gap-3 text-xs text-stone-700 font-mono">
            <span>User: <strong className="text-stone-900 font-bold">{savedUsername || 'admin'}</strong></span>
            <span>•</span>
            <span>Pass: <strong className="text-stone-900 font-bold">{savedPasswordHash || 'admin123'}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};

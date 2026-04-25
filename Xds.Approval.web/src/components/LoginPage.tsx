import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/components/theme-provider';
import { Lock, User, Eye, EyeOff, ArrowRight, IdCard, Mail, BriefcaseBusiness, Moon, Sun } from 'lucide-react';

const departments = [
  'CUSTOMER EXPERIENCE',
  'LEGAL',
  'GOVERNANCE',
  'RISK AND COMPLIANCE',
  'DATA SYSTEMS AND OPERATIONS',
  'HUMAN RESOURCE AND ADMINISTRATION',
  'TECHNOLOGY AND INNOVATIONS',
  'SALES AND BUSINESS DEVELOPMENT',
  'ANALYTICS AND PRODUCTS',
  'FINANCE AND COMMERCIAL',
] as const;

const LoginPage: React.FC = () => {
  const { login, register } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'User' | 'CEO' | 'Finance' | 'HeadOfFinance'>('User');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; email?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    if (
      !username.trim() ||
      !password.trim() ||
      (mode === 'register' && (!fullName.trim() || !department.trim() || !email.trim()))
    ) {
      setError('Please fill in all fields.');
      return;
    }

    if (mode === 'register' && password.trim().length < 6) {
      setError('Please enter 6 characters or more.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        await register({
          fullName: fullName.trim(),
          department: department.trim(),
          email: email.trim(),
          username: username.trim(),
          password,
          role,
        });
      }
    } catch (err: any) {
      const message =
        err.message ||
        (mode === 'login'
          ? 'Incorrect credentials. Please try again.'
          : 'Unable to create account. Please try again.');

      const lower = message.toLowerCase();
      if (mode === 'register' && lower.includes('username already exists')) {
        setFieldErrors({ username: 'Username already exists' });
        setError('');
      } else if (mode === 'register' && lower.includes('email already exists')) {
        setFieldErrors({ email: 'Email already exists' });
        setError('');
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const inputClassName =
    'w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all';

  return (
    <div className="min-h-screen flex bg-[radial-gradient(circle_at_top_left,_rgba(22,163,74,0.08),_transparent_30%),linear-gradient(180deg,_#ffffff_0%,_#f2fbf5_100%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.12),_transparent_30%),linear-gradient(180deg,_#020617_0%,_#07130b_100%)]">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-green-800 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="absolute bottom-20 right-20 h-96 w-96 rounded-full bg-green-300/10 blur-3xl" />
          <div className="absolute top-1/2 left-1/3 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        </div>

        <div className="relative z-10 flex w-full flex-col justify-between p-12">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 p-2 backdrop-blur-sm">
                <img src={`${import.meta.env.BASE_URL}assets/xdslogo.png`} alt="XDS logo" className="max-h-full max-w-full object-contain" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">XDS Approval</span>
            </div>
            <p className="text-sm text-slate-400">Payment management system</p>
          </div>

          <div className="space-y-8">
            <h1 className="text-4xl font-bold leading-tight text-white xl:text-5xl">
              Manage your payment
              <br />
              requests with
              <br />
              <span className="bg-gradient-to-r from-emerald-200 to-white bg-clip-text text-transparent">
                confidence
              </span>
            </h1>
            <p className="max-w-md text-lg leading-relaxed text-slate-300">
              A clear workflow from request creation to CEO review, finance preparation, and final payment.
            </p>

            <div className="grid max-w-md grid-cols-3 gap-6">
              {[
                { label: 'Requests', value: 'Create' },
                { label: 'Approval', value: 'CEO' },
                { label: 'Finance', value: 'PV' },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <div className="text-2xl font-bold text-white">{item.value}</div>
                  <div className="mt-1 text-sm text-slate-400">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-slate-400">Used by XDS DATA Ghana Limited</p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-md rounded-[28px] border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-8 shadow-xl shadow-slate-300/20 dark:shadow-black/30 backdrop-blur">
          <div className="mb-8">
            <div className="mb-6 flex justify-center">
              <div className="flex h-11 items-center rounded-[18px] bg-[#d9d9df] dark:bg-slate-800 p-1">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`flex h-9 items-center gap-2 rounded-[14px] px-4 text-sm font-semibold transition-all ${
                    theme === 'light'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-white/80 hover:text-white'
                  }`}
                  title="Light mode"
                >
                  <Sun className="w-4 h-4" />
                  <span>Light</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`flex h-9 items-center gap-2 rounded-[14px] px-4 text-sm font-semibold transition-all ${
                    theme === 'dark'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-white/80 hover:text-white'
                  }`}
                  title="Dark mode"
                >
                  <Moon className="w-4 h-4" />
                  <span>Dark</span>
                </button>
              </div>
            </div>

            <div className="mb-6 flex items-center justify-center gap-3 lg:hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-2 shadow-sm">
                <img src={`${import.meta.env.BASE_URL}assets/xdslogo_green.png`} alt="XDS logo" className="max-h-full max-w-full object-contain" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">XDS Approval</span>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              {mode === 'login' ? 'Sign in to access your workspace' : 'Register to access your workspace'}
            </p>

            <div className="mt-4 inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  mode === 'login' ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError('');
                }}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  mode === 'register' ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                Register
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                <span className="text-xs font-bold text-red-500">!</span>
              </div>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'register' && (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Full name</label>
                  <div className="relative">
                    <IdCard className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className={inputClassName}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, email: undefined }));
                      }}
                      placeholder="Enter your email address"
                      className={`${inputClassName} ${
                        fieldErrors.email ? 'border-red-300 bg-red-50/50 focus:border-red-500 focus:ring-red-500/20' : ''
                      }`}
                    />
                  </div>
                  {fieldErrors.email && <p className="mt-1.5 text-sm text-red-500">{fieldErrors.email}</p>}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'User' | 'CEO' | 'Finance' | 'HeadOfFinance')}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3.5 text-slate-900 dark:text-slate-100 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="User">User</option>
                    <option value="CEO">CEO</option>
                    <option value="Finance">Finance Staff</option>
                    <option value="HeadOfFinance">Finance Manager</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Department</label>
                  <div className="relative">
                    <BriefcaseBusiness className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className={inputClassName}
                    >
                      <option value="">Select your department</option>
                      {departments.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Username</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, username: undefined }));
                  }}
                  placeholder="Enter your username"
                  className={`${inputClassName} ${
                    fieldErrors.username ? 'border-red-300 bg-red-50/50 focus:border-red-500 focus:ring-red-500/20' : ''
                  }`}
                />
              </div>
              {fieldErrors.username && <p className="mt-1.5 text-sm text-red-500">{fieldErrors.username}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error === 'Please enter 6 characters or more.' && e.target.value.trim().length >= 6) {
                      setError('');
                    }
                  }}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 py-3.5 pl-12 pr-12 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {mode === 'register' && password.trim().length > 0 && password.trim().length < 6 && (
                <p className="mt-1.5 text-sm text-red-500">Please enter 6 characters or more.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 py-3.5 font-semibold text-white shadow-lg shadow-emerald-900/20 transition-all duration-200 hover:bg-emerald-800 hover:shadow-emerald-900/30 disabled:bg-emerald-400"
            >
              {isLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <>
                  {mode === 'login' ? 'Sign in' : 'Create account'}
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-400 dark:text-slate-500">Contact your administrator if you do not have access</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

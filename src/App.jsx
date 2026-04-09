import React, { useCallback, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Home, PlusCircle, Loader2, Lock } from 'lucide-react';
import Dashboard from './components/Dashboard';
import ApartmentForm from './components/ApartmentForm';
import { apiFetch, clearSavedPassword, getSavedPassword, setSavedPassword } from './lib/api';

function App() {
  const [authReady, setAuthReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const verifyPassword = useCallback(async (rawPassword) => {
    const password = rawPassword.trim();
    if (!password) {
      return { ok: false, error: 'יש להזין סיסמה' };
    }

    setSavedPassword(password);

    try {
      const response = await apiFetch('/api/apartments');
      if (response.ok) {
        return { ok: true, error: '' };
      }

      let serverError = 'הגישה נחסמה';
      try {
        const body = await response.json();
        if (body?.error) serverError = body.error;
      } catch {
        // Ignore non-JSON responses.
      }

      if (response.status === 401) {
        return { ok: false, error: 'סיסמה שגויה' };
      }

      return { ok: false, error: serverError };
    } catch {
      return { ok: false, error: 'לא ניתן להתחבר לשרת כרגע' };
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      const savedPassword = getSavedPassword();
      if (!savedPassword) {
        if (!cancelled) setAuthReady(true);
        return;
      }

      if (!cancelled) setIsVerifying(true);
      const result = await verifyPassword(savedPassword);

      if (cancelled) return;

      setIsVerifying(false);
      setAuthReady(true);
      if (result.ok) {
        setAuthenticated(true);
        setAuthError('');
      } else {
        clearSavedPassword();
        setAuthenticated(false);
        setAuthError(result.error);
      }
    };

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, [verifyPassword]);

  const handleUnlock = async (event) => {
    event.preventDefault();
    setAuthError('');
    setIsVerifying(true);

    const result = await verifyPassword(passwordInput);

    setIsVerifying(false);
    setAuthReady(true);

    if (result.ok) {
      setAuthenticated(true);
      setPasswordInput('');
      return;
    }

    clearSavedPassword();
    setAuthenticated(false);
    setAuthError(result.error);
  };

  const handleLock = () => {
    clearSavedPassword();
    setAuthenticated(false);
    setAuthError('');
    setPasswordInput('');
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600 font-bold">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>בודק הרשאות...</span>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <form onSubmit={handleUnlock} className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-lg p-6 space-y-4">
          <h1 className="text-xl font-black text-slate-900">גישה פרטית</h1>
          <p className="text-sm text-slate-500">הזן את הסיסמה ששיתפתם ביניכם כדי לפתוח את המערכת.</p>
          <input
            type="password"
            value={passwordInput}
            onChange={(event) => setPasswordInput(event.target.value)}
            className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 focus:outline-none focus:ring-4 focus:ring-brand-100 focus:border-brand-500"
            placeholder="סיסמה"
            autoFocus
          />
          {authError ? <p className="text-sm text-red-600 font-bold">{authError}</p> : null}
          <button
            type="submit"
            disabled={isVerifying}
            className="w-full bg-brand-600 text-white rounded-xl py-3 font-black flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>{isVerifying ? 'מאמת...' : 'כניסה'}</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        {/* Header */}
        <header className="bg-brand-600 text-white shadow-md sticky top-0 z-50">
          <div className="max-w-screen-md mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Home className="w-6 h-6" />
              מעקב דירות
            </h1>
            <div className="flex items-center gap-2">
              <Link 
                to="/add" 
                className="bg-brand-500 hover:bg-brand-400 transition-colors text-white px-4 py-2 rounded-full font-medium flex items-center gap-2 shadow-sm text-sm"
              >
                <PlusCircle className="w-4 h-4" />
                הוספת דירה
              </Link>
              <button
                type="button"
                onClick={handleLock}
                className="bg-white/15 hover:bg-white/25 transition-colors text-white px-3 py-2 rounded-full font-medium flex items-center gap-2 text-sm"
              >
                <Lock className="w-4 h-4" />
                נעילה
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 w-full max-w-screen-md mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/add" element={<ApartmentForm />} />
            <Route path="/edit/:id" element={<ApartmentForm />} />
          </Routes>
        </main>
        
      </div>
    </Router>
  );
}

export default App;

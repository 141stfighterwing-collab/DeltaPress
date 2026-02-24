
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { getPasswordStrength, validateInput, LIMITS } from '../../services/security';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [strength, setStrength] = useState({ score: 0, feedback: '' });

  useEffect(() => {
    setStrength(getPasswordStrength(password));
  }, [password]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    const emailVal = validateInput(email, 'email');
    if (!emailVal.valid) {
      setError(emailVal.error || 'Invalid email');
      return;
    }

    const userVal = validateInput(username, 'text', LIMITS.USERNAME);
    if (!userVal.valid) {
      setError(`Username: ${userVal.error}`);
      return;
    }

    if (strength.score < 3) {
      setError(`Password is too weak: ${strength.feedback}`);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Sign up user
      // IMPORTANT: We pass 'username' in metadata. 
      // The Database Trigger (from Diagnostics) will automatically create the profile row.
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username.toLowerCase(),
            display_name: username
          }
        }
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        // Success! We don't do a manual upsert here anymore.
        // Doing so often causes RLS "42501" errors because the session isn't live yet.
        setSuccess(true);
        setTimeout(() => navigate('/login'), 2500);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full p-8 bg-white shadow-xl rounded-lg border border-gray-200">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <div className="w-16 h-16 bg-blue-600 rounded-lg mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-white shadow-lg italic">W</div>
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 font-serif">Create Account</h1>
          <p className="text-gray-500 text-sm mt-2">Join the newsroom community</p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 text-red-700 text-sm animate-in fade-in slide-in-from-top-2">
            <h3 className="font-bold mb-1 uppercase text-[10px]">Registry Error</h3>
            <p className="leading-relaxed">{error}</p>
            <p className="mt-2 text-[9px] font-bold uppercase opacity-60">
              Note: If this is a database error, please run the Repair Script in the Diagnostics Hub.
            </p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 text-green-700 text-sm font-bold">
            Account created! The database is setting up your profile. Redirecting to login...
          </div>
        )}

        {!success && (
          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label className="block text-xs font-black uppercase text-gray-500 mb-1 tracking-widest">Username</label>
              <input 
                type="text" 
                className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white text-gray-900 placeholder-gray-400"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                required
                placeholder="Unique ID (e.g. news_junkie_99)"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-gray-500 mb-1 tracking-widest">Email Address</label>
              <input 
                type="email" 
                className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white text-gray-900 placeholder-gray-400"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-gray-500 mb-1 tracking-widest">Password</label>
              <input 
                type="password" 
                className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white text-gray-900 placeholder-gray-400"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
              {password && (
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        strength.score <= 1 ? 'bg-red-500 w-1/4' : 
                        strength.score === 2 ? 'bg-orange-500 w-2/4' : 
                        strength.score === 3 ? 'bg-yellow-500 w-3/4' : 'bg-green-500 w-full'
                      }`}
                    />
                  </div>
                  <span className="text-[9px] font-bold uppercase text-gray-400">{strength.feedback}</span>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-gray-500 mb-1 tracking-widest">Confirm</label>
              <input 
                type="password" 
                className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white text-gray-900 placeholder-gray-400"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 text-white p-3 rounded font-bold hover:bg-blue-700 transition-all transform active:scale-95 shadow-md disabled:opacity-50 uppercase text-xs tracking-widest"
            >
              {loading ? 'Processing...' : 'Register Account'}
            </button>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-gray-100 text-center text-xs text-gray-500">
          Already have an account? <Link to="/login" className="text-blue-600 hover:underline font-semibold">Log in here</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;

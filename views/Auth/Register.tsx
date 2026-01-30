
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../services/supabase';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Sign up user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: username,
            username: username
          }
        }
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        // 2. Create profile entry with default role 'user'
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          username: username,
          display_name: username,
          role: 'user'
        });

        if (profileError) {
          console.warn("Profile creation failed, might exist already:", profileError);
        }

        setSuccess(true);
        setTimeout(() => navigate('/login'), 2000);
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
          <h1 className="text-2xl font-bold text-gray-800">Create Account</h1>
          <p className="text-gray-500 text-sm mt-2">Join the newsroom community</p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 text-green-700 text-sm">
            Welcome aboard! Redirecting to login...
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase text-gray-500 mb-1 tracking-widest">Password</label>
                <input 
                  type="password" 
                  className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white text-gray-900 placeholder-gray-400"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  minLength={6}
                />
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

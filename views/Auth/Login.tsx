
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../services/supabase';

interface BrandingSettings {
  site_name: string;
  site_tagline: string;
  login_logo_url: string;
  login_background_url: string;
  login_background_color: string;
  primary_color: string;
  secondary_color: string;
  login_logo_width: number;
  login_logo_height: number;
  show_site_name: boolean;
}

const DEFAULT_BRANDING: BrandingSettings = {
  site_name: 'DeltaPress',
  site_tagline: 'AI-Powered Newsroom Platform',
  login_logo_url: '',
  login_background_url: '',
  login_background_color: '#1a365d',
  primary_color: '#1a365d',
  secondary_color: '#00bcd4',
  login_logo_width: 200,
  login_logo_height: 80,
  show_site_name: true
};

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branding, setBranding] = useState<BrandingSettings>(DEFAULT_BRANDING);

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) navigate('/admin');
    };
    checkUser();

    // Fetch branding settings
    fetchBranding();
  }, [navigate]);

  const fetchBranding = async () => {
    try {
      const response = await fetch('/api/branding');
      const data = await response.json();
      if (data.success && data.branding) {
        setBranding({ ...DEFAULT_BRANDING, ...data.branding });
      }
    } catch (error) {
      console.error('Failed to fetch branding:', error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.session) {
        navigate('/admin');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Dynamic background style
  const backgroundStyle: React.CSSProperties = branding.login_background_url
    ? {
        backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url(${branding.login_background_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }
    : {
        backgroundColor: branding.login_background_color
      };

  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4 transition-all duration-500"
      style={backgroundStyle}
    >
      <div className="max-w-md w-full p-8 bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl border border-white/20">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            {branding.login_logo_url ? (
              <img 
                src={branding.login_logo_url} 
                alt={branding.site_name}
                className="mx-auto mb-4 object-contain"
                style={{ 
                  maxWidth: branding.login_logo_width, 
                  maxHeight: branding.login_logo_height 
                }}
              />
            ) : (
              <div 
                className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-white shadow-xl"
                style={{ backgroundColor: branding.primary_color }}
              >
                {branding.site_name.charAt(0)}
              </div>
            )}
          </Link>
          
          {branding.show_site_name && (
            <h1 
              className="text-2xl font-bold mb-1"
              style={{ color: branding.primary_color }}
            >
              {branding.site_name}
            </h1>
          )}
          
          <p className="text-gray-500 text-sm">{branding.site_tagline}</p>
        </div>

        {/* Error Message */}
        {error && (
          <div 
            className="border-l-4 p-4 mb-6 text-sm animate-pulse rounded-r-lg"
            style={{ 
              backgroundColor: `${branding.primary_color}10`,
              borderColor: branding.primary_color,
              color: branding.primary_color
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">Email Address</label>
            <input 
              type="email" 
              className="w-full border-2 border-gray-200 p-4 rounded-xl focus:ring-2 focus:ring-offset-2 outline-none transition-all bg-white text-gray-900 placeholder-gray-400"
              style={{ 
                borderColor: error ? '#ef4444' : undefined,
                '--tw-ring-color': branding.primary_color 
              } as React.CSSProperties}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="name@example.com"
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">Password</label>
            <input 
              type="password" 
              className="w-full border-2 border-gray-200 p-4 rounded-xl focus:ring-2 focus:ring-offset-2 outline-none transition-all bg-white text-gray-900 placeholder-gray-400"
              style={{ 
                borderColor: error ? '#ef4444' : undefined,
                '--tw-ring-color': branding.primary_color 
              } as React.CSSProperties}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded"
                style={{ accentColor: branding.primary_color }}
              />
              <span className="text-sm text-gray-600">Remember Me</span>
            </label>
            <Link 
              to="/register" 
              className="text-sm font-semibold hover:underline"
              style={{ color: branding.primary_color }}
            >
              Register Account
            </Link>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full text-white p-4 rounded-xl font-bold transition-all transform active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: branding.primary_color }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                Authenticating...
              </span>
            ) : (
              'Log In'
            )}
          </button>
        </form>

        {/* Footer Links */}
        <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between text-xs">
          <Link 
            to="/" 
            className="font-semibold hover:underline"
            style={{ color: branding.primary_color }}
          >
            ← Back to Site
          </Link>
          <button className="text-gray-400 hover:text-gray-600 transition-colors">
            Lost your password?
          </button>
        </div>
      </div>

      {/* Branding Attribution */}
      <div className="fixed bottom-4 right-4 text-white/50 text-[10px] font-bold uppercase tracking-widest">
        Powered by DeltaPress
      </div>
    </div>
  );
};

export default Login;

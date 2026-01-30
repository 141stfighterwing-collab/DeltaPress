
import React, { useState } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../services/supabase';
import { sanitizeHtml, stripAllHtml, isValidEmail } from '../services/security';

const ContactView: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name || !formData.email || !formData.message) {
      setError("Please fill in all required fields.");
      return;
    }

    if (!isValidEmail(formData.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: insertError } = await supabase.from('contacts').insert({
        name: stripAllHtml(formData.name),
        email: stripAllHtml(formData.email),
        phone: stripAllHtml(formData.phone),
        message: sanitizeHtml(formData.message)
      });

      if (insertError) throw insertError;
      setSubmitted(true);
      setFormData({ name: '', email: '', phone: '', message: '' });
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl">
        <header className="mb-10">
          <h1 className="text-4xl font-black text-gray-900 font-serif mb-4">Contact</h1>
          <p className="text-gray-500 italic font-serif">Have a question or feedback? Drop us a line below.</p>
        </header>

        {submitted ? (
          <div className="bg-green-50 border-l-4 border-green-500 p-8 rounded shadow-sm animate-in fade-in duration-500">
            <h2 className="text-xl font-bold text-green-800 mb-2 font-serif">Message Received</h2>
            <p className="text-green-700 leading-relaxed">
              Thank you for reaching out. Our editorial team will review your message shortly.
            </p>
            <button 
                onClick={() => setSubmitted(false)}
                className="mt-6 text-[10px] font-black uppercase tracking-widest text-green-800 border-b-2 border-green-800"
            >
                Send another message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700 text-xs font-bold uppercase tracking-widest animate-pulse">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-2 tracking-widest">Name *</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 p-3 outline-none focus:border-blue-500 bg-white text-gray-900 font-serif"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-2 tracking-widest">Email *</label>
                <input 
                  type="email" 
                  className="w-full border border-gray-300 p-3 outline-none focus:border-blue-500 bg-white text-gray-900 font-serif"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-gray-500 mb-2 tracking-widest">Phone (Optional)</label>
              <input 
                type="tel" 
                className="w-full border border-gray-300 p-3 outline-none focus:border-blue-500 bg-white text-gray-900 font-serif"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-gray-500 mb-2 tracking-widest">Message *</label>
              <textarea 
                className="w-full border border-gray-300 p-4 min-h-[150px] outline-none focus:border-blue-500 bg-white text-gray-900 font-serif leading-relaxed"
                value={formData.message}
                onChange={e => setFormData({...formData, message: e.target.value})}
                required
              ></textarea>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-[#1d2327] text-white px-10 py-4 font-black uppercase text-[11px] tracking-[0.3em] hover:bg-black transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        )}
      </div>
    </Layout>
  );
};

export default ContactView;

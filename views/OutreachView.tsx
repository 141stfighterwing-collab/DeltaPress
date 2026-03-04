import React, { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../services/supabase';

const OutreachView: React.FC = () => {
  const [formUrl, setFormUrl] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFormUrl = async () => {
      try {
        const { data: siteSettings } = await supabase
          .from('site_settings')
          .select('outreach_form_url')
          .eq('id', 1)
          .maybeSingle();

        if (siteSettings?.outreach_form_url?.trim()) {
          setFormUrl(siteSettings.outreach_form_url.trim());
        }
      } finally {
        setLoading(false);
      }
    };

    fetchFormUrl();
  }, []);

  const embeddedFormUrl = useMemo(() => {
    if (!formUrl) return null;

    try {
      const url = new URL(formUrl);
      const isGoogleFormHost = url.hostname.includes('docs.google.com');
      const hasFormsPath = url.pathname.includes('/forms/');
      const isFormPage = url.pathname.includes('/viewform') || url.pathname.includes('/formResponse');

      if (!isGoogleFormHost || !hasFormsPath || !isFormPage) {
        return null;
      }

      if (url.pathname.includes('/formResponse')) {
        url.pathname = url.pathname.replace('/formResponse', '/viewform');
      }

      url.searchParams.set('embedded', 'true');
      return url.toString();
    } catch {
      return null;
    }
  }, [formUrl]);

  return (
    <Layout>
      <div className="max-w-4xl">
        <header className="mb-8">
          <h1 className="text-4xl font-black text-gray-900 font-serif mb-3">Outreach</h1>
          <p className="text-gray-500 italic font-serif">
            Use the form below to submit outreach opportunities, partnership requests, or tips for the newsroom.
          </p>
        </header>

        {embeddedFormUrl ? (
          <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
            <iframe
              title="Outreach Google Form"
              src={embeddedFormUrl}
              className="w-full min-h-[1200px]"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded shadow-sm p-8">
            <h2 className="text-xl font-black text-gray-900 mb-3 font-serif">Google Form is not embeddable yet</h2>
            <p className="text-gray-600 leading-relaxed mb-5">
              {loading
                ? 'Loading your outreach form settings...'
                : 'Please set the full Google Form URL (ending in /viewform) in site settings. Once saved, this page will render the embedded form automatically.'}
            </p>
            {formUrl && (
              <a
                href={formUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-[#1d2327] text-white px-6 py-3 font-black uppercase text-[10px] tracking-[0.2em] hover:bg-black transition-all"
              >
                Open Form in New Tab
              </a>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default OutreachView;

import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../services/supabase';

const DEFAULT_FORM_URL = 'https://docs.google.com/forms';

const OutreachView: React.FC = () => {
  const [formUrl, setFormUrl] = useState(DEFAULT_FORM_URL);

  useEffect(() => {
    const fetchFormUrl = async () => {
      const { data: siteSettings } = await supabase
        .from('site_settings')
        .select('outreach_form_url')
        .eq('id', 1)
        .maybeSingle();

      if (siteSettings?.outreach_form_url?.trim()) {
        setFormUrl(siteSettings.outreach_form_url.trim());
      }
    };

    fetchFormUrl();
  }, []);

  return (
    <Layout>
      <div className="max-w-4xl">
        <header className="mb-8">
          <h1 className="text-4xl font-black text-gray-900 font-serif mb-3">Outreach</h1>
          <p className="text-gray-500 italic font-serif">
            Use the form below to submit outreach opportunities, partnership requests, or tips for the newsroom.
          </p>
        </header>

        <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
          <iframe
            title="Outreach Google Form"
            src={formUrl}
            className="w-full min-h-[1200px]"
            loading="lazy"
          />
        </div>
      </div>
    </Layout>
  );
};

export default OutreachView;

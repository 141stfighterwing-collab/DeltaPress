import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
}

const SEO: React.FC<SEOProps> = ({
  title,
  description,
  keywords,
  image,
  url,
  type = 'website'
}) => {
  const defaultTitle = 'Twenty Ten Personal Blog';
  const defaultDescription = 'A high-performance personal blogging platform built with React, Tailwind, and Supabase.';
  // Include required SEO keywords: Socialist, AI
  const defaultKeywords = 'Socialist, AI, Blog, News, Technology, Politics, Artificial Intelligence, Socialist AI';
  const siteUrl = 'https://twenty-ten-blog.app'; // Can be replaced with actual production URL

  const seo = {
    title: title ? `${title} | ${defaultTitle}` : defaultTitle,
    description: description || defaultDescription,
    keywords: keywords || defaultKeywords,
    image: image || `${siteUrl}/default-og-image.jpg`,
    url: url || siteUrl,
  };

  return (
    <Helmet>
      {/* Standard metadata tags */}
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      <meta name="keywords" content={seo.keywords} />

      {/* Open Graph tags for social media sharing */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={seo.title} />
      <meta property="og:description" content={seo.description} />
      <meta property="og:image" content={seo.image} />
      <meta property="og:url" content={seo.url} />
      <meta property="og:site_name" content={defaultTitle} />

      {/* Twitter Card tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seo.title} />
      <meta name="twitter:description" content={seo.description} />
      <meta name="twitter:image" content={seo.image} />
    </Helmet>
  );
};

export default SEO;

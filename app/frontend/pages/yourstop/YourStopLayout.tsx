import { ReactNode, useEffect } from 'react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { CustomerAuthProvider } from '@/hooks/use-customer-auth';
import { Toaster } from 'sonner';
import '@/app/globals.css';
import './yourstop-isolation.css';

interface YourStopLayoutProps {
  children: ReactNode;
}

export default function YourStopLayout({ children }: YourStopLayoutProps) {
  // Load fonts and meta tags on mount (client-side rendering)
  useEffect(() => {
    // Override main app's font-size reduction for YourStop
    const originalFontSize = document.documentElement.style.fontSize;
    document.documentElement.style.fontSize = '100%';
    // Add class to html to override global styles
    document.documentElement.classList.add('yourstop-active');
    document.documentElement.classList.add('scroll-smooth');
    
    // Preconnect to Google Fonts
    const preconnect1 = document.createElement('link');
    preconnect1.rel = 'preconnect';
    preconnect1.href = 'https://fonts.googleapis.com';
    if (!document.querySelector('link[href="https://fonts.googleapis.com"]')) {
      document.head.appendChild(preconnect1);
    }

    const preconnect2 = document.createElement('link');
    preconnect2.rel = 'preconnect';
    preconnect2.href = 'https://fonts.gstatic.com';
    preconnect2.crossOrigin = 'anonymous';
    if (!document.querySelector('link[href="https://fonts.gstatic.com"]')) {
      document.head.appendChild(preconnect2);
    }

    // Load Inter font
    const interFont = document.createElement('link');
    interFont.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap';
    interFont.rel = 'stylesheet';
    if (!document.querySelector(`link[href="${interFont.href}"]`)) {
      document.head.appendChild(interFont);
    }

    // Load Playfair Display font
    const playfairFont = document.createElement('link');
    playfairFont.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap';
    playfairFont.rel = 'stylesheet';
    if (!document.querySelector(`link[href="${playfairFont.href}"]`)) {
      document.head.appendChild(playfairFont);
    }

    // Load Space Grotesk font (for font-display and font-heading classes)
    const spaceGroteskFont = document.createElement('link');
    spaceGroteskFont.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap';
    spaceGroteskFont.rel = 'stylesheet';
    if (!document.querySelector(`link[href="${spaceGroteskFont.href}"]`)) {
      document.head.appendChild(spaceGroteskFont);
    }

    // Set theme color
    let themeColor = document.querySelector('meta[name="theme-color"]');
    if (!themeColor) {
      themeColor = document.createElement('meta');
      themeColor.setAttribute('name', 'theme-color');
      themeColor.setAttribute('content', 'hsl(var(--brand-secondary))');
      document.head.appendChild(themeColor);
    }

    // Ensure lang is set (do not clobber existing classes)
    document.documentElement.lang = 'en';

    // Cleanup: restore original font size when component unmounts
    return () => {
      document.documentElement.style.fontSize = originalFontSize;
      document.documentElement.classList.remove('yourstop-active');
    };
  }, []);

  return (
    <CustomerAuthProvider>
      <div className="yourstop-app min-h-screen flex flex-col" style={{ fontSize: '100%' }}>
        <Header />
        <main className="min-h-[calc(100vh-8rem)]">{children}</main>
        <Footer />
        <Toaster />
      </div>
    </CustomerAuthProvider>
  );
}

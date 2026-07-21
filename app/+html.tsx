import { ScrollViewStyleReset } from 'expo-router/html';
import { PropsWithChildren } from 'react';

/**
 * Default HTML shell for Cheezus web.
 *
 * This sets the BASE meta tags. For the profile routes (`/@username` and
 * `/profile/[id]`), the Cloudflare Worker (see web/worker/profile-meta.ts)
 * intercepts the request and rewrites these tags with per-profile OG data
 * pointing to the `profile-og-image` edge function — that's how link
 * previews on iMessage/WhatsApp/Twitter become rich cards. Crawlers don't
 * execute JS, so edge rewrites are necessary.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* Defaults — Cloudflare Worker overrides per profile route */}
        <title>Cheezus — Discover, rate, and share great cheese</title>
        <meta name="description" content="The social home for cheese lovers. Discover producers, log cheeses, and build your taste profile." />

        {/* Open Graph defaults */}
        <meta property="og:site_name" content="Cheezus" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Cheezus — Discover, rate, and share great cheese" />
        <meta property="og:description" content="The social home for cheese lovers. Discover producers, log cheeses, and build your taste profile." />
        <meta property="og:url" content="https://cheezus.co" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@cheezus" />

        {/* Smart App Banner (iOS) — prompts to open/install the native app */}
        <meta name="apple-itunes-app" content="app-id=6756271218" />

        {/* Theme color — soft gold brand */}
        <meta name="theme-color" content="#FCD95B" />

        {/* Favicon — points to the app icon; replace when custom favicon exists */}
        <link rel="icon" href="/assets/images/icon.png" />
        <link rel="apple-touch-icon" href="/assets/images/icon.png" />

        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: WEB_BASE_CSS }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

// Minimal CSS reset tailored for the Expo Router web experience.
// RN Web is responsible for most layout; we only touch system-level defaults.
const WEB_BASE_CSS = `
  html, body, #root { height: 100%; margin: 0; padding: 0; }
  body { background-color: #FFFFFF; -webkit-font-smoothing: antialiased; font-family: Inter, system-ui, sans-serif; }
  /* Prevent horizontal scroll on landing from sticky install bar */
  body { overflow-x: hidden; }
`;

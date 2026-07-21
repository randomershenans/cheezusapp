// Profile OG Image — Supabase Edge Function
//
// Generates a 1200x630 PNG for link previews of Cheezus public profiles.
// Deployed as: supabase functions deploy profile-og-image
//
// URL: https://<project>.supabase.co/functions/v1/profile-og-image?user=<id-or-vanity>&v=<og_version>
//
// The `v` param keys the CDN cache — the DB trigger in
// db/profile-og-versioning.sql bumps `profiles.profile_og_version` on any
// change that affects the image (new top-4★ log, profile edit).
//
// Uses `satori` (JSX → SVG) + `resvg` (SVG → PNG). Both work in Deno's npm-compat
// runtime. Fonts are lazy-loaded from Google Fonts CDN on first invocation
// and cached in memory for the lifetime of the worker.

/// <reference types="https://esm.sh/@types/react@18.2.0/index.d.ts" />
// @ts-ignore - deno edge runtime resolves these at deploy time
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-ignore
import satori from 'npm:satori@0.10.13';
// @ts-ignore
import { Resvg } from 'npm:@resvg/resvg-js@2.6.2';
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

// Brand tokens — mirror constants/Colors.ts + Typography.ts
const BRAND = {
  gold: '#FCD95B',
  goldDeep: '#EAB308',
  cream: '#FFFEF7',
  text: '#2C3E50',
  textSecondary: '#7F8C8D',
  border: '#E8E8E8',
  // Warm background gradient used on the profile hero
  bgTop: '#FCD95B',
  bgMid: '#FDE68A',
  bgBot: '#FFFEF7',
};

// Lazy-loaded fonts (Google Fonts — v2 TTF endpoint for satori compatibility).
let fontsPromise: Promise<{ inter400: ArrayBuffer; inter700: ArrayBuffer; grotesk700: ArrayBuffer }> | null = null;
async function loadFonts() {
  if (!fontsPromise) {
    fontsPromise = (async () => {
      const [inter400Res, inter700Res, grotesk700Res] = await Promise.all([
        fetch('https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf'),
        fetch('https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-normal.ttf'),
        fetch('https://cdn.jsdelivr.net/fontsource/fonts/space-grotesk@latest/latin-700-normal.ttf'),
      ]);
      return {
        inter400: await inter400Res.arrayBuffer(),
        inter700: await inter700Res.arrayBuffer(),
        grotesk700: await grotesk700Res.arrayBuffer(),
      };
    })();
  }
  return fontsPromise;
}

// Resolve user id from either a UUID or a vanity handle.
async function resolveUser(input: string): Promise<{ id: string; name: string | null; tagline: string | null; avatar_url: string | null; vanity_url: string | null } | null> {
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const query = uuidRe.test(input)
    ? supabase.from('profiles').select('id, name, tagline, avatar_url, vanity_url').eq('id', input).maybeSingle()
    : supabase.from('profiles').select('id, name, tagline, avatar_url, vanity_url').eq('vanity_url', input).maybeSingle();
  const { data } = await query;
  return data ?? null;
}

serve(async (req) => {
  const url = new URL(req.url);
  const userParam = url.searchParams.get('user') ?? url.searchParams.get('u');

  if (!userParam) {
    return new Response('Missing user param', { status: 400 });
  }

  try {
    const profile = await resolveUser(userParam);
    if (!profile) {
      return new Response('Profile not found', { status: 404 });
    }

    // Pull the rich payload (stats + top 4) via the same RPC the app uses
    const { data: payload } = await supabase.rpc('get_public_profile', { p_user_id: profile.id });

    const stats = payload?.stats ?? { cheese_count: 0, country_count: 0, avg_rating: null };
    const topShelf: Array<{ image_url: string | null; name: string }> = payload?.top_shelf ?? [];
    const topCheeseImages = topShelf.slice(0, 4).map((c) => c.image_url).filter(Boolean) as string[];

    const fonts = await loadFonts();

    const handle = profile.vanity_url ? `@${profile.vanity_url}` : '';
    const displayName = profile.name || 'Cheese Lover';
    const subtitle = profile.tagline || 'on Cheezus';

    const statsStrip = [
      `${stats.cheese_count} cheese${stats.cheese_count === 1 ? '' : 's'}`,
      `${stats.country_count} ${stats.country_count === 1 ? 'country' : 'countries'}`,
      stats.avg_rating != null ? `★ ${Number(stats.avg_rating).toFixed(1)} avg` : null,
    ].filter(Boolean).join('  ·  ');

    // JSX-like tree that Satori understands. We use the `React.createElement` style
    // (satori accepts objects shaped like React elements).
    const tree: any = {
      type: 'div',
      props: {
        style: {
          width: 1200, height: 630, display: 'flex',
          background: `linear-gradient(180deg, ${BRAND.bgTop} 0%, ${BRAND.bgMid} 55%, ${BRAND.bgBot} 100%)`,
          fontFamily: 'Inter',
          padding: 64,
        },
        children: [
          // LEFT — identity
          {
            type: 'div',
            props: {
              style: { display: 'flex', flexDirection: 'column', width: 560, gap: 20 },
              children: [
                // Avatar
                profile.avatar_url ? {
                  type: 'img',
                  props: {
                    src: profile.avatar_url,
                    width: 140, height: 140,
                    style: { borderRadius: 70, border: `3px solid ${BRAND.goldDeep}` },
                  },
                } : {
                  type: 'div',
                  props: {
                    style: {
                      width: 140, height: 140, borderRadius: 70,
                      background: BRAND.cream, border: `3px solid ${BRAND.goldDeep}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 64,
                    },
                    children: '🧀',
                  },
                },
                // Name
                {
                  type: 'div',
                  props: {
                    style: {
                      fontFamily: 'Space Grotesk', fontSize: 84, fontWeight: 700,
                      color: BRAND.text, lineHeight: 1, marginTop: 12,
                    },
                    children: displayName,
                  },
                },
                // Handle
                handle ? {
                  type: 'div',
                  props: {
                    style: { fontSize: 24, color: BRAND.textSecondary, fontWeight: 400 },
                    children: handle,
                  },
                } : null,
                // Tagline
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: 28, color: BRAND.text, marginTop: 8,
                      lineHeight: 1.3, maxWidth: 540,
                    },
                    children: subtitle,
                  },
                },
                // Stats strip
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: 24, color: BRAND.text, fontWeight: 700,
                      marginTop: 'auto',
                      paddingTop: 24,
                    },
                    children: statsStrip,
                  },
                },
                // Cheezus wordmark
                {
                  type: 'div',
                  props: {
                    style: {
                      fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: 700,
                      color: BRAND.goldDeep, letterSpacing: 2, marginTop: 16,
                      textTransform: 'uppercase',
                    },
                    children: 'Cheezus',
                  },
                },
              ].filter(Boolean),
            },
          },
          // RIGHT — 2x2 top shelf grid
          {
            type: 'div',
            props: {
              style: {
                marginLeft: 'auto', width: 480, height: 480,
                display: 'flex', flexWrap: 'wrap', gap: 12,
              },
              children: topCheeseImages.length > 0
                ? topCheeseImages.slice(0, 4).map((src) => ({
                    type: 'img',
                    props: {
                      src,
                      width: 234, height: 234,
                      style: { borderRadius: 20, objectFit: 'cover', border: `2px solid ${BRAND.cream}` },
                    },
                  }))
                : [{
                    type: 'div',
                    props: {
                      style: {
                        width: 480, height: 480, borderRadius: 24,
                        background: BRAND.cream, border: `2px dashed ${BRAND.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 180,
                      },
                      children: '🧀',
                    },
                  }],
            },
          },
        ],
      },
    };

    const svg = await satori(tree, {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Inter',         data: fonts.inter400,   weight: 400, style: 'normal' },
        { name: 'Inter',         data: fonts.inter700,   weight: 700, style: 'normal' },
        { name: 'Space Grotesk', data: fonts.grotesk700, weight: 700, style: 'normal' },
      ],
    });

    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
    const png = resvg.render().asPng();

    return new Response(png, {
      headers: {
        'Content-Type': 'image/png',
        // Aggressive cache: cache-busting happens via ?v=<og_version> from the caller.
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch (err) {
    console.error('[profile-og-image] failed:', err);
    return new Response(`Error: ${(err as Error).message}`, { status: 500 });
  }
});

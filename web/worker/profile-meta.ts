/**
 * Cheezus profile meta-tag injector — Cloudflare Worker
 *
 * This worker fronts the static web build (whatever host: Vercel, Netlify,
 * Cloudflare Pages, Supabase Storage). For profile routes it:
 *   1. Fetches the profile data from Supabase
 *   2. Rewrites <meta og:*> tags in the HTML shell with per-profile values
 *   3. Points og:image to the Supabase edge function profile-og-image,
 *      with ?v=<profile_og_version> so cache-busting works.
 *
 * Deploy: `wrangler deploy`. Bind the site origin and Supabase URL via
 * `wrangler.toml` env vars. Route: `cheezus.co/@*` and `cheezus.co/profile/*`.
 *
 * Alternative hosts: the logic here is portable to Vercel Edge Functions,
 * Netlify Edge Handlers, or Deno Deploy with near-identical code.
 */

export interface Env {
  STATIC_ORIGIN: string;       // e.g. "https://cheezus-web.pages.dev"
  SUPABASE_URL: string;        // e.g. "https://xkvjqhgnwqawpojjegtr.supabase.co"
  SUPABASE_ANON_KEY: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Routes we care about: /@username and /profile/:id
    const vanityMatch = url.pathname.match(/^\/@([^\/?]+)\/?$/);
    const profileMatch = url.pathname.match(/^\/profile\/([^\/?]+)\/?$/);

    const isBot = isCrawler(request.headers.get('user-agent') ?? '');
    const wantsProfileMeta = Boolean(vanityMatch || profileMatch);

    // Pass through non-profile routes untouched
    if (!wantsProfileMeta) {
      return fetch(env.STATIC_ORIGIN + url.pathname + url.search, request);
    }

    // Resolve profile
    const identifier = vanityMatch?.[1] ?? profileMatch?.[1] ?? '';
    const profile = await fetchProfile(env, identifier);

    // Fetch the SPA shell
    const origin = new URL(env.STATIC_ORIGIN);
    const originReq = new Request(origin.origin + '/index.html', request);
    const originRes = await fetch(originReq);
    let html = await originRes.text();

    // If no profile, keep defaults (user gets a generic preview + 404 in-app)
    if (!profile) {
      return new Response(html, {
        status: 200,
        headers: withContentType(originRes.headers, 'text/html; charset=utf-8'),
      });
    }

    const displayName = profile.name || 'Cheese Lover';
    const handle = profile.vanity_url ? `@${profile.vanity_url}` : '';
    const title = `${displayName}${handle ? ` (${handle})` : ''} on Cheezus`;
    const description = profile.tagline
      || `${profile.cheese_count ?? 0} cheeses · ${profile.country_count ?? 0} countries. Follow ${displayName} on Cheezus.`;
    const canonical = `https://cheezus.co${url.pathname}`;
    const ogImage = `${env.SUPABASE_URL}/functions/v1/profile-og-image?user=${encodeURIComponent(profile.id)}&v=${profile.profile_og_version ?? 1}`;

    html = injectMeta(html, {
      title,
      description,
      canonical,
      ogImage,
    });

    return new Response(html, {
      status: 200,
      headers: withContentType(originRes.headers, 'text/html; charset=utf-8', {
        // Crawlers can cache for hours; humans get a brief edge cache.
        'Cache-Control': isBot ? 'public, max-age=3600' : 'public, max-age=60',
      }),
    });
  },
};

// ──────────────────────────────────────────────────────────────────────────
// Helpers

type ProfileData = {
  id: string;
  name: string | null;
  tagline: string | null;
  avatar_url: string | null;
  vanity_url: string | null;
  profile_og_version: number | null;
  cheese_count?: number;
  country_count?: number;
};

async function fetchProfile(env: Env, identifier: string): Promise<ProfileData | null> {
  if (!identifier) return null;

  const isUuid = UUID_RE.test(identifier);
  const headers = {
    apikey: env.SUPABASE_ANON_KEY,
    Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
  };

  // Resolve profile by UUID or vanity_url
  const lookup = isUuid
    ? `${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(identifier)}&select=id,name,tagline,avatar_url,vanity_url,profile_og_version,is_public`
    : `${env.SUPABASE_URL}/rest/v1/profiles?vanity_url=eq.${encodeURIComponent(identifier)}&select=id,name,tagline,avatar_url,vanity_url,profile_og_version,is_public`;

  const res = await fetch(lookup, { headers });
  if (!res.ok) return null;

  const rows = (await res.json()) as Array<ProfileData & { is_public: boolean }>;
  const row = rows[0];
  if (!row || row.is_public === false) return null;

  // Best-effort — grab aggregate counts for the description line
  // (single RPC call — the public-profile RPC returns stats)
  const statsRes = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/get_public_profile`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_user_id: row.id }),
  });

  let counts: Partial<ProfileData> = {};
  if (statsRes.ok) {
    const payload = (await statsRes.json()) as { stats?: { cheese_count: number; country_count: number } };
    counts = {
      cheese_count: payload?.stats?.cheese_count,
      country_count: payload?.stats?.country_count,
    };
  }

  return { ...row, ...counts };
}

function injectMeta(
  html: string,
  { title, description, canonical, ogImage }: { title: string; description: string; canonical: string; ogImage: string }
): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // Replace <title>
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${esc(title)}</title>`);

  // Drop existing og/twitter meta tags we're going to rewrite
  html = html.replace(/<meta\s+(?:property|name)="(?:og:title|og:description|og:image|og:url|twitter:title|twitter:description|twitter:image|description)"[^>]*>\s*/gi, '');
  html = html.replace(/<link\s+rel="canonical"[^>]*>\s*/gi, '');

  const block = `
    <meta name="description" content="${esc(description)}" />
    <link rel="canonical" href="${esc(canonical)}" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:image" content="${esc(ogImage)}" />
    <meta property="og:url" content="${esc(canonical)}" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(description)}" />
    <meta name="twitter:image" content="${esc(ogImage)}" />
  `;

  return html.replace(/<\/head>/i, `${block}</head>`);
}

function withContentType(base: Headers, contentType: string, extra: Record<string, string> = {}): Headers {
  const h = new Headers(base);
  h.set('Content-Type', contentType);
  for (const [k, v] of Object.entries(extra)) h.set(k, v);
  return h;
}

function isCrawler(ua: string): boolean {
  return /bot|crawler|spider|facebookexternalhit|twitterbot|slackbot|discordbot|linkedinbot|whatsapp|telegrambot|imessagebot/i.test(ua);
}

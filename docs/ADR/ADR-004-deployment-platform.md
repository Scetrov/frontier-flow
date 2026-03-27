# ADR 4: Netlify as Deployment Platform

## Context

Frontier Flow is a static React single-page application that requires hosting for the built `dist/` folder, a serverless function to handle the GitHub OAuth token exchange (the client secret cannot be exposed to the browser), automatic deploy previews for pull requests, fine-grained control over HTTP headers (Content Security Policy, HSTS, X-Frame-Options), and HTTPS with custom domain support.

Several platforms were evaluated. GitHub Pages provides free static hosting, but offers no serverless functions and no deploy previews, making it insufficient for the OAuth requirement. Vercel provides both static hosting and serverless functions with deploy previews and header configuration, and would be a viable alternative. Cloudflare Pages offers similar capabilities through Workers and has strong edge performance. Netlify provides static hosting, serverless functions via `@netlify/functions`, deploy previews, and granular header configuration through `netlify.toml` and `_headers` files.

The OAuth callback is the only server-side requirement. It is a single function that exchanges an authorisation code for an access token using the `GITHUB_CLIENT_SECRET`. This does not justify a dedicated backend service.

## Decision

We will use Netlify for hosting, serverless functions, and deployment. The OAuth token exchange will be implemented as a Netlify serverless function at `/api/github-callback`. Security headers, including the Content Security Policy with `wasm-unsafe-eval`, will be configured in `netlify.toml`. The build command will be `bun run build`. Netlify and CI should still perform deterministic installs using `bun install --frozen-lockfile` together with the committed `bun.lockb` to guarantee reproducible builds.

## Status

Accepted.

## Consequences

The deployment pipeline is simple and fully automated. Pull requests receive preview URLs for visual review before merging. Environment secrets like `GITHUB_CLIENT_SECRET` are stored in Netlify's environment configuration, never in the repository. The free tier is sufficient for the current project scale.

The serverless function introduces a soft vendor lock-in on the `@netlify/functions` API. If the project's server-side needs grow beyond a single OAuth callback — for example, to add a server-side compilation fallback — migration to a dedicated backend would be necessary, and the function would need to be rewritten for the target platform. Serverless function cold starts may add approximately 200 milliseconds of latency to the OAuth token exchange, though this is a one-time cost per session and does not affect the core user experience.

# Invoice App

## Deployment
1. Push code to GitHub.
2. On Vercel, import the repo and deploy.
3. Set environment variables in Vercel:
   - NEXT_PUBLIC_SUPABASE_URL = (your supabase url)
   - NEXT_PUBLIC_SUPABASE_ANON_KEY = (your anon key)
4. Enable GitHub Actions (CI) to run tests on PRs.

## Tests
- Unit tests: `npm run test:unit`
- E2E tests: `npm run test:e2e` (Playwright)

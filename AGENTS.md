# Repository Guidelines

## Project Structure & Module Organization
- Frontend source lives under `src/`, with `main.tsx` bootstrapping the app and `App.tsx` wiring providers and routing.  
- Landing page and dashboard views are in `src/components/`, with grouped sub-folders such as `landing/`, `ui/`, and `common/`.  
- Global styles and Tailwind configuration reside in `src/styles/`, `tailwind.config.js`, and `postcss.config.js`.  
- Supabase edge functions and helpers are under `src/supabase/`, while shared utilities live in `src/utils/`.  
- Markdown content (journaling guides, admin docs) is stored directly in `src/` for easy import.

## Build, Test, and Development Commands
- `npm install` — install dependencies.  
- `npm run dev` — start the Vite dev server on port 3000 with hot reload.  
- `npm run build` — produce a production build in `build/`.  
- `npm run start` — serve the production bundle locally via `serve`.

## Coding Style & Naming Conventions
- Use TypeScript for components and hooks; prefer functional components with React hooks.  
- Favor Tailwind utility classes plus design tokens from `globals.css`; use the shadcn-inspired components in `src/components/ui/` before writing bespoke markup.  
- Keep files and exports in `PascalCase` for components, `camelCase` for helpers, and co-locate feature-specific styles or data alongside the component.  
- Run Prettier-compatible formatting (2-space indentation) and avoid introducing non-ASCII characters unless already present.

## Testing Guidelines
- No automated suite ships today; add targeted tests with Vitest + React Testing Library when touching critical flows (auth, payments, Supabase edge calls).  
- Name test files `*.test.ts(x)` beside the code under test.  
- For manual verification, confirm auth modals, Stripe flows, and Tailwind styling via `npm run dev` in both light and dark modes.

## Commit & Pull Request Guidelines
- Write concise, imperative commit subjects (`fix landing CTA modal`) followed by optional detail lines.  
- Squash work-in-progress commits before merging; keep history readable for the release process.  
- Pull requests should include: brief summary, screenshots/GIFs for UI changes, testing notes (`npm run dev`, manual steps), and links to related issues or tickets.

## Security & Configuration Tips
- Keep Supabase and Stripe keys out of source control; use environment variables and `.env` files excluded via `.gitignore`.  
- Review `CLAUDE.md` before large changes—it documents architecture, payment flows, and admin expectations that agents must preserve.

@AGENTS.md

Project overview, code map and conventions: see README.md. Deployment: SETUP.md.
- Run `npm run typecheck` and `npx eslint src` before committing.
- Schema changes: edit src/db/schema.ts, then `npm run db:generate`; migrations run automatically on build.

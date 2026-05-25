# Repository Guidelines

## Project Structure & Module Organization
Primary application code lives in `app/`. The React + TypeScript frontend is under `app/src`, organized by feature and layer: `features/` for domain UI, `pages/` for route-level screens, `shared/` for reusable API/db/lib code, `components/ui/` for primitives, and `stores/` for Zustand state. Tauri desktop/mobile backend code lives in `app/src-tauri/src` with Rust entry points in `main.rs`, `lib.rs`, and `commands.rs`. Build output such as `app/dist`, `app/src-tauri/target`, and `app/src-tauri/gen` is generated and should not be edited directly.

## Build, Test, and Development Commands
Run commands from `app/` unless noted otherwise.

- `npm install`: install frontend dependencies.
- `npm run dev`: start the Vite dev server.
- `npm run build`: type-check config/app code and build the frontend bundle.
- `npm run preview`: serve the production bundle locally.
- `npm run tauri dev`: launch the Tauri app in development mode.
- `npm run tauri build`: produce a desktop/mobile Tauri build.

## Coding Style & Naming Conventions
Use TypeScript with strict mode and the `@/*` path alias for imports from `app/src`. Follow the existing style: 2-space indentation, semicolons, double quotes, and named exports unless a framework config requires `export default`. Name React components and pages in PascalCase (`HomePage.tsx`), hooks in camelCase with a `use` prefix (`useAppStore.ts`), and utility modules in kebab-case or concise lowercase (`app-api.ts`, `utils.ts`).

## Testing Guidelines
There is no dedicated JS or Rust test runner configured yet. For now, treat `npm run build` as the minimum verification step for frontend changes, and use `npm run tauri build` when touching `src-tauri`. When adding tests, place frontend tests next to the feature or under `app/src/__tests__`, and prefer `*.test.ts` / `*.test.tsx` naming.

## Commit & Pull Request Guidelines
Git history is not available in this workspace snapshot, so use clear conventional-style commits such as `feat: add intake entry flow` or `fix: guard missing store value`. Keep commits focused. PRs should include a short summary, impacted areas, manual verification steps, linked issues, and screenshots or recordings for UI changes.

## Security & Configuration Tips
Do not commit secrets, local Android/Gradle artifacts, or generated `.js/.d.ts` config output unless intentionally tracked. Prefer editing source files such as `vite.config.ts` and `tailwind.config.ts`, not their generated companions.

# Tooling notes

## TypeScript is pinned to 6.0.3

`typescript@7.x` is the current `latest` tag, and this repository deliberately
does not use it.

TypeScript 7 is the native (Go) compiler. Its npm package exposes only the
`tsc` binary and a set of `./unstable/*` entry points — it does **not** ship
the classic JavaScript compiler API. `typescript-eslint@8.x` peer-requires
`typescript >=4.8.4 <6.1.0` and is built on that API, so type-aware linting
cannot run against TypeScript 7 at all.

Type-aware ESLint rules are load-bearing here: `strictTypeChecked` is what
enforces the no-`any` rule and catches unhandled promises and unsafe
assignments. Losing it costs more than the compiler's speed gains are worth at
this stage.

`typescript@6.0.3` is the newest stable release of the JavaScript compiler
line, so the pin is to a current release, not an old one.

**Revisit when** `typescript-eslint` ships TypeScript 7 support. At that point
bump both together and confirm `npm run lint` still reports type-aware rules.

**Only one TypeScript package is installed.** Do not add
`@typescript/native-preview` or a second `typescript` alongside it — two
compilers in one workspace produce confusing, divergent diagnostics.

## Other version choices

| Tool        | Version | Note                                                                                                                                                                    |
| ----------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ESLint      | 10.x    | Flat config in `eslint.config.js`. Plain JS, not TS — ESLint 10 does not bundle `jiti`, so a `.ts` config would need an extra dependency.                               |
| Vitest      | 4.x     | `defineWorkspace` / `vitest.workspace.ts` were removed. Projects are declared via `test.projects` in the root `vitest.config.ts`.                                       |
| Zod         | 4.x     | `z.iso.datetime()`, top-level `z.url()` / `z.uuid()` / `z.int()`, and `z.prettifyError()` for readable failures. `z.number().safe()` and `z.ZodTypeAny` are deprecated. |
| Express     | 5.x     | Async handler rejections propagate to the error middleware automatically.                                                                                               |
| drizzle-kit | 0.31.x  | `defineConfig({ dialect: 'postgresql', ... })`.                                                                                                                         |

### Known advisory

`npm audit` reports 4 moderate findings, all from one chain:
`drizzle-kit → @esbuild-kit/esm-loader → @esbuild-kit/core-utils → esbuild <=0.24.2`.

The advisory concerns esbuild's **development server** accepting cross-origin
requests. drizzle-kit invokes esbuild only to transpile `drizzle.config.ts`; no
dev server is started, so the vulnerable path is not reachable. It is also a
`devDependency` of a CLI, never bundled into the API or the web app.

`npm audit fix --force` "resolves" it by downgrading drizzle-kit to 0.18.1 —
several major versions back, with a different config format. Not worth it.
Re-check when drizzle-kit updates its esbuild chain.

## Build model

`packages/shared` and `packages/database` are composite TypeScript projects
that emit `dist/` with declarations. `apps/api` and `apps/web` consume them as
ordinary npm packages through workspace symlinks — no bundler, no path
aliases, no build-order guessing.

The consequence: **packages must be built before the apps typecheck or run.**
That is why `build:packages` is the first step of `build`, `typecheck` and
`dev`. During `npm run dev`, `tsc -b --watch` keeps `dist/` current.

Each emitting workspace has two tsconfigs:

- `tsconfig.json` — `noEmit`, includes tests. Used by the editor, the linter's
  project service, and `npm run typecheck`.
- `tsconfig.build.json` — `composite`, emits to `dist/`, excludes `*.test.ts`.

`apps/web` has `tsconfig.json` (app sources, `vite/client` types) and
`tsconfig.node.json` (the Vite and Vitest config files, which run in Node).

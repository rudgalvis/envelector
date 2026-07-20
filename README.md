# envelector

A local developer tool for managing `.env` files. Scan any project directory, compare environment variables across `.env.dev`, `.env.staging`, and `.env.production` side-by-side, and click to apply any value into your active `.env` — all from a browser UI.

> **envelector** = env + selector

---

## How it works

1. Run `envelector` in your terminal — it starts a local web server and opens your browser.
2. Enter a directory path in the sidebar and click **Scan**.
3. The file tree shows all `.env*` files found, recursively, across your entire project.
4. Click a `.env` file to open the comparison view.
5. Each row is a key. Each column is a source environment (`.env.dev`, `.env.staging`, `.env.production`). Click any source button to write that value into your `.env` file immediately.

---

## Installation

```bash
# From npm (once published)
npm install -g envelector

# Or run directly with npx
npx envelector
```

---

## Usage

```bash
envelector
```

Opens `http://localhost:4747` in your browser.

### Environment variables

| Variable | Default     | Description             |
|----------|-------------|-------------------------|
| `PORT`   | `4747`      | Port the server binds to |
| `HOST`   | `localhost` | Host the server binds to |

```bash
PORT=8080 envelector
```

---

## Scanned files

When you scan a directory, envelector recursively walks it and looks for any `.env*` files. For every directory that contains at least one `.env*` file, it normalizes the view to these four canonical files:

| File               | Description                       |
|--------------------|-----------------------------------|
| `.env`             | Active local environment (target) |
| `.env.dev`         | Development environment values    |
| `.env.staging`     | Staging environment values        |
| `.env.production`  | Production environment values     |

Files that don't exist on disk are shown in the sidebar in red as missing. Any other `.env.*` files found (e.g. `.env.example`) are also listed.

**`.env.local` is intentionally ignored** — it's typically gitignored secrets not meant to be compared.

The scanner skips hidden directories, `node_modules`, and `.git`.

---

## .env format support

The parser handles:

- `KEY=value`
- `KEY="double quoted value"`
- `KEY='single quoted value'`
- `export KEY=value`
- `# comments` (full-line and inline)
- Blank lines

When writing a value back to `.env`, the file's existing comments, blank lines, and key ordering are all preserved. Values containing spaces, `#`, or empty strings are automatically quoted.

---

## Development

```bash
# Install dependencies
pnpm install

# Start the dev server (hot reload)
pnpm dev

# Build for production
pnpm build

# Run the built CLI
node bin/envelector

# Type-check
pnpm check

# Lint + format check
pnpm lint

# Auto-format
pnpm format

# Run tests
pnpm test
```

---

## Architecture

```
envelector/
├── bin/envelector             # CLI entry — starts the Node.js server, opens browser
├── src/
│   ├── routes/
│   │   ├── +layout.svelte     # Root layout: sidebar + main area
│   │   ├── +page.svelte       # Main page: EnvEditor or raw file view
│   │   └── api/
│   │       ├── scan/          # POST /api/scan — scan a directory for .env files
│   │       ├── env-data/      # POST /api/env-data — read .env + sibling sources
│   │       ├── env/apply/     # POST /api/env/apply — write a key/value to .env
│   │       └── file/          # GET  /api/file — read raw file contents
│   └── lib/
│       ├── types.ts           # Shared TypeScript types
│       ├── server/
│       │   ├── env-parser.ts  # Parse .env strings; apply a key/value surgically
│       │   └── fs-scanner.ts  # Recursively scan a directory for .env files
│       ├── stores/
│       │   ├── selected-file.svelte.ts  # Currently open file + fetched data
│       │   └── tree-state.svelte.ts     # Sidebar expand/collapse (localStorage)
│       └── components/
│           ├── AppSidebar.svelte  # Path input, scan button, file tree
│           ├── EnvEditor.svelte   # Key × source comparison grid
│           └── FileTree.svelte    # Recursive collapsible tree
└── build/                     # Production build output (adapter-node)
```

### API routes

| Route              | Method | Body / Query            | Returns                                      |
|--------------------|--------|-------------------------|----------------------------------------------|
| `/api/scan`        | POST   | `{ path: string }`      | `FileNode` tree                              |
| `/api/env-data`    | POST   | `{ path: string }`      | `EnvData` (target + sources + all keys)      |
| `/api/env/apply`   | POST   | `{ targetPath, key, value }` | `{ ok: true }`                        |
| `/api/file`        | GET    | `?path=...`             | Raw file text                                |

### Key types

```ts
type FileNode = {
  name: string;
  path: string;
  type: 'file' | 'directory';
  missing?: boolean;       // true if the canonical file doesn't exist on disk
  children?: FileNode[];
};

type EnvSource = {
  name: string;            // e.g. ".env.staging"
  path: string;
  values: Record<string, string>;
};

type EnvData = {
  targetPath: string;      // absolute path to the .env being edited
  target: Record<string, string>;
  sources: EnvSource[];    // .env.dev, .env.staging, .env.production
  allKeys: string[];       // union of all keys across target + sources
};
```

---

## Tech stack

- [SvelteKit 2](https://kit.svelte.dev/) + [Svelte 5](https://svelte.dev/) — framework
- [@sveltejs/adapter-node](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) — standalone Node.js server
- [Tailwind CSS v4](https://tailwindcss.com/) — styling
- [shadcn-svelte](https://www.shadcn-svelte.com/) + [bits-ui](https://bits-ui.com/) — UI components
- [Lucide Svelte](https://lucide.dev/) — icons
- [Vite 7](https://vitejs.dev/) — build tool
- [Vitest](https://vitest.dev/) — testing
- [pnpm](https://pnpm.io/) — package manager

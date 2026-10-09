# GreenKarachi — Start Here with OpenCode

This ZIP is a **starter instruction pack**, not a completed application. OpenCode will build the application in phases using these files.

## 1. Create your project folder (Windows)

Extract the ZIP into a new folder named `GreenKarachi`. Make sure these files are directly inside the folder:

- `AGENTS.md` — the persistent instructions OpenCode recognizes.
- `Agent.md` — a convenient duplicate with the requested filename.
- `GREENKARACHI_BUILD_PHASES.md` — the prompts and acceptance criteria for each phase.
- `START_HERE.md` — these setup instructions.

Do not put these files inside an extra nested folder. Open the `GreenKarachi` folder in VS Code.

## 2. Check prerequisites

Install/confirm:

- OpenCode CLI is installed and you have selected/configured a model provider.
- Node.js and npm are installed (`node -v` and `npm -v` should print versions).
- Git is installed (`git --version`), recommended for tracking changes.

PostgreSQL and database setup are deliberately deferred until Phase 2. No paid API, payment gateway, or image-storage service is required for Phase 0.

## 3. Start OpenCode from the project root

In the VS Code terminal, make sure the current directory is the `GreenKarachi` folder, then run:

```powershell
opencode
```

OpenCode should start with `AGENTS.md` available as project instructions. You do not need to run `/init` first because the starter already includes this file.

## 4. Paste the Phase 0 prompt

Open `GREENKARACHI_BUILD_PHASES.md`, copy the full prompt under **Phase 0 — Bootstrap the new project**, and paste it into OpenCode.

Phase 0 creates the fresh app scaffold and a basic frontend/API health check. Wait for OpenCode to finish the phase, read its report, and run the command it documents.

## 5. Continue one phase at a time

Only after Phase 0 works, ask OpenCode to implement Phase 1. Continue through the phases in order. Do not ask it to build the entire marketplace in one giant task.

The main differentiator to validate later is the supply-gap scenario: a nursery needs 100 trees, has 60, and coordinates offers of 25 and 15 from two other nurseries without double-counting or overcommitting supply.

## Troubleshooting

- If `opencode` is not recognized, confirm the CLI is installed and reopen the terminal.
- If `node` or `npm` is not recognized, install Node.js, reopen the terminal, and check the versions again.
- If dependency installation fails due to network access, ask OpenCode to report the exact failing command and error. Do not let it claim checks succeeded when they did not.
- Never paste API keys or passwords into source code. Keep local values in `.env` files excluded by `.gitignore`, and use only placeholders in `.env.example`.

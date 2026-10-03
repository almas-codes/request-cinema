# Contributing to Request Cinema

Thank you for contributing to Request Cinema! We appreciate bug reports, feature suggestions, documentation improvements, and code submissions.

---

## 🚀 Quick Setup

1. **Prerequisites**: Node.js >= 22.0.0 and pnpm >= 9.0.0.
2. **Clone and Install**:
   ```bash
   git clone https://github.com/almaskhan/request-cinema.git
   cd request-cinema
   pnpm install
   ```
3. **Verify Build & Tests**:
   ```bash
   pnpm verify
   ```

---

## 📜 Conventional Commits

We enforce the Conventional Commits specification. Commit messages must be structured as follows:

```
<type>(<scope>): <short description>
```

### Valid Types
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation updates
- `test`: Adding or correcting tests
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `chore`: Tooling or build configuration changes

### Valid Scopes
- `trace-model`, `otlp`, `engine`, `renderer-pixi`, `react`, `source-resolver`, `store`, `sdk-node`, `test-kit`, `web`, `server`, `docs`, `repo`

---

## 🧪 Quality Standards

- Run `pnpm lint` and `pnpm typecheck` before pushing.
- Write unit and property-based tests for new logic.
- Avoid using `any` or non-null assertions (`!`).
- Add a Changeset (`pnpm changeset`) for changes in publishable packages.

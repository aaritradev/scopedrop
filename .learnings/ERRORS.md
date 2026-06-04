## [ERR-20260603-001] powershell_crypto_api

**Logged**: 2026-06-03T00:00:00+05:30
**Priority**: low
**Status**: pending
**Area**: infra

### Summary
PowerShell secret-generation command used .NET APIs unavailable in this Windows PowerShell environment.

### Error
```
RandomNumberGenerator does not contain a method named Fill.
Convert does not contain a method named ToHexString.
```

### Context
- Attempted to rotate `.env.local` `SESSION_SECRET` using newer .NET APIs.
- Fallback using `RNGCryptoServiceProvider` and byte `ToString('x2')` worked.

### Suggested Fix
Use `RNGCryptoServiceProvider` for Windows PowerShell compatibility unless the runtime is known to support newer .NET APIs.

### Metadata
- Reproducible: yes
- Related Files: .env.local

---

## [ERR-20260604-001] next_lint_unconfigured

**Logged**: 2026-06-04T14:44:29.8429206+05:30
**Priority**: low
**Status**: pending
**Area**: config

### Summary
`npm run lint` cannot run non-interactively because Next.js ESLint has not been configured.

### Error
```
? How would you like to configure ESLint?
Strict (recommended)
Base
Cancel
```

### Context
- Command attempted: `npm run lint`
- The command opened Next's ESLint setup prompt instead of linting the project.
- No ESLint configuration was generated because this task was scoped to generation failure protection.

### Suggested Fix
Configure ESLint intentionally in a separate config task, then rerun `npm run lint`.

### Metadata
- Reproducible: yes
- Related Files: package.json

---

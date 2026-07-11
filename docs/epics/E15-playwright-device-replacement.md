# Epic E15 — Playwright test device replacement & UI validation

> **Status:** SHIPPED · **Story:** US-108 · **Branch:** `antigravity/chore-realme-device`
> **Ships as:** app version **1.5.1** (patch bump)
> **One-liner:** Replace the emulated test device Pixel 7 with a custom realme 16 Pro+ profile, ensuring Playwright verifies UI issues visible in screens for both desktop and the specific mobile device defined.

## Proposed Changes

### Playwright Configuration

Replace Pixel 7 with custom `realme 16 Pro+` mobile emulation project. Ensure tests verify UI issues across both desktop chromium and realme 16 Pro+ mobile profiles.

### Rules

Playwright must also verify any UI issues visible in screens for both desktop and specific mobile device defined.

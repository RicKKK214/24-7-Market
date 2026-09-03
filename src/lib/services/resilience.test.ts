import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Render free-tier resilience tests.
 * The app runs on an EPHEMERAL filesystem and restarts frequently, so it must
 * function with an empty, missing or unwritable database.
 */

vi.mock('@prisma/client', () => ({
  PrismaClient: class {
    $queryRaw() { return Promise.reject(new Error('Unable to open the database file')); }
  },
}));

const { withDb, dbHealth, probeDb } = await import('../db');

describe('database degradation (ephemeral filesystem)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the fallback when a read fails', async () => {
    const r = await withDb(() => Promise.reject(new Error('no such table')), [], 'read');
    expect(r).toEqual([]);
  });

  it('returns the fallback when a write fails', async () => {
    const r = await withDb(() => Promise.reject(new Error('readonly database')), null, 'write');
    expect(r).toBeNull();
  });

  it('never throws, so a request can still be served', async () => {
    await expect(
      withDb(() => Promise.reject(new Error('disk I/O error')), 'fallback'),
    ).resolves.toBe('fallback');
  });

  it('marks health as failed and records the error', async () => {
    await withDb(() => Promise.reject(new Error('boom')), null, 'ctx');
    const h = dbHealth();
    expect(h.ok).toBe(false);
    expect(h.lastError).toContain('ctx');
  });

  it('recovers health after a subsequent success', async () => {
    await withDb(() => Promise.reject(new Error('boom')), null);
    expect(dbHealth().ok).toBe(false);
    await withDb(() => Promise.resolve('fine'), null);
    expect(dbHealth().ok).toBe(true);
  });

  it('passes through the value on success', async () => {
    expect(await withDb(() => Promise.resolve(42), 0)).toBe(42);
  });

  it('probeDb reports unhealthy for an unusable database', async () => {
    const h = await probeDb();
    expect(h.ok).toBe(false);
    expect(h.checkedAt).not.toBeNull();
  });
});

describe('PORT / host binding configuration', () => {
  it('start script binds 0.0.0.0 and honours $PORT', async () => {
    const fs = await import('node:fs');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    expect(pkg.scripts.start).toContain('-H 0.0.0.0');
    expect(pkg.scripts.start).toContain('${PORT:-3000}');
  });

  it('render start script execs next start with $PORT on 0.0.0.0', async () => {
    const fs = await import('node:fs');
    const sh = fs.readFileSync('scripts/start-render.sh', 'utf8');
    expect(sh).toMatch(/-H 0\.0\.0\.0/);
    expect(sh).toMatch(/\$PORT/);
    expect(sh).toMatch(/PORT:=3000/);
  });

  it('render start script tolerates a failed schema push', async () => {
    const fs = await import('node:fs');
    const sh = fs.readFileSync('scripts/start-render.sh', 'utf8');
    expect(sh).toMatch(/continuing without persistence/);
  });

  it('render.yaml uses an ephemeral /tmp database and a health check', async () => {
    const fs = await import('node:fs');
    const y = fs.readFileSync('render.yaml', 'utf8');
    expect(y).toContain('file:/tmp/dev.db');
    expect(y).toContain('healthCheckPath: /api/health');
    expect(y).toContain('plan: free');
  });
});

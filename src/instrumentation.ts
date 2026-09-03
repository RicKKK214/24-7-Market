export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.DISABLE_BACKGROUND_SCAN === 'true') return;
  const { scanner } = await import('@/lib/services/ScannerService');
  // Kick off the shared server-side refresh loop once per server process.
  void scanner.startBackground();
}

import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApiApp } from '../server.ts';

let cachedApp: Awaited<ReturnType<typeof createApiApp>> | null = null;

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  if (!cachedApp) {
    cachedApp = await createApiApp({ attachFrontend: false });
  }
  return new Promise<void>((resolve) => {
    cachedApp!(req as never, res as never);
    res.on('finish', resolve);
    res.on('close', resolve);
  });
}

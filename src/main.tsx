import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Providers } from '@/app/providers';
import { ensureDbReady } from '@/lib/db';
import '@/styles/global.css';

async function bootstrap() {
  await ensureDbReady();
  const root = document.getElementById('root');
  if (!root) throw new Error('Root element not found');
  createRoot(root).render(
    <StrictMode>
      <Providers />
    </StrictMode>,
  );
}

void bootstrap();

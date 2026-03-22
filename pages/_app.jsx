import '@/globals.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { Toaster } from 'sonner';
import AppLayout from '@/components/layout/AppLayout';

export default function App({ Component, pageProps }) {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <AppLayout>
        <Component {...pageProps} />
      </AppLayout>
      <Toaster richColors />
    </QueryClientProvider>
  );
}

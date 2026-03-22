import '@/globals.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { Toaster } from 'sonner';
import AppLayout from '@/components/layout/AppLayout';
import { SessionProvider } from 'next-auth/react';
import { useRouter } from 'next/router';

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  const router = useRouter();
  const isLoginPage = router.pathname === '/login';

  return (
    <SessionProvider session={session}>
      <QueryClientProvider client={queryClientInstance}>
        {isLoginPage ? (
          <Component {...pageProps} />
        ) : (
          <AppLayout>
            <Component {...pageProps} />
          </AppLayout>
        )}
        <Toaster richColors />
      </QueryClientProvider>
    </SessionProvider>
  );
}

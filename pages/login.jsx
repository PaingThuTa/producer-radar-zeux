import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Radar } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await signIn('credentials', {
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError('Incorrect password. Try again.');
    } else {
      router.replace('/Dashboard');
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f10] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#2563eb] flex items-center justify-center mb-4">
            <Radar className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-white">Producer Radar</h1>
          <p className="text-sm text-[#71717a] mt-1">Enter your password to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#18181b] border border-[#27272a] rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#a1a1aa] mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-3 py-2 text-white text-sm placeholder-[#52525b] focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
              placeholder="Enter password"
              autoFocus
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2 rounded-lg transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

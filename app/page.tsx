
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center px-4">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Math AI Tutor</h1>
      <p className="text-xl text-gray-600 mb-8 max-w-md">
        Welcome to your personal AI-powered math learning assistant.
        Practice problems tailored to your skill level and track your progress!
      </p>

      <div className="flex gap-4 flex-col sm:flex-row">
        <Link
          href="/login"
          className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-lg shadow-blue-200"
        >
          Start Practicing →
        </Link>

        <Link
          href="/rankings"
          className="px-8 py-3 bg-white text-gray-800 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors font-semibold shadow-sm"
        >
          View Leaderboard 🏆
        </Link>
      </div>
    </main>
  );
}

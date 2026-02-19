
'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';

interface StudentRanking {
    id: string;
    name: string;
    classLevel: number;
    total_attempted: number;
    total_correct: number;
}

export default function RankingsPage() {
    const [rankings, setRankings] = useState<StudentRanking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchRankings = async () => {
            try {
                const response = await axios.get('/api/rankings');
                setRankings(response.data.rankings);
            } catch (err) {
                console.error('Failed to fetch rankings:', err);
                setError('Failed to load rankings.');
            } finally {
                setLoading(false);
            }
        };

        fetchRankings();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-red-600">
                <p className="mb-4">{error}</p>
                <Link href="/" className="text-blue-600 hover:underline">Return Home</Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">🏆 Leaderboard</h1>
                    <div className="flex gap-4">
                        <Link
                            href="/"
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                        >
                            ← Back
                        </Link>
                        <Link
                            href="/practice"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                        >
                            Practice Math
                        </Link>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-bold">
                                <tr>
                                    <th className="px-6 py-4">Rank</th>
                                    <th className="px-6 py-4">Student</th>
                                    <th className="px-6 py-4">Class</th>
                                    <th className="px-6 py-4 text-center">Solved</th>
                                    <th className="px-6 py-4 text-center">Wait Attempted</th>
                                    <th className="px-6 py-4 text-right">Accuracy</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {rankings.map((student, index) => {
                                    const accuracy = student.total_attempted > 0
                                        ? Math.round((student.total_correct / student.total_attempted) * 100)
                                        : 0;

                                    let rankColor = "text-gray-500";
                                    if (index === 0) rankColor = "text-yellow-500 text-2xl";
                                    else if (index === 1) rankColor = "text-gray-400 text-xl";
                                    else if (index === 2) rankColor = "text-orange-400 text-lg";

                                    return (
                                        <tr key={student.id} className="hover:bg-blue-50 transition-colors">
                                            <td className={`px-6 py-4 font-bold ${rankColor}`}>
                                                {index === 0 ? '👑 1st' : index === 1 ? '🥈 2nd' : index === 2 ? '🥉 3rd' : `#${index + 1}`}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-800">{student.name}</td>
                                            <td className="px-6 py-4 text-gray-600">{student.classLevel}</td>
                                            <td className="px-6 py-4 text-center font-bold text-green-600">{student.total_correct}</td>
                                            <td className="px-6 py-4 text-center text-gray-500">{student.total_attempted}</td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${accuracy >= 80 ? 'bg-green-100 text-green-800' :
                                                    accuracy >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-red-100 text-red-800'
                                                    }`}>
                                                    {accuracy}%
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {rankings.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                            No students found yet. Be the first to join the leaderboard!
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

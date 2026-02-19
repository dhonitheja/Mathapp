'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { mathSyllabus } from '@/lib/syllabus';
import Link from 'next/link';

export default function LoginPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [selectedClass, setSelectedClass] = useState<number>(1);

    const handleLogin = () => {
        if (!name.trim()) {
            alert('Please enter your name');
            return;
        }

        // Save to localStorage for persistence
        if (typeof window !== 'undefined') {
            localStorage.setItem('math_app_student_name', name);
            localStorage.setItem('math_app_student_class', selectedClass.toString());
        }

        // Redirect to practice page (where user can select topic)
        router.push('/practice');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 animate-in fade-in zoom-in duration-300">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome! 👋</h1>
                    <p className="text-gray-600">Enter your details to start your math journey.</p>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Alex"
                            className="w-full text-black p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium"
                            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Class</label>
                        <div className="relative">
                            <select
                                value={selectedClass}
                                onChange={(e) => setSelectedClass(Number(e.target.value))}
                                className="w-full text-black p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer bg-white"
                            >
                                {Object.keys(mathSyllabus).map((cls) => (
                                    <option key={cls} value={cls}>Class {cls}</option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                <span className="text-gray-500">▼</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleLogin}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95 transform"
                    >
                        Start Learning 🚀
                    </button>

                    <div className="text-center mt-6 pt-4 border-t border-gray-100">
                        <Link href="/" className="text-sm text-gray-500 hover:text-blue-600 transition-colors font-medium">
                            ← Back to Home
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}


'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { mathSyllabus } from '@/lib/syllabus';

interface QuestionData {
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
    difficulty: string;
    hash: string;
}

// Add Stats Interface
interface TopicStats {
    attempts: number;
    correct: number;
}

export default function PracticePage() {
    // State for setup
    const [selectedClass, setSelectedClass] = useState<number>(1);
    const [selectedTopic, setSelectedTopic] = useState<string>('');
    const [studentName, setStudentName] = useState<string>(''); // New state
    const [isStarted, setIsStarted] = useState(false);

    // State for question flow
    const [currentQuestion, setCurrentQuestion] = useState<QuestionData | null>(null);
    const [loading, setLoading] = useState(false);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);

    // State for performance tracking
    const [performanceHistory, setPerformanceHistory] = useState<boolean[]>([]);
    const [currentDifficulty, setCurrentDifficulty] = useState<string>('Medium');
    const [seenHashes, setSeenHashes] = useState<string[]>([]);
    const [score, setScore] = useState(0);

    // NEW: Detailed topic stats
    const [stats, setStats] = useState<Record<string, TopicStats>>({});

    // Timer state
    const [timeLeft, setTimeLeft] = useState<number>(30); // Default 30s
    const [isTimerActive, setIsTimerActive] = useState(false);

    // Feedback state for auto-switch messages
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

    // Initial topic selection when class changes
    useEffect(() => {
        // --- Persistence Logic ---
        if (typeof window !== 'undefined') {
            const storedName = localStorage.getItem('math_app_student_name');
            const storedClass = localStorage.getItem('math_app_student_class');

            if (storedName) {
                setStudentName(storedName);
            }
            if (storedClass) {
                setSelectedClass(Number(storedClass));
            }
        }
    }, []);

    useEffect(() => {
        const topics = mathSyllabus[selectedClass];
        if (topics && topics.length > 0) {
            setSelectedTopic(topics[0].id);
        }
    }, [selectedClass]);

    // Timer Logic
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isTimerActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && isTimerActive) {
            // Time's up! Auto submit as incorrect if nothing selected, or check selected
            setIsTimerActive(false);
            if (!isAnswerRevealed) {
                checkAnswer(true); // Helper to handle auto-submit
            }
        }

        return () => clearInterval(interval);
    }, [isTimerActive, timeLeft, isAnswerRevealed]);

    // Determine time limit based on difficulty
    const getTimeLimit = (difficulty: string) => {
        switch (difficulty) {
            case 'Easy': return 45;
            case 'Medium': return 30;
            case 'Hard': return 20;
            case 'Extreme': return 15;
            default: return 30;
        }
    };

    const fetchQuestion = async (topicOverride?: string) => {
        setLoading(true);
        setSelectedOption(null);
        setIsAnswerRevealed(false);
        setIsTimerActive(false); // Pause timer during fetch

        // Use override if provided, otherwise state
        const topicToUse = topicOverride || selectedTopic;

        try {
            const response = await axios.post('/api/agent', {
                classLevel: selectedClass,
                topic: topicToUse,
                previousPerformance: performanceHistory,
                currentDifficulty: currentDifficulty,
                previousHashes: seenHashes
            });

            const newQuestion = response.data;
            setCurrentQuestion(newQuestion);
            // Update difficulty from server response
            setCurrentDifficulty(newQuestion.difficulty);

            // Set and start timer based on new difficulty
            setTimeLeft(getTimeLimit(newQuestion.difficulty));
            setIsTimerActive(true);

        } catch (error) {
            console.error('Failed to fetch question:', error);
        } finally {
            setLoading(false);
        }
    };

    const startPractice = () => {
        if (!studentName.trim()) {
            alert("Please enter your name to start.");
            return;
        }
        setIsStarted(true);
        fetchQuestion();
    };

    const handleOptionSelect = (option: string) => {
        if (isAnswerRevealed) return;
        setSelectedOption(option);
    };

    const checkAnswer = async (autoSubmit = false) => {
        // If autoSubmit is true, we allow checking even if selectedOption is null (treated as wrong)
        if (!currentQuestion || (!selectedOption && !autoSubmit)) return;

        setIsTimerActive(false); // Stop timer

        const isCorrect = selectedOption === currentQuestion.correctAnswer;

        // Update performance history
        setPerformanceHistory(prev => [...prev, isCorrect]);

        // Update score
        if (isCorrect) setScore(prev => prev + 1);

        // Update topic stats
        // We use stored selectedTopic as the key. If backend supported it, we could use currentQuestion.topic
        // But since we drive the topic selection, selectedTopic is fine.
        setStats(prev => {
            const topicId = selectedTopic;
            const currentStats = prev[topicId] || { attempts: 0, correct: 0 };
            return {
                ...prev,
                [topicId]: {
                    attempts: currentStats.attempts + 1,
                    correct: currentStats.correct + (isCorrect ? 1 : 0)
                }
            };
        });

        // Add hash to seen list
        setSeenHashes(prev => [...prev, currentQuestion.hash]);

        setIsAnswerRevealed(true);

        // --- NEW: Update Stats in DB ---
        try {
            await axios.post('/api/agent', {
                updateStats: true,
                studentName: studentName,
                isCorrect: isCorrect,
                classLevel: selectedClass // Optional context
            });
        } catch (error) {
            console.error("Failed to update stats in DB", error);
        }
    };

    const handleNext = () => {
        // Recommendation & Auto-switch Logic
        let nextTopicId = selectedTopic;
        let message = null;

        const topicStats = stats[selectedTopic];
        const topics = mathSyllabus[selectedClass];
        const currentIdx = topics?.findIndex(t => t.id === selectedTopic) ?? -1;

        if (topicStats && currentIdx !== -1) {
            const accuracy = topicStats.attempts > 0 ? topicStats.correct / topicStats.attempts : 0;

            // 1. Mastery Condition: > 80% accuracy after 5+ attempts
            if (topicStats.attempts >= 5 && accuracy >= 0.8) {
                // Try moving to next topic
                if (currentIdx < topics.length - 1) {
                    nextTopicId = topics[currentIdx + 1].id;
                    message = `🎉 Mastery achieved! Advancing to: ${topics[currentIdx + 1].title}`;
                } else {
                    message = "🏆 You've mastered the final topic! Keeping you sharp here.";
                }
            }
            // 2. Struggle Condition: < 30% accuracy after 5+ attempts
            else if (topicStats.attempts >= 5 && accuracy <= 0.3) {
                // Try moving to previous topic
                if (currentIdx > 0) {
                    nextTopicId = topics[currentIdx - 1].id;
                    message = `🛡️ Let's reinforce basics. Switching to: ${topics[currentIdx - 1].title}`;
                } else {
                    message = "💪 Keep practicing! We believe in you.";
                }
            }
        }

        setFeedbackMessage(message);
        if (nextTopicId !== selectedTopic) {
            setSelectedTopic(nextTopicId);
        }

        // Fetch next question (using new topic)
        fetchQuestion(nextTopicId);
    };

    // Format time for display (MM:SS)
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // Determine timer color
    const getTimerColor = () => {
        if (timeLeft <= 5) return 'text-red-600 animate-pulse';
        if (timeLeft <= 10) return 'text-orange-500';
        return 'text-gray-700';
    };

    // Helper to calculate total accuracy
    const getTotalAccuracy = () => {
        const totalAttempts = Object.values(stats).reduce((acc, curr) => acc + curr.attempts, 0);
        const totalCorrect = Object.values(stats).reduce((acc, curr) => acc + curr.correct, 0);
        return totalAttempts === 0 ? 0 : Math.round((totalCorrect / totalAttempts) * 100);
    };

    // Helper to find weak topics (< 50% accuracy)
    const getWeakTopics = () => {
        const weak: string[] = [];
        Object.entries(stats).forEach(([topicId, stat]) => {
            if (stat.attempts >= 3 && (stat.correct / stat.attempts) < 0.5) {
                // Find topic name from syllabus
                const topicName = mathSyllabus[selectedClass]?.find(t => t.id === topicId)?.title || topicId;
                weak.push(topicName);
            }
        });
        return weak;
    };

    if (!isStarted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Math Practice</h1>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                            <input
                                type="text"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                placeholder="Enter your name"
                                className="w-full text-black p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Class</label>
                            <select
                                value={selectedClass}
                                onChange={(e) => setSelectedClass(Number(e.target.value))}
                                className="w-full text-black p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                {Object.keys(mathSyllabus).map((cls) => (
                                    <option key={cls} value={cls}>Class {cls}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Topic</label>
                            <select
                                value={selectedTopic}
                                onChange={(e) => setSelectedTopic(e.target.value)}
                                className="w-full text-black p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                {mathSyllabus[selectedClass]?.map((topic) => (
                                    <option key={topic.id} value={topic.id}>{topic.title}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={startPractice}
                            className="w-full bg-blue-600 text-white py-3 rounded-md font-semibold hover:bg-blue-700 transition-colors"
                        >
                            Start Practice
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const accuracy = getTotalAccuracy();
    const weakTopics = getWeakTopics();

    return (
        <div className="min-h-screen bg-gray-50 p-4 flex flex-col items-center">
            <div className="max-w-2xl w-full">
                {/* Header */}
                <div className="flex flex-col gap-4 mb-6">
                    <Link href="/" className="self-start px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors text-sm font-semibold">
                        ← Back Home
                    </Link>
                    <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm text-black">
                        <div>
                            <span className="font-semibold text-gray-500">Class {selectedClass}</span>
                            <span className="mx-2">•</span>
                            <span className="font-medium mr-4">{currentDifficulty}</span>
                            <span className={`font-mono font-bold text-lg ${getTimerColor()}`}>
                                ⏱ {formatTime(timeLeft)}
                            </span>
                        </div>
                        <div className="text-right">
                            <div className="font-bold text-blue-600">Score: {score}</div>
                            <div className="text-xs text-gray-500 font-medium">Accuracy: {accuracy}%</div>
                        </div>
                    </div>
                </div>

                {/* Recommendation Banner */}
                {feedbackMessage && (
                    <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center shadow-sm animate-in fade-in slide-in-from-top-2">
                        <span className="text-2xl mr-3">💡</span>
                        <div className="text-indigo-900 font-medium">
                            {feedbackMessage}
                        </div>
                    </div>
                )}

                {/* Question Card */}
                <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 min-h-[400px] flex flex-col justify-between mb-6">
                    {loading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    ) : currentQuestion ? (
                        <>
                            <div>
                                <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-8 leading-snug">
                                    {currentQuestion.question}
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {currentQuestion.options.map((option, index) => {
                                        let buttonClass = "p-4 text-left rounded-lg text-black border-2 transition-all font-medium ";

                                        if (isAnswerRevealed) {
                                            if (option === currentQuestion.correctAnswer) {
                                                buttonClass += "bg-green-100 border-green-500 text-green-800";
                                            } else if (option === selectedOption) {
                                                buttonClass += "bg-red-100 border-red-500 text-red-800";
                                            } else {
                                                buttonClass += "bg-gray-50 border-gray-200 text-gray-400";
                                            }
                                        } else {
                                            if (selectedOption === option) {
                                                buttonClass += "bg-blue-50 border-blue-500 text-blue-700";
                                            } else {
                                                buttonClass += "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50";
                                            }
                                        }

                                        return (
                                            <button
                                                key={index}
                                                onClick={() => handleOptionSelect(option)}
                                                disabled={isAnswerRevealed}
                                                className={buttonClass}
                                            >
                                                <span className="inline-block w-6 font-bold opacity-50 mr-2">{String.fromCharCode(65 + index)}.</span>
                                                {option}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Feedback and Continue Section */}
                            <div className="mt-8">
                                {isAnswerRevealed ? (
                                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                                        <div className={`p-4 rounded-lg mb-4 text-black ${selectedOption === currentQuestion.correctAnswer ? 'bg-green-50' : 'bg-red-50'
                                            }`}>
                                            <p className="font-bold mb-1">
                                                {selectedOption === currentQuestion.correctAnswer ? 'Correct!' : 'Incorrect'}
                                                {!selectedOption && " (Time's Up!)"}
                                            </p>

                                            {selectedOption !== currentQuestion.correctAnswer && (
                                                <p className="text-sm opacity-90 mt-2">
                                                    <span className="font-semibold">Explanation:</span> {currentQuestion.explanation}
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            onClick={handleNext}
                                            className="w-full bg-blue-600 text-white py-3 rounded-md font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                                        >
                                            Next Question →
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => checkAnswer(false)}
                                        disabled={!selectedOption}
                                        className="w-full bg-gray-900 text-white py-3 rounded-md font-bold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Check Answer
                                    </button>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="text-center text-red-500">Failed to load question. Please try again.</div>
                    )}
                </div>

                {/* Stats Section */}
                {Object.keys(stats).length > 0 && (
                    <div className="bg-white rounded-xl shadow-lg p-6 w-full text-black">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Performance Stats</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="bg-blue-50 p-3 rounded-lg text-center">
                                <div className="text-2xl font-bold text-blue-700">
                                    {Object.values(stats).reduce((acc, curr) => acc + curr.attempts, 0)}
                                </div>
                                <div className="text-xs text-blue-600 uppercase font-semibold">Total Attempts</div>
                            </div>
                            <div className="bg-green-50 p-3 rounded-lg text-center">
                                <div className="text-2xl font-bold text-green-700">
                                    {Object.values(stats).reduce((acc, curr) => acc + curr.correct, 0)}
                                </div>
                                <div className="text-xs text-green-600 uppercase font-semibold">Correct</div>
                            </div>
                            <div className="bg-purple-50 p-3 rounded-lg text-center">
                                <div className="text-2xl font-bold text-purple-700">
                                    {accuracy}%
                                </div>
                                <div className="text-xs text-purple-600 uppercase font-semibold">Accuracy</div>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg text-center">
                                <div className="text-2xl font-bold text-gray-700">
                                    {Object.keys(stats).length}
                                </div>
                                <div className="text-xs text-gray-500 uppercase font-semibold">Topics Covered</div>
                            </div>
                        </div>

                        {weakTopics.length > 0 && (
                            <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-100">
                                <h4 className="text-sm font-bold text-red-800 mb-2 flex items-center">
                                    ⚠️ Focus Areas (Accuracy &lt; 50%)
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {weakTopics.map(topicName => (
                                        <span key={topicName} className="px-2 py-1 bg-white text-red-600 text-xs font-semibold rounded shadow-sm border border-red-100">
                                            {topicName}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mt-6">
                            <h4 className="text-sm font-bold text-gray-700 mb-3">Topic Ranking (Most Solved)</h4>
                            <div className="space-y-2">
                                {Object.entries(stats)
                                    .sort(([, a], [, b]) => b.correct - a.correct)
                                    .map(([topicId, stat], index) => {
                                        const topicName = mathSyllabus[selectedClass]?.find(t => t.id === topicId)?.title || topicId;
                                        const percentage = Math.round((stat.correct / stat.attempts) * 100);
                                        return (
                                            <div key={topicId} className="flex items-center text-sm p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                                                <div className="w-8 font-bold text-gray-400">#{index + 1}</div>
                                                <div className="flex-1 font-medium text-gray-800">{topicName}</div>
                                                <div className="text-right">
                                                    <span className="font-bold text-green-600">{stat.correct}</span>
                                                    <span className="text-gray-400 mx-1">/</span>
                                                    <span className="text-gray-600">{stat.attempts}</span>
                                                    <span className="ml-2 text-xs text-gray-400">({percentage}%)</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

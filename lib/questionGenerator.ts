
import { Difficulty } from './difficultyEngine';
import crypto from 'crypto';

interface Question {
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
    hash: string;
}

const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const generateHash = (question: string): string => {
    return crypto.createHash('sha256').update(question).digest('hex');
};

const generateArithmetic = (difficulty: Difficulty): Question => {
    let min = 1, max = 10;
    if (difficulty === 'Medium') { min = 10; max = 50; }
    if (difficulty === 'Hard') { min = 50; max = 100; }
    if (difficulty === 'Extreme') { min = 100; max = 1000; }

    const a = getRandomInt(min, max);
    const b = getRandomInt(min, max);
    const op = ['+', '-', '*'][getRandomInt(0, 2)];

    let answer: number;
    let symbol: string;

    if (op === '+') { answer = a + b; symbol = '+'; }
    else if (op === '-') { answer = a - b; symbol = '-'; }
    else { answer = a * b; symbol = '×'; }

    const correctAnswer = answer.toString();
    const options = new Set<string>();
    options.add(correctAnswer);

    while (options.size < 4) {
        const wrong = answer + getRandomInt(-10, 10);
        if (wrong !== answer) options.add(wrong.toString());
    }

    const questionText = `What is ${a} ${symbol} ${b}?`;
    return {
        question: questionText,
        options: Array.from(options).sort(() => Math.random() - 0.5),
        correctAnswer,
        explanation: `${a} ${symbol} ${b} = ${answer}`,
        hash: generateHash(questionText)
    };
};

const generateAlgebra = (difficulty: Difficulty): Question => {
    // Simple linear equation: ax + b = c
    const x = getRandomInt(1, 10);
    const a = getRandomInt(2, 5 + (difficulty === 'Hard' || difficulty === 'Extreme' ? 5 : 0));
    const b = getRandomInt(1, 20);
    const c = a * x + b;

    const correctAnswer = x.toString();
    const options = new Set<string>();
    options.add(correctAnswer);

    while (options.size < 4) {
        const wrong = x + getRandomInt(-3, 3);
        if (wrong !== x && wrong > 0) options.add(wrong.toString());
    }

    const questionText = `Solve for x: ${a}x + ${b} = ${c}`;
    return {
        question: questionText,
        options: Array.from(options).sort(() => Math.random() - 0.5),
        correctAnswer,
        explanation: `${a}x = ${c} - ${b} = ${c - b}, so x = ${c - b}/${a} = ${x}`,
        hash: generateHash(questionText)
    };
};

const generateQuadratics = (difficulty: Difficulty): Question => {
    // (x - r1)(x - r2) = 0 -> x^2 - (r1+r2)x + r1*r2 = 0
    const r1 = getRandomInt(1, 5 + (difficulty === 'Extreme' ? 5 : 0));
    const r2 = getRandomInt(1, 5);

    const b = -(r1 + r2);
    const c = r1 * r2;

    const equation = `x² ${b < 0 ? '-' : '+'} ${Math.abs(b)}x + ${c} = 0`;
    const correctAnswer = `${Math.min(r1, r2)}, ${Math.max(r1, r2)}`;

    // Only generating correct answer for simplicity in this demo structure
    // In a real app complexity would be higher for distractors
    const options = [correctAnswer];
    // Generate fake roots
    options.push(`${Math.min(r1 + 1, r2 + 1)}, ${Math.max(r1 + 1, r2 + 1)}`);
    options.push(`${Math.min(r1 - 1, r2)}, ${Math.max(r1 - 1, r2)}`);
    options.push(`${Math.min(r1, r2 - 1)}, ${Math.max(r1, r2 - 1)}`);

    const questionText = `Find the roots of: ${equation}`;
    return {
        question: questionText,
        options: options.sort(() => Math.random() - 0.5),
        correctAnswer,
        explanation: `Factor as (x - ${r1})(x - ${r2}) = 0`,
        hash: generateHash(questionText)
    };
};

const generateCalculus = (difficulty: Difficulty): Question => {
    // Simple derivative of x^n
    const n = getRandomInt(2, 5);
    const coeff = getRandomInt(2, 5);

    const func = `${coeff}x^${n}`;
    const derivCoeff = coeff * n;
    const derivPower = n - 1;

    const correctAnswer = `${derivCoeff}x^${derivPower}`;
    const options = new Set<string>();
    options.add(correctAnswer);
    options.add(`${coeff}x^${n - 1}`);
    options.add(`${derivCoeff}x^${n}`);
    options.add(`${coeff}x^${n + 1}`); // Integral-ish trap

    const questionText = `Find the derivative of f(x) = ${func}`;
    return {
        question: questionText,
        options: Array.from(options).sort(() => Math.random() - 0.5),
        correctAnswer,
        explanation: `Power rule: d/dx(ax^n) = anx^(n-1). ${coeff}*${n}x^(${n}-1) = ${correctAnswer}`,
        hash: generateHash(questionText)
    };
};


export const generateQuestion = (classLevel: number, topic: string, difficulty: Difficulty, previousHashes: string[] = []): Question => {
    let question: Question;
    let attempts = 0;
    const maxAttempts = 10; // Prevent infinite loops

    do {
        if (classLevel <= 5) {
            question = generateArithmetic(difficulty);
        } else if (classLevel <= 8) {
            question = generateAlgebra(difficulty);
        } else if (classLevel <= 10) {
            question = generateQuadratics(difficulty);
        } else {
            question = generateCalculus(difficulty);
        }
        attempts++;
    } while (previousHashes.includes(question.hash) && attempts < maxAttempts);

    return question;
};

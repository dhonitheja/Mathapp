
export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Extreme';

const DIFFICULTY_LEVELS: Difficulty[] = ['Easy', 'Medium', 'Hard', 'Extreme'];

/**
 * Adjusts the difficulty based on user's recent performance.
 * 
 * Rules:
 * - Increases difficulty if last 3 answers were correct.
 * - Decreases difficulty if last 2 were wrong.
 * - Keeps difficulty between Easy, Medium, Hard, Extreme.
 * 
 * @param previousPerformance Array of booleans where true represents a correct answer. Order is oldest to newest.
 * @param currentDifficulty The current difficulty level.
 * @returns The updated difficulty level.
 */
export function adjustDifficulty(previousPerformance: boolean[], currentDifficulty: Difficulty): Difficulty {
    const levels = DIFFICULTY_LEVELS;
    const currentIndex = levels.indexOf(currentDifficulty);

    if (currentIndex === -1) {
        // Fallback if current difficulty is invalid for some reason
        return 'Medium';
    }

    const len = previousPerformance.length;

    // Check for increase: Last 3 correct
    if (len >= 3) {
        const last3 = previousPerformance.slice(-3);
        if (last3.every(result => result === true)) {
            const nextIndex = Math.min(currentIndex + 1, levels.length - 1);
            return levels[nextIndex];
        }
    }

    // Check for decrease: Last 2 wrong
    if (len >= 2) {
        const last2 = previousPerformance.slice(-2);
        if (last2.every(result => result === false)) {
            const prevIndex = Math.max(currentIndex - 1, 0);
            return levels[prevIndex];
        }
    }

    return currentDifficulty;
}

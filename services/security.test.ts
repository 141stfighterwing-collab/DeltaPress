import { expect, test, describe } from 'bun:test';
import { getPasswordStrength, LIMITS } from './security';

describe('getPasswordStrength', () => {
  test('should return score 0 and "Password is required" for empty password', () => {
    const result = getPasswordStrength('');
    expect(result).toEqual({ score: 0, feedback: 'Password is required' });
  });

  test(`should return score 1 and minimum characters feedback for passwords shorter than ${LIMITS.PASSWORD_MIN}`, () => {
    // 'Short1!' is 7 characters, which is less than the default LIMITS.PASSWORD_MIN (8)
    const result = getPasswordStrength('Short1!');
    expect(result.score).toBe(1);
    expect(result.feedback).toContain(`Minimum ${LIMITS.PASSWORD_MIN} characters`);
  });

  test('should return score 2 and "Weak" feedback for passwords with score < 3', () => {
    /**
     * Note on implementation:
     * The function increments an internal score based on character types (max 4).
     * If internal score < 3, it returns a returned score of 2.
     * This means both internal score 1 and 2 result in returned score 2.
     */

    // Internal Score 1: only lowercase, long enough
    expect(getPasswordStrength('abcdefgh')).toEqual({ score: 2, feedback: 'Weak: Add numbers or symbols' });
    // Internal Score 1: only uppercase, long enough
    expect(getPasswordStrength('ABCDEFGH')).toEqual({ score: 2, feedback: 'Weak: Add numbers or symbols' });
    // Internal Score 1: only numbers, long enough
    expect(getPasswordStrength('12345678')).toEqual({ score: 2, feedback: 'Weak: Add numbers or symbols' });
    // Internal Score 1: only symbols, long enough
    expect(getPasswordStrength('!@#$%^&*')).toEqual({ score: 2, feedback: 'Weak: Add numbers or symbols' });

    // Internal Score 2: lowercase and uppercase
    expect(getPasswordStrength('Abcdefgh')).toEqual({ score: 2, feedback: 'Weak: Add numbers or symbols' });
    // Internal Score 2: lowercase and numbers
    expect(getPasswordStrength('abcde123')).toEqual({ score: 2, feedback: 'Weak: Add numbers or symbols' });
  });

  test('should return score 3 and "Medium" feedback for passwords with internal score === 3', () => {
    // Internal Score 3: lowercase, uppercase, and numbers
    expect(getPasswordStrength('Abcdef12')).toEqual({ score: 3, feedback: 'Medium' });
    // Internal Score 3: lowercase, uppercase, and symbols
    expect(getPasswordStrength('Abcdef!@')).toEqual({ score: 3, feedback: 'Medium' });
    // Internal Score 3: lowercase, numbers, and symbols
    expect(getPasswordStrength('abcde12!')).toEqual({ score: 3, feedback: 'Medium' });
  });

  test('should return score 4 and "Strong" feedback for passwords with internal score === 4', () => {
    // Internal Score 4: lowercase, uppercase, numbers, and symbols
    expect(getPasswordStrength('Abcde12!')).toEqual({ score: 4, feedback: 'Strong' });
  });

  test('should handle exactly the minimum length', () => {
    const minLengthPassword = 'A'.repeat(LIMITS.PASSWORD_MIN - 3) + 'a1!'; // exactly LIMITS.PASSWORD_MIN
    const result = getPasswordStrength(minLengthPassword);
    // This should have all 4 types and be exactly the minimum length
    expect(result.score).toBe(4);
    expect(result.feedback).toBe('Strong');
  });
});

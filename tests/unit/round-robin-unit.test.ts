/**
 * Unit Tests for Research Service Round Robin Logic
 * 
 * These tests verify the core round-robin cycling algorithm
 * independently from browser tests.
 */

import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Round Robin State Manager (copied from researchService for isolated testing)
 */
class RoundRobinState {
  private providerIndex: number = 0;
  private keyIndices: Map<string, number> = new Map();
  private lastRotationTime: number = Date.now();
  private rotationCount: number = 0;
  private providerStats: Map<string, { success: number; failure: number }> = new Map();

  getNextProviderIndex(providerCount: number): number {
    if (providerCount === 0) return 0;
    this.providerIndex = (this.providerIndex + 1) % providerCount;
    this.rotationCount++;
    this.lastRotationTime = Date.now();
    return this.providerIndex;
  }

  getCurrentProviderIndex(): number {
    return this.providerIndex;
  }

  getNextKeyIndex(providerId: string, keyCount: number): number {
    if (keyCount === 0) return 0;
    const currentIndex = this.keyIndices.get(providerId) || 0;
    const nextIndex = (currentIndex + 1) % keyCount;
    this.keyIndices.set(providerId, nextIndex);
    return currentIndex;
  }

  recordSuccess(providerId: string): void {
    const stats = this.providerStats.get(providerId) || { success: 0, failure: 0 };
    stats.success++;
    this.providerStats.set(providerId, stats);
  }

  recordFailure(providerId: string): void {
    const stats = this.providerStats.get(providerId) || { success: 0, failure: 0 };
    stats.failure++;
    this.providerStats.set(providerId, stats);
  }

  getStats() {
    return {
      totalRotations: this.rotationCount,
      lastRotationTime: this.lastRotationTime,
      providerStats: this.providerStats
    };
  }

  reset(): void {
    this.providerIndex = 0;
    this.keyIndices.clear();
    this.rotationCount = 0;
    this.lastRotationTime = Date.now();
    this.providerStats.clear();
  }
}

describe('Round Robin State Manager', () => {
  let state: RoundRobinState;

  beforeEach(() => {
    state = new RoundRobinState();
  });

  describe('Provider Rotation', () => {
    it('should cycle through providers in order', () => {
      const providers = ['GEMINI', 'ZAI', 'ML', 'KIMI'];
      const results: string[] = [];

      for (let i = 0; i < 8; i++) {
        const index = state.getNextProviderIndex(providers.length);
        results.push(providers[index]);
      }

      // Should complete 2 full cycles
      expect(results).toEqual([
        'ZAI', 'ML', 'KIMI', 'GEMINI', // First cycle (starts at next after 0)
        'ZAI', 'ML', 'KIMI', 'GEMINI'  // Second cycle
      ]);
    });

    it('should handle single provider', () => {
      const index1 = state.getNextProviderIndex(1);
      const index2 = state.getNextProviderIndex(1);
      const index3 = state.getNextProviderIndex(1);

      expect(index1).toBe(0);
      expect(index2).toBe(0);
      expect(index3).toBe(0);
    });

    it('should handle zero providers gracefully', () => {
      const index = state.getNextProviderIndex(0);
      expect(index).toBe(0);
    });

    it('should track rotation count', () => {
      expect(state.getStats().totalRotations).toBe(0);

      state.getNextProviderIndex(4);
      expect(state.getStats().totalRotations).toBe(1);

      state.getNextProviderIndex(4);
      expect(state.getStats().totalRotations).toBe(2);

      state.getNextProviderIndex(4);
      expect(state.getStats().totalRotations).toBe(3);
    });
  });

  describe('API Key Rotation', () => {
    it('should cycle through multiple keys per provider', () => {
      const providerId = 'ZAI';
      const keyCount = 3;

      const indices = [
        state.getNextKeyIndex(providerId, keyCount),
        state.getNextKeyIndex(providerId, keyCount),
        state.getNextKeyIndex(providerId, keyCount),
        state.getNextKeyIndex(providerId, keyCount),
        state.getNextKeyIndex(providerId, keyCount),
        state.getNextKeyIndex(providerId, keyCount)
      ];

      expect(indices).toEqual([0, 1, 2, 0, 1, 2]);
    });

    it('should maintain separate key indices per provider', () => {
      const keyCount = 2;

      // Provider ZAI
      expect(state.getNextKeyIndex('ZAI', keyCount)).toBe(0);
      expect(state.getNextKeyIndex('ZAI', keyCount)).toBe(1);

      // Provider ML (separate index)
      expect(state.getNextKeyIndex('ML', keyCount)).toBe(0);
      expect(state.getNextKeyIndex('ML', keyCount)).toBe(1);

      // Back to ZAI (should remember position)
      expect(state.getNextKeyIndex('ZAI', keyCount)).toBe(0);
    });

    it('should handle single key', () => {
      const index1 = state.getNextKeyIndex('TEST', 1);
      const index2 = state.getNextKeyIndex('TEST', 1);
      const index3 = state.getNextKeyIndex('TEST', 1);

      expect(index1).toBe(0);
      expect(index2).toBe(0);
      expect(index3).toBe(0);
    });

    it('should handle zero keys gracefully', () => {
      const index = state.getNextKeyIndex('TEST', 0);
      expect(index).toBe(0);
    });
  });

  describe('Statistics Tracking', () => {
    it('should track success and failure counts', () => {
      state.recordSuccess('GEMINI');
      state.recordSuccess('GEMINI');
      state.recordFailure('GEMINI');

      state.recordSuccess('ZAI');
      state.recordFailure('ZAI');
      state.recordFailure('ZAI');

      const stats = state.getStats();
      
      expect(stats.providerStats.get('GEMINI')).toEqual({ success: 2, failure: 1 });
      expect(stats.providerStats.get('ZAI')).toEqual({ success: 1, failure: 2 });
    });

    it('should update last rotation time', () => {
      const beforeTime = Date.now();
      state.getNextProviderIndex(4);
      const afterTime = Date.now();

      const stats = state.getStats();
      expect(stats.lastRotationTime).toBeGreaterThanOrEqual(beforeTime);
      expect(stats.lastRotationTime).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all state', () => {
      // Create some state
      state.getNextProviderIndex(4);
      state.getNextProviderIndex(4);
      state.getNextKeyIndex('ZAI', 3);
      state.getNextKeyIndex('ZAI', 3);
      state.recordSuccess('GEMINI');
      state.recordFailure('ZAI');

      // Reset
      state.reset();

      // Verify reset
      expect(state.getStats().totalRotations).toBe(0);
      expect(state.getCurrentProviderIndex()).toBe(0);
      expect(state.getStats().providerStats.size).toBe(0);
    });
  });
});

describe('Round Robin Algorithm Properties', () => {
  let state: RoundRobinState;

  beforeEach(() => {
    state = new RoundRobinState();
  });

  it('should be fair - equal distribution over many rotations', () => {
    const providerCount = 4;
    const distribution = new Map<number, number>();

    // Perform 1000 rotations
    for (let i = 0; i < 1000; i++) {
      const index = state.getNextProviderIndex(providerCount);
      distribution.set(index, (distribution.get(index) || 0) + 1);
    }

    // Each provider should be selected approximately 250 times
    for (let i = 0; i < providerCount; i++) {
      const count = distribution.get(i) || 0;
      expect(count).toBeGreaterThanOrEqual(240);
      expect(count).toBeLessThanOrEqual(260);
    }
  });

  it('should maintain order consistency', () => {
    const providerCount = 4;
    const order: number[] = [];

    // Record order for one full cycle
    for (let i = 0; i < providerCount; i++) {
      order.push(state.getNextProviderIndex(providerCount));
    }

    // Order should be sequential (mod providerCount)
    for (let i = 0; i < order.length - 1; i++) {
      expect((order[i] + 1) % providerCount).toBe(order[i + 1]);
    }
  });

  it('should handle rapid consecutive calls', () => {
    const results: number[] = [];
    
    // Rapid fire 100 calls
    for (let i = 0; i < 100; i++) {
      results.push(state.getNextProviderIndex(4));
    }

    // All results should be valid indices
    expect(results.every(r => r >= 0 && r < 4)).toBe(true);
  });
});

console.log('Round Robin tests defined successfully');

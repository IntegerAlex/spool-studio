export function factorial(n: number): bigint {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error('Input must be a non-negative integer.');
  }

  // Simple lookup for small values
  const small: Record<number, bigint> = {
    0: 1n,
    1: 1n,
    2: 2n,
    3: 6n,
    4: 24n,
    5: 120n,
    6: 720n,
    7: 5040n,
    8: 40320n,
    9: 362880n,
    10: 3628800n,
  };
  if (n <= 10 && n in small) {
    return small[n];
  }

  let result = 1n;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}
// groan.

export function range(start: number, end: number, step: number = 1): number[] {
  return [...Array(Math.ceil((end - start) / step)).keys()].map(i => i * step + start);
}

// return the index of the first element where test returns true, or length.
export function binarySearch<A>(array: A[], test: (item: A) => boolean): number {
  let lo = -1, hi = array.length;
  while (lo + 1 < hi) {
    const m = lo + ((hi - lo) >> 1);
    if (test(array[m])) {
      hi = m;
    } else {
      lo = m;
    }
  }
  return hi;
}

export function average(array: number[]): number {
  return array.reduce((sum, n) => sum + n) / array.length;
}

export function generate(
  start: number,
  next: (n: number) => number,
  condition: (n: number, len: number) => boolean
): number[] {
  const rv: number[] = [];
  let current = start;
  do {
    rv.push(current);
    current = next(current);
  } while (condition(current, rv.length));
  return rv;
}

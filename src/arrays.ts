// basic collection functions that should have been part of the standard library.

// break a list into several lists, all (except the last) `groupSize` in length
export function arrayGrouped<A>(array: A[], groupSize: number): A[][] {
  return range(0, array.length, groupSize).map(i => array.slice(i, i + groupSize));
}

export function average(array: number[]): number {
  return array.reduce((sum, n) => sum + n) / array.length;
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

export function flatMap<A, B>(array: A[], f: (a: A) => B[]): B[] {
  return flatten(array.map(f));
}

export function flatten<A>(array: A[][]): A[] {
  return Array.prototype.concat.apply([], array);
}

export function groupBy<A>(array: A[], grouper: (a: A) => string): { [key: string]: A[] } {
  const rv: { [key: string]: A[] } = {};
  array.forEach(a => {
    const key = grouper(a);
    if (rv[key] === undefined) rv[key] = [];
    rv[key].push(a);
  });
  return rv;
}

// return two lists: the first is every item where `f` returned true, the second is every item where `f` returned false
export function partition<A>(array: A[], f: (item: A) => boolean): [ A[], A[] ] {
  const left: A[] = [];
  const right: A[] = [];
  array.forEach(item => (f(item) ? left : right).push(item));
  return [ left, right ];
}

// return a list of every number from `start` (inclusive) to `end` (exclusive), incremented by `step`
export function range(start: number, end: number, step: number = 1): number[] {
  return [...Array(Math.ceil((end - start) / step)).keys()].map(i => i * step + start);
}


// generate a list of numbers starting at `start`. each subsequent item is
// supplied by `next`, until `condition` returns false
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

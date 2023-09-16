/**
 * Run async job `fn` `n` times.
 * @param n number of times to run it
 * @param fn job to run
 */
export async function repeat(n: number, fn: (i?: number) => Promise<any>): Promise<any[]> {
  const jobs = Array.from({ length: n }).map((_x, i) => fn(i));
  return Promise.all(jobs);
}

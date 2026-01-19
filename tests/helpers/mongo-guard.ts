type DescribeFn = typeof describe;

export const describeIfMongo: DescribeFn = (name, fn, timeout) => {
  const allowMongo = (globalThis as { __mongoListenAllowed?: boolean }).__mongoListenAllowed !== false;
  return (allowMongo ? describe : describe.skip)(name, fn, timeout);
};

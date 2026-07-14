export interface IDeferred<TValue> {
  promise: Promise<TValue>;
  reject: (reason?: unknown) => void;
  resolve: (value: TValue | PromiseLike<TValue>) => void;
}

export function createDeferred<TValue>(): IDeferred<TValue> {
  let rejectPromise: IDeferred<TValue>["reject"] = () => undefined;
  let resolvePromise: IDeferred<TValue>["resolve"] = () => undefined;
  const promise = new Promise<TValue>((resolve, reject) => {
    rejectPromise = reject;
    resolvePromise = resolve;
  });

  return { promise, reject: rejectPromise, resolve: resolvePromise };
}

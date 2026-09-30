export class NetworkTimeoutError extends Error {
  constructor() {
    super("تعذر الاتصال بالخادم، يرجى التأكد من اتصال الإنترنت");
    this.name = "NetworkTimeoutError";
  }
}

export function withTimeout<T>(promise: PromiseLike<T>, ms = 8000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new NetworkTimeoutError()), ms);
    Promise.resolve(promise).then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

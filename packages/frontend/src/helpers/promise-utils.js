/* eslint-disable import/prefer-default-export */
export function retry(func, retryCount = 5) {
  return new Promise((resolve, reject) => {
    func().then(
      (...args) => {
        resolve(...args);
      },
      () => {
        if (retryCount === 0) {
          return reject();
        }
        return setTimeout(() => retry(func, retryCount - 1).then(resolve, reject), 50);
      },
    );
  });
}

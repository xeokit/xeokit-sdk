function eachLimit(collection, limit, iteratee) {
  const elementsToProcess = Array.from(collection);

  const processPool = elementsToProcess.splice(0, limit);

  const processElement = async element => {
    await iteratee(element);

    if (elementsToProcess.length > 0) {
      const nextElement = elementsToProcess.shift();
      processElement(nextElement);
    }
  }

  processPool.forEach(processElement);
}

function makeQueue(collection) {
  let canceled = false;

  const queue = {
    cancel() {
      canceled = true;
    },
    async run(callback) {
      for (let element of collection) {
        if (canceled) break;

        await new Promise((res) =>
          setTimeout(() => (callback(element) || Promise.resolve()).then(res))
        );
      }
    },
  };

  return queue;
}


export { eachLimit, makeQueue }
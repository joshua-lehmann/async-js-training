import https from 'https';

// helper function
export const httpGet = (url: string, callback: (result: any) => void, error: (err: any) => void) => {
  https.get(url, (response) => {
    let body = '';
    response.on('data', (data) => {
      body += data;
    });
    response.on('error', (err) => {
      error(err);
    });
    response.on('end', () => {
      try {
        const result = JSON.parse(body);
        callback(result);
      } catch (err) {
        error(err);
      }
    });
  });
};

// helper to execute a list of callback functions
export const whenAllCallback = (callbackFunctions, callback, error) => {
  let results = [];
  let errorHappend;
  const internalCallback = (result) => {
    results = [...results, result];
    if (!errorHappend && results.length === callbackFunctions.length) {
      callback(results);
    }
  };
  const errorCallback = (err) => {
    errorHappend = true;
    error(err);
  };

  for (let i = 0; i < callbackFunctions.length; i++) {
    callbackFunctions[i](internalCallback, errorCallback);
  }
};

const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };

/*
Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));};
This line resolves the requestHandler function by passing the req, res, and next parameters to it. It wraps the execution of requestHandler in a Promise.resolve() call, which ensures that the requestHandler function always returns a Promise.
If the requestHandler function resolves successfully, the promise returned by Promise.resolve(requestHandler(req, res, next)) is fulfilled, and the code execution continues.
If there's an error thrown within the requestHandler function, the promise is rejected, and the catch block is executed. The catch block calls the next function with the err parameter, which passes the error to the next error-handling middleware.
*/

/*
// const asyncHandler = (fn) => {() => {}};

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    res.status(err.code || 500).json({ sucess: true, message: error.message });
  }
};
*/

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

class BadRequestError extends HttpError {
  constructor(message = 'Bad Request') {
    super(400, message);
  }
}

class UnauthorizedError extends HttpError {
  constructor(message = 'Unauthorized') {
    super(401, message);
  }
}

module.exports = { HttpError, BadRequestError, UnauthorizedError };


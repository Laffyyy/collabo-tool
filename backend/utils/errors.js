class HttpError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name = this.constructor.name;
  }
}

class BadRequestError extends HttpError {
  constructor(message) {
    super(message || 'Bad Request', 400);
  }
}

class UnauthorizedError extends HttpError {
  constructor(message) {
    super(message || 'Unauthorized', 401);
  }
}

class ForbiddenError extends HttpError {
  constructor(message) {
    super(message || 'Forbidden', 403);
  }
}

class NotFoundError extends HttpError {
  constructor(message) {
    super(message || 'Not Found', 404);
  }
}

module.exports = {
  HttpError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError
};
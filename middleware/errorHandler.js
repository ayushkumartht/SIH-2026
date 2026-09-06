export const notFoundHandler = (req, res, next) => {
  res.status(404).json({ success: false, error: 'Not Found', statusCode: 404 });
};

export const errorHandler = (err, req, res, next) => {
  const status = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  return res.status(status).json({ success: false, error: message, statusCode: status, details: err.details || undefined });
};



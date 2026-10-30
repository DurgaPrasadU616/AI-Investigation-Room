export function notFound(_req, res) {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'That route could not be found.' } });
}

export function errorHandler(error, _req, res, _next) {
  const status = error.status || 500;
  if (status >= 500) console.error(`[api] ${error.message}\n${error.stack || ''}`);
  const code = status < 500 ? error.code || (status === 422 ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR') : error.code === 'GENERATION_FAILED' ? error.code : 'INTERNAL_ERROR';
  const message = error.code === 'GENERATION_FAILED' ? error.message : status >= 500 ? 'Something went wrong. Please try again.' : error.message;
  res.status(status).json({ success: false, error: { code, message } });
}

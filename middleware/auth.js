import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, error: 'No token provided', statusCode: 401 });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token', statusCode: 401 });
  }
};

export const authorizeRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden', statusCode: 403 });
    }
    next();
  };
};

export const authenticateTeleconsultation = (req, res, next) => {
  if (process.env.DEMO_MODE === 'true') return next();
  return authenticateToken(req, res, next);
};

export const authenticateTeleconsultationSocket = (socket, next) => {
  if (process.env.DEMO_MODE === 'true') {
    socket.user = { role: 'demo' };
    return next();
  }

  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));

  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return next(new Error('Invalid or expired token'));
  }
};



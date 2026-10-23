import prisma from '../config/db.js';
import { verifyAccessToken } from '../config/jwt.js';

export const authenticate = async (req, res, next) => {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.fxcgo_access_token) {
      token = req.cookies.fxcgo_access_token;
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please login.',
      });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired access token.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        accountType: true,
        companyId: true,
        businessIdentifier: true,
        country: true,
        phone: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User account not found or deactivated.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during authentication.',
    });
  }
};

export const requireAccountType = (allowedTypes) => {
  return (req, res, next) => {
    if (!req.user || !allowedTypes.includes(req.user.accountType)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden. Restricted to: ${allowedTypes.join(', ')}`,
      });
    }
    next();
  };
};

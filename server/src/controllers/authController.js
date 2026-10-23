import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../config/db.js';
import { 
  signAccessToken, 
  signRefreshToken, 
  verifyRefreshToken, 
  REFRESH_COOKIE_OPTIONS 
} from '../config/jwt.js';
import { logAudit } from '../middleware/audit.js';

// Secure helper to generate unique platform IDs
const generateCompanyId = (accountType) => {
  const prefix = accountType === 'EXPORTER' ? 'FXE' : 'FXI';
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 characters
  return `${prefix}-${randomPart}`;
};

export const register = async (req, res) => {
  try {
    const { 
      fullName, 
      accountType, 
      email, 
      password, 
      confirmPassword, 
      businessIdentifier, 
      phone, 
      country, 
      termsAccepted 
    } = req.body;

    if (!termsAccepted) {
      return res.status(400).json({
        success: false,
        error: 'You must accept the Terms & Conditions to create an FXCGO account.',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Password and Confirm Password do not match.',
      });
    }

    if (!['EXPORTER', 'IMPORTER'].includes(accountType)) {
      return res.status(400).json({
        success: false,
        error: 'Account type must be either EXPORTER or IMPORTER.',
      });
    }

    // Check if email already registered
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email address already exists.',
      });
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate unique platform company identifier
    let companyId;
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      companyId = generateCompanyId(accountType);
      const conflict = await prisma.user.findUnique({ where: { companyId } });
      if (!conflict) isUnique = true;
      attempts++;
    }

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        fullName: fullName.trim(),
        accountType,
        companyId,
        businessIdentifier: businessIdentifier ? businessIdentifier.trim() : null,
        phone: phone ? phone.trim() : null,
        country: country ? country.trim() : 'India',
        alertPreferences: {
          create: {
            emailAlerts: true,
            currencyFluctuations: true,
            weatherAlerts: true,
            documentDeadlines: true,
          },
        },
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        accountType: true,
        companyId: true,
        businessIdentifier: true,
        phone: true,
        country: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const accessToken = signAccessToken({ userId: user.id, accountType: user.accountType });
    const refreshToken = signRefreshToken({ userId: user.id });

    // Store hashed refresh token in DB
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await prisma.refreshToken.create({
      data: {
        tokenHash: refreshTokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Audit log
    await logAudit({
      userId: user.id,
      action: 'REGISTER',
      entityType: 'USER',
      entityId: user.id,
      details: { accountType: user.accountType, companyId: user.companyId },
      req,
    });

    // Send refresh token in HttpOnly cookie
    res.cookie('fxcgo_refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);

    return res.status(201).json({
      success: true,
      message: 'Registration successful. Welcome to FXCGO!',
      data: {
        user,
        accessToken,
      },
    });
  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred during user registration.',
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide both email and password.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password credentials.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password credentials.',
      });
    }

    // Generate tokens
    const accessToken = signAccessToken({ userId: user.id, accountType: user.accountType });
    const refreshToken = signRefreshToken({ userId: user.id });

    // Store hashed refresh token
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await prisma.refreshToken.create({
      data: {
        tokenHash: refreshTokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Audit log
    await logAudit({
      userId: user.id,
      action: 'LOGIN',
      entityType: 'USER',
      entityId: user.id,
      req,
    });

    res.cookie('fxcgo_refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          accountType: user.accountType,
          companyId: user.companyId,
          businessIdentifier: user.businessIdentifier,
          phone: user.phone,
          country: user.country,
        },
        accessToken,
      },
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred during login.',
    });
  }
};

export const refresh = async (req, res) => {
  try {
    const token = req.cookies?.fxcgo_refresh_token;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No refresh token provided in session cookies.',
      });
    }

    const decoded = verifyRefreshToken(token);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token session.',
      });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const existingToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!existingToken || existingToken.revoked || existingToken.expiresAt < new Date()) {
      res.clearCookie('fxcgo_refresh_token', REFRESH_COOKIE_OPTIONS);
      return res.status(401).json({
        success: false,
        error: 'Refresh token revoked or session expired. Please login again.',
      });
    }

    // Token rotation: Revoke old token
    await prisma.refreshToken.update({
      where: { id: existingToken.id },
      data: { revoked: true },
    });

    // Generate new pair
    const newAccessToken = signAccessToken({ userId: existingToken.userId, accountType: existingToken.user.accountType });
    const newRefreshToken = signRefreshToken({ userId: existingToken.userId });

    const newRefreshTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    await prisma.refreshToken.create({
      data: {
        tokenHash: newRefreshTokenHash,
        userId: existingToken.userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.cookie('fxcgo_refresh_token', newRefreshToken, REFRESH_COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    console.error('Refresh Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to refresh authentication session.',
    });
  }
};

export const logout = async (req, res) => {
  try {
    const token = req.cookies?.fxcgo_refresh_token;
    if (token) {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      await prisma.refreshToken.updateMany({
        where: { tokenHash },
        data: { revoked: true },
      });
    }

    if (req.user) {
      await logAudit({
        userId: req.user.id,
        action: 'LOGOUT',
        entityType: 'USER',
        entityId: req.user.id,
        req,
      });
    }

    res.clearCookie('fxcgo_refresh_token', REFRESH_COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    console.error('Logout Error:', error);
    res.clearCookie('fxcgo_refresh_token', REFRESH_COOKIE_OPTIONS);
    return res.status(200).json({ success: true });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        accountType: true,
        companyId: true,
        businessIdentifier: true,
        phone: true,
        country: true,
        createdAt: true,
        alertPreferences: true,
      },
    });

    return res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch current user profile.',
    });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, error: 'Email address is required.' });
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (user) {
    const token = crypto.randomBytes(24).toString('hex');
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: token,
        resetPasswordExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });
  }

  // Consistent message to prevent email enumeration
  return res.status(200).json({
    success: true,
    message: 'If your email is registered with FXCGO, password reset instructions have been dispatched.',
  });
};

export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ success: false, error: 'Token and new password are required.' });
  }

  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: token,
      resetPasswordExpires: { gt: new Date() },
    },
  });

  if (!user) {
    return res.status(400).json({ success: false, error: 'Invalid or expired password reset link.' });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    },
  });

  return res.status(200).json({
    success: true,
    message: 'Password successfully reset. You may now login.',
  });
};

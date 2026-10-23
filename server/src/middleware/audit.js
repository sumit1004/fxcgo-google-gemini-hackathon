import prisma from '../config/db.js';

export const logAudit = async ({
  userId = null,
  action,
  entityType,
  entityId = null,
  details = null,
  req = null,
}) => {
  try {
    const ipAddress = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress || null) : null;
    const userAgent = req ? req.headers['user-agent'] : null;

    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        details: details || {},
        ipAddress: ipAddress ? String(ipAddress) : null,
        userAgent: userAgent ? String(userAgent) : null,
      },
    });
  } catch (error) {
    // Non-blocking error logging for audits
    console.error('Audit Log Error:', error);
  }
};

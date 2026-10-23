import prisma from '../config/db.js';
import { logAudit } from '../middleware/audit.js';

export const listReports = async (req, res) => {
  try {
    const reports = await prisma.savedReport.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        tradeRequest: { select: { tradeRef: true, currencyPair: true } },
      },
    });

    return res.status(200).json({ success: true, data: { reports } });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch saved reports.' });
  }
};

export const saveReport = async (req, res) => {
  try {
    const { tradeRequestId, reportTitle, reportType, reportData } = req.body;

    if (!reportTitle || !reportType || !reportData) {
      return res.status(400).json({ success: false, error: 'Report title, type, and data are required.' });
    }

    const report = await prisma.savedReport.create({
      data: {
        userId: req.user.id,
        tradeRequestId: tradeRequestId || null,
        reportTitle: reportTitle.trim(),
        reportType,
        reportData,
      },
    });

    await logAudit({
      userId: req.user.id,
      action: 'REPORT_SAVE',
      entityType: 'REPORT',
      entityId: report.id,
      req,
    });

    return res.status(201).json({
      success: true,
      message: 'Trade intelligence report saved.',
      data: { report },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to save report.' });
  }
};

export const deleteReport = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await prisma.savedReport.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found.' });
    }

    await prisma.savedReport.delete({ where: { id } });

    return res.status(200).json({ success: true, message: 'Saved report deleted.' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to delete report.' });
  }
};

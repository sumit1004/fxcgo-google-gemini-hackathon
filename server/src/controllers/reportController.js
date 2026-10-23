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

    // Format reports for frontend display
    const formattedReports = reports.map((r) => ({
      id: r.id,
      title: r.reportTitle,
      type: r.reportType,
      createdAt: r.createdAt,
      content: r.reportData,
      tradeRef: r.tradeRequest?.tradeRef || 'FXT-GENERAL',
    }));

    return res.status(200).json({ success: true, data: { reports: formattedReports } });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch saved reports.' });
  }
};

export const generateReport = async (req, res) => {
  try {
    const tradeId = req.body.tradeId || req.body.tradeRequestId;
    const title = req.body.title || req.body.reportTitle || `Trade Intelligence Report // ${new Date().toLocaleDateString()}`;

    if (!tradeId) {
      return res.status(400).json({ success: false, error: 'tradeId is required.' });
    }

    const trade = await prisma.tradeRequest.findFirst({
      where: { id: tradeId, userId: req.user.id },
      include: {
        currencyForecasts: { orderBy: { createdAt: 'desc' }, take: 1 },
        routeRecommendations: { orderBy: { createdAt: 'desc' }, take: 1 },
        weatherReports: { orderBy: { createdAt: 'desc' }, take: 1 },
        freightQuotes: { orderBy: { createdAt: 'desc' }, take: 1 },
        documentChecklists: true,
        tradeResults: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!trade) {
      return res.status(404).json({ success: false, error: 'Trade request not found.' });
    }

    const reportData = {
      tradeRef: trade.tradeRef,
      tradeName: trade.cargoDescription || `${trade.originPort} → ${trade.destinationPort}`,
      origin: trade.originPort,
      destination: trade.destinationPort,
      amountUSD: trade.tradeAmount,
      currencyPair: trade.currencyPair,
      currencyForecast: trade.currencyForecasts[0] || null,
      route: trade.routeRecommendations[0] || null,
      weather: trade.weatherReports[0] || null,
      freight: trade.freightQuotes[0] || null,
      checklists: trade.documentChecklists || [],
      synthesis: trade.tradeResults[0] || null,
      generatedAt: new Date().toISOString(),
    };

    const report = await prisma.savedReport.create({
      data: {
        userId: req.user.id,
        tradeRequestId: trade.id,
        reportTitle: title.trim(),
        reportType: 'COMPREHENSIVE',
        reportData,
      },
    });

    await logAudit({
      userId: req.user.id,
      action: 'REPORT_GENERATE',
      entityType: 'REPORT',
      entityId: report.id,
      req,
    });

    return res.status(201).json({
      success: true,
      message: 'Comprehensive trade intelligence report compiled.',
      data: { report },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
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

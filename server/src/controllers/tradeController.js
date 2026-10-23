import crypto from 'crypto';
import prisma from '../config/db.js';
import workflowEngine from '../services/workflowEngine.js';
import { logAudit } from '../middleware/audit.js';

const generateTradeRef = () => {
  const hex = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `FXT-${hex}`;
};

export const createTrade = async (req, res) => {
  try {
    const isDraft = req.body.isDraft || req.body.status === 'DRAFT';
    const tradeType = req.body.tradeType || (req.user?.accountType === 'IMPORTER' ? 'IMPORT' : 'EXPORT');
    const exporterName = req.body.exporterName || (req.user?.accountType === 'EXPORTER' ? req.user.fullName : 'Atlantic Mercantile Exporters');
    const importerName = req.body.importerName || (req.user?.accountType === 'IMPORTER' ? req.user.fullName : 'Rotterdam Global Terminal BV');
    const businessCountry = req.body.businessCountry || req.user?.country || 'United States';
    const currencyPair = req.body.currencyPair || (req.body.currency ? `${req.body.currency}/USD` : 'EUR/USD');
    const tradeAmount = Number(req.body.tradeAmount || req.body.tradeValue || 100000);
    const shipmentValue = Number(req.body.shipmentValue || req.body.tradeValue || tradeAmount);
    const expectedPaymentDate = req.body.expectedPaymentDate || req.body.targetDeliveryDate || new Date(Date.now() + 30 * 86400000);
    const expectedShipmentDate = req.body.expectedShipmentDate || new Date(Date.now() + 7 * 86400000);
    const cargoCategory = req.body.cargoCategory || 'AGRICULTURAL_COMMODITY';
    const cargoDescription = req.body.cargoDescription || req.body.commodity || 'Premium Export Cargo';
    const originPort = req.body.originPort || 'Shanghai Port';
    const originCountry = req.body.originCountry || originPort.split(',')[1]?.trim() || 'China';
    const destinationPort = req.body.destinationPort || 'Port of Rotterdam';
    const destinationCountry = req.body.destinationCountry || destinationPort.split(',')[1]?.trim() || 'Netherlands';
    const transportMode = req.body.transportMode || req.body.transitMode || 'OCEAN';
    const riskTolerance = req.body.riskTolerance || 'MEDIUM';
    const historicalDataPeriod = req.body.historicalDataPeriod || '90_DAYS';
    const currencyExposure = Number(req.body.currencyExposure || tradeAmount);
    const preferredRoute = req.body.preferredRoute || null;
    const maxFreightBudget = req.body.maxFreightBudget ? Number(req.body.maxFreightBudget) : null;
    const additionalNotes = req.body.additionalNotes || req.body.notes || null;

    let tradeRef;
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      tradeRef = generateTradeRef();
      const exists = await prisma.tradeRequest.findUnique({ where: { tradeRef } });
      if (!exists) isUnique = true;
      attempts++;
    }

    const trade = await prisma.tradeRequest.create({
      data: {
        tradeRef,
        userId: req.user.id,
        tradeType,
        exporterName,
        importerName,
        businessCountry,
        currencyPair: currencyPair.toUpperCase(),
        tradeAmount,
        expectedPaymentDate: new Date(expectedPaymentDate),
        historicalDataPeriod,
        currencyExposure,
        cargoCategory,
        cargoDescription,
        shipmentValue,
        originCountry,
        originPort,
        destinationCountry,
        destinationPort,
        transportMode,
        expectedShipmentDate: new Date(expectedShipmentDate),
        preferredRoute,
        maxFreightBudget,
        riskTolerance,
        additionalNotes,
        status: isDraft ? 'DRAFT' : 'SUBMITTED',
      },
    });

    let workflow = null;
    if (!isDraft) {
      // Create initial workflow and evaluate Agent 1 readiness
      workflow = await workflowEngine.createWorkflow(trade.id, req.user.id);
      await workflowEngine.processWorkflow(workflow.id).catch((err) => {
        console.warn('Initial workflow processing caught:', err.message);
      });
    }

    await logAudit({
      userId: req.user.id,
      action: isDraft ? 'TRADE_DRAFT_SAVE' : 'TRADE_SUBMIT',
      entityType: 'TRADE',
      entityId: trade.id,
      details: { tradeRef, currencyPair: trade.currencyPair, tradeAmount },
      req,
    });

    return res.status(201).json({
      success: true,
      message: isDraft ? 'Trade draft saved successfully.' : 'Trade request submitted and workflow initialized.',
      data: {
        trade,
        workflow,
      },
    });
  } catch (error) {
    console.error('Create Trade Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create trade request.',
      message: error.message,
    });
  }
};

export const listTrades = async (req, res) => {
  try {
    const { status, search, limit = 20, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      userId: req.user.id,
      ...(status && { status }),
      ...(search && {
        OR: [
          { tradeRef: { contains: search } },
          { exporterName: { contains: search } },
          { importerName: { contains: search } },
          { currencyPair: { contains: search } },
          { originPort: { contains: search } },
          { destinationPort: { contains: search } },
        ],
      }),
    };

    const [trades, total] = await Promise.all([
      prisma.tradeRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
        include: {
          tradeWorkflows: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { id: true, currentStatus: true, agent1Status: true, agent2Status: true },
          },
          tradeResults: {
            take: 1,
            select: { id: true, overallRiskLevel: true, finalStatus: true },
          },
        },
      }),
      prisma.tradeRequest.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        trades,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('List Trades Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch trade history.',
    });
  }
};

export const getTradeById = async (req, res) => {
  try {
    const { id } = req.params;

    const trade = await prisma.tradeRequest.findFirst({
      where: {
        id,
        userId: req.user.id, // Strictly enforces ownership
      },
      include: {
        tradeWorkflows: {
          include: { steps: true },
          orderBy: { createdAt: 'desc' },
        },
        tradeResults: true,
        currencyForecasts: true,
        routeRecommendations: true,
        weatherReports: true,
        freightQuotes: true,
        tradeDocuments: true,
        documentChecklists: true,
        forwardContracts: true,
      },
    });

    if (!trade) {
      return res.status(404).json({
        success: false,
        error: 'Trade request not found or unauthorized access.',
      });
    }

    return res.status(200).json({
      success: true,
      data: { trade },
    });
  } catch (error) {
    console.error('Get Trade Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve trade details.',
    });
  }
};

export const updateTradeDraft = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.tradeRequest.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Trade draft not found.' });
    }

    if (existing.status !== 'DRAFT') {
      return res.status(400).json({ success: false, error: 'Only draft trade requests can be modified.' });
    }

    const updated = await prisma.tradeRequest.update({
      where: { id },
      data: req.body,
    });

    return res.status(200).json({
      success: true,
      message: 'Draft trade request updated successfully.',
      data: { trade: updated },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to update draft trade.',
    });
  }
};

export const deleteTrade = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.tradeRequest.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Trade request not found.' });
    }

    await prisma.tradeRequest.delete({ where: { id } });

    await logAudit({
      userId: req.user.id,
      action: 'TRADE_DELETE',
      entityType: 'TRADE',
      entityId: id,
      req,
    });

    return res.status(200).json({
      success: true,
      message: 'Trade request deleted.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to delete trade request.',
    });
  }
};

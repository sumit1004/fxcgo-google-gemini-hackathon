import crypto from 'crypto';
import prisma from '../config/db.js';
import { logAudit } from '../middleware/audit.js';

const generateContractRef = () => {
  return `FXC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
};

export const listContracts = async (req, res) => {
  try {
    const { status, search } = req.query;

    const where = {
      userId: req.user.id,
      ...(status && { status }),
      ...(search && {
        OR: [
          { contractRef: { contains: search } },
          { currencyPair: { contains: search } },
          { counterparty: { contains: search } },
        ],
      }),
    };

    const contracts = await prisma.forwardContract.findMany({
      where,
      orderBy: { maturityDate: 'asc' },
      include: {
        tradeRequest: {
          select: { tradeRef: true, exporterName: true, importerName: true },
        },
      },
    });

    // Calculate aggregated metrics
    const totalExposure = contracts.reduce((sum, c) => sum + Number(c.amount || 0), 0);
    const activeCount = contracts.filter((c) => c.status === 'ACTIVE').length;
    const pendingCount = contracts.filter((c) => c.status === 'PENDING_APPROVAL' || c.status === 'DRAFT').length;

    return res.status(200).json({
      success: true,
      data: {
        contracts,
        summary: {
          totalContracts: contracts.length,
          activeCount,
          pendingCount,
          totalExposure,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch forward contracts.' });
  }
};

export const createContract = async (req, res) => {
  try {
    const {
      tradeRequestId,
      currencyPair,
      amount,
      agreedRate,
      maturityDate,
      counterparty,
      notes,
    } = req.body;

    if (!currencyPair || !amount || !agreedRate || !maturityDate) {
      return res.status(400).json({
        success: false,
        error: 'Currency pair, amount, agreed rate, and maturity date are required.',
      });
    }

    let contractRef;
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      contractRef = generateContractRef();
      const conflict = await prisma.forwardContract.findUnique({ where: { contractRef } });
      if (!conflict) isUnique = true;
      attempts++;
    }

    const contract = await prisma.forwardContract.create({
      data: {
        contractRef,
        userId: req.user.id,
        tradeRequestId: tradeRequestId || null,
        currencyPair: currencyPair.trim().toUpperCase(),
        amount,
        agreedRate,
        maturityDate: new Date(maturityDate),
        counterparty: counterparty ? counterparty.trim() : null,
        status: 'DRAFT', // Remains DRAFT or PENDING_APPROVAL without broker confirmation
        notes: notes ? notes.trim() : null,
      },
    });

    await logAudit({
      userId: req.user.id,
      action: 'CONTRACT_CREATE',
      entityType: 'CONTRACT',
      entityId: contract.id,
      details: { contractRef, currencyPair, amount },
      req,
    });

    return res.status(201).json({
      success: true,
      message: 'Forward contract draft created successfully. Awaiting counterparty broker verification.',
      data: { contract },
    });
  } catch (error) {
    console.error('Create Contract Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create forward contract.' });
  }
};

export const updateContractStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const existing = await prisma.forwardContract.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Contract not found.' });
    }

    // Only allow valid state changes
    const allowed = ['DRAFT', 'PENDING_APPROVAL', 'CANCELLED'];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot set status to ${status} without live banking provider API confirmation.`,
      });
    }

    const updated = await prisma.forwardContract.update({
      where: { id },
      data: {
        status,
        ...(notes && { notes }),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Forward contract updated.',
      data: { contract: updated },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to update contract.' });
  }
};

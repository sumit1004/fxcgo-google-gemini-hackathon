import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../config/db.js';
import workflowEngine from '../services/workflowEngine.js';
import { createTrade, listTrades, getTradeById } from '../controllers/tradeController.js';
import { validateTradeCreation } from '../validations/tradeValidation.js';
import { logAudit } from '../middleware/audit.js';

const router = Router();

// Enforce authentication for all trade request operations
router.use(authenticate);

/**
 * POST /api/trade-requests
 * Creates a new trade request after validation
 */
router.post('/', validateTradeCreation, createTrade);

/**
 * GET /api/trade-requests
 * Returns the authenticated user's trade requests
 */
router.get('/', listTrades);

/**
 * GET /api/trade-requests/:id
 * Returns a specific trade request with details
 */
router.get('/:id', getTradeById);

/**
 * POST /api/trade-requests/:id/analyze
 * Runs the sequential Master Agent workflow:
 * 1. Validate ownership & state
 * 2. Run currency forecast (Agent 1)
 * 3. Run logistics intelligence (Agent 2)
 * 4. Merge results
 * 5. Persist unified report
 * 6. Return unified response
 */
router.post('/:id/analyze', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate user ownership of the trade request
    const trade = await prisma.tradeRequest.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!trade) {
      return res.status(404).json({
        success: false,
        error: 'Trade request not found or access denied.',
      });
    }

    // Retrieve or initialize workflow
    let workflow = await prisma.tradeWorkflow.findFirst({
      where: { tradeRequestId: trade.id, userId: req.user.id },
    });

    if (!workflow) {
      workflow = await workflowEngine.createWorkflow(trade.id, req.user.id);
    }

    // Execute sequential master agent workflow
    const executionResult = await workflowEngine.processWorkflow(workflow.id);

    await logAudit({
      userId: req.user.id,
      action: 'WORKFLOW_ANALYZE',
      entityType: 'TRADE_REQUEST',
      entityId: trade.id,
      details: { status: executionResult.status, workflowId: workflow.id },
      req,
    });

    if (executionResult.status === 'FAILED') {
      return res.status(422).json({
        success: false,
        message: executionResult.message,
        data: executionResult,
      });
    }

    return res.status(200).json({
      success: true,
      message: executionResult.message,
      data: executionResult,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Workflow execution failed.',
      message: error.message,
    });
  }
});

/**
 * GET /api/trade-requests/:id/report
 * Returns the saved unified trade intelligence report for the authenticated user
 */
router.get('/:id/report', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify trade ownership
    const trade = await prisma.tradeRequest.findFirst({
      where: { id, userId: req.user.id },
      include: {
        currencyForecasts: { orderBy: { createdAt: 'desc' }, take: 1 },
        routeRecommendations: { orderBy: { createdAt: 'desc' }, take: 1 },
        weatherReports: { orderBy: { createdAt: 'desc' }, take: 1 },
        freightQuotes: { orderBy: { createdAt: 'desc' }, take: 1 },
        documentChecklists: true,
        tradeDocuments: { orderBy: { uploadedAt: 'desc' } },
        tradeResults: { orderBy: { createdAt: 'desc' }, take: 1 },
        tradeWorkflows: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!trade) {
      return res.status(404).json({
        success: false,
        error: 'Trade request not found or access denied.',
      });
    }

    // Check for saved report
    const savedReport = await prisma.savedReport.findFirst({
      where: { tradeRequestId: id, userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });

    const tradeResult = trade.tradeResults[0] || null;
    const workflow = trade.tradeWorkflows[0] || null;

    return res.status(200).json({
      success: true,
      data: {
        tradeOverview: {
          id: trade.id,
          tradeRef: trade.tradeRef,
          tradeName: trade.cargoDescription || `${trade.originPort} → ${trade.destinationPort}`,
          tradeType: trade.tradeType,
          exporterName: trade.exporterName,
          importerName: trade.importerName,
          originPort: trade.originPort,
          destinationPort: trade.destinationPort,
          originCountry: trade.originCountry,
          destinationCountry: trade.destinationCountry,
          currencyPair: trade.currencyPair,
          tradeAmount: trade.tradeAmount,
          expectedPaymentDate: trade.expectedPaymentDate,
          expectedShipmentDate: trade.expectedShipmentDate,
          cargoCategory: trade.cargoCategory,
          status: trade.status,
          createdAt: trade.createdAt,
        },
        workflowStatus: {
          workflowId: workflow?.id,
          currentStatus: workflow?.currentStatus || 'SUBMITTED',
          agent1Status: workflow?.agent1Status || 'PENDING',
          agent2Status: workflow?.agent2Status || 'PENDING',
          lastError: workflow?.lastError,
          completedAt: workflow?.completedAt,
        },
        unifiedReport: savedReport?.reportData || (tradeResult ? {
          currencyIntelligence: tradeResult.currencyRiskSummary,
          logisticsIntelligence: tradeResult.logisticsSummary,
          documentationChecklist: tradeResult.documentationSummary,
          unifiedSummary: {
            totalEstimatedCostINR: tradeResult.estimatedTotalCost,
            overallRiskLevel: tradeResult.overallRiskLevel,
            recommendedActions: tradeResult.recommendedActions,
          },
        } : null),
        agentOutputs: {
          currencyForecast: trade.currencyForecasts[0] || null,
          routeRecommendation: trade.routeRecommendations[0] || null,
          weatherReport: trade.weatherReports[0] || null,
          freightQuote: trade.freightQuotes[0] || null,
          documentsChecklist: (trade.documentChecklists || []).map((chk) => {
            const hasUpload = (trade.tradeDocuments || []).some((d) => d.documentType === chk.documentType);
            return { ...chk, isUploaded: hasUpload, verified: hasUpload };
          }),
          uploadedDocuments: trade.tradeDocuments || [],
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve trade intelligence report.',
      message: error.message,
    });
  }
});

/**
 * POST /api/trade-requests/:id/retry
 * Retries the failed workflow stage where possible without rerunning successful stages
 */
router.post('/:id/retry', async (req, res) => {
  try {
    const { id } = req.params;
    const { stage } = req.body; // 'AGENT_1' or 'AGENT_2'

    const trade = await prisma.tradeRequest.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!trade) {
      return res.status(404).json({ success: false, error: 'Trade request not found.' });
    }

    const workflow = await prisma.tradeWorkflow.findFirst({
      where: { tradeRequestId: trade.id, userId: req.user.id },
    });

    if (!workflow) {
      return res.status(404).json({ success: false, error: 'Workflow not found for this trade request.' });
    }

    let retryOptions = { force: true };
    if (stage === 'AGENT_1') {
      retryOptions.retryAgent1 = true;
      await prisma.tradeWorkflow.update({
        where: { id: workflow.id },
        data: { agent1Status: 'PENDING', currentStatus: 'AGENT_1_PENDING', lastError: null },
      });
    } else {
      // Retrying Agent 2 requires Agent 1 to be completed
      if (workflow.agent1Status !== 'COMPLETED') {
        return res.status(400).json({
          success: false,
          error: 'Cannot retry Logistics Agent (Agent 2) until Currency Agent (Agent 1) is successfully completed.',
        });
      }
      retryOptions.retryAgent1 = false; // preserve valid Agent 1 results
      await prisma.tradeWorkflow.update({
        where: { id: workflow.id },
        data: { agent2Status: 'PENDING', currentStatus: 'AGENT_2_PENDING', lastError: null },
      });
    }

    const result = await workflowEngine.processWorkflow(workflow.id, retryOptions);

    return res.status(200).json({
      success: true,
      message: `Retried stage. Result: ${result.message}`,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retry workflow stage.',
      message: error.message,
    });
  }
});

export default router;

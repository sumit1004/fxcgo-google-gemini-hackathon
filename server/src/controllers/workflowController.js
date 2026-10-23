import prisma from '../config/db.js';
import workflowEngine from '../services/workflowEngine.js';
import { logAudit } from '../middleware/audit.js';

export const getWorkflow = async (req, res) => {
  try {
    const { id } = req.params;

    const workflow = await prisma.tradeWorkflow.findFirst({
      where: { id, userId: req.user.id },
      include: {
        tradeRequest: true,
        steps: { orderBy: { createdAt: 'asc' } },
        tradeResults: true,
      },
    });

    if (!workflow) {
      return res.status(404).json({ success: false, error: 'Workflow not found.' });
    }

    return res.status(200).json({ success: true, data: { workflow } });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve workflow.' });
  }
};

export const triggerWorkflow = async (req, res) => {
  try {
    const { id } = req.params;

    let workflow = await prisma.tradeWorkflow.findFirst({
      where: {
        OR: [
          { id },
          { tradeRequestId: id },
        ],
        userId: req.user.id,
      },
    });

    if (!workflow) {
      const trade = await prisma.tradeRequest.findFirst({
        where: { id, userId: req.user.id },
      });
      if (trade) {
        workflow = await workflowEngine.createWorkflow(trade.id, req.user.id);
      } else {
        return res.status(404).json({ success: false, error: 'Trade request or workflow not found.' });
      }
    }

    const result = await workflowEngine.processWorkflow(workflow.id);

    await logAudit({
      userId: req.user.id,
      action: 'WORKFLOW_TRIGGER',
      entityType: 'WORKFLOW',
      entityId: id,
      details: { status: result.status },
      req,
    });

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to execute workflow step.',
      message: error.message,
    });
  }
};

export const retryAgentStep = async (req, res) => {
  try {
    const { id } = req.params;
    const { step } = req.body; // 'AGENT_1' or 'AGENT_2'

    const workflow = await prisma.tradeWorkflow.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!workflow) {
      return res.status(404).json({ success: false, error: 'Workflow not found.' });
    }

    if (step === 'AGENT_1') {
      await prisma.tradeWorkflow.update({
        where: { id },
        data: { agent1Status: 'PENDING', currentStatus: 'AGENT_1_PENDING', lastError: null },
      });
    } else if (step === 'AGENT_2') {
      if (workflow.agent1Status !== 'COMPLETED') {
        return res.status(400).json({
          success: false,
          error: 'Cannot retry Agent 2: Agent 1 must be successfully completed first.',
        });
      }
      await prisma.tradeWorkflow.update({
        where: { id },
        data: { agent2Status: 'PENDING', currentStatus: 'AGENT_2_PENDING', lastError: null },
      });
    }

    const result = await workflowEngine.processWorkflow(id);

    return res.status(200).json({
      success: true,
      message: `Retried ${step}. Result: ${result.message}`,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

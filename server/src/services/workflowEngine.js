import prisma from '../config/db.js';
import agent1Adapter from './agent1Adapter.js';
import agent2Adapter from './agent2Adapter.js';

export class WorkflowEngine {
  /**
   * Initialize a new workflow for a submitted trade request
   */
  async createWorkflow(tradeRequestId, userId) {
    return prisma.$transaction(async (tx) => {
      const workflow = await tx.tradeWorkflow.create({
        data: {
          tradeRequestId,
          userId,
          currentStatus: 'SUBMITTED',
          agent1Status: 'PENDING',
          agent2Status: 'PENDING',
        },
      });

      // Initialize individual workflow steps for observability
      await tx.workflowStep.createMany({
        data: [
          {
            workflowId: workflow.id,
            stepName: 'AGENT_1_CURRENCY_FORECAST',
            agentName: 'Agent1_Currency',
            status: 'PENDING',
          },
          {
            workflowId: workflow.id,
            stepName: 'AGENT_2_ROUTE_OPTIMIZATION',
            agentName: 'Agent2_Optimization',
            status: 'PENDING',
          },
          {
            workflowId: workflow.id,
            stepName: 'AGENT_2_WEATHER_ANALYSIS',
            agentName: 'Agent2_Optimization',
            status: 'PENDING',
          },
          {
            workflowId: workflow.id,
            stepName: 'AGENT_2_FREIGHT_BENCHMARK',
            agentName: 'Agent2_Optimization',
            status: 'PENDING',
          },
          {
            workflowId: workflow.id,
            stepName: 'AGENT_2_DOCUMENTATION_CHECKLIST',
            agentName: 'Agent2_Optimization',
            status: 'PENDING',
          },
          {
            workflowId: workflow.id,
            stepName: 'FINAL_RECOMMENDATION_MERGE',
            agentName: 'Core_Intelligence',
            status: 'PENDING',
          },
        ],
      });

      // Default trade document checklists based on transport mode
      await tx.documentChecklist.createMany({
        data: [
          { tradeRequestId, documentName: 'Commercial Invoice', documentType: 'COMMERCIAL_INVOICE', isMandatory: true },
          { tradeRequestId, documentName: 'Packing List', documentType: 'PACKING_LIST', isMandatory: true },
          { tradeRequestId, documentName: 'Bill of Lading / Airway Bill', documentType: 'BILL_OF_LADING', isMandatory: true },
          { tradeRequestId, documentName: 'Certificate of Origin', documentType: 'CERTIFICATE_OF_ORIGIN', isMandatory: false },
          { tradeRequestId, documentName: 'Letter of Credit', documentType: 'LETTER_OF_CREDIT', isMandatory: false },
        ],
      });

      return workflow;
    });
  }

  /**
   * Run or evaluate sequential execution of a trade workflow
   */
  async processWorkflow(workflowId) {
    const workflow = await prisma.tradeWorkflow.findUnique({
      where: { id: workflowId },
      include: {
        tradeRequest: true,
        steps: true,
      },
    });

    if (!workflow) throw new Error('Workflow not found');
    const { tradeRequest } = workflow;

    // STEP 1: Execute Agent 1 if pending
    if (workflow.agent1Status === 'PENDING' || workflow.currentStatus === 'SUBMITTED' || workflow.currentStatus === 'AGENT_1_PENDING') {
      await prisma.tradeWorkflow.update({
        where: { id: workflowId },
        data: {
          currentStatus: 'AGENT_1_RUNNING',
          agent1Status: 'RUNNING',
          startedAt: workflow.startedAt || new Date(),
        },
      });

      const agent1Result = await agent1Adapter.predict({
        currencyPair: tradeRequest.currencyPair,
        tradeAmount: tradeRequest.tradeAmount,
        expectedPaymentDate: tradeRequest.expectedPaymentDate,
        historicalDataPeriod: tradeRequest.historicalDataPeriod,
        riskTolerance: tradeRequest.riskTolerance,
      });

      if (!agent1Result.success) {
        // If model is pending, record clear integration pending status
        await prisma.tradeWorkflow.update({
          where: { id: workflowId },
          data: {
            currentStatus: 'AGENT_1_PENDING',
            agent1Status: 'PENDING',
            lastError: agent1Result.message || 'Currency forecasting model integration is pending.',
          },
        });

        // Store placeholder currency forecast with pending status
        await prisma.currencyForecast.upsert({
          where: { id: workflow.tradeRequestId }, // or findFirst
          update: { status: 'PENDING', recommendation: agent1Result.message },
          create: {
            tradeRequestId: tradeRequest.id,
            currencyPair: tradeRequest.currencyPair,
            horizonDays: 20,
            status: 'PENDING',
            recommendation: agent1Result.message,
          },
        }).catch(async () => {
          await prisma.currencyForecast.create({
            data: {
              tradeRequestId: tradeRequest.id,
              currencyPair: tradeRequest.currencyPair,
              horizonDays: 20,
              status: 'PENDING',
              recommendation: agent1Result.message,
            },
          });
        });

        return {
          workflowId,
          status: 'AGENT_1_PENDING',
          message: agent1Result.message,
        };
      }

      // If Agent 1 succeeded
      await prisma.tradeWorkflow.update({
        where: { id: workflowId },
        data: {
          currentStatus: 'AGENT_1_COMPLETED',
          agent1Status: 'COMPLETED',
          lastError: null,
        },
      });
    }

    // STEP 2: Execute Agent 2 ONLY after Agent 1 has completed
    const updatedWorkflow = await prisma.tradeWorkflow.findUnique({
      where: { id: workflowId },
    });

    if (updatedWorkflow.agent1Status !== 'COMPLETED') {
      return {
        workflowId,
        status: updatedWorkflow.currentStatus,
        message: 'Agent 2 execution held: Waiting for Agent 1 completion.',
      };
    }

    // Agent 1 is complete -> proceed to Agent 2
    await prisma.tradeWorkflow.update({
      where: { id: workflowId },
      data: {
        currentStatus: 'AGENT_2_RUNNING',
        agent2Status: 'RUNNING',
      },
    });

    const agent2Result = await agent2Adapter.optimize(tradeRequest, { completed: true });

    if (!agent2Result.success) {
      await prisma.tradeWorkflow.update({
        where: { id: workflowId },
        data: {
          currentStatus: 'AGENT_2_PENDING',
          agent2Status: 'PENDING',
          lastError: agent2Result.message,
        },
      });

      return {
        workflowId,
        status: 'AGENT_2_PENDING',
        message: agent2Result.message,
      };
    }

    // Agent 2 completed -> Merge Results
    await prisma.tradeWorkflow.update({
      where: { id: workflowId },
      data: {
        currentStatus: 'MERGING_RESULTS',
        agent2Status: 'COMPLETED',
      },
    });

    // Create / Update unified final trade recommendation
    await prisma.tradeResult.create({
      data: {
        tradeRequestId: tradeRequest.id,
        workflowId: workflow.id,
        overallRiskLevel: tradeRequest.riskTolerance || 'MEDIUM',
        finalStatus: 'COMPLETED',
        mergedAt: new Date(),
        recommendedActions: [
          'Review 20-day currency hedge ratio based on forward contract rates.',
          'Verify carrier route transit times and marine weather conditions.',
          'Ensure Commercial Invoice and Bill of Lading meet customs checklist.',
        ],
      },
    });

    await prisma.tradeWorkflow.update({
      where: { id: workflowId },
      data: {
        currentStatus: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    return {
      workflowId,
      status: 'COMPLETED',
      message: 'Trade workflow and final recommendation successfully completed.',
    };
  }
}

export default new WorkflowEngine();

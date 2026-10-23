import prisma from '../config/db.js';
import agent1Adapter from './agent1Adapter.js';
import agent2Adapter from './agent2Adapter.js';

export class WorkflowEngine {
  /**
   * Initialize a new workflow for a trade request
   */
  async createWorkflow(tradeRequestId, userId) {
    const existing = await prisma.tradeWorkflow.findFirst({
      where: { tradeRequestId, userId },
    });
    if (existing) return existing;

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
            stepName: 'AGENT_2_LOGISTICS_OPTIMIZATION',
            agentName: 'Agent2_Logistics',
            status: 'PENDING',
          },
          {
            workflowId: workflow.id,
            stepName: 'UNIFIED_REPORT_MERGE',
            agentName: 'Core_Intelligence',
            status: 'PENDING',
          },
        ],
      });

      return workflow;
    });
  }

  /**
   * Run or resume sequential execution of a trade workflow
   * Currency Risk Agent -> Logistics Agent -> Unified Result
   */
  async processWorkflow(workflowId, options = {}) {
    const workflow = await prisma.tradeWorkflow.findUnique({
      where: { id: workflowId },
      include: {
        tradeRequest: true,
        steps: true,
      },
    });

    if (!workflow) {
      throw new Error(`Workflow '${workflowId}' not found.`);
    }

    // Workflow Lock: Protect against duplicate concurrent executions
    if (workflow.currentStatus === 'AGENT_1_RUNNING' || workflow.currentStatus === 'AGENT_2_RUNNING') {
      const startedAtMs = workflow.startedAt ? new Date(workflow.startedAt).getTime() : 0;
      const runningMs = Date.now() - startedAtMs;
      // Allow lock recovery if running for longer than 60 seconds (timed out request)
      if (runningMs < 60000 && !options.force) {
        return {
          workflowId,
          status: workflow.currentStatus,
          message: 'Workflow analysis is already in progress. Please wait for the current analysis to finish.',
          isLocked: true,
        };
      }
    }

    const { tradeRequest } = workflow;

    // =========================================================================
    // STEP 1: RUN AGENT 1 (Currency Risk & Forward Contract Forecasting)
    // =========================================================================
    let agent1Result = null;

    // Check if Agent 1 already completed and retry was not requested for Agent 1
    const existingForecast = await prisma.currencyForecast.findFirst({
      where: { tradeRequestId: tradeRequest.id, status: 'COMPLETED' },
    });

    if (existingForecast && workflow.agent1Status === 'COMPLETED' && !options.retryAgent1) {
      // Re-use already completed currency forecast
      agent1Result = {
        success: true,
        isModelConnected: true,
        status: 'COMPLETED',
        currentPrice: Number(existingForecast.currentRate || 0),
        forecast: existingForecast.rawOutput?.forecast || [],
        metrics: existingForecast.rawOutput?.metrics || {},
        exposureAnalysis: existingForecast.rawOutput?.exposureAnalysis || {},
        decisionSupport: {
          recommendation: existingForecast.recommendation || '',
          disclaimer: existingForecast.rawOutput?.decisionSupport?.disclaimer || '',
        },
      };
    } else {
      // Set workflow and step to AGENT_1_RUNNING
      await prisma.tradeWorkflow.update({
        where: { id: workflowId },
        data: {
          currentStatus: 'AGENT_1_RUNNING',
          agent1Status: 'RUNNING',
          startedAt: workflow.startedAt || new Date(),
          lastError: null,
        },
      });

      await prisma.workflowStep.updateMany({
        where: { workflowId, stepName: 'AGENT_1_CURRENCY_FORECAST' },
        data: { status: 'RUNNING', startedAt: new Date(), errorDetails: null },
      });

      agent1Result = await agent1Adapter.predict({
        currencyPair: tradeRequest.currencyPair,
        tradeAmount: tradeRequest.tradeAmount,
        expectedPaymentDate: tradeRequest.expectedPaymentDate,
      });

      if (!agent1Result.success) {
        const errorMsg = agent1Result.error || agent1Result.message || 'Forex model forecasting failed.';

        await prisma.tradeWorkflow.update({
          where: { id: workflowId },
          data: {
            currentStatus: 'FAILED',
            agent1Status: 'FAILED',
            lastError: errorMsg,
          },
        });

        await prisma.workflowStep.updateMany({
          where: { workflowId, stepName: 'AGENT_1_CURRENCY_FORECAST' },
          data: { status: 'FAILED', completedAt: new Date(), errorDetails: errorMsg },
        });

        return {
          workflowId,
          status: 'FAILED',
          failedStage: 'AGENT_1_CURRENCY_FORECAST',
          error: errorMsg,
          message: `Agent 1 Currency Intelligence failed: ${errorMsg}`,
          canRetry: true,
          retryStage: 'AGENT_1',
        };
      }

      // Agent 1 Succeeded -> Persist Currency Forecast
      await prisma.currencyForecast.deleteMany({
        where: { tradeRequestId: tradeRequest.id },
      });

      await prisma.currencyForecast.create({
        data: {
          tradeRequestId: tradeRequest.id,
          currencyPair: agent1Result.currencyPair || tradeRequest.currencyPair,
          horizonDays: 20,
          predictedTrend: agent1Result.metrics?.trend || 'NEUTRAL',
          currentRate: agent1Result.currentPrice,
          forecastedRate: agent1Result.metrics?.finalPrice,
          potentialExposure: agent1Result.exposureAnalysis?.potentialVarianceINR,
          recommendation: agent1Result.decisionSupport?.recommendation,
          modelVersion: agent1Result.modelVersion,
          status: 'COMPLETED',
          predictionTimestamp: new Date(),
          rawOutput: {
            currentPrice: agent1Result.currentPrice,
            forecast: agent1Result.forecast,
            metrics: agent1Result.metrics,
            exposureAnalysis: agent1Result.exposureAnalysis,
            decisionSupport: agent1Result.decisionSupport,
          },
        },
      });

      await prisma.tradeWorkflow.update({
        where: { id: workflowId },
        data: {
          agent1Status: 'COMPLETED',
          currentStatus: 'AGENT_1_COMPLETED',
          lastError: null,
        },
      });

      await prisma.workflowStep.updateMany({
        where: { workflowId, stepName: 'AGENT_1_CURRENCY_FORECAST' },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          outputData: {
            currentPrice: agent1Result.currentPrice,
            trend: agent1Result.metrics?.trend,
            projectedChangePct: agent1Result.metrics?.projectedChangePct,
          },
        },
      });
    }

    // =========================================================================
    // STEP 2: RUN AGENT 2 (Logistics, Route, Weather & Freight Intelligence)
    // =========================================================================
    await prisma.tradeWorkflow.update({
      where: { id: workflowId },
      data: {
        currentStatus: 'AGENT_2_RUNNING',
        agent2Status: 'RUNNING',
      },
    });

    await prisma.workflowStep.updateMany({
      where: { workflowId, stepName: 'AGENT_2_LOGISTICS_OPTIMIZATION' },
      data: { status: 'RUNNING', startedAt: new Date(), errorDetails: null },
    });

    const agent2Result = await agent2Adapter.optimize(tradeRequest, agent1Result);

    if (!agent2Result.success) {
      const errorMsg = agent2Result.error || agent2Result.message || 'Logistics optimization failed.';

      // Preserve valid Agent 1 results, mark Agent 2 as failed
      await prisma.tradeWorkflow.update({
        where: { id: workflowId },
        data: {
          currentStatus: 'FAILED',
          agent2Status: 'FAILED',
          lastError: errorMsg,
        },
      });

      await prisma.workflowStep.updateMany({
        where: { workflowId, stepName: 'AGENT_2_LOGISTICS_OPTIMIZATION' },
        data: { status: 'FAILED', completedAt: new Date(), errorDetails: errorMsg },
      });

      return {
        workflowId,
        status: 'FAILED',
        failedStage: 'AGENT_2_LOGISTICS_OPTIMIZATION',
        error: errorMsg,
        message: `Agent 2 Logistics Intelligence failed: ${errorMsg}`,
        agent1Completed: true,
        canRetry: true,
        retryStage: 'AGENT_2',
      };
    }

    // Agent 2 Succeeded -> Persist Route, Weather, Freight, & Documentation
    const logistics = agent2Result.data;

    // 1. Route Recommendation
    await prisma.routeRecommendation.deleteMany({ where: { tradeRequestId: tradeRequest.id } });
    await prisma.routeRecommendation.create({
      data: {
        tradeRequestId: tradeRequest.id,
        originPort: tradeRequest.originPort,
        destinationPort: tradeRequest.destinationPort,
        recommendedRoute: logistics.routeOptimization.optimalRoute.join(' -> '),
        distanceKm: logistics.routeOptimization.optimalDistanceNm ? Number((logistics.routeOptimization.optimalDistanceNm * 1.852).toFixed(2)) : null,
        estimatedTransitDays: Math.ceil((logistics.routeOptimization.optimalDistanceNm || 3000) / (15 * 24)),
        routeAlternatives: {
          alternativeRoute: logistics.routeOptimization.alternativeRoute,
          optimizationGains: logistics.routeOptimization.optimizationGains,
        },
        waypoints: logistics.routeOptimization.mapData,
        status: 'COMPLETED',
      },
    });

    // 2. Weather Report
    await prisma.weatherReport.deleteMany({ where: { tradeRequestId: tradeRequest.id } });
    await prisma.weatherReport.create({
      data: {
        tradeRequestId: tradeRequest.id,
        originWeather: `Departure Max Waves: ${logistics.marineWeather.departureWaveM}m | Wind: ${logistics.marineWeather.departureWindKmh} km/h`,
        destinationWeather: `Optimal Departure Date: ${logistics.routeOptimization.optimalDepartureDate}`,
        routeConditions: `Data source: ${logistics.marineWeather.dataSource} (${logistics.marineWeather.isLiveData ? 'Verified Live' : 'Fallback Estimates'})`,
        weatherRisk: logistics.marineWeather.departureWaveM > 3.0 ? 'HIGH' : (logistics.marineWeather.departureWaveM > 2.0 ? 'MEDIUM' : 'LOW'),
        expectedDelayDays: Math.round(logistics.freightCost.estimatedDelayDays || 0),
        alerts: logistics.marineWeather.forecastComparison,
        status: 'COMPLETED',
      },
    });

    // 3. Freight Quote
    await prisma.freightQuote.deleteMany({ where: { tradeRequestId: tradeRequest.id } });
    await prisma.freightQuote.create({
      data: {
        tradeRequestId: tradeRequest.id,
        transportMode: tradeRequest.transportMode || 'OCEAN',
        cargoCategory: tradeRequest.cargoCategory || 'General Goods',
        estimatedCost: logistics.freightCost.estimatedFreightUSD,
        currency: 'USD',
        recommendedOption: `Sea Route via ${logistics.routeOptimization.optimalRoute.join(' -> ')}`,
        quoteComparison: {
          estimatedDelayDays: logistics.freightCost.estimatedDelayDays,
          optimalDepartureDate: logistics.routeOptimization.optimalDepartureDate,
          disclaimer: logistics.freightCost.benchmarkDisclaimers,
        },
        status: 'COMPLETED',
      },
    });

    // 4. Document Checklist
    await prisma.documentChecklist.deleteMany({ where: { tradeRequestId: tradeRequest.id } });
    const docItems = logistics.documentation.checklist || [];
    for (const item of docItems) {
      await prisma.documentChecklist.create({
        data: {
          tradeRequestId: tradeRequest.id,
          documentName: item.name,
          documentType: item.documentType || 'OTHER',
          isMandatory: !!item.isMandatory,
          isUploaded: false,
          verified: false,
        },
      });
    }

    await prisma.workflowStep.updateMany({
      where: { workflowId, stepName: 'AGENT_2_LOGISTICS_OPTIMIZATION' },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        outputData: {
          optimalRoute: logistics.routeOptimization.optimalRoute,
          departureDate: logistics.routeOptimization.optimalDepartureDate,
          freightUSD: logistics.freightCost.estimatedFreightUSD,
        },
      },
    });

    // =========================================================================
    // STEP 3: MERGE BOTH OUTPUTS INTO UNIFIED TRADE REPORT
    // =========================================================================
    await prisma.tradeWorkflow.update({
      where: { id: workflowId },
      data: {
        currentStatus: 'MERGING_RESULTS',
        agent2Status: 'COMPLETED',
      },
    });

    await prisma.workflowStep.updateMany({
      where: { workflowId, stepName: 'UNIFIED_REPORT_MERGE' },
      data: { status: 'RUNNING', startedAt: new Date() },
    });

    // Synthesize transparent unified recommendations derived strictly from real outputs
    const currencySummary = {
      pair: agent1Result.currencyPair || 'USD/INR',
      currentPrice: agent1Result.currentPrice,
      trend: agent1Result.metrics?.trend || 'NEUTRAL',
      projectedChangePct: agent1Result.metrics?.projectedChangePct || 0,
      volatilityPercent: agent1Result.metrics?.volatilityPercent || 0,
      forwardContractAdvice: agent1Result.decisionSupport?.recommendation || '',
      forecast: agent1Result.forecast || [],
      exposureAnalysis: agent1Result.exposureAnalysis || {},
      disclaimer: agent1Result.decisionSupport?.disclaimer,
    };

    const logisticsSummary = {
      optimalRoute: logistics.routeOptimization.optimalRoute,
      alternativeRoute: logistics.routeOptimization.alternativeRoute,
      departureDate: logistics.routeOptimization.optimalDepartureDate,
      distanceNm: logistics.routeOptimization.optimalDistanceNm,
      estimatedFreightUSD: logistics.freightCost.estimatedFreightUSD,
      estimatedDelayDays: logistics.freightCost.estimatedDelayDays,
      marineWeather: logistics.marineWeather,
      mapData: logistics.routeOptimization.mapData,
      optimizationGains: logistics.routeOptimization.optimizationGains,
      disclaimer: logistics.freightCost.benchmarkDisclaimers,
    };

    const docSummary = {
      source: logistics.documentation.source,
      disclaimer: logistics.documentation.disclaimer,
      totalCount: logistics.documentation.totalDocuments,
      mandatoryCount: logistics.documentation.mandatoryCount,
      documents: logistics.documentation.checklist,
    };

    // Calculate transparent total estimated cost (Freight USD converted to INR + Trade Amount INR)
    const freightUSD = Number(logistics.freightCost.estimatedFreightUSD) || 0;
    const freightINR = freightUSD * agent1Result.currentPrice;
    const tradeAmountUSD = Number(tradeRequest.tradeAmount) || 0;
    const tradeAmountINR = tradeAmountUSD * agent1Result.currentPrice;
    const totalEstimatedLandedINR = tradeAmountINR + freightINR;

    // Qualitative action list for user's trade review
    const recommendedActions = [
      `Currency Risk: ${agent1Result.metrics?.trend} trend projected (+${agent1Result.metrics?.projectedChangePct}% 20-day horizon). Review forward hedge with your bank.`,
      `Optimal Shipping Lane: Depart on ${logistics.routeOptimization.optimalDepartureDate} via ${logistics.routeOptimization.optimalRoute.join(' -> ')} to minimize nautical transit miles.`,
      `Freight Benchmark: Budget approximately $${freightUSD.toLocaleString()} USD (~₹${Math.round(freightINR).toLocaleString()} INR) for ocean freight.`,
      `Compliance: Prepare the ${logistics.documentation.mandatoryCount} mandatory export/import trade documents prior to container gate-in.`,
    ];

    // Persist TradeResult
    await prisma.tradeResult.deleteMany({ where: { tradeRequestId: tradeRequest.id } });
    const tradeResult = await prisma.tradeResult.create({
      data: {
        tradeRequestId: tradeRequest.id,
        workflowId: workflow.id,
        currencyRiskSummary: currencySummary,
        logisticsSummary: logisticsSummary,
        documentationSummary: docSummary,
        estimatedTotalCost: totalEstimatedLandedINR,
        overallRiskLevel: agent1Result.metrics?.volatilityPercent > 2.5 ? 'HIGH' : (agent1Result.metrics?.volatilityPercent > 1.2 ? 'MEDIUM' : 'LOW'),
        potentialSavings: logistics.routeOptimization.optimizationGains?.distance_efficiency_percent || 0,
        recommendedActions: recommendedActions,
        finalStatus: 'COMPLETED',
        mergedAt: new Date(),
      },
    });

    // Persist in Saved Reports for user reference
    const reportPayload = {
      tradeRequestId: tradeRequest.id,
      tradeRef: tradeRequest.tradeRef,
      tradeName: tradeRequest.cargoDescription || `Trade ${tradeRequest.originPort} to ${tradeRequest.destinationPort}`,
      createdAt: new Date().toISOString(),
      tradeOverview: {
        tradeRef: tradeRequest.tradeRef,
        tradeType: tradeRequest.tradeType,
        originPort: tradeRequest.originPort,
        destinationPort: tradeRequest.destinationPort,
        currencyPair: tradeRequest.currencyPair,
        tradeAmount: tradeRequest.tradeAmount,
        cargoCategory: tradeRequest.cargoCategory,
      },
      currencyIntelligence: currencySummary,
      logisticsIntelligence: logisticsSummary,
      documentationChecklist: docSummary,
      unifiedSummary: {
        totalEstimatedCostINR: totalEstimatedLandedINR,
        recommendedActions,
      },
    };

    await prisma.savedReport.create({
      data: {
        tradeRequestId: tradeRequest.id,
        userId: tradeRequest.userId,
        reportTitle: `Unified Trade Intelligence: ${tradeRequest.originPort} → ${tradeRequest.destinationPort}`,
        reportType: 'COMPREHENSIVE',
        reportData: reportPayload,
      },
    });

    // Mark steps, workflow, and tradeRequest as completed
    await prisma.workflowStep.updateMany({
      where: { workflowId, stepName: 'UNIFIED_REPORT_MERGE' },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    await prisma.tradeWorkflow.update({
      where: { id: workflowId },
      data: {
        currentStatus: 'COMPLETED',
        completedAt: new Date(),
        lastError: null,
      },
    });

    await prisma.tradeRequest.update({
      where: { id: tradeRequest.id },
      data: { status: 'COMPLETED' },
    });

    return {
      workflowId,
      status: 'COMPLETED',
      tradeRequestId: tradeRequest.id,
      tradeResultId: tradeResult.id,
      message: 'Unified AI Trade Intelligence workflow completed successfully.',
      report: reportPayload,
    };
  }
}

export default new WorkflowEngine();

import prisma from '../config/db.js';

export const getFinalRecommendation = async (req, res) => {
  try {
    const { tradeId } = req.params;

    const trade = await prisma.tradeRequest.findFirst({
      where: { id: tradeId, userId: req.user.id },
      include: {
        tradeWorkflows: { orderBy: { createdAt: 'desc' }, take: 1, include: { steps: true } },
        tradeResults: { orderBy: { createdAt: 'desc' }, take: 1 },
        currencyForecasts: { orderBy: { createdAt: 'desc' }, take: 1 },
        routeRecommendations: { orderBy: { createdAt: 'desc' }, take: 1 },
        weatherReports: { orderBy: { createdAt: 'desc' }, take: 1 },
        freightQuotes: { orderBy: { createdAt: 'desc' }, take: 1 },
        tradeDocuments: true,
        documentChecklists: true,
        forwardContracts: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!trade) {
      return res.status(404).json({ success: false, error: 'Trade request not found.' });
    }

    const workflow = trade.tradeWorkflows[0] || null;
    const finalResult = trade.tradeResults[0] || null;
    const forecast = trade.currencyForecasts[0] || null;
    const route = trade.routeRecommendations[0] || null;
    const weather = trade.weatherReports[0] || null;
    const freight = trade.freightQuotes[0] || null;
    const contract = trade.forwardContracts[0] || null;

    // Evaluate documentation checklist completion
    const totalRequiredDocs = trade.documentChecklists.filter((d) => d.isMandatory).length;
    const uploadedDocs = trade.tradeDocuments.length;
    const missingDocs = trade.documentChecklists.filter((d) => d.isMandatory && !d.isUploaded);

    // Identify missing integration dependencies
    const missingDependencies = [];
    if (!forecast || forecast.status !== 'COMPLETED') {
      missingDependencies.push('Agent 1: 20-Day Currency Forecasting Model (Pending)');
    }
    if (!route || route.status !== 'COMPLETED') {
      missingDependencies.push('Agent 2A: Trade Route Optimization Model (Pending)');
    }
    if (!weather || weather.status !== 'COMPLETED') {
      missingDependencies.push('Agent 2B: Marine Weather Forecasting Model (Pending)');
    }
    if (!freight || freight.status !== 'COMPLETED') {
      missingDependencies.push('Agent 2C: Freight Fare Minimization Agent (Pending)');
    }

    return res.status(200).json({
      success: true,
      data: {
        trade: {
          id: trade.id,
          tradeRef: trade.tradeRef,
          tradeType: trade.tradeType,
          exporterName: trade.exporterName,
          importerName: trade.importerName,
          currencyPair: trade.currencyPair,
          tradeAmount: trade.tradeAmount,
          expectedPaymentDate: trade.expectedPaymentDate,
          originPort: trade.originPort,
          destinationPort: trade.destinationPort,
          transportMode: trade.transportMode,
          riskTolerance: trade.riskTolerance,
        },
        workflowStatus: workflow ? workflow.currentStatus : 'NOT_INITIALIZED',
        isComplete: workflow ? workflow.currentStatus === 'COMPLETED' : false,
        missingDependencies,
        currencyRiskSummary: {
          currencyPair: trade.currencyPair,
          exposure: trade.currencyExposure || trade.tradeAmount,
          forecastStatus: forecast ? forecast.status : 'PENDING',
          forecastOutput: forecast?.rawOutput || null,
          forwardContractStatus: contract ? contract.status : 'NONE',
          recommendation: forecast?.recommendation || 'Currency forecasting model integration is pending.',
        },
        logisticsSummary: {
          originPort: trade.originPort,
          destinationPort: trade.destinationPort,
          transportMode: trade.transportMode,
          routeStatus: route ? route.status : 'PENDING',
          weatherRisk: weather ? weather.weatherRisk : 'UNKNOWN',
          expectedDelayDays: weather ? weather.expectedDelayDays : 0,
          freightCostEstimate: freight ? freight.estimatedCost : null,
          freightCurrency: freight ? freight.currency : 'USD',
          logisticsNotice: 'Logistics models integration pending trained service connection.',
        },
        documentationSummary: {
          totalRequired: totalRequiredDocs,
          totalUploaded: uploadedDocs,
          missingDocuments: missingDocs.map((d) => d.documentName),
          complianceStatus: missingDocs.length === 0 ? 'COMPLIANT' : 'ACTION_REQUIRED',
        },
        combinedAnalysis: {
          overallRisk: finalResult ? finalResult.overallRiskLevel : trade.riskTolerance,
          estimatedTotalCost: finalResult ? finalResult.estimatedTotalCost : null,
          potentialSavings: finalResult ? finalResult.potentialSavings : null,
          recommendedActions: finalResult?.recommendedActions || [
            'Monitor currency pair volatility as payment date approaches.',
            'Maintain documentation compliance prior to customs dispatch.',
            'Review forward contract terms to minimize currency exposure.',
          ],
        },
      },
    });
  } catch (error) {
    console.error('Final Recommendation Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to generate final recommendation.' });
  }
};

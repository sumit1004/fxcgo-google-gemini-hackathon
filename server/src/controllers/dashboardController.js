import prisma from '../config/db.js';

export const getDashboardOverview = async (req, res) => {
  try {
    const userId = req.user.id;

    const [
      totalTrades,
      activeWorkflows,
      trades,
      activeContracts,
      allContracts,
      pendingDocumentsCount,
      recentTrades,
      recentAlerts,
    ] = await Promise.all([
      // Total trade requests
      prisma.tradeRequest.count({ where: { userId } }),

      // Active workflows
      prisma.tradeWorkflow.count({
        where: {
          userId,
          currentStatus: { in: ['SUBMITTED', 'AGENT_1_RUNNING', 'AGENT_2_RUNNING', 'MERGING_RESULTS', 'AGENT_1_PENDING', 'AGENT_2_PENDING'] },
        },
      }),

      // Trades for currency exposure calculation
      prisma.tradeRequest.findMany({
        where: { userId },
        select: { tradeAmount: true, currencyPair: true },
      }),

      // Active forward contracts
      prisma.forwardContract.count({
        where: { userId, status: 'ACTIVE' },
      }),

      // Upcoming forward contracts
      prisma.forwardContract.findMany({
        where: { userId },
        orderBy: { maturityDate: 'asc' },
        take: 5,
        select: {
          id: true,
          contractRef: true,
          currencyPair: true,
          amount: true,
          agreedRate: true,
          maturityDate: true,
          status: true,
        },
      }),

      // Missing mandatory documents across active trades
      prisma.documentChecklist.count({
        where: {
          tradeRequest: { userId },
          isMandatory: true,
          isUploaded: false,
        },
      }),

      // Recent trade requests
      prisma.tradeRequest.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          tradeWorkflows: { take: 1, select: { currentStatus: true } },
          currencyForecasts: { take: 1, select: { status: true, recommendation: true } },
        },
      }),

      // Recent alerts
      prisma.alert.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    // Aggregate Total Currency Exposure
    const currencyExposure = trades.reduce((sum, t) => sum + Number(t.tradeAmount || 0), 0);

    return res.status(200).json({
      success: true,
      data: {
        metrics: {
          totalTrades,
          activeWorkflows,
          currencyExposure,
          activeContracts,
          pendingDocuments: pendingDocumentsCount,
        },
        recentTrades,
        upcomingContracts: allContracts,
        recentAlerts,
      },
    });
  } catch (error) {
    console.error('Dashboard Overview Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve dashboard overview metrics.',
    });
  }
};

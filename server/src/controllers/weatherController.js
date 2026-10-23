import prisma from '../config/db.js';

export const getWeatherForTrade = async (req, res) => {
  try {
    const { tradeId } = req.params;

    const trade = await prisma.tradeRequest.findFirst({
      where: { id: tradeId, userId: req.user.id },
      include: {
        weatherReports: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!trade) {
      return res.status(404).json({ success: false, error: 'Trade request not found.' });
    }

    const weather = trade.weatherReports[0] || null;

    return res.status(200).json({
      success: true,
      data: {
        tradeRef: trade.tradeRef,
        originPort: trade.originPort,
        destinationPort: trade.destinationPort,
        weather,
        isModelConnected: false,
        integrationStatus: 'Marine weather forecasting service integration is pending.',
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve weather reports.' });
  }
};

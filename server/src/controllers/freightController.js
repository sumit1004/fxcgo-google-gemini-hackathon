import prisma from '../config/db.js';

export const getFreightForTrade = async (req, res) => {
  try {
    const { tradeId } = req.params;

    const trade = await prisma.tradeRequest.findFirst({
      where: { id: tradeId, userId: req.user.id },
      include: {
        freightQuotes: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!trade) {
      return res.status(404).json({ success: false, error: 'Trade request not found.' });
    }

    const quote = trade.freightQuotes[0] || null;

    return res.status(200).json({
      success: true,
      data: {
        tradeRef: trade.tradeRef,
        cargoCategory: trade.cargoCategory,
        transportMode: trade.transportMode,
        maxFreightBudget: trade.maxFreightBudget,
        originPort: trade.originPort,
        destinationPort: trade.destinationPort,
        quote,
        isModelConnected: false,
        integrationStatus: 'Minimum freight fare optimization agent integration is pending.',
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve freight analysis.' });
  }
};

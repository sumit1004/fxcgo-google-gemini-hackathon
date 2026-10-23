import prisma from '../config/db.js';
import agent2Adapter from '../services/agent2Adapter.js';

// Standard coordinates dictionary for global trade ports (for clean Leaflet rendering)
const PORT_COORDINATES = {
  'JNPT, Mumbai': [18.9499, 72.9515],
  'Mumbai': [18.9499, 72.9515],
  'Nhava Sheva': [18.9499, 72.9515],
  'Chennai': [13.0827, 80.2707],
  'Mundra': [22.8396, 69.7042],
  'Kolkata': [22.5726, 88.3639],
  'Rotterdam': [51.9244, 4.4777],
  'Hamburg': [53.5511, 9.9937],
  'Antwerp': [51.2194, 4.4025],
  'Singapore': [1.3521, 103.8198],
  'Shanghai': [31.2304, 121.4737],
  'Dubai / Jebel Ali': [25.0113, 55.0612],
  'Los Angeles': [33.7432, -118.2673],
  'New York / New Jersey': [40.7128, -74.0060],
};

export const getRouteForTrade = async (req, res) => {
  try {
    const { tradeId } = req.params;

    const trade = await prisma.tradeRequest.findFirst({
      where: { id: tradeId, userId: req.user.id },
      include: {
        routeRecommendations: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!trade) {
      return res.status(404).json({ success: false, error: 'Trade request not found.' });
    }

    const route = trade.routeRecommendations[0] || null;

    // Resolve port coordinates for Leaflet map display
    const originCoords = PORT_COORDINATES[trade.originPort] || [18.95, 72.95];
    const destinationCoords = PORT_COORDINATES[trade.destinationPort] || [51.92, 4.47];

    return res.status(200).json({
      success: true,
      data: {
        tradeRef: trade.tradeRef,
        originPort: trade.originPort,
        originCountry: trade.originCountry,
        originCoords,
        destinationPort: trade.destinationPort,
        destinationCountry: trade.destinationCountry,
        destinationCoords,
        transportMode: trade.transportMode,
        route,
        isModelConnected: false,
        integrationStatus: 'Trade route optimization model integration is pending.',
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve trade route.' });
  }
};

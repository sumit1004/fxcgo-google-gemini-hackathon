import { Router } from 'express';
import prisma from '../config/db.js';
import agent1Adapter from '../services/agent1Adapter.js';
import agent2Adapter, { SUPPORTED_PORTS } from '../services/agent2Adapter.js';

const router = Router();

/**
 * GET /api/intelligence/supported-ports
 * Returns ports dynamically from Route service / configuration
 */
router.get('/supported-ports', async (req, res) => {
  try {
    const routeServiceUrl = process.env.ROUTE_SERVICE_URL || 'http://localhost:5001';
    let ports = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const upstream = await fetch(`${routeServiceUrl}/ports`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (upstream.ok) {
        const body = await upstream.json();
        ports = body.ports;
      }
    } catch (err) {
      // Use built-in ports configuration if upstream is offline
    }

    if (!ports) {
      ports = SUPPORTED_PORTS.map((name, idx) => ({
        name,
        country: ['Nhava Sheva', 'Mundra', 'Chennai'].includes(name) ? 'India' : (name === 'Colombo' ? 'Sri Lanka' : (name === 'Singapore' ? 'Singapore' : 'Australia')),
        id: idx + 1,
      }));
    }

    return res.status(200).json({
      success: true,
      data: {
        supportedPorts: ports,
        portNames: SUPPORTED_PORTS,
        supportedCurrencyPairs: ['USD/INR'],
        forecastHorizonDays: 20,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/intelligence/health
 * Returns service health information for:
 * - Master workflow
 * - Forex service
 * - Logistics service
 * - Database
 */
router.get('/health', async (req, res) => {
  const forexUrl = process.env.FOREX_SERVICE_URL || 'http://localhost:5002';
  const routeUrl = process.env.ROUTE_SERVICE_URL || 'http://localhost:5001';

  let dbHealthy = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbHealthy = true;
  } catch (err) {
    dbHealthy = false;
  }

  const forexHealthy = await agent1Adapter.isModelConnected();
  const routeHealthy = await agent2Adapter.isModelConnected();

  const isOverallHealthy = dbHealthy && forexHealthy && routeHealthy;

  return res.status(200).json({
    success: true,
    status: isOverallHealthy ? 'HEALTHY' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    services: {
      database: {
        status: dbHealthy ? 'ONLINE' : 'OFFLINE',
        type: 'MySQL 8 (Prisma ORM)',
      },
      forexService: {
        status: forexHealthy ? 'ONLINE' : 'OFFLINE',
        url: forexUrl,
        engine: 'LSTM + XGBoost Hybrid (USD/INR)',
      },
      logisticsService: {
        status: routeHealthy ? 'ONLINE' : 'OFFLINE',
        url: routeUrl,
        engine: 'NetworkX + SeaRoute + XGBoost Congestion & Freight',
      },
      masterWorkflow: {
        status: isOverallHealthy ? 'READY' : 'DEGRADED',
        orchestration: 'Sequential (Agent 1 Forex -> Agent 2 Logistics -> Unified Report)',
      },
    },
  });
});

export default router;

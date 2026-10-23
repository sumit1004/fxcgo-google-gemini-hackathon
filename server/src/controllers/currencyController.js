import prisma from '../config/db.js';
import agent1Adapter from '../services/agent1Adapter.js';

export const listForecasts = async (req, res) => {
  try {
    const forecasts = await prisma.currencyForecast.findMany({
      where: {
        tradeRequest: { userId: req.user.id },
      },
      include: {
        tradeRequest: {
          select: { tradeRef: true, exporterName: true, importerName: true, tradeAmount: true, expectedPaymentDate: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return res.status(200).json({ success: true, data: { forecasts } });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch currency forecasts.' });
  }
};

export const getForecastByTradeId = async (req, res) => {
  try {
    const { tradeId } = req.params;

    const trade = await prisma.tradeRequest.findFirst({
      where: { id: tradeId, userId: req.user.id },
      include: {
        currencyForecasts: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!trade) {
      return res.status(404).json({ success: false, error: 'Trade request not found.' });
    }

    const forecast = trade.currencyForecasts[0] || null;

    return res.status(200).json({
      success: true,
      data: {
        tradeRef: trade.tradeRef,
        currencyPair: trade.currencyPair,
        tradeAmount: trade.tradeAmount,
        expectedPaymentDate: trade.expectedPaymentDate,
        forecast,
        modelStatus: forecast ? forecast.status : 'PENDING',
        integrationNotice: (!forecast || forecast.status === 'PENDING')
          ? 'Currency forecasting model integration is pending.'
          : null,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve forecast.' });
  }
};

export const requestForecast = async (req, res) => {
  try {
    const { tradeId } = req.params;

    const trade = await prisma.tradeRequest.findFirst({
      where: { id: tradeId, userId: req.user.id },
    });

    if (!trade) {
      return res.status(404).json({ success: false, error: 'Trade request not found.' });
    }

    const result = await agent1Adapter.predict({
      currencyPair: trade.currencyPair,
      tradeAmount: trade.tradeAmount,
      expectedPaymentDate: trade.expectedPaymentDate,
      historicalDataPeriod: trade.historicalDataPeriod,
      riskTolerance: trade.riskTolerance,
    });

    const forecast = await prisma.currencyForecast.create({
      data: {
        tradeRequestId: trade.id,
        currencyPair: trade.currencyPair,
        horizonDays: 20,
        status: result.status,
        recommendation: result.message || 'Forecast analysis pending trained model connection.',
        modelVersion: result.modelVersion || null,
        predictionTimestamp: result.predictionTimestamp ? new Date(result.predictionTimestamp) : null,
      },
    });

    return res.status(200).json({
      success: true,
      message: result.message,
      data: { forecast, result },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

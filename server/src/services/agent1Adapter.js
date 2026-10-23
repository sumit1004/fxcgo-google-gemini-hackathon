/**
 * AGENT 1 — CURRENCY RISK & FORWARD CONTRACT INTELLIGENCE ADAPTER
 * 
 * Communicates with the Python Forex service running the trained LSTM + XGBoost models
 * on Yahoo Finance live currency data (INR=X / USD/INR).
 */

export class Agent1CurrencyForecastAdapter {
  constructor() {
    this.serviceUrl = process.env.FOREX_SERVICE_URL || process.env.AGENT_1_SERVICE_URL || 'http://localhost:5002';
    this.modelVersion = 'FXCGO-LSTM-XGBOOST-HYBRID-v1.0';
  }

  /**
   * Health check for Forex service
   */
  async isModelConnected() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`${this.serviceUrl}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      return res.ok;
    } catch (err) {
      return false;
    }
  }

  /**
   * Execute 20-day currency forecast
   * @param {Object} input - { currencyPair, tradeAmount, expectedPaymentDate }
   */
  async predict(input) {
    const rawPair = (input.currencyPair || '').trim().toUpperCase();

    // Model validation: currently strictly supports USD/INR (INR=X)
    const validPairs = ['USD/INR', 'USDINR', 'INR=X'];
    if (!validPairs.includes(rawPair)) {
      return {
        success: false,
        isModelConnected: true,
        status: 'VALIDATION_ERROR',
        error: `Unsupported currency pair '${input.currencyPair}'. The trained Forex AI model currently supports USD/INR (ticker INR=X) for 20-business-day forecasting. Please select USD/INR.`,
        message: `Validation Failed: Only USD/INR is supported by the Forex model.`,
      };
    }

    const isAvailable = await this.isModelConnected();
    if (!isAvailable) {
      return {
        success: false,
        isModelConnected: false,
        status: 'SERVICE_UNAVAILABLE',
        error: `Forex service is unavailable at ${this.serviceUrl}. Ensure the Forex AI engine is running on port 5002.`,
        message: 'Forex service unavailable. Could not connect to AI prediction service.',
      };
    }

    try {
      // Call actual GET /predict endpoint on Forex service
      const res = await fetch(`${this.serviceUrl}/predict?ticker=INR=X`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.message || `Forex service returned status ${res.status}`);
      }

      const modelData = await res.json();

      if (modelData.status !== 'success') {
        throw new Error(modelData.message || 'Forex service failed to generate forecast.');
      }

      const currentPrice = modelData.current_price;
      const forecast = modelData.forecast || [];

      if (!forecast.length) {
        throw new Error('Forex model returned an empty forecast sequence.');
      }

      const prices = forecast.map((f) => f.predicted_price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      const finalPrice = prices[prices.length - 1];
      const priceDelta = finalPrice - currentPrice;
      const changePct = ((priceDelta) / currentPrice) * 100;

      // Quantitative risk indicators directly from model outputs
      const volatilitySpread = maxPrice - minPrice;
      const volatilityPercent = (volatilitySpread / currentPrice) * 100;

      let trend = 'NEUTRAL';
      if (changePct > 0.4) trend = 'BULLISH'; // USD strengthening against INR
      else if (changePct < -0.4) trend = 'BEARISH'; // USD weakening against INR

      // Trade currency exposure calculation (USD tradeAmount converted to INR)
      const tradeAmountNum = parseFloat(input.tradeAmount) || 0;
      const currentExposureINR = tradeAmountNum * currentPrice;
      const projectedExposureINR = tradeAmountNum * finalPrice;
      const potentialVarianceINR = projectedExposureINR - currentExposureINR;

      // Forward-contract decision support logic based strictly on actual forecast direction
      let forwardContractAdvice = '';
      if (trend === 'BULLISH') {
        forwardContractAdvice = `The model projects USD appreciation (+${changePct.toFixed(2)}%) over the 20-business-day horizon. For Indian importers paying in USD, locking in a forward contract rate or hedging currency risk now may protect against higher procurement costs. For exporters receiving USD, unhedged or partial hedge positioning captures potential upside.`;
      } else if (trend === 'BEARISH') {
        forwardContractAdvice = `The model projects USD depreciation (${changePct.toFixed(2)}%) over the 20-business-day horizon. For Indian exporters receiving USD, securing a forward contract now may lock in higher revenue before rupee strengthening. For importers, spot purchases near maturity may be advantageous.`;
      } else {
        forwardContractAdvice = `The model projects relatively stable exchange rates (variance within ±${Math.abs(changePct).toFixed(2)}%) across the 20-business-day forecast horizon. Standard treasury hedging guidelines apply.`;
      }

      return {
        success: true,
        isModelConnected: true,
        status: 'COMPLETED',
        modelVersion: this.modelVersion,
        predictionTimestamp: new Date().toISOString(),
        currencyPair: 'USD/INR',
        currentPrice,
        forecast,
        metrics: {
          currentPrice,
          minPrice: Number(minPrice.toFixed(4)),
          maxPrice: Number(maxPrice.toFixed(4)),
          averagePrice: Number(avgPrice.toFixed(4)),
          finalPrice: Number(finalPrice.toFixed(4)),
          projectedChangePct: Number(changePct.toFixed(2)),
          volatilitySpread: Number(volatilitySpread.toFixed(4)),
          volatilityPercent: Number(volatilityPercent.toFixed(2)),
          trend,
        },
        exposureAnalysis: {
          tradeAmountUSD: tradeAmountNum,
          currentValueINR: Number(currentExposureINR.toFixed(2)),
          projectedValueINR: Number(projectedExposureINR.toFixed(2)),
          potentialVarianceINR: Number(potentialVarianceINR.toFixed(2)),
        },
        decisionSupport: {
          recommendation: forwardContractAdvice,
          disclaimer: 'This recommendation is non-binding decision support derived from the LSTM-XGBoost machine learning model. No forward contract has been executed. Contract execution requires arrangement through your authorized dealer bank or treasury provider.',
        },
      };
    } catch (error) {
      return {
        success: false,
        isModelConnected: true,
        status: 'FAILED',
        error: error.message,
        message: `Agent 1 execution failed: ${error.message}`,
      };
    }
  }
}

export default new Agent1CurrencyForecastAdapter();

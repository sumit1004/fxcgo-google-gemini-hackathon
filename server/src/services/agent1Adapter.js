/**
 * AGENT 1 — FORWARD CONTRACT CURRENCY FORECAST AGENT ADAPTER
 * 
 * This adapter defines the official integration boundary for the trained
 * 20-day currency forecasting ML model / FastAPI service.
 * 
 * The model will be plugged in via environment variables:
 * - AGENT_1_SERVICE_URL (e.g. http://localhost:8000/predict)
 * - AGENT_1_API_KEY
 * 
 * When the model service is not yet connected, it returns a pending integration
 * status without fabricating fake forecast data.
 */

export class Agent1CurrencyForecastAdapter {
  constructor() {
    this.serviceUrl = process.env.AGENT_1_SERVICE_URL || null;
    this.apiKey = process.env.AGENT_1_API_KEY || null;
    this.modelVersion = 'FXCGO-LSTM-CURRENCY-v1.0 (Trained)';
  }

  /**
   * Check if the trained Agent 1 model is connected and accessible
   */
  async isModelConnected() {
    if (!this.serviceUrl) return false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${this.serviceUrl}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      return res.ok;
    } catch (err) {
      return false;
    }
  }

  /**
   * Execute 20-day forecasting on the trained model
   * @param {Object} input - { currencyPair, tradeAmount, expectedPaymentDate, historicalDataPeriod, riskTolerance }
   */
  async predict(input) {
    const isAvailable = await this.isModelConnected();

    if (!isAvailable) {
      return {
        success: false,
        isModelConnected: false,
        status: 'PENDING',
        message: 'Currency forecasting model integration is pending.',
        inputPayload: {
          currencyPair: input.currencyPair,
          tradeAmount: input.tradeAmount,
          expectedPaymentDate: input.expectedPaymentDate,
          historicalDataPeriod: input.historicalDataPeriod || '90_DAYS',
          requestedAt: new Date().toISOString(),
        },
        forecast: null,
      };
    }

    // Call the external trained model endpoint once integrated
    try {
      const response = await fetch(`${this.serviceUrl}/api/v1/forecast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error(`Agent 1 service error: ${response.statusText}`);
      }

      const output = await response.json();
      return {
        success: true,
        isModelConnected: true,
        status: 'COMPLETED',
        modelVersion: this.modelVersion,
        predictionTimestamp: new Date().toISOString(),
        forecast: output, // 20-day curve, trend, recommended rate
      };
    } catch (error) {
      return {
        success: false,
        isModelConnected: false,
        status: 'FAILED',
        error: error.message,
        message: 'Agent 1 execution failed. Model adapter caught communication error.',
      };
    }
  }
}

export default new Agent1CurrencyForecastAdapter();

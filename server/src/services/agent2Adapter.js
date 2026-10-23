/**
 * AGENT 2 — UNIFIED LOGISTICS INTELLIGENCE ADAPTER
 * 
 * Communicates with the Python Route Engine running NetworkX, SeaRoute nautical
 * geometries, XGBoost congestion, XGBoost freight, and Open-Meteo marine weather.
 * Also generates a rule-based international trade documentation checklist.
 */

// Supported ports verified in route service base graph
export const SUPPORTED_PORTS = [
  'Nhava Sheva',
  'Mundra',
  'Chennai',
  'Colombo',
  'Singapore',
  'Fremantle',
  'Melbourne',
  'Sydney',
];

/**
 * Generate configurable, rule-based documentation checklist based on trade parameters.
 * Clearly designated as rule-based regulatory decision support.
 */
export function generateDocumentationChecklist(tradeData) {
  const origin = (tradeData.originCountry || '').toUpperCase();
  const dest = (tradeData.destinationCountry || '').toUpperCase();
  const cargo = (tradeData.cargoCategory || '').toUpperCase();
  const tradeType = (tradeData.tradeType || 'EXPORT').toUpperCase();
  const hsCode = (tradeData.hsCode || '').trim();

  const documents = [
    {
      id: 'doc-ci',
      name: 'Commercial Invoice',
      category: 'COMMERCIAL',
      documentType: 'COMMERCIAL_INVOICE',
      isMandatory: true,
      description: 'Itemized invoice specifying exporter, consignee, terms of delivery (Incoterms 2020), currency, unit prices, and total value.',
      issuingBody: 'Exporter / Shipper',
      status: 'REQUIRED',
    },
    {
      id: 'doc-pl',
      name: 'Packing List',
      category: 'LOGISTICS',
      documentType: 'PACKING_LIST',
      isMandatory: true,
      description: 'Detailed inventory of cargo packages, gross/net weights, dimensions, container markings, and carton counts.',
      issuingBody: 'Exporter / Freight Forwarder',
      status: 'REQUIRED',
    },
    {
      id: 'doc-bl',
      name: 'Ocean Bill of Lading (B/L)',
      category: 'TRANSPORT',
      documentType: 'BILL_OF_LADING',
      isMandatory: true,
      description: 'Official negotiable or non-negotiable maritime carrier transport document serving as title of goods and freight receipt.',
      issuingBody: 'Ocean Shipping Line / Master Carrier',
      status: 'REQUIRED',
    },
    {
      id: 'doc-coo',
      name: 'Certificate of Origin (COO)',
      category: 'CUSTOMS',
      documentType: 'CERTIFICATE_OF_ORIGIN',
      isMandatory: origin.includes('INDIA') || dest.includes('INDIA') || dest.includes('AUSTRALIA'),
      description: 'Certifies manufacture origin under preferential or non-preferential trade pacts (e.g. AI-ECTA, ASEAN-India FTA).',
      issuingBody: 'Chamber of Commerce / Export Promotion Council',
      status: 'REQUIRED',
    },
    {
      id: 'doc-ins',
      name: 'Marine Cargo Insurance Policy / Certificate',
      category: 'FINANCIAL',
      documentType: 'INSURANCE_CERTIFICATE',
      isMandatory: true,
      description: 'Institute Cargo Clauses (ICC-A / ICC-B / ICC-C) marine transit risk indemnity certificate.',
      issuingBody: 'Underwriter / Marine Insurer',
      status: 'REQUIRED',
    },
    {
      id: 'doc-sb',
      name: tradeType === 'EXPORT' ? 'Shipping Bill / Export Declaration' : 'Bill of Entry / Import Declaration',
      category: 'CUSTOMS',
      documentType: 'CUSTOMS_DECLARATION',
      isMandatory: true,
      description: tradeType === 'EXPORT'
        ? 'Customs clearance document submitted through ICEGATE / port customs.'
        : 'Formal entry documentation for assessment of import customs duty and IGST.',
      issuingBody: 'Customs Broker / National Customs Authority',
      status: 'REQUIRED',
    },
  ];

  // Specific rule-based additions
  if (cargo.includes('AGRICULTURE') || cargo.includes('FOOD') || cargo.includes('PERISHABLE')) {
    documents.push({
      id: 'doc-phyto',
      name: 'Phytosanitary / Quarantine Inspection Certificate',
      category: 'REGULATORY',
      documentType: 'OTHER',
      isMandatory: true,
      description: 'Biosecurity declaration certifying commodity is pest-free according to importing nation sanitary standards.',
      issuingBody: 'National Plant Protection Organization / Ministry of Agriculture',
      status: 'REQUIRED',
    });
  }

  if (cargo.includes('CHEMICAL') || cargo.includes('HAZARDOUS') || cargo.includes('BATTERY')) {
    documents.push({
      id: 'doc-msds',
      name: 'Material Safety Data Sheet (MSDS) & DG Declaration',
      category: 'SAFETY',
      documentType: 'OTHER',
      isMandatory: true,
      description: 'IMO IMDG code hazardous classification, Flashpoint, and emergency response guide.',
      issuingBody: 'Manufacturer / Certified Chemical Testing Lab',
      status: 'REQUIRED',
    });
  }

  if (hsCode) {
    documents.push({
      id: 'doc-hstariff',
      name: `Customs Tariff Classification Record (HS Code: ${hsCode})`,
      category: 'CUSTOMS',
      documentType: 'OTHER',
      isMandatory: false,
      description: `Specific tariff classification supporting scheduled duty rates for tariff heading ${hsCode}.`,
      issuingBody: 'Authorized Customs Broker',
      status: 'REQUIRED',
    });
  }

  return {
    source: 'Rule-Based Compliance Engine v1.0',
    disclaimer: 'This documentation checklist is generated by a rule-based decision support system based on trade direction, ports, cargo category, and Incoterms. It does not replace statutory customs verification.',
    totalDocuments: documents.length,
    mandatoryCount: documents.filter((d) => d.isMandatory).length,
    checklist: documents,
  };
}

export class Agent2TradeOptimizationAdapter {
  constructor() {
    this.serviceUrl = process.env.ROUTE_SERVICE_URL || process.env.AGENT_2_SERVICE_URL || 'http://localhost:5001';
    this.version = 'FXCGO-SEAROUTE-XGBOOST-LOGISTICS-v1.0';
  }

  /**
   * Health check for Logistics Route service
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
   * Execute unified logistics intelligence suite
   * @param {Object} tradeData - Details of trade request
   * @param {Object} agent1Result - Currency forecast output from Agent 1
   */
  async optimize(tradeData, agent1Result) {
    const originPort = (tradeData.originPort || '').trim();
    const destPort = (tradeData.destinationPort || '').trim();

    // Port validation against actual model capabilities
    if (!SUPPORTED_PORTS.includes(originPort) || !SUPPORTED_PORTS.includes(destPort)) {
      return {
        success: false,
        isModelConnected: true,
        status: 'VALIDATION_ERROR',
        error: `Invalid port specified. Origin '${originPort}' and Destination '${destPort}' must be chosen from the supported maritime corridor ports: ${SUPPORTED_PORTS.join(', ')}.`,
        message: 'Port validation failed: Selected port is not in the AI maritime model network.',
      };
    }

    if (originPort === destPort) {
      return {
        success: false,
        isModelConnected: true,
        status: 'VALIDATION_ERROR',
        error: 'Origin port and Destination port cannot be the same.',
        message: 'Port validation failed: Same origin and destination.',
      };
    }

    const isAvailable = await this.isModelConnected();
    if (!isAvailable) {
      return {
        success: false,
        isModelConnected: false,
        status: 'SERVICE_UNAVAILABLE',
        error: `Logistics Route service is unavailable at ${this.serviceUrl}. Ensure the Route AI engine is running on port 5001.`,
        message: 'Logistics service unavailable. Could not connect to AI logistics engine.',
      };
    }

    try {
      const url = `${this.serviceUrl}/optimize?origin=${encodeURIComponent(originPort)}&destination=${encodeURIComponent(destPort)}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.error || `Route service returned status ${res.status}`);
      }

      const routeData = await res.json();
      if (routeData.status !== 'success') {
        throw new Error(routeData.error || 'Route service failed to compute logistics plan.');
      }

      const rec = routeData.recommendation || {};
      const forecastComparison = routeData.forecast_comparison || [];

      // Generate rule-based compliance documentation
      const docChecklist = generateDocumentationChecklist(tradeData);

      // Consolidate complete unified logistics result
      const logisticsResult = {
        routeOptimization: {
          optimalRoute: rec.optimal_route || [],
          alternativeRoute: rec.alternative_route || null,
          optimalDepartureDate: rec.optimal_departure_date,
          optimalDistanceNm: rec.optimal_distance_nm,
          optimizationGains: rec.optimization_gains || { distance_efficiency_percent: 0, congestion_avoided_percent: 0 },
          mapData: rec.map_data || { optimal_path_segments: [], alternative_path_segments: [] },
        },
        marineWeather: {
          departureWaveM: rec.marine_weather?.departure_wave_m,
          departureWindKmh: rec.marine_weather?.departure_wind_kmh,
          isLiveData: rec.marine_weather?.is_live_data ?? true,
          dataSource: rec.marine_weather?.source || 'Open-Meteo Marine API',
          forecastComparison,
        },
        freightCost: {
          estimatedFreightUSD: rec.estimated_freight_usd,
          currency: 'USD',
          estimatedDelayDays: rec.estimated_delay_days,
          optimalDepartureDate: rec.optimal_departure_date,
          benchmarkDisclaimers: rec.disclaimer,
        },
        documentation: docChecklist,
      };

      return {
        success: true,
        isModelConnected: true,
        status: 'COMPLETED',
        version: this.version,
        timestamp: new Date().toISOString(),
        data: logisticsResult,
      };
    } catch (error) {
      return {
        success: false,
        isModelConnected: true,
        status: 'FAILED',
        error: error.message,
        message: `Agent 2 execution failed: ${error.message}`,
      };
    }
  }
}

export default new Agent2TradeOptimizationAdapter();

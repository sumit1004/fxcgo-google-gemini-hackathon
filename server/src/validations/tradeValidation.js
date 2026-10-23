import { z } from 'zod';

export const createTradeSchema = z.object({
  body: z.object({
    // Form fields from CreateTradePage
    commodity: z.string().optional(),
    tradeValue: z.union([z.number(), z.string()]).optional(),
    currency: z.string().optional(),
    incoterms: z.string().optional(),
    transitMode: z.string().optional(),
    targetDeliveryDate: z.string().optional(),
    notes: z.string().optional().nullable(),
    status: z.string().optional(),

    // Detailed backend fields
    tradeType: z.enum(['EXPORT', 'IMPORT']).optional().default('EXPORT'),
    exporterName: z.string().optional(),
    importerName: z.string().optional(),
    businessCountry: z.string().optional(),
    currencyPair: z.string().optional(),
    tradeAmount: z.union([z.number(), z.string()]).optional(),
    expectedPaymentDate: z.string().optional(),
    historicalDataPeriod: z.string().optional().default('90_DAYS'),
    currencyExposure: z.union([z.number(), z.string()]).optional().nullable(),
    cargoCategory: z.string().optional(),
    cargoDescription: z.string().optional(),
    shipmentValue: z.union([z.number(), z.string()]).optional(),
    originCountry: z.string().optional(),
    originPort: z.string().optional(),
    destinationCountry: z.string().optional(),
    destinationPort: z.string().optional(),
    transportMode: z.string().optional().default('OCEAN'),
    expectedShipmentDate: z.string().optional(),
    preferredRoute: z.string().optional().nullable(),
    maxFreightBudget: z.union([z.number(), z.string()]).optional().nullable(),
    riskTolerance: z.string().optional().default('MEDIUM'),
    additionalNotes: z.string().optional().nullable(),
    isDraft: z.boolean().optional().default(false),
  }),
});

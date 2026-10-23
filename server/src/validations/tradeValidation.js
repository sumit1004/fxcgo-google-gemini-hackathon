import { z } from 'zod';
import { SUPPORTED_PORTS } from '../services/agent2Adapter.js';

export const createTradeSchema = z.object({
  body: z.object({
    // Trade Request Name / Commodity
    tradeName: z.string().optional(),
    cargoDescription: z.string().optional(),
    commodity: z.string().optional(),

    // Direction
    tradeType: z.enum(['EXPORT', 'IMPORT']).optional().default('EXPORT'),

    // Origin and Destination Ports
    originPort: z.string().min(1, 'Origin port is required').refine(
      (port) => SUPPORTED_PORTS.includes(port.trim()),
      (port) => ({ message: `Origin port '${port}' is not supported. Supported ports are: ${SUPPORTED_PORTS.join(', ')}` })
    ),
    destinationPort: z.string().min(1, 'Destination port is required').refine(
      (port) => SUPPORTED_PORTS.includes(port.trim()),
      (port) => ({ message: `Destination port '${port}' is not supported. Supported ports are: ${SUPPORTED_PORTS.join(', ')}` })
    ),

    // Currency Pair: strictly restricted to supported model capabilities (USD/INR)
    currencyPair: z.string().optional().default('USD/INR').refine(
      (val) => ['USD/INR', 'USDINR', 'INR=X'].includes((val || '').toUpperCase().trim()),
      { message: 'The Forex AI forecasting model currently strictly supports USD/INR (INR=X). Please select USD/INR.' }
    ),

    // Trade Amount: positive numeric validation
    tradeAmount: z.union([z.number(), z.string()]).refine(
      (val) => {
        const num = Number(val);
        return !isNaN(num) && num > 0;
      },
      { message: 'Trade amount must be a positive number greater than zero.' }
    ),

    tradeAmountCurrency: z.string().optional().default('USD'),
    currency: z.string().optional().default('USD'),

    // Shipment Date / Payment Date
    expectedShipmentDate: z.string().optional(),
    expectedPaymentDate: z.string().optional(),
    targetDeliveryDate: z.string().optional(),

    // Exporter & Importer Names
    exporterName: z.string().optional(),
    importerName: z.string().optional(),
    businessCountry: z.string().optional(),
    originCountry: z.string().optional(),
    destinationCountry: z.string().optional(),

    // Optional logistics fields
    cargoCategory: z.string().optional().default('General Cargo'),
    hsCode: z.string().optional().nullable(),
    containerType: z.string().optional().nullable(),
    containerQuantity: z.union([z.number(), z.string()]).optional().nullable(),
    shipmentWeight: z.union([z.number(), z.string()]).optional().nullable(),
    shipmentVolume: z.union([z.number(), z.string()]).optional().nullable(),
    additionalNotes: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    isDraft: z.boolean().optional().default(false),
  }).refine((data) => data.originPort !== data.destinationPort, {
    message: 'Origin port and Destination port cannot be the same.',
    path: ['destinationPort'],
  }),
});

export const validateTradeCreation = async (req, res, next) => {
  try {
    const result = await createTradeSchema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    req.body = result.body;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fieldErrors = {};
      error.errors.forEach((err) => {
        const path = err.path.slice(1).join('.');
        fieldErrors[path || 'general'] = err.message;
      });
      return res.status(400).json({
        success: false,
        error: 'Trade request validation failed.',
        fieldErrors,
        message: error.errors[0]?.message || 'Invalid trade request parameters.',
      });
    }
    return res.status(400).json({ success: false, error: error.message });
  }
};

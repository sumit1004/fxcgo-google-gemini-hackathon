import fs from 'fs';
import path from 'path';
import prisma from '../config/db.js';
import { logAudit } from '../middleware/audit.js';

export const listDocuments = async (req, res) => {
  try {
    const { tradeId } = req.query;

    const where = {
      userId: req.user.id,
      ...(tradeId && { tradeRequestId: tradeId }),
    };

    const documents = await prisma.tradeDocument.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
      include: {
        tradeRequest: { select: { tradeRef: true, exporterName: true, importerName: true } },
      },
    });

    return res.status(200).json({ success: true, data: { documents } });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve trade documents.' });
  }
};

export const getChecklist = async (req, res) => {
  try {
    const { tradeId } = req.params;

    const trade = await prisma.tradeRequest.findFirst({
      where: { id: tradeId, userId: req.user.id },
      include: {
        documentChecklists: true,
        tradeDocuments: true,
      },
    });

    if (!trade) {
      return res.status(404).json({ success: false, error: 'Trade request not found.' });
    }

    return res.status(200).json({
      success: true,
      data: {
        tradeRef: trade.tradeRef,
        checklists: trade.documentChecklists,
        documents: trade.tradeDocuments,
        agentNotice: 'Trade documentation recommendation agent integration is pending.',
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch document checklist.' });
  }
};

export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No document file provided.' });
    }

    const { tradeRequestId, documentType, issuingAuthority, notes } = req.body;

    if (!tradeRequestId || !documentType) {
      // Clean up uploaded file if missing required metadata
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: 'Trade Request ID and Document Type are required.',
      });
    }

    const trade = await prisma.tradeRequest.findFirst({
      where: { id: tradeRequestId, userId: req.user.id },
    });

    if (!trade) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, error: 'Associated trade request not found.' });
    }

    const doc = await prisma.tradeDocument.create({
      data: {
        tradeRequestId,
        userId: req.user.id,
        documentType,
        fileName: req.file.filename,
        originalName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        documentStatus: 'UPLOADED',
        issuingAuthority: issuingAuthority ? issuingAuthority.trim() : null,
        notes: notes ? notes.trim() : null,
      },
    });

    // Mark matching checklist item as uploaded
    await prisma.documentChecklist.updateMany({
      where: { tradeRequestId, documentType },
      data: { isUploaded: true },
    });

    await logAudit({
      userId: req.user.id,
      action: 'DOCUMENT_UPLOAD',
      entityType: 'DOCUMENT',
      entityId: doc.id,
      details: { documentType, fileName: doc.originalName, tradeRef: trade.tradeRef },
      req,
    });

    return res.status(201).json({
      success: true,
      message: 'Document securely uploaded and linked to trade checklist.',
      data: { document: doc },
    });
  } catch (error) {
    console.error('Upload Error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ success: false, error: 'Failed to upload trade document.' });
  }
};

export const downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const doc = await prisma.tradeDocument.findFirst({
      where: { id, userId: req.user.id }, // Ownership enforcement
    });

    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found or unauthorized.' });
    }

    if (!fs.existsSync(doc.filePath)) {
      return res.status(404).json({ success: false, error: 'File does not exist on storage.' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.originalName)}"`);
    res.setHeader('Content-Type', doc.mimeType);

    const fileStream = fs.createReadStream(doc.filePath);
    fileStream.pipe(res);
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to download document.' });
  }
};

export const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const doc = await prisma.tradeDocument.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found.' });
    }

    if (fs.existsSync(doc.filePath)) {
      fs.unlinkSync(doc.filePath);
    }

    await prisma.tradeDocument.delete({ where: { id } });

    await logAudit({
      userId: req.user.id,
      action: 'DOCUMENT_DELETE',
      entityType: 'DOCUMENT',
      entityId: id,
      req,
    });

    return res.status(200).json({ success: true, message: 'Document removed.' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to delete document.' });
  }
};

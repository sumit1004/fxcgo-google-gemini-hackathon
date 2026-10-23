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
        tradeDocuments: { orderBy: { uploadedAt: 'desc' } },
      },
    });

    if (!trade) {
      return res.status(404).json({ success: false, error: 'Trade request not found.' });
    }

    // Real-time dynamic generation if no checklist records exist yet
    if (!trade.documentChecklists || trade.documentChecklists.length === 0) {
      const { generateDocumentationChecklist } = await import('../services/agent2Adapter.js');
      const generated = generateDocumentationChecklist(trade);
      for (const item of (generated.checklist || [])) {
        await prisma.documentChecklist.create({
          data: {
            tradeRequestId: trade.id,
            documentName: item.name,
            documentType: item.documentType || 'OTHER',
            isMandatory: !!item.isMandatory,
            isUploaded: false,
            verified: false,
          },
        });
      }
      trade.documentChecklists = await prisma.documentChecklist.findMany({
        where: { tradeRequestId: trade.id },
      });
    }

    // Synchronize isUploaded and verified with actual uploaded documents in real time
    const uploadedDocsByType = {};
    for (const doc of (trade.tradeDocuments || [])) {
      if (!uploadedDocsByType[doc.documentType]) {
        uploadedDocsByType[doc.documentType] = [];
      }
      uploadedDocsByType[doc.documentType].push(doc);
    }

    const liveChecklists = trade.documentChecklists.map((item) => {
      const uploaded = uploadedDocsByType[item.documentType] || [];
      const hasUpload = uploaded.length > 0;
      return {
        ...item,
        isUploaded: hasUpload,
        verified: hasUpload,
        uploadedCount: uploaded.length,
        latestUpload: hasUpload ? {
          id: uploaded[0].id,
          originalName: uploaded[0].originalName,
          fileSize: uploaded[0].fileSize,
          uploadedAt: uploaded[0].uploadedAt,
        } : null,
      };
    });

    const mandatoryTotal = liveChecklists.filter((c) => c.isMandatory).length;
    const mandatoryCompleted = liveChecklists.filter((c) => c.isMandatory && c.isUploaded).length;

    return res.status(200).json({
      success: true,
      data: {
        tradeRef: trade.tradeRef,
        tradeName: trade.cargoDescription || `${trade.originPort} → ${trade.destinationPort}`,
        corridor: `${trade.originPort} (${trade.originCountry || 'India'}) → ${trade.destinationPort} (${trade.destinationCountry || 'Destination'})`,
        checklists: liveChecklists,
        documents: trade.tradeDocuments,
        mandatoryTotal,
        mandatoryCompleted,
        complianceScore: mandatoryTotal > 0 ? Math.round((mandatoryCompleted / mandatoryTotal) * 100) : 100,
        agentNotice: 'Real-time rule-based trade documentation & compliance checklist active.',
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch document checklist.' });
  }
};

export const syncChecklist = async (req, res) => {
  try {
    const { tradeId } = req.params;
    const trade = await prisma.tradeRequest.findFirst({
      where: { id: tradeId, userId: req.user.id },
      include: { tradeDocuments: true },
    });
    if (!trade) {
      return res.status(404).json({ success: false, error: 'Trade request not found.' });
    }

    const { generateDocumentationChecklist } = await import('../services/agent2Adapter.js');
    const generated = generateDocumentationChecklist(trade);

    await prisma.documentChecklist.deleteMany({ where: { tradeRequestId: trade.id } });
    const uploadedTypes = new Set(trade.tradeDocuments.map((d) => d.documentType));

    for (const item of (generated.checklist || [])) {
      const isUp = uploadedTypes.has(item.documentType);
      await prisma.documentChecklist.create({
        data: {
          tradeRequestId: trade.id,
          documentName: item.name,
          documentType: item.documentType || 'OTHER',
          isMandatory: !!item.isMandatory,
          isUploaded: isUp,
          verified: isUp,
        },
      });
    }

    const fresh = await prisma.documentChecklist.findMany({
      where: { tradeRequestId: trade.id },
    });

    return res.status(200).json({
      success: true,
      message: 'Corridor checklist synchronized in real-time.',
      data: { checklists: fresh },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to sync checklist.' });
  }
};

export const uploadDocument = async (req, res) => {
  try {
    const uploadedFile = req.file || (req.files && (req.files.file?.[0] || req.files.document?.[0] || req.files[0]));

    if (!uploadedFile) {
      return res.status(400).json({ success: false, error: 'No document file provided.' });
    }

    const tradeRequestId = req.body.tradeRequestId || req.body.tradeId;
    const documentType = req.body.documentType || req.body.docType || 'COMMERCIAL_INVOICE';
    const issuingAuthority = req.body.issuingAuthority;
    const notes = req.body.notes;

    if (!tradeRequestId) {
      if (fs.existsSync(uploadedFile.path)) fs.unlinkSync(uploadedFile.path);
      return res.status(400).json({
        success: false,
        error: 'Trade Request ID is required.',
      });
    }

    const trade = await prisma.tradeRequest.findFirst({
      where: { id: tradeRequestId, userId: req.user.id },
    });

    if (!trade) {
      if (fs.existsSync(uploadedFile.path)) fs.unlinkSync(uploadedFile.path);
      return res.status(404).json({ success: false, error: 'Associated trade request not found.' });
    }

    const doc = await prisma.tradeDocument.create({
      data: {
        tradeRequestId,
        userId: req.user.id,
        documentType,
        fileName: uploadedFile.filename,
        originalName: uploadedFile.originalname,
        filePath: uploadedFile.path,
        fileSize: uploadedFile.size,
        mimeType: uploadedFile.mimetype,
        documentStatus: 'UPLOADED',
        issuingAuthority: issuingAuthority ? issuingAuthority.trim() : null,
        notes: notes ? notes.trim() : null,
      },
    });

    // Mark matching checklist item as uploaded & verified
    await prisma.documentChecklist.updateMany({
      where: { tradeRequestId, documentType },
      data: { isUploaded: true, verified: true },
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

    const tradeRequestId = doc.tradeRequestId;
    const documentType = doc.documentType;

    await prisma.tradeDocument.delete({ where: { id } });

    // Check if other documents of this type still exist
    const remainingCount = await prisma.tradeDocument.count({
      where: { tradeRequestId, documentType },
    });

    if (remainingCount === 0) {
      await prisma.documentChecklist.updateMany({
        where: { tradeRequestId, documentType },
        data: { isUploaded: false, verified: false },
      });
    }

    await logAudit({
      userId: req.user.id,
      action: 'DOCUMENT_DELETE',
      entityType: 'DOCUMENT',
      entityId: id,
      req,
    });

    return res.status(200).json({ success: true, message: 'Document removed from vault.' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to delete document.' });
  }
};

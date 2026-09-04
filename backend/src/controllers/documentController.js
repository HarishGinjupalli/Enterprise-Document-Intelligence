import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/index.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  createDocument,
  getDocumentById,
  listDocuments,
  deleteDocument,
  enqueueIngestion,
} from '../services/documentService.js';
import { userHasDocumentAccess } from '../services/userService.js';

const uploadDir = config.upload.uploadDir;
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxFileSizeMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new AppError('Only PDF files are allowed', 400, 'INVALID_FILE_TYPE'));
    }
    cb(null, true);
  },
});

export const uploadMiddleware = upload.single('file');

export async function uploadDocument(req, res, next) {
  try {
    if (!req.file) throw new AppError('No file uploaded', 400, 'NO_FILE');

    const title = req.body.title || req.file.originalname.replace('.pdf', '');
    const metadata = {
      documentType: req.body.documentType || null,
      department: req.body.department || null,
      author: req.body.author || null,
      tags: req.body.tags ? JSON.parse(req.body.tags) : null,
    };

    const doc = await createDocument({
      ownerId: req.user.id,
      title,
      filename: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      metadata,
    });

    enqueueIngestion(doc.id, {
      chunkingStrategy: req.body.chunkingStrategy || 'overlapping',
      chunkSize: parseInt(req.body.chunkSize || '512', 10),
      chunkOverlap: parseInt(req.body.chunkOverlap || '64', 10),
    });

    res.status(201).json({ success: true, data: { document: doc } });
  } catch (err) {
    next(err);
  }
}

export async function getDocuments(req, res, next) {
  try {
    const { page, limit, status, search } = req.query;
    const result = await listDocuments(req.user.id, {
      page: parseInt(page || '1', 10),
      limit: parseInt(limit || '20', 10),
      status,
      search,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function downloadDocument(req, res, next) {
  try {
    const doc = await getDocumentById(req.params.id);
    if (!doc) throw new AppError('Document not found', 404, 'NOT_FOUND');
    const hasAccess = await userHasDocumentAccess(req.user.id, doc.id);
    if (!hasAccess) throw new AppError('Access denied', 403, 'FORBIDDEN');
    res.sendFile(path.resolve(doc.file_path), { headers: { 'Content-Type': 'application/pdf' } }, (err) => {
      if (err && !res.headersSent) next(err);
    });
  } catch (err) {
    next(err);
  }
}

export async function getDocument(req, res, next) {
  try {
    const doc = await getDocumentById(req.params.id);
    if (!doc) throw new AppError('Document not found', 404, 'NOT_FOUND');

    const hasAccess = await userHasDocumentAccess(req.user.id, doc.id);
    if (!hasAccess) throw new AppError('Access denied', 403, 'FORBIDDEN');

    res.json({ success: true, data: { document: doc } });
  } catch (err) {
    next(err);
  }
}

export async function removeDocument(req, res, next) {
  try {
    const deleted = await deleteDocument(req.params.id, req.user.id);
    if (!deleted) throw new AppError('Document not found or access denied', 404, 'NOT_FOUND');
    res.json({ success: true, message: 'Document deleted' });
  } catch (err) {
    next(err);
  }
}

export async function getDocumentStatus(req, res, next) {
  try {
    const doc = await getDocumentById(req.params.id);
    if (!doc) throw new AppError('Document not found', 404, 'NOT_FOUND');

    const hasAccess = await userHasDocumentAccess(req.user.id, doc.id);
    if (!hasAccess) throw new AppError('Access denied', 403, 'FORBIDDEN');

    res.json({
      success: true,
      data: {
        id: doc.id,
        status: doc.status,
        errorMessage: doc.error_message,
        pageCount: doc.page_count,
      },
    });
  } catch (err) {
    next(err);
  }
}

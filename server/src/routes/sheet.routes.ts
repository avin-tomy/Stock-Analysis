import { Router } from 'express';
import { Sheet } from '../models/Sheet.js';
import { requireAuth } from '../middleware/requireAuth.js';

export const sheetRouter = Router();

sheetRouter.use(requireAuth);

sheetRouter.get('/', async (req, res) => {
  const sheet = await Sheet.findOne({ userId: req.userId });
  if (!sheet) {
    res.status(404).json({ error: 'No saved sheet' });
    return;
  }
  res.status(200).json({
    cells: sheet.cells,
    columnWidths: sheet.columnWidths,
    rowHeights: sheet.rowHeights,
    conditionalFormatting: sheet.conditionalFormatting,
    updatedAt: sheet.updatedAt,
  });
});

sheetRouter.put('/', async (req, res) => {
  const { cells, columnWidths, rowHeights, conditionalFormatting } = req.body ?? {};

  if (typeof cells !== 'object' || cells === null || Array.isArray(cells)) {
    res.status(400).json({ error: 'cells must be an object' });
    return;
  }

  const updatedAt = new Date();
  await Sheet.findOneAndUpdate(
    { userId: req.userId },
    {
      userId: req.userId,
      cells,
      columnWidths: columnWidths ?? {},
      rowHeights: rowHeights ?? {},
      conditionalFormatting: conditionalFormatting ?? {},
      updatedAt,
    },
    { upsert: true }
  );

  res.status(200).json({ updatedAt });
});

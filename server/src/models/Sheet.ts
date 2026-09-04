import { Schema, model } from 'mongoose';

const sheetSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, unique: true, index: true, ref: 'User' },
  cells: { type: Schema.Types.Mixed, required: true },
  columnWidths: { type: Schema.Types.Mixed, default: {} },
  rowHeights: { type: Schema.Types.Mixed, default: {} },
  conditionalFormatting: { type: Schema.Types.Mixed, default: {} },
  updatedAt: { type: Date, default: Date.now },
});

export const Sheet = model('Sheet', sheetSchema);

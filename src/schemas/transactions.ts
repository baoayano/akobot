import mongoose from 'mongoose';

export interface ITransaction {
  // MongoDB ObjectId available as _id on documents
  type: 'give' | 'withdraw' | string;
  from?: string | null; // sender user id (null for system/give)
  to?: string | null; // receiver user id (null for system/remove)
  amount: number;
  currency: 'cash' | 'ruby' | string;
  reason?: string;
  messageId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const TransactionSchema = new mongoose.Schema<ITransaction>(
  {
    type: { type: String, required: true },
    from: { type: String, required: false, default: null },
    to: { type: String, required: false, default: null },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: 'cash' },
    reason: { type: String, required: false },
    messageId: { type: String, required: false },
  },
  { timestamps: true }
);

export const TransactionModel =
  mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);

export default TransactionModel;

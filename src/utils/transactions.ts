import { TransactionModel, type ITransaction } from '../schemas/transactions.js';
import mongoose from 'mongoose';
import { UserModel } from '../schemas/users.js';

export interface TransactionFilter {
  userId?: string;
  type?: ITransaction['type'] | ITransaction['type'][];
  currency?: ITransaction['currency'] | ITransaction['currency'][];
  from?: string;
  to?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface TransactionHistoryOptions {
  limit?: number;
  skip?: number;
  sort?: 1 | -1;
}

function buildDateRange(startDate?: Date, endDate?: Date) {
  const range: { $gte?: Date; $lt?: Date } = {};

  if (startDate) {
    range.$gte = startDate;
  }

  if (endDate) {
    range.$lt = endDate;
  }

  return Object.keys(range).length > 0 ? range : undefined;
}

function buildTransactionQuery(filter: TransactionFilter = {}) {
  const query: Record<string, unknown> = {};

  if (filter.userId) {
    query.$or = [{ from: filter.userId }, { to: filter.userId }];
  }

  if (filter.type) {
    query.type = Array.isArray(filter.type) ? { $in: filter.type } : filter.type;
  }

  if (filter.currency) {
    query.currency = Array.isArray(filter.currency)
      ? { $in: filter.currency }
      : filter.currency;
  }

  if (filter.from) {
    query.from = filter.from;
  }

  if (filter.to) {
    query.to = filter.to;
  }

  const createdAt = buildDateRange(filter.startDate, filter.endDate);
  if (createdAt) {
    query.createdAt = createdAt;
  }

  return query;
}

export async function createTransaction(data: Partial<ITransaction>) {
  return TransactionModel.create(data);
}

export async function getTransactionHistory(
  filter: TransactionFilter = {},
  options: TransactionHistoryOptions = {}
) {
  const query = buildTransactionQuery(filter);

  return TransactionModel.find(query)
    .sort({ createdAt: options.sort ?? -1 })
    .skip(options.skip ?? 0)
    .limit(options.limit ?? 50);
}

export async function countTransactionHistory(filter: TransactionFilter = {}) {
  const query = buildTransactionQuery(filter);
  return TransactionModel.countDocuments(query);
}

export async function sumTransactionAmount(filter: TransactionFilter = {}) {
  const query = buildTransactionQuery(filter);

  const result = await TransactionModel.aggregate<{ total: number }>([
    { $match: query },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
      },
    },
  ]);

  return result[0]?.total ?? 0;
}

export async function getTodayTransactionHistory(userId?: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return getTransactionHistory(
    {
      userId,
      startDate: start,
      endDate: end,
    },
    { sort: -1 }
  );
}

export async function getTodayTransactionTotal(userId?: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return sumTransactionAmount({
    userId,
    startDate: start,
    endDate: end,
  });
}

export async function getTodayReceivedTotal(userId: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return sumTransactionAmount({
    to: userId,
    startDate: start,
    endDate: end,
  });
}

export async function getTodaySentTotal(userId: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return sumTransactionAmount({
    from: userId,
    startDate: start,
    endDate: end,
  });
}

export async function getTransactionHistoryByUser(
  userId: string,
  options: TransactionHistoryOptions = {}
) {
  return getTransactionHistory({ userId }, options);
}

export type RecordTransactionParams = {
  type: ITransaction['type'];
  from?: string | null;
  to?: string | null;
  amount: number;
  currency?: ITransaction['currency'];
  reason?: string;
  messageId?: string;
};

/**
 * Record a transaction and apply balance changes to involved users atomically.
 * - If `from` is provided, the amount will be deducted from `from` (if funds available).
 * - If `to` is provided, the amount will be added to `to`.
 * Returns the created transaction document.
 */
export async function recordAndApplyTransaction(params: RecordTransactionParams) {
  const { type, from = null, to = null, amount, currency = 'cash', reason, messageId } = params;

  if (amount <= 0) throw new Error('Amount must be greater than zero');

  // Try to use transactions when available (replica set / mongos).
  // If the server doesn't support transactions (standalone), fall back to
  // conditional atomic updates using $inc with a balance check.
  let session;
  try {
    session = await mongoose.startSession();
    // Attempt to start a transaction; this will throw on standalone servers.
    session.startTransaction();

    // If transferring from a user, ensure they have enough balance
    if (from) {
      const fromUser = await UserModel.findOne({ id: from }).session(session);
      if (!fromUser) throw new Error('Sender not found');
      const balance = (currency === 'ruby' ? fromUser.ruby : fromUser.cash) ?? 0;
      if (balance < amount) throw new Error('Insufficient funds');

      // decrement sender
      const updateField = currency === 'ruby' ? 'ruby' : 'cash';
      await UserModel.updateOne({ id: from }, { $inc: { [updateField]: -amount } }).session(session);
    }

    // If sending to a user, increment their balance (create user if not exists)
    if (to) {
      const updateField = currency === 'ruby' ? 'ruby' : 'cash';
      await UserModel.updateOne({ id: to }, { $inc: { [updateField]: amount } }, { upsert: true }).session(session);
    }

    // Create transaction record within the transaction
    const [doc] = await TransactionModel.create(
      [
        {
          type,
          from,
          to,
          amount,
          currency,
          reason,
          messageId,
        } as Partial<ITransaction>,
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return doc;
  } catch (txError) {
    // If transactions aren't supported (e.g., standalone MongoDB), fall back.
    try {
      if (session) {
        try {
          await session.abortTransaction();
        } catch {}
        session.endSession();
      }
    } catch {}

    // Fallback path: perform conditional atomic updates without a transaction.
    // Decrement sender atomically only if they have sufficient balance.
    try {
      if (from) {
        const updateField = currency === 'ruby' ? 'ruby' : 'cash';
        const query: any = { id: from };
        query[updateField] = { $gte: amount };

        const res = await UserModel.updateOne(query, { $inc: { [updateField]: -amount } });
        if (res.matchedCount === 0 || res.modifiedCount === 0) {
          throw new Error('Insufficient funds or sender not found');
        }
      }

      if (to) {
        const updateField = currency === 'ruby' ? 'ruby' : 'cash';
        await UserModel.updateOne({ id: to }, { $inc: { [updateField]: amount } }, { upsert: true });
      }

      const doc = await TransactionModel.create({
        type,
        from,
        to,
        amount,
        currency,
        reason,
        messageId,
      } as Partial<ITransaction>);

      return doc;
    } catch (fallbackError) {
      // Surface the more specific error
      throw fallbackError;
    }
  }
}

import { env } from 'process';
import { logToAxiom } from '../logging/client';
import Decimal from 'decimal.js';
import type { CreateBuzzCharge } from '~/server/schema/coinbase.schema';
import { COINBASE_FIXED_FEE, specialCosmeticRewards } from '~/server/common/constants';
import coinbaseCaller from '~/server/http/coinbase/coinbase.caller';
import type { Coinbase } from '~/server/http/coinbase/coinbase.schema';
import { grantBuzzPurchase } from '~/server/services/buzz.service';
import { grantCosmetics } from '~/server/services/cosmetic.service';
import { dbRead, dbWrite } from '~/server/db/client';
import { RedeemableCodeType } from '~/shared/utils/prisma/enums';
import { redeemableCodePurchaseEmail } from '~/server/email/templates/redeemableCodePurchase.email';

const log = async (data: MixedObject) => {
  await logToAxiom({ name: 'coinbase-service', type: 'error', ...data }).catch();
};

export const createBuzzOrder = async (input: CreateBuzzCharge & { userId: number }) => {
  const orderId = `${input.userId}-${input.buzzAmount}-${input.unitAmount}-${new Date().getTime()}`;

  if (input.unitAmount !== input.buzzAmount / 10) {
    // Safeguard against tampering with the amount on the client side
    throw new Error('There was an error while creating your order. Please try again later.');
  }

  const successUrl =
    `${env.NEXTAUTH_URL || ''}/payment/coinbase?` + new URLSearchParams([['orderId', orderId]]);

  const charge = await coinbaseCaller.createCharge({
    name: `Buzz purchase`,
    description: `Buzz purchase for ${input.buzzAmount} BUZZ`,
    pricing_type: 'fixed_price',
    local_price: {
      amount: new Decimal(input.unitAmount + COINBASE_FIXED_FEE).dividedBy(100).toString(), // Nowpayments use actual amount. Not multiplied by 100
      currency: 'USD',
    },
    metadata: {
      userId: input.userId,
      buzzAmount: input.buzzAmount,
      internalOrderId: orderId,
    },
    redirect_url: successUrl,
    cancel_url: env.NEXTAUTH_URL || '',
  });

  if (!charge) {
    throw new Error('Failed to create charge');
  }

  return charge;
};

export const processBuzzOrder = async (eventData: Coinbase.WebhookEventSchema['event']['data']) => {
  try {
    const metadata = eventData.metadata;
    const internalOrderId = metadata?.internalOrderId;

    if (!internalOrderId) {
      throw new Error('Missing required metadata in Coinbase webhook event');
    }

    const [userId, buzzAmount] = internalOrderId?.split('-').map((v) => Number(v));

    if (!userId || !buzzAmount) {
      throw new Error('Invalid userId or buzzAmount from Coinbase webhook event');
    }

    // Grant buzz/cosmetics
    const transactionId = await grantBuzzPurchase({
      userId,
      amount: buzzAmount,
      orderId: internalOrderId,
      externalTransactionId: internalOrderId,
      provider: 'coinbase',
      chargeId: eventData.id,
      type: 'info',
    });

    const cosmeticIds = specialCosmeticRewards.crypto;
    if (cosmeticIds.length > 0) {
      await grantCosmetics({
        userId,
        cosmeticIds,
      });
    }

    await log({
      message: 'Buzz purchase granted successfully',
      userId,
      buzzAmount,
      transactionId,
      orderId: internalOrderId,
    });

    return {
      userId,
      buzzAmount,
      transactionId,
      message: 'Buzz purchase processed successfully',
    };
  } catch (error) {
    await log({
      message: 'Failed to process Coinbase webhook event',
      error: error instanceof Error ? error.message : String(error),
      event,
    });
    console.error('Error processing Coinbase webhook event:', error);
    throw error; // Re-throw to handle it upstream if needed
  }
};

export const processCodeOrder = async (eventData: Coinbase.WebhookEventSchema['event']['data']) => {
  try {
    const metadata = eventData.metadata;
    const internalOrderId = metadata?.internalOrderId;

    if (!internalOrderId) {
      throw new Error('Missing required metadata in Coinbase code order webhook event');
    }

    // Idempotency: check if this order was already processed
    const existing = await dbRead.redeemableCode.findFirst({
      where: { transactionId: internalOrderId },
      select: { code: true },
    });

    if (existing) {
      await log({
        type: 'info',
        message: 'Code order already processed (duplicate webhook), skipping',
        orderId: internalOrderId,
      });
      return {
        userId: 0,
        code: existing.code,
        message: 'Code order already processed',
      };
    }

    // internalOrderId format: code-{userId}-{timestamp}
    const parts = internalOrderId.split('-');
    const userId = Number(parts[1]);

    if (!userId) {
      throw new Error('Invalid userId from Coinbase code order webhook event');
    }

    const codeType = metadata?.codeType as string | undefined;
    const codeUnitValue = Number(metadata?.codeUnitValue);
    const codePriceId = metadata?.codePriceId as string | undefined;

    if (!codeType || !codeUnitValue || isNaN(codeUnitValue)) {
      throw new Error('Missing codeType or codeUnitValue in Coinbase code order metadata');
    }

    if (codeType === 'Membership' && !codePriceId) {
      throw new Error('Membership code orders require a codePriceId');
    }

    const type =
      codeType === 'Membership' ? RedeemableCodeType.Membership : RedeemableCodeType.Buzz;

    // Create the code and tag it atomically
    const code = await dbWrite.$transaction(async (tx) => {
      const prefix = type === RedeemableCodeType.Buzz ? 'CS' : 'MB';
      const { generateToken } = await import('~/utils/string-helpers');
      const codeStr = `${prefix}-${generateToken(4)}-${generateToken(4)}`.toUpperCase();

      await tx.redeemableCode.create({
        data: {
          code: codeStr,
          unitValue: codeUnitValue,
          type,
          userId,
          priceId: codePriceId,
          transactionId: internalOrderId,
        },
      });

      return codeStr;
    });

    // Send email to the purchaser
    const user = await dbRead.user.findUnique({
      where: { id: userId },
      select: { email: true, username: true },
    });

    if (user?.email) {
      await redeemableCodePurchaseEmail
        .send({
          email: user.email,
          username: user.username || 'there',
          code,
          type: codeType as 'Buzz' | 'Membership',
          unitValue: codeUnitValue,
        })
        .catch((err) => {
          log({
            message: 'Failed to send code purchase email',
            error: String(err),
            orderId: internalOrderId,
          });
        });
    }

    await log({
      type: 'info',
      message: 'Code purchase processed successfully',
      userId,
      code,
      codeType,
      codeUnitValue,
      orderId: internalOrderId,
    });

    return {
      userId,
      code,
      codeType,
      codeUnitValue,
      message: 'Code purchase processed successfully',
    };
  } catch (error) {
    await log({
      message: 'Failed to process Coinbase code order webhook event',
      error: error instanceof Error ? error.message : String(error),
    });
    console.error('Error processing Coinbase code order webhook event:', error);
    throw error;
  }
};

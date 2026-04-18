import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyWebhook, EventName, type PaddleEnv } from '../_shared/paddle.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Map price_id -> credits granted on one-time purchase
const CREDIT_PACKS: Record<string, number> = {
  hn_credits_20_once: 20,
  hn_credits_50_once: 50,
  hn_credits_200_once: 200,
};

// Map price_id -> monthly credits granted on subscription cycle
const PLAN_CREDITS: Record<string, number> = {
  hn_starter_monthly: 50,
  hn_pro_monthly: 200,
  hn_pro_yearly: 200,
  hn_business_monthly: 99999, // unlimited-ish
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const url = new URL(req.url);
  const env = (url.searchParams.get('env') || 'sandbox') as PaddleEnv;

  try {
    const event = await verifyWebhook(req, env);
    console.log('[paddle-webhook]', event.eventType, 'env:', env, 'id:', (event as any).eventId);

    // Idempotency: skip if already processed
    const eventId = (event as any).eventId;
    if (eventId) {
      const { data: existing } = await supabase
        .from('paddle_processed_events')
        .select('event_id')
        .eq('event_id', eventId)
        .maybeSingle();
      if (existing) {
        console.log('[paddle-webhook] duplicate event, skipping');
        return jsonOk();
      }
    }

    switch (event.eventType) {
      case EventName.SubscriptionCreated:
        await handleSubscriptionCreated(event.data, env);
        break;
      case EventName.SubscriptionUpdated:
        await handleSubscriptionUpdated(event.data, env);
        break;
      case EventName.SubscriptionCanceled:
        await handleSubscriptionCanceled(event.data, env);
        break;
      case EventName.TransactionCompleted:
        await handleTransactionCompleted(event.data, env);
        break;
      case EventName.TransactionPaymentFailed:
        console.log('[paddle-webhook] payment failed:', (event.data as any).id);
        break;
      default:
        console.log('[paddle-webhook] unhandled:', event.eventType);
    }

    if (eventId) {
      await supabase.from('paddle_processed_events').insert({
        event_id: eventId,
        event_type: event.eventType,
        user_id: (event.data as any)?.customData?.userId ?? null,
      });
    }

    return jsonOk();
  } catch (e) {
    console.error('[paddle-webhook] error:', e);
    return new Response('Webhook error', { status: 400 });
  }
});

function jsonOk() {
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleSubscriptionCreated(data: any, env: PaddleEnv) {
  const { id, customerId, items, status, currentBillingPeriod, customData } = data;
  const userId = customData?.userId;
  if (!userId) {
    console.error('[paddle-webhook] no userId in customData');
    return;
  }

  const item = items[0];
  const priceId = item.price.importMeta?.externalId || item.price.id;
  const productId = item.product?.importMeta?.externalId || item.product?.id || '';

  await supabase.from('paddle_subscriptions').upsert({
    user_id: userId,
    paddle_subscription_id: id,
    paddle_customer_id: customerId,
    product_id: productId,
    price_id: priceId,
    status,
    current_period_start: currentBillingPeriod?.startsAt,
    current_period_end: currentBillingPeriod?.endsAt,
    environment: env,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,environment' });

  // Grant initial credits
  const credits = PLAN_CREDITS[priceId];
  if (credits) {
    await grantCredits(userId, credits, `subscription:${priceId}`, { paddle_sub_id: id });
  }
}

async function handleSubscriptionUpdated(data: any, env: PaddleEnv) {
  const { id, status, currentBillingPeriod, scheduledChange, items, customData } = data;
  const item = items?.[0];
  const priceId = item?.price?.importMeta?.externalId || item?.price?.id;

  await supabase.from('paddle_subscriptions')
    .update({
      status,
      price_id: priceId,
      current_period_start: currentBillingPeriod?.startsAt,
      current_period_end: currentBillingPeriod?.endsAt,
      cancel_at_period_end: scheduledChange?.action === 'cancel',
      updated_at: new Date().toISOString(),
    })
    .eq('paddle_subscription_id', id)
    .eq('environment', env);

  // Renewal: grant credits when a new billing period starts
  const userId = customData?.userId;
  const credits = priceId ? PLAN_CREDITS[priceId] : null;
  if (userId && credits && status === 'active') {
    await grantCredits(userId, credits, `subscription_renewal:${priceId}`, { paddle_sub_id: id });
  }
}

async function handleSubscriptionCanceled(data: any, env: PaddleEnv) {
  await supabase.from('paddle_subscriptions')
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString(),
    })
    .eq('paddle_subscription_id', data.id)
    .eq('environment', env);
}

async function handleTransactionCompleted(data: any, env: PaddleEnv) {
  const { id, customData, items } = data;
  const userId = customData?.userId;
  if (!userId) return;

  // For one-time credit packs
  for (const item of items || []) {
    const priceId = item.price?.importMeta?.externalId || item.price?.id;
    const credits = CREDIT_PACKS[priceId];
    if (credits) {
      await grantCredits(userId, credits, `purchase:${priceId}`, {
        paddle_txn_id: id,
        env,
      });
    }
  }

  // If linked to an order via customData.orderId, mark it paid
  if (customData?.orderId) {
    await supabase.from('orders')
      .update({ status: 'processing' })
      .eq('id', customData.orderId);
  }

  // If linked to a print order
  if (customData?.printOrderId) {
    await supabase.from('print_orders')
      .update({ payment_status: 'paid', status: 'pending' })
      .eq('id', customData.printOrderId);
  }
}

async function grantCredits(userId: string, amount: number, reason: string, metadata: Record<string, unknown>) {
  try {
    const { error } = await supabase.rpc('grant_credits', {
      _user_id: userId,
      _amount: amount,
      _reason: reason,
    });
    if (error) {
      console.error('[paddle-webhook] grant_credits RPC failed', error);
      // Fallback: insert transaction directly
      await supabase.from('credit_transactions').insert({
        user_id: userId,
        delta: amount,
        reason,
        metadata,
      });
    }
  } catch (e) {
    console.error('[paddle-webhook] grant credits error', e);
  }
}

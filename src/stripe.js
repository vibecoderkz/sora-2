import Stripe from 'stripe';
import dotenv from 'dotenv';
import { db } from './database.js';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function createCheckoutSession(userId, credits, amount) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'kzt', // Kazakhstani Tenge
          product_data: {
            name: `${credits} токенов`,
            description: 'Кредиты для генерации видео Sora-2',
          },
          unit_amount: amount, // amount in tiyins (smallest unit, 1/100 tenge)
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${process.env.WEBHOOK_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.WEBHOOK_URL}/cancel`,
    metadata: {
      userId: userId.toString(),
      credits: credits.toString(),
    },
  });

  // Save order to database
  db.createOrder(userId, session.id, amount, credits);

  return session;
}

export async function handleWebhook(body, signature) {
  const event = stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const order = db.getOrder(session.id);

    if (order) {
      // Add credits to user
      db.updateCredits(order.user_id, order.credits);
      db.updateOrderStatus(session.id, 'completed');

      return {
        userId: order.user_id,
        credits: order.credits,
      };
    }
  }

  return null;
}

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
// MUST use service role key to bypass RLS when updating user status from backend
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RAZORPAY_WEBHOOK_SECRET = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') ?? '';

// Helper to compute HMAC SHA-256 in Deno Web Crypto
async function verifyRazorpaySignature(body: string, signature: string, secret: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(body));
  const hexSignature = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hexSignature === signature;
}

serve(async (req) => {
  // Webhooks are always POST
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const signature = req.headers.get('x-razorpay-signature');
    if (!signature) {
      return new Response('Missing Razorpay signature', { status: 400 });
    }

    // We must read the raw body text to verify the signature
    const bodyText = await req.text();

    if (!RAZORPAY_WEBHOOK_SECRET) {
      console.error('RAZORPAY_WEBHOOK_SECRET is not set in environment variables');
      return new Response('Server configuration error', { status: 500 });
    }

    const isValid = await verifyRazorpaySignature(bodyText, signature, RAZORPAY_WEBHOOK_SECRET);
    if (!isValid) {
      console.error('Invalid webhook signature detected!');
      return new Response('Invalid Signature', { status: 400 });
    }

    const payload = JSON.parse(bodyText);
    
    // We only care about successful payments
    if (payload.event === 'order.paid' || payload.event === 'payment.captured') {
      const paymentEntity = payload.payload.payment.entity;
      
      // We stored the student_id in the 'notes' field when creating the order/payment
      const studentId = paymentEntity.notes?.student_id || paymentEntity.notes?.user_id;
      const transactionId = paymentEntity.id;
      const method = paymentEntity.method || 'Razorpay';
      
      if (!studentId) {
        console.error('Webhook payload missing student_id in notes', payload);
        return new Response('Missing student_id', { status: 400 });
      }

      console.log(`Verified payment ${transactionId} for student ${studentId}. Updating database...`);

      // Initialize Supabase admin client
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Calculate next month's due date safely
      const _rd = new Date(); 
      _rd.setMonth(_rd.getMonth() + 1); 
      _rd.setDate(14);
      const dueDate = _rd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
      const paidDate = new Date().toLocaleDateString('en-GB');

      // Update the user's status directly in the database
      const { error } = await supabaseAdmin
        .from('users')
        .update({
          status: 'Paid',
          last_txn_id: transactionId,
          pay_method: method,
          paid_date: paidDate,
          due_date: dueDate
        })
        .eq('id', studentId);

      if (error) {
        console.error('Failed to update student status in Supabase:', error);
        return new Response('Database update failed', { status: 500 });
      }

      console.log('Successfully updated student status to Paid');
      return new Response('Webhook processed successfully', { status: 200 });
    }

    // Acknowledge other events (like payment.failed) without crashing
    return new Response('Event ignored', { status: 200 });

  } catch (err) {
    console.error('Webhook processing error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
});

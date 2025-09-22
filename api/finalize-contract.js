// /api/finalize-contract.js
// Vercel/Node API ruta sa Outbox dnevnikom

import { createClient } from '@supabase/supabase-js';
import {
  sendFinalEmailToClient,
  sendFinalEmailToAdmin
} from '../utils/email_and_pdf.js';

// --- Supabase klijenti (service key za DB, anon za verifikaciju tokena)
const supabaseUrl  = process.env.SUPABASE_URL;
const serviceKey   = process.env.SUPABASE_SERVICE_KEY;
const anonKey      = process.env.SUPABASE_ANON_KEY;

const supabaseAdmin = createClient(supabaseUrl, serviceKey);     // full access (RLS bypass)
const supabasePublic = createClient(supabaseUrl, anonKey);       // za auth.getUser(token)

// --- Helper: izvuci korisnika iz Authorization: Bearer <token>
async function checkUser(req) {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return { user: null, error: { message: 'Missing token' } };
  const { data: { user }, error } = await supabasePublic.auth.getUser(token);
  return { user, error };
}

// --- Outbox helperi
async function outboxInsert(row) {
  // row: { order_id, to, subject, template, status, provider_id?, error_code?, error_detail? }
  const { data, error } = await supabaseAdmin
    .from('email_outbox')
    .insert(row)
    .select('*')
    .single();
  if (error) console.error('Outbox insert error:', error);
  return data; // može biti undefined ako insert failne (ne rušimo flow)
}
async function outboxUpdate(id, patch) {
  if (!id) return;
  const { error } = await supabaseAdmin
    .from('email_outbox')
    .update(patch)
    .eq('id', id);
  if (error) console.error('Outbox update error:', error);
}

// --- Main handler
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Auth
  const { user, error: userError } = await checkUser(req);
  if (userError || !user) {
    return res.status(401).json({ error: 'Unauthorized: ' + (userError?.message || 'No user session') });
  }

  try {
    // Body (Vercel/Express već parsira JSON)
    const { action, order_id, fileUrl } = req.body || {};
    if (!action || !order_id) {
      return res.status(400).json({ error: 'Missing order ID or action' });
    }

    // Učitaj narudžbu
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();
    if (orderError || !order) {
      console.error('Order fetch error:', orderError);
      return res.status(404).json({ error: 'Order not found' });
    }

    // --- ACTIONS ---
    if (action === 'verify_payment') {
      const { error } = await supabaseAdmin
        .from('orders')
        .update({ is_paid: true })
        .eq('id', order_id);
      if (error) throw error;
      return res.status(200).json({ success: true, message: 'Payment status updated.' });
    }

    if (action === 'upload_file') {
      if (!fileUrl) return res.status(400).json({ error: 'Missing fileUrl' });
      const { error } = await supabaseAdmin
        .from('orders')
        .update({ final_document_url: fileUrl })
        .eq('id', order_id);
      if (error) throw error;
      return res.status(200).json({ success: true, message: 'Document URL saved.' });
    }

    if (action === 'send_final') {
      if (!order.is_paid || !order.final_document_url) {
        return res.status(400).json({ error: 'Order not paid or final document not uploaded' });
      }

      const documentUrl = order.final_document_url;
      const documentName = decodeURIComponent(documentUrl.split('/').pop() || '');

      // 1) Zapiši OUTBOX "queued" za klijenta i admina
      const subjectClient = `Vaš finalni ugovor #${String(order.order_number).padStart(5, '0')}`;
      const subjectAdmin  = `Poslat final za #${String(order.order_number).padStart(5, '0')} • ${order.client_email}`;

      const queuedClient = await outboxInsert({
        order_id,
        to: order.client_email,
        subject: subjectClient,
        template: 'final_contract',
        status: 'queued',
      });
      const queuedAdmin = await outboxInsert({
        order_id,
        to: process.env.ADMIN_EMAIL || 'admin@ugovor24.com',
        subject: subjectAdmin,
        template: 'final_contract_admin',
        status: 'queued',
      });

      // 2) Pošalji emailove (hvataj provider id ako util vrati nešto)
      try {
        const resClient = await sendFinalEmailToClient(order, documentUrl, documentName);
        await outboxUpdate(queuedClient?.id, {
          status: 'sent',
          provider_id: resClient?.id || resClient?.messageId || null
        });
      } catch (e) {
        await outboxUpdate(queuedClient?.id, {
          status: 'failed',
          error_code: e?.code || null,
          error_detail: e?.message?.slice(0, 500) || 'send client failed'
        });
        // nastavi dalje – admin mail probaj poslati bez obzira
      }

      try {
        const resAdmin = await sendFinalEmailToAdmin(order, documentUrl, documentName);
        await outboxUpdate(queuedAdmin?.id, {
          status: 'sent',
          provider_id: resAdmin?.id || resAdmin?.messageId || null
        });
      } catch (e) {
        await outboxUpdate(queuedAdmin?.id, {
          status: 'failed',
          error_code: e?.code || null,
          error_detail: e?.message?.slice(0, 500) || 'send admin failed'
        });
      }

      // 3) Označi narudžbu finalizovanom (čak i ako je admin mail fail – klijent je prioritet)
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({ is_final_approved: true })
        .eq('id', order_id);
      if (updateError) throw updateError;

      return res.status(200).json({ success: true, message: 'Final email(s) processed and status updated.' });
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (err) {
    console.error('Unexpected API error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

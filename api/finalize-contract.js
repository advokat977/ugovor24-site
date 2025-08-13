// api/finalize-contract.js

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const resend = new Resend(process.env.RESEND_API_KEY);

function removeDiacritics(text) {
    if (!text) return '';
    return text.replace(/č/g, 'c').replace(/ć/g, 'c').replace(/š/g, 's').replace(/ž/g, 'z').replace(/đ/g, 'dj')
               .replace(/Č/g, 'C').replace(/Ć/g, 'C').replace(/Š/g, 'S').replace(/Ž/g, 'Z').replace(/Đ/g, 'Dj');
}

function formatOrderNumber(number) {
  const numString = String(number);
  const leadingZeros = '00000'.substring(0, 5 - numString.length);
  return `${leadingZeros}${numString}`;
}

async function sendFinalEmailToClient(order) {
    try {
        const ugovorType = order.ugovor_type;
        const formattedOrderNumber = formatOrderNumber(order.order_number);
        const finalDocumentUrl = order.final_document_url;
        
        await resend.emails.send({
            from: 'noreply@ugovor24.com',
            to: order.client_email,
            subject: `Vas ugovor je spreman za preuzimanje: ${removeDiacritics(ugovorType)} (#${formattedOrderNumber})`,
            html: `
                <p>Postovani/a,</p>
                <p>Cestitamo! Vasa uplata je proknjizena i Vas ugovor je odobren.</p>
                <p>Finalna verzija Vaseg ugovora je spremna za preuzimanje na linku ispod.</p>
                <p>Ugovor: **<a href="${finalDocumentUrl}">Preuzmi finalni dokument</a>**</p>
                <p>Srdacan pozdrav,</p>
                <p>Tim ugovor24.com</p>
            `,
        });
        return { success: true };
    } catch (error) {
        console.error('Greska pri slanju finalnog e-maila:', error);
        return { error: 'Failed to send final email' };
    }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { action, order_id, fileUrl } = req.body;

  if (!order_id || !action) {
    return res.status(400).json({ error: 'Missing order ID or action' });
  }

  try {
    if (action === 'verify_payment') {
      const { error } = await supabase
        .from('orders')
        .update({ is_paid: true })
        .eq('id', order_id);

      if (error) {
        return res.status(500).json({ error: 'Failed to update payment status' });
      }

      return res.status(200).json({ success: true, message: 'Payment status updated.' });
    }

    if (action === 'send_final') {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', order_id)
        .single();

      if (orderError || !order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      if (!order.is_paid || !order.final_document_url) {
        return res.status(400).json({ error: 'Order not paid or final document not uploaded' });
      }

      const emailResult = await sendFinalEmailToClient(order);

      if (emailResult.error) {
        return res.status(500).json({ error: 'Failed to send final email' });
      }
      
      const { error: updateError } = await supabase
        .from('orders')
        .update({ is_final_approved: true })
        .eq('id', order_id);
        
      if (updateError) {
        return res.status(500).json({ error: 'Failed to update final status' });
      }

      return res.status(200).json({ success: true, message: 'Final email sent and status updated.' });
    }
    
    // Akcija za upload file-a
    if (action === 'upload_file' && fileUrl) {
        const { error } = await supabase
        .from('orders')
        .update({ final_document_url: fileUrl })
        .eq('id', order_id);

      if (error) {
        return res.status(500).json({ error: 'Failed to upload document URL' });
      }

      return res.status(200).json({ success: true, message: 'Document URL saved.' });
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (err) {
    console.error('Neocekivana greska:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

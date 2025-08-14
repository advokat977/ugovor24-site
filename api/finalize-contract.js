// api/finalize-contract.js

import { createClient } from '@supabase/supabase-js';
import { 
    sendFinalEmailToClient,
    sendFinalEmailToAdmin
} from '../utils/email_and_pdf.js';

const supabaseUrl = process.env.SUPABASE_URL;
// Koristimo SERVICE_ROLE ključ za administrativne operacije
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; 
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

// Pomoćna funkcija za provjeru da li je korisnik ulogovan
const checkUser = async (req) => {
    const token = req.headers.get('authorization')?.split('Bearer ')[1];
    if (!token) return { user: null, error: { message: 'Missing token' } };
    
    // Za provjeru tokena koristimo standardni anon klijent
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    return { user, error };
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // PRVI KORAK: Provjera autorizacije.
  const { user, error: userError } = await checkUser(req);
  if (userError || !user) {
    return res.status(401).json({ error: 'Unauthorized: ' + (userError?.message || 'No user session') });
  }

  try {
    const { action, order_id, fileUrl } = await req.json();

    if (!order_id || !action) {
      return res.status(400).json({ error: 'Missing order ID or action' });
    }
    
    // Dohvatamo narudžbinu. Više nam ne trebaju komplikovani upiti.
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(`*`)
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
        console.error('Order not found or database error:', orderError);
        return res.status(404).json({ error: 'Order not found' });
    }

    if (action === 'verify_payment') {
      const { error } = await supabaseAdmin.from('orders').update({ is_paid: true }).eq('id', order_id);
      if (error) throw error;
      return res.status(200).json({ success: true, message: 'Payment status updated.' });
    }
    
    if (action === 'upload_file' && fileUrl) {
      const { error } = await supabaseAdmin.from('orders').update({ final_document_url: fileUrl }).eq('id', order_id);
      if (error) throw error;
      return res.status(200).json({ success: true, message: 'Document URL saved.' });
    }

    if (action === 'send_final') {
      if (!order.is_paid || !order.final_document_url) {
        return res.status(400).json({ error: 'Order not paid or final document not uploaded' });
      }

      const documentName = decodeURIComponent(order.final_document_url.split('/').pop());
      
      await sendFinalEmailToClient(order, order.final_document_url, documentName);
      await sendFinalEmailToAdmin(order, order.final_document_url, documentName);

      const { error: updateError } = await supabaseAdmin.from('orders').update({ is_final_approved: true }).eq('id', order_id);
      if (updateError) throw updateError;

      return res.status(200).json({ success: true, message: 'Final email sent and status updated.' });
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (err) {
    console.error('Unexpected API error:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}

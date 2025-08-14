// api/finalize-contract.js

import { createClient } from '@supabase/supabase-js';
import { 
    sendFinalEmailToClient,
    sendFinalEmailToAdmin
} from '../utils/email_and_pdf.js';

const supabaseUrl = process.env.SUPABASE_URL;
// VAŽNO: Koristimo SERVICE_ROLE ključ ovdje jer su ovo administrativne operacije
// Ovaj ključ ima puna ovlašćenja i NIKADA se ne smije koristiti na frontendu.
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; 
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

// Funkcija za provjeru da li je korisnik ulogovan
const checkUser = async (req) => {
    const token = req.headers.get('authorization')?.split('Bearer ')[1];
    if (!token) {
        return { user: null, error: 'Missing token' };
    }
    // Provjeravamo token pomoću regularnog anon klijenta
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
        return { user: null, error: 'Invalid token' };
    }
    return { user, error: null };
};


export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // PRVI KORAK: Provjera autorizacije. Da li je admin ulogovan?
  const { user, error: userError } = await checkUser(req);
  if (userError || !user) {
    return res.status(401).json({ error: 'Unauthorized: ' + (userError || 'No user session') });
  }
  // Od ovog trenutka, znamo da je zahtjev poslao ulogovani korisnik.

  const { action, order_id, fileUrl } = await req.json();

  if (!order_id || !action) {
    return res.status(400).json({ error: 'Missing order ID or action' });
  }

  try {
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        orders_ugovor_o_djelu(naziv_narucioca),
        orders_ugovor_o_zakupu(naziv_zakupca),
        orders_ugovor_o_radu(ime_i_prezime_zaposlenog),
        orders_ugovor_o_povjerljivosti_nda(tip_ugovora, naziv_strane_a, naziv_strane_koja_prima),
        orders_set_za_firmu_doo(ime_osnivaca_1)
      `)
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
        console.error('Order not found or database error:', orderError);
        return res.status(404).json({ error: 'Order not found or database error' });
    }

    if (action === 'verify_payment') {
      const { error } = await supabaseAdmin
        .from('orders')
        .update({ is_paid: true })
        .eq('id', order_id);

      if (error) {
        console.error('Failed to update payment status:', error);
        return res.status(500).json({ error: 'Failed to update payment status' });
      }

      return res.status(200).json({ success: true, message: 'Payment status updated.' });
    }

    if (action === 'send_final') {
      if (!order.is_paid || !order.final_document_url) {
        return res.status(400).json({ error: 'Order not paid or final document not uploaded' });
      }

      const documentName = decodeURIComponent(order.final_document_url.split('/').pop());
      
      const clientEmailResult = await sendFinalEmailToClient(order, order.final_document_url, documentName);
      if (!clientEmailResult.success) {
        return res.status(500).json({ error: clientEmailResult.error });
      }
      
      const adminEmailResult = await sendFinalEmailToAdmin(order, order.final_document_url, documentName);
      if (!adminEmailResult.success) {
        // Ne vraćamo grešku klijentu ako admin kopija ne uspije
        console.error('Failed to send admin copy email:', adminEmailResult.error);
      }

      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({ is_final_approved: true })
        .eq('id', order_id);
        
      if (updateError) {
        console.error('Failed to update final status:', updateError);
        return res.status(500).json({ error: 'Failed to update final status' });
      }

      return res.status(200).json({ success: true, message: 'Final email sent and status updated.' });
    }
    
    if (action === 'upload_file' && fileUrl) {
        const { error } = await supabaseAdmin
        .from('orders')
        .update({ final_document_url: fileUrl })
        .eq('id', order_id);

      if (error) {
        console.error('Failed to upload document URL:', error);
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

// api/submit-ugovor-o-povjerljivosti.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const formData = req.body;

  const client_email = formData['client_email'];
  const ugovor_type = 'Ugovor o povjerljivosti (NDA)';
  const total_price = 29; // Cijena ugovora

  if (!client_email || !ugovor_type || !total_price) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert([
        { 
          client_email,
          ugovor_type,
          total_price
        }
      ])
      .select();

    if (orderError) {
      console.error('Greška pri unosu u orders tabelu:', orderError);
      return res.status(500).json({ error: 'Database insertion error' });
    }
    
    const order_id = orderData[0].id;

    const { error: specificError } = await supabase
      .from('orders_ugovor_o_povjerljivosti_nda')
      .insert([
        { 
          order_id: order_id,
          tip_ugovora: formData['tip_ugovora'],
          naziv_strane_koja_otkriva: formData['naziv_strane_koja_otkriva'] || null,
          adresa_strane_koja_otkriva: formData['adresa_strane_koja_otkriva'] || null,
          id_broj_strane_koja_otkriva: formData['id_broj_strane_koja_otkriva'] || null,
          naziv_strane_koja_prima: formData['naziv_strane_koja_prima'] || null,
          adresa_strane_koja_prima: formData['adresa_strane_koja_prima'] || null,
          id_broj_strane_koja_prima: formData['id_broj_strane_koja_prima'] || null,
          naziv_strane_a: formData['naziv_strane_a'] || null,
          adresa_strane_a: formData['adresa_strane_a'] || null,
          id_broj_strane_a: formData['id_broj_strane_a'] || null,
          naziv_strane_b: formData['naziv_strane_b'] || null,
          adresa_strane_b: formData['adresa_strane_b'] || null,
          id_broj_strane_b: formData['id_broj_strane_b'] || null,
          mjesto_zakljucenja: formData['mjesto_zakljucenja'],
          datum_zakljucenja: formData['datum_zakljucenja'],
          svrha_otkrivanja: formData['svrha_otkrivanja'],
          period_trajanja_obaveze: formData['period_trajanja_obaveze'],
          ugovorena_kazna: formData['ugovorena_kazna'] === 'Da',
          iznos_ugovorene_kazne: formData['iznos_ugovorene_kazne'] || null
        }
      ]);

    if (specificError) {
      console.error('Greška pri unosu u orders_ugovor_o_povjerljivosti_nda tabelu:', specificError);
      return res.status(500).json({ error: 'Database insertion error' });
    }

    res.writeHead(302, {
      'Location': `/placanje.html?cijena=${total_price}&ugovor=${encodeURIComponent(ugovor_type)}`,
      'Content-Type': 'text/plain',
    });
    res.end('Redirecting to payment...');
    
  } catch (err) {
    console.error('Neočekivana greška:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

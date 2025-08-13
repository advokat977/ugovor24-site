// api/submit-ugovor-o-zakupu.js

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
  const ugovor_type = 'Ugovor o zakupu';
  const total_price = 79; // Cijena ugovora

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
      .from('orders_ugovor_o_zakupu')
      .insert([
        { 
          order_id: order_id,
          mjesto_zakljucenja: formData['mjesto_zakljucenja'],
          datum_zakljucenja: formData['datum_zakljucenja'],
          naziv_zakupodavca: formData['naziv_zakupodavca'],
          adresa_zakupodavca: formData['adresa_zakupodavca'],
          id_broj_zakupodavca: formData['id_broj_zakupodavca'],
          naziv_zakupca: formData['naziv_zakupca'],
          adresa_zakupca: formData['adresa_zakupca'],
          id_broj_zakupca: formData['id_broj_zakupca'],
          tip_prostora: formData['tip_prostora'],
          adresa_prostora: formData['adresa_prostora'],
          povrsina_prostora: formData['povrsina_prostora'],
          broj_lista_nepokretnosti: formData['broj_lista_nepokretnosti'],
          katastarska_opstina: formData['katastarska_opstina'],
          opis_prostorija: formData['opis_prostorija'],
          namjena_prostora: formData['namjena_prostora'],
          period_zakupa: formData['period_zakupa'],
          jedinica_perioda_zakupa: formData['jedinica_perioda_zakupa'],
          datum_pocetka_zakupa: formData['datum_pocetka_zakupa'],
          iznos_zakupnine_broj: formData['iznos_zakupnine_broj'],
          dan_u_mjesecu_za_placanje: formData['dan_u_mjesecu_za_placanje'],
          otkazni_rok: formData['otkazni_rok'],
          definisan_depozit: formData['definisan_depozit'] === 'Da',
          iznos_depozita_broj: formData['iznos_depozita_broj'] || null,
          definisana_indeksacija: formData['definisana_indeksacija'] === 'Da',
          dozvoljen_podzakup: formData['dozvoljen_podzakup'] === 'Da',
          strana_koja_placa_solemnizaciju: formData['strana_koja_placa_solemnizaciju']
        }
      ]);

    if (specificError) {
      console.error('Greška pri unosu u orders_ugovor_o_zakupu tabelu:', specificError);
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

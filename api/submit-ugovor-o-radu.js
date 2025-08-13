// api/submit-ugovor-o-radu.js

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
  const ugovor_type = 'Ugovor o radu';
  const total_price = 99; // Cijena ugovora

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
      .from('orders_ugovor_o_radu')
      .insert([
        { 
          order_id: order_id,
          mjesto_zakljucenja: formData['mjesto_zakljucenja'],
          datum_zakljucenja: formData['datum_zakljucenja'],
          naziv_poslodavca: formData['naziv_poslodavca'],
          adresa_poslodavca: formData['adresa_poslodavca'],
          pib_poslodavca: formData['pib_poslodavca'],
          zastupnik_poslodavca: formData['zastupnik_poslodavca'],
          ime_i_prezime_zaposlenog: formData['ime_i_prezime_zaposlenog'],
          adresa_zaposlenog: formData['adresa_zaposlenog'],
          jmbg_zaposlenog: formData['jmbg_zaposlenog'],
          naziv_radnog_mjesta: formData['naziv_radnog_mjesta'],
          opis_poslova: formData['opis_poslova'],
          nivo_kvalifikacije_obrazovanja: formData['nivo_kvalifikacije_obrazovanja'],
          stepen_strucne_spreme: formData['stepen_strucne_spreme'],
          rad_na_daljinu: formData['rad_na_daljinu'] === 'Da',
          mjesto_rada: formData['mjesto_rada'] || null,
          tip_radnog_odnosa: formData['tip_radnog_odnosa'],
          razlog_rada_na_odredjeno: formData['razlog_rada_na_odredjeno'] || null,
          datum_isteka_ugovora: formData['datum_isteka_ugovora'] || null,
          datum_stupanja_na_rad: formData['datum_stupanja_na_rad'],
          tip_radnog_vremena: formData['tip_radnog_vremena'],
          broj_radnih_sati_sedmicno: formData['broj_radnih_sati_sedmicno'],
          iznos_bruto_zarade_broj: formData['iznos_bruto_zarade_broj'],
          broj_dana_godisnjeg_odmora: formData['broj_dana_godisnjeg_odmora'],
          otkazni_rok: formData['otkazni_rok'],
          definisan_probni_rad: formData['definisan_probni_rad'] === 'Da',
          period_probnog_rada: formData['period_probnog_rada'] || null,
          definisana_zabrana_konkurencije: formData['definisana_zabrana_konkurencije'] === 'Da'
        }
      ]);

    if (specificError) {
      console.error('Greška pri unosu u orders_ugovor_o_radu tabelu:', specificError);
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

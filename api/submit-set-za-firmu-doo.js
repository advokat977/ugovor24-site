// api/submit-set-za-firmu-doo.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const formData = req.body;

  const client_email = formData['e_mail_adresa'];
  const ugovor_type = 'Set dokumenata za registraciju firme (DOO)';
  const total_price = 199; // Cijena ugovora

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
      .from('orders_set_za_firmu_doo')
      .insert([
        { 
          order_id: order_id,
          naziv_firme: formData['naziv_firme'],
          skraceni_naziv_firme: formData['skraceni_naziv_firme'] || null,
          adresa_sjedista: formData['adresa_sjedista'],
          adresa_za_postu: formData['adresa_za_postu'] || null,
          e_mail_adresa: formData['e_mail_adresa'],
          opis_pretezne_djelatnosti: formData['opis_pretezne_djelatnosti'],
          zelite_li_spoljnotrgovinske_poslove: formData['zelite_li_spoljnotrgovinske_poslove'] === 'Da',
          iznos_kapitala: formData['iznos_kapitala'],
          tip_osnivaca_1: formData['tip_osnivaca_1'] || null,
          ime_osnivaca_1: formData['ime_osnivaca_1'] || null,
          id_osnivaca_1: formData['id_osnivaca_1'] || null,
          adresa_osnivaca_1: formData['adresa_osnivaca_1'] || null,
          vrsta_uloga_1: formData['vrsta_uloga_1'] || null,
          vrijednost_uloga_1: formData['vrijednost_uloga_1'] || null,
          opis_nenovcanog_uloga_1: formData['opis_nenovcanog_uloga_1'] || null,
          ime_direktora: formData['ime_direktora'],
          id_direktora: formData['id_direktora'],
          samostalni_direktor: formData['samostalni_direktor'] === 'Da',
          detalji_ovlascenja: formData['detalji_ovlascenja'] || null,
          zelite_li_odb_dir: formData['zelite_li_odb_dir'] === 'Da',
          clanovi_odbora_direktora: formData['clanovi_odbora_direktora'] || null,
          prokurista: formData['prokurista'] === 'Da',
          ime_i_id_prokuriste: formData['ime_i_id_prokuriste'] || null,
          dodatne_odredbe_statuta: formData['dodatne_odredbe_statuta'] || null,
          procijenjeni_troskovi_osnivanja: formData['procijenjeni_troskovi_osnivanja'] || null
        }
      ]);

    if (specificError) {
      console.error('Greška pri unosu u orders_set_za_firmu_doo tabelu:', specificError);
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

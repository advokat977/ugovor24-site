// api/submit-ugovor-o-djelu.js

import { createClient } from '@supabase/supabase-js';

// Supabase URL i anonimni ključ se uzimaju iz Vercel varijabli okruženja
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // Dozvoljavamo samo POST metode
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const formData = req.body;

  // Izvlacenje email adrese klijenta i vrste ugovora
  const client_email = formData['client_email'];
  const ugovor_type = 'Ugovor o djelu';
  const total_price = 59; // Cijena ugovora

  // Provjera da li su email i ostali obavezni podaci prisutni
  if (!client_email || !ugovor_type || !total_price) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1. Unos u glavnu 'orders' tabelu
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

    // 2. Unos specifičnih podataka u 'orders_ugovor_o_djelu' tabelu
    const { error: specificError } = await supabase
      .from('orders_ugovor_o_djelu')
      .insert([
        { 
          order_id: order_id,
          mjesto_zakljucenja: formData['mjesto_zakljucenja'],
          datum_zakljucenja: formData['datum_zakljucenja'],
          naziv_narucioca: formData['naziv_narucioca'],
          adresa_narucioca: formData['adresa_narucioca'],
          id_broj_narucioca: formData['id_broj_narucioca'],
          naziv_izvrsioca: formData['naziv_izvrsioca'],
          adresa_izvrsioca: formData['adresa_izvrsioca'],
          id_broj_izvrsioca: formData['id_broj_izvrsioca'],
          racun_izvrsioca: formData['racun_izvrsioca'],
          banka_izvrsioca: formData['banka_izvrsioca'],
          predmet_ugovora: formData['predmet_ugovora'],
          rok_zavrsetka: formData['rok_zavrsetka'],
          isporuka_definisana: formData['isporuka_definisana'] === 'Da',
          definicija_isporuke: formData['definicija_isporuke'] || null,
          iznos_naknade_broj: formData['iznos_naknade_broj'],
          tip_naknade: formData['tip_naknade'],
          rok_placanja: formData['rok_placanja'],
          je_autorsko_djelo: formData['je_autorsko_djelo'] === 'Da',
          pristup_povjerljivim_info: formData['pristup_povjerljivim_info'] === 'Da',
          definisan_proces_revizije: formData['definisan_proces_revizije'] === 'Da',
          broj_revizija: formData['broj_revizija'] || null,
          rok_za_feedback: formData['rok_za_feedback'] || null
        }
      ]);

    if (specificError) {
      console.error('Greška pri unosu u orders_ugovor_o_djelu tabelu:', specificError);
      return res.status(500).json({ error: 'Database insertion error' });
    }

    // 3. Preusmjeravanje klijenta na stranicu za plaćanje
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

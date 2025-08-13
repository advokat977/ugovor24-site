// api/submit-form.js

import { createClient } from '@supabase/supabase-js';
import { 
    sendConfirmationEmailToClient,
    sendNotificationEmailToAdmin
} from '../utils/email_and_pdf.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const formData = req.body;
  const ugovor_type = formData['ugovor_type'];
  let total_price;
  let specificTable;
  let client_name = '';
  let client_address = '';
  let client_id = '';
  
  if (!ugovor_type) {
    return res.status(400).json({ error: 'Missing ugovor_type field' });
  }

  // Odredjivanje cene, tabele i klijentovih podataka na osnovu tipa ugovora
  switch (ugovor_type) {
    case 'Ugovor o povjerljivosti (NDA)':
      total_price = 29;
      specificTable = 'orders_ugovor_o_povjerljivosti_nda';
      if (formData['tip_ugovora'] === 'Jednostrani') {
          client_name = formData['naziv_strane_koja_prima'];
          client_address = formData['adresa_strane_koja_prima'];
          client_id = formData['id_broj_strane_koja_prima'];
      } else {
          client_name = formData['naziv_strane_a'];
          client_address = formData['adresa_strane_a'];
          client_id = formData['id_broj_strane_a'];
      }
      break;
    case 'Ugovor o djelu':
      total_price = 59;
      specificTable = 'orders_ugovor_o_djelu';
      client_name = formData['naziv_narucioca'];
      client_address = formData['adresa_narucioca'];
      client_id = formData['id_broj_narucioca'];
      break;
    case 'Ugovor o zakupu':
      total_price = 79;
      specificTable = 'orders_ugovor_o_zakupu';
      client_name = formData['naziv_zakupca'];
      client_address = formData['adresa_zakupca'];
      client_id = formData['id_broj_zakupca'];
      break;
    case 'Ugovor o radu':
      total_price = 99;
      specificTable = 'orders_ugovor_o_radu';
      client_name = formData['ime_i_prezime_zaposlenog'];
      client_address = formData['adresa_zaposlenog'];
      client_id = formData['jmbg_zaposlenog'];
      break;
    case 'Set dokumenata za registraciju firme (DOO)':
      total_price = 199;
      specificTable = 'orders_set_za_firmu_doo';
      client_name = formData['ime_osnivaca_1'];
      client_address = formData['adresa_osnivaca_1'];
      client_id = formData['id_osnivaca_1'];
      break;
    default:
      return res.status(400).json({ error: 'Invalid ugovor_type' });
  }
  
  const client_email = formData['client_email'] || formData['e_mail_adresa'];

  if (!client_email || !ugovor_type || !total_price) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1. Unos u glavnu orders tabelu
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert([{ client_email, ugovor_type, total_price }])
      .select('id, order_number');

    if (orderError) {
      console.error('Greska pri unosu u orders tabelu:', orderError);
      return res.status(500).json({ error: 'Database insertion error' });
    }
    
    const order_id = orderData[0].id;
    const order_number = orderData[0].order_number;
    
    // 2. Unos u specificnu tabelu na osnovu ugovor_type
    const specificData = { order_id, ...formData };
    delete specificData['ugovor_type']; // Ukloni polje jer je već u `orders` tabeli

    const { error: specificError } = await supabase
      .from(specificTable)
      .insert([specificData]);

    if (specificError) {
      console.error(`Greska pri unosu u ${specificTable} tabelu:`, specificError);
      return res.status(500).json({ error: 'Database insertion error' });
    }

    // 3. Slanje e-mailova (koristeći centralizovane funkcije)
    const emailResult = await sendConfirmationEmailToClient(client_email, ugovor_type, total_price, order_id, order_number, client_name, client_address, client_id);
    if (!emailResult.success) {
        console.error('Greska pri slanju e-maila klijentu:', emailResult.error);
    }

    const adminEmailResult = await sendNotificationEmailToAdmin(ugovor_type, order_id, order_number, formData);
    if (!adminEmailResult.success) {
        console.error('Greska pri slanju e-maila administratoru:', adminEmailResult.error);
    }
    
    // 4. Redirect
    res.writeHead(302, {
      'Location': `/placanje.html?cijena=${total_price}&ugovor=${encodeURIComponent(ugovor_type)}`,
      'Content-Type': 'text/plain',
    });
    res.end('Redirecting to payment...');
    
  } catch (err) {
    console.error('Neocekivana greska:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
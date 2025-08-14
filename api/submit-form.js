// api/submit-form.js

import { createClient } from '@supabase/supabase-js';
import { 
    sendConfirmationEmailToClient,
    sendNotificationEmailToAdmin
} from '../utils/email_and_pdf.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const PRICES = {
    'Ugovor o povjerljivosti (NDA)': 29,
    'Ugovor o djelu': 59,
    'Ugovor o zakupu': 79,
    'Ugovor o radu': 99,
    'Set dokumenata za registraciju firme (DOO)': 199
};

const booleanFields = [
    'ugovorena_kazna', 'isporuka_definisana', 'je_autorsko_djelo', 
    'pristup_povjerljivim_info', 'definisan_proces_revizije', 'definisan_depozit', 
    'definisana_indeksacija', 'dozvoljen_podzakup', 'rad_na_daljinu', 
    'definisan_probni_rad', 'definisana_zabrana_konkurencije', 
    'zelite_li_spoljnotrgovinske_poslove', 'samostalni_direktor', 
    'zelite_li_odb_dir', 'prokurista'
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // ISPRAVKA: Koristimo req.body umjesto req.json()
    const formData = req.body;
    const ugovor_type = formData['ugovor_type'];

    if (!ugovor_type || !PRICES[ugovor_type]) {
        return res.status(400).json({ error: 'Invalid or missing ugovor_type' });
    }

    const total_price = PRICES[ugovor_type];
    const client_email = formData['client_email'] || formData['e_mail_adresa'];

    if (!client_email) {
        return res.status(400).json({ error: 'Missing client email' });
    }

    booleanFields.forEach(field => {
        if (formData.hasOwnProperty(field)) {
            formData[field] = formData[field] === 'Da';
        }
    });

    const cleanFormData = { ...formData };
    delete cleanFormData.terms_acceptance;

    const { data: orderData, error: rpcError } = await supabase.rpc('create_order', {
        p_client_email: client_email,
        p_ugovor_type: ugovor_type,
        p_total_price: total_price,
        p_form_data: cleanFormData
    });

    if (rpcError) {
        console.error('RPC Error:', rpcError);
        return res.status(500).json({ error: 'Database transaction failed.' });
    }
    
    const { id: order_id, order_number } = orderData[0];
    
    await sendConfirmationEmailToClient(client_email, ugovor_type, total_price, order_id, order_number, formData);
    await sendNotificationEmailToAdmin(ugovor_type, order_id, order_number, formData);
    
    return res.status(200).json({ 
        success: true, 
        redirectUrl: `/placanje.html?cijena=${total_price}&ugovor=${encodeURIComponent(ugovor_type)}` 
    });
    
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

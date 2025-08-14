// api/get-invoice-data.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Pomoćna funkcija za izvlačenje podataka, ista kao u email_and_pdf.js
function getClientInfo(formData) {
    const ugovorType = formData.ugovor_type;
    let client_name = 'N/A';
    let client_address = 'N/A';
    let client_id = 'N/A';

    switch (ugovorType) {
        case 'Ugovor o povjerljivosti (NDA)':
            client_name = formData.tip_ugovora === 'Jednostrani' ? formData.naziv_strane_koja_prima : formData.naziv_strane_a;
            client_address = formData.tip_ugovora === 'Jednostrani' ? formData.adresa_strane_koja_prima : formData.adresa_strane_a;
            client_id = formData.tip_ugovora === 'Jednostrani' ? formData.id_broj_strane_koja_prima : formData.id_broj_strane_a;
            break;
        case 'Ugovor o djelu':
            client_name = formData.naziv_narucioca;
            client_address = formData.adresa_narucioca;
            client_id = formData.id_broj_narucioca;
            break;
        case 'Ugovor o zakupu':
            client_name = formData.naziv_zakupca;
            client_address = formData.adresa_zakupca;
            client_id = formData.id_broj_zakupca;
            break;
        case 'Ugovor o radu':
            client_name = formData.ime_i_prezime_zaposlenog;
            client_address = formData.adresa_zaposlenog;
            client_id = formData.jmbg_zaposlenog;
            break;
        case 'Set dokumenata za registraciju firme (DOO)':
            client_name = formData.ime_osnivaca_1;
            client_address = formData.adresa_osnivaca_1;
            client_id = formData.id_osnivaca_1;
            break;
    }
    return { client_name, client_address, client_id };
}


export default async function handler(req, res) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: 'Order ID is required' });
    }

    try {
        const { data: order, error } = await supabase
            .from('orders')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !order) {
            throw new Error('Order not found');
        }

        // Izvlačimo informacije o klijentu iz JSONB polja
        const client_info = getClientInfo(order.form_data);
        
        // Pripremamo podatke za slanje, bez kompletnog form_data radi privatnosti
        const responseData = {
            order_number: order.order_number,
            created_at: order.created_at,
            ugovor_type: order.ugovor_type,
            total_price: order.total_price,
            client_info: client_info
        };

        res.status(200).json(responseData);

    } catch (error) {
        res.status(404).json({ error: error.message });
    }
}

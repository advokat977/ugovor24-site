import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Glavna funkcija koja se izvršava kada neko popuni formular
export default async function handler(
    req: VercelRequest,
    res: VercelResponse,
) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end('Method Not Allowed');
    }

    try {
        const payload = req.body;
        const nda_podaci = payload.nda_podaci;

        // Proveravamo da li su svi neophodni podaci popunjeni
        const requiredFields = [
            'email_klijenta',
            'nda_podaci.tip_nda',
            'nda_podaci.strana_a_naziv',
            'nda_podaci.strana_b_naziv',
            'nda_podaci.svrha_otkrivanja'
        ];

        for (const field of requiredFields) {
            let value = payload;
            let path = field.split('.');
            for (let part of path) {
                value = value[part];
                if (value === undefined || value === null || value === '') {
                    return res.status(400).json({ error: `Nedostaje obavezni podatak: ${field}` });
                }
            }
        }

        const supabaseUrl = process.env.SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        let porudzbina_id: number | null = null;
        let porudzbina_uid: string | null = null;

        try {
            // Korak 1: Kreiranje nove porudžbine u glavnoj tabeli
            const { data: porudzbinaData, error: porudzbinaError } = await supabase
                .from('porudzbine')
                .insert([{
                    tip_ugovora: payload.tip_ugovora,
                    cijena: payload.cijena,
                    email_klijenta: payload.email_klijenta,
                    status: 'čeka uplatu'
                }])
                .select('id, porudzbina_uid')
                .single();

            if (porudzbinaError) {
                throw porudzbinaError;
            }

            porudzbina_id = porudzbinaData.id;
            porudzbina_uid = porudzbinaData.porudzbina_uid;

            // Korak 2: Unos specifičnih podataka za NDA u drugu tabelu
            const { error: ndaError } = await supabase
                .from('nda_podaci')
                .insert([{
                    porudzbina_id: porudzbina_id,
                    tip_nda: nda_podaci.tip_nda,
                    strana_a_naziv: nda_podaci.strana_a_naziv,
                    strana_a_adresa: nda_podaci.strana_a_adresa,
                    strana_a_id_broj: nda_podaci.strana_a_id_broj,
                    strana_b_naziv: nda_podaci.strana_b_naziv,
                    strana_b_adresa: nda_podaci.strana_b_adresa,
                    strana_b_id_broj: nda_podaci.strana_b_id_broj,
                    svrha_otkrivanja: nda_podaci.svrha_otkrivanja,
                    period_trajanja_godine: nda_podaci.period_trajanja_godine,
                    ima_ugovornu_kaznu: nda_podaci.ima_ugovornu_kaznu,
                    iznos_kazne: nda_podaci.iznos_kazne
                }]);

            if (ndaError) {
                throw ndaError;
            }

            // Korak 3: Ako je sve uspešno, šaljemo odgovor nazad sajtu
            return res.status(200).json({
                porudzbina_uid: porudzbina_uid,
                message: 'Porudžbina je uspešno kreirana. Pređite na plaćanje.'
            });
        } catch (dbError) {
            if (porudzbina_id) {
                await supabase.from('porudzbine').delete().eq('id', porudzbina_id);
                console.error('Izvršeno brisanje porudžbine zbog greške u transakciji:', porudzbina_id);
            }
            console.error('Greška pri obradi baze podataka:', dbError);
            return res.status(500).json({ error: 'Došlo je do greške pri čuvanju podataka. Molimo pokušajte ponovo.' });
        }

    } catch (e) {
        console.error('Greška u serverless funkciji:', e);
        return res.status(500).json({ error: 'Došlo je do interne greške servera. Proverite logove.' });
    }
}

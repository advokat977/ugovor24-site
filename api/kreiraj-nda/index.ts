// LOKACIJA: /api/kreiraj-nda/index.ts

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Definišemo kakve podatke očekujemo od klijenta
interface NdaPayload {
    tip_ugovora: string;
    cijena: number;
    email_klijenta: string;
    nda_podaci: {
        tip_nda: 'jednostrani' | 'obostrani';
        strana_a_naziv: string;
        strana_a_adresa: string;
        strana_a_id_broj: string;
        strana_b_naziv: string;
        strana_b_adresa: string;
        strana_b_id_broj: string;
        svrha_otkrivanja: string;
        period_trajanja_godine: number;
        ima_ugovornu_kaznu: boolean;
        iznos_kazne?: number | null;
    }
}

// Glavna funkcija - naš "Robot Prijemničar"
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const payload: NdaPayload = req.body;

    // Validacija osnovnih podataka
    if (!payload.email_klijenta || !payload.nda_podaci) {
        return res.status(400).json({ error: 'Nedostaju osnovni podaci.' });
    }

    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Korak 1: Kreiranje nove porudžbine u glavnoj tabeli
    const { data: porudzbinaData, error: porudzbinaError } = await supabase
      .from('porudzbine')
      .insert({
        tip_ugovora: payload.tip_ugovora,
        cijena: payload.cijena,
        email_klijenta: payload.email_klijenta,
        status: 'čeka uplatu'
      })
      .select('id, porudzbina_uid')
      .single();

    if (porudzbinaError) {
      console.error('Supabase porudzbina greska:', porudzbinaError);
      throw new Error('Greška pri kreiranju osnovne porudžbine.');
    }

    const porudzbina_id = porudzbinaData.id;

    // Korak 2: Unos specifičnih podataka za NDA
    const { error: ndaError } = await supabase
      .from('nda_podaci')
      .insert({
        porudzbina_id: porudzbina_id,
        ...payload.nda_podaci // Magija: Raspakujemo sve podatke iz nda_podaci objekta
      });

    if (ndaError) {
      // Ako drugi upis ne uspije, brišemo prvi
      await supabase.from('porudzbine').delete().eq('id', porudzbina_id);
      console.error('Supabase NDA podaci greska:', ndaError);
      throw new Error('Greška pri čuvanju detalja ugovora.');
    }

    // Korak 3: Ako je sve uspešno, šaljemo odgovor
    return res.status(200).json({
      porudzbina_uid: porudzbinaData.porudzbina_uid,
      message: 'Porudžbina je uspešno kreirana.'
    });

  } catch (e) {
    const error = e as Error;
    console.error('Generalna greška u funkciji:', error);
    return res.status(500).json({ error: 'Došlo je do interne greške servera.', details: error.message });
  }
}

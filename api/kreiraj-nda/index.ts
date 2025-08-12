// OVAJ FAJL SE NALAZI NA LOKACIJI: /api/kreiraj-nda/index.ts
// Vercel automatski prepoznaje ovu strukturu i kreira API endpoint.

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Definišemo kakve podatke očekujemo da dobijemo od klijenta (iz upitnika)
interface NdaRequestBody {
    email_klijenta: string;
    tip_nda: 'jednostrani' | 'obostrani';
    podaci_strane_a: object;
    podaci_strane_b: object;
    svrha_otkrivanja: string;
    period_trajanja_godine: number;
    ima_ugovornu_kaznu: boolean;
    iznos_kazne?: number | null;
}

// Glavna funkcija - naš "Robot Prijemničar"
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // Dozvoljavamo samo POST metod.
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    // 1. PRIJEM PODATAKA
    const data: NdaRequestBody = req.body;

    // Osnovna validacija
    if (!data.email_klijenta || !data.tip_nda || !data.podaci_strane_a || !data.svrha_otkrivanja) {
        return res.status(400).json({ error: 'Nedostaju obavezni podaci.' });
    }

    // 2. KONEKCIJA SA BAZOM
    // Koristimo tajne ključeve iz Vercel "sefa"
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 3. UPIS U BAZU
    // Prvo, upisujemo osnovne podatke u glavnu tabelu 'porudzbine'
    const { data: porudzbinaData, error: porudzbinaError } = await supabase
      .from('porudzbine')
      .insert({
        tip_ugovora: 'NDA',
        cijena: 29,
        status: 'čeka uplatu',
        email_klijenta: data.email_klijenta,
      })
      .select('id, porudzbina_uid')
      .single();

    if (porudzbinaError) {
      throw porudzbinaError;
    }

    // Zatim, upisujemo specifične podatke u 'nda_podaci'
    const { error: ndaError } = await supabase
      .from('nda_podaci')
      .insert({
        porudzbina_id: porudzbinaData.id,
        tip_nda: data.tip_nda,
        podaci_strane_a: data.podaci_strane_a, // Upisujemo kompletan objekat
        podaci_strane_b: data.podaci_strane_b, // Upisujemo kompletan objekat
        svrha_otkrivanja: data.svrha_otkrivanja,
        period_trajanja_godine: data.period_trajanja_godine,
        ima_ugovornu_kaznu: data.ima_ugovornu_kaznu,
        iznos_kazne: data.iznos_kazne,
      });

    if (ndaError) {
      // Ako drugi upis ne uspije, brišemo prvi da ne ostane "siroče"
      await supabase.from('porudzbine').delete().eq('id', porudzbinaData.id);
      throw ndaError;
    }

    // 4. SLANJE ODGOVORA
    // Vraćamo uspješan odgovor i jedinstveni ID porudžbine.
    return res.status(200).json({ 
        message: 'Porudžbina uspješno kreirana.',
        porudzbina_uid: porudzbinaData.porudzbina_uid 
    });

  } catch (error) {
    console.error('Greška prilikom kreiranja porudžbine:', error);
    const errorMessage = error instanceof Error ? error.message : 'Nepoznata greška';
    return res.status(500).json({ error: 'Došlo je do interne greške na serveru.', details: errorMessage });
  }
}

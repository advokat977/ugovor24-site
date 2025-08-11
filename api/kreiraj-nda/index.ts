// OVAJ FAJL SE NALAZI NA LOKACIJI: /api/kreiraj-nda/index.ts
// Vercel automatski prepoznaje ovu strukturu i kreira API endpoint.

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Definišemo kakve podatke očekujemo da dobijemo od klijenta (iz upitnika)
// Ovo je TypeScript, pomaže nam da izbjegnemo greške.
interface NdaRequestBody {
    email_klijenta: string;
    tip_nda: 'jednostrani' | 'obostrani';
    podaci_strane_a: object;
    podaci_strane_b?: object; // Opciono, samo za obostrani
    svrha_otkrivanja: string;
    period_trajanja_godine: number;
    ima_ugovornu_kaznu: boolean;
    iznos_kazne?: number; // Opciono
    mjesto_zakljucenja: string;
}

// Glavna funkcija - naš "Robot Prijemničar"
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // Dozvoljavamo samo POST metod. Ako neko pokuša da pristupi drugačije, vraćamo grešku.
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    // 1. PRIJEM I VALIDACIJA PODATAKA
    const data: NdaRequestBody = req.body;

    // Osnovna validacija - provjeravamo da li su ključni podaci tu
    if (!data.email_klijenta || !data.tip_nda || !data.podaci_strane_a || !data.svrha_otkrivanja) {
        return res.status(400).json({ error: 'Nedostaju obavezni podaci.' });
    }

    // 2. KONEKCIJA SA BAZOM
    // Kreiramo sigurnu konekciju sa Supabase bazom.
    // Ovi ključevi se NIKADA ne upisuju direktno u kod.
    // Čitaju se iz sigurnog "sefa" na Vercelu (Environment Variables).
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // VAŽNO: Koristimo SERVICE_ROLE ključ!

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 3. UPIS U BAZU (TRANSAKCIJA)
    // Koristimo "transakciju" da bismo osigurali da se oba upisa dese uspješno.
    // Ako drugi upis ne uspije, prvi će biti poništen. Ovo čuva integritet podataka.
    // Najbolja praksa je da se ovo radi kroz RPC funkciju u samoj bazi, ali za početak je i ovo sigurno.

    // Prvo, upisujemo osnovne podatke u glavnu tabelu 'porudzbine'
    const { data: porudzbinaData, error: porudzbinaError } = await supabase
      .from('porudzbine')
      .insert({
        tip_ugovora: 'NDA',
        cijena: 29, // Fiksna cijena za NDA
        status: 'čeka uplatu',
        email_klijenta: data.email_klijenta,
      })
      .select()
      .single();

    if (porudzbinaError) {
      // Ako upis u prvu tabelu ne uspije, bacamo grešku.
      throw porudzbinaError;
    }

    // Zatim, ako je prvi upis uspio, upisujemo specifične podatke u 'nda_podaci'
    const { error: ndaError } = await supabase
      .from('nda_podaci')
      .insert({
        porudzbina_id: porudzbinaData.id, // Povezujemo sa ID-jem iz prve tabele
        tip_nda: data.tip_nda,
        podaci_strane_a: data.podaci_strane_a,
        podaci_strane_b: data.podaci_strane_b,
        svrha_otkrivanja: data.svrha_otkrivanja,
        period_trajanja_godine: data.period_trajanja_godine,
        ima_ugovornu_kaznu: data.ima_ugovornu_kaznu,
        iznos_kazne: data.iznos_kazne,
      });

    if (ndaError) {
      // Ako drugi upis ne uspije, moramo obrisati prvi da ne ostane "siroče"
      await supabase.from('porudzbine').delete().eq('id', porudzbinaData.id);
      throw ndaError;
    }

    // 4. SLANJE ODGOVORA
    // Ako je sve prošlo kako treba, vraćamo uspješan odgovor i jedinstveni ID porudžbine.
    // Na osnovu ovog ID-ja, sajt će preusmjeriti klijenta na stranicu za plaćanje.
    return res.status(201).json({ 
        message: 'Porudžbina uspješno kreirana.',
        porudzbina_uid: porudzbinaData.porudzbina_uid 
    });

  } catch (error) {
    console.error('Greška prilikom kreiranja porudžbine:', error);
    return res.status(500).json({ error: 'Došlo je do interne greške na serveru.' });
  }
}

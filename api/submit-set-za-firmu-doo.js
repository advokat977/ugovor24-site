// api/submit-set-za-firmu-doo.js

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Master templejti za ugovore (kao JS stringovi)
const masterTemplates = {
    'Set dokumenata za registraciju firme (DOO)': `
    Ugovor24.com - Revidirani upitnik za osnivanje i registraciju DOO (199 EUR paket)
    Molimo Vas da popunite ovaj upitnik sa svim potrebnim informacijama.
    Vaši odgovori omogućiće nam da automatski generišemo sve neophodne dokumente za osnivanje Vašeg društva sa ograničenom odgovornošću (DOO), u skladu sa relevantnim propisima i najboljim praksama.
    
    SEKCIJA 1: OSNOVNI PODACI O FIRMI
    Naziv privrednog društva:
    Puni naziv: {{naziv_firme}}
    Skraćeni naziv (opciono): {{skraceni_naziv_firme}}
    Adrese firme u Crnoj Gori:
    Adresa sjedišta: {{adresa_sjedista}}
    Adresa za službeni prijem pošte (opciono, može biti ista kao sjedište): {{adresa_za_postu}}
    Adresa za prijem elektronske pošte (obavezno): {{e_mail_adresa}}
    Djelatnosti društva:
    Opis pretežne djelatnosti: {{opis_pretezne_djelatnosti}}
    Da li želite da se firma bavi i spoljnotrgovinskim prometom i drugim srodnim djelatnostima (posredovanje, komisioni poslovi, zastupanje stranih firmi, itd.)?: {{zelite_li_spoljnotrgovinske_poslove}}
    Osnovni kapital:
    Željeni iznos osnovnog kapitala: {{iznos_kapitala}} EUR
    
    SEKCIJA 2: PODACI O OSNIVAČIMA
    Osnivač 1:
    Tip osnivača: {{tip_osnivaca_1}}
    Ime i prezime / Pun naziv firme: {{ime_osnivaca_1}}
    Identifikacioni broj: {{id_osnivaca_1}}
    Adresa prebivališta / Adresa sjedišta: {{adresa_osnivaca_1}}
    Vrsta uloga: {{vrsta_uloga_1}}
    Vrijednost uloga: {{vrijednost_uloga_1}} EUR
    Opis nenovčanog uloga: {{opis_nenovcanog_uloga_1}}
    
    SEKCIJA 3: PODACI O IZVRŠNOM DIREKTORU I ODBORU DIREKTORA
    Ime i prezime izvršnog direktora: {{ime_direktora}}
    Identifikacioni broj izvršnog direktora: {{id_direktora}}
    Da li želite da izvršni direktor zastupa firmu samostalno, neograničeno i bez Odbora direktora? (DA/NE): {{samostalni_direktor}}
    Ukoliko ne, molimo Vas da navedete ovlašćenja za zastupanje: {{detalji_ovlascenja}}
    Da li želite da firma ima Odbor direktora? (DA/NE): {{zelite_li_odb_dir}}
    Ukoliko DA, molimo Vas da navedete imena i ID brojeve članova Odbora direktora: {{clanovi_odbora_direktora}}
    Da li želite da imenujete prokuristu? (DA/NE): {{prokurista}}
    Ako DA, ime i ID broj prokuriste: {{ime_i_id_prokuriste}}

    SEKCIJA 4: DODATNA PITANJA
    Da li postoji neko posebno pravilo koje želite da uvrstimo u Statut (npr. o načinu prenosa udjela, raspodjeli dobiti, itd.)?: {{dodatne_odredbe_statuta}}
    Procijenjeni troškovi osnivanja koje će društvo isplatiti osnivaču (opciono, molimo navedite iznos): {{procijenjeni_troskovi_osnivanja}} EUR
    `
};

async function generateContractDraft(orderId, ugovorType, contractData) {
    const template = masterTemplates[ugovorType];
    
    if (!template) {
        return { error: 'Template for this contract type not found' };
    }
    
    // Priprema prompta za Gemini AI
    const prompt = `Ti si stručni advokat iz Crne Gore. Na osnovu priloženih podataka i master templejta, generiši nacrt dokumenata za registraciju DOO.

    Pravni kontekst:
    - Pravo Crne Gore
    - Sudska praksa Crne Gore i EU
    - Najbolje prakse EU

    Podaci za ugovor: ${JSON.stringify(contractData)}

    Master template:
    ${template}

    Molim te, vrati mi samo konačan tekst dokumenata, sa popunjenim podacima i uklonjenim placeholderima poput {{#if...}}, u formatu pogodnom za kopiranje i finalizaciju. Ne dodaj nikakav uvodni ili zaključni tekst, samo čisti tekst dokumenata.`;

    const result = await model.generateContent(prompt);
    const generatedDraft = result.response.text();
    
    // Ažuriranje narudžbine u bazi sa generisanim nacrtom
    const { error: updateError } = await supabase
        .from('orders')
        .update({ generated_draft: generatedDraft, is_draft_generated: true })
        .eq('id', orderId);

    if (updateError) {
        console.error('Greška pri ažuriranju narudžbine:', updateError);
        return { error: 'Database update error' };
    }
    
    return { success: true };
}

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
    
    // 2. Unos specifičnih podataka u 'orders_set_za_firmu_doo' tabelu
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
    
    // 3. Pokretanje AI generisanja (automatski)
    const generationResult = await generateContractDraft(order_id, ugovor_type, formData);
    
    if (generationResult.error) {
        console.error('Greška pri generisanju nacrta:', generationResult.error);
    }
    
    // 4. Preusmjeravanje klijenta na stranicu za plaćanje
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

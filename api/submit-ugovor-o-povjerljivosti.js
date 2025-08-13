// api/submit-ugovor-o-povjerljivosti.js

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
    'Ugovor o povjerljivosti (NDA)': `UGOVOR O POVJERLJIVOSTI
Zaključen u {{mjesto_zakljucenja}}, dana {{datum_zakljucenja}} godine, između:
{{#if je_obostrano}}
1.  **{{naziv_strane_a}}**, sa sjedištem/prebivalištem na adresi {{adresa_strane_a}}, JMBG/PIB: {{id_broj_strane_a}}, i
2.  **{{naziv_strane_b}}**, sa sjedištem/prebivalištem na adresi {{adresa_strane_b}}, JMBG/PIB: {{id_broj_strane_b}},
    (u daljem tekstu zajedno označeni kao "Strane", a pojedinačno kao "Strana").
{{else}}
1.  **{{naziv_strane_koja_otkriva}}**, sa sjedištem/prebivalištem na adresi {{adresa_strane_koja_otkriva}}, JMBG/PIB: {{id_broj_strane_koja_otkriva}} (u daljem tekstu: Strana koja otkriva), i
2.  **{{naziv_strane_koja_prima}}**, sa sjedištem/prebivalištem na adresi {{adresa_strane_koja_prima}}, JMBG/PIB: {{id_broj_strane_koja_prima}} (u daljem tekstu: Strana koja prima).
{{/if}}

PREAMBULA
{{#if je_obostrano}}
Ugovorne strane namjeravaju da razmijene određene povjerljive informacije u svrhu {{svrha_otkrivanja}} (u daljem tekstu: Svrha). Ovaj Ugovor se zaključuje kako bi se zaštitile te povjerljive informacije od neovlašćenog otkrivanja ili korišćenja.
{{else}}
Strana koja otkriva namjerava da Strani koja prima otkrije određene povjerljive informacije u svrhu {{svrha_otkrivanja}} (u daljem tekstu: Svrha). Ovaj Ugovor se zaključuje kako bi se zaštitile te povjerljive informacije od neovlašćenog otkrivanja ili korišćenja od strane Strane koja prima.
{{/if}}

Član 1: Definicija Povjerljivih Informacija
1.  "Povjerljive informacije" označavaju sve nejavne informacije, bez obzira na formu, koje jedna Strana otkrije drugoj, a koje su označene kao "povjerljive". 2. Povjerljive informacije uključuju, ali se ne ograničavaju na: poslovne planove, finansijske podatke, liste klijenata, marketinške strategije, tehničke podatke, softverski kod, patente, izume, poslovne tajne, know-how, i sve druge informacije koje nisu javno dostupne.
3. Povjerljive informacije uključuju i sve analize, kompilacije, studije ili druge dokumente koje pripremi Strana koja prima, a koji sadrže informacije koje je otkrila Strana koja otkriva.

Član 2: Obaveze Strane koja Prima
Strana koja prima se obavezuje da će: a) Čuvati Povjerljive informacije u strogoj tajnosti. b) Koristiti Povjerljive informacije isključivo i samo u Svrhu definisanu u Preambuli ovog Ugovora. c) Ograničiti pristup Povjerljivim informacijama isključivo na svoje zaposlene, saradnike ili savjetnike. d) U slučaju da sazna za bilo kakvo neovlašćeno otkrivanje, o tome odmah obavijestiti Stranu koja otkriva.

Član 3: Izuzeci od Povjerljivosti
Obaveze iz člana 2. neće se primjenjivati na informacije za koje Strana koja prima može dokazati da: a) su bile javno poznate u trenutku otkrivanja; b) su bile u posjedu Strane koja prima prije otkrivanja; c) su zakonito dobijene od trećeg lica; d) su samostalno razvijene od strane Strane koja prima; e) moraju biti otkrivene na osnovu zakona, sudskog naloga ili naloga drugog nadležnog organa.

Član 4: Trajanje Obaveze
Obaveza čuvanja povjerljivosti traje za vrijeme od {{period_trajanja_obaveze}} godina od dana zaključenja ovog Ugovora. Obaveza čuvanja povjerljivosti za informacije koje predstavljaju poslovnu tajnu traje sve dok te informacije imaju karakter poslovne tajne.

Član 5: Povrat ili Uništenje Informacija
Na pisani zahtjev Strane koja otkriva, Strana koja prima je dužna da vrati sve originale i kopije Povjerljivih informacija ili da ih uništi i o tome dostavi pisanu potvrdu.

Član 6: Vlasništvo nad Informacijama
Sve Povjerljive informacije ostaju isključivo vlasništvo Strane koja otkriva. Ovaj Ugovor ne podrazumijeva prenos bilo kakvog prava, licence ili vlasništva nad Povjerljivim informacijama.

Član 7: Bez Garancija
Strana koja otkriva ne daje nikakve garancije u pogledu tačnosti, potpunosti ili pouzdanosti Povjerljivih informacija. Cjelokupan rizik snosi Strana koja prima.

Član 8: Bez Daljih Obaveza
Ovaj Ugovor ne obavezuje nijednu Stranu da uđe u bilo kakav dalji poslovni odnos.

Član 9: Posljedice Povrede Ugovora
Ugovorne strane su saglasne da bi neovlašćeno otkrivanje Povjerljivih informacija nanijelo nenadoknadivu štetu Strani koja otkriva.
{{#if ugovorena_kazna}}
U slučaju povrede obaveze čuvanja povjerljivosti, Strana koja prima se obavezuje da Strani koja otkriva isplati ugovornu kaznu u iznosu od {{iznos_ugovorene_kazne}} € (slovima: {{iznos_ugovorene_kazne_slovima}} eura), bez umanjenja prava Strane koja otkriva da potražuje i naknadu štete koja prevazilazi iznos ugovorne kazne.
{{/if}}

Član 10: Cjelovitost Ugovora (Integralna Volja)
Odredbe ovog Ugovora predstavljaju cjelokupnu volju ugovornih strana i sadrže sve o čemu su se ugovarači sporazumjeli.

Član 11: Rješavanje Sporova
Ugovorne strane su saglasne da sve eventualne sporove koji proisteknu iz ovog Ugovora rješavaju sporazumno.
Ukoliko to ne bude moguće, prihvataju nadležnost Osnovnog suda u {{mjesto_suda}}.

Član 12: Završne Odredbe
Na sve odnose ugovornih strana koji nisu obuhvaćeni ovim Ugovorom primjenjivaće se odredbe Zakona o obligacionim odnosima.
Ugovor je sačinjen u 2 (dva) istovjetna primjerka, po jedan za svaku ugovornu stranu.
<br>
{{#if je_obostrano}}
**STRANA A** _________________________ {{naziv_strane_a}}
**STRANA B** _________________________ {{naziv_strane_b}}
{{else}}
**STRANA KOJA OTKRIVA** _________________________ {{naziv_strane_koja_otkriva}}
**STRANA KOJA PRIMA** _________________________ {{naziv_strane_koja_prima}}
{{/if}}`,
};

async function generateContractDraft(orderId, ugovorType, contractData) {
    const template = masterTemplates[ugovorType];
    
    if (!template) {
        return { error: 'Template for this contract type not found' };
    }
    
    // Priprema prompta za Gemini AI
    const prompt = `Ti si stručni advokat iz Crne Gore. Na osnovu priloženih podataka i master templejta, generiši nacrt ugovora.
    
    Pravni kontekst:
    - Pravo Crne Gore
    - Sudska praksa Crne Gore i EU
    - Najbolje prakse EU
    
    Podaci za ugovor: ${JSON.stringify(contractData)}
    
    Master template:
    ${template}
    
    Molim te, vrati mi samo konačan tekst ugovora, sa popunjenim podacima i uklonjenim placeholderima poput {{#if...}}, u formatu pogodnom za kopiranje i finalizaciju. Ne dodaj nikakav uvodni ili zaključni tekst, samo čisti tekst ugovora.`;

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

  const client_email = formData['client_email'];
  const ugovor_type = 'Ugovor o povjerljivosti (NDA)';
  const total_price = 29; // Cijena ugovora

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
    
    // 2. Unos specifičnih podataka u 'orders_ugovor_o_povjerljivosti_nda' tabelu
    const { error: specificError } = await supabase
      .from('orders_ugovor_o_povjerljivosti_nda')
      .insert([
        { 
          order_id: order_id,
          tip_ugovora: formData['tip_ugovora'],
          naziv_strane_koja_otkriva: formData['naziv_strane_koja_otkriva'] || null,
          adresa_strane_koja_otkriva: formData['adresa_strane_koja_otkriva'] || null,
          id_broj_strane_koja_otkriva: formData['id_broj_strane_koja_otkriva'] || null,
          naziv_strane_koja_prima: formData['naziv_strane_koja_prima'] || null,
          adresa_strane_koja_prima: formData['adresa_strane_koja_prima'] || null,
          id_broj_strane_koja_prima: formData['id_broj_strane_koja_prima'] || null,
          naziv_strane_a: formData['naziv_strane_a'] || null,
          adresa_strane_a: formData['adresa_strane_a'] || null,
          id_broj_strane_a: formData['id_broj_strane_a'] || null,
          naziv_strane_b: formData['naziv_strane_b'] || null,
          adresa_strane_b: formData['adresa_strane_b'] || null,
          id_broj_strane_b: formData['id_broj_strane_b'] || null,
          mjesto_zakljucenja: formData['mjesto_zakljucenja'],
          datum_zakljucenja: formData['datum_zakljucenja'],
          svrha_otkrivanja: formData['svrha_otkrivanja'],
          period_trajanja_obaveze: formData['period_trajanja_obaveze'],
          ugovorena_kazna: formData['ugovorena_kazna'] === 'Da',
          iznos_ugovorene_kazne: formData['iznos_ugovorene_kazne'] || null
        }
      ]);

    if (specificError) {
      console.error('Greška pri unosu u orders_ugovor_o_povjerljivosti_nda tabelu:', specificError);
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

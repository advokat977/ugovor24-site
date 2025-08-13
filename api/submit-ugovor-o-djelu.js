// api/submit-ugovor-o-djelu.js

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Resend } from 'resend';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Supabase URL i anonimni ključ se uzimaju iz Vercel varijabli okruženja
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Master templejti za ugovore (kao JS stringovi)
const masterTemplates = {
    'Ugovor o djelu': `UGOVOR O DJELU
Zaključen u {{mjesto_zakljucenja}}, dana {{datum_zakljucenja}} godine, između:
1.  **Naručioca posla:** {{naziv_narucioca}}, sa sjedištem/prebivalištem na adresi {{adresa_narucioca}}, JMBG/PIB: {{id_broj_narucioca}} (u daljem tekstu: Naručilac), i
2.  **Izvršioca posla:** {{naziv_izvrsioca}}, sa sjedištem/prebivalištem na adresi {{adresa_izvrsioca}}, JMBG/PIB: {{id_broj_izvrsioca}} (u daljem tekstu: Izvršilac).

PREAMBULA
Imajući u vidu zajedničke poslovne interese, ugovorne strane ovim Ugovorom uspostavljaju ugovorni odnos povodom angažovanja Izvršioca na poslovima opisanim u članu 1. ovog Ugovora, te regulišu prava i obaveze koje po tom osnovu proizilaze.

Član 1: Predmet Ugovora
Izvršilac se obavezuje da za Naručioca, po njegovim uputstvima i zahtjevima, izvrši sljedeći posao: {{predmet_ugovora}} (u daljem tekstu: Djelo).

Član 2: Rok i Način Isporuke
Izvršilac se obavezuje da posao iz člana 1. ovog Ugovora završi u potpunosti i preda Naručiocu najkasnije do {{rok_zavrsetka}}.
{{#if isporuka_definisana}}
Pod isporukom se podrazumijeva {{definicija_isporuke}}.
{{/if}}

Član 3: Faze Rada, Revizije i Prihvatanje Djela
{{#if definisan_proces_revizije}}
1. Izvršilac će Naručiocu predstaviti početni predlog Djela.
2. Naručilac ima pravo na ukupno {{broj_revizija}} kruga revizija (ispravki) na predlog Djela, koji su uključeni u ugovorenu cijenu. Svaka revizija podrazumijeva set objedinjenih komentara i zahtjeva za izmjenama.
3. Naručilac je dužan da svoje eventualne zahtjeve za izmjenama dostavi Izvršiocu u roku od {{rok_za_feedback}} radna dana od dana prijema predloga. Ukoliko Naručilac u navedenom roku ne dostavi zahtjeve za izmjenama niti obavijesti Izvršioca o prihvatanju predloga, smatraće se da je predlog prećutno prihvaćen.
4. Nakon što Naručilac pisanim putem (putem elektronske pošte) potvrdi da prihvata finalnu verziju Djela, smatra se da je Djelo primljeno i prihvaćeno.
{{/if}}

Član 4: Naknada
Naručilac se obavezuje da Izvršiocu za uredno izvršen i isporučen posao isplati naknadu u ukupnom {{tip_naknade}} iznosu od {{iznos_naknade_broj}} € (slovima: {{iznos_naknade_slovima}} eura).
Isplata će se izvršiti u roku od {{rok_placanja}} dana od dana konačnog prihvatanja Djela u skladu sa članom 3. ovog Ugovora, uplatom na žiro račun Izvršioca broj: {{racun_izvrsioca}} koji se vodi kod {{banka_izvrsioca}}.

Član 5: Autorska Prava
{{#if je_autorsko_djelo}}
1. Izvršilac potvrđuje da je Djelo koje je predmet ovog Ugovora njegovo originalno autorsko djelo.
2. Ugovorenom naknadom iz člana 4. ovog Ugovora, Izvršilac isključivo, trajno i bez prostornog i vremenskog ograničenja prenosi na Naručioca sva imovinska autorska prava na Djelu.
3. Prenos prava iz stava 2. ovog člana obuhvata, ali se ne ograničava na: pravo na umnožavanje, pravo na distribuciju, pravo na javno saopštavanje, pravo na adaptaciju, preradu i druga preoblikovanja Djela, kao i pravo na emitovanje i reemitovanje.
4. Naručilac stiče pravo da Djelo registruje kao žig i da ga koristi u komercijalne i nekomercijalne svrhe bez ikakvih daljih saglasnosti ili naknada Izvršiocu.
5. Izvršilac zadržava svoja moralna autorska prava u skladu sa zakonom, i saglasan je da Naručilac nije u obavezi da prilikom svake upotrebe Djela navodi ime Izvršioca.
{{/if}}

Član 6: Garancija Originalnosti i Zaštita od Pravnih Nedostataka
{{#if je_autorsko_djelo}}
Izvršilac garantuje Naručiocu da je Djelo u cjelosti njegova originalna tvorevina, da nije opterećeno pravima trećih lica, te da njegovom upotrebom Naručilac ne povređuje bilo kakva autorska ili druga prava trećih lica.
{{/if}}

Član 7: Povjerljivost i Zaštita Podataka
{{#if pristup_povjerljivim_info}}
Izvršilac se obavezuje da će sve informacije, podatke i materijale do kojih dođe tokom rada na izradi Djela, a koji se odnose na poslovanje Naručioca, tretirati kao strogu poslovnu tajnu.
{{/if}}

Član 8: Samostalnost Izvršioca
Izvršilac je samostalan u izvršavanju posla i nije u radnom odnosu kod Naručioca.

Član 9: Cjelovitost Ugovora (Integralna Volja)
Odredbe ovog Ugovora predstavljaju cjelokupnu volju ugovornih strana i sadrže sve o čemu su se ugovarači sporazumjeli.

Član 10: Izmjene i Dopune
Izmjene i dopune ovog Ugovora mogu se vršiti isključivo u pisanoj formi, u vidu aneksa koji potpišu obje ugovorne strane.

Član 11: Rješavanje Sporova
Ugovorne strane su saglasne da sve eventualne sporove koji proisteknu iz ovog Ugovora rješavaju sporazumno.
Ukoliko to ne bude moguće, prihvataju nadležnost Osnovnog suda u {{mjesto_suda}}.

Član 12: Završne Odredbe
Na sve odnose ugovornih strana koji nisu obuhvaćeni ovim Ugovorom primjenjivaće se odredbe Zakona o obligacionim odnosima i Zakona o autorskom i srodnim pravima Crne Gore.
Ugovor je sačinjen u 2 (dva) istovjetna primjerka, po jedan za svaku ugovornu stranu.
<br>
**NARUČILAC POSLA** _________________________ {{naziv_narucioca}}
**IZVRŠILAC POSLA** _________________________ {{naziv_izvrsioca}}`,
};

// Generisanje PDF-a sa predracunom
async function generateInvoicePDF(orderId, ugovorType, totalPrice) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]);
    
    // Ugradnja fonta sa podrškom za dijakritičke znakove
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    page.drawText('PREDRACUN', { x: 50, y: 350, size: 24, font: font, color: rgb(0.13, 0.13, 0.13) });
    page.drawText(`Broj narudžbine: ${orderId}`, { x: 50, y: 320, size: 12, font: font });
    page.drawText(`Usluga: ${ugovorType}`, { x: 50, y: 300, size: 12, font: font });
    page.drawText(`Iznos za uplatu: ${totalPrice} €`, { x: 50, y: 280, size: 12, font: font, color: rgb(0, 0.49, 1) });
    
    // Dodavanje instrukcija za placanje
    page.drawText('Instrukcije za plaćanje:', { x: 50, y: 220, size: 14, font: font, color: rgb(0.13, 0.13, 0.13) });
    page.drawText('Primalac: Advokatska kancelarija Dejan Radinović', { x: 50, y: 200, size: 12, font: font });
    page.drawText('Adresa: Božane Vučinić 7-5, 81000 Podgorica, Crna Gora', { x: 50, y: 185, size: 12, font: font });
    page.drawText('Banka: Erste bank AD Podgorica', { x: 50, y: 170, size: 12, font: font });
    page.drawText('Broj računa: 540-0000000011285-46', { x: 50, y: 155, size: 12, font: font });
    
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
}

async function sendConfirmationEmail(clientEmail, ugovorType, totalPrice, orderId) {
    try {
        const invoicePdfBytes = await generateInvoicePDF(orderId, ugovorType, totalPrice);
        
        await resend.emails.send({
            from: 'ugovor24.com <noreply@ugovor24.com>',
            to: clientEmail,
            subject: `Potvrda zahtjeva za ${ugovorType} - ugovor24.com`,
            html: `
                <p>Poštovani/a,</p>
                <p>Ovo je automatska potvrda da je Vaš zahtjev za ${ugovorType} uspješno primljen.</p>
                <p>Nacrt Vašeg ugovora je već u procesu generisanja uz pomoć AI-a i biće spreman za pregled čim Vaša uplata bude proknjižena.</p>
                <p>Molimo izvršite uplatu bankarskim transferom u iznosu od ${totalPrice} €. Predračun sa instrukcijama za plaćanje je u prilogu.</p>
                <p>Nakon što uplata bude proknjižena na našem računu, ugovor će biti pregledan i poslat Vam u roku od 24 časa.</p>
                <p>Srdačan pozdrav,</p>
                <p>Tim ugovor24.com</p>
            `,
            attachments: [
                {
                    filename: `predracun-${orderId}.pdf`,
                    content: Buffer.from(invoicePdfBytes)
                }
            ]
        });
        return { success: true };
    } catch (error) {
        console.error('Greška pri slanju e-maila:', error);
        return { error: 'Failed to send email' };
    }
}

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
  const ugovor_type = 'Ugovor o djelu';
  const total_price = 59;

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

    // 3. Pokretanje AI generisanja (automatski) i slanje e-maila sa predracunom
    const generationResult = await generateContractDraft(order_id, ugovor_type, formData);
    if (generationResult.error) {
        console.error('Greška pri generisanju nacrta:', generationResult.error);
    }
    
    const emailResult = await sendConfirmationEmail(client_email, ugovor_type, total_price, order_id);
    if (emailResult.error) {
        console.error('Greška pri slanju e-maila:', emailResult.error);
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

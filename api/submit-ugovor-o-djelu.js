// api/submit-ugovor-o-djelu.js

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Resend } from 'resend';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Supabase URL i anonimni kljuc se uzimaju iz Vercel varijabli okruzenja
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
Zakljucen u {{mjesto_zakljucenja}}, dana {{datum_zakljucenja}} godine, izmedu:
1.  **Narucioca posla:** {{naziv_narucioca}}, sa sjedistem/prebivalistem na adresi {{adresa_narucioca}}, JMBG/PIB: {{id_broj_narucioca}} (u daljem tekstu: Narucilac), i
2.  **Izvrsioca posla:** {{naziv_izvrsioca}}, sa sjedistem/prebivalistem na adresi {{adresa_izvrsioca}}, JMBG/PIB: {{id_broj_izvrsioca}} (u daljem tekstu: Izvršilac).

PREAMBULA
Imajuci u vidu zajednicke poslovne interese, ugovorne strane ovim Ugovorom uspostavljaju ugovorni odnos povodom angazovanja Izvrsioca na poslovima opisanim u clanu 1. ovog Ugovora, te regulisu prava i obaveze koje po tom osnovu proizilaze.

Clan 1: Predmet Ugovora
Izvršilac se obavezuje da za Narucioca, po njegovim uputstvima i zahtjevima, izvrsi sljedeći posao: {{predmet_ugovora}} (u daljem tekstu: Djelo).

Clan 2: Rok i Nacin Isporuke
Izvršilac se obavezuje da posao iz clana 1. ovog Ugovora zavrsi u potpunosti i preda Naruciocu najkasnije do {{rok_zavrsetka}}.
{{#if isporuka_definisana}}
Pod isporukom se podrazumijeva {{definicija_isporuke}}.
{{/if}}

Clan 3: Faze Rada, Revizije i Prihvatanje Djela
{{#if definisan_proces_revizije}}
1. Izvršilac ce Naruciocu predstaviti pocetni predlog Djela.
2. Narucilac ima pravo na ukupno {{broj_revizija}} kruga revizija (ispravki) na predlog Djela, koji su ukljuceni u ugovorenu cijenu. Svaka revizija podrazumijeva set objedinjenih komentara i zahtjeva za izmjenama.
3. Narucilac je duzan da svoje eventualne zahtjeve za izmjenama dostavi Izvrsiocu u roku od {{rok_za_feedback}} radna dana od dana prijema predloga. Ukoliko Narucilac u navedenom roku ne dostavi zahtjeve za izmjenama niti obavijesti Izvrsioca o prihvatanju predloga, smatrace se da je predlog precutno prihvacen.
4. Nakon sto Narucilac pisanim putem (putem elektronske poste) potvrdi da prihvata finalnu verziju Djela, smatra se da je Djelo primljeno i prihvaceno.
{{/if}}

Clan 4: Naknada
Narucilac se obavezuje da Izvrsiocu za uredno izvrsen i isporucen posao isplati naknadu u ukupnom {{tip_naknade}} iznosu od {{iznos_naknade_broj}} € (slovima: {{iznos_naknade_slovima}} eura).
Isplata ce se izvrsiti u roku od {{rok_placanja}} dana od dana konacnog prihvatanja Djela u skladu sa clanom 3. ovog Ugovora, uplatom na ziro racun Izvrsioca broj: {{racun_izvrsioca}} koji se vodi kod {{banka_izvrsioca}}.

Clan 5: Autorska Prava
{{#if je_autorsko_djelo}}
1. Izvršilac potvrduje da je Djelo koje je predmet ovog Ugovora njegovo originalno autorsko djelo.
2. Ugovorenom naknadom iz clana 4. ovog Ugovora, Izvršilac iskljucivo, trajno i bez prostornog i vremenskog ogranicenja prenosi na Narucilac sva imovinska autorska prava na Djelu.
3. Prenos prava iz stava 2. ovog clana obuhvata, ali se ne ogranicava na: pravo na umnozavanje, pravo na distribuciju, pravo na javno saopštavanje, pravo na adaptaciju, preradu i druga preoblikovanja Djela, kao i pravo na emitovanje i reemitovanje.
4. Narucilac stice pravo da Djelo registruje kao zig i da ga koristi u komercijalne i nekomercijalne svrhe bez ikakvih daljih saglasnosti ili naknada Izvrsiocu.
5. Izvršilac zadrzava svoja moralna autorska prava u skladu sa zakonom, i saglasan je da Narucilac nije u obavezi da prilikom svake upotrebe Djela navodi ime Izvrsioca.
{{/if}}

Clan 6: Garancija Originalnosti i Zastita od Pravnih Nedostataka
{{#if je_autorsko_djelo}}
Izvršilac garantuje Narucilac da je Djelo u cjelosti njegova originalna tvorevina, da nije optereceno pravima trecih lica, te da njegovom upotrebom Narucilac ne povreduje bilo kakva autorska ili druga prava trecih lica.
{{/if}}

Clan 7: Povjerljivost i Zastita Podataka
{{#if pristup_povjerljivim_info}}
Izvršilac se obavezuje da ce sve informacije, podatke i materijale do kojih dode tokom rada na izradi Djela, a koji se odnose na poslovanje Narucilac, tretirati kao strogu poslovnu tajnu.
{{/if}}

Clan 8: Samostalnost Izvršilaca
Izvršilac je samostalan u izvršavanju posla i nije u radnom odnosu kod Narucilaca.

Clan 9: Cjelovitost Ugovora (Integralna Volja)
Odredbe ovog Ugovora predstavljaju cjelokupnu volju ugovornih strana i sadrze sve o cemu su se ugovoraci sporazumjeli.

Clan 10: Izmjene i Dopune
Izmjene i dopune ovog Ugovora mogu se vrsiti iskljucivo u pisanoj formi, u vidu aneksa koji potpisu obje ugovorne strane.

Clan 11: Rjesavanje Sporova
Ugovorne strane su saglasne da sve eventualne sporove koji proisteknu iz ovog Ugovora rjesavaju sporazumno.
Ukoliko to ne bude moguce, prihvataju nadleznost Osnovnog suda u {{mjesto_suda}}.

Clan 12: Zavrsne Odredbe
Na sve odnose ugovornih strana koji nisu obuhvaceni ovim Ugovorom primjenjivace se odredbe Zakona o obligacionim odnosima i Zakona o autorskom i srodnim pravima Crne Gore.
Ugovor je sacinjen u 2 (dva) istovjetna primjerka, po jedan za svaku ugovornu stranu.
<br>
**NARUCILAC POSLA** _________________________ {{naziv_narucioca}}
**IZVRSILAC POSLA** _________________________ {{naziv_izvrsioca}}`,
};

async function generateInvoicePDF(orderId, ugovorType, totalPrice) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]);
    
    // Ugradnja standardnog fonta koji podrzava dijakriticke znakove
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const primaryColor = rgb(0, 0.49, 1); // Plava boja za isticanje

    // URL tvog sajta za logo
    const logoUrl = 'https://ugovor24-site.vercel.app/logo.png';
    const logoBytes = await fetch(logoUrl).then(res => res.arrayBuffer());
    const logoImage = await pdfDoc.embedPng(logoBytes);
    
    const logoDims = logoImage.scale(0.5);

    page.drawImage(logoImage, {
      x: 50,
      y: 350 - logoDims.height,
      width: logoDims.width,
      height: logoDims.height,
    });
    
    // Tekst u PDF-u (poboljsana citljivost)
    page.drawText('PREDRACUN', { x: 50, y: 310, size: 24, font: font, color: primaryColor });
    page.drawText('____________________________________________', { x: 50, y: 305, size: 12, font: font, color: primaryColor });
    
    page.drawText(`Broj narudzine: ${orderId}`, { x: 50, y: 280, size: 12, font: font });
    page.drawText(`Usluga: ${ugovorType}`, { x: 50, y: 260, size: 12, font: font });
    page.drawText(`Iznos za uplatu: ${totalPrice} EUR`, { x: 50, y: 240, size: 12, font: font, color: primaryColor });
    
    // Podaci o placanju
    page.drawText('Instrukcije za placanje:', { x: 50, y: 200, size: 14, font: font });
    page.drawText('Primalac: Advokatska kancelarija Dejan Radinovic', { x: 50, y: 180, size: 12, font: font });
    page.drawText('Adresa: Bozane Vucinica 7-5, 81000 Podgorica, Crna Gora', { x: 50, y: 165, size: 12, font: font });
    page.drawText('Banka: Erste bank AD Podgorica', { x: 50, y: 150, size: 12, font: font });
    page.drawText('Broj racuna: 540-0000000011285-46', { x: 50, y: 135, size: 12, font: font });
    
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
}

async function sendConfirmationEmail(clientEmail, ugovorType, totalPrice, orderId) {
    try {
        const invoicePdfBytes = await generateInvoicePDF(orderId, ugovorType, totalPrice);
        
        await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: clientEmail,
            subject: `Potvrda zahtjeva za ${ugovorType} - ugovor24.com`,
            html: `
                <p>Postovani/a,</p>
                <p>Ovo je automatska potvrda da je Vas zahtjev za ${ugovorType} uspjesno primljen.</p>
                <p>Nacrt Vaseg ugovora je vec u procesu generisanja uz pomoc AI-a i bice spreman za pregled cim Vasa uplata bude proknjizena.</p>
                <p>Molimo izvršite uplatu bankarskim transferom u iznosu od ${totalPrice} €. Predracun sa instrukcijama za placanje je u prilogu.</p>
                <p>Nakon sto uplata bude proknjizena na nasem racunu, ugovor ce biti pregledan i poslat Vam u roku od 24 casa.</p>
                <p>Srdacan pozdrav,</p>
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
        console.error('Greska pri slanju e-maila:', error);
        return { error: 'Failed to send email' };
    }
}

async function generateContractDraft(orderId, ugovorType, contractData) {
    const template = masterTemplates[ugovorType];
    
    if (!template) {
        return { error: 'Template for this contract type not found' };
    }
    
    // Priprema prompta za Gemini AI
    const prompt = `Ti si strucni advokat iz Crne Gore. Na osnovu prilozenih podataka i master templejta, generisi nacrt ugovora.
    
    Pravni kontekst:
    - Pravo Crne Gore
    - Sudska praksa Crne Gore i EU
    - Najbolje prakse EU
    
    Podaci za ugovor: ${JSON.stringify(contractData)}
    
    Master template:
    ${template}
    
    Molim te, vrati mi samo konacan tekst ugovora, sa popunjenim podacima i uklonjenim placeholderima poput {{#if...}}, u formatu pogodnom za kopiranje i finalizaciju. Ne dodaj nikakav uvodni ili zakljucni tekst, samo cisti tekst ugovora.`;

    const result = await model.generateContent(prompt);
    const generatedDraft = result.response.text();
    
    // Azuriranje narudzine u bazi sa generisanim nacrtom
    const { error: updateError } = await supabase
        .from('orders')
        .update({ generated_draft: generatedDraft, is_draft_generated: true })
        .eq('id', orderId);

    if (updateError) {
        console.error('Greska pri azuriranju narudzine:', updateError);
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
      console.error('Greska pri unosu u orders tabelu:', orderError);
      return res.status(500).json({ error: 'Database insertion error' });
    }
    
    const order_id = orderData[0].id;
    
    // 2. Unos specificnih podataka u 'orders_ugovor_o_djelu' tabelu
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
      console.error('Greska pri unosu u orders_ugovor_o_djelu tabelu:', specificError);
      return res.status(500).json({ error: 'Database insertion error' });
    }

    // 3. Pokretanje AI generisanja (automatski) i slanje e-maila sa predracunom
    const generationResult = await generateContractDraft(order_id, ugovor_type, formData);
    if (generationResult.error) {
        console.error('Greska pri generisanju nacrta:', generationResult.error);
    }
    
    const emailResult = await sendConfirmationEmail(client_email, ugovor_type, total_price, order_id);
    if (emailResult.error) {
        console.error('Greska pri slanju e-maila:', emailResult.error);
    }
    
    // 4. Preusmjeravanje klijenta na stranicu za placanje
    res.writeHead(302, {
      'Location': `/placanje.html?cijena=${total_price}&ugovor=${encodeURIComponent(ugovor_type)}`,
      'Content-Type': 'text/plain',
    });
    res.end('Redirecting to payment...');
    
  } catch (err) {
    console.error('Neoocekivana greska:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

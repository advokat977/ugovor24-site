// api/submit-set-za-firmu-doo.js

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Resend } from 'resend';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const resend = new Resend(process.env.RESEND_API_KEY);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

function removeDiacritics(text) {
    if (!text) return '';
    return text.replace(/č/g, 'c').replace(/ć/g, 'c').replace(/š/g, 's').replace(/ž/g, 'z').replace(/đ/g, 'dj')
               .replace(/Č/g, 'C').replace(/Ć/g, 'C').replace(/Š/g, 'S').replace(/Ž/g, 'Z').replace(/Đ/g, 'Dj');
}

function formatFormData(formData) {
    let formattedText = '';
    const translations = {
        naziv_firme: 'Naziv firme',
        skraceni_naziv_firme: 'Skraceni naziv firme',
        adresa_sjedista: 'Adresa sjedista',
        adresa_za_postu: 'Adresa za postu',
        e_mail_adresa: 'Email adresa',
        opis_pretezne_djelatnosti: 'Opis djelatnosti',
        zelite_li_spoljnotrgovinske_poslove: 'Spoljnotrgovinski poslovi',
        iznos_kapitala: 'Iznos kapitala',
        tip_osnivaca_1: 'Tip osnivaca 1',
        ime_osnivaca_1: 'Ime osnivaca 1',
        id_osnivaca_1: 'ID osnivaca 1',
        adresa_osnivaca_1: 'Adresa osnivaca 1',
        vrsta_uloga_1: 'Vrsta uloga 1',
        vrijednost_uloga_1: 'Vrijednost uloga 1',
        opis_nenovcanog_uloga_1: 'Opis nenovcanog uloga 1',
        ime_direktora: 'Ime direktora',
        id_direktora: 'ID direktora',
        samostalni_direktor: 'Samostalni direktor',
        detalji_ovlascenja: 'Detalji ovlascenja',
        zelite_li_odb_dir: 'Odbor direktora',
        clanovi_odbora_direktora: 'Clanovi odbora direktora',
        prokurista: 'Prokurista',
        ime_i_id_prokuriste: 'Ime i ID prokuriste',
        dodatne_odredbe_statuta: 'Dodatne odredbe statuta',
        procijenjeni_troskovi_osnivanja: 'Procijenjeni troskovi osnivanja',
        client_email: 'Email klijenta',
        terms_acceptance: 'Prihvatio uslove'
    };

    for (const key in formData) {
        let value = formData[key];
        let label = translations[key] || key;
        if (value === true) value = 'Da';
        if (value === false) value = 'Ne';
        if (value) {
            formattedText += `**${label}:** ${value}\n`;
        }
    }
    return formattedText;
}

function formatOrderNumber(number) {
  const numString = String(number);
  const leadingZeros = '00000'.substring(0, 5 - numString.length);
  return `${leadingZeros}${numString}`;
}

const masterTemplates = {
    'Set dokumenata za registraciju firme (DOO)': `
    Ugovor24.com - Revidirani upitnik za osnivanje i registraciju DOO (199 EUR paket)
    Molimo Vas da popunite ovaj upitnik sa svim potrebnim informacijama.
    Vasi odgovori omogucice nam da automatski generisemo sve neophodne dokumente za osnivanje Vaseg drustva sa ogranicenom odgovornoscu (DOO), u skladu sa relevantnim propisima i najboljim praksama.
    
    SEKCIJA 1: OSNOVNI PODACI O FIRMI
    Naziv privrednog drustva:
    Puni naziv: {{naziv_firme}}
    Skraceni naziv (opciono): {{skraceni_naziv_firme}}
    Adrese firme u Crnoj Gori:
    Adresa sjedista: {{adresa_sjedista}}
    Adresa za sluzbeni prijem poste (opciono, moze biti ista kao sjediste): {{adresa_za_postu}}
    Adresa za prijem elektronske poste (obavezno): {{e_mail_adresa}}
    Djelatnosti drustva:
    Opis pretezne djelatnosti: {{opis_pretezne_djelatnosti}}
    Da li zelite da se firma bavi i spoljnotrgovinskim prometom i drugim srodnim djelatnostima (posredovanje, komisioni poslovi, zastupanje stranih firmi, itd.)?: {{zelite_li_spoljnotrgovinske_poslove}}
    Osnovni kapital:
    Zeljeni iznos osnovnog kapitala: {{iznos_kapitala}} EUR
    
    SEKCIJA 2: PODACI O OSNIVACIMA
    Osnivac 1:
    Tip osnivaca: {{tip_osnivaca_1}}
    Ime i prezime / Pun naziv firme: {{ime_osnivaca_1}}
    Identifikacioni broj: {{id_osnivaca_1}}
    Adresa prebivalista / Adresa sjedista: {{adresa_osnivaca_1}}
    Vrsta uloga: {{vrsta_uloga_1}}
    Vrijednost uloga: {{vrijednost_uloga_1}} EUR
    Opis nenovcanog uloga: {{opis_nenovcanog_uloga_1}}
    
    SEKCIJA 3: PODACI O IZVRSNOM DIREKTORU I ODBORU DIREKTORA
    Ime i prezime izvrsnog direktora: {{ime_direktora}}
    Identifikacioni broj izvrsnog direktora: {{id_direktora}}
    Da li zelite da izvrsni direktor zastupa firmu samostalno, neograniceno i bez Odbora direktora? (DA/NE): {{samostalni_direktor}}
    Ukoliko ne, molimo Vas da navedete ovlascenja za zastupanje: {{detalji_ovlascenja}}
    Da li zelite da firma ima Odbor direktora? (DA/NE): {{zelite_li_odb_dir}}
    Ukoliko DA, molimo Vas da navedete imena i ID brojeve clanova Odbora direktora: {{clanovi_odbora_direktora}}
    Da li zelite da imenujete prokuristu? (DA/NE): {{prokurista}}
    Ako DA, ime i ID broj prokuriste: {{ime_i_id_prokuriste}}

    SEKCIJA 4: DODATNA PITANJA
    Da li postoji neko posebno pravilo koje zelite da uvrstimo u Statut (npr. o nacinu prenosa udjela, raspodjeli dobiti, itd.)?: {{dodatne_odredbe_statuta}}
    Procijenjeni troskovi osnivanja koje ce drustvo isplatiti osnivacu (opciono, molimo navedite iznos): {{procijenjeni_troskovi_osnivanja}} EUR
    `
};

async function generateInvoicePDF(orderId, ugovorType, totalPrice, orderNumber, clientName, clientAddress, clientID) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const primaryColor = rgb(0, 0.49, 1);
    const black = rgb(0.13, 0.13, 0.13);
    
    const logoUrl = 'https://ugovor24-site.vercel.app/logo.png';
    let logoImage = null;
    try {
        const logoBytes = await fetch(logoUrl).then(res => res.arrayBuffer());
        logoImage = await pdfDoc.embedPng(logoBytes);
    } catch (e) {
        console.error('Greska pri ucitavanju loga:', e);
    }
    
    if (logoImage) {
        const logoDims = logoImage.scale(0.3);
        page.drawImage(logoImage, { x: 50, y: 780, width: logoDims.width, height: logoDims.height });
    }

    const formattedOrderNumber = formatOrderNumber(orderNumber);
    page.drawText('PREDRACUN', { x: 440, y: 780, size: 18, font: font, color: black });
    page.drawText(`Br. narudzbe: ${formattedOrderNumber}`, { x: 420, y: 760, size: 10, font: font, color: black });

    page.drawText('IZDATO ZA:', { x: 50, y: 720, size: 12, font: font, color: primaryColor });
    page.drawText(removeDiacritics(clientName), { x: 50, y: 700, size: 12, font: font, color: black });
    page.drawText(removeDiacritics(clientAddress), { x: 50, y: 685, size: 10, font: font, color: black });
    page.drawText(`ID broj: ${removeDiacritics(clientID)}`, { x: 50, y: 670, size: 10, font: font, color: black });

    page.drawText('Usluga', { x: 50, y: 620, size: 12, font: font, color: primaryColor });
    page.drawText('Cijena', { x: 450, y: 620, size: 12, font: font, color: primaryColor });
    page.drawLine({
        start: { x: 50, y: 610 },
        end: { x: 545, y: 610 },
        color: primaryColor,
        thickness: 1
    });
    page.drawText(removeDiacritics(ugovorType), { x: 50, y: 590, size: 12, font: font, color: black });
    page.drawText(`${totalPrice} EUR`, { x: 450, y: 590, size: 12, font: font, color: black });
    page.drawLine({
        start: { x: 50, y: 580 },
        end: { x: 545, y: 580 },
        color: primaryColor,
        thickness: 1
    });
    
    page.drawText('UKUPNO', { x: 350, y: 550, size: 12, font: font, color: black });
    page.drawText(`${totalPrice} EUR`, { x: 450, y: 550, size: 12, font: font, color: black });
    page.drawLine({
        start: { x: 350, y: 540 },
        end: { x: 545, y: 540 },
        color: black,
        thickness: 1
    });

    page.drawText('Podaci za uplatu:', { x: 50, y: 500, size: 12, font: font, color: primaryColor });
    page.drawText('Primalac: Advokatska kancelarija Dejan Radinovic', { x: 50, y: 480, size: 12, font: font, color: black });
    page.drawText('Adresa: Bozane Vucinica 7-5, 81000 Podgorica, Crna Gora', { x: 50, y: 465, size: 12, font: font, color: black });
    page.drawText('Banka: Erste bank AD Podgorica', { x: 50, y: 450, size: 12, font: font, color: black });
    page.drawText('Broj racuna: 540-0000000011285-46', { x: 50, y: 435, size: 12, font: font, color: black });
    page.drawText(`Svrha uplate: Uplata za ugovor #${formattedOrderNumber}`, { x: 50, y: 420, size: 12, font: font, color: black });

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
}

async function sendConfirmationEmailToClient(clientEmail, ugovorType, totalPrice, orderId, orderNumber, clientName, clientAddress, clientID) {
    try {
        const formattedOrderNumber = formatOrderNumber(orderNumber);
        const invoicePdfBytes = await generateInvoicePDF(orderId, ugovorType, totalPrice, formattedOrderNumber, clientName, clientAddress, clientID);
        
        await resend.emails.send({
            from: 'noreply@ugovor24.com',
            to: clientEmail,
            subject: `Potvrda zahtjeva za ${ugovorType} - ugovor24.com`,
            html: `
                <p>Postovani/a ${removeDiacritics(clientName)},</p>
                <p>Ovo je automatska potvrda da je Vas zahtjev za **${removeDiacritics(ugovorType)}** uspjesno primljen pod brojem **${formattedOrderNumber}**.</p>
                <p>Nacrt Vaseg ugovora je vec u procesu generisanja i bice spreman za pregled cim Vasa uplata bude proknjizena.</p>
                <p>Molimo izvrsite uplatu bankarskim transferom u iznosu od **${totalPrice} EUR**. Predracun sa instrukcijama za placanje je u prilogu.</p>
                <p>Nakon sto uplata bude proknjizena na nasem racunu, ugovor ce biti pregledan i poslat Vam u roku od 24 casa.</p>
                <p>Srdacan pozdrav,</p>
                <p>Tim ugovor24.com</p>
            `,
            attachments: [
                {
                    filename: `predracun-${formattedOrderNumber}.pdf`,
                    content: Buffer.from(invoicePdfBytes)
                }
            ]
        });
        return { success: true };
    } catch (error) {
        console.error('Greska pri slanju e-maila klijentu:', error);
        return { error: 'Failed to send email to client' };
    }
}

async function sendNotificationEmailToAdmin(ugovorType, orderId, orderNumber, formData) {
    const formattedData = formatFormData(formData);
    const formattedOrderNumber = formatOrderNumber(orderNumber);

    try {
        await resend.emails.send({
            from: 'noreply@ugovor24.com',
            to: 'titograd977@gmail.com',
            subject: `NOVA NARUDZBA: ${removeDiacritics(ugovorType)} (#${formattedOrderNumber})`,
            html: `
                <p>Dobar dan, Dejane,</p>
                <p>Imate novu narudzbinu za **${removeDiacritics(ugovorType)}**.</p>
                <p>Broj narudzbe: **${formattedOrderNumber}**</p>
                <p>ID narudzbe: **${orderId}**</p>
                <p>---</p>
                <p>Podaci iz upitnika:</p>
                <pre>${formattedData}</pre>
                <p>---</p>
                <p>Srdacan pozdrav,</p>
                <p>Sistem ugovor24.com</p>
            `,
        });
        return { success: true };
    } catch (error) {
        console.error('Greska pri slanju e-maila administratoru:', error);
        return { error: 'Failed to send notification email' };
    }
}

async function generateContractDraft(orderId, ugovorType, contractData) {
    const template = masterTemplates[ugovorType];
    
    if (!template) {
        return { error: 'Template for this contract type not found' };
    }
    
    const prompt = `Ti si strucni advokat iz Crne Gore. Na osnovu prilozenih podataka i master templejta, generisi nacrt ugovora.
    
    Pravni kontekst:
    - Pravo Crne Gore
    - Sudska praksa Crne Gore i EU
    - Najbolje prakse EU
    
    Podaci za ugovor: ${JSON.stringify(contractData)}
    
    Master template:
    ${template}
    
    Molim te, vrati mi samo konacan tekst ugovora, sa popunjenim podacima i uklonjenim placeholderima poput {{#if...}}, u formatu pogodnom za kopiranje i finalizaciju. Ne dodaj nikakav uvodni ili zakljucni tekst, samo cisti tekst ugovora.`;

    try {
        const result = await model.generateContent(prompt);
        const generatedDraft = result.response.text();
        
        const { error: updateError } = await supabase
            .from('orders')
            .update({ generated_draft: generatedDraft, is_draft_generated: true })
            .eq('id', orderId);

        if (updateError) {
            console.error('Greska pri azuriranju narudzine:', updateError);
            return { error: 'Database update error' };
        }
    } catch (e) {
        console.error('Greska pri generisanju nacrta:', e);
        return { error: 'AI generation failed' };
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
  const client_name = formData['naziv_narucioca'];
  const client_address = formData['adresa_narucioca'];
  const client_id = formData['id_broj_narucioca'];

  if (!client_email || !ugovor_type || !total_price) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert([
        { 
          client_email,
          ugovor_type,
          total_price
        }
      ])
      .select('id, order_number');

    if (orderError) {
      console.error('Greska pri unosu u orders tabelu:', orderError);
      return res.status(500).json({ error: 'Database insertion error' });
    }
    
    const order_id = orderData[0].id;
    const order_number = orderData[0].order_number;
    
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

    const generationResult = await generateContractDraft(order_id, ugovor_type, formData);
    if (generationResult.error) {
        console.error('Greska pri generisanju nacrta:', generationResult.error);
    }
    
    const emailResult = await sendConfirmationEmailToClient(client_email, ugovor_type, total_price, order_id, order_number, client_name, client_address, client_id);
    if (emailResult.error) {
        console.error('Greska pri slanju e-maila klijentu:', emailResult.error);
    }

    const adminEmailResult = await sendNotificationEmailToAdmin(ugovor_type, order_id, order_number, formData);
    if (adminEmailResult.error) {
        console.error('Greska pri slanju e-maila administratoru:', adminEmailResult.error);
    }
    
    res.writeHead(302, {
      'Location': `/placanje.html?cijena=${total_price}&ugovor=${encodeURIComponent(ugovor_type)}`,
      'Content-Type': 'text/plain',
    });
    res.end('Redirecting to payment...');
    
  } catch (err) {
    console.error('Neocekivana greska:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

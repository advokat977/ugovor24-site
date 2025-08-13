// api/submit-set-za-firmu-doo.js

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const resend = new Resend(process.env.RESEND_API_KEY);

// Funkcija za uklanjanje dijakritickih znakova iz teksta
function removeDiacritics(text) {
    if (!text) return '';
    return text.replace(/č/g, 'c').replace(/ć/g, 'c').replace(/š/g, 's').replace(/ž/g, 'z').replace(/đ/g, 'dj')
               .replace(/Č/g, 'C').replace(/Ć/g, 'C').replace(/Š/g, 'S').replace(/Ž/g, 'Z').replace(/Đ/g, 'Dj');
}

// Funkcija za formatiranje JSON objekta u citljiv tekst
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
            subject: `Potvrda zahtjeva za ${removeDiacritics(ugovorType)} - ugovor24.com`,
            html: `
                <p>Postovani/a ${removeDiacritics(clientName)},</p>
                <p>Ovo je automatska potvrda da je Vas zahtjev za **${removeDiacritics(ugovorType)}** uspjesno primljen pod brojem **${formattedOrderNumber}**.</p>
                <p>Molimo izvrsite uplatu bankarskim transferom u iznosu od **${totalPrice} EUR**. Predracun sa instrukcijama za placanje je u prilogu.</p>
                <p>Ukoliko za izradu ugovora budu potrebne dodatne informacije, kontaktiracemo Vas. Nakon sto uplata bude proknjizena na nasem racunu, ugovor ce biti pregledan i poslat Vam.</p>
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
                <p>Imate novu narudzbinu za **${removeDiakritics(ugovorType)}**.</p>
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const formData = req.body;

  const ugovor_type = 'Set dokumenata za registraciju firme (DOO)';
  const total_price = 199;
  const client_email = formData['e_mail_adresa'];
  const client_name = formData['ime_osnivaca_1'];
  const client_address = formData['adresa_osnivaca_1'];
  const client_id = formData['id_osnivaca_1'];

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
      console.error('Greska pri unosu u orders_set_za_firmu_doo tabelu:', specificError);
      return res.status(500).json({ error: 'Database insertion error' });
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

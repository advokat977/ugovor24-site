// api/submit-ugovor-o-djelu.js

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Supabase URL i anonimni kljuc se uzimaju iz Vercel varijabli okruzenja
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Resend
const resend = new Resend(process.env.RESEND_API_KEY);

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

async function sendConfirmationEmailToClient(clientEmail, ugovorType, totalPrice, orderId) {
    try {
        const invoicePdfBytes = await generateInvoicePDF(orderId, ugovorType, totalPrice);
        
        await resend.emails.send({
            from: 'noreply@ugovor24.com',
            to: clientEmail,
            subject: `Potvrda zahtjeva za ${ugovorType} - ugovor24.com`,
            html: `
                <p>Postovani/a,</p>
                <p>Ovo je automatska potvrda da je Vas zahtjev za ${ugovorType} uspjesno primljen.</p>
                <p>Ukoliko nisu potrebne dodatne informacije za izradu kvalitetnog ugovora, isti ce biti generisan, pregledan i poslat Vam u roku od 24 casa od momenta kada uplata bude proknjizena i dostupna na nasem racunu.</p>
                <p>Molimo izvršite uplatu bankarskim transferom u iznosu od ${totalPrice} €. Predracun sa instrukcijama za placanje je u prilogu.</p>
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
        console.error('Greska pri slanju e-maila klijentu:', error);
        return { error: 'Failed to send email to client' };
    }
}

async function sendNotificationEmailToAdmin(ugovorType, orderId, formData) {
    try {
        await resend.emails.send({
            from: 'noreply@ugovor24.com',
            to: 'titograd977@gmail.com',
            subject: `NOVA NARUDZBA: ${ugovorType} (#${orderId})`,
            html: `
                <p>Dobar dan,</p>
                <p>Imate novu narudzbinu za **${ugovorType}**.</p>
                <p>ID narudzbe: **${orderId}**</p>
                <p>Podaci iz upitnika:</p>
                <pre>${JSON.stringify(formData, null, 2)}</pre>
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

    // 3. Slanje e-maila klijentu i tebi
    const emailToClient = sendConfirmationEmailToClient(client_email, ugovor_type, total_price, order_id);
    const emailToAdmin = sendNotificationEmailToAdmin(ugovor_type, order_id, formData);
    
    await Promise.all([emailToClient, emailToAdmin]);
    
    // 4. Preusmjeravanje klijenta na stranicu za placanje
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

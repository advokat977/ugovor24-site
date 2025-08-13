// api/submit-ugovor-o-zakupu.js

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const resend = new Resend(process.env.RESEND_API_KEY);

function removeDiacritics(text) {
    if (!text) return '';
    return text.replace(/č/g, 'c').replace(/ć/g, 'c').replace(/š/g, 's').replace(/ž/g, 'z').replace(/đ/g, 'dj')
               .replace(/Č/g, 'C').replace(/Ć/g, 'C').replace(/Š/g, 'S').replace(/Ž/g, 'Z').replace(/Đ/g, 'Dj');
}

function formatFormData(formData) {
    let formattedText = '';
    const translations = {
        mjesto_zakljucenja: 'Mjesto zakljucenja',
        datum_zakljucenja: 'Datum zakljucenja',
        naziv_zakupodavca: 'Naziv Zakupodavca',
        adresa_zakupodavca: 'Adresa Zakupodavca',
        id_broj_zakupodavca: 'ID broj Zakupodavca',
        naziv_zakupca: 'Naziv Zakupca',
        adresa_zakupca: 'Adresa Zakupca',
        id_broj_zakupca: 'ID broj Zakupca',
        tip_prostora: 'Tip prostora',
        adresa_prostora: 'Adresa prostora',
        povrsina_prostora: 'Povrsina prostora',
        broj_lista_nepokretnosti: 'Broj lista nepokretnosti',
        katastarska_opstina: 'Katastarska opstina',
        opis_prostorija: 'Opis prostorija',
        namjena_prostora: 'Namjena prostora',
        period_zakupa: 'Period zakupa',
        jedinica_perioda_zakupa: 'Jedinica perioda zakupa',
        datum_pocetka_zakupa: 'Datum pocetka zakupa',
        iznos_zakupnine_broj: 'Iznos zakupnine',
        dan_u_mjesecu_za_placanje: 'Dan placanja',
        otkazni_rok: 'Otkazni rok',
        definisan_depozit: 'Depozit definisan',
        iznos_depozita_broj: 'Iznos depozita',
        definisana_indeksacija: 'Indeksacija zakupnine',
        dozvoljen_podzakup: 'Dozvoljen podzakup',
        strana_koja_placa_solemnizaciju: 'Placa solemnizaciju',
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
    'Ugovor o zakupu': `UGOVOR O ZAKUPU
Zakljucen u {{mjesto_zakljucenja}}, dana {{datum_zakljucenja}} godine, izmedu:
1.  **Zakupodavca:** {{naziv_zakupodavca}}, sa sjedistem/prebivalistem na adresi {{adresa_zakupodavca}}, JMBG/PIB: {{id_broj_zakupodavca}} (u daljem tekstu: Zakupodavac), i
2.  **Zakupca:** {{naziv_zakupca}}, sa sjedistem/prebivalistem na adresi {{adresa_zakupca}}, JMBG/PIB: {{id_broj_zakupca}} (u daljem tekstu: Zakupac).

PREAMBULA
Ugovorne strane saglasno konstatuju da je Zakupodavac iskljucivi vlasnik nekretnine koja je predmet ovog Ugovora, bez tereta i ogranicenja, te ovim Ugovorom regulisu medusobna prava i obaveze u vezi sa zakupom iste.

Clan 1: Predmet Zakupa
1. Predmet ovog Ugovora je zakup {{tip_prostora}} koji se nalazi na adresi {{adresa_prostora}}, ukupne povrsine {{povrsina_prostora}} m², upisan u list nepokretnosti broj {{broj_lista_nepokretnosti}} KO {{katastarska_opstina}} (u daljem tekstu: Prostor).
2. Prostor se sastoji od: {{opis_prostorija}}. 3. Zakupodavac predaje Zakupcu Prostor u videnom stanju.
4. Ugovorne strane ce prilikom primopredaje saciniti Zapisnik o primopredaji, u kojem ce konstatovati stanje Prostora i popisati stvari koje se u njemu nalaze. Zapisnik o primopredaji cini sastavni dio ovog Ugovora.

Clan 2: Namjena Zakupa
Prostor se daje u zakup iskljucivo u svrhu {{namjena_prostora}}.
Zakupac se obavezuje da nece koristiti Prostor u druge svrhe bez prethodne pisane saglasnosti Zakupodavca.

Clan 3: Trajanje Zakupa
1. Ovaj Ugovor se zakljucuje na period od {{period_zakupa}} {{jedinica_perioda_zakupa}}, pocev od {{datum_pocetka_zakupa}}.
2. Nakon isteka roka iz stava 1. ovog clana, Ugovor se moze produziti pisanim aneksom, uz saglasnost obje ugovorne strane.

Clan 4: Zakupnina i Troskovi
1. Ugovorne strane su saglasne da mjesecna zakupnina za koriscenje Prostora iznosi {{iznos_zakupnine_broj}} € (slovima: {{iznos_zakupnine_slovima}} eura).
2. Zakupnina se placa unaprijed, najkasnije do {{dan_u_mjesecu_za_placanje}}. dana u mjesecu za tekuci mjesec.
3. Pored zakupnine, Zakupac je duzan da snosi i sve tekuce troskove koji nastanu koriscenjem Prostora (troskovi elektricne energije, vode, komunalnih usluga, interneta, itd.).
4. Zakupac je duzan da racune za troskove iz stava 3. ovog clana placa blagovremeno i da dokaze o uplati dostavi Zakupodavcu na uvid.
{{#if definisana_indeksacija}}
5. U slucaju da je Ugovor zakljucen na period duzi od jedne godine, Zakupodavac ima pravo da, nakon isteka svake godine zakupa, uskladi iznos zakupnine sa zvanicnom stopom inflacije koju objavljuje nadlezni statisticki organ za prethodnu godinu.
{{/if}}

Clan 5: Depozit
{{#if definisan_depozit}}
1. Prilikom zakljucenja ovog Ugovora, Zakupac je duzan da Zakupodavcu preda depozit u iznosu od {{iznos_depozita_broj}} € (slovima: {{iznos_depozita_slovima}} eura), kao garanciju za uredno ispunjenje svojih obaveza.
2. Zakupodavac se obavezuje da vrati depozit Zakupcu u roku od 15 (petnaest) dana od dana prestanka Ugovora i primopredaje Prostora, pod uslovom da je Zakupac izmirio sve obaveze po osnovu zakupnine i tekucih troskova, te da na Prostoru nije pricinena steta.
3. Ukoliko postoje neizmirene obaveze ili steta, Zakupodavac ima pravo da iznos depozita iskoristi za njihovo namirenje, a eventualnu razliku vrati Zakupcu.
{{/if}}

Clan 6: Obaveze Zakupodavca
Zakupodavac se obavezuje da: a) Preda Zakupcu Prostor u stanju podobnom za ugovorenu upotrebu. b) Omoguci Zakupcu mirno i nesmetano koriscenje Prostora tokom trajanja zakupa. c) Snosi troskove tekuceg odrzavanja zgrade i investicionog odrzavanja Prostora, osim ako je steta nastala krivicom Zakupca.

Clan 7: Obaveze Zakupca
Zakupac se obavezuje da: a) Koristi Prostor sa paznjom dobrog domacina, u skladu sa njegovom namjenom. b) Snosi troskove sitnih popravki i tekuceg odrzavanja Prostora. c) Ne vrsi bilo kakve adaptacije ili prepravke u Prostoru bez prethodne pisane saglasnosti Zakupodavca. d) Dozvoli Zakupodavcu ulazak u Prostor radi kontrole, uz prethodnu najavu. e) Odgovara za svu stetu na Prostoru koja nastane njegovom krivicom ili krivicom lica koja Prostor koriste uz njegovu saglasnost, te da istu otkloni o svom trosku u roku od 10 dana. f) Po prestanku Ugovora, preda Prostor Zakupodavcu u stanju u kojem ga je primio, uzimajuci u obzir redovnu upotrebu.
{{#unless dozvoljen_podzakup}}
g) Ne daje Prostor u podzakup trecim licima.
{{/unless}}

Clan 8: Otkaz Ugovora
1. Ovaj Ugovor se moze raskinuti sporazumom ugovornih strana. 2. Svaka ugovorna strana moze otkazati ovaj Ugovor, bez navodenja razloga, uz postovanje otkaznog roka od {{otkazni_rok}} dana. Otkaz se daje u pisanoj formi. 3. Zakupodavac moze raskinuti Ugovor bez otkaznog roka ako Zakupac kasni sa placanjem zakupnine dva uzastopna mjeseca, ako koristi Prostor suprotno namjeni, ili ako nanosi stetu Prostoru.

Clan 9: Visa Sila
1. Nijedna ugovorna strana nece biti odgovorna za neispunjenje svojih obaveza ukoliko je do neispunjenja doslo usljed nastupanja okolnosti vise sile. 2. Strana pogodena visom silom duzna je da o tome odmah obavijesti drugu stranu. 3. Ako okolnosti vise sile traju duze od 60 (sezdeset) dana, svaka strana ima pravo da raskine Ugovor.

Clan 10: Poreske Obaveze i Solemnizacija Ugovora
1. Ugovorne strane su saglasne da je Zakupodavac, kao primalac prihoda od zakupa, iskljucivo odgovoran za prijavu i placanje svih poreskih obaveza koje proisticu iz ovog Ugovora. 2. Strane su upoznate da se ovjerom (solemnizacijom) ovog Ugovora kod nadleznog notara, ugovor dobija snagu izvrsne isprave, sto omogucava efikasniju zastitu prava u slucaju neispunjenja obaveza. Troskove solemnizacije snosi {{strana_koja_placa_solemnizaciju}}.

Clan 11: Rjesavanje Sporova
Ugovorne strane su saglasne da sve eventualne sporove koji proisteknu iz ovog Ugovora rjesavaju sporazumno.
Ukoliko to ne bude moguce, prihvataju nadleznost Osnovnog suda u {{mjesto_suda}}.

Clan 12: Zavrsne Odredbe
Na sve odnose ugovornih strana koji nisu obuhvaceni ovim Ugovorom primjenjivace se odredbe Zakona o obligacionim odnosima.
Ugovor je sacinjen u 2 (dva) istovjetna primjerka, po jedan za svaku ugovornu stranu.
<br>
**ZAKUPODAVAC** _________________________ {{naziv_zakupodavca}}
**ZAKUPAC** _________________________ {{naziv_zakupca}}`,
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const formData = req.body;

  const client_email = formData['client_email'];
  const ugovor_type = 'Ugovor o zakupu';
  const total_price = 79;
  const client_name = formData['naziv_zakupca'];
  const client_address = formData['adresa_zakupca'];
  const client_id = formData['id_broj_zakupca'];

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
      .from('orders_ugovor_o_zakupu')
      .insert([
        { 
          order_id: order_id,
          mjesto_zakljucenja: formData['mjesto_zakljucenja'],
          datum_zakljucenja: formData['datum_zakljucenja'],
          naziv_zakupodavca: formData['naziv_zakupodavca'],
          adresa_zakupodavca: formData['adresa_zakupodavca'],
          id_broj_zakupodavca: formData['id_broj_zakupodavca'],
          naziv_zakupca: formData['naziv_zakupca'],
          adresa_zakupca: formData['adresa_zakupca'],
          id_broj_zakupca: formData['id_broj_zakupca'],
          tip_prostora: formData['tip_prostora'],
          adresa_prostora: formData['adresa_prostora'],
          povrsina_prostora: formData['povrsina_prostora'],
          broj_lista_nepokretnosti: formData['broj_lista_nepokretnosti'],
          katastarska_opstina: formData['katastarska_opstina'],
          opis_prostorija: formData['opis_prostorija'],
          namjena_prostora: formData['namjena_prostora'],
          period_zakupa: formData['period_zakupa'],
          jedinica_perioda_zakupa: formData['jedinica_perioda_zakupa'],
          datum_pocetka_zakupa: formData['datum_pocetka_zakupa'],
          iznos_zakupnine_broj: formData['iznos_zakupnine_broj'],
          dan_u_mjesecu_za_placanje: formData['dan_u_mjesecu_za_placanje'],
          otkazni_rok: formData['otkazni_rok'],
          definisan_depozit: formData['definisan_depozit'] === 'Da',
          iznos_depozita_broj: formData['iznos_depozita_broj'] || null,
          definisana_indeksacija: formData['definisana_indeksacija'] === 'Da',
          dozvoljen_podzakup: formData['dozvoljen_podzakup'] === 'Da',
          strana_koja_placa_solemnizaciju: formData['strana_koja_placa_solemnizaciju']
        }
      ]);

    if (specificError) {
      console.error('Greska pri unosu u orders_ugovor_o_zakupu tabelu:', specificError);
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

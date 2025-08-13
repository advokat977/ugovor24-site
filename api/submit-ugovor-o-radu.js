// api/submit-ugovor-o-radu.js

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
        mjesto_zakljucenja: 'Mjesto zakljucenja',
        datum_zakljucenja: 'Datum zakljucenja',
        naziv_poslodavca: 'Naziv Poslodavca',
        adresa_poslodavca: 'Adresa Poslodavca',
        pib_poslodavca: 'PIB Poslodavca',
        zastupnik_poslodavca: 'Zastupnik Poslodavca',
        ime_i_prezime_zaposlenog: 'Ime i prezime Zaposlenog',
        adresa_zaposlenog: 'Adresa Zaposlenog',
        jmbg_zaposlenog: 'JMBG Zaposlenog',
        naziv_radnog_mjesta: 'Naziv radnog mjesta',
        opis_poslova: 'Opis poslova',
        nivo_kvalifikacije_obrazovanja: 'Nivo kvalifikacije',
        stepen_strucne_spreme: 'Stepen strucne spreme',
        rad_na_daljinu: 'Rad na daljinu',
        mjesto_rada: 'Mjesto rada',
        tip_radnog_odnosa: 'Tip radnog odnosa',
        razlog_rada_na_odredjeno: 'Razlog rada na odredeno',
        datum_isteka_ugovora: 'Datum isteka ugovora',
        datum_stupanja_na_rad: 'Datum stupanja na rad',
        tip_radnog_vremena: 'Tip radnog vremena',
        broj_radnih_sati_sedmicno: 'Broj radnih sati sedmicno',
        iznos_bruto_zarade_broj: 'Iznos bruto zarade',
        broj_dana_godisnjeg_odmora: 'Broj dana godisnjeg odmora',
        otkazni_rok: 'Otkazni rok',
        definisan_probni_rad: 'Definisan probni rad',
        period_probnog_rada: 'Trajanje probnog rada',
        definisana_zabrana_konkurencije: 'Zabrana konkurencije',
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
    'Ugovor o radu': `UGOVOR O RADU
Zakljucen u {{mjesto_zakljucenja}}, dana {{datum_zakljucenja}} godine, na osnovu clana 29 Zakona o radu ("Sl. list CG", br. 74/19, 8/21, 59/21, 68/21 i 145/21), izmedu:
1.  **Poslodavca:** {{naziv_poslodavca}}, sa sjedistem na adresi {{adresa_poslodavca}}, PIB: {{pib_poslodavca}} (u daljem tekstu: Poslodavac), koga zastupa {{zastupnik_poslodavca}}, i
2.  **Zaposlenog:** {{ime_i_prezime_zaposlenog}}, sa prebivalistem na adresi {{adresa_zaposlenog}}, JMBG: {{jmbg_zaposlenog}} (u daljem tekstu: Zaposleni).

Clan 1: Predmet Ugovora
Ovim Ugovorom zasniva se radni odnos izmedu Poslodavca i Zaposlenog i ureduju se medusobna prava, obaveze i odgovornosti.

Clan 2: Radno Mjesto i Opis Poslova
1.  Zaposleni ce obavljati poslove na radnom mjestu: **{{naziv_radnog_mjesta}}**.
2.  Opis poslova radnog mjesta obuhvata: {{opis_poslova}}.
3.  Zaposleni se obavezuje da ce, u skladu sa potrebama procesa rada i svojim kvalifikacijama, obavljati i druge poslove po nalogu neposrednog rukovodioca.

Clan 3: Mjesto Rada
{{#if rad_na_daljinu}}
1.  Zaposleni ce poslove obavljati van prostorija Poslodavca, sa adrese prebivalista ili druge lokacije po dogovoru (rad na daljinu).
2.  Poslodavac obezbjeduje sredstva za rad neophodna za obavljanje poslova (racunar, telefon i sl.). Zaposleni je duzan da povjerena sredstva koristi sa paznjom dobrog domacina.
3.  Zaposleni je duzan da se pridrzava propisanih mjera zastite i zdravlja na radu i da osigura bezbjedne uslove rada na lokaciji sa koje radi.
{{else}}
Zaposleni ce obavljati poslove u sjedistu Poslodavca na adresi {{mjesto_rada}}.
U zavisnosti od potreba posla, Zaposleni moze biti upucen na rad van navedenog mjesta, u skladu sa zakonom.
{{/if}}

Clan 4: Strucna Sprema
Za obavljanje poslova iz clana 2. ovog Ugovora, potrebna je strucna sprema: {{nivo_kvalifikacije_obrazovanja}} ({{stepen_strucne_spreme}}).
Zaposleni potvrduje da posjeduje navedenu strucnu spremu i da je Poslodavcu predao svu potrebnu dokumentaciju.

Clan 5: Vrijeme Trajanja Ugovora
1.  Ovaj Ugovor se zakljucuje na: **{{tip_radnog_odnosa}}**.
{{#if je_na_odredjeno}}
2.  Radni odnos na odredeno vrijeme zasniva se zbog {{razlog_rada_na_odredeno}}, i traje do {{datum_isteka_ugovora}}.
{{/if}}

Clan 6: Dan Stupanja na Rad
Zaposleni je duzan da stupi na rad dana {{datum_stupanja_na_rad}} godine. Ovaj dan se smatra danom zasnivanja radnog odnosa.

Clan 7: Probni Rad
{{#if definisan_probni_rad}}
1.  Ugovara se probni rad u trajanju od {{period_probnog_rada}} mjeseci.
2.  Za vrijeme trajanja probnog rada, i Poslodavac i Zaposleni mogu otkazati ovaj Ugovor uz otkazni rok od najmanje 5 (pet) radnih dana.
3.  Ako Zaposleni do isteka probnog rada ne zadovolji na radnom mjestu, Poslodavac mu moze otkazati Ugovor o radu danom isteka probnog rada.
{{/if}}

Clan 8: Radno Vrijeme
1.  Radni odnos se zasniva sa {{tip_radnog_vremena}} radnim vremenom, u trajanju od {{broj_radnih_sati_sedmicno}} casova sedmicno.
2.  Raspored radnog vremena utvrduje Poslodavac, u skladu sa svojim aktima i potrebama procesa rada.

Clan 9: Zarada, Naknada Zarade i Druga Primanja
1.  Zaposleni ima pravo na zaradu za obavljeni rad i vrijeme provedeno na radu.
2.  Osnovna zarada Zaposlenog utvrduje se u bruto iznosu od **{{iznos_bruto_zarade_broj}} €** (slovima: {{iznos_bruto_zarade_slovima}} eura).
3.  Zarada se sastoji od osnovne zarade, dijela zarade za radni ucinak i uvecane zarade, u skladu sa zakonom, kolektivnim ugovorom i aktom Poslodavca.
4.  Zarada se isplacuje jednom mjesecno, najkasnije do kraja tekuceg mjeseca za prethodni mjesec.

Clan 10: Odmori i Odsustva
1.  Zaposleni ima pravo na odmor u toku dnevnog rada, dnevni odmor i sedmicni odmor, u skladu sa zakonom.
2.  Zaposleni za svaku kalendarsku godinu ima pravo na placeni godisnji odmor u trajanju od najmanje {{broj_dana_godisnjeg_odmora}} radnih dana.
3.  Duzina godisnjeg odmora utvrduje se rjesenjem Poslodavca.

Clan 11: Obaveze Zaposlenog i Odgovornost za Stetu
1. Zaposleni je duzan da poslove obavlja savjesno, kvalitetno i u predvidenim rokovima, te da se prema Poslodavcu i ostalim zaposlenima odnosi lojalno i sa postovanjem.
2. Zaposleni odgovara za stetu koju na radu ili u vezi sa radom, namjerno ili krajnjom nepaznjom, prouzrokuje Poslodavcu, u skladu sa zakonom.

Clan 12: Povjerljivost i Poslovna Tajna
1.  Zaposleni je duzan da cuva poslovnu tajnu Poslodavca. 2. Obaveza cuvanja poslovne tajne traje i nakon prestanka radnog odnosa, u periodu od 2 (dvije) godine.

Clan 13: Intelektualna Svojina
Sva autorska djela i druga prava intelektualne svojine koja Zaposleni stvori u toku izvrsavanja poslova iz ovog Ugovora, a u vezi sa djelatnoscu Poslodavca, iskljucivo su vlasnistvo Poslodavca, u skladu sa zakonom.

Clan 14: Zabrana Konkurencije
{{#if definisana_zabrana_konkurencije}}
1.  Zaposleni ne moze, za svoj ili tudi racun, obavljati poslove iz djelatnosti Poslodavca bez prethodne pisane saglasnosti Poslodavca.
2.  Ugovorne strane mogu ugovoriti i zabranu konkurencije nakon prestanka radnog odnosa, u trajanju do 2 (dvije) godine, uz obavezu Poslodavca da Zaposlenom isplacuje novcanu naknadu u skladu sa zakonom.
{{/if}}

Clan 15: Obrada Podataka o Licnosti
1. Zaposleni je saglasan i potpisom na ovom Ugovoru daje svoj pristanak da Poslodavac prikuplja i obraduje podatke o njegovoj licnosti iskljucivo u svrhe ostvarivanja prava i obaveza iz radnog odnosa, vodenja kadrovske evidencije i ispunjavanja zakonskih obaveza Poslodavca. 2. Poslodavac se obavezuje da ce sa podacima o licnosti Zaposlenog postupati u skladu sa zakonom kojim se ureduje zastita podataka o licnosti.

Clan 16: Zastita i Zdravlje na Radu
1. Poslodavac se obavezuje da obezbijedi i sprovodi sve neophodne mjere zastite i zdravlja na radu, u skladu sa zakonom i opstim aktima Poslodavca. 2. Zaposleni je duzan da se pridrzava propisanih mjera zastite i zdravlja na radu.

Clan 17: Prestanak Radnog Odnosa i Vracanje Sredstava
1.  Radni odnos moze prestati na nacine i pod uslovima predvidenim Zakonom o radu.
2.  Poslodavac moze otkazati ovaj Ugovor Zaposlenom ako za to postoji opravdan razlog, a narocito u slucaju teze povrede radne obaveze.
3.  U slucaju otkaza od strane Poslodavca ili Zaposlenog, otkazni rok iznosi {{otkazni_rok}} dana, osim ako zakonom nije drugacije odredeno.
4.  Zaposleni je obavezan da, najkasnije na dan prestanka radnog odnosa, Poslodavcu vrati svu opremu i druga sredstva za rad koja su mu povjerena (sluzbeni telefon, racunar, vozilo, kartice, itd.).

Clan 18: Rjesavanje Sporova
Ugovorne strane su saglasne da sve eventualne sporove koji proisteknu iz ovog Ugovora rjesavaju sporazumno.
Ukoliko to ne bude moguce, prihvataju nadleznost Osnovnog suda u {{mjesto_suda}}.

Clan 19: Zavrsne Odredbe
Na sve sto nije regulisano ovim Ugovorom primjenjivace se odredbe Zakona o radu, opsteg akta Poslodavca i drugih vazecih propisa.
Ugovor je sacinjen u 2 (dva) istovjetna primjerka, po jedan za svaku ugovornu stranu.
<br>
**POSLODAVAC** _________________________ {{naziv_poslodavca}} (Zastupan po: {{zastupnik_poslodavca}})
**ZAPOSLENI** _________________________ {{ime_i_prezime_zaposlenog}}`,
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
                <p>Ukoliko za izradu ugovora budu potrebne dodatne informacije, kontaktiracemo Vas. Ugovor ce biti generisan, pregledan i poslat Vam u roku od 24 casa od momenta kada uplata bude proknjizena i dostupna na nasem racunu.</p>
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
  const ugovor_type = 'Ugovor o povjerljivosti (NDA)';
  const total_price = 29;
  const client_name = formData['tip_ugovora'] === 'Jednostrani' ? formData['naziv_strane_koja_prima'] : formData['naziv_strane_a'];
  const client_address = formData['tip_ugovora'] === 'Jednostrani' ? formData['adresa_strane_koja_prima'] : formData['adresa_strane_a'];
  const client_id = formData['tip_ugovora'] === 'Jednostrani' ? formData['id_broj_strane_koja_prima'] : formData['id_broj_strane_a'];

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
    
    const specificData = formData['tip_ugovora'] === 'Jednostrani' ? {
      order_id: order_id,
      tip_ugovora: formData['tip_ugovora'],
      naziv_strane_koja_otkriva: formData['naziv_strane_koja_otkriva'],
      adresa_strane_koja_otkriva: formData['adresa_strane_koja_otkriva'],
      id_broj_strane_koja_otkriva: formData['id_broj_strane_koja_otkriva'],
      naziv_strane_koja_prima: formData['naziv_strane_koja_prima'],
      adresa_strane_koja_prima: formData['adresa_strane_koja_prima'],
      id_broj_strane_koja_prima: formData['id_broj_strane_koja_prima'],
      mjesto_zakljucenja: formData['mjesto_zakljucenja'],
      datum_zakljucenja: formData['datum_zakljucenja'],
      svrha_otkrivanja: formData['svrha_otkrivanja'],
      period_trajanja_obaveze: formData['period_trajanja_obaveze'],
      ugovorena_kazna: formData['ugovorena_kazna'] === 'Da',
      iznos_ugovorene_kazne: formData['iznos_ugovorene_kazne'] || null
    } : {
      order_id: order_id,
      tip_ugovora: formData['tip_ugovora'],
      naziv_strane_a: formData['naziv_strane_a'],
      adresa_strane_a: formData['adresa_strane_a'],
      id_broj_strane_a: formData['id_broj_strane_a'],
      naziv_strane_b: formData['naziv_strane_b'],
      adresa_strane_b: formData['adresa_strane_b'],
      id_broj_strane_b: formData['id_broj_strane_b'],
      mjesto_zakljucenja: formData['mjesto_zakljucenja'],
      datum_zakljucenja: formData['datum_zakljucenja'],
      svrha_otkrivanja: formData['svrha_otkrivanja'],
      period_trajanja_obaveze: formData['period_trajanja_obaveze'],
      ugovorena_kazna: formData['ugovorena_kazna'] === 'Da',
      iznos_ugovorene_kazne: formData['iznos_ugovorene_kazne'] || null
    };

    const { error: specificError } = await supabase
      .from('orders_ugovor_o_povjerljivosti_nda')
      .insert([specificData]);

    if (specificError) {
      console.error('Greska pri unosu u orders_ugovor_o_povjerljivosti_nda tabelu:', specificError);
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

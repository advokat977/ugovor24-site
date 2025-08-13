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
        mjesto_zakljucenja: 'Mjesto zakljucenja',
        datum_zakljucenja: 'Datum zakljucenja',
        naziv_narucioca: 'Naziv Narucioca',
        adresa_narucioca: 'Adresa Narucioca',
        id_broj_narucioca: 'ID broj Narucioca',
        naziv_izvrsioca: 'Naziv Izvrsioca',
        adresa_izvrsioca: 'Adresa Izvrsioca',
        id_broj_izvrsioca: 'ID broj Izvrsioca',
        racun_izvrsioca: 'Ziro racun Izvrsioca',
        banka_izvrsioca: 'Banka Izvrsioca',
        predmet_ugovora: 'Predmet ugovora',
        rok_zavrsetka: 'Rok zavrsetka',
        isporuka_definisana: 'Isporuka definisana',
        definicija_isporuke: 'Definicija isporuke',
        iznos_naknade_broj: 'Iznos naknade',
        tip_naknade: 'Tip naknade',
        rok_placanja: 'Rok placanja',
        je_autorsko_djelo: 'Autorsko djelo',
        pristup_povjerljivim_info: 'Pristup povjerljivim informacijama',
        definisan_proces_revizije: 'Definisan proces revizije',
        broj_revizija: 'Broj revizija',
        rok_za_feedback: 'Rok za feedback',
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

// Funkcija za formatiranje broja sa vodecim nulama
function formatOrderNumber(number) {
  const numString = String(number);
  const leadingZeros = '00000'.substring(0, 5 - numString.length);
  return `${leadingZeros}${numString}`;
}

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
Izvršilac se obavezuje da posao iz clana 1. ovog Ugovora zavrsi u potpunosti i preda Narucilac najkasnije do {{rok_zavrsetka}}.
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

async function generateInvoicePDF(orderId, ugovorType, totalPrice, orderNumber, clientName, clientAddress, clientID) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 format
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const primaryColor = rgb(0, 0.49, 1);
    const black = rgb(0.13, 0.13, 0.13);
    
    // URL tvog sajta za logo
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

    // Header za racun
    const formattedOrderNumber = formatOrderNumber(orderNumber);
    page.drawText('PREDRACUN', { x: 440, y: 780, size: 18, font: font, color: black });
    page.drawText(`Br. narudzbe: ${formattedOrderNumber}`, { x: 420, y: 760, size: 10, font: font, color: black });

    // Izdato za (Narucilac)
    page.drawText('IZDATO ZA:', { x: 50, y: 720, size: 12, font: font, color: primaryColor });
    page.drawText(clientName, { x: 50, y: 700, size: 12, font: font, color: black });
    page.drawText(clientAddress, { x: 50, y: 685, size: 10, font: font, color: black });
    page.drawText(`ID broj: ${clientID}`, { x: 50, y: 670, size: 10, font: font, color: black });

    // Tabela sa uslugom i cijenom
    page.drawText('Usluga', { x: 50, y: 620, size: 12, font: font, color: primaryColor });
    page.drawText('Cijena', { x: 450, y: 620, size: 12, font: font, color: primaryColor });
    page.drawLine({
        start: { x: 50, y: 610 },
        end: { x: 545, y: 610 },
        color: primaryColor,
        thickness: 1
    });
    page.drawText(ugovorType, { x: 50, y: 590, size: 12, font: font, color: black });
    page.drawText(`${totalPrice} EUR`, { x: 450, y: 590, size: 12, font: font, color: black });
    page.drawLine({
        start: { x: 50, y: 580 },
        end: { x: 545, y: 580 },
        color: primaryColor,
        thickness: 1
    });
    
    // Ukupno
    page.drawText('UKUPNO', { x: 350, y: 550, size: 12, font: font, color: black });
    page.drawText(`${totalPrice} EUR`, { x: 450, y: 550, size: 12, font: font, color: black });
    page.drawLine({
        start: { x: 350, y: 540 },
        end: { x: 545, y: 540 },
        color: black,
        thickness: 1
    });

    // Instrukcije za placanje
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
        const invoicePdfBytes = await generateInvoicePDF(orderId, ugovorType, totalPrice, clientName, clientAddress, clientID, formattedOrderNumber);
        
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
        console

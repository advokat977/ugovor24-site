// api/submit-form.js

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

function formatOrderNumber(number) {
  const numString = String(number);
  const leadingZeros = '00000'.substring(0, 5 - numString.length);
  return `${leadingZeros}${numString}`;
}

const masterTemplates = {
    'Ugovor o djelu': {
        table: 'orders_ugovor_o_djelu',
        price: 59,
        get_client_info: (formData) => ({
            name: formData['naziv_narucioca'],
            address: formData['adresa_narucioca'],
            id: formData['id_broj_narucioca']
        }),
        data: (formData, orderId) => ({
            order_id: orderId,
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
        })
    },
    'Ugovor o zakupu': {
        table: 'orders_ugovor_o_zakupu',
        price: 79,
        get_client_info: (formData) => ({
            name: formData['naziv_zakupca'],
            address: formData['adresa_zakupca'],
            id: formData['id_broj_zakupca']
        }),
        data: (formData, orderId) => ({
            order_id: orderId,
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
        })
    },
    'Ugovor o radu': {
        table: 'orders_ugovor_o_radu',
        price: 99,
        get_client_info: (formData) => ({
            name: formData['ime_i_prezime_zaposlenog'],
            address: formData['adresa_zaposlenog'],
            id: formData['jmbg_zaposlenog']
        }),
        data: (formData, orderId) => ({
            order_id: orderId,
            mjesto_zakljucenja: formData['mjesto_zakljucenja'],
            datum_zakljucenja: formData['datum_zakljucenja'],
            naziv_poslodavca: formData['naziv_poslodavca'],
            adresa_poslodavca: formData['adresa_poslodavca'],
            pib_poslodavca: formData['pib_poslodavca'],
            zastupnik_poslodavca: formData['zastupnik_poslodavca'],
            ime_i_prezime_zaposlenog: formData['ime_i_prezime_zaposlenog'],
            adresa_zaposlenog: formData['adresa_zaposlenog'],
            jmbg_zaposlenog: formData['jmbg_zaposlenog'],
            naziv_radnog_mjesta: formData['naziv_radnog_mjesta'],
            opis_poslova: formData['opis_poslova'],
            nivo_kvalifikacije_obrazovanja: formData['nivo_kvalifikacije_obrazovanja'],
            stepen_strucne_spreme: formData['stepen_strucne_spreme'],
            rad_na_daljinu: formData['rad_na_daljinu'] === 'Da',
            mjesto_rada: formData['mjesto_rada'] || null,
            tip_radnog_odnosa: formData['tip_radnog_odnosa'],
            razlog_rada_na_odredeno: formData['razlog_rada_na_odredeno'] || null,
            datum_isteka_ugovora: formData['datum_isteka_ugovora'] || null,
            datum_stupanja_na_rad: formData['datum_stupanja_na_rad'],
            tip_radnog_vremena: formData['tip_radnog_vremena'],
            broj_radnih_sati_sedmicno: formData['broj_radnih_sati_sedmicno'],
            iznos_bruto_zarade_broj: formData['iznos_bruto_zarade_broj'],
            broj_dana_godisnjeg_odmora: formData['broj_dana_godisnjeg_odmora'],
            otkazni_rok: formData['otkazni_rok'],
            definisan_probni_rad: formData['definisan_probni_rad'] === 'Da',
            period_probnog_rada: formData['period_probnog_rada'] || null,
            definisana_zabrana_konkurencije: formData['definisana_zabrana_konkurencije'] === 'Da'
        })
    },
    'Ugovor o povjerljivosti (NDA)': {
        table: 'orders_ugovor_o_povjerljivosti_nda',
        price: 29,
        get_client_info: (formData) => {
            if (formData['tip_ugovora'] === 'Jednostrani') {
                return {
                    name: formData['naziv_strane_koja_prima'],
                    address: formData['adresa_strane_koja_prima'],
                    id: formData['id_broj_strane_koja_prima']
                };
            } else {
                return {
                    name: formData['naziv_strane_a'],
                    address: formData['adresa_strane_a'],
                    id: formData['id_broj_strane_a']
                };
            }
        },
        data: (formData, orderId) => {
            if (formData['tip_ugovora'] === 'Jednostrani') {
                return {
                    order_id: orderId,
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
                };
            } else {
                return {
                    order_id: orderId,
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
            }
        }
    },
    'Set dokumenata za registraciju firme (DOO)': {
        table: 'orders_set_za_firmu_doo',
        price: 199,
        get_client_info: (formData) => ({
            name: formData['ime_osnivaca_1'],
            address: formData['adresa_osnivaca_1'],
            id: formData['id_osnivaca_1']
        }),
        data: (formData, orderId) => ({
            order_id: orderId,
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
        })
    }
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
  const ugovor_type = formData['ugovor_type'];
  
  if (!ugovor_type || !masterTemplates[ugovor_type]) {
    return res.status(400).json({ error: 'Invalid ugovor type' });
  }

  const contractInfo = masterTemplates[ugovor_type];
  const total_price = contractInfo.price;
  const client_email = formData['client_email'];

  let clientInfo = contractInfo.get_client_info(formData);

  if (!client_email || !total_price) {
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
    
    const specificData = contractInfo.data(formData, order_id);

    const { error: specificError } = await supabase
      .from(contractInfo.table)
      .insert([specificData]);

    if (specificError) {
      console.error(`Greska pri unosu u ${contractInfo.table} tabelu:`, specificError);
      return res.status(500).json({ error: 'Database insertion error' });
    }

    const emailResult = await sendConfirmationEmailToClient(client_email, ugovor_type, total_price, order_id, order_number, clientInfo.name, clientInfo.address, clientInfo.id);
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

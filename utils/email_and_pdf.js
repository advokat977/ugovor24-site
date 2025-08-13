// utils/email_and_pdf.js

import { Resend } from 'resend';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fetch from 'node-fetch';

const resend = new Resend(process.env.RESEND_API_KEY);

export function removeDiacritics(text) {
    if (!text) return '';
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function formatFormData(formData) {
    let formattedText = '';
    const translations = {
        tip_ugovora: 'Tip ugovora',
        naziv_strane_koja_otkriva: 'Naziv strane koja otkriva',
        adresa_strane_koja_otkriva: 'Adresa strane koja otkriva',
        id_broj_strane_koja_otkriva: 'ID broj strane koja otkriva',
        naziv_strane_koja_prima: 'Naziv strane koja prima',
        adresa_strane_koja_prima: 'Adresa strane koja prima',
        id_broj_strane_koja_prima: 'ID broj strane koja prima',
        naziv_strane_a: 'Naziv strane A',
        adresa_strane_a: 'Adresa strane A',
        id_broj_strane_a: 'ID broj strane A',
        naziv_strane_b: 'Naziv strane B',
        adresa_strane_b: 'Adresa strane B',
        id_broj_strane_b: 'ID broj strane B',
        mjesto_zakljucenja: 'Mjesto zakljucenja',
        datum_zakljucenja: 'Datum zakljucenja',
        svrha_otkrivanja: 'Svrha otkrivanja',
        period_trajanja_obaveze: 'Trajanje obaveze',
        ugovorena_kazna: 'Ugovorena kazna',
        iznos_ugovorene_kazne: 'Iznos kazne',
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
        definisan_probni_rad: 'Definisan probni rad',
        period_probnog_rada: 'Trajanje probnog rada',
        definisana_zabrana_konkurencije: 'Zabrana konkurencije',
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
        if (value === true || value === 'Da') value = 'Da';
        if (value === false || value === 'Ne') value = 'Ne';
        if (value && label !== 'client_email' && label !== 'terms_acceptance' && label !== 'ugovor_type') {
            formattedText += `**${label}:** ${value}\n`;
        }
    }
    return formattedText;
}

export function formatOrderNumber(number) {
    const numString = String(number);
    const leadingZeros = '00000'.substring(0, 5 - numString.length);
    return `${leadingZeros}${numString}`;
}

export async function generateInvoicePDF(orderId, ugovorType, totalPrice, orderNumber, clientName, clientAddress, clientID) {
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
    page.drawText(removeDiacritics('Primalac: advokat Dejan Radinović'), { x: 50, y: 480, size: 12, font: font, color: black });
    page.drawText(removeDiacritics('Adresa: Božane Vučinić 7/5, 81000 Podgorica, Crna Gora'), { x: 50, y: 465, size: 12, font: font, color: black });
    page.drawText(removeDiacritics('Banka: Erste bank AD Podgorica'), { x: 50, y: 450, size: 12, font: font, color: black });
    page.drawText(removeDiacritics('Broj računa: 540-0000000011285-46'), { x: 50, y: 435, size: 12, font: font, color: black });
    page.drawText(removeDiacritics(`Svrha uplate: Uplata za ugovor #${formattedOrderNumber}`), { x: 50, y: 420, size: 12, font: font, color: black });

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
}

export async function sendConfirmationEmailToClient(clientEmail, ugovorType, totalPrice, orderId, orderNumber, clientName, clientAddress, clientID) {
    let invoicePdfBytes = null;
    try {
        const formattedOrderNumber = formatOrderNumber(orderNumber);
        invoicePdfBytes = await generateInvoicePDF(orderId, ugovorType, totalPrice, formattedOrderNumber, clientName, clientAddress, clientID);
    } catch (pdfError) {
        console.error(`Greska pri generisanju PDF-a za narudžbinu ${orderNumber}:`, pdfError);
        return { success: false, error: 'Failed to generate PDF' };
    }
    
    try {
        const formattedOrderNumber = formatOrderNumber(orderNumber);
        
        const emailHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; padding: 20px; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #fff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="padding: 20px; text-align: center; border-bottom: 1px solid #eee;">
                        <img src="https://ugovor24-site.vercel.app/logo.png" alt="ugovor24.com Logo" style="width: 150px;">
                    </div>
                    <div style="padding: 20px;">
                        <p style="font-size: 16px;">Poštovani/a ${clientName},</p>
                        <p style="font-size: 16px;">Ovo je automatska potvrda da je Vaš zahtev za <b>${ugovorType}</b> uspešno primljen pod brojem <b>#${formattedOrderNumber}</b>.</p>
                        <p style="font-size: 16px;">Molimo izvršite uplatu u iznosu od <b>${totalPrice} EUR</b>. Predračun sa instrukcijama za plaćanje je u prilogu.</p>
                        <p style="font-size: 16px;">Ukoliko za izradu ugovora budu potrebne dodatne informacije, kontaktiraćemo Vas. Nakon što uplata bude proknjižena, ugovor će Vam biti poslat.</p>
                        <p style="font-size: 16px; margin-top: 30px;">Srdačan pozdrav,</p>
                        <p style="font-size: 16px;">Tim ugovor24.com</p>
                    </div>
                    <div style="padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee;">
                        <p>&copy; 2025 ugovor24.com. Sva prava zadržana.</p>
                    </div>
                </div>
            </div>
        `;

        const attachments = invoicePdfBytes ? [{
            filename: `predracun-${formattedOrderNumber}.pdf`,
            content: Buffer.from(invoicePdfBytes)
        }] : [];

        await resend.emails.send({
            from: 'noreply@ugovor24.com',
            to: clientEmail,
            subject: `Potvrda zahteva za ${removeDiacritics(ugovorType)} - ugovor24.com`,
            html: emailHtml,
            attachments: attachments
        });

        console.log(`Uspešno poslat e-mail klijentu ${clientEmail} za narudžbinu ${formattedOrderNumber}.`);
        return { success: true };
    } catch (error) {
        console.error(`Greska pri slanju e-maila klijentu ${clientEmail} za narudžbinu ${orderNumber}:`, error);
        return { success: false, error: 'Failed to send email to client' };
    }
}

export async function sendNotificationEmailToAdmin(ugovorType, orderId, orderNumber, formData) {
    const formattedData = formatFormData(formData);
    const formattedOrderNumber = formatOrderNumber(orderNumber);
    
    const supabaseTableUrl = `https://app.supabase.com/project/${process.env.SUPABASE_PROJECT_ID}/editor/${determineTableName(ugovorType)}?search=${orderId}`;

    try {
        const emailHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; padding: 20px; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #fff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="padding: 20px; text-align: center; border-bottom: 1px solid #eee;">
                        <img src="https://ugovor24-site.vercel.app/logo.png" alt="ugovor24.com Logo" style="width: 150px;">
                    </div>
                    <div style="padding: 20px;">
                        <p style="font-size: 16px;">Dobar dan, Dejane,</p>
                        <p style="font-size: 16px;">Imate novu narudzbinu za <b>${ugovorType}</b>.</p>
                        <p style="font-size: 16px;"><b>Broj narudžbe:</b> #${formattedOrderNumber}</p>
                        <p style="font-size: 16px;"><b>ID narudžbe:</b> ${orderId}</p>
                        <p style="font-size: 16px; margin-top: 20px;"><b>Podaci iz upitnika:</b></p>
                        <pre style="background-color: #f7f7f7; padding: 15px; border-radius: 4px; border: 1px solid #eee; white-space: pre-wrap; word-wrap: break-word;">${formattedData}</pre>
                        <p style="font-size: 16px;">Možete pregledati detalje narudžbine direktno u Supabase-u: <a href="${supabaseTableUrl}">Idi na narudžbinu</a></p>
                        <p style="font-size: 16px; margin-top: 30px;">Srdačan pozdrav,</p>
                        <p style="font-size: 16px;">Sistem ugovor24.com</p>
                    </div>
                    <div style="padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee;">
                        <p>&copy; 2025 ugovor24.com. Sva prava zadržana.</p>
                    </div>
                </div>
            </div>
        `;
        
        await resend.emails.send({
            from: 'noreply@ugovor24.com',
            to: 'titograd977@gmail.com',
            subject: `NOVA NARUDZBA: ${removeDiacritics(ugovorType)} (#${formattedOrderNumber})`,
            html: emailHtml,
        });

        console.log(`Uspešno poslat notifikacioni e-mail administratoru za narudžbinu ${formattedOrderNumber}.`);
        return { success: true };
    } catch (error) {
        console.error(`Greska pri slanju e-maila administratoru za narudžbinu ${orderNumber}:`, error);
        return { success: false, error: 'Failed to send notification email' };
    }
}

function determineTableName(ugovorType) {
    switch (ugovorType) {
        case 'Ugovor o povjerljivosti (NDA)':
            return 'orders_ugovor_o_povjerljivosti_nda';
        case 'Ugovor o djelu':
            return 'orders_ugovor_o_djelu';
        case 'Ugovor o zakupu':
            return 'orders_ugovor_o_zakupu';
        case 'Ugovor o radu':
            return 'orders_ugovor_o_radu';
        case 'Set dokumenata za registraciju firme (DOO)':
            return 'orders_set_za_firmu_doo';
        default:
            return 'orders';
    }
}

export async function sendFinalEmailToClient(order, finalDocumentUrl, documentName) {
    try {
        const ugovorType = order.ugovor_type;
        const formattedOrderNumber = formatOrderNumber(order.order_number);
        
        let clientName = '';
        if (ugovorType === 'Ugovor o djelu' && order.orders_ugovor_o_djelu.length > 0) {
            clientName = order.orders_ugovor_o_djelu[0].naziv_narucioca;
        } else if (ugovorType === 'Ugovor o zakupu' && order.orders_ugovor_o_zakupu.length > 0) {
            clientName = order.orders_ugovor_o_zakupu[0].naziv_zakupca;
        } else if (ugovorType === 'Ugovor o radu' && order.orders_ugovor_o_radu.length > 0) {
            clientName = order.orders_ugovor_o_radu[0].ime_i_prezime_zaposlenog;
        } else if (ugovorType === 'Ugovor o povjerljivosti (NDA)' && order.orders_ugovor_o_povjerljivosti_nda.length > 0) {
            clientName = order.orders_ugovor_o_povjerljivosti_nda[0].tip_ugovora === 'Jednostrani' ? order.orders_ugovor_o_povjerljivosti_nda[0].naziv_strane_koja_prima : order.orders_ugovor_o_povjerljivosti_nda[0].naziv_strane_a;
        } else if (ugovorType === 'Set dokumenata za registraciju firme (DOO)' && order.orders_set_za_firmu_doo.length > 0) {
            clientName = order.orders_set_za_firmu_doo[0].ime_osnivaca_1;
        } else {
            clientName = order.client_email;
        }
        
        const fileResponse = await fetch(finalDocumentUrl);
        const fileContent = await fileResponse.arrayBuffer();
        
        const emailHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; padding: 20px; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #fff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="padding: 20px; text-align: center; border-bottom: 1px solid #eee;">
                        <img src="https://ugovor24-site.vercel.app/logo.png" alt="ugovor24.com Logo" style="width: 150px;">
                    </div>
                    <div style="padding: 20px;">
                        <p style="font-size: 16px;">Poštovani/a ${clientName},</p>
                        <p style="font-size: 16px;">Čestitamo! Vaša uplata je proknjižena i Vaš ugovor je odobren.</p>
                        <p style="font-size: 16px;">Finalna verzija Vašeg ugovora je u prilogu ovog e-maila.</p>
                        <p style="font-size: 16px; margin-top: 30px;">Srdačan pozdrav,</p>
                        <p style="font-size: 16px;">Tim ugovor24.com</p>
                    </div>
                    <div style="padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee;">
                        <p>&copy; 2025 ugovor24.com. Sva prava zadržana.</p>
                    </div>
                </div>
            </div>
        `;

        await resend.emails.send({
            from: 'noreply@ugovor24.com',
            to: order.client_email,
            subject: `Vas ugovor je spreman za preuzimanje: ${removeDiacritics(ugovorType)} (#${formattedOrderNumber})`,
            html: emailHtml,
            attachments: [
                {
                    filename: documentName,
                    content: Buffer.from(fileContent)
                }
            ]
        });
        return { success: true };
    } catch (error) {
        console.error('Greska pri slanju finalnog e-maila:', error);
        return { success: false, error: 'Failed to send final email' };
    }
}

export async function sendFinalEmailToAdmin(order, finalDocumentUrl, documentName) {
    try {
        const ugovorType = order.ugovor_type;
        const formattedOrderNumber = formatOrderNumber(order.order_number);
        
        const fileResponse = await fetch(finalDocumentUrl);
        const fileContent = await fileResponse.arrayBuffer();

        const emailHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; padding: 20px; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #fff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="padding: 20px; text-align: center; border-bottom: 1px solid #eee;">
                        <img src="https://ugovor24-site.vercel.app/logo.png" alt="ugovor24.com Logo" style="width: 150px;">
                    </div>
                    <div style="padding: 20px;">
                        <p style="font-size: 16px;">Dobar dan, Dejane,</p>
                        <p style="font-size: 16px;">Kopija e-maila poslatog klijentu <b>${order.client_email}</b>.</p>
                        <p style="font-size: 16px;">Ugovor za <b>${ugovorType}</b> pod brojem <b>#${formattedOrderNumber}</b> je uspesno poslat.</p>
                        <p style="font-size: 16px; margin-top: 30px;">Srdačan pozdrav,</p>
                        <p style="font-size: 16px;">Sistem ugovor24.com</p>
                    </div>
                    <div style="padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee;">
                        <p>&copy; 2025 ugovor24.com. Sva prava zadržana.</p>
                    </div>
                </div>
            </div>
        `;

        await resend.emails.send({
            from: 'noreply@ugovor24.com',
            to: 'titograd977@gmail.com',
            subject: `KOPIJA: Poslat finalni ugovor (${removeDiacritics(ugovorType)} #${formattedOrderNumber})`,
            html: emailHtml,
            attachments: [
                {
                    filename: documentName,
                    content: Buffer.from(fileContent)
                }
            ]
        });
        return { success: true };
    } catch (error) {
        console.error('Greska pri slanju kopije e-maila administratoru:', error);
        return { success: false, error: 'Failed to send copy email' };
    }
}

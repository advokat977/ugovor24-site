// utils/email_and_pdf.js

import { Resend } from 'resend';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fetch from 'node-fetch';

const resend = new Resend(process.env.RESEND_API_KEY);

function removeDiacritics(text) {
    if (!text) return '';
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function formatFormData(formData) {
    let formattedText = '';
    const translations = {
        ugovor_type: 'Tip ugovora', client_email: 'Email klijenta', e_mail_adresa: 'Email adresa firme',
        ime_i_prezime_zaposlenog: 'Ime i prezime Zaposlenog', naziv_narucioca: 'Naziv Naručioca',
        naziv_zakupca: 'Naziv Zakupca', ime_osnivaca_1: 'Ime osnivača 1',
        naziv_strane_koja_prima: 'Naziv Strane koja prima', naziv_strane_a: 'Naziv Strane A'
    };

    for (const key in formData) {
        if (key !== 'terms_acceptance' && key !== 'ugovor_type') {
            let value = formData[key];
            let label = translations[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            
            if (typeof value === 'boolean') {
                value = value ? 'Da' : 'Ne';
            }

            if (value) {
                formattedText += `**${label}:** ${value}\n`;
            }
        }
    }
    return formattedText;
}

function formatOrderNumber(number) {
    return String(number).padStart(5, '0');
}

// Nova pomoćna funkcija za izvlačenje podataka o klijentu iz form_data JSONB polja
function getClientInfo(formData) {
    const ugovorType = formData.ugovor_type;
    let client_name = formData.client_email || formData.e_mail_adresa; // Fallback u slučaju da ne nađe specifično ime
    let client_address = 'N/A';
    let client_id = 'N/A';

    switch (ugovorType) {
        case 'Ugovor o povjerljivosti (NDA)':
            client_name = formData.tip_ugovora === 'Jednostrani' ? formData.naziv_strane_koja_prima : formData.naziv_strane_a;
            client_address = formData.tip_ugovora === 'Jednostrani' ? formData.adresa_strane_koja_prima : formData.adresa_strane_a;
            client_id = formData.tip_ugovora === 'Jednostrani' ? formData.id_broj_strane_koja_prima : formData.id_broj_strane_a;
            break;
        case 'Ugovor o djelu':
            client_name = formData.naziv_narucioca;
            client_address = formData.adresa_narucioca;
            client_id = formData.id_broj_narucioca;
            break;
        case 'Ugovor o zakupu':
            client_name = formData.naziv_zakupca;
            client_address = formData.adresa_zakupca;
            client_id = formData.id_broj_zakupca;
            break;
        case 'Ugovor o radu':
            client_name = formData.ime_i_prezime_zaposlenog;
            client_address = formData.adresa_zaposlenog;
            client_id = formData.jmbg_zaposlenog;
            break;
        case 'Set dokumenata za registraciju firme (DOO)':
            client_name = formData.ime_osnivaca_1;
            client_address = formData.adresa_osnivaca_1;
            client_id = formData.id_osnivaca_1;
            break;
    }
    return { client_name, client_address, client_id };
}


async function generateInvoicePDF(orderNumber, ugovorType, totalPrice, clientName, clientAddress, clientID) {
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
        console.error('Greška pri ucitavanju loga:', e);
    }
    
    if (logoImage) {
        const logoDims = logoImage.scale(0.3);
        page.drawImage(logoImage, { x: 50, y: 780, width: logoDims.width, height: logoDims.height });
    }

    page.drawText('PREDRACUN', { x: 440, y: 780, size: 18, font: font, color: black });
    page.drawText(`Br. narudzbe: #${orderNumber}`, { x: 420, y: 760, size: 10, font: font, color: black });

    page.drawText('IZDATO ZA:', { x: 50, y: 720, size: 12, font: font, color: primaryColor });
    page.drawText(removeDiacritics(clientName), { x: 50, y: 700, size: 12, font: font, color: black });
    page.drawText(removeDiacritics(clientAddress), { x: 50, y: 685, size: 10, font: font, color: black });
    page.drawText(`ID broj: ${removeDiacritics(clientID)}`, { x: 50, y: 670, size: 10, font: font, color: black });

    page.drawText('Usluga', { x: 50, y: 620, size: 12, font: font, color: primaryColor });
    page.drawText('Cijena', { x: 450, y: 620, size: 12, font: font, color: primaryColor });
    page.drawLine({ start: { x: 50, y: 610 }, end: { x: 545, y: 610 }, color: primaryColor, thickness: 1 });
    page.drawText(removeDiacritics(ugovorType), { x: 50, y: 590, size: 12, font: font, color: black });
    page.drawText(`${totalPrice} EUR`, { x: 450, y: 590, size: 12, font: font, color: black });
    page.drawLine({ start: { x: 50, y: 580 }, end: { x: 545, y: 580 }, color: primaryColor, thickness: 1 });
    
    page.drawText('UKUPNO', { x: 350, y: 550, size: 12, font: font, color: black });
    page.drawText(`${totalPrice} EUR`, { x: 450, y: 550, size: 12, font: font, color: black });
    page.drawLine({ start: { x: 350, y: 540 }, end: { x: 545, y: 540 }, color: black, thickness: 1 });

    page.drawText('Podaci za uplatu:', { x: 50, y: 500, size: 12, font: font, color: primaryColor });
    page.drawText(removeDiacritics('Primalac: advokat Dejan Radinović'), { x: 50, y: 480, size: 12, font: font, color: black });
    page.drawText(removeDiacritics('Adresa: Božane Vučinić 7/5, 81000 Podgorica, Crna Gora'), { x: 50, y: 465, size: 12, font: font, color: black });
    page.drawText(removeDiacritics('Banka: Erste bank AD Podgorica'), { x: 50, y: 450, size: 12, font: font, color: black });
    page.drawText(removeDiacritics('Broj računa: 540-0000000011285-46'), { x: 50, y: 435, size: 12, font: font, color: black });
    page.drawText(removeDiacritics(`Svrha uplate: Uplata za ugovor #${orderNumber}`), { x: 50, y: 420, size: 12, font: font, color: black });

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
}

export async function sendConfirmationEmailToClient(clientEmail, ugovorType, totalPrice, orderId, orderNumber, formData) {
    const formattedOrderNumber = formatOrderNumber(orderNumber);
    const { client_name, client_address, client_id } = getClientInfo(formData);
    
    let invoicePdfBytes;
    try {
        invoicePdfBytes = await generateInvoicePDF(formattedOrderNumber, ugovorType, totalPrice, client_name, client_address, client_id);
    } catch (pdfError) {
        console.error(`Greška pri generisanju PDF-a za narudžbinu ${formattedOrderNumber}:`, pdfError);
        return { success: false, error: 'Failed to generate PDF' };
    }
    
    try {
        const emailHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px;">
                <p>Poštovani/a ${client_name},</p>
                <p>Ovo je automatska potvrda da je Vaš zahtev za <b>${ugovorType}</b> uspešno primljen pod brojem <b>#${formattedOrderNumber}</b>.</p>
                <p>Molimo izvršite uplatu u iznosu od <b>${totalPrice} EUR</b>. Predračun sa instrukcijama za plaćanje je u prilogu.</p>
                <p>Srdačan pozdrav,</p>
                <p>Tim ugovor24.com</p>
            </div>
        `;

        await resend.emails.send({
            from: 'noreply@ugovor24.com',
            to: clientEmail,
            subject: `Potvrda zahteva za ${removeDiacritics(ugovorType)} - ugovor24.com`,
            html: emailHtml,
            attachments: [{
                filename: `predracun-${formattedOrderNumber}.pdf`,
                content: Buffer.from(invoicePdfBytes)
            }]
        });

        return { success: true };
    } catch (error) {
        console.error(`Greška pri slanju e-maila klijentu ${clientEmail}:`, error);
        return { success: false, error: 'Failed to send email to client' };
    }
}

export async function sendNotificationEmailToAdmin(ugovorType, orderId, orderNumber, formData) {
    const formattedData = formatFormData(formData);
    const formattedOrderNumber = formatOrderNumber(orderNumber);
    const adminPanelUrl = `https://ugovor24.com/admin-panel.html`;

    try {
        const emailHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px;">
                <p>Imate novu narudzbinu za <b>${ugovorType}</b>.</p>
                <p><b>Broj narudžbe:</b> #${formattedOrderNumber}</p>
                <p><b>Podaci iz upitnika:</b></p>
                <pre style="background-color: #f7f7f7; padding: 15px; border-radius: 4px; white-space: pre-wrap; word-wrap: break-word;">${formattedData}</pre>
                <p>Upravljajte narudžbinom preko admin panela: <a href="${adminPanelUrl}">Idi na Admin Panel</a></p>
            </div>
        `;
        
        await resend.emails.send({
            from: 'noreply@ugovor24.com',
            to: 'titograd977@gmail.com',
            subject: `NOVA NARUDZBA: ${removeDiacritics(ugovorType)} (#${formattedOrderNumber})`,
            html: emailHtml,
        });

        return { success: true };
    } catch (error) {
        console.error(`Greška pri slanju e-maila administratoru:`, error);
        return { success: false, error: 'Failed to send notification email' };
    }
}

export async function sendFinalEmailToClient(order, finalDocumentUrl, documentName) {
    try {
        // Sada koristimo našu novu pomoćnu funkciju da dobijemo ime klijenta
        const { client_name } = getClientInfo(order.form_data);
        const formattedOrderNumber = formatOrderNumber(order.order_number);
        
        const fileResponse = await fetch(finalDocumentUrl);
        const fileContent = await fileResponse.arrayBuffer();
        
        const emailHtml = `
             <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px;">
                <p>Poštovani/a ${client_name},</p>
                <p>U prilogu se nalazi finalna verzija Vašeg dokumenta <b>${order.ugovor_type}</b> (Narudžbina #${formattedOrderNumber}).</p>
                <p>Hvala na poverenju.</p>
                <p>Srdačan pozdrav,</p>
                <p>Tim ugovor24.com</p>
            </div>
        `;

        await resend.emails.send({
            from: 'noreply@ugovor24.com',
            to: order.client_email,
            subject: `Vas ugovor je spreman: ${removeDiacritics(order.ugovor_type)} (#${formattedOrderNumber})`,
            html: emailHtml,
            attachments: [{
                filename: documentName,
                content: Buffer.from(fileContent)
            }]
        });
        return { success: true };
    } catch (error) {
        console.error('Greška pri slanju finalnog e-maila:', error);
        return { success: false, error: 'Failed to send final email' };
    }
}

export async function sendFinalEmailToAdmin(order, finalDocumentUrl, documentName) {
    try {
        const formattedOrderNumber = formatOrderNumber(order.order_number);
        const fileResponse = await fetch(finalDocumentUrl);
        const fileContent = await fileResponse.arrayBuffer();

        const emailHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px;">
                 <p>Kopija e-maila poslatog klijentu <b>${order.client_email}</b>.</p>
                 <p>Ugovor za <b>${order.ugovor_type}</b> pod brojem <b>#${formattedOrderNumber}</b> je uspešno poslat.</p>
            </div>
        `;

        await resend.emails.send({
            from: 'noreply@ugovor24.com',
            to: 'titograd977@gmail.com',
            subject: `KOPIJA: Poslat finalni ugovor (${removeDiacritics(order.ugovor_type)} #${formattedOrderNumber})`,
            html: emailHtml,
            attachments: [{
                filename: documentName,
                content: Buffer.from(fileContent)
            }]
        });
        return { success: true };
    } catch (error) {
        console.error('Greška pri slanju kopije e-maila administratoru:', error);
        return { success: false, error: 'Failed to send copy email' };
    }
}

// utils/email_and_pdf.js

import { Resend } from 'resend';
import fetch from 'node-fetch';

const resend = new Resend(process.env.RESEND_API_KEY);

function removeDiacritics(text) {
    if (!text) return '';
    return text.normalize("NFD").replace(/[\u300-\u036f]/g, "");
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
                formattedText += `<strong>${label}:</strong> ${value}<br>`;
            }
        }
    }
    return formattedText;
}

function formatOrderNumber(number) {
    return String(number).padStart(5, '0');
}

function getClientInfo(formData) {
    const ugovorType = formData.ugovor_type;
    let client_name = formData.client_email || formData.e_mail_adresa;
    
    switch (ugovorType) {
        case 'Ugovor o povjerljivosti (NDA)':
            client_name = formData.tip_ugovora === 'Jednostrani' ? formData.naziv_strane_koja_prima : formData.naziv_strane_a;
            break;
        case 'Ugovor o djelu':
            client_name = formData.naziv_narucioca;
            break;
        case 'Ugovor o zakupu':
            client_name = formData.naziv_zakupca;
            break;
        case 'Ugovor o radu':
            client_name = formData.ime_i_prezime_zaposlenog;
            break;
        case 'Set dokumenata za registraciju firme (DOO)':
            client_name = formData.ime_osnivaca_1;
            break;
    }
    return { client_name };
}

export async function sendConfirmationEmailToClient(clientEmail, ugovorType, totalPrice, orderId, orderNumber, formData) {
    const formattedOrderNumber = formatOrderNumber(orderNumber);
    const { client_name } = getClientInfo(formData);
    const invoiceUrl = `https://ugovor24.com/predracun.html?id=${orderId}`;

    try {
        const emailHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 20px auto; background: #f5f5f7; border-radius: 12px; padding: 30px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="font-size: 24px; font-weight: 600; color: #1d1d1f;">
                        ugovor<span style="color: #007aff;">24</span>.com
                    </h1>
                </div>
                <div style="background: #ffffff; border-radius: 8px; padding: 30px;">
                    <h2 style="font-size: 20px; color: #1d1d1f; margin-top: 0;">Potvrda Prijema Zahtjeva #${formattedOrderNumber}</h2>
                    <p style="color: #6e6e73; line-height: 1.6;">Poštovani/a ${client_name},</p>
                    <p style="color: #6e6e73; line-height: 1.6;">Hvala Vam. Vaš zahtjev za <strong>${ugovorType}</strong> je uspješno primljen.</p>
                    <p style="color: #6e6e73; line-height: 1.6;">Ukupan iznos za uplatu je <strong>${totalPrice} EUR</strong>. Sve potrebne informacije za plaćanje možete pronaći na Vašem predračunu.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${invoiceUrl}" style="background-color: #007aff; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 500; display: inline-block;">Pogledaj Predračun</a>
                    </div>
                    <p style="color: #6e6e73; line-height: 1.6;">Nakon evidentirane uplate, Vaš finalni dokument će biti izrađen i poslat u roku od 24 časa.</p>
                    <p style="color: #6e6e73; line-height: 1.6; margin-top: 25px;">Srdačan pozdrav,<br>Tim ugovor24.com</p>
                </div>
                <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #8e8e93;">
                    &copy; 2025 ugovor24.com. Sva prava zadržana.
                </div>
            </div>
        `;

        await resend.emails.send({
            from: 'noreply@ugovor24.com',
            to: clientEmail,
            subject: `Potvrda zahtjeva #${formattedOrderNumber} - ugovor24.com`,
            html: emailHtml
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
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 20px auto; border: 1px solid #ddd; border-radius: 8px; padding: 20px;">
                <h2 style="font-size: 20px; color: #1d1d1f; margin-top: 0;">Nova Narudžbina: ${ugovorType} #${formattedOrderNumber}</h2>
                <div style="background-color: #f7f7f7; padding: 15px; border-radius: 4px; line-height: 1.6; color: #333;">${formattedData}</div>
                <div style="margin-top: 20px;">
                    <a href="${adminPanelUrl}" style="text-decoration: none; color: #007aff;">Upravljaj narudžbinom &rarr;</a>
                </div>
            </div>
        `;
        
        await resend.emails.send({
            from: 'noreply@ugovor24.com',
            to: 'titograd977@gmail.com',
            subject: `NOVA NARUDŽBINA: ${removeDiacritics(ugovorType)} (#${formattedOrderNumber})`,
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
        const { client_name } = getClientInfo(order.form_data);
        const formattedOrderNumber = formatOrderNumber(order.order_number);
        
        const fileResponse = await fetch(finalDocumentUrl);
        const fileContent = await fileResponse.arrayBuffer();
        
        const emailHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 20px auto; background: #f5f5f7; border-radius: 12px; padding: 30px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="font-size: 24px; font-weight: 600; color: #1d1d1f;">
                        ugovor<span style="color: #007aff;">24</span>.com
                    </h1>
                </div>
                <div style="background: #ffffff; border-radius: 8px; padding: 30px;">
                    <h2 style="font-size: 20px; color: #1d1d1f; margin-top: 0;">Vaš Dokument je Spreman (Narudžbina #${formattedOrderNumber})</h2>
                    <p style="color: #6e6e73; line-height: 1.6;">Poštovani/a ${client_name},</p>
                    <p style="color: #6e6e73; line-height: 1.6;">Hvala na strpljenju. Vaša uplata je evidentirana i sa zadovoljstvom Vam šaljemo finalnu verziju Vašeg dokumenta: <strong>${order.ugovor_type}</strong>.</p>
                    <p style="color: #6e6e73; line-height: 1.6;">Dokument se nalazi u prilogu ovog emaila.</p>
                    <p style="color: #6e6e73; line-height: 1.6; margin-top: 25px;">Hvala na povjerenju,<br>Tim ugovor24.com</p>
                </div>
                <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #8e8e93;">
                    &copy; 2025 ugovor24.com. Sva prava zadržana.
                </div>
            </div>
        `;

        await resend.emails.send({
            from: 'noreply@ugovor24.com',
            to: order.client_email,
            subject: `Vaš dokument je spreman: #${formattedOrderNumber}`,
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

// Funkcija sendFinalEmailToAdmin ostaje ista, nema potrebe za izmjenom
export async function sendFinalEmailToAdmin(order, finalDocumentUrl, documentName) {
    try {
        const formattedOrderNumber = formatOrderNumber(order.order_number);
        const fileResponse = await fetch(finalDocumentUrl);
        const fileContent = await fileResponse.arrayBuffer();

        const emailHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; color: #333;">
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

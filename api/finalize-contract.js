// api/finalize-contract.js

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

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

async function sendFinalEmailToClient(order, finalDocumentUrl, documentName) {
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
        
        await resend.emails.send({
            from: 'noreply@ugovor24.com',
            to: order.client_email,
            subject: `Vas ugovor je spreman za preuzimanje: ${removeDiacritics(ugovorType)} (#${formattedOrderNumber})`,
            html: `
                <p>Postovani/a ${removeDiacritics(clientName)},</p>
                <p>Cestitamo! Vasa uplata je proknjizena i Vas ugovor je odobren.</p>
                <p>Finalna verzija Vaseg ugovora je u prilogu ovog e-maila.</p>
                <p>Srdacan pozdrav,</p>
                <p>Tim ugovor24.com</p>
            `,
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
        return { error: 'Failed to send final email' };
    }
}

async function sendFinalEmailToAdmin(order, finalDocumentUrl, documentName) {
    try {
        const ugovorType = order.ugovor_type;
        const formattedOrderNumber = formatOrderNumber(order.order_number);
        
        const fileResponse = await fetch(finalDocumentUrl);
        const fileContent = await fileResponse.arrayBuffer();

        await resend.emails.send({
            from: 'noreply@ugovor24.com',
            to: 'titograd977@gmail.com',
            subject: `KOPIJA: Poslat finalni ugovor (${removeDiacritics(ugovorType)} #${formattedOrderNumber})`,
            html: `
                <p>Dobar dan, Dejane,</p>
                <p>Kopija e-maila poslatog klijentu **${order.client_email}**.</p>
                <p>Ugovor za **${removeDiacritics(ugovorType)}** pod brojem **#${formattedOrderNumber}** je uspesno poslat.</p>
                <p>Srdacan pozdrav,</p>
                <p>Sistem ugovor24.com</p>
            `,
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
        return { error: 'Failed to send copy email' };
    }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { action, order_id, fileUrl } = req.body;

  if (!order_id || !action) {
    return res.status(400).json({ error: 'Missing order ID or action' });
  }

  try {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        orders_ugovor_o_djelu(naziv_narucioca),
        orders_ugovor_o_zakupu(naziv_zakupca),
        orders_ugovor_o_radu(ime_i_prezime_zaposlenog),
        orders_ugovor_o_povjerljivosti_nda(tip_ugovora, naziv_strane_a, naziv_strane_koja_prima),
        orders_set_za_firmu_doo(ime_osnivaca_1)
      `)
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
        console.error('Order not found or database error:', orderError);
        return res.status(404).json({ error: 'Order not found or database error' });
    }

    if (action === 'verify_payment') {
      const { error } = await supabase
        .from('orders')
        .update({ is_paid: true })
        .eq('id', order_id);

      if (error) {
        return res.status(500).json({ error: 'Failed to update payment status' });
      }

      return res.status(200).json({ success: true, message: 'Payment status updated.' });
    }

    if (action === 'send_final') {
      if (!order.is_paid || !order.final_document_url) {
        return res.status(400).json({ error: 'Order not paid or final document not uploaded' });
      }

      const documentName = order.final_document_url.split('/').pop();
      
      const clientEmailResult = await sendFinalEmailToClient(order, order.final_document_url, documentName);
      const adminEmailResult = await sendFinalEmailToAdmin(order, order.final_document_url, documentName);

      if (clientEmailResult.error || adminEmailResult.error) {
        return res.status(500).json({ error: 'Failed to send final email' });
      }
      
      const { error: updateError } = await supabase
        .from('orders')
        .update({ is_final_approved: true })
        .eq('id', order_id);
        
      if (updateError) {
        return res.status(500).json({ error: 'Failed to update final status' });
      }

      return res.status(200).json({ success: true, message: 'Final email sent and status updated.' });
    }
    
    if (action === 'upload_file' && fileUrl) {
        const { error } = await supabase
        .from('orders')
        .update({ final_document_url: fileUrl })
        .eq('id', order_id);

      if (error) {
        return res.status(500).json({ error: 'Failed to upload document URL' });
      }

      return res.status(200).json({ success: true, message: 'Document URL saved.' });
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (err) {
    console.error('Neocekivana greska:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

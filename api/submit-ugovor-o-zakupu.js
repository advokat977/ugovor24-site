// api/submit-ugovor-o-zakupu.js

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Supabase URL i anonimni ključ se uzimaju iz Vercel varijabli okruženja
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Master templejti za ugovore (kao JS stringovi)
const masterTemplates = {
    'Ugovor o zakupu': `UGOVOR O ZAKUPU
Zaključen u {{mjesto_zakljucenja}}, dana {{datum_zakljucenja}} godine, između:
1.  **Zakupodavca:** {{naziv_zakupodavca}}, sa sjedištem/prebivalištem na adresi {{adresa_zakupodavca}}, JMBG/PIB: {{id_broj_zakupodavca}} (u daljem tekstu: Zakupodavac), i
2.  **Zakupca:** {{naziv_zakupca}}, sa sjedištem/prebivalištem na adresi {{adresa_zakupca}}, JMBG/PIB: {{id_broj_zakupca}} (u daljem tekstu: Zakupac).

PREAMBULA
Ugovorne strane saglasno konstatuju da je Zakupodavac isključivi vlasnik nekretnine koja je predmet ovog Ugovora, bez tereta i ograničenja, te ovim Ugovorom regulišu međusobna prava i obaveze u vezi sa zakupom iste.

Član 1: Predmet Zakupa
1. Predmet ovog Ugovora je zakup {{tip_prostora}} koji se nalazi na adresi {{adresa_prostora}}, ukupne površine {{povrsina_prostora}} m², upisan u list nepokretnosti broj {{broj_lista_nepokretnosti}} KO {{katastarska_opstina}} (u daljem tekstu: Prostor).
2. Prostor se sastoji od: {{opis_prostorija}}. 3. Zakupodavac predaje Zakupcu Prostor u viđenom stanju.
4. Ugovorne strane će prilikom primopredaje sačiniti Zapisnik o primopredaji, u kojem će konstatovati stanje Prostora i popisati stvari koje se u njemu nalaze. Zapisnik o primopredaji čini sastavni dio ovog Ugovora.

Član 2: Namjena Zakupa
Prostor se daje u zakup isključivo u svrhu {{namjena_prostora}}.
Zakupac se obavezuje da neće koristiti Prostor u druge svrhe bez prethodne pisane saglasnosti Zakupodavca.

Član 3: Trajanje Zakupa
1. Ovaj Ugovor se zaključuje na period od {{period_zakupa}} {{jedinica_perioda_zakupa}}, počev od {{datum_pocetka_zakupa}}.
2. Nakon isteka roka iz stava 1. ovog člana, Ugovor se može produžiti pisanim aneksom, uz saglasnost obje ugovorne strane.

Član 4: Zakupnina i Troškovi
1. Ugovorne strane su saglasne da mjesečna zakupnina za korišćenje Prostora iznosi {{iznos_zakupnine_broj}} € (slovima: {{iznos_zakupnine_slovima}} eura).
2. Zakupnina se plaća unaprijed, najkasnije do {{dan_u_mjesecu_za_placanje}}. dana u mjesecu za tekući mjesec.
3. Pored zakupnine, Zakupac je dužan da snosi i sve tekuće troškove koji nastanu korišćenjem Prostora (troškovi električne energije, vode, komunalnih usluga, interneta, itd.).
4. Zakupac je dužan da račune za troškove iz stava 3. ovog člana plaća blagovremeno i da dokaze o uplati dostavi Zakupodavcu na uvid.
{{#if definisana_indeksacija}}
5. U slučaju da je Ugovor zaključen na period duži od jedne godine, Zakupodavac ima pravo da, nakon isteka svake godine zakupa, uskladi iznos zakupnine sa zvaničnom stopom inflacije koju objavljuje nadležni statistički organ za prethodnu godinu.
{{/if}}

Član 5: Depozit
{{#if definisan_depozit}}
1. Prilikom zaključenja ovog Ugovora, Zakupac je dužan da Zakupodavcu preda depozit u iznosu od {{iznos_depozita_broj}} € (slovima: {{iznos_depozita_slovima}} eura), kao garanciju za uredno ispunjenje svojih obaveza.
2. Zakupodavac se obavezuje da vrati depozit Zakupcu u roku od 15 (petnaest) dana od dana prestanka Ugovora i primopredaje Prostora, pod uslovom da je Zakupac izmirio sve obaveze po osnovu zakupnine i tekućih troškova, te da na Prostoru nije pričinjena šteta.
3. Ukoliko postoje neizmirene obaveze ili šteta, Zakupodavac ima pravo da iznos depozita iskoristi za njihovo namirenje, a eventualnu razliku vrati Zakupcu.
{{/if}}

Član 6: Obaveze Zakupodavca
Zakupodavac se obavezuje da: a) Preda Zakupcu Prostor u stanju podobnom za ugovorenu upotrebu. b) Omogući Zakupcu mirno i nesmetano korišćenje Prostora tokom trajanja zakupa. c) Snosi troškove tekućeg održavanja zgrade i investicionog održavanja Prostora, osim ako je šteta nastala krivicom Zakupca.

Član 7: Obaveze Zakupca
Zakupac se obavezuje da: a) Koristi Prostor sa pažnjom dobrog domaćina, u skladu sa njegovom namjenom. b) Snosi troškove sitnih popravki i tekućeg održavanja Prostora. c) Ne vrši bilo kakve adaptacije ili prepravke u Prostoru bez prethodne pisane saglasnosti Zakupodavca. d) Dozvoli Zakupodavcu ulazak u Prostor radi kontrole, uz prethodnu najavu. e) Odgovara za svu štetu na Prostoru koja nastane njegovom krivicom ili krivicom lica koja Prostor koriste uz njegovu saglasnost, te da istu otkloni o svom trošku u roku od 10 dana. f) Po prestanku Ugovora, preda Prostor Zakupodavcu u stanju u kojem ga je primio, uzimajući u obzir redovnu upotrebu.
{{#unless dozvoljen_podzakup}}
g) Ne daje Prostor u podzakup trećim licima.
{{/unless}}

Član 8: Otkaz Ugovora
1. Ovaj Ugovor se može raskinuti sporazumom ugovornih strana. 2. Svaka ugovorna strana može otkazati ovaj Ugovor, bez navođenja razloga, uz poštovanje otkaznog roka od {{otkazni_rok}} dana. Otkaz se daje u pisanoj formi. 3. Zakupodavac može raskinuti Ugovor bez otkaznog roka ako Zakupac kasni sa plaćanjem zakupnine dva uzastopna mjeseca, ako koristi Prostor suprotno namjeni, ili ako nanosi štetu Prostoru.

Član 9: Viša Sila
1. Nijedna ugovorna strana neće biti odgovorna za neispunjenje svojih obaveza ukoliko je do neispunjenja došlo usljed nastupanja okolnosti više sile. 2. Strana pogođena višom silom dužna je da o tome odmah obavijesti drugu stranu. 3. Ako okolnosti više sile traju duže od 60 (šezdeset) dana, svaka strana ima pravo da raskine Ugovor.

Član 10: Poreske Obaveze i Solemnizacija Ugovora
1. Ugovorne strane su saglasne da je Zakupodavac, kao primalac prihoda od zakupa, isključivo odgovoran za prijavu i plaćanje svih poreskih obaveza koje proističu iz ovog Ugovora. 2. Strane su upoznate da se ovjerom (solemnizacijom) ovog Ugovora kod nadležnog notara, ugovor dobija snagu izvršne isprave, što omogućava efikasniju zaštitu prava u slučaju neispunjenja obaveza. Troškove solemnizacije snosi {{strana_koja_placa_solemnizaciju}}.

Član 11: Rješavanje Sporova
Ugovorne strane su saglasne da sve eventualne sporove koji proisteknu iz ovog Ugovora rješavaju sporazumno.
Ukoliko to ne bude moguće, prihvataju nadležnost Osnovnog suda u {{mjesto_suda}}.

Član 12: Završne Odredbe
Na sve odnose ugovornih strana koji nisu obuhvaćeni ovim Ugovorom primjenjivaće se odredbe Zakona o obligacionim odnosima.
Ugovor je sačinjen u 2 (dva) istovjetna primjerka, po jedan za svaku ugovornu stranu.
<br>
**ZAKUPODAVAC** _________________________ {{naziv_zakupodavca}}
**ZAKUPAC** _________________________ {{naziv_zakupca}}`,
    // Ovdje će biti ostali master templejti
};

async function generateContractDraft(orderId, ugovorType, contractData) {
    const template = masterTemplates[ugovorType];
    
    if (!template) {
        return { error: 'Template for this contract type not found' };
    }
    
    // Priprema prompta za Gemini AI
    const prompt = `Ti si stručni advokat iz Crne Gore. Na osnovu priloženih podataka i master templejta, generiši nacrt ugovora.
    
    Pravni kontekst:
    - Pravo Crne Gore
    - Sudska praksa Crne Gore i EU
    - Najbolje prakse EU
    
    Podaci za ugovor: ${JSON.stringify(contractData)}
    
    Master template:
    ${template}
    
    Molim te, vrati mi samo konačan tekst ugovora, sa popunjenim podacima i uklonjenim placeholderima poput {{#if...}}, u formatu pogodnom za kopiranje i finalizaciju. Ne dodaj nikakav uvodni ili zaključni tekst, samo čisti tekst ugovora.`;

    const result = await model.generateContent(prompt);
    const generatedDraft = result.response.text();
    
    // Ažuriranje narudžbine u bazi sa generisanim nacrtom
    const { error: updateError } = await supabase
        .from('orders')
        .update({ generated_draft: generatedDraft, is_draft_generated: true })
        .eq('id', orderId);

    if (updateError) {
        console.error('Greška pri ažuriranju narudžbine:', updateError);
        return { error: 'Database update error' };
    }
    
    return { success: true };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const formData = req.body;

  const client_email = formData['client_email'];
  const ugovor_type = 'Ugovor o zakupu';
  const total_price = 79; // Cijena ugovora

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
      console.error('Greška pri unosu u orders tabelu:', orderError);
      return res.status(500).json({ error: 'Database insertion error' });
    }
    
    const order_id = orderData[0].id;
    
    // 2. Unos specifičnih podataka u 'orders_ugovor_o_zakupu' tabelu
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
      console.error('Greška pri unosu u orders_ugovor_o_zakupu tabelu:', specificError);
      return res.status(500).json({ error: 'Database insertion error' });
    }
    
    // 3. Pokretanje AI generisanja (automatski)
    const generationResult = await generateContractDraft(order_id, ugovor_type, formData);
    
    if (generationResult.error) {
        console.error('Greška pri generisanju nacrta:', generationResult.error);
    }
    
    // 4. Preusmjeravanje klijenta na stranicu za plaćanje
    res.writeHead(302, {
      'Location': `/placanje.html?cijena=${total_price}&ugovor=${encodeURIComponent(ugovor_type)}`,
      'Content-Type': 'text/plain',
    });
    res.end('Redirecting to payment...');
    
  } catch (err) {
    console.error('Neočekivana greška:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

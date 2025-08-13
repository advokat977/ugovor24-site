// api/submit-ugovor-o-radu.js

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Master templejti za ugovore (kao JS stringovi)
const masterTemplates = {
    'Ugovor o radu': `UGOVOR O RADU
Zaključen u {{mjesto_zakljucenja}}, dana {{datum_zakljucenja}} godine, na osnovu člana 29 Zakona o radu ("Sl. list CG", br. 74/19, 8/21, 59/21, 68/21 i 145/21), između:
1.  **Poslodavca:** {{naziv_poslodavca}}, sa sjedištem na adresi {{adresa_poslodavca}}, PIB: {{pib_poslodavca}} (u daljem tekstu: Poslodavac), koga zastupa {{zastupnik_poslodavca}}, i
2.  **Zaposlenog:** {{ime_i_prezime_zaposlenog}}, sa prebivalištem na adresi {{adresa_zaposlenog}}, JMBG: {{jmbg_zaposlenog}} (u daljem tekstu: Zaposleni).

Član 1: Predmet Ugovora
Ovim Ugovorom zasniva se radni odnos između Poslodavca i Zaposlenog i uređuju se međusobna prava, obaveze i odgovornosti.

Član 2: Radno Mjesto i Opis Poslova
1.  Zaposleni će obavljati poslove na radnom mjestu: **{{naziv_radnog_mjesta}}**.
2.  Opis poslova radnog mjesta obuhvata: {{opis_poslova}}.
3.  Zaposleni se obavezuje da će, u skladu sa potrebama procesa rada i svojim kvalifikacijama, obavljati i druge poslove po nalogu neposrednog rukovodioca.

Član 3: Mjesto Rada
{{#if rad_na_daljinu}}
1.  Zaposleni će poslove obavljati van prostorija Poslodavca, sa adrese prebivališta ili druge lokacije po dogovoru (rad na daljinu).
2.  Poslodavac obezbjeđuje sredstva za rad neophodna za obavljanje poslova (računar, telefon i sl.). Zaposleni je dužan da povjerena sredstva koristi sa pažnjom dobrog domaćina.
3.  Zaposleni je dužan da se pridržava propisanih mjera zaštite i zdravlja na radu i da osigura bezbjedne uslove rada na lokaciji sa koje radi.
{{else}}
Zaposleni će obavljati poslove u sjedištu Poslodavca na adresi {{mjesto_rada}}.
U zavisnosti od potreba posla, Zaposleni može biti upućen na rad van navedenog mjesta, u skladu sa zakonom.
{{/if}}

Član 4: Stručna Sprema
Za obavljanje poslova iz člana 2. ovog Ugovora, potrebna je stručna sprema: {{nivo_kvalifikacije_obrazovanja}} ({{stepen_strucne_spreme}}).
Zaposleni potvrđuje da posjeduje navedenu stručnu spremu i da je Poslodavcu predao svu potrebnu dokumentaciju.

Član 5: Vrijeme Trajanja Ugovora
1.  Ovaj Ugovor se zaključuje na: **{{tip_radnog_odnosa}}**.
{{#if je_na_odredjeno}}
2.  Radni odnos na određeno vrijeme zasniva se zbog {{razlog_rada_na_odredjeno}}, i traje do {{datum_isteka_ugovora}}.
{{/if}}

Član 6: Dan Stupanja na Rad
Zaposleni je dužan da stupi na rad dana {{datum_stupanja_na_rad}} godine. Ovaj dan se smatra danom zasnivanja radnog odnosa.

Član 7: Probni Rad
{{#if definisan_probni_rad}}
1.  Ugovara se probni rad u trajanju od {{period_probnog_rada}} mjeseci.
2.  Za vrijeme trajanja probnog rada, i Poslodavac i Zaposleni mogu otkazati ovaj Ugovor uz otkazni rok od najmanje 5 (pet) radnih dana.
3.  Ako Zaposleni do isteka probnog rada ne zadovolji na radnom mjestu, Poslodavac mu može otkazati Ugovor o radu danom isteka probnog rada.
{{/if}}

Član 8: Radno Vrijeme
1.  Radni odnos se zasniva sa {{tip_radnog_vremena}} radnim vremenom, u trajanju od {{broj_radnih_sati_sedmicno}} časova sedmično.
2.  Raspored radnog vremena utvrđuje Poslodavac, u skladu sa svojim aktima i potrebama procesa rada.

Član 9: Zarada, Naknada Zarade i Druga Primanja
1.  Zaposleni ima pravo na zaradu za obavljeni rad i vrijeme provedeno na radu.
2.  Osnovna zarada Zaposlenog utvrđuje se u bruto iznosu od **{{iznos_bruto_zarade_broj}} €** (slovima: {{iznos_bruto_zarade_slovima}} eura).
3.  Zarada se sastoji od osnovne zarade, dijela zarade za radni učinak i uvećane zarade, u skladu sa zakonom, kolektivnim ugovorom i aktom Poslodavca.
4.  Zarada se isplaćuje jednom mjesečno, najkasnije do kraja tekućeg mjeseca za prethodni mjesec.

Član 10: Odmori i Odsustva
1.  Zaposleni ima pravo na odmor u toku dnevnog rada, dnevni odmor i sedmični odmor, u skladu sa zakonom.
2.  Zaposleni za svaku kalendarsku godinu ima pravo na plaćeni godišnji odmor u trajanju od najmanje {{broj_dana_godisnjeg_odmora}} radnih dana.
3.  Dužina godišnjeg odmora utvrđuje se rješenjem Poslodavca.

Član 11: Obaveze Zaposlenog i Odgovornost za Štetu
1. Zaposleni je dužan da poslove obavlja savjesno, kvalitetno i u predviđenim rokovima, te da se prema Poslodavcu i ostalim zaposlenima odnosi lojalno i sa poštovanjem.
2. Zaposleni odgovara za štetu koju na radu ili u vezi sa radom, namjerno ili krajnjom nepažnjom, prouzrokuje Poslodavcu, u skladu sa zakonom.

Član 12: Povjerljivost i Poslovna Tajna
1.  Zaposleni je dužan da čuva poslovnu tajnu Poslodavca. 2. Obaveza čuvanja poslovne tajne traje i nakon prestanka radnog odnosa, u periodu od 2 (dvije) godine.

Član 13: Intelektualna Svojina
Sva autorska djela i druga prava intelektualne svojine koja Zaposleni stvori u toku izvršavanja poslova iz ovog Ugovora, a u vezi sa djelatnošću Poslodavca, isključivo su vlasništvo Poslodavca, u skladu sa zakonom.

Član 14: Zabrana Konkurencije
{{#if definisana_zabrana_konkurencije}}
1.  Zaposleni ne može, za svoj ili tuđi račun, obavljati poslove iz djelatnosti Poslodavca bez prethodne pisane saglasnosti Poslodavca.
2.  Ugovorne strane mogu ugovoriti i zabranu konkurencije nakon prestanka radnog odnosa, u trajanju do 2 (dvije) godine, uz obavezu Poslodavca da Zaposlenom isplaćuje novčanu naknadu u skladu sa zakonom.
{{/if}}

Član 15: Obrada Podataka o Ličnosti
1. Zaposleni je saglasan i potpisom na ovom Ugovoru daje svoj pristanak da Poslodavac prikuplja i obrađuje podatke o njegovoj ličnosti isključivo u svrhe ostvarivanja prava i obaveza iz radnog odnosa, vođenja kadrovske evidencije i ispunjavanja zakonskih obaveza Poslodavca. 2. Poslodavac se obavezuje da će sa podacima o ličnosti Zaposlenog postupati u skladu sa zakonom.

Član 16: Zaštita i Zdravlje na Radu
1. Poslodavac se obavezuje da obezbijedi i sprovodi sve neophodne mjere zaštite i zdravlja na radu. 2. Zaposleni je dužan da se pridržava propisanih mjera zaštite i zdravlja na radu.

Član 17: Prestanak Radnog Odnosa i Vraćanje Sredstava
1.  Radni odnos može prestati na načine i pod uslovima predviđenim Zakonom o radu.
2.  Poslodavac može otkazati ovaj Ugovor Zaposlenom ako za to postoji opravdan razlog, a naročito u slučaju teže povrede radne obaveze.
3.  U slučaju otkaza od strane Poslodavca ili Zaposlenog, otkazni rok iznosi {{otkazni_rok}} dana, osim ako zakonom nije drugačije određeno.
4.  Zaposleni je obavezan da, najkasnije na dan prestanka radnog odnosa, Poslodavcu vrati svu opremu i druga sredstva za rad.

Član 18: Rješavanje Sporova
Ugovorne strane su saglasne da sve eventualne sporove koji proisteknu iz ovog Ugovora rješavaju sporazumno.
Ukoliko to ne bude moguće, prihvataju nadležnost Osnovnog suda u {{mjesto_suda}}.

Član 19: Završne Odredbe
Na sve što nije regulisano ovim Ugovorom primjenjivaće se odredbe Zakona o radu, opšteg akta Poslodavca i drugih važećih propisa.
Ugovor je sačinjen u 2 (dva) istovjetna primjerka, po jedan za svaku ugovornu stranu.
<br>
**POSLODAVAC** _________________________ {{naziv_poslodavca}} (Zastupan po: {{zastupnik_poslodavca}})
**ZAPOSLENI** _________________________ {{ime_i_prezime_zaposlenog}}`,
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
  const ugovor_type = 'Ugovor o radu';
  const total_price = 99; // Cijena ugovora

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
    
    // 2. Unos specifičnih podataka u 'orders_ugovor_o_radu' tabelu
    const { error: specificError } = await supabase
      .from('orders_ugovor_o_radu')
      .insert([
        { 
          order_id: order_id,
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
          razlog_rada_na_odredjeno: formData['razlog_rada_na_odredjeno'] || null,
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
        }
      ]);

    if (specificError) {
      console.error('Greška pri unosu u orders_ugovor_o_radu tabelu:', specificError);
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

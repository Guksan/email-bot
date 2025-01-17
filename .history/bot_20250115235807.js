const nodemailer = require('nodemailer');
const fs = require('fs');
require('dotenv').config();

// Načtení HTML šablony
const emailTemplate = fs.readFileSync('email-template.html', 'utf8');

// Nastavení emailových účtů
const emailAccounts = [
   { email: 'email1@mosaicprovisuals.com', name: 'Mosaic Pro 1' },
   { email: 'email2@mosaicprovisuals.com', name: 'Mosaic Pro 2' },
   { email: 'email3@mosaicprovisuals.com', name: 'Mosaic Pro 3' },
   { email: 'email4@mosaicprovisuals.com', name: 'Mosaic Pro 4' },
   { email: 'email5@mosaicprovisuals.com', name: 'Mosaic Pro 5' }
];

// Vytvoření transporterů pro emaily
const transporters = emailAccounts.map(account => {
   return nodemailer.createTransport({
       host: 'smtp.zoho.eu',
       port: 465,
       secure: true,
       auth: {
           user: account.email,
           pass: process.env[`EMAIL_PASS_${account.email.split('@')[0].toUpperCase()}`]
       }
   });
});

// Funkce pro vytvoření emailu s doplněnými daty
function createEmailContent(emailData) {
   return emailTemplate;
}

// Hlavní funkce pro rozesílání
async function sendEmails() {
   const contactsData = JSON.parse(fs.readFileSync('contacts.json', 'utf8'));
   const contacts = contactsData.emails; // Přístup k poli emailů z vaší struktury

   let currentEmailIndex = 0;
   let emailsSent = 0;
   const DAILY_LIMIT = 150;
   const BATCH_SIZE = 25;

   for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
       const batch = contacts.slice(i, i + BATCH_SIZE);
       console.log(`Odesílám dávku ${Math.floor(i/BATCH_SIZE) + 1}, emaily ${i+1} až ${i+batch.length}`);

       for (const contact of batch) {
           const account = emailAccounts[currentEmailIndex];
           const transporter = transporters[currentEmailIndex];

           try {
               await transporter.sendMail({
                   from: `"${account.name}" <${account.email}>`,
                   to: contact.email,
                   subject: "Mosaic Pro Visuals - Revoluční prezentace nemovitostí",
                   html: createEmailContent(contact)
               });

               console.log(`✓ Odesláno: ${contact.email} (z účtu: ${account.email})`);
               
               // Aktualizace statusu v JSON
               contact.status = "sent";
               fs.writeFileSync('contacts.json', JSON.stringify({ emails: contacts }, null, 2));

               emailsSent++;
               
               // Rotace emailů
               currentEmailIndex = (currentEmailIndex + 1) % emailAccounts.length;

               // Pauza mezi emaily (2 sekundy)
               await new Promise(r => setTimeout(r, 2000));
           } catch (error) {
               console.error(`✗ Chyba při odesílání na ${contact.email}:`, error.message);
               contact.status = "error";
               fs.writeFileSync('contacts.json', JSON.stringify({ emails: contacts }, null, 2));
           }
       }

       // Kontrola denního limitu
       if (emailsSent >= DAILY_LIMIT * emailAccounts.length) {
           console.log('Denní limit dosažen, čekám 24 hodin...');
           await new Promise(r => setTimeout(r, 24 * 60 * 60 * 1000));
           emailsSent = 0;
       } else if (i + BATCH_SIZE < contacts.length) {
           // Pauza mezi dávkami (15 minut)
           console.log('Čekám 15 minut před další dávkou...');
           await new Promise(r => setTimeout(r, 15 * 60 * 1000));
       }
   }

   console.log('Rozesílání dokončeno!');
}

// Spuštění
console.log('Bot se spouští...');
sendEmails().catch(error => {
   console.error('Kritická chyba:', error);
   process.exit(1);
});
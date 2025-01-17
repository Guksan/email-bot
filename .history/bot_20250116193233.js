const nodemailer = require('nodemailer');
const fs = require('fs');
require('dotenv').config();

// Načtení šablon
const davidTemplate = fs.readFileSync('david-template.html', 'utf8');
const filipTemplate = fs.readFileSync('filip-template.html', 'utf8');
const lenkaTemplate = fs.readFileSync('lenka-template.html', 'utf8');

// Nastavení účtů
const emailAccounts = [
   { 
       email: 'david.weiss@mosaicprovisuals.com', 
       name: 'David Weiss',
       template: davidTemplate 
   },
   { 
       email: 'filip.kohn@mosaicprovisuals.com', 
       name: 'Filip Kohn',
       template: filipTemplate 
   },
   { 
       email: 'lenka.andrlikova@mosaicprovisuals.com', 
       name: 'Lenka Andrlikova',
       template: lenkaTemplate 
   }
];

// Globální statistiky
let stats = {
   david: { sent: 0, failed: 0 },
   filip: { sent: 0, failed: 0 },
   lenka: { sent: 0, failed: 0 }
};

// Vytvoření transporterů
const transporters = emailAccounts.map(account => {
   return nodemailer.createTransport({
       host: 'smtp.zoho.eu',
       port: 465,
       secure: true,
       auth: {
           user: account.email,
           pass: process.env[`EMAIL_PASS_${account.email.split('.')[0].toUpperCase()}`]
       }
   });
});

// Kontrola pracovní doby (9-17)
function isWorkingHour() {
   const now = new Date();
   const hour = now.getHours();
   return hour >= 9 && hour < 17;
}

async function waitForWorkingHours() {
   while (!isWorkingHour()) {
       console.log('Čekám na pracovní dobu (9:00)');
       await new Promise(r => setTimeout(r, 30 * 60 * 1000)); // kontrola každých 30 minut
   }
}

// Logování statistik
function logStats() {
   console.log('\n=== STATISTIKY ODESÍLÁNÍ ===');
   console.log(`David: ${stats.david.sent} odesláno, ${stats.david.failed} chyb`);
   console.log(`Filip: ${stats.filip.sent} odesláno, ${stats.filip.failed} chyb`);
   console.log(`Lenka: ${stats.lenka.sent} odesláno, ${stats.lenka.failed} chyb`);
   console.log(`Celkem odesláno: ${stats.david.sent + stats.filip.sent + stats.lenka.sent}`);
   console.log('===========================\n');
}

async function sendEmails() {
   const contactsData = JSON.parse(fs.readFileSync('contacts.json', 'utf8'));
   const contacts = contactsData.emails;

   console.log('=== START ROZESÍLÁNÍ ===');
   console.log(`Celkem kontaktů ke zpracování: ${contacts.length}`);

   // Rozdělení kontaktů pro každého odesílatele
   const emailGroups = [[], [], []];
   contacts.forEach((contact, index) => {
       emailGroups[index % 3].push(contact);
   });

   console.log(`David: ${emailGroups[0].length} kontaktů`);
   console.log(`Filip: ${emailGroups[1].length} kontaktů`);
   console.log(`Lenka: ${emailGroups[2].length} kontaktů`);

   // Funkce pro odesílání pro jednoho odesílatele
   async function sendForAccount(accountIndex, contacts) {
       const account = emailAccounts[accountIndex];
       const transporter = transporters[accountIndex];
       const accountName = account.name.split(' ')[0].toLowerCase();
       const DAILY_LIMIT = 150;
       let dailyCount = 0;

       for (const contact of contacts) {
           await waitForWorkingHours();

           try {
               // Kontrola denního limitu
               if (dailyCount >= DAILY_LIMIT) {
                   console.log(`[${account.name}] Dosažen denní limit, čekám na další den`);
                   await new Promise(r => setTimeout(r, 24 * 60 * 60 * 1000));
                   dailyCount = 0;
               }

               await transporter.sendMail({
                   from: `"${account.name}" <${account.email}>`,
                   to: contact.email,
                   subject: "Mosaic Pro Visuals - Revoluční prezentace nemovitostí",
                   html: account.template
               });

               stats[accountName].sent++;
               dailyCount++;
               
               console.log(`✓ [${account.name}] Odesláno: ${contact.email} (Dnes: ${dailyCount}/${DAILY_LIMIT})`);
               
               // Každých 50 emailů vypsat statistiky
               if (stats[accountName].sent % 50 === 0) {
                   logStats();
               }

               // 15 sekund pauza mezi emaily
               await new Promise(r => setTimeout(r, 15000));

           } catch (error) {
               stats[accountName].failed++;
               console.error(`✗ [${account.name}] Chyba při odesílání na ${contact.email}:`, error.message);
               
               // Při chybě delší pauza
               await new Promise(r => setTimeout(r, 30000));
           }
       }
   }

   // Paralelní spuštění odesílání pro všechny účty
   await Promise.all([
       sendForAccount(0, emailGroups[0]),
       sendForAccount(1, emailGroups[1]),
       sendForAccount(2, emailGroups[2])
   ]);

   console.log('\n=== FINÁLNÍ STATISTIKY ===');
   logStats();
   console.log('Rozesílání dokončeno!');
}

// Spuštění
console.log('Bot se spouští...');
sendEmails().catch(error => {
   console.error('Kritická chyba:', error);
   process.exit(1);
});
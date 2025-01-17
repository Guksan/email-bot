const nodemailer = require('nodemailer');
const fs = require('fs');
require('dotenv').config();

// Načtení šablon
const davidTemplate = fs.readFileSync('david-template.html', 'utf8');
const filipTemplate = fs.readFileSync('filip-template.html', 'utf8');

// Nastavení účtů
const emailAccounts = [
    { 
        email: 'david.weiss@mosaicprovisuals.com', 
        name: 'David Weiss',
        template: davidTemplate 
    },
    { 
        email: 'filip.volarik@mosaicprovisuals.com', 
        name: 'Filip Volarik',
        template: filipTemplate 
    }
];

// Globální statistiky
let stats = {
    david: { sent: 0, failed: 0 },
    filip: { sent: 0, failed: 0 }
};

// Vytvoření transporterů
const transporters = emailAccounts.map(account => {
    return nodemailer.createTransport({
        host: 'smtpout.secureserver.net', // GoDaddy SMTP server
        port: 465, // SSL port
        secure: true,
        auth: {
            user: account.email,
            pass: process.env[`EMAIL_PASS_${account.email.split('.')[0].toUpperCase()}`]
        }
    });
});

// Funkce pro odesílání e-mailů
async function sendEmails() {
    const contactsData = JSON.parse(fs.readFileSync('contacts.json', 'utf8'));
    const contacts = contactsData.emails;

    console.log('=== START ROZESÍLÁNÍ ===');
    console.log(`Celkem kontaktů ke zpracování: ${contacts.length}`);

    // Rozdělení kontaktů mezi účty
    const emailGroups = [[], []];
    contacts.forEach((contact, index) => {
        emailGroups[index % 2].push(contact);
    });

    console.log(`David: ${emailGroups[0].length} kontaktů`);
    console.log(`Filip: ${emailGroups[1].length} kontaktů`);

    // Funkce pro odesílání e-mailů pro jeden účet
    async function sendForAccount(accountIndex, contacts) {
        const account = emailAccounts[accountIndex];
        const transporter = transporters[accountIndex];
        const accountName = account.name.split(' ')[0].toLowerCase();
        const DAILY_LIMIT = 250; // Denní limit pro GoDaddy SMTP
        let dailyCount = 0;

        for (const contact of contacts) {
            try {
                // Kontrola denního limitu
                if (dailyCount >= DAILY_LIMIT) {
                    console.log(`[${account.name}] Dosažen denní limit, čekám na další den.`);
                    await new Promise(r => setTimeout(r, 24 * 60 * 60 * 1000)); // Čekání 24 hodin
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

                // 15 sekund pauza mezi e-maily
                await new Promise(r => setTimeout(r, 15000));

            } catch (error) {
                stats[accountName].failed++;
                console.error(`✗ [${account.name}] Chyba při odesílání na ${contact.email}:`, error.message);

                // Při chybě delší pauza
                await new Promise(r => setTimeout(r, 30000));
            }
        }
    }

    // Paralelní spuštění pro oba účty
    await Promise.all([
        sendForAccount(0, emailGroups[0]),
        sendForAccount(1, emailGroups[1])
    ]);

    console.log('\n=== FINÁLNÍ STATISTIKY ===');
    console.log(`David: ${stats.david.sent} odesláno, ${stats.david.failed} chyb`);
    console.log(`Filip: ${stats.filip.sent} odesláno, ${stats.filip.failed} chyb`);
    console.log('===========================\n');
    console.log('Rozesílání dokončeno!');
}

// Testovací režim
if (process.env.TEST_MODE === 'true') {
    console.log('Testovací režim: Odesílání pouze na testovací e-mail.');
    fs.writeFileSync('contacts.json', JSON.stringify({
        emails: [
            { email: 'test1@example.com' },
            { email: 'test2@example.com' }
        ]
    }, null, 2));
}

// Spuštění
console.log('Bot se spouští...');
sendEmails().catch(error => {
    console.error('Kritická chyba:', error);
    process.exit(1);
});

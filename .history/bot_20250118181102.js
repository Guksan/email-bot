const nodemailer = require('nodemailer');
const fs = require('fs');
const http = require('http');
const schedule = require('node-schedule');
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
        email: 'filip.kohn@mosaicprovisuals.com', 
        name: 'Filip Kohn',
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
                if (dailyCount >= DAILY_LIMIT) {
                    console.log(`[${account.name}] Dosažen denní limit, čekám na další den.`);
                    await new Promise(r => setTimeout(r, 24 * 60 * 60 * 1000)); // Čekání 24 hodin
                    dailyCount = 0;
                }

                await transporter.sendMail({
                    from: `"${account.name}" <${account.email}>`,
                    to: contact.email,
                    subject: "Oživte své nabídky nemovitostí animací – první ukázku máte od nás ZDARMA",
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

// Plánování úloh
function scheduleEmails() {
    console.log('Plánování aktivováno. Bot čeká na naplánované časy.');

    // Pondělí až čtvrtek v 9:00
    schedule.scheduleJob('0 9 * * 1-4', () => {
        console.log('Plánované spuštění bota v 9:00 pondělí až čtvrtek.');
        sendEmails();
    });

    // Pondělí až čtvrtek ve 14:30
    schedule.scheduleJob('30 14 * * 1-4', () => {
        console.log('Plánované spuštění bota ve 14:30 pondělí až čtvrtek.');
        sendEmails();
    });

    // Pátek v 10:00
    schedule.scheduleJob('0 10 * * 5', () => {
        console.log('Plánované spuštění bota v 10:00 v pátek.');
        sendEmails();
    });

    // Neděle v 15:00
    schedule.scheduleJob('0 15 * * 0', () => {
        console.log('Plánované spuštění bota v 15:00 v neděli.');
        sendEmails();
    });
}

// HTTP server pro Render
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot běží a čeká na naplánované časy.\n');
});
server.listen(PORT, () => {
    console.log(`HTTP server naslouchá na portu ${PORT}`);
});

// Hlavní spouštěcí logika
if (process.argv.includes('--schedule-only')) {
    scheduleEmails();
} else {
    console.log('Manuální spuštění bota.');
    sendEmails().catch(error => {
        console.error('Kritická chyba:', error);
        process.exit(1);
    });
}

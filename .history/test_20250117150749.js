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

// Vytvoření transporterů
const transporters = emailAccounts.map(account => {
    return nodemailer.createTransport({
        host: 'smtpout.secureserver.net',
        port: 465,
        secure: true,
        auth: {
            user: account.email,
            pass: process.env[`EMAIL_PASS_${account.email.split('.')[0].toUpperCase()}`]
        }
    });
});

// Testovací odesílání
async function testEmails() {
    console.log('=== TESTOVACÍ REŽIM ===');
    console.log('Všechny e-maily se pošlou pouze na tguryca@gmail.com');

    const testEmails = [
        { email: 'tguryca@gmail.com' }
    ];

    for (const account of emailAccounts) {
        const transporter = transporters[emailAccounts.indexOf(account)];

        for (const test of testEmails) {
            try {
                await transporter.sendMail({
                    from: `"${account.name}" <${account.email}>`,
                    to: test.email,
                    subject: `Testovací e-mail od ${account.name}`,
                    html: account.template
                });

                console.log(`✓ [${account.name}] Odesláno: ${test.email}`);
            } catch (error) {
                console.error(`✗ [${account.name}] Chyba při odesílání na ${test.email}:`, error.message);
            }
        }
    }

    console.log('=== TESTOVÁNÍ DOKONČENO ===');
}

// Spuštění testu
testEmails().catch(error => {
    console.error('Kritická chyba při testování:', error);
    process.exit(1);
});

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
        email: 'filip.kohn@mosaicprovisuals.com', 
        name: 'Filip Kohn',
        template: filipTemplate 
    }
];

// Vytvoření transporterů s ignorováním certifikátu
const transporters = emailAccounts.map(account => {
    return nodemailer.createTransport({
        host: 'smtpout.secureserver.net',
        port: 465,
        secure: true,
        auth: {
            user: account.email,
            pass: process.env[`EMAIL_PASS_${account.email.split('.')[0].toUpperCase()}`]
        },
        tls: {
            rejectUnauthorized: false // Ignorování problému s certifikáty
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
                    subject: `Oživte své nabídky nemovitostí animací – první ukázku máte od nás ZDARMA`,
                    html: account.template,
                    attachments: [
                        {
                            filename: 'logo.png',
                            path: './01.PNG', // Cesta k logu v hlavním adresáři
                            cid: 'logo' // CID odpovídá tomu v šabloně (např. <img src="cid:logo">)
                        }
                    ]
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

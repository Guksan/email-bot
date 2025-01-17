const nodemailer = require('nodemailer');
require('dotenv').config();

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

// HTML šablona emailu
function createEmailTemplate(contact) {
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a365d;">Mosaic Pro Visuals</h2>
        <p>Vážený/á ${contact.name},</p>
        <p>Váš text...</p>
        <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
            <strong>Mosaic Pro Visuals</strong><br>
            Tel: +420 XXX XXX XXX<br>
            <a href="https://mosaicprovisuals.com">www.mosaicprovisuals.com</a>
        </div>
    </div>`;
}

// Hlavní funkce pro rozesílání
async function sendEmails(contacts) {
    let currentEmailIndex = 0;
    let emailsSent = 0;
    const DAILY_LIMIT = 150;
    const BATCH_SIZE = 25;

    for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
        const batch = contacts.slice(i, i + BATCH_SIZE);
        console.log(`Odesílám dávku ${Math.floor(i/BATCH_SIZE) + 1}`);

        for (const contact of batch) {
            const account = emailAccounts[currentEmailIndex];
            const transporter = transporters[currentEmailIndex];

            try {
                await transporter.sendMail({
                    from: `"${account.name}" <${account.email}>`,
                    to: contact.email,
                    subject: "Mosaic Pro Visuals",
                    html: createEmailTemplate(contact)
                });

                console.log(`✓ Odesláno: ${contact.email}`);
                emailsSent++;

                // Rotace emailů
                currentEmailIndex = (currentEmailIndex + 1) % emailAccounts.length;

                // Pauza mezi emaily
                await new Promise(r => setTimeout(r, 2000));
            } catch (error) {
                console.error(`✗ Chyba: ${contact.email}:`, error.message);
            }
        }

        // Kontrola denního limitu
        if (emailsSent >= DAILY_LIMIT * emailAccounts.length) {
            console.log('Denní limit dosažen, čekám 24 hodin...');
            await new Promise(r => setTimeout(r, 24 * 60 * 60 * 1000));
            emailsSent = 0;
        } else {
            // Pauza mezi dávkami (15 minut)
            console.log('Čekám 15 minut před další dávkou...');
            await new Promise(r => setTimeout(r, 15 * 60 * 1000));
        }
    }
}

// Spuštění
const contacts = require('./contacts.json');
sendEmails(contacts).catch(console.error);
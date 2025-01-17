const nodemailer = require('nodemailer');
require('dotenv').config();

const { emailAccounts, zohoConfig } = require('./config/email');
const limits = require('./config/limits');
const { createEmailTemplate } = require('./templates/email');
const logger = require('./utils/logger');

// Vytvoření transporterů pro každý účet
const transporters = emailAccounts.map(account => {
    return nodemailer.createTransport({
        ...zohoConfig,
        auth: {
            user: account.email,
            pass: process.env[`EMAIL_PASS_${account.email.split('@')[0].toUpperCase()}`]
        }
    });
});

async function sendEmails(contacts) {
    let currentEmailIndex = 0;
    let dailyCount = 0;

    for (let i = 0; i < contacts.length; i += limits.BATCH_SIZE) {
        const batch = contacts.slice(i, i + limits.BATCH_SIZE);
        
        await logger.log(`Začínám dávku ${i/limits.BATCH_SIZE + 1}, emaily ${i+1} až ${i+batch.length}`);

        for (const contact of batch) {
            const transporter = transporters[currentEmailIndex];
            const account = emailAccounts[currentEmailIndex];

            try {
                await transporter.sendMail({
                    from: `"${account.name}" <${account.email}>`,
                    to: contact.email,
                    subject: "Mosaic Pro Visuals - Vaše animované fotografie",
                    html: createEmailTemplate(contact)
                });

                await logger.log(`Email odeslán: ${contact.email} z ${account.email}`, 'SUCCESS');
                await new Promise(r => setTimeout(r, limits.EMAIL_DELAY));
            } catch (error) {
                await logger.log(`Chyba při odesílání na ${contact.email}: ${error.message}`, 'ERROR');
            }

            dailyCount++;
            if (dailyCount >= limits.DAILY_LIMIT * emailAccounts.length) {
                await logger.log('Denní limit dosažen, čekám 24 hodin...', 'INFO');
                await new Promise(r => setTimeout(r, limits.DAY_WAIT));
                dailyCount = 0;
            }

            currentEmailIndex = (currentEmailIndex + 1) % emailAccounts.length;
        }

        if (i + limits.BATCH_SIZE < contacts.length) {
            await logger.log(`Čekám ${limits.BATCH_DELAY/60000} minut před další dávkou...`);
            await new Promise(r => setTimeout(r, limits.BATCH_DELAY));
        }
    }
}

// Spuštění bota
const contacts = require('./data/contacts.json');
sendEmails(contacts).catch(error => logger.log(error.message, 'FATAL'));
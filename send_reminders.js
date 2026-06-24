const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const prisma = new PrismaClient();

async function sendReminders() {
  console.log('--- Checking for due reminders ---');
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const dueReminders = await prisma.hubReminder.findMany({
      where: {
        isCompleted: false,
        dueDate: { lte: now },
        reminderEmail: { not: null, not: '' },
        OR: [
          { lastNotifiedAt: null },
          { lastNotifiedAt: { lt: startOfToday } }
        ]
      },
      include: { contact: true }
    });

    console.log(`Found ${dueReminders.length} reminders to notify.`);

    for (const r of dueReminders) {
      const subject = `🔔 RAPPEL MONEY HUB : Paiement attendu de ${r.contact.name}`;
      const body = `Bonjour,

Ceci est un rappel automatique de MONEY HUB.

Paiement attendu : ${r.amount} ${r.currencyCode}
Partenaire : ${r.contact.name}
Échéance prévue : ${r.dueDate.toLocaleDateString('fr-FR')}
Note : ${r.note || 'Aucune'}

Pour confirmer la réception et l'ajouter aux Avoirs, rendez-vous sur la plateforme : https://money-radar-six.vercel.app

Merci.`;

      console.log(`Sending email to ${r.reminderEmail} for ${r.contact.name}...`);
      
      const payload = JSON.stringify({
        user_google_email: "bonprixtapis@gmail.com",
        to: [r.reminderEmail],
        subject: subject,
        body: body
      });

      try {
        // Use accio-mcp-cli to send email via connected Gmail
        execSync(`accio-mcp-cli call send_gmail_message --json '${payload}'`, { stdio: 'inherit' });
        
        // Mark as notified today
        await prisma.hubReminder.update({
          where: { id: r.id },
          data: { lastNotifiedAt: new Date() }
        });
        console.log('Success.');
      } catch (err) {
        console.error(`Failed to send email for reminder ${r.id}:`, err.message);
      }
    }
  } catch (error) {
    console.error('General error in sendReminders:', error);
  } finally {
    await prisma.$disconnect();
    console.log('--- Done ---');
  }
}

sendReminders();

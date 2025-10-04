const cron = require('node-cron');
const User = require('../models/User');
const { sendWeeklyStatsEmail } = require('../mails/sendEmail');
const { generateWeeklyStats } = require('../controllers/userController');

// Schedule weekly statistics email (every Monday at 9 AM)
const scheduleWeeklyStats = () => {
  cron.schedule('0 9 * * 1', async () => { // Every Monday at 9:00 AM
    try {
      console.log('Running weekly statistics report...');
      
      // Calculate start and end of last week
      const now = new Date();
      const startOfLastWeek = new Date(now);
      startOfLastWeek.setDate(now.getDate() - now.getDay() - 6); // Previous Monday
      startOfLastWeek.setHours(0, 0, 0, 0);
      
      const endOfLastWeek = new Date(startOfLastWeek);
      endOfLastWeek.setDate(startOfLastWeek.getDate() + 6); // Sunday
      endOfLastWeek.setHours(23, 59, 59, 999);

      // Get all admins
      const admins = await User.find({ status: 'admin', emailVerified: true });
      
      if (admins.length === 0) {
        console.log('No admin users found for weekly report');
        return;
      }

      // Generate weekly statistics
      const stats = await generateWeeklyStats(startOfLastWeek, endOfLastWeek);

      // Send email to all admins
      for (const admin of admins) {
        await sendWeeklyStatsEmail(admin, stats);
      }

      console.log(`Weekly statistics report sent to ${admins.length} admins`);
    } catch (error) {
      console.error('Error in weekly statistics cron job:', error);
    }
  });
};

module.exports = { scheduleWeeklyStats };
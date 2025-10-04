// const Booking = require('../models/Booking');
// const { sendBookingConfirmation, sendAdminNotification } = require('../mails/sendEmail');

// const bookingController = {
//   // Create new booking
//   createBooking: async (req, res) => {
//     try {
//       const {
//         service,
//         date,
//         time,
//         guests,
//         name,
//         email,
//         phone,
//         specialRequests
//       } = req.body;

//       // Check if booking already exists for same date and time
//       const existingBooking = await Booking.findOne({
//         date: new Date(date),
//         time,
//         status: { $in: ['pending', 'confirmed'] }
//       });

//       if (existingBooking) {
//         return res.status(400).json({
//           success: false,
//           message: 'Sorry, this time slot is already booked. Please choose another time.'
//         });
//       }

//       // Create new booking
//       const booking = new Booking({
//         service,
//         date: new Date(date),
//         time,
//         guests,
//         name,
//         email,
//         phone,
//         specialRequests
//       });

//       await booking.save();

//       // Send confirmation email to customer
//       await sendBookingConfirmation(booking);

//       // Send notification email to admin
//       await sendAdminNotification(booking);

//       res.status(201).json({
//         success: true,
//         message: 'Booking created successfully! Confirmation email sent.',
//         data: booking
//       });

//     } catch (error) {
//       console.error('Booking creation error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Error creating booking',
//         error: error.message
//       });
//     }
//   },

//   // Get all bookings with optional filtering
//   getAllBookings: async (req, res) => {
//     try {
//       const { status, service, startDate, endDate } = req.query;
//       let filter = {};

//       // Build filter based on query parameters
//       if (status) filter.status = status;
//       if (service) filter.service = service;
//       if (startDate || endDate) {
//         filter.date = {};
//         if (startDate) filter.date.$gte = new Date(startDate);
//         if (endDate) filter.date.$lte = new Date(endDate);
//       }

//       const bookings = await Booking.find(filter).sort({ date: 1, time: 1 });
      
//       res.status(200).json({
//         success: true,
//         count: bookings.length,
//         data: bookings
//       });
//     } catch (error) {
//       res.status(500).json({
//         success: false,
//         message: 'Error fetching bookings',
//         error: error.message
//       });
//     }
//   },

//   // Get booking by ID
//   getBookingById: async (req, res) => {
//     try {
//       const booking = await Booking.findById(req.params.id);
      
//       if (!booking) {
//         return res.status(404).json({
//           success: false,
//           message: 'Booking not found'
//         });
//       }

//       res.status(200).json({
//         success: true,
//         data: booking
//       });
//     } catch (error) {
//       res.status(500).json({
//         success: false,
//         message: 'Error fetching booking',
//         error: error.message
//       });
//     }
//   },

//   // Update booking status
//   updateBookingStatus: async (req, res) => {
//     try {
//       const { status } = req.body;
      
//       const booking = await Booking.findByIdAndUpdate(
//         req.params.id,
//         { status },
//         { new: true, runValidators: true }
//       );

//       if (!booking) {
//         return res.status(404).json({
//           success: false,
//           message: 'Booking not found'
//         });
//       }

//       res.status(200).json({
//         success: true,
//         message: 'Booking status updated successfully',
//         data: booking
//       });
//     } catch (error) {
//       res.status(500).json({
//         success: false,
//         message: 'Error updating booking',
//         error: error.message
//       });
//     }
//   },

//   // Delete booking
//   deleteBooking: async (req, res) => {
//     try {
//       const booking = await Booking.findByIdAndDelete(req.params.id);

//       if (!booking) {
//         return res.status(404).json({
//           success: false,
//           message: 'Booking not found'
//         });
//       }

//       res.status(200).json({
//         success: true,
//         message: 'Booking deleted successfully'
//       });
//     } catch (error) {
//       res.status(500).json({
//         success: false,
//         message: 'Error deleting booking',
//         error: error.message
//       });
//     }
//   },

//   // Get available time slots for a date
//   getAvailableSlots: async (req, res) => {
//     try {
//       const { date } = req.params;
      
//       const timeSlots = [
//         "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", 
//         "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", 
//         "6:00 PM", "7:00 PM", "8:00 PM"
//       ];

//       // Find bookings for the specified date
//       const bookings = await Booking.find({
//         date: new Date(date),
//         status: { $in: ['pending', 'confirmed'] }
//       });

//       // Get booked time slots
//       const bookedSlots = bookings.map(booking => booking.time);

//       // Filter available slots
//       const availableSlots = timeSlots.filter(slot => !bookedSlots.includes(slot));

//       res.status(200).json({
//         success: true,
//         date: date,
//         availableSlots: availableSlots,
//         bookedSlots: bookedSlots,
//         totalSlots: timeSlots.length,
//         bookedCount: bookedSlots.length,
//         availableCount: availableSlots.length,
//         occupancyRate: ((bookedSlots.length / timeSlots.length) * 100).toFixed(2) + '%'
//       });

//     } catch (error) {
//       res.status(500).json({
//         success: false,
//         message: 'Error fetching available slots',
//         error: error.message
//       });
//     }
//   },

//   // Get comprehensive booking statistics
//   getBookingStats: async (req, res) => {
//     try {
//       const { period = 'month', startDate, endDate } = req.query;
      
//       // Date range calculation
//       let dateRange = {};
//       const now = new Date();
      
//       if (startDate && endDate) {
//         dateRange = {
//           $gte: new Date(startDate),
//           $lte: new Date(endDate)
//         };
//       } else {
//         switch (period) {
//           case 'today':
//             dateRange = {
//               $gte: new Date(now.setHours(0, 0, 0, 0)),
//               $lte: new Date(now.setHours(23, 59, 59, 999))
//             };
//             break;
//           case 'week':
//             const startOfWeek = new Date(now);
//             startOfWeek.setDate(now.getDate() - now.getDay());
//             startOfWeek.setHours(0, 0, 0, 0);
//             dateRange = {
//               $gte: startOfWeek,
//               $lte: new Date()
//             };
//             break;
//           case 'month':
//             dateRange = {
//               $gte: new Date(now.getFullYear(), now.getMonth(), 1),
//               $lte: new Date()
//             };
//             break;
//           case 'year':
//             dateRange = {
//               $gte: new Date(now.getFullYear(), 0, 1),
//               $lte: new Date()
//             };
//             break;
//           default:
//             dateRange = {
//               $gte: new Date(now.getFullYear(), now.getMonth(), 1),
//               $lte: new Date()
//             };
//         }
//       }

//       // Total bookings count
//       const totalBookings = await Booking.countDocuments({
//         date: dateRange
//       });

//       // Bookings by status
//       const bookingsByStatus = await Booking.aggregate([
//         { $match: { date: dateRange } },
//         {
//           $group: {
//             _id: '$status',
//             count: { $sum: 1 }
//           }
//         }
//       ]);

//       // Bookings by service type
//       const bookingsByService = await Booking.aggregate([
//         { $match: { date: dateRange } },
//         {
//           $group: {
//             _id: '$service',
//             count: { $sum: 1 },
//             totalGuests: { $sum: '$guests' },
//             averageGuests: { $avg: '$guests' }
//           }
//         }
//       ]);

//       // Daily booking trends
//       const dailyTrends = await Booking.aggregate([
//         { $match: { date: dateRange } },
//         {
//           $group: {
//             _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
//             count: { $sum: 1 },
//             totalGuests: { $sum: '$guests' }
//           }
//         },
//         { $sort: { _id: 1 } }
//       ]);

//       // Popular time slots
//       const popularTimeSlots = await Booking.aggregate([
//         { $match: { date: dateRange } },
//         {
//           $group: {
//             _id: '$time',
//             count: { $sum: 1 },
//             percentage: {
//               $avg: {
//                 $multiply: [100, { $divide: [1, totalBookings] }]
//               }
//             }
//           }
//         },
//         { $sort: { count: -1 } },
//         { $limit: 5 }
//       ]);

//       // Guest statistics
//       const guestStats = await Booking.aggregate([
//         { $match: { date: dateRange } },
//         {
//           $group: {
//             _id: null,
//             totalGuests: { $sum: '$guests' },
//             averageGuests: { $avg: '$guests' },
//             maxGuests: { $max: '$guests' },
//             minGuests: { $min: '$guests' }
//           }
//         }
//       ]);

//       // Revenue projection (assuming different services have different prices)
//       const revenueStats = await Booking.aggregate([
//         { $match: { date: dateRange, status: { $in: ['confirmed', 'completed'] } } },
//         {
//           $group: {
//             _id: null,
//             totalRevenue: {
//               $sum: {
//                 $switch: {
//                   branches: [
//                     { case: { $eq: ['$service', 'premium'] }, then: 200 },
//                     { case: { $eq: ['$service', 'standard'] }, then: 100 },
//                     { case: { $eq: ['$service', 'basic'] }, then: 50 }
//                   ],
//                   default: 100
//                 }
//               }
//             },
//             averageBookingValue: { $avg: '$guests' }
//           }
//         }
//       ]);

//       // Cancellation rate
//       const cancellationStats = await Booking.aggregate([
//         { $match: { date: dateRange } },
//         {
//           $group: {
//             _id: null,
//             total: { $sum: 1 },
//             cancelled: {
//               $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
//             }
//           }
//         }
//       ]);

//       const cancellationRate = cancellationStats.length > 0 ?
//         (cancellationStats[0].cancelled / cancellationStats[0].total * 100).toFixed(2) : 0;

//       res.status(200).json({
//         success: true,
//         period: period,
//         dateRange: dateRange,
//         summary: {
//           totalBookings,
//           totalGuests: guestStats[0]?.totalGuests || 0,
//           averageGuests: guestStats[0]?.averageGuests?.toFixed(2) || 0,
//           maxGuests: guestStats[0]?.maxGuests || 0,
//           cancellationRate: cancellationRate + '%',
//           projectedRevenue: revenueStats[0]?.totalRevenue || 0,
//           averageBookingValue: revenueStats[0]?.averageBookingValue?.toFixed(2) || 0
//         },
//         breakdown: {
//           byStatus: bookingsByStatus,
//           byService: bookingsByService,
//           dailyTrends: dailyTrends,
//           popularTimeSlots: popularTimeSlots
//         },
//         analytics: {
//           occupancyRate: ((totalBookings / (dailyTrends.length * 11)) * 100).toFixed(2) + '%', // 11 time slots per day
//           peakHours: popularTimeSlots.slice(0, 3),
//           mostPopularService: bookingsByService.sort((a, b) => b.count - a.count)[0] || null
//         }
//       });

//     } catch (error) {
//       console.error('Statistics error:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Error fetching booking statistics',
//         error: error.message
//       });
//     }
//   },

//   // Get monthly overview for dashboard
//   getMonthlyOverview: async (req, res) => {
//     try {
//       const { year = new Date().getFullYear() } = req.query;

//       const monthlyData = await Booking.aggregate([
//         {
//           $match: {
//             date: {
//               $gte: new Date(`${year}-01-01`),
//               $lte: new Date(`${year}-12-31`)
//             }
//           }
//         },
//         {
//           $group: {
//             _id: { $month: '$date' },
//             totalBookings: { $sum: 1 },
//             confirmedBookings: {
//               $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
//             },
//             totalGuests: { $sum: '$guests' },
//             revenue: {
//               $sum: {
//                 $switch: {
//                   branches: [
//                     { case: { $eq: ['$service', 'premium'] }, then: 200 },
//                     { case: { $eq: ['$service', 'standard'] }, then: 100 },
//                     { case: { $eq: ['$service', 'basic'] }, then: 50 }
//                   ],
//                   default: 100
//                 }
//               }
//             }
//           }
//         },
//         { $sort: { _id: 1 } }
//       ]);

//       // Fill in missing months with zero values
//       const completeMonthlyData = Array.from({ length: 12 }, (_, i) => {
//         const monthData = monthlyData.find(item => item._id === i + 1);
//         return {
//           month: i + 1,
//           monthName: new Date(year, i).toLocaleString('default', { month: 'long' }),
//           totalBookings: monthData?.totalBookings || 0,
//           confirmedBookings: monthData?.confirmedBookings || 0,
//           totalGuests: monthData?.totalGuests || 0,
//           revenue: monthData?.revenue || 0,
//           occupancyRate: ((monthData?.totalBookings || 0) / (30 * 11) * 100).toFixed(2) + '%' // Approximate
//         };
//       });

//       res.status(200).json({
//         success: true,
//         year: parseInt(year),
//         data: completeMonthlyData
//       });

//     } catch (error) {
//       res.status(500).json({
//         success: false,
//         message: 'Error fetching monthly overview',
//         error: error.message
//       });
//     }
//   }
// };

// module.exports = bookingController;
const Booking = require('../models/Booking');
const { sendBookingConfirmation, sendAdminNotification } = require('../mails/sendEmail');

const bookingController = {
  // Create new booking
createBooking: async (req, res) => {
  try {
    const {
      service,
      date,
      time,
      guests,
      name,
      email,
      phone,
      specialRequests
    } = req.body;

    // Check if time slot exists
    const timeSlots = [
      "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", 
      "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", 
      "6:00 PM", "7:00 PM", "8:00 PM"
    ];

    if (!timeSlots.includes(time)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time slot selected'
      });
    }

    // Check if time slot is fully booked (max 10 bookings)
    const existingBookingsCount = await Booking.countDocuments({
      date: new Date(date),
      time: time,
      status: { $in: ['pending', 'confirmed'] }
    });

    if (existingBookingsCount >= 10) {
      return res.status(400).json({
        success: false,
        message: 'Sorry, this time slot is fully booked. Please choose another time.'
      });
    }

    // Check for duplicate booking (same person, same date/time)
    const duplicateBooking = await Booking.findOne({
      date: new Date(date),
      time,
      email: email,
      status: { $in: ['pending', 'confirmed'] }
    });

    if (duplicateBooking) {
      return res.status(400).json({
        success: false,
        message: 'You already have a booking for this time slot.'
      });
    }

    // Create new booking
    const booking = new Booking({
      service,
      date: new Date(date),
      time,
      guests,
      name,
      email,
      phone,
      specialRequests
    });

    await booking.save();

    // Send confirmation email to customer
    await sendBookingConfirmation(booking);

    // Send notification email to admin
    await sendAdminNotification(booking);

    // Get updated slot availability
    const updatedBookingsCount = await Booking.countDocuments({
      date: new Date(date),
      time: time,
      status: { $in: ['pending', 'confirmed'] }
    });

    const remainingSpots = 10 - updatedBookingsCount;

    res.status(201).json({
      success: true,
      message: `Booking created successfully! ${remainingSpots} spots remaining in this time slot. Confirmation email sent.`,
      data: booking,
      slotInfo: {
        time: time,
        remainingSpots: remainingSpots,
        isAlmostFull: remainingSpots <= 2
      }
    });

  } catch (error) {
    console.error('Booking creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating booking',
      error: error.message
    });
  }
},

  // Get all bookings with optional filtering
  getAllBookings: async (req, res) => {
    try {
      const { status, service, startDate, endDate } = req.query;
      let filter = {};

      // Build filter based on query parameters
      if (status) filter.status = status;
      if (service) filter.service = service;
      if (startDate || endDate) {
        filter.date = {};
        if (startDate) filter.date.$gte = new Date(startDate);
        if (endDate) filter.date.$lte = new Date(endDate);
      }

      const bookings = await Booking.find(filter).sort({ date: 1, time: 1 });
      
      res.status(200).json({
        success: true,
        count: bookings.length,
        data: bookings
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching bookings',
        error: error.message
      });
    }
  },

  // Get booking by ID
  getBookingById: async (req, res) => {
    try {
      const booking = await Booking.findById(req.params.id);
      
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      res.status(200).json({
        success: true,
        data: booking
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching booking',
        error: error.message
      });
    }
  },

  // Update booking status
  updateBookingStatus: async (req, res) => {
    try {
      const { status } = req.body;
      
      const booking = await Booking.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true, runValidators: true }
      );

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Booking status updated successfully',
        data: booking
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating booking',
        error: error.message
      });
    }
  },

  // Delete booking
  deleteBooking: async (req, res) => {
    try {
      const booking = await Booking.findByIdAndDelete(req.params.id);

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Booking deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting booking',
        error: error.message
      });
    }
  },

  // Get available time slots for a date
getAvailableSlots: async (req, res) => {
  try {
    const { date } = req.params;
    
    const timeSlots = [
      "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", 
      "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", 
      "6:00 PM", "7:00 PM", "8:00 PM"
    ];

    // Find bookings for the specified date
    const bookings = await Booking.find({
      date: new Date(date),
      status: { $in: ['pending', 'confirmed'] }
    });

    // Count bookings per time slot
    const slotBookingsCount = {};
    timeSlots.forEach(slot => {
      slotBookingsCount[slot] = 0;
    });

    bookings.forEach(booking => {
      if (slotBookingsCount.hasOwnProperty(booking.time)) {
        slotBookingsCount[booking.time]++;
      }
    });

    // Filter available slots (max 10 bookings per slot)
    const availableSlots = timeSlots.filter(slot => slotBookingsCount[slot] < 10);
    const fullyBookedSlots = timeSlots.filter(slot => slotBookingsCount[slot] >= 10);
    const limitedSlots = timeSlots.filter(slot => 
      slotBookingsCount[slot] > 0 && slotBookingsCount[slot] < 10
    );

    // Calculate detailed statistics
    const totalCapacity = timeSlots.length * 10;
    const totalBooked = bookings.length;
    const totalAvailable = availableSlots.length * 10 - totalBooked; // Remaining spots across all slots

    res.status(200).json({
      success: true,
      date: date,
      availableSlots: availableSlots,
      fullyBookedSlots: fullyBookedSlots,
      limitedSlots: limitedSlots.map(slot => ({
        time: slot,
        booked: slotBookingsCount[slot],
        remaining: 10 - slotBookingsCount[slot]
      })),
      slotDetails: timeSlots.map(slot => ({
        time: slot,
        booked: slotBookingsCount[slot],
        remaining: 10 - slotBookingsCount[slot],
        status: slotBookingsCount[slot] >= 10 ? 'fully-booked' : 
                slotBookingsCount[slot] > 0 ? 'limited' : 'available'
      })),
      statistics: {
        totalSlots: timeSlots.length,
        totalCapacity: totalCapacity,
        totalBooked: totalBooked,
        totalAvailable: totalAvailable,
        bookedCount: fullyBookedSlots.length,
        availableCount: availableSlots.length,
        limitedCount: limitedSlots.length,
        occupancyRate: ((totalBooked / totalCapacity) * 100).toFixed(2) + '%',
        slotUtilization: ((totalBooked / (timeSlots.length * 10)) * 100).toFixed(2) + '%'
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching available slots',
      error: error.message
    });
  }
},
// Get comprehensive booking statistics
getBookingStats: async (req, res) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;
    
    // Date range calculation
    let dateRange = {};
    const now = new Date();
    
    if (startDate && endDate) {
      dateRange = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      switch (period) {
        case 'today':
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          const todayEnd = new Date();
          todayEnd.setHours(23, 59, 59, 999);
          dateRange = {
            $gte: todayStart,
            $lte: todayEnd
          };
          break;
        case 'week':
          const startOfWeek = new Date();
          startOfWeek.setDate(now.getDate() - now.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);
          dateRange = {
            $gte: startOfWeek,
            $lte: endOfWeek
          };
          break;
        case 'month':
          dateRange = {
            $gte: new Date(now.getFullYear(), now.getMonth(), 1),
            $lte: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
          };
          break;
        case 'year':
          dateRange = {
            $gte: new Date(now.getFullYear(), 0, 1),
            $lte: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
          };
          break;
        default:
          dateRange = {
            $gte: new Date(now.getFullYear(), now.getMonth(), 1),
            $lte: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
          };
      }
    }

    // Total bookings count
    const totalBookings = await Booking.countDocuments({
      date: dateRange
    });

    // If no bookings, return empty stats
    if (totalBookings === 0) {
      return res.status(200).json({
        success: true,
        period: period,
        dateRange: dateRange,
        summary: {
          totalBookings: 0,
          totalGuests: 0,
          averageGuests: 0,
          maxGuests: 0,
          cancellationRate: '0%',
          projectedRevenue: 0,
          averageBookingValue: 0
        },
        breakdown: {
          byStatus: [],
          byService: [],
          dailyTrends: [],
          popularTimeSlots: []
        },
        analytics: {
          occupancyRate: '0%',
          peakHours: [],
          mostPopularService: null
        }
      });
    }

    // Bookings by status
    const bookingsByStatus = await Booking.aggregate([
      { $match: { date: dateRange } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Bookings by service type
    const bookingsByService = await Booking.aggregate([
      { $match: { date: dateRange } },
      {
        $group: {
          _id: '$service',
          count: { $sum: 1 },
          totalGuests: { $sum: '$guests' },
          averageGuests: { $avg: '$guests' }
        }
      }
    ]);

    // Daily booking trends
    const dailyTrends = await Booking.aggregate([
      { $match: { date: dateRange } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          count: { $sum: 1 },
          totalGuests: { $sum: '$guests' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Popular time slots - FIXED: Avoid division by zero
    const popularTimeSlots = await Booking.aggregate([
      { $match: { date: dateRange } },
      {
        $group: {
          _id: '$time',
          count: { $sum: 1 }
        }
      },
      {
        $addFields: {
          percentage: {
            $multiply: [
              { $divide: [100, totalBookings] },
              '$count'
            ]
          }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // Guest statistics
    const guestStats = await Booking.aggregate([
      { $match: { date: dateRange } },
      {
        $group: {
          _id: null,
          totalGuests: { $sum: '$guests' },
          averageGuests: { $avg: '$guests' },
          maxGuests: { $max: '$guests' },
          minGuests: { $min: '$guests' }
        }
      }
    ]);

    // Revenue projection
    const revenueStats = await Booking.aggregate([
      { $match: { date: dateRange, status: { $in: ['confirmed', 'completed'] } } },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: {
              $switch: {
                branches: [
                  { case: { $eq: ['$service', 'premium'] }, then: 200 },
                  { case: { $eq: ['$service', 'standard'] }, then: 100 },
                  { case: { $eq: ['$service', 'basic'] }, then: 50 }
                ],
                default: 100
              }
            }
          },
          averageBookingValue: { $avg: '$guests' }
        }
      }
    ]);

    // Cancellation rate
    const cancellationStats = await Booking.aggregate([
      { $match: { date: dateRange } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          cancelled: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          }
        }
      }
    ]);

    const cancellationRate = cancellationStats.length > 0 && cancellationStats[0].total > 0 ?
      (cancellationStats[0].cancelled / cancellationStats[0].total * 100).toFixed(2) : 0;

    // FIXED: Calculate occupancy rate safely
    const totalDays = dailyTrends.length || 1; // Avoid division by zero
    const totalPossibleSlots = totalDays * 11; // 11 time slots per day
    const occupancyRate = totalPossibleSlots > 0 ? 
      ((totalBookings / totalPossibleSlots) * 100).toFixed(2) + '%' : '0%';

    res.status(200).json({
      success: true,
      period: period,
      dateRange: dateRange,
      summary: {
        totalBookings,
        totalGuests: guestStats[0]?.totalGuests || 0,
        averageGuests: guestStats[0]?.averageGuests?.toFixed(2) || 0,
        maxGuests: guestStats[0]?.maxGuests || 0,
        cancellationRate: cancellationRate + '%',
        projectedRevenue: revenueStats[0]?.totalRevenue || 0,
        averageBookingValue: revenueStats[0]?.averageBookingValue?.toFixed(2) || 0
      },
      breakdown: {
        byStatus: bookingsByStatus,
        byService: bookingsByService,
        dailyTrends: dailyTrends,
        popularTimeSlots: popularTimeSlots
      },
      analytics: {
        occupancyRate: occupancyRate,
        peakHours: popularTimeSlots.slice(0, 3),
        mostPopularService: bookingsByService.sort((a, b) => b.count - a.count)[0] || null
      }
    });

  } catch (error) {
    console.error('Statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching booking statistics',
      error: error.message
    });
  }
},

  // Get monthly overview for dashboard
  getMonthlyOverview: async (req, res) => {
    try {
      const { year = new Date().getFullYear() } = req.query;

      const monthlyData = await Booking.aggregate([
        {
          $match: {
            date: {
              $gte: new Date(`${year}-01-01`),
              $lte: new Date(`${year}-12-31`)
            }
          }
        },
        {
          $group: {
            _id: { $month: '$date' },
            totalBookings: { $sum: 1 },
            confirmedBookings: {
              $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
            },
            totalGuests: { $sum: '$guests' },
            revenue: {
              $sum: {
                $switch: {
                  branches: [
                    { case: { $eq: ['$service', 'premium'] }, then: 200 },
                    { case: { $eq: ['$service', 'standard'] }, then: 100 },
                    { case: { $eq: ['$service', 'basic'] }, then: 50 }
                  ],
                  default: 100
                }
              }
            }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      // Fill in missing months with zero values
      const completeMonthlyData = Array.from({ length: 12 }, (_, i) => {
        const monthData = monthlyData.find(item => item._id === i + 1);
        return {
          month: i + 1,
          monthName: new Date(year, i).toLocaleString('default', { month: 'long' }),
          totalBookings: monthData?.totalBookings || 0,
          confirmedBookings: monthData?.confirmedBookings || 0,
          totalGuests: monthData?.totalGuests || 0,
          revenue: monthData?.revenue || 0,
          occupancyRate: ((monthData?.totalBookings || 0) / (30 * 11) * 100).toFixed(2) + '%' // Approximate
        };
      });

      res.status(200).json({
        success: true,
        year: parseInt(year),
        data: completeMonthlyData
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching monthly overview',
        error: error.message
      });
    }
  }
};

module.exports = bookingController;
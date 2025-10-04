const nodemailer = require("nodemailer");

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Send email function
const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: options.email,
      subject: options.subject,
      html: options.html,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Email sending error:", error);
    throw new Error("There was an error sending the email. Try again later!");
  }
};

// Send verification email
exports.sendVerificationEmail = async (user, token) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333; text-align: center;">Verify Your Email Address</h2>
      <p>Hello ${user.name},</p>
      <p>Thank you for registering with us. Please verify your email address by clicking the button below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" 
           style="background-color: #007bff; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 5px; display: inline-block;">
          Verify Email Address
        </a>
      </div>
      <p>If the button doesn't work, copy and paste this link in your browser:</p>
      <p>${verificationUrl}</p>
      <p>This link will expire in 24 hours.</p>
    </div>
  `;

  await sendEmail({
    email: user.email,
    subject: "Verify Your Email Address",
    html,
  });
};

// Send welcome email
exports.sendWelcomeEmail = async (user) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #28a745; text-align: center;">Welcome Aboard!</h2>
      <p>Hello ${user.name},</p>
      <p>Congratulations! Your email has been successfully verified and your account is now active.</p>
      <p>You can now log in to your account and start using our system.</p>
    </div>
  `;

  await sendEmail({
    email: user.email,
    subject: "Welcome to Our System!",
    html,
  });
};

// Send weekly statistics email to admin
exports.sendWeeklyStatsEmail = async (admin, stats) => {
  const {
    startDate,
    endDate,
    totalUsers,
    newUsersThisWeek,
    activeUsersThisWeek,
    totalManagers,
    managerAttendance,
    userLogins,
  } = stats;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #333; margin-bottom: 5px;">Weekly System Statistics</h2>
        <p style="color: #666;">${startDate.toDateString()} - ${endDate.toDateString()}</p>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
        <h3 style="color: #007bff; margin-bottom: 15px;">📊 User Statistics</h3>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
          <div style="background: white; padding: 15px; border-radius: 5px; border-left: 4px solid #007bff;">
            <h4 style="margin: 0 0 5px 0; color: #333;">Total Users</h4>
            <p style="font-size: 24px; font-weight: bold; color: #007bff; margin: 0;">${totalUsers}</p>
          </div>
          <div style="background: white; padding: 15px; border-radius: 5px; border-left: 4px solid #28a745;">
            <h4 style="margin: 0 0 5px 0; color: #333;">New Users This Week</h4>
            <p style="font-size: 24px; font-weight: bold; color: #28a745; margin: 0;">${newUsersThisWeek}</p>
          </div>
          <div style="background: white; padding: 15px; border-radius: 5px; border-left: 4px solid #17a2b8;">
            <h4 style="margin: 0 0 5px 0; color: #333;">Active Users This Week</h4>
            <p style="font-size: 24px; font-weight: bold; color: #17a2b8; margin: 0;">${activeUsersThisWeek}</p>
          </div>
          <div style="background: white; padding: 15px; border-radius: 5px; border-left: 4px solid #6f42c1;">
            <h4 style="margin: 0 0 5px 0; color: #333;">Total Managers</h4>
            <p style="font-size: 24px; font-weight: bold; color: #6f42c1; margin: 0;">${totalManagers}</p>
          </div>
        </div>
      </div>

      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
        <h3 style="color: #dc3545; margin-bottom: 15px;">👥 Manager Attendance</h3>
        
        <table style="width: 100%; border-collapse: collapse; background: white;">
          <thead>
            <tr style="background-color: #dc3545; color: white;">
              <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Manager Name</th>
              <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Email</th>
              <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Login Count</th>
              <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Last Login</th>
              <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Attendance Rate</th>
            </tr>
          </thead>
          <tbody>
            ${managerAttendance
              .map(
                (manager) => `
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd;">${
                  manager.name
                }</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${
                  manager.email
                }</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${
                  manager.loginCount
                }</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${
                  manager.lastLogin
                    ? new Date(manager.lastLogin).toLocaleDateString()
                    : "Never"
                }</td>
                <td style="padding: 10px; border: 1px solid #ddd;">
                  <span style="color: ${
                    manager.attendanceRate >= 80
                      ? "#28a745"
                      : manager.attendanceRate >= 60
                      ? "#ffc107"
                      : "#dc3545"
                  }; font-weight: bold;">
                    ${manager.attendanceRate}%
                  </span>
                </td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>

      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
        <h3 style="color: #fd7e14; margin-bottom: 15px;">📈 User Login Activity</h3>
        
        <table style="width: 100%; border-collapse: collapse; background: white;">
          <thead>
            <tr style="background-color: #fd7e14; color: white;">
              <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Day</th>
              <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Logins</th>
              <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Active Users</th>
            </tr>
          </thead>
          <tbody>
            ${userLogins
              .map(
                (day) => `
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd;">${day.day}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${day.logins}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${day.activeUsers}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center;">
        <p style="color: #999; font-size: 12px;">
          This is an automated weekly statistics report generated by the system.
        </p>
      </div>
    </div>
  `;

  await sendEmail({
    email: admin.email,
    subject: `Weekly System Statistics - ${startDate.toDateString()} to ${endDate.toDateString()}`,
    html,
  });
};

// Send testimonial confirmation email
exports.sendTestimonialConfirmation = async (testimonial) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #28a745; margin-bottom: 10px;">Testimonial Received!</h2>
        <p style="color: #666;">Thank you for sharing your experience with us</p>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
        <p>Hello <strong>${testimonial.name}</strong>,</p>
        <p>We've successfully received your testimonial. Here's what you shared:</p>
        
        <div style="background: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p style="font-style: italic; margin: 0;">"${testimonial.content}"</p>
          <div style="margin-top: 10px;">
            <strong>Rating:</strong> ${"⭐".repeat(testimonial.rating)}
          </div>
        </div>
        
        <p><strong>Current Status:</strong> <span style="color: #ffc107; font-weight: bold;">Pending Review</span></p>
        <p>Our team will review your testimonial and it will be published on our website once approved.</p>
        
        <p>If you have any questions or need to make changes, please don't hesitate to contact us.</p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
        <p>Best regards,<br>The Team</p>
      </div>
    </div>
  `;

  await sendEmail({
    email: testimonial.email,
    subject: "Testimonial Received - Thank You!",
    html,
  });
};

// Send testimonial approval email
exports.sendTestimonialApproval = async (testimonial) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #28a745; margin-bottom: 10px;">Testimonial Approved!</h2>
        <p style="color: #666;">Your testimonial is now live on our website</p>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
        <p>Hello <strong>${testimonial.name}</strong>,</p>
        <p>Great news! Your testimonial has been approved and is now published on our website.</p>
        
        <div style="background: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p style="font-style: italic; margin: 0;">"${testimonial.content}"</p>
          <div style="margin-top: 10px;">
            <strong>Rating:</strong> ${"⭐".repeat(testimonial.rating)}
          </div>
        </div>
        
        <p style="color: #28a745; font-weight: bold;">Thank you for sharing your positive experience with our community!</p>
        
        <p>Your feedback helps others make informed decisions and helps us improve our services.</p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
        <p>Best regards,<br>The Team</p>
      </div>
    </div>
  `;

  await sendEmail({
    email: testimonial.email,
    subject: "Your Testimonial Has Been Approved!",
    html,
  });
};

// Send testimonial rejection email
exports.sendTestimonialRejection = async (testimonial, reason) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #dc3545; margin-bottom: 10px;">Testimonial Update</h2>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
        <p>Hello <strong>${testimonial.name}</strong>,</p>
        <p>Thank you for taking the time to share your feedback with us.</p>
        <p>After careful review, we're unable to publish your testimonial at this time.</p>
        
        ${
          reason
            ? `
          <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <strong>Reason:</strong> ${reason}
          </div>
        `
            : ""
        }
        
        <p>We appreciate your understanding and encourage you to share your thoughts with us in the future.</p>
        
        <p>If you have any questions, please feel free to contact our support team.</p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
        <p>Best regards,<br>The Team</p>
      </div>
    </div>
  `;

  await sendEmail({
    email: testimonial.email,
    subject: "Update on Your Testimonial",
    html,
  });
};

// Send order confirmation email
exports.sendOrderConfirmation = async (order, customerEmail) => {
  const itemsHtml = order.cartItems
    .map(
      (item) => `
    <tr>
      <td style="padding: 10px; border: 1px solid #ddd;">${item.name}</td>
      <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${
        item.quantity
      }</td>
      <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">$${item.price.toFixed(
        2
      )}</td>
      <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">$${item.totalPrice.toFixed(
        2
      )}</td>
    </tr>
  `
    )
    .join("");

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #28a745; margin-bottom: 10px;">Order Confirmed!</h2>
        <p style="color: #666;">Thank you for your order</p>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
        <h3 style="color: #333; margin-bottom: 15px;">Order Details</h3>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
          <div style="background: white; padding: 15px; border-radius: 5px;">
            <strong>Order ID:</strong> ${order.orderDetails.orderId}<br>
            <strong>Order Date:</strong> ${new Date(
              order.orderDetails.timestamp
            ).toLocaleString()}<br>
            <strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">${
              order.orderDetails.status
            }</span>
          </div>
          <div style="background: white; padding: 15px; border-radius: 5px;">
            <strong>Payment Method:</strong> ${
              order.orderDetails.paymentMethod
            }<br>
            <strong>Payment Status:</strong> <span style="color: #28a745; font-weight: bold;">${
              order.orderDetails.paymentStatus
            }</span><br>
            <strong>Total Amount:</strong> $${order.summary.total.toFixed(2)}
          </div>
        </div>

        <h4 style="color: #333; margin-bottom: 10px;">Customer Information</h4>
        <div style="background: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <strong>Name:</strong> ${order.customerInfo.name}<br>
          <strong>Phone:</strong> ${order.customerInfo.phone}<br>
          <strong>Location:</strong> ${order.customerInfo.location}<br>
          ${
            order.customerInfo.email
              ? `<strong>Email:</strong> ${order.customerInfo.email}<br>`
              : ""
          }
          ${
            order.customerInfo.notes
              ? `<strong>Notes:</strong> ${order.customerInfo.notes}`
              : ""
          }
        </div>

        <h4 style="color: #333; margin-bottom: 10px;">Order Items</h4>
        <table style="width: 100%; border-collapse: collapse; background: white;">
          <thead>
            <tr style="background-color: #007bff; color: white;">
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Item</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Qty</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Price</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="background: white; padding: 15px; border-radius: 5px; margin-top: 20px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>Subtotal:</span>
            <span>$${order.summary.subtotal.toFixed(2)}</span>
          </div>
          ${
            order.summary.tax > 0
              ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span>Tax:</span>
              <span>$${order.summary.tax.toFixed(2)}</span>
            </div>
          `
              : ""
          }
          ${
            order.summary.serviceCharge > 0
              ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span>Service Charge:</span>
              <span>$${order.summary.serviceCharge.toFixed(2)}</span>
            </div>
          `
              : ""
          }
          ${
            order.summary.deliveryFee > 0
              ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span>Delivery Fee:</span>
              <span>$${order.summary.deliveryFee.toFixed(2)}</span>
            </div>
          `
              : ""
          }
          ${
            order.summary.discount > 0
              ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span>Discount:</span>
              <span style="color: #28a745;">-$${order.summary.discount.toFixed(
                2
              )}</span>
            </div>
          `
              : ""
          }
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; border-top: 2px solid #007bff; padding-top: 10px; margin-top: 10px;">
            <span>Total:</span>
            <span>$${order.summary.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
        <p>We'll notify you when your order status changes. Thank you for choosing us!</p>
        <p>Best regards,<br>The Team</p>
      </div>
    </div>
  `;

  await sendEmail({
    email: customerEmail,
    subject: `Order Confirmation - ${order.orderDetails.orderId}`,
    html,
  });
};

// Send order status update email
exports.sendOrderStatusUpdate = async (
  order,
  customerEmail,
  previousStatus
) => {
  const statusColors = {
    pending: "#ffc107",
    confirmed: "#17a2b8",
    preparing: "#fd7e14",
    ready: "#28a745",
    completed: "#007bff",
    cancelled: "#dc3545",
  };

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: ${
          statusColors[order.orderDetails.status]
        }; margin-bottom: 10px;">
          Order Status Updated
        </h2>
        <p style="color: #666;">Your order status has been updated</p>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="display: inline-block; background: white; padding: 20px; border-radius: 10px; border-left: 5px solid ${
            statusColors[order.orderDetails.status]
          };">
            <h3 style="margin: 0 0 10px 0; color: #333;">Order #${
              order.orderDetails.orderId
            }</h3>
            <p style="margin: 0; font-size: 24px; font-weight: bold; color: ${
              statusColors[order.orderDetails.status]
            };">
              ${order.orderDetails.status.toUpperCase()}
            </p>
            <p style="margin: 10px 0 0 0; color: #666;">
              Previous status: ${previousStatus}
            </p>
          </div>
        </div>

        <div style="background: white; padding: 15px; border-radius: 5px;">
          <p><strong>Customer:</strong> ${order.customerInfo.name}</p>
          <p><strong>Order Total:</strong> $${order.summary.total.toFixed(
            2
          )}</p>
          <p><strong>Items:</strong> ${order.summary.itemCount} items</p>
          <p><strong>Last Updated:</strong> ${new Date(
            order.updatedAt
          ).toLocaleString()}</p>
        </div>

        ${
          order.orderDetails.status === "ready"
            ? `
          <div style="background: #d4edda; padding: 15px; border-radius: 5px; margin-top: 15px; border-left: 4px solid #28a745;">
            <h4 style="margin: 0 0 10px 0; color: #155724;">🎉 Your Order is Ready!</h4>
            <p style="margin: 0; color: #155724;">
              Your order is ready for pickup/delivery. Thank you for your patience!
            </p>
          </div>
        `
            : ""
        }

        ${
          order.orderDetails.status === "completed"
            ? `
          <div style="background: #d1ecf1; padding: 15px; border-radius: 5px; margin-top: 15px; border-left: 4px solid #17a2b8;">
            <h4 style="margin: 0 0 10px 0; color: #0c5460;">✅ Order Completed!</h4>
            <p style="margin: 0; color: #0c5460;">
              Thank you for your order! We hope to serve you again soon.
            </p>
          </div>
        `
            : ""
        }
      </div>
    </div>
  `;

  await sendEmail({
    email: customerEmail,
    subject: `Order Update - ${order.orderDetails.orderId} is now ${order.orderDetails.status}`,
    html,
  });
};

// Send daily order report to admin
exports.sendDailyOrderReport = async (admin, reportData) => {
  const { date, totalOrders, totalRevenue, ordersByStatus, popularItems } =
    reportData;

  const statusHtml = Object.entries(ordersByStatus)
    .map(
      ([status, count]) => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd; text-transform: capitalize;">${status}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${count}</td>
    </tr>
  `
    )
    .join("");

  const popularItemsHtml = popularItems
    .slice(0, 5)
    .map(
      (item, index) => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${index + 1}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.name}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${
        item.quantity
      }</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">$${item.revenue.toFixed(
        2
      )}</td>
    </tr>
  `
    )
    .join("");

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #333; margin-bottom: 5px;">Daily Order Report</h2>
        <p style="color: #666;">${date}</p>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
        <div style="background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 25px; border-radius: 10px; text-align: center;">
          <h3 style="margin: 0 0 10px 0; font-size: 16px;">Total Orders</h3>
          <p style="margin: 0; font-size: 32px; font-weight: bold;">${totalOrders}</p>
        </div>
        <div style="background: linear-gradient(135deg, #28a745, #1e7e34); color: white; padding: 25px; border-radius: 10px; text-align: center;">
          <h3 style="margin: 0 0 10px 0; font-size: 16px;">Total Revenue</h3>
          <p style="margin: 0; font-size: 32px; font-weight: bold;">$${totalRevenue.toFixed(
            2
          )}</p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div>
          <h3 style="color: #333; margin-bottom: 15px;">Orders by Status</h3>
          <table style="width: 100%; border-collapse: collapse; background: white;">
            <thead>
              <tr style="background-color: #6c757d; color: white;">
                <th style="padding: 10px; border: 1px solid #ddd;">Status</th>
                <th style="padding: 10px; border: 1px solid #ddd;">Count</th>
              </tr>
            </thead>
            <tbody>
              ${statusHtml}
            </tbody>
          </table>
        </div>

        <div>
          <h3 style="color: #333; margin-bottom: 15px;">Popular Items</h3>
          <table style="width: 100%; border-collapse: collapse; background: white;">
            <thead>
              <tr style="background-color: #6c757d; color: white;">
                <th style="padding: 10px; border: 1px solid #ddd;">#</th>
                <th style="padding: 10px; border: 1px solid #ddd;">Item</th>
                <th style="padding: 10px; border: 1px solid #ddd;">Qty</th>
                <th style="padding: 10px; border: 1px solid #ddd;">Revenue</th>
              </tr>
            </thead>
            <tbody>
              ${popularItemsHtml}
            </tbody>
          </table>
        </div>
      </div>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center;">
        <p style="color: #999; font-size: 12px;">
          This is an automated daily report generated by the system.
        </p>
      </div>
    </div>
  `;

  await sendEmail({
    email: admin.email,
    subject: `Daily Order Report - ${date}`,
    html,
  });
};
// ... (previous email functions)

// Send message confirmation to customer
exports.sendMessageConfirmation = async (message) => {
  const isBooking = message.type === 'booking' || message.type === 'reservation';
  
  const bookingDetails = isBooking ? `
    <div style="background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #007bff;">
      <h4 style="margin: 0 0 10px 0; color: #004085;">📅 Booking Details</h4>
      <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(message.date).toLocaleDateString()}</p>
      <p style="margin: 5px 0;"><strong>Time:</strong> ${message.time}</p>
      <p style="margin: 5px 0;"><strong>Guests:</strong> ${message.guests}</p>
    </div>
  ` : '';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #28a745; margin-bottom: 10px;">
          ${isBooking ? 'Booking Request Received!' : 'Message Received!'}
        </h2>
        <p style="color: #666;">Thank you for contacting us</p>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
        <p>Hello <strong>${message.name}</strong>,</p>
        <p>We've successfully received your ${isBooking ? 'booking request' : 'message'}. Here's what you sent us:</p>
        
        <div style="background: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p style="margin: 0; font-style: italic;">"${message.message}"</p>
        </div>
        
        ${bookingDetails}
        
        <div style="background: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h4 style="margin: 0 0 10px 0; color: #333;">Contact Information</h4>
          <p style="margin: 5px 0;"><strong>Name:</strong> ${message.name}</p>
          <p style="margin: 5px 0;"><strong>Email:</strong> ${message.email}</p>
          <p style="margin: 5px 0;"><strong>Phone:</strong> ${message.phone}</p>
          <p style="margin: 5px 0;"><strong>Message Type:</strong> ${message.type}</p>
        </div>
        
        <p><strong>Current Status:</strong> <span style="color: #17a2b8; font-weight: bold;">Received - Under Review</span></p>
        
        <p>Our team will review your ${isBooking ? 'booking request' : 'message'} and get back to you as soon as possible.</p>
        
        ${isBooking ? `
          <div style="background: #d4edda; padding: 15px; border-radius: 5px; margin-top: 15px; border-left: 4px solid #28a745;">
            <p style="margin: 0; color: #155724;">
              <strong>Note:</strong> Your booking is not confirmed until you receive a confirmation email from our team.
            </p>
          </div>
        ` : ''}
      </div>
      
      <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
        <p>We typically respond within 24 hours. For urgent matters, please call us directly.</p>
        <p>Best regards,<br>The Team</p>
      </div>
    </div>
  `;

  await sendEmail({
    email: message.email,
    subject: isBooking ? 
      `Booking Request Received - ${message.name}` : 
      `Message Received - Thank You, ${message.name}`,
    html,
  });
};

// Send new message notification to admin
exports.sendNewMessageNotification = async (admin, message) => {
  const isBooking = message.type === 'booking' || message.type === 'reservation';
  
  const priorityBadge = message.priority === 'urgent' ? 
    '<span style="background: #dc3545; color: white; padding: 3px 8px; border-radius: 12px; font-size: 12px; margin-left: 10px;">URGENT</span>' : 
    '';

  const bookingDetails = isBooking ? `
    <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #ffc107;">
      <h4 style="margin: 0 0 10px 0; color: #856404;">📅 Booking Request</h4>
      <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(message.date).toLocaleDateString()}</p>
      <p style="margin: 5px 0;"><strong>Time:</strong> ${message.time}</p>
      <p style="margin: 5px 0;"><strong>Guests:</strong> ${message.guests}</p>
    </div>
  ` : '';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #dc3545; margin-bottom: 10px;">
          🔔 New ${isBooking ? 'Booking Request' : 'Message'}
          ${priorityBadge}
        </h2>
        <p style="color: #666;">Action required</p>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
          <div style="background: white; padding: 15px; border-radius: 5px;">
            <strong>Customer:</strong> ${message.name}<br>
            <strong>Email:</strong> ${message.email}<br>
            <strong>Phone:</strong> ${message.phone}
          </div>
          <div style="background: white; padding: 15px; border-radius: 5px;">
            <strong>Type:</strong> ${message.type}<br>
            <strong>Category:</strong> ${message.category}<br>
            <strong>Priority:</strong> 
            <span style="color: ${
              message.priority === 'urgent' ? '#dc3545' :
              message.priority === 'high' ? '#fd7e14' :
              message.priority === 'medium' ? '#ffc107' : '#28a745'
            }; font-weight: bold;">
              ${message.priority.toUpperCase()}
            </span>
          </div>
        </div>

        ${bookingDetails}

        <h4 style="color: #333; margin-bottom: 10px;">Message Content</h4>
        <div style="background: white; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
          <p style="margin: 0; white-space: pre-wrap;">${message.message}</p>
        </div>

        <div style="background: #d1ecf1; padding: 15px; border-radius: 5px; margin-top: 15px;">
          <p style="margin: 0; color: #0c5460;">
            <strong>📋 Action Required:</strong> 
            Please review this ${isBooking ? 'booking request' : 'message'} and respond to the customer.
          </p>
        </div>
      </div>

      <div style="text-align: center; margin-top: 30px;">
        <a href="${process.env.FRONTEND_URL}/admin/messages" 
           style="background-color: #007bff; color: white; padding: 12px 30px; 
                  text-decoration: none; border-radius: 5px; display: inline-block;
                  font-weight: bold;">
          View in Dashboard
        </a>
      </div>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center;">
        <p style="color: #999; font-size: 12px;">
          This is an automated notification for new ${isBooking ? 'booking requests' : 'messages'}.
        </p>
      </div>
    </div>
  `;

  await sendEmail({
    email: admin.email,
    subject: `New ${isBooking ? 'Booking Request' : 'Message'} - ${message.name} (${message.priority.toUpperCase()})`,
    html,
  });
};

// Send message response to customer
exports.sendMessageResponse = async (message, response, staffName) => {
  const isBooking = message.type === 'booking' || message.type === 'reservation';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #28a745; margin-bottom: 10px;">
          ${isBooking ? 'Booking Update' : 'Response to Your Message'}
        </h2>
        <p style="color: #666;">Response from our team</p>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
        <p>Hello <strong>${message.name}</strong>,</p>
        <p>Thank you for contacting us. Here's our response to your ${isBooking ? 'booking request' : 'message'}:</p>
        
        <div style="background: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #007bff;">
          <p style="margin: 0; white-space: pre-wrap;">${response}</p>
          <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">
            — <strong>${staffName}</strong><br>
            <em>${new Date().toLocaleString()}</em>
          </p>
        </div>
        
        <div style="background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h4 style="margin: 0 0 10px 0; color: #004085;">Your Original Message</h4>
          <p style="margin: 0; font-style: italic;">"${message.message}"</p>
        </div>
        
        <p>If you have any further questions or need additional assistance, please don't hesitate to reply to this email.</p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
        <p>Best regards,<br>The Team</p>
      </div>
    </div>
  `;

  await sendEmail({
    email: message.email,
    subject: `Re: ${isBooking ? 'Booking Request' : 'Your Message'} - ${message.name}`,
    html,
  });
};

// Send daily messages report to admin
exports.sendDailyMessagesReport = async (admin, reportData) => {
  const { date, totalMessages, messagesByType, messagesByStatus, unreadCount } = reportData;

  const typeHtml = Object.entries(messagesByType).map(([type, count]) => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd; text-transform: capitalize;">${type}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${count}</td>
    </tr>
  `).join('');

  const statusHtml = Object.entries(messagesByStatus).map(([status, count]) => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd; text-transform: capitalize;">${status}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${count}</td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #333; margin-bottom: 5px;">Daily Messages Report</h2>
        <p style="color: #666;">${date}</p>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 30px;">
        <div style="background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 20px; border-radius: 10px; text-align: center;">
          <h3 style="margin: 0 0 10px 0; font-size: 14px;">Total Messages</h3>
          <p style="margin: 0; font-size: 28px; font-weight: bold;">${totalMessages}</p>
        </div>
        <div style="background: linear-gradient(135deg, #28a745, #1e7e34); color: white; padding: 20px; border-radius: 10px; text-align: center;">
          <h3 style="margin: 0 0 10px 0; font-size: 14px;">Booking Requests</h3>
          <p style="margin: 0; font-size: 28px; font-weight: bold;">${messagesByType.booking || 0}</p>
        </div>
        <div style="background: linear-gradient(135deg, #ffc107, #e0a800); color: white; padding: 20px; border-radius: 10px; text-align: center;">
          <h3 style="margin: 0 0 10px 0; font-size: 14px;">Unread Messages</h3>
          <p style="margin: 0; font-size: 28px; font-weight: bold;">${unreadCount}</p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div>
          <h3 style="color: #333; margin-bottom: 15px;">Messages by Type</h3>
          <table style="width: 100%; border-collapse: collapse; background: white;">
            <thead>
              <tr style="background-color: #6c757d; color: white;">
                <th style="padding: 10px; border: 1px solid #ddd;">Type</th>
                <th style="padding: 10px; border: 1px solid #ddd;">Count</th>
              </tr>
            </thead>
            <tbody>
              ${typeHtml}
            </tbody>
          </table>
        </div>

        <div>
          <h3 style="color: #333; margin-bottom: 15px;">Messages by Status</h3>
          <table style="width: 100%; border-collapse: collapse; background: white;">
            <thead>
              <tr style="background-color: #6c757d; color: white;">
                <th style="padding: 10px; border: 1px solid #ddd;">Status</th>
                <th style="padding: 10px; border: 1px solid #ddd;">Count</th>
              </tr>
            </thead>
            <tbody>
              ${statusHtml}
            </tbody>
          </table>
        </div>
      </div>

      ${unreadCount > 0 ? `
        <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin-top: 20px; border-left: 4px solid #ffc107;">
          <h4 style="margin: 0 0 10px 0; color: #856404;">⚠️ Action Required</h4>
          <p style="margin: 0; color: #856404;">
            You have <strong>${unreadCount}</strong> unread message${unreadCount > 1 ? 's' : ''} that require your attention.
          </p>
        </div>
      ` : ''}

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center;">
        <p style="color: #999; font-size: 12px;">
          This is an automated daily report generated by the system.
        </p>
      </div>
    </div>
  `;

  await sendEmail({
    email: admin.email,
    subject: `Daily Messages Report - ${date}`,
    html,
  });
};

// Send booking confirmation email
exports.sendBookingConfirmation = async (booking) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #28a745; margin-bottom: 10px;">Booking Confirmed! 🎉</h2>
        <p style="color: #666;">Thank you for choosing Florida Bar</p>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
        <p>Dear <strong>${booking.name}</strong>,</p>
        <p>Thank you for your booking with Florida Bar. Here are your booking details:</p>
        
        <div style="background: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h4 style="margin: 0 0 10px 0; color: #333;">Booking Details:</h4>
          <p><strong>Service:</strong> ${booking.service}</p>
          <p><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${booking.time}</p>
          <p><strong>Guests:</strong> ${booking.guests}</p>
          <p><strong>Phone:</strong> ${booking.phone}</p>
          ${booking.specialRequests ? `<p><strong>Special Requests:</strong> ${booking.specialRequests}</p>` : ''}
        </div>
        
        <p>We're looking forward to serving you! If you need to make any changes, please contact us.</p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
        <p>Best regards,<br>The Florida Bar Team</p>
      </div>
    </div>
  `;

  await sendEmail({
    email: booking.email,
    subject: 'Booking Confirmation - Florida Bar',
    html,
  });
};

// Send admin notification for new booking
exports.sendAdminNotification = async (booking) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #dc3545; margin-bottom: 10px;">New Booking Alert! 🔔</h2>
        <p style="color: #666;">A new booking has been received</p>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
        <h3 style="color: #333; margin-bottom: 15px;">Customer Details:</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
          <div style="background: white; padding: 15px; border-radius: 5px;">
            <p><strong>Name:</strong> ${booking.name}</p>
            <p><strong>Email:</strong> ${booking.email}</p>
            <p><strong>Phone:</strong> ${booking.phone}</p>
          </div>
          <div style="background: white; padding: 15px; border-radius: 5px;">
            <p><strong>Booking ID:</strong> ${booking._id}</p>
            <p><strong>Status:</strong> ${booking.status}</p>
            <p><strong>Received:</strong> ${new Date().toLocaleString()}</p>
          </div>
        </div>

        <h3 style="color: #333; margin-bottom: 15px;">Booking Details:</h3>
        <div style="background: white; padding: 15px; border-radius: 5px;">
          <p><strong>Service:</strong> ${booking.service}</p>
          <p><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${booking.time}</p>
          <p><strong>Guests:</strong> ${booking.guests}</p>
          ${booking.specialRequests ? `<p><strong>Special Requests:</strong> ${booking.specialRequests}</p>` : ''}
        </div>
      </div>

      <div style="background: #d4edda; padding: 15px; border-radius: 5px; border-left: 4px solid #28a745;">
        <p style="margin: 0; color: #155724; font-weight: bold;">
          Please review this booking in the admin panel.
        </p>
      </div>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center;">
        <p style="color: #999; font-size: 12px;">
          This is an automated notification generated by the system.
        </p>
      </div>
    </div>
  `;

  await sendEmail({
    email: process.env.ADMIN_EMAIL || process.env.EMAIL_FROM,
    subject: 'New Booking Received - Florida Bar',
    html,
  });
}; 

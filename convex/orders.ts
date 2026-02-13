// convex/orders.ts
import { mutation, action, query } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import { Resend } from "resend";

export const createOrder = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    address: v.string(),
    zip: v.string(),
    city: v.string(),
    country: v.string(),
    paymentMethod: v.union(v.literal("e-money"), v.literal("cash")),
    eMoneyNumber: v.optional(v.string()),
    eMoneyPin: v.optional(v.string()),
    items: v.array(v.object({
      id: v.number(),
      shortName: v.string(),
      price: v.number(),
      quantity: v.number(),
      image: v.string(),
    })),
    total: v.number(),
    shipping: v.number(),
    vat: v.number(),
    grandTotal: v.number(),
  },
  handler: async (ctx, args) => {
    const orderId = await ctx.db.insert("orders", {
      ...args,
      status: "pending",
      createdAt: Date.now(),
    });
    
    // Send confirmation email
    await ctx.scheduler.runAfter(0, api.orders.sendConfirmationEmail, {
      orderId: orderId,
    });

    return orderId;
  },
});

// Email function using Resend
export const sendConfirmationEmail = action({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    console.log(`🔄 Fetching order ${args.orderId}...`);
    const order: any = await ctx.runQuery(api.orders.getOrder, { orderId: args.orderId });

    if (!order) {
      console.error(`❌ Order with ID ${args.orderId} not found.`);
      return { success: false, error: "Order not found" };
    }

    console.log(`✓ Order found for ${order.email}, starting email send...`);

    try {
      // Initialize Resend
      const resendApiKey = process.env.RESEND_API_KEY;
      console.log(`Resend API Key: ${resendApiKey ? "SET ✓" : "NOT SET ❌"}`);

      if (!resendApiKey) {
        throw new Error("RESEND_API_KEY environment variable must be set");
      }

      const resend = new Resend(resendApiKey);

      // Format items list for email
      const itemsList = order.items
        .map(
          (item: any) =>
            `<tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.shortName}</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">x${item.quantity}</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${item.price.toLocaleString()}</td>
            </tr>`
        )
        .join("");

      // Create HTML email template
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
              .header { background-color: #d87d4a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background-color: white; padding: 30px; }
              .order-summary { background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .summary-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #ddd; }
              .summary-row.total { font-weight: bold; font-size: 18px; border-bottom: none; color: #d87d4a; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Order Confirmation</h1>
              </div>
              <div class="content">
                <p>Hi <strong>${order.name}</strong>,</p>
                <p>Thank you for your order! Your order has been confirmed and is being processed.</p>
                
                <h3>Order Details</h3>
                <table>
                  <thead>
                    <tr style="background-color: #f5f5f5;">
                      <th style="padding: 10px; text-align: left;">Product</th>
                      <th style="padding: 10px; text-align: center;">Qty</th>
                      <th style="padding: 10px; text-align: right;">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsList}
                  </tbody>
                </table>

                <div class="order-summary">
                  <div class="summary-row">
                    <span>Subtotal:</span>
                    <span>$${order.total.toLocaleString()}</span>
                  </div>
                  <div class="summary-row">
                    <span>Shipping:</span>
                    <span>$${order.shipping.toLocaleString()}</span>
                  </div>
                  <div class="summary-row">
                    <span>VAT (included):</span>
                    <span>$${order.vat.toLocaleString()}</span>
                  </div>
                  <div class="summary-row total">
                    <span>Grand Total:</span>
                    <span>$${order.grandTotal.toLocaleString()}</span>
                  </div>
                </div>

                <h3>Shipping Address</h3>
                <p>
                  ${order.address}<br>
                  ${order.city}, ${order.zip}<br>
                  ${order.country}
                </p>

                <h3>Payment Method</h3>
                <p>${order.paymentMethod === "e-money" ? "E-Money" : "Cash on Delivery"}</p>

                <p style="margin-top: 30px; color: #666; font-size: 14px;">
                  If you have any questions about your order, please reply to this email or contact our support team.
                </p>
              </div>
              <div class="footer">
                <p>&copy; 2026 Audiophile. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      // Determine sender address - must be a verified sender in your Resend account
      // Check your Resend dashboard (https://resend.com/emails) to see verified senders
      // const fromAddress = process.env.RESEND_FROM || "Audiophile <onboarding_email@resend.dev>";
      const fromAddress = "audiophile-e-commerce@resend.dev";
      console.log(`Using sender: ${fromAddress}`);

      // Send email via Resend
      console.log(`Sending email from "${fromAddress}" to "${order.email}"...`);
      const result = await resend.emails.send({
        from: fromAddress,
        to: order.email,
        subject: `Order Confirmation - Audiophile`,
        html: htmlContent,
      });

      // Log full response for debugging
      console.log(`📬 Resend API Response:`, JSON.stringify(result));

      // Check for errors in response
      if (result.error) {
        const errorMsg = result.error?.message || JSON.stringify(result.error);
        console.error(`❌ Resend error returned:`, errorMsg);
        throw new Error(errorMsg);
      }

      if (!result.data?.id) {
        console.error(`❌ No message ID in response:`, result);
        throw new Error("Email sent but no message ID returned - may indicate failure");
      }

      console.log(`✅ Email successfully sent to: ${order.email}`);
      console.log(`📦 Order ID: ${order._id}, Items: ${order.items.length}, Total: $${order.grandTotal}`);

      return { success: true, email: order.email, orderId: order._id, messageId: result.data.id };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
      console.error(`❌ Failed to send confirmation email to ${order.email}:`, errorMsg);
      console.error(`Full error:`, error);
      return { success: false, error: errorMsg };
    }
  },
});

export const getOrder = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    return await ctx.db.get(orderId);
  },
});

export const getAllOrders = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("orders").collect();
  },
});
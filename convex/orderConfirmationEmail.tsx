import * as React from 'react';
import type { Doc } from "./_generated/dataModel";

interface OrderConfirmationEmailProps {
  order: Doc<"orders">;
}

export default function OrderConfirmationEmail({ order }: OrderConfirmationEmailProps) {
  const main = {
    backgroundColor: '#f1f1f1',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
    padding: '20px',
  };

  const container = {
    margin: '0 auto',
    padding: '20px 0 48px',
    width: '580px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
  };

  return (
    <div style={main}>
      <div style={container}>
        <h1>Order Confirmation</h1>
        <p>Dear {order.name},</p>
        <p>Thank you for your order! Your order number is: {order._id}</p>
        <p>We will process your order shortly.</p>
        <div>
          <h2>Order Details</h2>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Quantity</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.shortName}</td>
                  <td>{item.quantity}</td>
                  <td>${item.price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div>
            <p>Subtotal: ${order.total.toFixed(2)}</p>
            <p>Shipping: ${order.shipping.toFixed(2)}</p>
            <p>VAT: ${order.vat.toFixed(2)}</p>
            <p><strong>Grand Total: ${order.grandTotal.toFixed(2)}</strong></p>
          </div>
        </div>
        <div>
          <h2>Shipping Details</h2>
          <p>{order.name}</p>
          <p>{order.address}</p>
          <p>{order.city}, {order.zip}</p>
          <p>{order.country}</p>
          <p>Phone: {order.phone}</p>
        </div>
      </div>
    </div>
  );
}
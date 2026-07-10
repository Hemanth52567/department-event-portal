require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { GoogleGenerativeAI } = require('@google/generative-ai'); // Added AI package

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'hemanth42123@gmail.com',
    pass: process.env.EMAIL_PASS
  }
});

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
  ssl: { rejectUnauthorized: false }
});

db.connect((err) => {
  if (err) {
    console.error(err);
    return;
  }
});

// --- NEW CHATBOT API ROUTE ---
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    // We use the fast and lightweight flash model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
      You are an intelligent, friendly AI assistant for a college department's Event Booking Portal.
      Here are the facts about the event you must use to answer the user's questions:
      - Event Name: National Technical Festival 2026
      - Department: Computer Science & Engineering
      - Ticket Price: ₹199 per ticket
      - Venue: Main Auditorium, Block A, Ground Floor
      - Date: April 25, 2026
      - Refund Policy: No refunds available once booked.
      - Limit: Users can book as many tickets as are available.
      
      Answer the user's question politely, briefly (1-2 sentences), and accurately based ONLY on this information. 
      If they ask something totally unrelated to the event, politely guide them back to the event topics.
      
      User's message: ${message}
    `;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    res.json({ reply: response });
  } catch (error) {
    console.error("Chat API Error:", error);
    res.status(500).json({ error: "Sorry, my servers are currently offline." });
  }
});
// -----------------------------

app.get('/api/event', (req, res) => {
  db.query('SELECT * FROM events LIMIT 1', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ message: "No event found" });
    res.json(results[0]);
  });
});

app.get('/api/bookings', (req, res) => {
  const query = `
    SELECT 
      id, 
      user_name AS name, 
      user_department AS department, 
      tickets_booked AS tickets, 
      total_amount 
    FROM bookings 
    ORDER BY id DESC
  `; 
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post('/api/bookings', (req, res) => {
  const { name, email, department, tickets, totalAmount, eventId, eventName } = req.body;
  const booking_id = 'BKG-' + Math.floor(100000 + Math.random() * 900000);
  
  const insertBookingQuery = `
    INSERT INTO bookings 
    (booking_id, user_name, user_email, user_department, event_name, tickets_booked, total_amount) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.query(insertBookingQuery, [booking_id, name, email, department, eventName, tickets, totalAmount], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const updateTicketsQuery = 'UPDATE events SET available_tickets = available_tickets - ? WHERE id = ?';
    db.query(updateTicketsQuery, [tickets, eventId], (updateErr) => {
      if (updateErr) return res.status(500).json({ error: updateErr.message });
      
      const mailOptions = {
        from: 'hemanth42123@gmail.com',
        to: email, 
        subject: `Your Ticket Confirmation: ${eventName}`,
        html: `
          <h2>Thank you for your booking, ${name}!</h2>
          <p>Your ticket reservation is confirmed.</p>
          <ul>
            <li><strong>Ticket ID:</strong> ${booking_id}</li>
            <li><strong>Event:</strong> ${eventName}</li>
            <li><strong>Tickets Booked:</strong> ${tickets}</li>
            <li><strong>Total Paid:</strong> ₹${totalAmount}</li>
          </ul>
          <p>Please show this ID at the venue.</p>
        `
      };

      transporter.sendMail(mailOptions, (mailErr, info) => {
        if (mailErr) console.error(mailErr);
      });

      res.json({ success: true });
    });
  });
});

app.delete('/api/bookings/:id', (req, res) => {
  const bookingId = req.params.id;
  const { tickets, eventId } = req.body;

  const deleteQuery = 'DELETE FROM bookings WHERE id = ?';
  db.query(deleteQuery, [bookingId], (err) => {
    if (err) return res.status(500).json({ error: err.message });

    const restoreQuery = 'UPDATE events SET available_tickets = available_tickets + ? WHERE id = ?';
    db.query(restoreQuery, [tickets, eventId], (updateErr) => {
      if (updateErr) return res.status(500).json({ error: updateErr.message });
      res.json({ success: true });
    });
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

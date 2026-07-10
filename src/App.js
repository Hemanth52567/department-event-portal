import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import HolographicTicket from './HolographicTicket';

// --- CHATBOT COMPONENT ---
const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hi! I am the AI Support Bot. Got any questions about the event?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('https://department-event-portal.onrender.com/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.text })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { sender: 'bot', text: data.reply || data.error }]);
    } catch (error) {
      setMessages(prev => [...prev, { sender: 'bot', text: "Error connecting to AI server." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chatbot-wrapper">
      {!isOpen ? (
        <button className="chatbot-trigger" onClick={() => setIsOpen(true)}>
          <span style={{ fontSize: '1.2rem' }}>✨</span> Ask AI
        </button>
      ) : (
        <div className="chatbot-window ui-card">
          <div className="chatbot-header">
            <h4>🤖 Event Assistant</h4>
            <button className="close-btn" onClick={() => setIsOpen(false)}>✖</button>
          </div>
          <div className="chatbot-body">
            {messages.map((m, i) => (
              <div key={i} className={`chat-bubble ${m.sender}`}>{m.text}</div>
            ))}
            {isLoading && <div className="chat-bubble bot typing">Thinking...</div>}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={sendMessage} className="chatbot-input-area">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about tickets..." />
            <button type="submit" disabled={isLoading || !input.trim()}>Send</button>
          </form>
        </div>
      )}
    </div>
  );
};

const EventDetails = ({ eventInfo }) => {
  if (!eventInfo) return <div className="ui-card">Loading event details...</div>;
  return (
    <div className="ui-card">
      <div className="card-header">
        <h2>Event Details</h2>
      </div>
      <div className="info-list">
        <div className="info-item"><span className="label">Event Name</span><span className="value fw-bold">{eventInfo.name}</span></div>
        <div className="info-item"><span className="label">Department</span><span className="value">{eventInfo.department}</span></div>
        <div className="info-item"><span className="label">Venue</span><span className="value">{eventInfo.venue}</span></div>
      </div>
      <div className={`ticket-status ${eventInfo.available_tickets <= 10 ? 'low-stock' : ''}`}>
        <div className="status-text">Available</div>
        <div className="status-count">{eventInfo.available_tickets}</div>
      </div>
      <iframe title="Map" width="100%" height="180" src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3886.1!2d80.09!3d13.17!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTPCsDEwJzI2LjQiTiA4MMKwMDUnNTIuMSJF!5e0!3m2!1sen!2sin!4v1600000000000" style={{border:0, marginTop:'20px'}}></iframe>
    </div>
  );
};

const BookingForm = ({ eventInfo, onBook }) => {
  const [formData, setFormData] = useState({ name: '', email: '', department: '', tickets: '' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isDisabled = !eventInfo || eventInfo.available_tickets === 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onBook({
        ...formData,
        eventId: eventInfo.id,
        eventName: eventInfo.name,
        tickets: parseInt(formData.tickets, 10),
        totalAmount: parseInt(formData.tickets, 10) * parseFloat(eventInfo.ticket_price)
    });
    setIsSubmitting(false);
    setFormData({ name: '', email: '', department: '', tickets: '' });
  };

  return (
    <div className="ui-card">
      <div className="card-header"><h2>Book Tickets</h2></div>
      <form onSubmit={handleSubmit} className="modern-form">
        <input type="text" name="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Full Name" required />
        <input type="email" name="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="Email" required />
        <input type="text" name="department" value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} placeholder="Dept" required />
        <input type="number" name="tickets" value={formData.tickets} onChange={(e) => setFormData({...formData, tickets: e.target.value})} placeholder="Quantity" required />
        <button type="submit" className="btn-primary" disabled={isDisabled || isSubmitting}>Confirm Booking</button>
      </form>
    </div>
  );
};

export default function App() {
  const [eventInfo, setEventInfo] = useState(null);
  const [databaseBookings, setDatabaseBookings] = useState([]);
  const [bookingSummary, setBookingSummary] = useState(null);

  const fetchData = async () => {
    try {
      const eRes = await fetch('https://department-event-portal.onrender.com/api/event');
      setEventInfo(await eRes.json());
      const bRes = await fetch('https://department-event-portal.onrender.com/api/bookings');
      setDatabaseBookings(await bRes.json());
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleBooking = async (data) => {
    await fetch('https://department-event-portal.onrender.com/api/bookings', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    });
    fetchData();
    setBookingSummary({ ...data, ticketId: 'VIP-' + Math.random().toString(36).substr(2, 9).toUpperCase() });
  };

  const handleShowTicket = (b) => {
    setBookingSummary({ userName: b.name, eventName: eventInfo.name, ticketsBooked: b.tickets, totalAmount: b.total_amount, ticketId: `VIP-BKG${b.id}` });
  };

  const handleDelete = async (b) => {
    if (window.confirm("Are you sure?")) {
      await fetch(`https://department-event-portal.onrender.com/api/bookings/${b.id}`, {
        method: 'DELETE',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ tickets: b.tickets, eventId: eventInfo.id })
      });
      fetchData();
    }
  };

  return (
    <div className="app-root">
      <div className="page-wrapper">
        <div className="main-container">
          <div className="content-grid">
            <EventDetails eventInfo={eventInfo} />
            <BookingForm eventInfo={eventInfo} onBook={handleBooking} />
          </div>
          <div className="database-section ui-card" style={{ marginTop: '40px' }}>
            <h2>Recent Bookings</h2>
            <table>
              <thead><tr><th>ID</th><th>Name</th><th>Action</th></tr></thead>
              <tbody>
                {Array.isArray(databaseBookings) && databaseBookings.length > 0 ? (
                  databaseBookings.map((b) => (
                    <tr key={b.id}>
                      <td>#{b.id}</td>
                      <td>{b.name}</td>
                      <td>
                        <button className="btn-primary" onClick={() => handleShowTicket(b)}>Show</button>
                        <button className="btn-primary" style={{background: 'var(--error)'}} onClick={() => handleDelete(b)}>Delete</button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="3">No bookings yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {bookingSummary && <HolographicTicket summary={bookingSummary} onClose={() => setBookingSummary(null)} />}
        </div>
      </div>
      <ChatbotWidget />
    </div>
  );
}
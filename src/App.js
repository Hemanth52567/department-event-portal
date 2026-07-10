import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import HolographicTicket from './HolographicTicket';

// --- NEW CHATBOT COMPONENT ---
const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hi! I am the AI Support Bot. Got any questions about the event?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Auto-scroll to the bottom when a new message arrives
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
      const res = await fetch('https://department-event-portal.onrender.com', {
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
              <div key={i} className={`chat-bubble ${m.sender}`}>
                {m.text}
              </div>
            ))}
            {isLoading && <div className="chat-bubble bot typing">Thinking...</div>}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={sendMessage} className="chatbot-input-area">
            <input 
              type="text" 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              placeholder="Ask about tickets, venue..." 
            />
            <button type="submit" disabled={isLoading || !input.trim()}>Send</button>
          </form>
        </div>
      )}
    </div>
  );
};
// -----------------------------

const EventDetails = ({ eventInfo }) => {
  if (!eventInfo) return <div className="ui-card">Loading event details...</div>;

  return (
    <div className="ui-card">
      <div className="card-header">
        <div className="icon-wrapper">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        </div>
        <h2>Event Details</h2>
      </div>
      
      <div className="info-list">
        <div className="info-item">
          <span className="label">Event Name</span>
          <span className="value fw-bold">{eventInfo.name}</span>
        </div>
        <div className="info-item">
          <span className="label">Department</span>
          <span className="value">{eventInfo.department}</span>
        </div>
        <div className="info-item">
          <span className="label">Date & Time</span>
          <span className="value">{eventInfo.event_datetime}</span>
        </div>
        <div className="info-item">
          <span className="label">Venue</span>
          <span className="value">{eventInfo.venue}</span>
        </div>
        <div className="info-item">
          <span className="label">Ticket Price</span>
          <span className="value text-primary fw-bold">₹{eventInfo.ticket_price}</span>
        </div>
      </div>

      <div className={`ticket-status ${eventInfo.available_tickets <= 10 ? 'low-stock' : ''}`}>
        <div className="status-text">Available Tickets</div>
        <div className="status-count">{eventInfo.available_tickets}</div>
      </div>

      <div style={{ marginTop: '20px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
        <iframe
          title="Event Location"
          width="100%"
          height="180"
          style={{ border: 0, display: 'block' }}
          loading="lazy"
          allowFullScreen
          src={`https://maps.google.com/maps?q=13.174000,80.097806&t=&z=15&ie=UTF8&iwloc=&output=embed`}
        ></iframe>
      </div>
    </div>
  );
};

const BookingForm = ({ eventInfo, onBook }) => {
  const [formData, setFormData] = useState({ name: '', email: '', department: '', tickets: '' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDisabled = !eventInfo || eventInfo.available_tickets === 0;

  const validateForm = () => {
    let formErrors = {};
    if (!formData.name.trim()) formErrors.name = "Name is required";
    if (!formData.department.trim()) formErrors.department = "Department is required";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      formErrors.email = "Email is required";
    } else if (!emailRegex.test(formData.email)) {
      formErrors.email = "Enter a valid email";
    }

    const ticketNum = parseInt(formData.tickets, 10);
    if (!formData.tickets) {
      formErrors.tickets = "Required";
    } else if (isNaN(ticketNum) || ticketNum <= 0) {
      formErrors.tickets = "Must be a positive number";
    } else if (ticketNum > eventInfo.available_tickets) {
      formErrors.tickets = `Only ${eventInfo.available_tickets} tickets left`;
    }

    setErrors(formErrors);
    return Object.keys(formErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      setIsSubmitting(true);
      const isSuccess = await onBook({
        eventId: eventInfo.id,
        eventName: eventInfo.name,
        name: formData.name,
        email: formData.email,
        department: formData.department,
        tickets: parseInt(formData.tickets, 10),
        totalAmount: parseInt(formData.tickets, 10) * parseFloat(eventInfo.ticket_price)
      });
      
      setIsSubmitting(false);
      
      if (isSuccess) {
        setFormData({ name: '', email: '', department: '', tickets: '' });
        setErrors({});
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: null });
  };

  return (
    <div className="ui-card">
      <div className="card-header">
        <div className="icon-wrapper accent">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
        </div>
        <h2>Book Tickets</h2>
      </div>

      <form onSubmit={handleSubmit} className="modern-form">
        <div className="input-group">
          <label>Full Name</label>
          <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="John Doe" disabled={isDisabled} />
          {errors.name && <span className="error-msg">{errors.name}</span>}
        </div>

        <div className="input-group">
          <label>Email Address</label>
          <input type="text" name="email" value={formData.email} onChange={handleChange} placeholder="student@college.edu" disabled={isDisabled} />
          {errors.email && <span className="error-msg">{errors.email}</span>}
        </div>

        <div className="input-group">
          <label>Department</label>
          <input type="text" name="department" value={formData.department} onChange={handleChange} placeholder="Computer Science" disabled={isDisabled} />
          {errors.department && <span className="error-msg">{errors.department}</span>}
        </div>

        <div className="input-group">
          <label>Number of Tickets</label>
          <input type="number" name="tickets" value={formData.tickets} onChange={handleChange} min="1" placeholder="1" disabled={isDisabled} />
          {errors.tickets && <span className="error-msg">{errors.tickets}</span>}
        </div>

        <button type="submit" className="btn-primary" disabled={isDisabled || isSubmitting}>
          {isSubmitting ? 'Processing...' : (isDisabled ? 'Sold Out / Unavailable' : 'Confirm Booking')}
        </button>
      </form>
    </div>
  );
};

export default function App() {
  const [eventInfo, setEventInfo] = useState(null);
  const [databaseBookings, setDatabaseBookings] = useState([]);
  const [bookingSummary, setBookingSummary] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const fetchData = async () => {
    try {
      const eventRes = await fetch('https://department-event-portal.onrender.com/api/event');
      const eventData = await eventRes.json();
      setEventInfo(eventData);

      const bookingsRes = await fetch('https://department-event-portal.onrender.com/api/bookings');
      const bookingsData = await bookingsRes.json();
      setDatabaseBookings(bookingsData);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleBooking = async (bookingData) => {
    try {
      const response = await fetch('https://department-event-portal.onrender.com/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      });
      
      const data = await response.json();

      if (response.ok) {
        await fetchData(); 
        setBookingSummary({
          userName: bookingData.name,
          eventName: eventInfo.name,
          ticketsBooked: bookingData.tickets,
          totalAmount: bookingData.totalAmount,
          ticketId: `VIP-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
        });
        return true; 
      } else {
        alert("Database Error: " + data.error);
        return false;
      }
    } catch (error) {
      alert("Network Error: Failed to connect to the backend server.");
      return false;
    }
  };

  const handleShowTicket = (b) => {
    setBookingSummary({
      userName: b.name,
      eventName: eventInfo.name,
      ticketsBooked: b.tickets,
      totalAmount: b.total_amount,
      ticketId: `VIP-BKG${b.id.toString().padStart(5, '0')}`
    });
  };

  const handleDelete = async (b) => {
    if (window.confirm(`Are you sure you want to delete the booking for ${b.name}?`)) {
      try {
        const response = await fetch(`https://department-event-portal.onrender.com/api/bookings/${b.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tickets: b.tickets, eventId: eventInfo.id })
        });
        if (response.ok) {
          fetchData();
        } else {
          const data = await response.json();
          alert("Database Error: " + data.error);
        }
      } catch (error) {
        alert("Network Error: Failed to delete booking.");
      }
    }
  };

  return (
    <div className={`app-root ${isDarkMode ? 'dark-theme' : ''}`}>
      <div className="aurora-orb"></div>
      <div className="page-wrapper">
        <div className="main-container">
          
          <header className="page-header">
            <div className="header-top">
               <h1>Department Event Portal</h1>
               <button className="theme-toggle" onClick={() => setIsDarkMode(!isDarkMode)} aria-label="Toggle Dark Mode">
                 {isDarkMode ? '☀️' : '🌙'}
               </button>
            </div>
            <p>Reserve your spot for upcoming campus events seamlessly.</p>
          </header>

          <div className="content-grid">
            <EventDetails eventInfo={eventInfo} />
            <BookingForm eventInfo={eventInfo} onBook={handleBooking} />
          </div>

          <div className="database-section ui-card" style={{ marginTop: '40px' }}>
            <div className="card-header">
               <h2>Recent Database Bookings</h2>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Dept</th>
                    <th>Tickets</th>
                    <th>Total Paid</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(databaseBookings) && databaseBookings.length > 0 ? (
                    databaseBookings.map((b) => (
                      <tr key={b.id}>
                        <td>#{b.id}</td>
                        <td>{b.name}</td>
                        <td>{b.department}</td>
                        <td>{b.tickets}</td>
                        <td className="fw-bold text-primary">₹{b.total_amount}</td>
                        {/* Your buttons here... */}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{textAlign: 'center', padding: '20px'}}>
                        {databaseBookings ? "No bookings yet." : "Loading bookings..."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {bookingSummary && (
            <HolographicTicket summary={bookingSummary} onClose={() => setBookingSummary(null)} />
          )}

        </div>
      </div>
      
      {/* Inject the Chatbot at the absolute root of the App */}
      <ChatbotWidget />
      
    </div>
  );
}

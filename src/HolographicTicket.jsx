import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const HolographicTicket = ({ summary, onClose }) => {
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0, glareX: 50, glareY: 50 });

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left; 
    const y = e.clientY - rect.top;  
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -15; 
    const rotateY = ((x - centerX) / centerX) * 15;
    
    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;

    setTilt({ x: rotateX, y: rotateY, glareX, glareY });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0, glareX: 50, glareY: 50 });
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ perspective: '1000px' }}>
      <div 
        className="hologram-ticket"
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: 'transform 0.1s ease-out'
        }}
      >
        <div 
          className="glare-overlay"
          style={{
            background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.4) 0%, transparent 60%)`
          }}
        />

        <div className="ticket-header">
          <h3>VIP ADMIT ONE</h3>
          <span>{summary.ticketId}</span>
        </div>

        <div className="ticket-body">
          <div className="ticket-info">
            <p className="label">Passenger / Guest</p>
            <p className="value">{summary.userName}</p>
            
            <p className="label">Event</p>
            <p className="value highlight">{summary.eventName}</p>
            
            <div className="ticket-row">
              <div>
                <p className="label">Quantity</p>
                <p className="value">{summary.ticketsBooked}</p>
              </div>
              <div>
                <p className="label">Total Paid</p>
                <p className="value text-primary">₹{summary.totalAmount}</p>
              </div>
            </div>
          </div>
          
          <div className="ticket-qr">
             <QRCodeSVG 
               value={`TICKET ID: ${summary.ticketId}\nNAME: ${summary.userName}\nEVENT: ${summary.eventName}\nTICKETS: ${summary.ticketsBooked}\nTOTAL: ₹${summary.totalAmount}`} 
               size={100} 
               bgColor="transparent" 
               fgColor="currentColor" 
             />
             <p>Scan to verify</p>
          </div>
        </div>

        <div className="ticket-tear-edge"></div>
        
        <button className="btn-secondary" onClick={onClose} style={{marginTop: '20px'}}>
          Done
        </button>
      </div>
    </div>
  );
};

export default HolographicTicket;
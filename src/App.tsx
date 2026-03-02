import React from 'react';
import './App.css';
import GatewayBuilder from './components/GatewayBuilder';

function App() {
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#ffffff',
      color: '#2c3e50'
    }}>
      {/* Header with Logo */}
      <div style={{
        borderBottom: '3px solid #6c757d',
        backgroundColor: '#ffffff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: '20px', paddingRight: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img 
              src={process.env.PUBLIC_URL + '/evs-logo.png'} 
              alt="EVS Automation" 
              style={{ 
                height: '50px', 
                width: 'auto',
                padding: '8px'
              }} 
            />
            <div style={{ fontSize: '15px', fontWeight: '700', letterSpacing: '0.5px' }}>
              <span style={{ color: '#1a1a1a' }}>EVS</span>
              <span style={{ color: '#6c757d' }}> AUTOMATION</span>
            </div>
          </div>
          <div style={{ 
            padding: '14px 24px',
            fontSize: '15px',
            fontWeight: '600',
            color: '#1a1a1a',
            letterSpacing: '0.3px',
            textTransform: 'uppercase'
          }}>
            Industrial Gateway Builder
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        flex: 1,
        overflow: 'auto'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <GatewayBuilder />
        </div>
      </div>
    </div>
  );
}

export default App;
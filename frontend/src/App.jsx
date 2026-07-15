import React, { useState, useEffect } from 'react';
import { FiShield, FiUsers, FiLock, FiUser, FiShoppingBag, FiTrash2, FiLogOut, FiCheckCircle, FiAlertTriangle, FiUserPlus, FiMessageSquare } from 'react-icons/fi';
import './App.css';

function App() {
  // Global Session State Managers
  const [userSession, setUserSession] = useState(null); 
  const [authMode, setAuthMode] = useState('login'); 
  const [adminTab, setAdminTab] = useState('fraud'); 

  // Selected Year filter matching your wireframe dropdown layout selection
  const [selectedYear, setSelectedYear] = useState("2026");

  // Custom User Termination Tracker state
  const [customReasonText, setCustomReasonText] = useState("");

  // Input Form States
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [regForm, setRegForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [authError, setAuthError] = useState(null);
  const [authSuccess, setAuthSuccess] = useState(null);

  // Core Analytical Data Engine Arrays
  const [adminRecords, setAdminRecords] = useState([]);
  const [shopProducts, setShopProducts] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  const monthsArray = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const barColors = ["#ef4444", "#22c55e", "#3b82f6", "#a855f7", "#eab308", "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#6366f1", "#84cc16", "#f43f5e"];

  // Calculate dynamic heights for each month safely using index matches
  const getMonthlyChurnCounts = () => {
    const monthlyCounts = Array(12).fill(0);
    
    adminRecords.forEach(record => {
      if (Number(record.churn_status) === 1 && record.date_left && record.date_left !== '-') {
        const dateStr = String(record.date_left); 
        
        if (dateStr.includes(String(selectedYear))) {
          if (dateStr.includes("-01-") || dateStr.includes("/01/")) monthlyCounts[0] += 1;
          else if (dateStr.includes("-02-") || dateStr.includes("/02/")) monthlyCounts[1] += 1;
          else if (dateStr.includes("-03-") || dateStr.includes("/03/")) monthlyCounts[2] += 1;
          else if (dateStr.includes("-04-") || dateStr.includes("/04/")) monthlyCounts[3] += 1;
          else if (dateStr.includes("-05-") || dateStr.includes("/05/")) monthlyCounts[4] += 1;
          else if (dateStr.includes("-06-") || dateStr.includes("/06/")) monthlyCounts[5] += 1; 
          else if (dateStr.includes("-07-") || dateStr.includes("/07/")) monthlyCounts[6] += 1;
          else if (dateStr.includes("-08-") || dateStr.includes("/08/")) monthlyCounts[7] += 1;
          else if (dateStr.includes("-09-") || dateStr.includes("/09/")) monthlyCounts[8] += 1;
          else if (dateStr.includes("-10-") || dateStr.includes("/10/")) monthlyCounts[9] += 1;
          else if (dateStr.includes("-11-") || dateStr.includes("/11/")) monthlyCounts[10] += 1;
          else if (dateStr.includes("-12-") || dateStr.includes("/12/")) monthlyCounts[11] += 1;
        }
      }
    });
    return monthlyCounts;
  };

  const currentMonthlyData = getMonthlyChurnCounts();
  const maxChurnValue = Math.max(...currentMonthlyData, 5); 

  const getGeoCoordinates = () => {
    return new Promise((resolve) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve({ lat: 20.2961, lng: 85.8245 }) 
        );
      } else {
        resolve({ lat: 20.2961, lng: 85.8245 });
      }
    });
  };

  const fetchAdminMetrics = async () => {
    try {
      const res = await fetch('http://localhost:8000/admin/analytics');
      if (res.ok) {
        const data = await res.json();
        setAdminRecords(data);
      }
    } catch (err) {
      console.error("Failed fetching directory updates:", err);
    }
  };

  useEffect(() => {
    if (userSession?.role === 'admin') {
      fetchAdminMetrics();
      const interval = setInterval(fetchAdminMetrics, 3000); 
      return () => clearInterval(interval);
    } else if (userSession?.role === 'customer') {
      try {
        fetch('http://localhost:8000/products').then(res => res.json()).then(data => setShopProducts(data));
      } catch (err) { console.error("Error connecting inventory payload nodes:", err); }
    }
  }, [userSession]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const res = await fetch('http://localhost:8000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username_or_id: loginForm.username, password: loginForm.password })
      });
      const data = await res.json();
      if (res.ok) {
        setUserSession({ role: data.role, id: data.customer_id || null, name: data.name });
      } else {
        setAuthError(data.detail || "Authentication Failed.");
      }
    } catch {
      setAuthError("Server gateway link offline.");
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setActionLoading(true);

    const coords = await getGeoCoordinates();

    try {
      const res = await fetch('http://localhost:8000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regForm.name, email: regForm.email, phone_no: regForm.phone, password: regForm.password,
          user_lat: coords.lat, user_long: coords.lng
        })
      });
      const data = await res.json();
      if (res.ok) {
        setAuthSuccess(`Success! Generated ID: ${data.customer_id}. You can log in now.`);
        setAuthMode('login');
        setRegForm({ name: '', email: '', phone: '', password: '' });
      } else {
        setAuthError(data.detail || "Security firewall blocker triggered.");
      }
    } catch {
      setAuthError("Failed connection with security node matrix.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleTerminateAccount = async () => {
    // Check if user left input blank
    if (!customReasonText.trim()) {
      alert("Please provide a cancellation reason inside the text panel before terminating your profile framework.");
      return;
    }

    if (!window.confirm("CRITICAL WARNING: Are you sure you want to permanently deactivate your profile and log your specified exit feedback into admin telemetry logs?")) return;
    
    try {
      const res = await fetch('http://localhost:8000/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          customer_id: userSession.id, 
          reason: customReasonText.trim() // 🚀 PASSES THE CUSTOMER'S ACTUAL REASON OVER THE WIRE
        })
      });
      if (res.ok) {
        alert("Profile successfully terminated. Exit parameters logged.");
        setCustomReasonText(""); // Reset text field buffer
        setUserSession(null);
      }
    } catch {
      alert("Account deactivation node communication mismatch.");
    }
  };

  if (!userSession) {
    return (
      <div className="auth-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f172a' }}>
        <div className="auth-card" style={{ background: '#1e293b', padding: '35px', borderRadius: '8px', border: '1px solid #334155', width: '400px', color: '#fff' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>{authMode === 'login' ? '🔑 Application Portal Access' : '📝 Create Verified Profile'}</h2>
          {authError && <div style={{ background: '#991b1b', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: '0.85rem' }}>{authError}</div>}
          {authSuccess && <div style={{ background: '#065f46', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: '0.85rem' }}>{authSuccess}</div>}
          
          {authMode === 'login' ? (
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input type="text" placeholder="Customer ID or 'admin'" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} required style={inputStyle} />
              <input type="password" placeholder="Password Key" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} required style={inputStyle} />
              <button type="submit" style={buttonStyle}>Authenticate Session 🚀</button>
              <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#94a3b8' }}>New visitor? <span onClick={() => setAuthMode('register')} style={{ color: '#2563eb', cursor: 'pointer', fontWeight: 'bold' }}>Register Here</span></p>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="text" placeholder="Full Name" value={regForm.name} onChange={e => setRegForm({...regForm, name: e.target.value})} required style={inputStyle} />
              <input type="email" placeholder="Email Address" value={regForm.email} onChange={e => setRegForm({...regForm, email: e.target.value})} required style={inputStyle} />
              <input type="text" placeholder="Phone Number" value={regForm.phone} onChange={e => setRegForm({...regForm, phone: e.target.value})} required style={inputStyle} />
              <input type="password" placeholder="Create Password" value={regForm.password} onChange={e => setRegForm({...regForm, password: e.target.value})} required style={inputStyle} />
              <button type="submit" disabled={actionLoading} style={buttonStyle}>{actionLoading ? 'Evaluating Geolocation Risk Grid...' : 'Submit Credentials 🚀'}</button>
              <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#94a3b8' }}>Existing profile? <span onClick={() => setAuthMode('login')} style={{ color: '#2563eb', cursor: 'pointer', fontWeight: 'bold' }}>Log In Instead</span></p>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* 🌐 TOP NAVIGATION MASTER BAR LAYOUT */}
      <nav className="global-nav" style={{ display: 'flex', background: '#1e293b', padding: '12px 20px', borderRadius: '8px', alignItems: 'center', gap: '10px', border: '1px solid #334155' }}>
        <span style={{ fontWeight: 'bold', color: '#fff', fontSize: '1.1rem', marginRight: '20px' }}>🌟 Hello, {userSession.name}!</span>
        {userSession.role === 'admin' && (
          <>
            <button className={`nav-btn ${adminTab === 'fraud' ? 'active' : ''}`} onClick={() => setAdminTab('fraud')}><FiShield /> Security Risk Gate</button>
            <button className={`nav-btn ${adminTab === 'churn' ? 'active' : ''}`} onClick={() => setAdminTab('churn')}><FiUsers /> Customer Risk Dashboard</button>
          </>
        )}
        <button onClick={() => setUserSession(null)} style={{ marginLeft: 'auto', background: '#334155', border: 'none', padding: '8px 15px', color: '#fff', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><FiLogOut /> Logout</button>
      </nav>

      {/* ================= MODE 1: ADMIN CONTROL SYSTEMS ================= */}
      {userSession.role === 'admin' && (
        <div className="tab-content animate-fade" style={{ marginTop: '25px' }}>
          
          {/* TAB PANEL A: FRAUD RISK AUDITS */}
          {adminTab === 'fraud' && (
            <section className="stream-section">
              <h2>🔴 Real-Time Identity Security Audit Feed</h2>
              <div className="log-table-container">
                <table className="log-table">
                  <thead><tr><th>Customer ID / Profile Name</th><th>Contact Handle</th><th>Date Verified</th><th>Status Check</th></tr></thead>
                  <tbody>
                    {adminRecords.map((r, i) => (
                      <tr key={i} className="row-safe">
                        <td><strong>{r.customer_name}</strong> <br/><small style={{color: '#94a3b8'}}>{r.customer_id}</small></td>
                        <td>{r.email ? r.email : r.phone_no}</td>
                        <td>{r.date_joined}</td>
                        <td><span className="badge safe"><FiCheckCircle /> ANTI-FRAUD VERIFIED</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* TAB PANEL B: CHURN RETENTION HUB WITH FIXED CHARTS */}
          {adminTab === 'churn' && (
            <div>
              <div className="churn-top-row">
                
                {/* INTERACTIVE MONTHLY TREND BAR GRAPH */}
                <div className="metric-card chart-card-wrapper" style={{ minHeight: '340px', background: '#1e293b', padding: '20px', borderRadius: '12px', boxSizing: 'border-box' }}>
                  
                  {/* Header Section: Title, Legend Box & Dropdown */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', width: '100%' }}>
                    <div>
                      <h3 style={{ margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>📉 No. of Customer Churn</h3>
                      
                      {/* 📝 LEGEND REFERENCE GRAPH LABEL BOX */}
                      <div style={{ background: '#0f172a', border: '1px solid #475569', padding: '8px 12px', borderRadius: '6px', marginTop: '10px', fontSize: '0.8rem', lineHeight: '1.4', color: '#cbd5e1', width: 'fit-content' }}>
                        <div>📊 <strong>Y-axis:</strong> No. of customer churn</div>
                        <div>📍 <strong>X-axis:</strong> Months</div>
                      </div>
                    </div>
                    
                    {/* Dynamic Year Dropdown Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 'bold' }}>Year:</label>
                      <select 
                        value={selectedYear} 
                        onChange={(e) => setSelectedYear(e.target.value)}
                        style={{ background: '#0f172a', color: '#fff', border: '1px solid #475569', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                        <option value="2027">2027</option>
                      </select>
                    </div>
                  </div>

                  {/* FIXED STRUCTURAL GRAPH CANVAS WRAPPER */}
                  <div style={{ paddingLeft: '45px', paddingRight: '15px', boxSizing: 'border-box', width: '100%', marginTop: '10px' }}>
                    
                    {/* The Chart Workspace Main Area */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', height: '160px', borderLeft: '2px solid #64748b', borderBottom: '2px solid #64748b', position: 'relative', alignItems: 'flex-end', justifyItems: 'center' }}>
                      
                      {/* Y-Axis Metrics Value Labels */}
                      <div style={{ position: 'absolute', left: '-40px', top: '0', bottom: '0', display: 'flex', flexDirection: 'column-reverse', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b', textAlign: 'right', width: '30px', paddingBottom: '2px' }}>
                        <span>0</span>
                        <span>{Math.round(maxChurnValue / 2)}</span>
                        <span>{maxChurnValue}</span>
                      </div>

                      {/* Loop through each column indices explicitly */}
                      {monthsArray.map((monthName, idx) => {
                        const value = currentMonthlyData[idx];
                        const barHeightPct = (value / maxChurnValue) * 100;
                        
                        return (
                          <div key={idx} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                            <div 
                              style={{ 
                                width: '60%', 
                                minWidth: '15px', 
                                height: value > 0 ? `${Math.max(barHeightPct, 25)}%` : '0%', 
                                background: barColors[idx], 
                                borderRadius: '4px 4px 0 0',
                                transition: 'height 0.3s ease',
                                boxShadow: value > 0 ? `0 0 12px ${barColors[idx]}aa` : 'none',
                                zIndex: 10
                              }} 
                              title={`${monthName}: ${value} churned user records`}
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* X-Axis Months Column Grid Sizing */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', color: '#94a3b8', fontSize: '0.8rem', marginTop: '12px', fontWeight: '600', justifyItems: 'center' }}>
                      {monthsArray.map((m, idx) => (
                        <span key={idx} style={{ color: currentMonthlyData[idx] > 0 ? '#ffffff' : '#64748b', transition: 'color 0.2s' }}>{m}</span>
                      ))}
                    </div>

                  </div>
                </div>

                <div className="metric-card" style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', color: '#fff' }}>
                  <h3>📌 Dynamic User-Logged Churn Feedback</h3>
                  <div style={{ maxHeight: '180px', overflowY: 'auto', width: '100%', marginTop: '10px' }}>
                    <ul style={{ color: '#cbd5e1', lineHeight: '1.6', paddingLeft: '20px', margin: 0 }}>
                      {adminRecords
                        .filter(r => Number(r.churn_status) === 1 && r.top_reason)
                        .map((r, idx) => (
                          <li key={idx} style={{ marginBottom: '8px', fontSize: '0.85rem' }}>
                            💬 <strong style={{ color: '#ec4899' }}>{r.customer_name}:</strong> "{r.top_reason}"
                          </li>
                        ))
                      }
                      {adminRecords.filter(r => Number(r.churn_status) === 1).length === 0 && (
                        <li style={{ color: '#64748b', listStyleType: 'none', marginLeft: '-20px' }}>No user exit feedback logs recorded yet.</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Bottom Customer History Grid */}
              <section className="stream-section">
                <h2>👥 Customer Details (Showing all records)</h2>
                <div className="log-table-container">
                  <table className="log-table">
                    <thead><tr><th>ID</th><th>Customer Name</th><th>Churn Flag</th><th>Date Joined</th><th>Contact Details Handle</th><th>Date Left / Specified Reason</th></tr></thead>
                    <tbody>
                      {adminRecords.map((r, i) => (
                        <tr key={i} className={Number(r.churn_status) === 1 ? "row-fraud" : "row-safe"}>
                          <td><code>{r.customer_id}</code></td>
                          <td><strong>{r.customer_name}</strong></td>
                          <td>
                            {Number(r.churn_status) === 1 ? (
                              <span className="badge danger" style={{background: '#991b1b', color: '#fff', padding: '4px 8px', borderRadius: '4px'}}>CHURNED (1)</span>
                            ) : (
                              <span className="badge safe" style={{background: '#065f46', color: '#fff', padding: '4px 8px', borderRadius: '4px'}}>ACTIVE (0)</span>
                            )}
                          </td>
                          <td>{r.date_joined}</td>
                          <td>{r.email ? r.email : r.phone_no}</td>
                          {/* 🚀 DYNAMIC ROW DISPLAY: MAPS THE CUSTOMER'S ACTUAL INPUT TEXT DIRECTLY INTO THE DATABASE LOG GRID */}
                          <td>
                            {Number(r.churn_status) === 1 ? (
                              <div>
                                <span>🗓️ {r.date_left || '-'}</span>
                                <br />
                                <small style={{ color: '#f87171', fontStyle: 'italic', fontWeight: '500' }}>💬 Reason: "{r.top_reason || 'N/A'}"</small>
                              </div>
                            ) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}
        </div>
      )}

      {/* ================= MODE 2: CUSTOMER SUBSCRIPTION CONSOLE ================= */}
      {userSession.role === 'customer' && (
        <div className="tab-content animate-fade" style={{ marginTop: '25px' }}>
          <header className="dashboard-header" style={{ marginBottom: '25px' }}>
            <h1>🛒 Corporate Software E-Store Marketplace</h1>
            <p style={{ color: '#94a3b8' }}>Deploy workspace metrics and processing vectors straight to your container configurations.</p>
          </header>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '40px' }}>
            {shopProducts.map((p) => (
              <div key={p.id} style={{ background: '#1e293b', padding: '20px', borderRadius: '8px', border: '1px solid #334155', color: '#fff', display: 'flex', flexDirection: 'column', justifycontent: 'space-between' }}>
                <div><h3 style={{ margin: '0 0 10px 0', color: '#3b82f6' }}>{p.title}</h3><p style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>{p.desc}</p></div>
                <div style={{ display: 'flex', justifycontent: 'space-between', alignItems: 'center', marginTop: '15px' }}><span style={{ font_weight: 'bold', fontSize: '1.2rem', color: '#22c55e' }}>${p.price.toFixed(2)}</span><button onClick={() => alert("Added to system cart loop.")} style={{ padding: '6px 12px', background: '#2563eb', border: 'none', color: '#fff', border_radius: '4px', cursor: 'pointer' }}>Buy</button></div>
              </div>
            ))}
          </div>
          
          {/* ⚠️ THE USER EXIT REASON COMPONENT OPERATIONAL PANEL */}
          <section style={{ borderTop: '1px dashed #ef4444', paddingTop: '20px' }}>
            <div style={{ background: '#7f1d1d', padding: '25px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '15px', color: '#fff' }}>
              <div>
                <h3 style={{ margin: 0 }}><FiAlertTriangle /> Terminate Core Service Subscription Profile</h3>
                <p style={{ margin: '5px 0 0 0', color: '#fca5a5', fontSize: '0.85rem' }}>Deactivating shifts active metrics from 0 to 1 inside admin analytics telemetry modules.</p>
              </div>

              {/* 📝 NEW INPUT COMPONENT TO COLLECT DYNAMIC EXIT TEXT LOGS FROM THE USER */}
              <div style={{ width: '100%' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 'bold', color: '#fca5a5' }}>
                  <FiMessageSquare style={{ marginRight: '4px' }} /> Please let us know why you are leaving:
                </label>
                <input 
                  type="text" 
                  placeholder="Type your cancellation feedback here (e.g., Switching to competitor, pricing too high)..."
                  value={customReasonText}
                  onChange={(e) => setCustomReasonText(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    borderRadius: '6px', 
                    border: '1px solid #ef4444', 
                    background: '#0f172a', 
                    color: '#fff', 
                    boxSizing: 'border-box',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <button 
                onClick={handleTerminateAccount} 
                style={{ 
                  background: '#ef4444', 
                  border: 'none', 
                  color: '#fff', 
                  padding: '12px 20px', 
                  fontWeight: 'bold', 
                  borderRadius: '6px', 
                  cursor: 'pointer',
                  alignSelf: 'flex-end',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FiTrash2 /> Terminate Account Profile
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

const inputStyle = { width: '100%', padding: '12px', borderRadius: '4px', border: '1px solid #475569', background: '#0f172a', color: '#fff', boxSizing: 'border-box' };
const buttonStyle = { padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' };

export default App;
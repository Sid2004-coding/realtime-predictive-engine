from fastapi import FastAPI, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import xgboost as xgb
import numpy as np
import datetime
import os
import pymysql
import json
import asyncio
import uuid
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# --- CONFIGURATION KEYS ---
SMTP_SERVER = "smtp.gmail.com"          # Or your preferred provider / Mailtrap relay node
SMTP_PORT = 587
ADMIN_EMAIL = "sidharthever123@gmail.com" 
ADMIN_PASSWORD = "mbwthowmycffniwm"    # Use an App Password, not your master login password

app = FastAPI(title="Unified E-Shop Gateway & Risk Analytics Control Center")

origins = [
    "http://43.205.233.136:3000",  # Your production frontend URL
    "http://localhost:3000",       # Local development
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,         # Allow our explicit frontend URLs
    allow_credentials=True,
    allow_methods=["*"],           # Allow all HTTP actions (POST, GET, etc.)
    allow_headers=["*"],           # Allow all headers
)

# --- REQUEST SCHEMAS ---
class RegisterRequest(BaseModel):
    name: str
    email: str
    phone_no: str
    password: str
    user_lat: float  # Captured silently by frontend browser location API
    user_long: float # Captured silently by frontend browser location API

class LoginRequest(BaseModel):
    username_or_id: str  # Allows logging in via Name, Email, or Customer ID
    password: str

class DeleteAccountRequest(BaseModel):
    customer_id: str
    reason: str

DB_SETTINGS = {
    "host": "host.docker.internal" if os.path.exists('/.dockerenv') else "127.0.0.1",
    "user": "root",
    "password": "Kumar@123",
    "database": "fraud_detection_db",
    "port": 3306
}

model = None

@app.on_event("startup")
def load_trained_model():
    global model
    model_path = "my_fraud_model.json"
    if os.path.exists(model_path):
        model = xgb.XGBClassifier()
        model.load_model(model_path)
        print("🚀 SUCCESS: Fraud security engine initialized successfully!")
    else:
        print(f"❌ ERROR: Could not find '{model_path}'. Check model location.")

# --- DATABASE SETUP INTEGRATOR ---
@app.on_event("startup")
def verify_and_build_tables():
    """Ensures our consolidated database tables match our multi-role design layout."""
    try:
        connection = pymysql.connect(**DB_SETTINGS)
        with connection.cursor() as cursor:
            # 1. Update customers table to support password verification tracking
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS customers (
                customer_id VARCHAR(50) PRIMARY KEY,
                customer_name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE,
                phone_no VARCHAR(20),
                password_hash VARCHAR(255) NOT NULL,
                date_joined DATE NOT NULL,
                associated_transaction_id INT
            );
            """)
            # 2. Re-verify Churn table relationship structure
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS customer_churn_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_id VARCHAR(50) NOT NULL,
                churn_status TINYINT NOT NULL DEFAULT 0,
                date_left DATE DEFAULT NULL,
                top_reason VARCHAR(255) DEFAULT NULL,
                predicted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE
            );
            """)
        connection.commit()
        connection.close()
        print("🗄️ Database tables verified and linked cleanly.")
    except Exception as e:
        print(f"⚠️ Initial schema construction failed: {str(e)}")

# --- ENDPOINTS ---

@app.post("/register")
async def register_user(data: RegisterRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Security subsystem offline.")

    # 1. Background capture of Gateway node processing locations automatically
    GATEWAY_LAT, GATEWAY_LONG = 20.2961, 85.8245  # Server hosting node anchors
    distance = np.sqrt((data.user_lat - GATEWAY_LAT)**2 + (data.user_long - GATEWAY_LONG)**2)
    
    # Mock parameters used matching the underlying XGBoost feature array map
    MOCK_AMOUNT = 10.00 # Nominal background transaction handshake verification check
    MOCK_POPULATION = 1500000
    current_hour = datetime.datetime.now().hour
    
    features = np.array([[MOCK_AMOUNT, current_hour, MOCK_POPULATION, distance]])
    probabilities = model.predict_proba(features)[0]
    fraud_chance = float(probabilities[1])
    is_fraud_flag = 1 if fraud_chance > 0.01 else 0  # Testing threshold filter

    # 2. Write to Transaction Logs Database
    connection = pymysql.connect(**DB_SETTINGS)
    try:
        with connection.cursor() as cursor:
            sql_tx = """
            INSERT INTO transaction_logs (amount, city_population, distance_calculated, fraud_probability, is_fraud_flag)
            VALUES (%s, %s, %s, %s, %s)
            """
            cursor.execute(sql_tx, (MOCK_AMOUNT, MOCK_POPULATION, float(distance), round(fraud_chance, 4), is_fraud_flag))
            tx_id = cursor.lastrowid
            
            # 3. Security Firewall evaluation Gate
            if is_fraud_flag == 1:
                connection.commit()
                raise HTTPException(status_code=403, detail="Security validation failed. Rogue signature caught.")
            
            # 4. Success: Provision account profile and generate permanent Customer ID
            generated_id = f"CUST-{uuid.uuid4().hex[:6].upper()}"
            sql_cust = """
            INSERT INTO customers (customer_id, customer_name, email, phone_no, password_hash, date_joined, associated_transaction_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(sql_cust, (generated_id, data.name, data.email, data.phone_no, data.password, datetime.date.today(), tx_id))
            
            # 5. Initialize active status in Churn monitoring logs
            sql_churn = """
            INSERT INTO customer_churn_logs (customer_id, churn_status, date_left, top_reason)
            VALUES (%s, 0, NULL, NULL)
            """
            cursor.execute(sql_churn, (generated_id,))
            
        connection.commit()
        return {"status": "success", "customer_id": generated_id, "message": "Verification clean. Account created!"}
    
    except pymysql.err.IntegrityError:
        raise HTTPException(status_code=400, detail="Email profile address is already registered.")
    finally:
        connection.close()

@app.post("/login")
async def login_user(data: LoginRequest):
    if data.username_or_id.lower() == "admin" and data.password == "admin123":
        return {"status": "success", "role": "admin", "name": "System Administrator"}

    connection = pymysql.connect(**DB_SETTINGS)
    try:
        with connection.cursor(pymysql.cursors.DictCursor) as cursor:
            sql = """
            SELECT customer_id, customer_name, password_hash FROM customers 
            WHERE customer_id = %s OR email = %s
            """
            cursor.execute(sql, (data.username_or_id, data.username_or_id))
            user = cursor.fetchone()
            
            if not user or user['password_hash'] != data.password:
                raise HTTPException(status_code=401, detail="Invalid account ID, email, or security key password.")
            
            # Check if this user has previously deleted their account (is churned)
            cursor.execute("SELECT churn_status FROM customer_churn_logs WHERE customer_id = %s", (user['customer_id'],))
            churn_check = cursor.fetchone()
            if churn_check and churn_check['churn_status'] == 1:
                raise HTTPException(status_code=403, detail="Account deactivated. Please contact support to reactivate.")

            return {"status": "success", "role": "customer", "customer_id": user['customer_id'], "name": user['customer_name']}
    finally:
        connection.close()

@app.post("/delete-account")
def delete_customer_account(payload: DeleteAccountRequest):
    connection = pymysql.connect(**DB_SETTINGS)
    try:
        with connection.cursor(pymysql.cursors.DictCursor) as cursor:
            # 1. Look up user context parameters from active database
            cursor.execute("SELECT customer_name, email FROM customers WHERE customer_id = %s", (payload.customer_id,))
            user = cursor.fetchone()
            
            if not user:
                raise HTTPException(status_code=404, detail="Customer target context node not found.")
                
            current_date = datetime.date.today().strftime("%Y-%m-%d")
            
            # 2. Update status records in customer_churn_logs table
            cursor.execute("""
                UPDATE customer_churn_logs 
                SET churn_status = 1, date_left = %s, top_reason = %s 
                WHERE customer_id = %s
            """, (current_date, payload.reason, payload.customer_id))
            
            # 3. ✉️ DISPATCH RECOVERY EMAIL TO CUSTOMER'S ACTUAL MAILBOX
            if user['email'] and "@" in user['email']:
                try:
                    msg = MIMEMultipart()
                    msg['From'] = ADMIN_EMAIL
                    msg['To'] = user['email']
                    msg['Subject'] = f"Subscription Termination Confirmation - {user['customer_name']}"
                    
                    email_body = f"Hello {user['customer_name']},\n\nWe are sorry you are leaving our app, but next time we will look into your issue and improve our website experience.\n\nThank you for your feedback.\n\nBest regards,\nSystem Administration Team"
                    msg.attach(MIMEText(email_body, 'plain'))
                    
                    server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
                    server.starttls()
                    server.login(ADMIN_EMAIL, ADMIN_PASSWORD)
                    server.sendmail(ADMIN_EMAIL, user['email'], msg.as_string())
                    server.quit()
                except Exception as mail_err:
                    print(f"⚠️ Email notification background delivery skipped/failed: {str(mail_err)}")

        connection.commit()
        return {"status": "success", "detail": "Account compiled to churn logs and confirmation email sent."}
        
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Database network processing dispatch error: {str(e)}")
    finally:
        connection.close()

@app.get("/admin/analytics")
async def get_admin_dashboard_metrics():
    """Fetches real-time structured data to populate Admin dashboard tables and annual leave bar graphs."""
    connection = pymysql.connect(**DB_SETTINGS)
    try:
        with connection.cursor(pymysql.cursors.DictCursor) as cursor:
            sql = """
            SELECT c.customer_id, c.customer_name, c.email, c.phone_no, c.date_joined, 
                   ch.churn_status, ch.date_left, ch.top_reason 
            FROM customers c
            JOIN customer_churn_logs ch ON c.customer_id = ch.customer_id
            ORDER BY c.date_joined DESC
            """
            cursor.execute(sql)
            records = cursor.fetchall()
            return records
    finally:
        connection.close()

@app.get("/products")
async def get_shop_mock_products():
    """Provides items to render inside your upcoming customer dashboard products page view."""
    return [
        {"id": 101, "title": "🔒 Smart Security Node Token", "price": 49.99, "desc": "Hardware authentication vector module."},
        {"id": 102, "title": "⚡ Real-Time Stream Processor Pack", "price": 120.50, "desc": "Sub-millisecond data routing framework layer."},
        {"id": 103, "title": "🤖 XGBoost Tree Optimization Toolkit", "price": 15.00, "desc": "Advanced tuning utility presets."}
    ]
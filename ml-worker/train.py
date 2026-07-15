import os
import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split

def train_our_model():
    csv_path="data/fraudTrain.csv"

    if not os.path.exists(csv_path):
        print("CSV file not found.")
        return

    # Load the dataset
    print("⏳ Reading fraudTrain.csv... (This takes a few seconds because the file is huge)")
    df=pd.read_csv(csv_path,nrows=300000)
    print(f"📊 Successfully loaded {len(df)} rows of transaction data!")

    # Preprocess the data
    print("⚙️ Preparing data columns...")

    # Extract the hour of the day (0 to 23) from the transaction date/time string
    df['trans_date_trans_time'] = pd.to_datetime(df['trans_date_trans_time'])
    df['trans_hour']=df['trans_date_trans_time'].dt.hour

    # Calculate physical distance between the customer and the store
    df['distance_to_merchant']=np.sqrt(
        (df['lat']-df['merch_lat'])**2 + (df['long']-df['merch_long'])**2
    )
    # These are the 4 real-world numbers the AI will look at to determine fraud
    feature_columns = ['amt', 'trans_hour', 'city_pop', 'distance_to_merchant']
    X = df[feature_columns]
    y = df['is_fraud']  # 0 means regular purchase, 1 means fraud

    # Split the data: 80% to train the brain, 20% to check if it actually learned correctly
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # 4. Initialize and Train the XGBoost AI model on your CPU
    print("🚀 Training the XGBoost AI Model on your CPU... Please wait...")
    model = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1,
        tree_method='hist', # Tells XGBoost to run fast on a standard CPU
        random_state=42
    )

    # Start the actual learning process
    model.fit(X_train, y_train)
    print("✨ The model has finished training and learning from the data!")

    # 5. Save the trained brain to a file
    model_output_path = "my_fraud_model.json"
    model.save_model(model_output_path)
    print(f"💾 SUCCESS: Model brain saved as '{model_output_path}'!")

if __name__ == "__main__":
    train_our_model()

import os
import json
import logging
from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score

# Configure logger for pipeline
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DataPreprocessor:
    """Handles all data cleaning and feature engineering."""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.features = config.get("features", [])
        
    def clean_data(self, df: pd.DataFrame) -> pd.DataFrame:
        logger.info(f"Cleaning dataframe with {len(df)} rows")
        # Remove nulls
        df = df.dropna()
        # Normalization logic here
        return df

    def extract_features(self, df: pd.DataFrame) -> np.ndarray:
        logger.info("Extracting features from the dataframe...")
        return df[self.features].values

class ModelPipeline:
    def __init__(self, model_path: str):
        self.model_path = model_path
        self.model = RandomForestClassifier(n_estimators=100)
        
    def train(self, X: np.ndarray, y: np.ndarray) -> float:
        logger.info("Splitting dataset...")
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
        
        logger.info("Training random forest classifier...")
        self.model.fit(X_train, y_train)
        
        preds = self.model.predict(X_test)
        acc = accuracy_score(y_test, preds)
        logger.info(f"Model trained. Accuracy: {acc}")
        return acc
        
    def save(self):
        # TODO: Implement model saving using joblib
        logger.info(f"Saving model to {self.model_path}")
        pass

def main():
    print("Starting ML Pipeline execution")
    # Just a dummy execution
    config = {"features": ["age", "income", "score"]}
    preprocessor = DataPreprocessor(config)
    pipeline = ModelPipeline("/models/rf_v1.pkl")
    
if __name__ == "__main__":
    main()

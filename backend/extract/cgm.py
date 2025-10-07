
from sqlalchemy import create_engine, Column, String, Float,Integer
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.schema import PrimaryKeyConstraint
import pandas as pd
import os

# Define the SQLAlchemy base and table schema
Base = declarative_base()


class CGMData(Base):
    __tablename__ = 'cgm_data'

    pid = Column(String(50), nullable=False)  # Specify length
    timepoint = Column(String(50), nullable=False)  # Specify length
    device_timestamp = Column(String(50), nullable=False)  # Specify length
    device = Column(String(100))
    serial_number = Column(String(100))
    record_type = Column(Integer)
    historic_glucose_mg_dl = Column(Float)

    # Define the composite primary key
    __table_args__ = (
        PrimaryKeyConstraint('pid', 'timepoint', 'device_timestamp', name='cgm_data_pk'),
    )

class CGMDatabaseClient:
    def __init__(self):
        # Hardcoded database URL for SQL Server
        self.db_url = self.db_url = "mysql+mysqlconnector://root:root@localhost:3306/workwell"
        self.engine = create_engine(self.db_url)
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)

    def load_data(self, csv_directory):
        session = self.Session()

        # Iterate over all CSV files in the directory
        for filename in os.listdir(csv_directory):
            if filename.endswith(".csv"):
                # Extract pid and timepoint from the filename
                file_parts = filename.split('_')
                pid = file_parts[0]
                timepoint = file_parts[1]

                # Load the CSV file, skipping the first two rows
                file_path = os.path.join(csv_directory, filename)
                data = pd.read_csv(file_path, skiprows=2)

                # Iterate over the DataFrame and add each row to the database
                for _, row in data.iterrows():
                    record = CGMData(
                        pid=pid,
                        timepoint=timepoint,
                        device_timestamp=row['Device Timestamp'],
                        device=row['Device'],
                        serial_number=row['Serial Number'],
                        record_type=row['Record Type'],
                        historic_glucose_mg_dl=row['Historic Glucose mg/dL']
                    )
                    session.add(record)

                session.commit()

        session.close()

# Example usage
client = CGMDatabaseClient()
client.load_data('/Users/harshanand/Downloads/ASUResearch/workwell/CGM/Baseline')


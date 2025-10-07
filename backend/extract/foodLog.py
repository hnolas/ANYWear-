import pandas as pd
from sqlalchemy import create_engine
import openpyxl as px

excel_file = '/Users/harshanand/Downloads/combined (Glycemic Load added).xlsx'

# Establish a connection to the database
engine = create_engine('mysql+mysqlconnector://root:root@localhost:3306/workwell')  # Replace with your DB credentials

# Load all sheet names, excluding the last one
sheets = pd.ExcelFile(excel_file).sheet_names[:-1]  # Exclude the last sheet

def clean_numeric_column(series):
    return pd.to_numeric(series.astype(str).str.strip().replace('', '0'), errors='coerce').fillna(0)

# Iterate over each sheet
for sheet in sheets:
    # Extract participant ID from the sheet name
    pid = sheet

    # Load the sheet data
    df = pd.read_excel(excel_file, sheet_name=sheet)

    # Handle columns: Date, Day, Time, and others
    df['date'] = pd.to_datetime(df.get('Date', pd.Series([None] * len(df))), errors='coerce').dt.date
    df['day'] = df.get('Day', pd.Series([None] * len(df)))
    df['time'] = pd.to_datetime(df.get('Time', pd.Series([None] * len(df))), errors='coerce').dt.time

    # Create timestamp only if both date and time are valid, format to 'YYYY-MM-DD HH:MM'
    df['timestamp'] = df.apply(
        lambda row: pd.to_datetime(f"{row['Date']} {row['Time']}")
                    if pd.notna(row['Date']) and pd.notna(row['Time']) else None, axis=1)

    df['cgm_auc'] = clean_numeric_column(df.get('CGM AUC'))
    df['meal_comment'] = df.get('Meal Comment', pd.Series([None] * len(df)))
    df['foods'] = df.get('Foods, amounts, preparation', pd.Series([None] * len(df)))
    df['raw_data'] = df.get('Raw Data', pd.Series([None] * len(df)))
    df['leftover'] = df.get('How much of the food/drink was lftover?', pd.Series([None] * len(df)))
    df['comments'] = df.get('Comments', pd.Series([None] * len(df)))
    df['reviewer_notes'] = df.get('Reviewer Notes', pd.Series([None] * len(df)))
    df['serving_size'] = df.get('Serving Size', pd.Series([None] * len(df)))
    df['weight_g'] = clean_numeric_column(df.get('Weight (g)'))
    df['calories'] = clean_numeric_column(df.get('Calories'))
    df['calories_from_fat'] = clean_numeric_column(df.get('Calories From Fat'))
    df['total_fat_g'] = clean_numeric_column(df.get('Total Fat (g)'))
    df['saturated_fat_g'] = clean_numeric_column(df.get('Saturated Fat (g)'))
    df['trans_fat_g'] = clean_numeric_column(df.get('Trans Fat (g)'))
    df['cholesterol_mg'] = clean_numeric_column(df.get('Cholesterol (mg)'))
    df['sodium_mg'] = clean_numeric_column(df.get('Sodium (mg)'))
    df['total_carbs_g'] = clean_numeric_column(df.get('Total Carbs (g)'))
    df['fiber_g'] = clean_numeric_column(df.get('Fiber (g)'))
    df['sugars_g'] = clean_numeric_column(df.get('Sugars (g)'))
    df['net_carbs_g'] = clean_numeric_column(df.get('Net Carbs(g)'))
    df['protein_g'] = clean_numeric_column(df.get('Protein (g)'))
    df['monounsaturated_fat_g'] = clean_numeric_column(df.get('Monounsaturated Fat (g)'))
    df['polyunsaturated_fat_g'] = clean_numeric_column(df.get('Polyunsaturated Fat (g)'))
    df['source'] = df.get('Source', pd.Series([None] * len(df)))
    df['glycemic_load'] = clean_numeric_column(df.get('GL'))

    # Add pid to each row
    df['pid'] = pid
    df['timepoint'] = df.get('Timepoint', pd.Series([None] * len(df))).replace({'BL': 'Baseline'})  # Adjust mapping as needed

    # Arrange columns according to the SQL schema
    relevant_columns = [
        'pid', 'timepoint', 'date', 'day', 'time', 'timestamp', 'cgm_auc', 'meal_comment', 'foods', 'raw_data', 'leftover',
        'comments', 'reviewer_notes', 'serving_size', 'weight_g', 'calories', 'calories_from_fat',
        'total_fat_g', 'saturated_fat_g', 'trans_fat_g', 'cholesterol_mg', 'sodium_mg',
        'total_carbs_g', 'fiber_g', 'sugars_g', 'net_carbs_g', 'protein_g', 'monounsaturated_fat_g',
        'polyunsaturated_fat_g', 'source', 'glycemic_load'
    ]

    df = df[relevant_columns]

    # Insert the data into the 'dietary_data' table in the database
    df.to_sql('dietary_data', con=engine, if_exists='append', index=False)

print("Data parsed and inserted into the database successfully.")

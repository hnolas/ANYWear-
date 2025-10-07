# Streamlit app

import streamlit as st
import pandas as pd
from pymongo import MongoClient
import altair as alt
from dateutil import parser

# Connect to MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['accelerometer_data']
collection = db['ukb_summary']

# Load data
@st.cache_data
def load_data():
    data = list(collection.find({}, {'_id': 0}))  # Excluding the MongoDB ID from the data
    df = pd.json_normalize(data, sep='_')  # Flatten the 'data' node
    df['data_file-size'] = df['data_file-size'].apply(lambda x: x / (1024 ** 2))  # Convert file size to MB

    # Extract timezone and clean datetime fields
    def extract_timezone(dt):
        return dt.split('[')[-1].strip(']')

    def clean_datetime(dt):
        clean_dt = dt.split('+')[0].strip()  # Remove the timezone offset
        return parser.parse(clean_dt)

    df['timezone'] = df['data_file-startTime'].apply(extract_timezone)
    df['data_file-startTime'] = df['data_file-startTime'].apply(clean_datetime).dt.strftime('%Y-%m-%d %H:%M:%S')
    df['data_file-endTime'] = df['data_file-endTime'].apply(clean_datetime).dt.strftime('%Y-%m-%d %H:%M:%S')

    return df

df = load_data()

# Function to convert column names for table display
def format_column_name(name):
    name = name.replace('data_', '')  # Remove 'data_' prefix
    name = ' '.join(name.split('_')).title()  # Split by underscore, capitalize and add spaces
    return name

# Preparing DataFrame for display with formatted column names
columns_for_display = ['participant_id', 'date', 'data_totalReads', 'data_file-size', 'data_file-deviceID',
                       'timezone', 'data_file-startTime', 'data_file-endTime', 'data_quality-daylightSavingsCrossover']
formatted_columns = {col: format_column_name(col) for col in columns_for_display}
df_display = df[columns_for_display].rename(columns=formatted_columns)


# Custom CSS for styling
st.markdown("""
<style>
.card {
    margin: 10px 10px 20px 10px;  # Added bottom margin
    padding: 20px;
    background: linear-gradient(135deg, #6e48aa, #9d50bb);
    color: #fff;
    border-radius: 15px;
    box-shadow: 0px 4px 20px rgba(0,0,0,0.25);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
}
.card h1 {
    font-size: 3rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
}
.card p {
    font-size: 1.5rem;
    margin-top: 0;
    opacity: 0.85;
}
body {
    background-color: #333;
}
.dataframe-container {
    overflow-x: auto;
    width: 100%;
    height: 500px;
}
.dataframe-container table {
    width: 100%;
    height: 100%;
    border-collapse: collapse;
}
.dataframe-container th, .dataframe-container td {
    padding: 8px;
    text-align: left;
}
.dataframe-container th {
    background-color: #444;
    color: #fff;
}
.dataframe-container tr:nth-child(even) {
    background-color: #333;
}
</style>
""", unsafe_allow_html=True)
st.title('Quality Control Dashboard')

st.markdown('##')
# Displaying metrics in cards using columns
col1, col2, col3, col4 = st.columns(4)
with col1:
    st.markdown(f'<div class="card"><h1 class="big-font">{df.shape[0]}</h1><p>Total Files Processed</p></div>', unsafe_allow_html=True)
with col2:
    average_wear_time = df['data_wearTime-overall(days)'].mean()
    st.markdown(f'<div class="card"><h1 class="big-font">{average_wear_time:.2f} days</h1><p>Average Wear Time</p></div>', unsafe_allow_html=True)
with col3:
    good_calibration_count = df[df['data_quality-goodCalibration'] == 1].shape[0]
    st.markdown(f'<div class="card"><h1 class="big-font">{good_calibration_count}</h1><p>Participants with Good Calibration</p></div>', unsafe_allow_html=True)
with col4:
    average_nonwear_time = df['data_nonWearTime-overall(days)'].mean()
    st.markdown(f'<div class="card"><h1 class="big-font">{average_nonwear_time:.2f} days</h1><p>Average Non-Wear Time</p></div>', unsafe_allow_html=True)

st.markdown('##')
st.subheader('overall Weartime Vs Non-Wear Time')
st.markdown('##')
# Altair chart for visualizing wear and non-wear times
if 'participant_id' in df.columns and 'data_wearTime-overall(days)' in df.columns and 'data_nonWearTime-overall(days)' in df.columns:
    melted_df = df.melt(id_vars=['participant_id'],
                        value_vars=['data_wearTime-overall(days)', 'data_nonWearTime-overall(days)'],
                        var_name='Type', value_name='Days')
    chart = alt.Chart(melted_df).mark_bar().encode(
        x='participant_id:N',
        y='Days:Q',
        color='Type:N',
        tooltip=['participant_id', 'Days']
    ).properties(
        width='container',  # Adjusts width based on the container's width
        height=400  # Adjusted height
    ).configure_view(
        strokeWidth=0,  # Removes border around the chart
        continuousWidth=100  # Increases width for more breathing room
    )
    st.altair_chart(chart, use_container_width=True)  # Ensure chart uses the container width
else:
    st.error("Required columns are missing in the DataFrame!")


# Display the file metadata table at the end
st.subheader(' File Metadata')
st.markdown("##")
st.markdown('<div class="dataframe-container">' + df_display.to_html(index=False, escape=False) + '</div>', unsafe_allow_html=True)

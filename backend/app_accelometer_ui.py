# Streamlit app

import streamlit as st
import pandas as pd
from pymongo import MongoClient
import altair as alt
from st_aggrid import AgGrid
from dateutil import parser
import plotly.graph_objects as go

# Set page configuration to wide mode
st.set_page_config(layout="wide")
# Connect to MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['accelerometer_data']
collection_summary = db['ukb_summary']
collection_participant = db['ggir_results']  # Assuming this collection contains the participant-level data


# Load data
@st.cache(allow_output_mutation=True)
def load_data():
    data = list(collection_summary.find({}, {'_id': 0}))  # Excluding the MongoDB ID from the data
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
</style>
""", unsafe_allow_html=True)

# Creating a sidebar for page navigation
st.sidebar.title("Navigation")
page = st.sidebar.radio("Go to", ["Overview", "Participant Dashboard"])


if page == "Overview":
    # Displaying metrics in cards using columns
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.markdown(f'<div class="card"><h1 class="big-font">{df.shape[0]}</h1><p>Total Files Processed</p></div>',
                    unsafe_allow_html=True)
    with col2:
        average_wear_time = df['data_wearTime-overall(days)'].mean()
        st.markdown(
            f'<div class="card"><h1 class="big-font">{average_wear_time:.2f} days</h1><p>Average Wear Time</p></div>',
            unsafe_allow_html=True)
    with col3:
        good_calibration_count = df[df['data_quality-goodCalibration'] == 1].shape[0]
        st.markdown(
            f'<div class="card"><h1 class="big-font">{good_calibration_count}</h1><p>Participants with Good Calibration</p></div>',
            unsafe_allow_html=True)
    with col4:
        average_nonwear_time = df['data_nonWearTime-overall(days)'].mean()
        st.markdown(
            f'<div class="card"><h1 class="big-font">{average_nonwear_time:.2f} days</h1><p>Average Non-Wear Time</p></div>',
            unsafe_allow_html=True)

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
    st.markdown('##')
    st.markdown("### File Metadata")
    st.dataframe(df_display, height=600)

elif page == "Participant Dashboard":
    # Participant Dashboard
    st.title("Participant Dashboard")

    # Load participant IDs
    participant_ids = df['participant_id'].unique()

    # Dropdown for selecting participant ID
    selected_pid = st.selectbox("Select Participant ID", participant_ids)

    # Function to load participant-specific data
    @st.cache(allow_output_mutation=True)
    def load_participant_data(pid):
        data = list(collection_participant.find({'_id': pid}, {'_id': 0, 'data': 1, 'calendar_date': 1}))
        if data:
            participant_df = pd.DataFrame(data[0]['data'])
            participant_df = participant_df.drop_duplicates()
            return participant_df
        else:
            return pd.DataFrame()

    participant_df = load_participant_data(selected_pid)

    if not participant_df.empty:
        st.markdown(f"### Participant ID: {selected_pid}")

        # Displaying participant-level cards
        col1, col2, col3, col4, col5 = st.columns(5)
        with col1:
            avg_wear_time_perc = participant_df['nonwear_perc_day_spt'].mean()
            st.markdown(f'<div class="card"><h1 class="big-font">{avg_wear_time_perc:.2f}%</h1><p>Avg Wear Time Percentage</p></div>', unsafe_allow_html=True)
        with col2:
            avg_sedentary_time = participant_df['dur_day_total_IN_min'].mean()
            st.markdown(f'<div class="card"><h1 class="big-font">{avg_sedentary_time:.2f}</h1><p>Avg Sedentary Time (min)</p></div>', unsafe_allow_html=True)
        with col3:
            avg_light_activity = participant_df['dur_day_total_LIG_min'].mean()
            st.markdown(f'<div class="card"><h1 class="big-font">{avg_light_activity:.2f}</h1><p>Avg Light Activity (min)</p></div>', unsafe_allow_html=True)
        with col4:
            avg_moderate_activity = participant_df['dur_day_total_MOD_min'].mean()
            st.markdown(f'<div class="card"><h1 class="big-font">{avg_moderate_activity:.2f}</h1><p>Avg Moderate Activity (min)</p></div>', unsafe_allow_html=True)
        with col5:
            avg_hours_sleep = participant_df['dur_spt_min'].mean() / 60  # Convert to hours
            st.markdown(f'<div class="card"><h1 class="big-font">{avg_hours_sleep:.2f}</h1><p>Avg Hours of Sleep</p></div>', unsafe_allow_html=True)

        # Charts and further data display
        st.markdown('##')

        # Daily Sedentary, Light, Moderate, and Vigorous Activity (Stacked Bar Chart)
        activity_cols = ['dur_day_total_IN_min', 'dur_day_total_LIG_min', 'dur_day_total_MOD_min', 'dur_day_total_VIG_min']
        activity_labels = ['Inactivity', 'Light Activity', 'Moderate Activity', 'Vigorous Activity']
        participant_df['Date'] = pd.to_datetime(participant_df['calendar_date'])
        activity_df = participant_df[['Date'] + activity_cols].melt(id_vars=['Date'], value_vars=activity_cols, var_name='Activity', value_name='Minutes')
        activity_chart = alt.Chart(activity_df).mark_bar().encode(
            x='Date:T',
            y=alt.Y('Minutes:Q', stack='zero'),
            color=alt.Color('Activity:N', scale=alt.Scale(domain=activity_cols, range=['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728']), legend=alt.Legend(title="Activity Type")),
            tooltip=['Date:T', 'Activity:N', 'Minutes:Q']
        ).properties(
            width='container',
            height=400,
            title='Daily Sedentary, Light, Moderate, and Vigorous Activity'
        )
        st.altair_chart(activity_chart, use_container_width=True)

        # Daily Sleep and Wake Time
        # Replace missing or invalid times with a default time
        participant_df['sleeponset_ts'] = pd.to_datetime(participant_df['sleeponset_ts'], format='%H:%M:%S',
                                                         errors='coerce').dt.time.fillna(
            pd.to_datetime('00:00:00').time())
        participant_df['wakeup_ts'] = pd.to_datetime(participant_df['wakeup_ts'], format='%H:%M:%S',
                                                     errors='coerce').dt.time.fillna(pd.to_datetime('00:00:00').time())


        # Function to combine date and time
        def combine_date_time(date, time):
            return pd.to_datetime(date.astype(str) + ' ' + time.astype(str), errors='coerce')


        # Combine date with sleep onset and wakeup times
        participant_df['SleepOnset'] = combine_date_time(participant_df['Date'], participant_df['sleeponset_ts'])
        participant_df['Wakeup'] = combine_date_time(participant_df['Date'], participant_df['wakeup_ts'])

        # Create the candlestick chart
        fig = go.Figure(data=[go.Candlestick(
            x=participant_df['Date'],
            open=participant_df['SleepOnset'],
            close=participant_df['Wakeup'],
            high=participant_df['Wakeup'],
            low=participant_df['SleepOnset'],
            increasing_line_color='blue', decreasing_line_color='red',
            showlegend=False
        )])

        # Update layout
        fig.update_layout(
            title="Daily Sleep and Wake Times",
            xaxis_title="Date",
            yaxis_title="Time",
            yaxis=dict(
                tickformat='%H:%M',
                type='date',
                dtick='D1',
                tick0='00:00:00',
                tickvals=[f"{hour:02d}:00" for hour in range(24)]
            ),
            height=600,
            showlegend=False
        )

        # Show plot
        st.plotly_chart(fig, use_container_width=True)

        # Daily Sleep Efficiency Trends
        sleep_efficiency_chart = alt.Chart(participant_df).mark_line(point=True).encode(
            x='Date:T',
            y='sleep_efficiency:Q',
            tooltip=['Date:T', 'sleep_efficiency:Q']
        ).properties(
            width='container',
            height=400,
            title='Daily Sleep Efficiency Trends'
        )
        st.altair_chart(sleep_efficiency_chart, use_container_width=True)

        # Daily Wear and Non-Wear Time Trends
        wear_nonwear_cols = [col for col in participant_df.columns if 'wearTime' in col or 'nonWearTime' in col]
        if wear_nonwear_cols:
            wear_nonwear_df = participant_df[['Date'] + wear_nonwear_cols].melt(id_vars=['Date'], var_name='Type', value_name='Hours')
            wear_nonwear_chart = alt.Chart(wear_nonwear_df).mark_line(point=True).encode(
                x='Date:T',
                y='Hours:Q',
                color='Type:N',
                tooltip=['Date:T', 'Type:N', 'Hours:Q']
            ).properties(
                width='container',
                height=400,
                title='Daily Wear and Non-Wear Time Trends'
            )
            st.altair_chart(wear_nonwear_chart, use_container_width=True)
    else:
        st.warning(f"No data found for Participant ID: {selected_pid}")

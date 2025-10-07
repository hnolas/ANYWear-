import pandas as pd
from datetime import timedelta


def generate_shifted_csv(input_filepath, output_filepath='sleep_activity_shifted.csv'):
    """
    Creates a new CSV file that properly aligns last night's sleep with today's activity.

    Parameters:
    -----------
    input_filepath : str
        Path to the original CSV file containing sleep and activity data
    output_filepath : str
        Path where the new shifted CSV file will be saved
    """
    # Load the data
    print(f"Loading data from {input_filepath}...")
    df = pd.read_csv(input_filepath)

    # Convert date strings to datetime objects
    df['api_date_sleep'] = pd.to_datetime(df['api_date_sleep'], format='%m/%d/%y %H:%M')
    df['readable_date'] = pd.to_datetime(df['readable_date'], format='%m/%d/%y')
    df['start_time'] = pd.to_datetime(df['start_time'], format='%m/%d/%y %H:%M')

    # Extract just the date portion (no time)
    df['sleep_date'] = df['api_date_sleep'].dt.date
    df['activity_date'] = df['readable_date'].dt.date

    # Step 1: Create separate dataframes for sleep and activity data
    sleep_columns = [
        'participant_id', 'sleep_date', 'is_main_sleep', 'minutes_to_fall_asleep',
        'minutes_awake', 'minutes_asleep', 'minutes_after_wakeup', 'time_in_bed',
        'efficiency', 'deep_minutes', 'light_minutes', 'rem_minutes', 'wake_minutes',
        'deep_count', 'light_count', 'rem_count', 'wake_count',
        'sol_from_stages', 'waso_dur_from_stages', 'waso_cnt_from_stages', 'snooze_from_stages'
    ]

    activity_columns = [
        'participant_id', 'activity_date', 'steps', 'sedentary_mins',
        'lightly_active_mins', 'fairly_active_mins', 'very_active_mins',
        'total_dist', 'sedentary_dist', 'lightly_active_dist',
        'moderately_active_dist', 'very_active_dist'
    ]

    sleep_data = df[sleep_columns].copy()
    activity_data = df[activity_columns].copy()

    # Step 2: Calculate the "next day" for each sleep record
    # This is the key step - we're shifting the sleep data forward by one day
    # so we can match "last night's sleep" with "today's activity"
    sleep_data['next_day'] = sleep_data['sleep_date'].apply(lambda x: x + timedelta(days=1))

    # Step 3: Merge sleep data with the NEXT day's activity data
    print("Merging sleep data with next day's activity data...")
    shifted_df = pd.merge(
        sleep_data,
        activity_data,
        left_on=['participant_id', 'next_day'],
        right_on=['participant_id', 'activity_date'],
        how='inner'  # Only keep rows where we have both sleep and next day's activity
    )

    # Step 4: Clean up the final dataframe and rename columns for clarity
    shifted_df = shifted_df.drop(['next_day'], axis=1)
    shifted_df = shifted_df.rename(columns={
        'sleep_date': 'night_of_sleep',
        'activity_date': 'day_of_activity'
    })

    # Add some helpful columns
    shifted_df['active_minutes_total'] = (
            shifted_df['lightly_active_mins'] +
            shifted_df['fairly_active_mins'] +
            shifted_df['very_active_mins']
    )

    # Sort by participant and date
    shifted_df = shifted_df.sort_values(['participant_id', 'night_of_sleep'])

    # Step 5: Save the shifted data to a new CSV file
    print(f"Saving shifted data to {output_filepath}...")
    shifted_df.to_csv(output_filepath, index=False)

    print(f"Original dataset rows: {len(df)}")
    print(f"Shifted dataset rows: {len(shifted_df)}")
    print(f"Successfully created shifted CSV file at {output_filepath}")

    return shifted_df


if __name__ == "__main__":
    # Generate the shifted CSV file
    shifted_data = generate_shifted_csv('filtered_mtime_one_data.csv')

    # Show the first few rows of the properly aligned data
    print("\nFirst 5 rows of the shifted data:")
    print(shifted_data.head())

    # Show basic statistics
    print("\nBasic statistics for key sleep and activity metrics:")
    metrics = ['minutes_asleep', 'efficiency', 'deep_minutes',
               'steps', 'active_minutes_total', 'very_active_mins']
    print(shifted_data[metrics].describe())
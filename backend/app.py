from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sql.mysql_database import MySQLDatabase  # Import the MySQLDatabase class
import os
from pydantic import BaseModel
from typing import List
from datetime import datetime

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this to restrict origins as needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the database
database = MySQLDatabase()


@app.get("/days-worn")
async def get_days_worn():
    try:
        # SQL query to count the number of days each participant wore the device
        query = """
            SELECT 
                pid,
                COUNT(DISTINCT STR_TO_DATE(device_timestamp, '%m-%d-%Y')) AS days_worn
            FROM 
                cgm_data
            GROUP BY 
                pid;
        """


        # Pass the query to the MySQLDatabase class for execution
        result = database.execute_query(query)

        # Transform the result into a list of dictionaries
        data = [{"pid": row[0], "days_worn": row[1]} for row in result]

        return {"data": data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/cgm-metrics")
async def get_cgm_metrics():
    try:
        # SQL query to fetch all glucose readings
        query = """
            SELECT 
                pid, 
                AVG(historic_glucose_mg_dl) AS avg_glucose,
                SUM(CASE WHEN historic_glucose_mg_dl BETWEEN 70 AND 180 THEN 1 ELSE 0 END) / COUNT(*) * 100 AS tir,
                SUM(CASE WHEN historic_glucose_mg_dl < 70 THEN 1 ELSE 0 END) AS hypo_events,
                SUM(CASE WHEN historic_glucose_mg_dl > 180 THEN 1 ELSE 0 END) AS hyper_events,
                STDDEV(historic_glucose_mg_dl) AS glucose_variability
            FROM 
                cgm_data
            GROUP BY 
                pid;
        """

        # Execute the query
        result = database.execute_query(query)
        # Calculate the sum of hypo and hyper events
        total_hypo_events = sum(row[3] for row in result)
        total_hyper_events = sum(row[4] for row in result)
        total_participants = len(result)  # Calculate total participants
        avg_tir_per_participant = sum(row[2] for row in result) / len(result)
        avg_glucose_variability = sum(row[5] for row in result) / len(result)  # Calculate average glucose variability

        # Process the result to calculate additional metrics
        metrics = {
            "average_glucose": sum(row[1] for row in result) / len(result),
            "time_in_range": sum(row[2] for row in result) / len(result),
            "total_hypo_events": total_hypo_events,
            "total_hyper_events": total_hyper_events,
            "total_participants": total_participants,
            "avg_tir_per_participant": avg_tir_per_participant,
            "glucose_variability": avg_glucose_variability,
            "hypoglycemia_events": [{"pid": row[0], "events": row[3]} for row
                                    in result if row[3] > 0],
            "hyperglycemia_events": [{"pid": row[0], "events": row[4]} for row
                                     in result if row[4] > 0]
        }
        return {"data": metrics}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/participant-time-in-ranges")
async def get_time_in_ranges():
    try:
        query = """
            SELECT 
                pid,
                SUM(CASE WHEN historic_glucose_mg_dl > 250 THEN 1 ELSE 0 END) / COUNT(*) * 100 AS very_high,
                SUM(CASE WHEN historic_glucose_mg_dl BETWEEN 180 AND 250 THEN 1 ELSE 0 END) / COUNT(*) * 100 AS high,
                SUM(CASE WHEN historic_glucose_mg_dl BETWEEN 70 AND 180 THEN 1 ELSE 0 END) / COUNT(*) * 100 AS target,
                SUM(CASE WHEN historic_glucose_mg_dl BETWEEN 54 AND 70 THEN 1 ELSE 0 END) / COUNT(*) * 100 AS low,
                SUM(CASE WHEN historic_glucose_mg_dl < 54 THEN 1 ELSE 0 END) / COUNT(*) * 100 AS very_low
            FROM 
                cgm_data
            GROUP BY 
                pid;
        """

        result = database.execute_query(query)
        time_in_ranges = [{"pid": row[0], "very_high": row[1], "high": row[2], "target": row[3], "low": row[4], "very_low": row[5]} for row in result]

        return {"data": time_in_ranges}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/qa-dashboard")
async def get_qa_dashboard():
    try:
        # Event Detection Over Time by PID
        event_detection_query = """
            SELECT 
                pid,
                DATE(STR_TO_DATE(device_timestamp, '%m-%d-%Y %H:%i')) AS date,
                SUM(CASE WHEN historic_glucose_mg_dl < 70 THEN 1 ELSE 0 END) AS hypo_events,
                SUM(CASE WHEN historic_glucose_mg_dl > 180 THEN 1 ELSE 0 END) AS hyper_events
            FROM 
                cgm_data
            WHERE
            timepoint IS NOT NULL
            AND STR_TO_DATE(device_timestamp, '%m-%d-%Y %H:%i') IS NOT NULL
            GROUP BY 
                pid,
                DATE(STR_TO_DATE(device_timestamp, '%m-%d-%Y %H:%i'));
        """
        event_detection_result = database.execute_query(event_detection_query)

        # Glucose Level Distribution by PID
        glucose_distribution_query = """
            SELECT 
                pid,
                FLOOR(historic_glucose_mg_dl / 10) * 10 AS glucose_range,
                COUNT(*) AS occurrences
            FROM 
                cgm_data
            GROUP BY 
                pid,
                glucose_range;
        """
        glucose_distribution_result = database.execute_query(glucose_distribution_query)

        # Daily Averages and Peaks by PID
        daily_avg_peaks_query = """
            SELECT 
                pid,
                DATE(STR_TO_DATE(device_timestamp, '%m-%d-%Y %H:%i')) AS date,
                AVG(historic_glucose_mg_dl) AS avg_glucose,
                MAX(historic_glucose_mg_dl) AS peak_glucose
            FROM 
                cgm_data
            WHERE
            timepoint IS NOT NULL
            AND STR_TO_DATE(device_timestamp, '%m-%d-%Y %H:%i') IS NOT NULL
            GROUP BY 
                pid,
                DATE(STR_TO_DATE(device_timestamp, '%m-%d-%Y %H:%i'));
        """
        daily_avg_peaks_result = database.execute_query(daily_avg_peaks_query)

        # Process and return the results
        qa_dashboard_data = {
            "event_detection_over_time": [{"pid": row[0], "date": row[1], "hypo_events": row[2], "hyper_events": row[3]} for row in event_detection_result],
            "glucose_distribution": [{"pid": row[0], "glucose_range": row[1], "occurrences": row[2]} for row in glucose_distribution_result],
            "daily_avg_peaks": [{"pid": row[0], "date": row[1], "avg_glucose": row[2], "peak_glucose": row[3]} for row in daily_avg_peaks_result]
        }

        return {"data": qa_dashboard_data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/participant/{pid}/daily-avg-glucose")
async def get_daily_avg_glucose(pid: str):
    try:
        query = """
            SELECT 
                DATE(STR_TO_DATE(device_timestamp, '%m-%d-%Y %H:%i')) AS date,
                AVG(historic_glucose_mg_dl) AS avg_glucose
            FROM 
                cgm_data
            WHERE 
                pid = :pid
            GROUP BY 
                DATE(STR_TO_DATE(device_timestamp, '%m-%d-%Y %H:%i'))
            ORDER BY 
                DATE(STR_TO_DATE(device_timestamp, '%m-%d-%Y %H:%i'));
        """

        params = {"pid": pid}
        result = database.get_query(query, params)
        return {"data": result}
    except Exception as e:
        print(f"Error occurred: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@app.get("/participant/{pid}/hourly-glucose/{date}")
def get_hourly_glucose(pid: str, date: str):
    try:
        # Query to get CGM data
        cgm_query = """
            SELECT
                STR_TO_DATE(device_timestamp, '%m-%d-%Y %H:%i') AS timestamp,
                historic_glucose_mg_dl AS glucose_level,
                CASE
                    WHEN historic_glucose_mg_dl < 70 THEN 'hypo'
                    WHEN historic_glucose_mg_dl > 180 THEN 'hyper'
                    ELSE 'normal'
                END AS status
            FROM
                cgm_data
            WHERE
                pid = :pid
                AND DATE(STR_TO_DATE(device_timestamp, '%m-%d-%Y %H:%i')) = :date
            ORDER BY
                timestamp;
        """

        # Query to get food log data
        food_log_query = """
            SELECT
                timestamp AS meal_timestamp,
                total_carbs_g,
                total_fat_g,
                protein_g,
                raw_data,
                calories,
                glycemic_load
            FROM
                dietary_data
            WHERE
                pid = :pid
                AND DATE(STR_TO_DATE(date, '%Y-%m-%d')) = :date
            ORDER BY
                meal_timestamp;
        """

        params = {"pid": pid, "date": date}
        print(params)
        print(food_log_query)
        cgm_data = database.get_query(cgm_query, params)
        food_log_data = database.get_query(food_log_query, params)

        print(cgm_data)
        print(food_log_data)

        return {"cgm_data": cgm_data, "food_log_data": food_log_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


#2


# 1. Get QC Dashboard Data (summary of wear time, file sizes, calibration, etc.)
@app.get("/qc-dashboard")
async def get_qc_dashboard():
    try:
        # SQL query to fetch QC dashboard data
        query = """
            SELECT 
                pid,
                file_size,
                file_deviceID,
                file_startTime,
                file_endTime,
                data_wearTime_overall_days,
                data_nonWearTime_overall_days,
                data_quality_goodCalibration
            FROM ukb_summary;
        """
        result = database.execute_query(query)

        # Process and format the results into a dictionary
        qc_data = [
            {
                "participant_id": row[0],
                "file_size_MB": row[1] / (1024 ** 2),  # Convert file size to MB
                "device_id": row[2],
                "start_time": row[3].strftime('%Y-%m-%d %H:%M:%S'),
                "end_time": row[4].strftime('%Y-%m-%d %H:%M:%S'),
                "wear_time_days": row[5],
                "non_wear_time_days": row[6],
                "good_calibration": bool(row[7])
            }
            for row in result
        ]

        return {"data": qc_data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 2. Get QC Metrics (total files processed, average wear/non-wear time, calibration)
@app.get("/qc-metrics")
async def get_qc_metrics():
    try:
        # SQL queries to fetch QC metrics
        total_files_query = "SELECT COUNT(*) FROM summary_data;"
        avg_wear_time_query = "SELECT AVG(wearTime_overall) FROM summary_data;"
        good_calibration_query = "SELECT AVG(file_size)  FROM summary_data;"
        avg_non_wear_time_query = "SELECT AVG(nonWearTime_overall) FROM summary_data;"

        # Execute queries
        total_files = database.execute_query(total_files_query)[0][0]
        avg_wear_time = database.execute_query(avg_wear_time_query)[0][0]
        good_calibration_count = database.execute_query(good_calibration_query)[0][0]
        avg_non_wear_time = database.execute_query(avg_non_wear_time_query)[0][0]

        # QC Metrics data
        metrics = {
            "total_files_processed": total_files,
            "average_wear_time_days": round(avg_wear_time, 2),
            "good_calibration_count": good_calibration_count,
            "average_non_wear_time_days": round(avg_non_wear_time, 2)
        }

        return {"data": metrics}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 3. Wear vs Non-Wear Time (comparison of wear and non-wear time per participant)
@app.get("/wear-vs-nonwear")
async def get_wear_vs_nonwear():
    try:
        query = """
            SELECT 
                pid, 
                wearTime_overall,
                nonWearTime_overall
            FROM summary_data;
        """
        result = database.execute_query(query)

        # Format the result into a dictionary
        wear_nonwear_data = [
            {
                "participant_id": row[0],
                "wear_time_days": row[1],
                "non_wear_time_days": row[2]
            }
            for row in result
        ]

        return {"data": wear_nonwear_data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 4. Calibration Check (check the number of participants with good calibration)
@app.get("/calibration-check")
async def get_calibration_check():
    try:
        query = """
            SELECT 
                participant_id,
                data_quality_goodCalibration
            FROM ukb_summary
            WHERE data_quality_goodCalibration = 1;
        """
        result = database.execute_query(query)

        calibration_data = [{"participant_id": row[0]} for row in result]

        return {"data": calibration_data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 5. Get Detailed File Metadata for each participant
@app.get("/file-metadata")
async def get_file_metadata():
    try:
        query = """
            SELECT 
                pid,
                file_name,
                file_deviceID,
                file_size,
                file_startTime,
                file_endTime
            FROM summary_data;
        """
        result = database.execute_query(query)

        metadata = [
            {
                "participant_id": row[0],
                "file_name": os.path.basename(row[1]),
                "device_id": row[2],
                "file_size_MB": row[3] / (1024 ** 2),  # Convert file size to MB
                "start_time": row[4].strftime('%Y-%m-%d %H:%M:%S'),
                "end_time": row[5].strftime('%Y-%m-%d %H:%M:%S')
            }
            for row in result
        ]

        return {"data": metadata}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/participant/{pid}")
async def get_participant_data(pid: str):
        try:
            query = """
                SELECT 
                    calendar_date,
                    dur_day_total_IN_min,
                    dur_day_total_LIG_min,
                    dur_day_total_MOD_min,
                    dur_day_total_VIG_min,
                    dur_spt_min,
                    nonwear_perc_day_spt
                FROM day_summary
                WHERE pid = :pid;
            """
            result = database.get_query(query, {'pid': pid})
            participant_data = [dict(row) for row in result]
            return {"data": participant_data}

        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


@app.get("/participant/{pid}/sleep-data")
async def get_sleep_data(pid: str):
    try:
        # SQL query to fetch sleep data for the specified participant
        query = """
            SELECT 
                calendar_date,
                sleeponset_ts,
                wakeup_ts,
                sleep_efficiency_after_onset
            FROM day_summary
            WHERE pid = :pid;
        """
        result = database.get_query(query, {'pid': pid})
        sleep_data = [dict(row) for row in result]
        return {"data": sleep_data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/participant/{pid}/dates")
async def getDatesForPid(pid: str):
    try:
        # Query to fetch distinct date parts (YYYY-MM-DD) for the given PID
        query = f"""
                     SELECT DISTINCT(DATE(calendar_date)) as date 
                     FROM wear_time 
                     WHERE pid = '{pid}';
                """
        result = database.execute_query(query)
        dates = [row[0] for row in result]
        return {"data": dates}
    except Exception as e:
        # Handle any exceptions that may occur
        raise HTTPException(status_code=500, detail=str(e))
@app.get("/pids")
async def getPids():
    try:
        query = """
                     SELECT DISTINCT(pid) as pid from wear_time;
                """
        result  = database.execute_query(query)
        pids = [row[0] for row in result]
        return {"data":pids}
    except Exception as e:
        # Handle any exceptions that may occur
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/participant/{pid}/wear-time")
async def get_wear_time_data(pid: str):
    try:
        # SQL query to fetch wear time data for the specified participant
        query = """
            SELECT 
                calendar_date,
                day,
                recorded_wear_time_hrs
            FROM wear_time
            WHERE pid = :pid
            ORDER BY calendar_date;
        """
        # Execute the query and pass the pid
        result = database.get_query(query, {'pid': pid})

        # Convert the result into a dictionary for the response
        wear_time_data = [dict(row) for row in result]
        return {"data": wear_time_data}

    except Exception as e:
        # Handle any exceptions that may occur
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/participant/{pid}/sleep-hours-efficiency")
async def get_sleep_hours_efficiency(pid: str):
    try:
        # SQL query to fetch sleep hours and sleep efficiency for the participant
        query = """
            SELECT 
                calendar_date,
                dur_spt_sleep_min / 60 AS sleep_hours,  -- Convert minutes to hours
                sleeponset_ts,wakeup_ts,
                sleep_efficiency_after_onset
            FROM day_summary
            WHERE pid = :pid
            ORDER BY calendar_date;
        """
        result = database.get_query(query, {'pid': pid})

        # Convert the result into a list of dictionaries
        sleep_data = [dict(row) for row in result]

        # Return the sleep data
        return {"data": sleep_data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/participant/{pid}/activity-sleep-trace")
async def get_activity_sleep_trace(pid: str, date: str):
    try:
        # SQL query to fetch activity and sleep data for the specified participant and date
        query = """
            SELECT 
                timestamp,
                sedentary,
                light,
                moderate_vigorous,
                sleep
            FROM minute_level_data
            WHERE pid = :pid
            AND DATE(timestamp) = :date
            ORDER BY timestamp;
        """
        result = database.get_query(query, {'pid': pid, 'date': date})
        trace_data = [dict(row) for row in result]
        return {"data": trace_data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/wear-time-boxplot")
async def get_wear_time_boxplot():
    try:
        # SQL query to calculate global wear time statistics
        query_global = """
            WITH ranked_wear_time AS (
                SELECT 
                    wearTime_overall,
                    ROW_NUMBER() OVER (ORDER BY wearTime_overall) AS rn,
                    COUNT(*) OVER () AS total_count
                FROM summary_data
            )
            SELECT 
                MIN(wearTime_overall) AS min,  -- Min wear time
                MAX(CASE WHEN rn = FLOOR(total_count * 0.25) THEN wearTime_overall END) AS q1,  -- Q1 (25th percentile)
                MAX(CASE WHEN rn = FLOOR(total_count * 0.5) THEN wearTime_overall END) AS median,  -- Median (50th percentile)
                MAX(CASE WHEN rn = FLOOR(total_count * 0.75) THEN wearTime_overall END) AS q3,  -- Q3 (75th percentile)
                MAX(wearTime_overall) AS max  -- Max wear time
            FROM ranked_wear_time;
        """
        result_global = database.execute_query(query_global)

        # Debugging: print or log the result to check the query output
        print(f"Global wear time result: {result_global}")

        # Ensure result_global is not empty or None
        if not result_global or len(result_global) == 0:
            raise HTTPException(status_code=404, detail="Global wear time statistics not found")

        # The query returns a list of tuples, we use result_global[0] for the first row
        row_global = result_global[0]

        # Prepare the global box plot data
        boxplot_data = {
            "min": row_global[0],
            "q1": row_global[1],
            "median": row_global[2],
            "q3": row_global[3],
            "max": row_global[4]
        }

        # SQL query to fetch individual wear time data points for each PID
        query_individual = """
            SELECT 
                pid, wearTime_overall
            FROM summary_data
        """
        result_individual = database.execute_query(query_individual)

        # Debugging: print or log the result to check the query output
        print(f"Individual wear time result: {result_individual}")

        # Ensure result_individual is not empty or None
        if not result_individual or len(result_individual) == 0:
            raise HTTPException(status_code=404, detail="Individual wear time data not found")

        # Prepare the individual data points for plotting
        individual_data = [{"pid": row[0], "wearTime_overall": row[1]} for row in result_individual]

        return {"boxplot": boxplot_data, "individuals": individual_data}

    except Exception as e:
        # Log the exception for debugging
        print(f"Error occurred: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# API to fetch avg sleep data for box plot
@app.get("/avg-sleep-boxplot")
async def get_avg_sleep_boxplot():
    try:
        # SQL query to calculate global average sleep statistics (converted to hours)
        query_global = """
            WITH ranked_sleep AS (
                SELECT 
                    AVG(dur_spt_sleep_min / 60.0) AS avg_sleep_hours,
                    ROW_NUMBER() OVER (ORDER BY AVG(dur_spt_sleep_min / 60.0)) AS rn,
                    COUNT(*) OVER () AS total_count
                FROM day_summary
                GROUP BY pid
            )
            SELECT 
                MIN(avg_sleep_hours) AS min,  -- Min average sleep time
                MAX(CASE WHEN rn = FLOOR(total_count * 0.25) THEN avg_sleep_hours END) AS q1,  -- Q1 (25th percentile)
                MAX(CASE WHEN rn = FLOOR(total_count * 0.5) THEN avg_sleep_hours END) AS median,  -- Median (50th percentile)
                MAX(CASE WHEN rn = FLOOR(total_count * 0.75) THEN avg_sleep_hours END) AS q3,  -- Q3 (75th percentile)
                MAX(avg_sleep_hours) AS max  -- Max average sleep time
            FROM ranked_sleep;
        """
        result_global = database.execute_query(query_global)

        # Debugging: print or log the result to check the query output
        print(f"Global average sleep result: {result_global}")

        # Ensure result_global is not empty or None
        if not result_global or len(result_global) == 0:
            raise HTTPException(status_code=404, detail="Global sleep statistics not found")

        # The query returns a list of tuples, we use result_global[0] for the first row
        row_global = result_global[0]

        # Prepare the global box plot data
        boxplot_data = {
            "min": row_global[0],
            "q1": row_global[1],
            "median": row_global[2],
            "q3": row_global[3],
            "max": row_global[4]
        }

        # SQL query to fetch individual average sleep data points for each PID
        query_individual = """
            SELECT 
                pid, AVG(dur_spt_sleep_min / 60.0) AS avg_sleep_hours
            FROM day_summary
            GROUP BY pid
        """
        result_individual = database.execute_query(query_individual)

        # Debugging: print or log the result to check the query output
        print(f"Individual sleep data result: {result_individual}")

        # Ensure result_individual is not empty or None
        if not result_individual or len(result_individual) == 0:
            raise HTTPException(status_code=404, detail="Individual sleep data not found")

        # Prepare the individual data points for plotting
        individual_data = [{"pid": row[0], "avg_sleep": row[1]} for row in result_individual]

        return {"boxplot": boxplot_data, "individuals": individual_data}

    except Exception as e:
        # Log the exception for debugging
        print(f"Error occurred: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/file-size-boxplot")
async def get_file_size_boxplot():
    try:
        # SQL query to calculate global file size statistics (converted to MB)
        query_global = """
            WITH ranked_file_size AS (
                SELECT 
                    file_size / (1024 * 1024) AS file_size_mb,  -- Convert bytes to MB
                    ROW_NUMBER() OVER (ORDER BY file_size / (1024 * 1024)) AS rn,
                    COUNT(*) OVER () AS total_count
                FROM summary_data
            )
            SELECT 
                MIN(file_size_mb) AS min,  -- Min file size
                MAX(CASE WHEN rn = FLOOR(total_count * 0.25) THEN file_size_mb END) AS q1,  -- Q1 (25th percentile)
                MAX(CASE WHEN rn = FLOOR(total_count * 0.5) THEN file_size_mb END) AS median,  -- Median (50th percentile)
                MAX(CASE WHEN rn = FLOOR(total_count * 0.75) THEN file_size_mb END) AS q3,  -- Q3 (75th percentile)
                MAX(file_size_mb) AS max  -- Max file size
            FROM ranked_file_size;
        """
        result_global = database.execute_query(query_global)

        # Debugging: print or log the result to check the query output
        print(f"Global file size result: {result_global}")

        # Ensure result_global is not empty or None
        if not result_global or len(result_global) == 0:
            raise HTTPException(status_code=404, detail="Global file size statistics not found")

        # The query returns a list of tuples, we use result_global[0] for the first row
        row_global = result_global[0]

        # Prepare the global box plot data
        boxplot_data = {
            "min": row_global[0],
            "q1": row_global[1],
            "median": row_global[2],
            "q3": row_global[3],
            "max": row_global[4]
        }

        # SQL query to fetch individual file size data points for each PID
        query_individual = """
            SELECT 
                pid, file_size / (1024 * 1024) AS file_size_mb  -- Convert bytes to MB
            FROM summary_data
        """
        result_individual = database.execute_query(query_individual)

        # Debugging: print or log the result to check the query output
        print(f"Individual file size data result: {result_individual}")

        # Ensure result_individual is not empty or None
        if not result_individual or len(result_individual) == 0:
            raise HTTPException(status_code=404, detail="Individual file size data not found")

        # Prepare the individual data points for plotting
        individual_data = [{"pid": row[0], "file_size": row[1]} for row in result_individual]

        return {"boxplot": boxplot_data, "individuals": individual_data}

    except Exception as e:
        # Log the exception for debugging
        print(f"Error occurred: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



# Define the request model
class ParticipantTrendsRequest(BaseModel):
    pids: List[str]

from sqlalchemy import text, bindparam

@app.post("/participant-trends")
async def get_participant_trends(request: ParticipantTrendsRequest):
    try:
        if not request.pids:
            raise HTTPException(status_code=400, detail="No participant IDs provided.")

        query = text("""
            SELECT 
                pid, 
                calendar_date, 
                recorded_wear_time_hrs
            FROM wear_time
            WHERE pid IN :pids
            ORDER BY pid, calendar_date;
        """).bindparams(bindparam('pids', expanding=True))

        result = database.get_query_in(query, {'pids': request.pids})

        trends = {}
        for row in result:
            pid = row['pid']
            date = row['calendar_date']
            # Convert the string to a datetime object
            date_obj = datetime.strptime(str(date), "%Y-%m-%d %H:%M:%S")

            # Format the datetime object to only include the date part
            formatted_date = date_obj.strftime("%Y-%m-%d")
            wear_time = row['recorded_wear_time_hrs']
            if pid not in trends:
                trends[pid] = {'dates': [], 'wear_times': []}
            trends[pid]['dates'].append(formatted_date)
            trends[pid]['wear_times'].append(wear_time)

        return {"data": trends}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)

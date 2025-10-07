import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';
import moment from 'moment';
import { CommonModule } from '@angular/common';
import {
    Chart,
    ChartType,
    ChartDataset,
    registerables,
    CategoryScale,
    LinearScale,
    LineElement,
    PointElement,
    LineController,
    Tooltip,
    Legend,
    ScaleType,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
Chart.register(CategoryScale, LinearScale, LineElement, PointElement, LineController, Tooltip, Legend);

// Define the custom annotation plugin

// Register the custom plugin
// Chart.register(customAnnotationsPlugin);


// Register the custom plugin
Chart.register(annotationPlugin);
Chart.register(...registerables);

@Component({
    selector: 'app-participant-dashboard',
    templateUrl: './participant-dashboard.component.html',
    styleUrls: ['./participant-dashboard.component.scss'],
    standalone : true,
    imports: [CommonModule]
})

export class ParticipantDashboardComponent implements OnInit {
    selectedPid: string;
    participantData: any[] = [];
    activityChart: Chart;
    sleepData: any[] = [];  // Sleep data for the participant
    sleepChart: Chart;
    wearTimeData: any[] = [];  // Wear time data for the participant
    wearTimeChart: Chart;
    activitySleepData: any[] = [];  // Activity and sleep data for the participant
    activitySleepChart: Chart;
    sleepHoursEfficiencyChart: Chart;
    sleepDataHourly: any[] = [];
    constructor(private route: ActivatedRoute, private http: HttpClient, private cdr: ChangeDetectorRef) {
        Chart.register(...registerables);
    }

    ngOnInit(): void {
        this.route.paramMap.subscribe(params => {
            this.selectedPid = params.get('pid')!;  // Get the PID from route parameters
            this.loadParticipantData(this.selectedPid);
            this.loadSleepData(this.selectedPid);
            this.loadWearTimeData(this.selectedPid);
            this.fetchSleepHourAndEfficienctDataForDate(this.selectedPid)
        });
    }

    loadParticipantData(pid: string): void {
        this.http.get<{ data: any[] }>(`http://localhost:8000/participant/${pid}`).subscribe((response) => {
            this.participantData = response.data;
            this.renderActivityChart();
            this.cdr.detectChanges();
        });
    }

    renderActivityChart(): void {
        const dates = this.participantData.map((item) => moment(item.calendar_date).format('YYYY-MM-DD'));
        const sedentaryTime = this.participantData.map((item) => item.dur_day_total_IN_min / 60); // Convert minutes to hours
        const lightActivity = this.participantData.map((item) => item.dur_day_total_LIG_min / 60);
        const moderateActivity = this.participantData.map((item) => item.dur_day_total_MOD_min / 60);
        const vigorousActivity = this.participantData.map((item) => item.dur_day_total_VIG_min / 60);

        const canvas = document.getElementById('activityChart') as HTMLCanvasElement;
        const ctx = canvas.getContext('2d');

        if (this.activityChart) {
            this.activityChart.destroy();
        }

        this.activityChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: 'Sedentary Time (Hours)',
                        data: sedentaryTime,
                        backgroundColor: '#ff6384'
                    },
                    {
                        label: 'Light Activity (Hours)',
                        data: lightActivity,
                        backgroundColor: '#36a2eb'
                    },
                    {
                        label: 'Moderate Activity (Hours)',
                        data: moderateActivity,
                        backgroundColor: '#ffce56'
                    },
                    {
                        label: 'Vigorous Activity (Hours)',
                        data: vigorousActivity,
                        backgroundColor: '#4bc0c0'
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                    },
                },
            },
        });
    }

    loadSleepData(pid: string): void {
        this.http.get<{ data: any[] }>(`http://localhost:8000/participant/${pid}/sleep-data`).subscribe((response) => {
            this.sleepData = response.data;
            this.renderSleepChart();
        });
    }

    private renderSleepChart(): void {
        const labels = this.sleepData.map(item => moment(item.calendar_date).format('MMM DD, YYYY'));  // Format the date for better readability
        const sleeponsetTimes = this.sleepData.map(item => this.convertToHours(item.sleeponset_ts));  // Sleep onset in hours
        const wakeupTimes = this.sleepData.map(item => this.convertToHours(item.wakeup_ts));  // Wakeup time in hours
        const sleepEfficiency = this.sleepData.map(item => item.sleep_efficiency_after_onset * 100);  // Sleep efficiency in percentage

        const canvas = document.getElementById('sleepChart') as HTMLCanvasElement;
        if (!canvas) {
            console.error("Canvas element not found!");
            return;
        }

        const ctx = canvas.getContext('2d');

        // Scale the canvas for high-density displays
        const parent = canvas.parentElement;
        canvas.width = parent.clientWidth * window.devicePixelRatio;
        canvas.height = parent.clientHeight * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        if (this.sleepChart) {
            this.sleepChart.destroy();  // Destroy the previous chart if it exists
        }

        this.sleepChart = new Chart(ctx, {
            type: 'line',  // Use a line chart for scientific representation
            data: {
                labels: labels,  // Dates on X-axis
                datasets: [
                    {
                        label: 'Sleep Onset Time',
                        data: sleeponsetTimes,
                        borderColor: '#4caf50',  // Green color for sleep onset
                        backgroundColor: '#4caf50',
                        fill: false,
                        borderWidth: 2,  // Thicker lines for better visibility
                        pointRadius: 5,  // Bigger points for visibility
                        yAxisID: 'y',
                    },
                    {
                        label: 'Wakeup Time',
                        data: wakeupTimes,
                        borderColor: '#f44336',  // Red color for wakeup time
                        backgroundColor: '#f44336',
                        fill: false,
                        borderWidth: 2,  // Thicker lines for better visibility
                        pointRadius: 5,  // Bigger points for visibility
                        yAxisID: 'y',
                    },
                    {
                        label: 'Sleep Efficiency (%)',
                        data: sleepEfficiency,
                        borderColor: '#2196f3',
                        backgroundColor: '#2196f3',
                        fill: false,
                        type: 'line',  // Represent sleep efficiency as circles
                        showLine: false,  // Don't connect the points
                        pointRadius: 8,   // Larger point radius for visibility
                        yAxisID: 'y1',  // Attach to secondary Y-axis for sleep efficiency
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        ticks: {
                            color: '#ffffff',  // White color for X-axis labels
                            maxRotation: 0,    // Keep the labels horizontal
                            autoSkip: true,    // Skip labels to avoid clutter
                        },
                        title: {
                            display: true,
                            text: 'Date',
                            color: '#ffffff',
                            font: {
                                size: 14,
                                weight: 'bold',
                            },
                        },
                    },
                    y: {
                        type: 'linear',
                        beginAtZero: false,
                        ticks: {
                            color: '#ffffff',  // White color for Y-axis labels
                            callback: function (value) {
                                return moment().startOf('day').add(value, 'hours').format('HH:mm');  // Format as HH:mm
                            },
                        },
                        grid: {
                            color: '#2c2e33',  // Grid color for Y-axis
                        },
                        title: {
                            display: true,
                            text: 'Time (Hours)',
                            color: '#ffffff',
                            font: {
                                size: 14,
                                weight: 'bold',
                            },
                        },
                    },
                    y1: {
                        type: 'linear',
                        beginAtZero: true,
                        position: 'right',  // Secondary Y-axis for sleep efficiency
                        ticks: {
                            color: '#ffffff',  // White color for secondary Y-axis
                            callback: function (value) {
                                return value + '%';  // Format as percentage
                            },
                        },
                        grid: {
                            drawOnChartArea: false,  // Don't draw grid on the chart area for the secondary Y-axis
                        },
                        title: {
                            display: true,
                            text: 'Sleep Efficiency (%)',
                            color: '#ffffff',
                            font: {
                                size: 14,
                                weight: 'bold',
                            },
                        },
                    },
                },
                layout: {
                    padding: {
                        left: 20,
                        right: 20,
                        top: 10,
                        bottom: 30,  // Increased bottom padding for better X-axis readability
                    },
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#ffffff',  // White legend labels
                        },
                    },
                    annotation: {
                        annotations: this.sleepData.map((item, index) => ({
                            type: 'line',
                            xMin: index,
                            xMax: index,
                            yMin: sleeponsetTimes[index],
                            yMax: wakeupTimes[index],
                            borderColor: '#ffffff',  // Dashed line for sleep duration
                            borderDash: [5, 5],  // Create a dashed line
                            borderWidth: 1,
                        })),
                    },
                },
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const selectedDate = labels[index];
                        console.log("Clicked date:", selectedDate);  // For testing, you can use this to navigate or fetch more data
                    }
                },
            },
        });
    }


    // Helper function to convert 'HH:mm:ss' time format into hours (float)
    private convertToHours(time: string): number {
        const timeParts = time.split(':');
        const hours = parseInt(timeParts[0], 10);
        const minutes = parseInt(timeParts[1], 10) / 60;
        const seconds = parseInt(timeParts[2], 10) / 3600;
        return hours + minutes + seconds;
    }

    // Load the wear time data for the participant
    loadWearTimeData(pid: string): void {
        this.http.get<{ data: any[] }>(`http://localhost:8000/participant/${pid}/wear-time`).subscribe((response) => {
            this.wearTimeData = response.data;
            this.renderWearTimeChart();
        });
    }

    // Render the wear time bar chart
    private renderWearTimeChart(): void {
        const labels = this.wearTimeData.map(item => moment(item.calendar_date).format('YYYY-MM-DD'));  // Format to show only the date
        const wearTimes = this.wearTimeData.map(item => item.recorded_wear_time_hrs);  // Recorded wear times for Y-axis

        const canvas = document.getElementById('wearTimeChart') as HTMLCanvasElement;
        const ctx = canvas.getContext('2d');

        // Scale the canvas for high-density displays
        const parent = canvas.parentElement;
        canvas.width = parent.clientWidth * window.devicePixelRatio;
        canvas.height = parent.clientHeight * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        if (this.wearTimeChart) {
            this.wearTimeChart.destroy();  // Destroy the previous chart if it exists
        }

        this.wearTimeChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,  // Formatted dates on X-axis (YYYY-MM-DD)
                datasets: [
                    {
                        label: 'Recorded Wear Time (Hours)',
                        data: wearTimes,
                        borderColor: '#4caf50',
                        backgroundColor: '#4caf50',
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        ticks: {
                            color: '#ffffff',  // White color for X-axis labels
                            autoSkip: true,    // Skip labels if too many
                            maxRotation: 45,   // Rotate labels to avoid clutter
                            minRotation: 45,   // Ensure rotation
                        },
                        title: {
                            display: true,
                            text: 'Date',
                            color: '#ffffff',
                            font: {
                                size: 14,
                                weight: 'bold',
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#ffffff'  // White color for Y-axis labels
                        },
                        grid: {
                            color: '#2c2e33',  // Grid color for Y-axis
                        },
                        title: {
                            display: true,
                            text: 'Wear Time (Hours)',
                            color: '#ffffff',
                            font: {
                                size: 14,
                                weight: 'bold',
                            }
                        }
                    }
                },
                layout: {
                    padding: {
                        left: 20,
                        right: 20,
                        top: 10,
                        bottom: 30  // Increased bottom padding for better X-axis label spacing
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#ffffff'  // White legend labels
                        }
                    }
                },
                // Add click event to fetch activity/sleep trace when clicking on a bar
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const selectedDate = labels[index];
                        this.fetchActivitySleepDataForDate(selectedDate);  // Call function to load the trace for the selected date
                    }
                }
            }
        });
    }

    // Load the activity and sleep data for the participant
    private fetchActivitySleepDataForDate(date: string): void {
        // Fetch the activity and sleep data for the selected date
        this.http.get<{ data: any[] }>(`http://localhost:8000/participant/${this.selectedPid}/activity-sleep-trace?date=${date}`).subscribe((response) => {
            this.activitySleepData = response.data;
            this.renderActivitySleepChart();  // Call function to render the activity and sleep trace chart
        });
    }


    // Render the activity and sleep trace chart
    renderActivitySleepChart(): void {
        const labels = this.activitySleepData.map(item => item.timestamp);  // Use timestamps for X-axis
        const sedentaryData = this.activitySleepData.map(item => item.sedentary);
        const lightData = this.activitySleepData.map(item => item.light);
        const moderateVigorousData = this.activitySleepData.map(item => item.moderate_vigorous);
        const sleepData = this.activitySleepData.map(item => item.sleep);

        const canvas = document.getElementById('activitySleepChart') as HTMLCanvasElement;
        const ctx = canvas.getContext('2d');

        // Scale the canvas for high-density displays
        const parent = canvas.parentElement;
        canvas.width = parent.clientWidth * window.devicePixelRatio;
        canvas.height = parent.clientHeight * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        if (this.activitySleepChart) {
            this.activitySleepChart.destroy();  // Destroy the previous chart if it exists
        }

        this.activitySleepChart = new Chart(ctx, {
            type: 'line',  // Use a line chart to represent the activity and sleep trace
            data: {
                labels: labels,  // Timestamps on X-axis
                datasets: [
                    {
                        label: 'Sedentary',
                        data: sedentaryData,
                        borderColor: '#ff9800',  // Orange color for sedentary
                        backgroundColor: '#ff9800',
                        fill: false,
                        borderWidth: 2,
                    },
                    {
                        label: 'Light Activity',
                        data: lightData,
                        borderColor: '#4caf50',  // Green color for light activity
                        backgroundColor: '#4caf50',
                        fill: false,
                        borderWidth: 2,
                    },
                    {
                        label: 'Moderate/Vigorous Activity',
                        data: moderateVigorousData,
                        borderColor: '#f44336',  // Red color for moderate/vigorous activity
                        backgroundColor: '#f44336',
                        fill: false,
                        borderWidth: 2,
                    },
                    {
                        label: 'Sleep',
                        data: sleepData,
                        borderColor: '#2196f3',  // Blue color for sleep trace
                        backgroundColor: '#2196f3',
                        fill: false,
                        borderWidth: 2,
                    },
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        ticks: {
                            color: '#ffffff',  // White color for X-axis labels
                            autoSkip: true,    // Skip labels if too many
                            maxRotation: 45,   // Rotate labels to avoid clutter
                            minRotation: 45,   // Ensure rotation
                        },
                        title: {
                            display: true,
                            text: 'Timestamp',
                            color: '#ffffff',
                            font: {
                                size: 14,
                                weight: 'bold',
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#ffffff'  // White color for Y-axis labels
                        },
                        grid: {
                            color: '#2c2e33',  // Grid color for Y-axis
                        },
                        title: {
                            display: true,
                            text: 'Activity/Sleep',
                            color: '#ffffff',
                            font: {
                                size: 14,
                                weight: 'bold',
                            }
                        }
                    }
                },
                layout: {
                    padding: {
                        left: 20,
                        right: 20,
                        top: 10,
                        bottom: 30  // Increased bottom padding for X-axis labels
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#ffffff'  // White legend labels
                        }
                    }
                }
            }
        });
    }

    private fetchSleepHourAndEfficienctDataForDate(pid: string): void {
        // Fetch the activity and sleep data for the selected date
        this.http.get<{ data: any[] }>(`http://localhost:8000/participant/${this.selectedPid}/sleep-hours-efficiency`).subscribe((response) => {
            this.sleepDataHourly = response.data;
            this.renderSleepHoursEfficiencyChart();  // Call function to render the activity and sleep trace chart
        });
    }


    private renderSleepHoursEfficiencyChart(): void {
        const labels = this.sleepDataHourly.map(item => item.calendar_date);  // Dates on X-axis
        const sleepHours = this.sleepDataHourly.map(item => item.sleep_hours);  // Use sleep_hours directly from response
        const sleepEfficiency = this.sleepDataHourly.map(item => item.sleep_efficiency_after_onset * 100);  // Sleep efficiency in percentage

        // Extracting sleeponset and wakeup times for tooltips
        const sleeponsetTimes = this.sleepDataHourly.map(item => item.sleeponset_ts);
        const wakeupTimes = this.sleepDataHourly.map(item => item.wakeup_ts);

        const canvas = document.getElementById('sleepHoursEfficiencyChart') as HTMLCanvasElement;
        const ctx = canvas.getContext('2d');

        // Scale the canvas for high-density displays
        const parent = canvas.parentElement;
        canvas.width = parent.clientWidth * window.devicePixelRatio;
        canvas.height = parent.clientHeight * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        if (this.sleepHoursEfficiencyChart) {
            this.sleepHoursEfficiencyChart.destroy();  // Destroy the previous chart if it exists
        }

        this.sleepHoursEfficiencyChart = new Chart(ctx, {
            type: 'bar',  // Use bar chart for sleep hours and line chart for efficiency
            data: {
                labels: labels,  // Dates on X-axis
                datasets: [
                    {
                        type: 'bar',  // Bar chart for sleep hours
                        label: 'Sleep Hours',
                        data: sleepHours,
                        backgroundColor: '#4caf50',  // Green color for sleep hours
                        yAxisID: 'y1',  // Use the primary Y-axis for sleep hours
                        borderWidth: 2,
                    },
                    {
                        type: 'line',  // Line chart for sleep efficiency
                        label: 'Sleep Efficiency (%)',
                        data: sleepEfficiency,
                        borderColor: '#2196f3',
                        backgroundColor: '#2196f3',
                        fill: false,
                        yAxisID: 'y2',  // Use the secondary Y-axis for sleep efficiency
                        borderWidth: 2,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y1: {
                        beginAtZero: true,
                        position: 'left',
                        ticks: {
                            color: '#ffffff',
                        },
                        title: {
                            display: true,
                            text: 'Sleep Hours (hours)',
                            color: '#ffffff',
                        }
                    },
                    y2: {
                        beginAtZero: true,
                        position: 'right',
                        ticks: {
                            color: '#ffffff',
                            callback: function (value) {
                                return value + '%';  // Format as percentage
                            }
                        },
                        title: {
                            display: true,
                            text: 'Sleep Efficiency (%)',
                            color: '#ffffff',
                        }
                    },
                    x: {
                        ticks: {
                            color: '#ffffff'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (tooltipItem) => {
                                const index = tooltipItem.dataIndex;
                                const sleepOnset = sleeponsetTimes[index] ? `Sleep Onset: ${sleeponsetTimes[index]}` : 'Sleep Onset: N/A';
                                const wakeup = wakeupTimes[index] ? `Wakeup Time: ${wakeupTimes[index]}` : 'Wakeup Time: N/A';
                                const sleepValue = tooltipItem.dataset.label === 'Sleep Hours' ? `${tooltipItem.raw} hours` : `${tooltipItem.raw}%`;
                                return `${sleepValue}\n${sleepOnset}\n${wakeup}`;
                            }
                        }
                    }
                }
            }
        });
    }




}

import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import Chart from 'chart.js/auto';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-reconciliation',
    standalone: true,
    templateUrl: './reconciliation.component.html',
    imports: [
        FormsModule, CommonModule
    ],
    styleUrls: ['./reconciliation.component.scss'],
})
export class ReconciliationComponent implements OnInit {

    selectedPid: string = '';
    selectedDate: string = '';
    pids: string[] = [];
    datesForSelectedPid: string[] = [];
    combinedChart: any;

    constructor(private http: HttpClient) { }

    ngOnInit(): void {
        this.loadPids();
    }

    loadPids(): void {
        this.http.get<{ data: string[] }>('http://localhost:8000/pids').subscribe(response => {
            console.log("PIDs API Response:", response);
            this.pids = response.data || [];
            if (this.pids.length > 0) {
                this.selectedPid = this.pids[0];
                this.onPidChange();
            }
        }, error => {
            console.error("Error fetching PIDs:", error);
            this.pids = [];
        });
    }

    onPidChange(): void {
        if (this.selectedPid) {
            this.http.get<{ data: string[] }>(`http://localhost:8000/participant/${this.selectedPid}/dates`).subscribe(response => {
                console.log("API Response:", response);
                this.datesForSelectedPid = response.data;
            });
        }
    }

    onDateSelected(date: string): void {
        this.selectedDate = date;
        // Add selected class to the clicked button and remove from others
        const buttons = document.querySelectorAll('.date-button');
        buttons.forEach(btn => {
            if ((btn as HTMLElement).innerText.trim() === date) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });
        this.fetchData();
    }

    fetchData(): void {
        const cgmUrl = `http://localhost:8000/participant/${this.selectedPid}/hourly-glucose/${this.selectedDate}`;
        const activityUrl = `http://localhost:8000/participant/${this.selectedPid}/activity-sleep-trace?date=${this.selectedDate}`;

        this.http.get<{ cgm_data: any[], food_log_data: any[] }>(cgmUrl).subscribe(cgmResponse => {
            this.http.get<{ data: any[] }>(activityUrl).subscribe(activityResponse => {
                this.renderCombinedChart(cgmResponse.cgm_data, activityResponse.data, this.selectedDate);
            });
        });
    }

    private renderCombinedChart(cgmData: any[], activitySleepData: any[], selectedDate: string): void {
        const cgmTimestamps = cgmData.map(item => new Date(item.timestamp).getTime());
        const activityTimestamps = activitySleepData.map(item => new Date(item.timestamp).getTime());

        const allTimestamps = Array.from(new Set([...cgmTimestamps, ...activityTimestamps])).sort((a, b) => a - b);

        const glucoseLevels = allTimestamps.map(timestamp => {
            const cgmEntry = cgmData.find(item => new Date(item.timestamp).getTime() === timestamp);
            return cgmEntry ? cgmEntry.glucose_level : null;
        });

        // Original background colors with moderate opacity (0.4)
        const sleepColor = 'rgba(116, 185, 255, 0.4)';      // Light blue
        const sedentaryColor = 'rgba(255, 128, 128, 0.4)';   // Light red
        const lightColor = 'rgba(255, 206, 86, 0.4)';        // Light yellow
        const mvpaColor = 'rgba(75, 192, 112, 0.4)';         // Light green

        // Annotations for activity/sleep background
        const annotations = [];

        activitySleepData.forEach((entry, i) => {
            const startTime = new Date(entry.timestamp).getTime();
            const endTime = activitySleepData[i + 1] ? new Date(activitySleepData[i + 1].timestamp).getTime() : startTime + 1000 * 60 * 15; // Add 15 min gap

            if (entry.sleep) {
                annotations.push({
                    type: 'box',
                    xMin: startTime,
                    xMax: endTime,
                    backgroundColor: sleepColor,
                    borderWidth: 0,
                    borderColor: 'transparent',
                    drawTime: 'beforeDatasetsDraw'
                });
            }
            if (entry.sedentary) {
                annotations.push({
                    type: 'box',
                    xMin: startTime,
                    xMax: endTime,
                    backgroundColor: sedentaryColor,
                    borderWidth: 0,
                    borderColor: 'transparent',
                    drawTime: 'beforeDatasetsDraw'
                });
            }
            if (entry.light) {
                annotations.push({
                    type: 'box',
                    xMin: startTime,
                    xMax: endTime,
                    backgroundColor: lightColor,
                    borderWidth: 0,
                    borderColor: 'transparent',
                    drawTime: 'beforeDatasetsDraw'
                });
            }
            if (entry.moderate_vigorous) {
                annotations.push({
                    type: 'box',
                    xMin: startTime,
                    xMax: endTime,
                    backgroundColor: mvpaColor,
                    borderWidth: 0,
                    borderColor: 'transparent',
                    drawTime: 'beforeDatasetsDraw'
                });
            }
        });

        const canvas = document.getElementById('combinedChart') as HTMLCanvasElement;
        const ctx = canvas.getContext('2d');

        if (ctx) {
            if (this.combinedChart) {
                this.combinedChart.destroy();
            }

            this.combinedChart = new Chart(ctx, {
                type: 'line',
                data: {
                    datasets: [
                        // Glucose Level
                        {
                            label: 'Glucose Level',
                            data: allTimestamps.map((timestamp, i) => ({
                                x: new Date(timestamp),
                                y: glucoseLevels[i]
                            })),
                            borderColor: '#1E90FF', // Dodger blue
                            backgroundColor: '#1E90FF',
                            fill: false,
                            yAxisID: 'yGlucose',
                            borderWidth: 3,
                            pointRadius: 2,
                            pointHoverRadius: 4,
                            tension: 0.2,
                            spanGaps: true,
                            order: 0 // Ensure it's drawn on top
                        },
                        // Dummy datasets for legend
                        {
                            label: 'Sleep',
                            data: [],
                            borderColor: '#74b9ff', // Light blue
                            backgroundColor: sleepColor,
                            borderWidth: 1,
                            pointStyle: 'rect',
                            yAxisID: 'yGlucose'
                        },
                        {
                            label: 'Sedentary',
                            data: [],
                            borderColor: '#ff8080', // Light red
                            backgroundColor: sedentaryColor,
                            borderWidth: 1,
                            pointStyle: 'rect',
                            yAxisID: 'yGlucose'
                        },
                        {
                            label: 'Light Activity',
                            data: [],
                            borderColor: '#ffce56', // Light yellow
                            backgroundColor: lightColor,
                            borderWidth: 1,
                            pointStyle: 'rect',
                            yAxisID: 'yGlucose'
                        },
                        {
                            label: 'Moderate/Vigorous Activity',
                            data: [],
                            borderColor: '#4bc070', // Light green
                            backgroundColor: mvpaColor,
                            borderWidth: 1,
                            pointStyle: 'rect',
                            yAxisID: 'yGlucose'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                unit: 'hour',
                                displayFormats: {
                                    hour: 'HH:mm'
                                }
                            },
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                font: {
                                    family: "'Arial', sans-serif",
                                    size: 11
                                },
                                color: '#ffffff'
                            },
                            border: {
                                color: 'rgba(255, 255, 255, 0.2)'
                            }
                        },
                        yGlucose: {
                            type: 'linear',
                            position: 'left',
                            title: {
                                display: true,
                                text: 'Glucose Level (mg/dL)',
                                color: '#ffffff',
                                font: {
                                    family: "'Arial', sans-serif",
                                    size: 12,
                                    weight: 500
                                }
                            },
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                font: {
                                    family: "'Arial', sans-serif"
                                },
                                color: '#ffffff'
                            },
                            border: {
                                color: 'rgba(255, 255, 255, 0.2)'
                            },
                            min: 35  // Start from 35 for better visualization
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                            align: 'center',
                            labels: {
                                padding: 15,
                                usePointStyle: true,
                                pointStyle: 'rect',
                                boxWidth: 15,
                                boxHeight: 10,
                                font: {
                                    family: "'Arial', sans-serif",
                                    size: 12
                                },
                                color: '#ffffff'
                            }
                        },
                        tooltip: {
                            enabled: true,
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            borderColor: 'rgba(255, 255, 255, 0.2)',
                            borderWidth: 1,
                            padding: 10,
                            boxPadding: 5,
                            cornerRadius: 4,
                            titleFont: {
                                family: "'Arial', sans-serif",
                                size: 13,
                                weight: 600
                            },
                            bodyFont: {
                                family: "'Arial', sans-serif",
                                size: 12
                            },
                            callbacks: {
                                title: function(tooltipItems) {
                                    const date = new Date(tooltipItems[0].parsed.x);
                                    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                }
                            }
                        },
                        annotation: {
                            annotations: annotations
                        }
                    }
                }
            });
        }
    }
}

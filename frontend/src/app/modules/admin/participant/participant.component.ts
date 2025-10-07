import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import 'chartjs-adapter-moment';
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
    selector: 'participant',
    standalone: true,
    templateUrl: './participant.component.html',
    styleUrls: ['./participant.component.scss'],
    imports: [CommonModule]
})
export class ParticipantComponent implements OnInit, OnDestroy {
    pid: string;
    dailyAvgGlucoseData: any;
    hourlyGlucoseChart: Chart | null = null;  // Store the chart instance

    constructor(private route: ActivatedRoute, private http: HttpClient) {}

    ngOnInit(): void {
        this.pid = this.route.snapshot.paramMap.get('pid');
        this.fetchDailyAvgGlucose();
    }

    ngOnDestroy(): void {
        // Destroy the chart when the component is destroyed
        if (this.hourlyGlucoseChart) {
            this.hourlyGlucoseChart.destroy();
        }
    }

    fetchDailyAvgGlucose(): void {
        this.http.get<{ data: any }>(`http://localhost:8000/participant/${this.pid}/daily-avg-glucose`).subscribe(response => {
            this.dailyAvgGlucoseData = response.data;
            this.renderDailyAvgGlucoseChart();
        });
    }

    private renderDailyAvgGlucoseChart(): void {
        const labels = this.dailyAvgGlucoseData.map(item => item.date);
        const avgGlucose = this.dailyAvgGlucoseData.map(item => item.avg_glucose);

        const canvas = document.getElementById('dailyAvgGlucoseChart') as HTMLCanvasElement;
        const ctx = canvas.getContext('2d');

        const parent = canvas.parentElement;
        canvas.width = parent.clientWidth * window.devicePixelRatio;
        canvas.height = parent.clientHeight * window.devicePixelRatio;

        // Scale the canvas to handle high-density displays
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Avg Glucose',
                        data: avgGlucose,
                        borderColor: '#1e90ff',
                        backgroundColor: '#1e90ff',
                        pointRadius: 5,
                        pointHoverRadius: 8,
                        pointBackgroundColor: '#ffffff',
                        pointBorderColor: '#1e90ff',
                        pointBorderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        ticks: {
                            color: '#ffffff'
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
                            color: '#ffffff'
                        },
                        grid: {
                            color: '#2c2e33',
                        },
                        title: {
                            display: true,
                            text: 'Glucose Level (mg/dL)',
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
                        bottom: 30 // Increased bottom padding for x-axis labels
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#ffffff'
                        }
                    },
                    annotation: {
                        annotations: {
                            line1: {
                                type: 'line',
                                yMin: 70,
                                yMax: 70,
                                borderColor: 'rgb(255, 99, 132)',
                                borderWidth: 2,
                                label: {
                                    content: 'Hypoglycemia Threshold',
                                    position: 'center'
                                }
                            },
                            line2: {
                                type: 'line',
                                scaleID: 'y',
                                value: 180,
                                borderColor: 'red',
                                borderWidth: 2,
                                label: {
                                    content: 'Hypoglycemia Threshold',
                                    position: 'center'
                                }
                            }
                        },

                    }
                },
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const selectedDate = labels[index];
                        this.fetchHourlyGlucose(selectedDate);
                    }
                }
            }
        });
    }

    fetchHourlyGlucose(date: string): void {
        this.http.get<{ cgm_data: any[], food_log_data: any[] }>(`http://localhost:8000/participant/${this.pid}/hourly-glucose/${date}`).subscribe(response => {
            if (response.cgm_data && response.cgm_data.length > 0) {
                this.renderHourlyGlucoseChart(response.cgm_data, response.food_log_data, date);
            } else {
                console.error("No data available for the selected date.");
            }
        });
    }

    private renderHourlyGlucoseChart(cgmData: any[], foodLogData: any[], selectedDate: string): void {
        if (this.hourlyGlucoseChart) {
            this.hourlyGlucoseChart.destroy();
        }

        // Set the chart title to include the selected date
        const titleElement = document.querySelector('.hourly-glucose-title');
        if (titleElement) {
            titleElement.textContent = `Hourly Glucose Trend - ${selectedDate}`;
        }

        const times = cgmData.map(item => new Date(item.timestamp));
        const glucoseLevels = cgmData.map(item => item.glucose_level);

        // Meal markers with labels on separate lines
        const mealMarkers = foodLogData.map(meal => ({
            x: new Date(meal.meal_timestamp),
            y: glucoseLevels.reduce((a, b) => a + b, 0) / glucoseLevels.length,
            label: `Meal Time: ${new Date(meal.meal_timestamp).toLocaleTimeString()}\nMeal:${meal.raw_data}\nCalories: ${meal.calories}\nCarbs: ${meal.total_carbs_g}g\nFat: ${meal.total_fat_g}g\nProtein: ${meal.protein_g}g\nGlycemic Load: ${meal.glycemic_load}`
        }));

        // Postprandial highlights
        // Postprandial highlights
        const postprandialHighlights = {};
        foodLogData.forEach((meal, index) => {
            const postprandialStartTime = new Date(meal.meal_timestamp);
            const postprandialEndTime = new Date(postprandialStartTime.getTime() + 2 * 60 * 60 * 1000);

            // Calculate average glucose level during the postprandial period
            const postprandialData = cgmData.filter(item =>
                new Date(item.timestamp) >= postprandialStartTime &&
                new Date(item.timestamp) <= postprandialEndTime
            );
            const postprandialAvg = postprandialData.reduce((sum, item) => sum + item.glucose_level, 0) / postprandialData.length;
            const postprandialPeak = Math.max(...postprandialData.map(item => item.glucose_level));

            postprandialHighlights[`highlight_${index}`] = { // Give each highlight a unique name
                type: 'box',
                xMin: postprandialStartTime,
                xMax: postprandialEndTime,
                backgroundColor: 'rgba(50, 150, 250, 0.2)',  // Change color to a lighter blue with more transparency
                borderColor: 'rgba(50, 150, 250, 0.5)',       // Add a matching border color
                borderWidth: 2,
                label: {
                    display: true,
                    content: `Postprandial Period\nAvg: ${postprandialAvg.toFixed(1)} mg/dL, Peak: ${postprandialPeak} mg/dL`,
                    color: '#ffffff',                      // White text color for contrast
                    position: 'start',                    // Position the label at the top of the box
                    font: {
                        size: 12,                         // Increase the font size for better readability
                        weight: 'bold',
                    },
                }
            };
        });


        const canvas = document.getElementById('hourlyGlucoseChart') as HTMLCanvasElement;
        const ctx = canvas.getContext('2d');

        if (ctx) {
            this.hourlyGlucoseChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: times,
                    datasets: [
                        {
                            label: 'Glucose Level',
                            data: glucoseLevels,
                            borderColor: '#1e90ff',
                            fill: false,
                            pointBackgroundColor: '#1e90ff',
                            pointRadius: 5,
                        },
                        {
                            label: 'Meal Markers',
                            data: mealMarkers,
                            type: 'bubble',
                            backgroundColor: 'rgba(255,99,132,0.7)',
                            borderColor: '#ff6347',
                            radius: 8,
                            hoverRadius: 12,
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
                                unit: 'minute',
                                displayFormats: {
                                    minute: 'HH:mm',
                                    hour: 'HH:mm'
                                },
                                tooltipFormat: 'HH:mm'
                            },
                            title: {
                                display: true,
                                text: 'Time',
                                color: '#ffffff',
                                font: {
                                    size: 14,
                                    weight: 'bold'
                                }
                            },
                            ticks: {
                                color: '#ffffff'
                            }
                        },
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Glucose Level (mg/dL)',
                                color: '#ffffff',
                                font: {
                                    size: 14,
                                    weight: 'bold'
                                }
                            },
                            ticks: {
                                color: '#ffffff'
                            },
                            grid: {
                                color: '#2c2e33'
                            }
                        }
                    },
                    plugins: {
                        annotation: {
                            annotations: {
                                ...postprandialHighlights,
                                line1: {
                                    type: 'line',
                                    scaleID: 'y',
                                    value: 70, // Hypoglycemia threshold
                                    borderColor: 'red',
                                    borderWidth: 2,
                                    label: {
                                        content: 'Hypoglycemia Threshold',
                                        backgroundColor: 'red',
                                        color: '#ffffff',
                                        position: 'start',
                                    }
                                },
                                line2: {
                                    type: 'line',
                                    scaleID: 'y',
                                    value: 180, // Hyperglycemia threshold
                                    borderColor: 'red',
                                    borderWidth: 2,
                                    label: {
                                        content: 'Hyperglycemia Threshold',
                                        backgroundColor: 'red',
                                        color: '#ffffff',
                                        position: 'start',
                                    }
                                }
                            }
                        },
                        tooltip: {
                            enabled: true,
                            callbacks: {
                                label: function(context: any) {
                                    if (context.dataset.label === 'Meal Markers' && context.raw.label) {
                                        return context.raw.label.split('\n'); // Split label into multiple lines
                                    }
                                    return `${context.dataset.label}: ${context.raw} mg/dL`;
                                }
                            }
                        }
                    }
                }
            });
        } else {
            console.error("Hourly Glucose Chart canvas element not found.");
        }
    }








}

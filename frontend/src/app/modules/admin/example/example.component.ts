import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import annotationPlugin from 'chartjs-plugin-annotation';
import {
    Chart,
    ChartOptions,
    ChartDataset,
    CategoryScale,
    LinearScale,
    BarElement,
    BarController,
    LineElement,
    LineController,
    PointElement,
    Tooltip,
    Legend
} from 'chart.js';

Chart.register(
    CategoryScale,
    LinearScale,
    BarElement,
    BarController,
    LineElement,
    LineController,
    PointElement,
    Tooltip,
    Legend
);

Chart.register(annotationPlugin);
@Component({
    selector: 'example',
    standalone: true,
    templateUrl: './example.component.html',
    styleUrls: ['./example.component.scss'],
    imports: [CommonModule]
})

export class ExampleComponent implements OnInit {
    averageGlucose: number;
    timeInRange: number;
    hypoglycemiaEvents: any[] = [];
    hyperglycemiaEvents: any[] = [];
    totalHypoEvents: number;
    totalHyperEvents: number;
    showHypoDropdown = false;
    showHyperDetails = false;
    showHypoModal = false;
    totalParticipants: number;
    showHyperModal = false;
    avgTirPerParticipant: number;  // Avg TIR per participant
    glucoseVariability: number;    // Glucose variability

    chartData: ChartDataset[] = [];
    chartLabels: string[] = [];
    chartOptions: ChartOptions<'bar'> = {
        responsive: true,
        maintainAspectRatio: false,  // Adjust for a better aspect ratio
        scales: {
            x: {
                type: 'category',
            },
            y: {
                type: 'linear',
                beginAtZero: true,
            }
        },
    };

    constructor(private http: HttpClient, private cdr: ChangeDetectorRef,private router: Router) {}

    ngOnInit(): void {
        this.fetchCgmMetrics();
    }

    fetchCgmMetrics(): void {
        this.http.get<{ data: any }>('http://localhost:8000/cgm-metrics').subscribe(response => {
            this.averageGlucose = response.data.average_glucose;
            this.timeInRange = response.data.time_in_range;
            this.hypoglycemiaEvents = this.aggregateEvents(response.data.hypoglycemia_events);
            this.hyperglycemiaEvents = this.aggregateEvents(response.data.hyperglycemia_events);

            // Calculate the total number of hypoglycemia and hyperglycemia events
            this.totalHypoEvents = this.hypoglycemiaEvents.reduce((sum, event) => sum + event.events, 0);
            this.totalHyperEvents = this.hyperglycemiaEvents.reduce((sum, event) => sum + event.events, 0);
            this.totalParticipants = response.data.total_participants;
            // New Metrics
            this.avgTirPerParticipant = response.data.avg_tir_per_participant;  // Avg TIR per participant
            this.glucoseVariability = response.data.glucose_variability;  // Glucose variability

            this.fetchCgmData();
            this.fetchTimeInRanges();
            this.fetchQaDashboard();
            this.cdr.detectChanges();
        });
    }

    fetchCgmData(): void {
        this.http.get<{ data: any[] }>('http://localhost:8000/days-worn').subscribe(response => {
            this.renderChart(response.data);
            this.cdr.detectChanges();
        });
    }

    fetchTimeInRanges(): void {
        this.http.get<{ data: any[] }>('http://localhost:8000/participant-time-in-ranges').subscribe(response => {
            this.renderTimeInRangesChart(response.data);
            this.cdr.detectChanges();
        });
    }

    fetchQaDashboard(): void {
        this.http.get<{ data: any }>('http://localhost:8000/qa-dashboard').subscribe(response => {
            // this.renderEventDetectionChart(response.data.event_detection_over_time);
            // this.renderGlucoseDistributionChart(response.data.glucose_distribution);
            this.renderDailyAvgPeaksChart(response.data.daily_avg_peaks);
            this.cdr.detectChanges();
        });
    }


    aggregateEvents(events: any[]): any[] {
        const aggregated: { [pid: string]: any } = {};
        events.forEach(event => {
            if (aggregated[event.pid]) {
                aggregated[event.pid].events += event.events;
            } else {
                aggregated[event.pid] = { pid: event.pid, events: event.events, percentage: event.percentage };
            }
        });
        return Object.values(aggregated);
    }

    openHypoModal(): void {
        this.showHypoModal = true;
    }

    closeHypoModal(): void {
        this.showHypoModal = false;
    }

    openHyperModal(): void {
        this.showHyperModal = true;
    }

    closeHyperModal(): void {
        this.showHyperModal = false;
    }

    private renderChart(data: any[]): void {
        const labels = data.map(item => item.pid);
        const daysWornData = data.map(item => item.days_worn);

        const canvas = document.getElementById('myChart') as HTMLCanvasElement;
        const ctx = canvas.getContext('2d');

        // Set the canvas size explicitly to match its container size
        const parent = canvas.parentElement;
        canvas.width = parent.clientWidth * window.devicePixelRatio;
        canvas.height = parent.clientHeight * window.devicePixelRatio;

        // Scale the canvas to handle high-density displays
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Days Worn',
                    data: daysWornData,
                    backgroundColor: '#1e90ff',
                    borderColor: '#1c7ed6',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#2c2e33',
                        },
                        ticks: {
                            color: '#ffffff',
                        },
                        title: {
                            display: true,
                            text: 'No Of Days',
                            color: '#ffffff',
                            font: {
                                size: 14,
                                weight: 'bold',
                            }
                        }
                    },
                    x: {
                        ticks: {
                            color: '#ffffff',
                        },
                        title: {
                            display: true,
                            text: 'Participant ID',
                            color: '#ffffff',
                            font: {
                                size: 14,
                                weight: 'bold',
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#ffffff',
                        }
                    },
                },
                layout: {
                    padding: {
                        left: 0,
                        right: 0,
                        top: 20,
                        bottom: 20
                    }
                },
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const selectedPid = labels[index];
                        this.router.navigate(['/participant', selectedPid]);
                    }
                }
            }
        });
    }

    private renderTimeInRangesChart(data: any[]): void {
        const labels = data.map(item => item.pid);
        const veryHigh = data.map(item => item.very_high);
        const high = data.map(item => item.high);
        const target = data.map(item => item.target);
        const low = data.map(item => item.low);
        const veryLow = data.map(item => item.very_low);



        const ctx = document.getElementById('timeInRangesChart') as HTMLCanvasElement;
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Very High (>250 mg/dL)',
                        data: veryHigh,
                        backgroundColor: '#ff6b6b'
                    },
                    {
                        label: 'High (180-250 mg/dL)',
                        data: high,
                        backgroundColor: '#ffa502'
                    },
                    {
                        label: 'Target (70-180 mg/dL)',
                        data: target,
                        backgroundColor: '#2ed573'
                    },
                    {
                        label: 'Low (54-70 mg/dL)',
                        data: low,
                        backgroundColor: '#1e90ff'
                    },
                    {
                        label: 'Very Low (<54 mg/dL)',
                        data: veryLow,
                        backgroundColor: '#ff4757'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        stacked: true,
                        ticks: {
                            color: '#ffffff'  /* White text for better contrast */
                        },
                        title: {
                            display: true,
                            text: 'Participant ID',
                            color: '#ffffff',
                            font: {
                                size: 14,
                                weight: 'bold',
                            }
                        }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        ticks: {
                            color: '#ffffff'  /* White text for better contrast */
                        },
                        title: {
                            display: true,
                            text: 'Time In Range(%)',
                            color: '#ffffff',
                            font: {
                                size: 14,
                                weight: 'bold',
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#ffffff'  /* White text for better contrast */
                        }
                    },
                    annotation: {  // Ensure the annotation plugin is either not included or is disabled
                        annotations: {}
                    }
                }
            }
        });
    }

    private renderEventDetectionChart(data: any[]): void {
        const groupedData = this.groupByPid(data, 'date');
        const datasets = Object.keys(groupedData).map(pid => ({
            label: `Hypoglycemia Events (${pid})`,
            data: groupedData[pid].map(item => item.hypo_events),
            borderColor: this.getRandomColor(),
            fill: false
        })).concat(Object.keys(groupedData).map(pid => ({
            label: `Hyperglycemia Events (${pid})`,
            data: groupedData[pid].map(item => item.hyper_events),
            borderColor: this.getRandomColor(),
            fill: false
        })));

        const dates = [...new Set(data.map(item => item.date))];

        const ctx = document.getElementById('eventDetectionChart') as HTMLCanvasElement;
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: datasets
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        ticks: {
                            color: '#ffffff'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#ffffff'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#ffffff'
                        }
                    }
                }
            }
        });
    }

    private groupByPid(data: any[], key: string): any {
        return data.reduce((result, currentValue) => {
            (result[currentValue.pid] = result[currentValue.pid] || []).push(currentValue);
            return result;
        }, {});
    }

    private getRandomColor(): string {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    private renderGlucoseDistributionChart(data: any[]): void {
        const groupedData = this.groupByPid(data, 'glucose_range');
        const datasets = Object.keys(groupedData).map(pid => ({
            label: `Glucose Range (${pid})`,
            data: groupedData[pid].map(item => item.occurrences),
            backgroundColor: this.getRandomColor()
        }));

        const ranges = [...new Set(data.map(item => `${item.glucose_range}-${item.glucose_range + 9}`))];

        const ctx = document.getElementById('glucoseDistributionChart') as HTMLCanvasElement;
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ranges,
                datasets: datasets
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        ticks: {
                            color: '#ffffff'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#ffffff'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#ffffff'
                        }
                    }
                }
            }
        });
    }

    private renderDailyAvgPeaksChart(data: any[]): void {
        const groupedData = this.groupByPid(data, 'date');
        const datasets = Object.keys(groupedData).map(pid => ({
            label: `Avg Glucose (${pid})`,
            data: groupedData[pid].map(item => item.avg_glucose),
            borderColor: this.getRandomColor(),
            fill: false
        })).concat(Object.keys(groupedData).map(pid => ({
            label: `Peak Glucose (${pid})`,
            data: groupedData[pid].map(item => item.peak_glucose),
            borderColor: this.getRandomColor(),
            fill: false
        })));

        const dates = [...new Set(data.map(item => item.date))];

        const ctx = document.getElementById('dailyAvgPeaksChart') as HTMLCanvasElement;
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: datasets
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        ticks: {
                            color: '#ffffff'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#ffffff'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#ffffff'
                        }
                    }
                }
            }
        });
    }



}

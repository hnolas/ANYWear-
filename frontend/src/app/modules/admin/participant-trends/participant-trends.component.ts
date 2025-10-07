import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';

Chart.register(...registerables);
Chart.register(annotationPlugin);

@Component({
    selector: 'participant-trends',
    standalone: true,
    templateUrl: './participant-trends.component.html',
    styleUrls: ['./participant-trends.component.scss'],
    imports: [CommonModule]
})
export class ParticipantTrendsComponent implements OnInit {
    selectedPIDs: string[] = [];
    trendChart: Chart; // Chart.js instance
    trendCharts: { [pid: string]: Chart } = {};

    constructor(private route: ActivatedRoute, private http: HttpClient) {}

    ngOnInit(): void {
        console.log('ParticipantTrendsComponent initialized.');
        this.route.queryParams.subscribe(params => {
            console.log('Query Params:', params);
            const pidsParam = params['pids'];
            if (pidsParam) {
                this.selectedPIDs = pidsParam.split(',');
                console.log('Selected PIDs:', this.selectedPIDs);
                this.fetchTrendData();
            } else {
                console.error('No PIDs found in query parameters.');
            }
        });
    }

    fetchTrendData(): void {
        console.log('Fetching trend data for PIDs:', this.selectedPIDs);
        this.http.post('http://localhost:8000/participant-trends', { pids: this.selectedPIDs })
            .subscribe(
                (response: any) => {
                    console.log('API Response:', response);
                    this.prepareTrendChart(response.data);
                },
                (error) => {
                    console.error('Error fetching trend data:', error);
                }
            );
    }

    prepareTrendChart(data: any): void {
        // For each participant, process their data and render a chart
        this.selectedPIDs.forEach(pid => {
            const participantData = data[pid];
            if (participantData) {
                const dates = participantData.dates;
                const wearTimes = participantData.wear_times;

                // Prepare the dataset for this participant
                const dataset = {
                    label: `PID ${pid}`,
                    data: wearTimes,
                    borderColor: this.getColor(pid),
                    backgroundColor: this.getColor(pid),
                    fill: false,
                    borderWidth: 2,
                    pointRadius: 3,
                    spanGaps: true,
                };

                // Render the chart for this participant
                this.renderTrendChartForParticipant(pid, dates, [dataset]);
            } else {
                console.error(`No data found for PID ${pid}`);
            }
        });
    }


    renderTrendChartForParticipant(pid: string, dates: string[], datasets: any[]): void {
        const canvasId = `trendChart-${pid}`;
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement;

        if (!canvas) {
            console.error(`Canvas not found for PID ${pid}`);
            return;
        }
        const ctx = canvas.getContext('2d');

        // Destroy previous chart if it exists
        if (this.trendCharts[pid]) {
            this.trendCharts[pid].destroy();
        }

        // Create new chart
        this.trendCharts[pid] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dates,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Date',
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                        },
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Wear Time (hours)',
                        },
                        beginAtZero: true,
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            font: {
                                size: 12,
                            },
                        },
                    },
                },
            },
        });
    }


    getColor(pid: string): string {
        const colors = ['#2196f3'];
        const index = this.selectedPIDs.indexOf(pid);
        return colors[index % colors.length];
    }

}

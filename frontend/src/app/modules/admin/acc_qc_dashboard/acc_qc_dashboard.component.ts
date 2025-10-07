import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import annotationPlugin from 'chartjs-plugin-annotation';
import { PlotlyModule } from 'angular-plotly.js';
import * as PlotlyJS from 'plotly.js-dist-min';

PlotlyModule.plotlyjs = PlotlyJS;

// Chart Options Type Interface for Chart.js
import {
    Chart,
    CategoryScale,
    LinearScale,
    BarElement,
    BarController,
    LineElement,
    LineController,
    PointElement,
    Tooltip,
    Legend, ScatterController
} from 'chart.js';

// Register Chart.js modules
Chart.register(
    CategoryScale,
    LinearScale,
    BarElement,
    BarController,
    LineElement,
    LineController,
    PointElement,
    Tooltip,
    Legend, LinearScale, CategoryScale,
    ScatterController
);

Chart.register(annotationPlugin);

@Component({
    selector: 'acc_qc_dashboard',
    standalone: true,
    templateUrl: './acc_qc_dashboard.component.html',
    styleUrls: ['./acc_qc_dashboard.component.scss'],
    imports: [CommonModule,PlotlyModule]
})
export class QcDashboard implements OnInit {
    // Variables to store tile data
    totalFilesProcessed: number;
    selectedWearTimePIDs: string[] = [];
    averageWearTime: number;
    goodCalibrationCount: number;
    averageNonWearTime: number;

    // Data for wear vs non-wear chart (Chart.js)
    wearVsNonWearData: any[] = [];

    // Data for file metadata table
    fileMetadata: any[] = [];

    // Chart.js instance (for non-Apex charts)
    chart: Chart;

    public boxPlotData: any;
    public boxPlotLayout: any;


    // Sleep Box Plot Data
    public sleepBoxPlotData: any;
    public sleepBoxPlotLayout: any;

    public fileSizeBoxPlotData:any;
    public fileSizeBoxPlotLayout:any;




    wearTimeBoxPlotData:any[]=[];

    constructor(private http: HttpClient, private cdr: ChangeDetectorRef, private router: Router) {}

    ngOnInit(): void {
        // Fetch QC metrics, wear vs non-wear data, and file metadata
        this.fetchQcMetrics();
        this.fetchWearVsNonWear();
        this.fetchFileMetadata();

        // Fetch wear time box plot data (for ApexCharts)
        this.fetchWeartimeBoxPlotData();
        this.fetchAvgSleepBoxPlotData();
        this.fetchFileSizeBoxPlotData();
    }

    // Fetch QC metrics for summary tiles
    fetchQcMetrics(): void {
        this.http.get<{ data: any }>('http://localhost:8000/qc-metrics').subscribe((response) => {
            const metrics = response.data;
            this.totalFilesProcessed = metrics.total_files_processed;
            this.averageWearTime = metrics.average_wear_time_days;
            this.goodCalibrationCount = metrics.good_calibration_count;
            this.averageNonWearTime = metrics.average_non_wear_time_days;
            this.cdr.detectChanges();
        });
    }

    // Fetch wear vs non-wear data and render the Chart.js chart
    fetchWearVsNonWear(): void {
        this.http.get<{ data: any[] }>('http://localhost:8000/wear-vs-nonwear').subscribe((response) => {
            this.wearVsNonWearData = response.data;
            this.renderWearVsNonWearChart();  // Render Chart.js chart
            this.cdr.detectChanges();
        });
    }

    // Fetch file metadata to display in the table
    fetchFileMetadata(): void {
        this.http.get<{ data: any[] }>('http://localhost:8000/file-metadata').subscribe((response) => {
            this.fileMetadata = response.data;
            this.cdr.detectChanges();
        });
    }

    // Render the wear vs non-wear bar chart using Chart.js
    renderWearVsNonWearChart(): void {
        const participantIds = this.wearVsNonWearData.map((item) => item.participant_id);
        const wearTimes = this.wearVsNonWearData.map((item) => item.wear_time_days);
        const nonWearTimes = this.wearVsNonWearData.map((item) => item.non_wear_time_days);

        const canvas = document.getElementById('wearVsNonWearChart') as HTMLCanvasElement;
        const ctx = canvas.getContext('2d');

        if (this.chart) {
            this.chart.destroy();  // Destroy the existing Chart.js chart before creating a new one
        }

        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: participantIds,
                datasets: [
                    {
                        label: 'Wear Time (Days)',
                        data: wearTimes,
                        backgroundColor: '#4caf50',  // Green for wear time
                    },
                    {
                        label: 'Non-Wear Time (Days)',
                        data: nonWearTimes,
                        backgroundColor: '#f44336',  // Red for non-wear time
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const selectedPid = participantIds[index];
                        this.router.navigate(['/participant-dashboard', selectedPid]);  // Navigate to the participant dashboard
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                    },
                },
            },
        });
    }

    // Fetch and render the wear time box plot (ApexCharts)
    fetchWeartimeBoxPlotData(): void {
        this.http.get<{ boxplot: any, individuals: any[] }>('http://localhost:8000/wear-time-boxplot').subscribe(response => {
            const boxplotData = response.boxplot;  // Extract global box plot data
            const individualData = response.individuals;  // Extract individual wear time data
            this.renderWearTimeBoxPlot(boxplotData, individualData);  // Call the function to render the box plot with both global and individual data
            this.cdr.detectChanges();  // Ensure the UI updates after rendering
        });
    }

    // Render wear time box plot using the fetched data (ApexCharts)
    private renderWearTimeBoxPlot(boxplotData: any, individualData: any[]): void {
        // Extract wear time data from individual data
        const wearTimes = individualData.map((item) => item.wearTime_overall);

        // Prepare the box plot trace using individual data
        const boxTrace = {
            y: wearTimes,
            type: 'box',
            name: 'Wear Time Distribution',
            boxpoints: 'all',    // Show all points
            jitter: 0.5,         // Spread the points for better visibility
            pointpos: 0,         // Position of points with respect to box
            marker: {
                color: 'rgba(7,40,89,0.5)',
            },
            line: {
                color: 'rgba(7,40,89,1)',
            },
            text: individualData.map((item) => item.pid),  // Add participant IDs as hover text
            hovertemplate: 'PID: %{text}<br>Wear Time: %{y:.2f} days<extra></extra>',
        };

        // Set up the layout
        this.boxPlotLayout = {
            title: 'Wear Time Box Plot with Individual Data Points',
            dragmode: 'select',
            modebar: {
                orientation: 'v',
            },
            yaxis: {
                title: 'Wear Time (days)',
                zeroline: false,
            },
            xaxis: {
                showticklabels: false,
            },
            width: 600,
            height: 400,
            margin: {
                l: 50,     // Left margin
                r: 50,     // Right margin
                b: 50,     // Bottom margin
                t: 50,     // Top margin
                pad: 4     // Padding
            },
            showlegend: false,
        };

        // Assign the data to the chart
        this.boxPlotData = [boxTrace];
    }


    // Fetch and render the avg sleep box plot using Plotly
    fetchAvgSleepBoxPlotData(): void {
        this.http.get<{ boxplot: any, individuals: any[] }>('http://localhost:8000/avg-sleep-boxplot').subscribe(response => {
            const boxplotData = response.boxplot;
            const individualData = response.individuals;
            this.renderAvgSleepBoxPlot(boxplotData, individualData);
            this.cdr.detectChanges();
        });
    }

    private renderAvgSleepBoxPlot(boxplotData: any, individualData: any[]): void {
        const sleepTimes = individualData.map((item) => item.avg_sleep);

        const boxTrace = {
            y: sleepTimes,
            type: 'box',
            name: 'Avg Sleep Distribution',
            boxpoints: 'all',
            jitter: 0.5,
            pointpos: 0,
            marker: { color: 'rgba(50, 115, 220, 0.5)' },
            line: { color: 'rgba(50, 115, 220, 1)' },
            text: individualData.map((item) => item.pid),
            hovertemplate: 'PID: %{text}<br>Avg Sleep: %{y:.2f} hours<extra></extra>',
        };

        this.sleepBoxPlotLayout = {
            title: 'Avg Sleep Box Plot with Individual Data Points',
            yaxis: { title: 'Avg Sleep (hours)', zeroline: false },
            xaxis: { showticklabels: false },
            dragmode: 'select',
            modebar: {
                orientation: 'v',
            },
            width: 600,    // Set an explicit width
            height: 400,   // Set an explicit height
            margin: {
                l: 50,     // Left margin
                r: 50,     // Right margin
                b: 50,     // Bottom margin
                t: 50,     // Top margin
                pad: 4     // Padding
            },
            showlegend: false,
        };

        this.sleepBoxPlotData = [boxTrace];
    }

    // Fetch and render the file size box plot
    fetchFileSizeBoxPlotData(): void {
        this.http.get<{ boxplot: any, individuals: any[] }>('http://localhost:8000/file-size-boxplot').subscribe(response => {
            const boxplotData = response.boxplot;  // Extract global box plot data
            const individualData = response.individuals;  // Extract individual file size data

            this.renderFileSizeBoxPlot(boxplotData, individualData);  // Render the box plot with global and individual data
            this.cdr.detectChanges();  // Ensure the UI updates after rendering
        });
    }

// Render file size box plot using Plotly
    private renderFileSizeBoxPlot(boxplotData: any, individualData: any[]): void {
        // Extract file sizes from individual data
        const fileSizes = individualData.map((item) => item.file_size);

        // Prepare the box plot trace using individual data
        const boxTrace = {
            y: fileSizes,
            type: 'box',
            name: 'File Size Distribution (MB)',
            boxpoints: 'all',    // Show all points
            jitter: 0.5,         // Spread the points for better visibility
            pointpos: 0,         // Position of points with respect to box
            marker: {
                color: 'rgba(7,40,89,0.5)',
            },
            line: {
                color: 'rgba(7,40,89,1)',
            },
            text: individualData.map((item) => item.pid),  // Add participant IDs as hover text
            hovertemplate: 'PID: %{text}<br>File Size: %{y:.2f} MB<extra></extra>',
        };

        // Set up the layout
        this.fileSizeBoxPlotLayout = {
            title: 'File Size Box Plot with Individual Data Points',
            yaxis: {
                title: 'File Size (MB)',
                zeroline: false,
            },
            dragmode: 'select',
            modebar: {
                orientation: 'v',
            },
            xaxis: {
                showticklabels: false,
            },
            width: 600,    // Set an explicit width
            height: 400,   // Set an explicit height
            margin: {
                l: 50,     // Left margin
                r: 50,     // Right margin
                b: 50,     // Bottom margin
                t: 50,     // Top margin
                pad: 4     // Padding
            },
            showlegend: false,
        };

        // Assign the data to the chart
        this.fileSizeBoxPlotData = [boxTrace];
    }

    onWearTimeSelected(event: any): void {
        // Clear previous selections
        this.selectedWearTimePIDs = [];

        // Extract PIDs from selected points
        if (event && event.points) {
            event.points.forEach(point => {
                const pid = point.text; // Assuming 'text' contains the PID
                if (pid) {
                    this.selectedWearTimePIDs.push(pid);
                }
            });
        }

        // Trigger change detection to update the UI
        this.cdr.detectChanges();
    }

// Event handler for deselection
    onWearTimeDeselected(): void {
        this.selectedWearTimePIDs = [];
        this.cdr.detectChanges();
    }

    visualizeSelectedWearTime(): void {
        // Navigate to the new page with selected PIDs
        this.router.navigate(['/participant-trends/'], {
            queryParams: { pids: this.selectedWearTimePIDs.join(',') }
        });
    }


}

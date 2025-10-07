// multi_boxplot_dashboard.component.ts
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlotlyModule } from 'angular-plotly.js';
import * as PlotlyJS from 'plotly.js-dist-min';

PlotlyModule.plotlyjs = PlotlyJS;

@Component({
    selector: 'multi-boxplot-dashboard',
    standalone: true,
    templateUrl: 'multi-boxplot-dashboard.component.html',
    styleUrls: ['multi-boxplot-dashboard.component.scss'],
    imports: [CommonModule, PlotlyModule]
})
export class MultiBoxplotDashboardComponent implements OnInit {
    // Summary card metrics
    totalParticipants: number = 248;
    averageSleepTime: number = 7.2;
    averageGlucoseLevel: number = 112.5;
    averageSedentaryTime: number = 9.7;
    averageMVPATime: number = 0.8;
    averageWearTime: number = 22.3;

    // Box plot data and layouts
    public sleepBoxPlotData: any;
    public sleepBoxPlotLayout: any;

    public glucoseBoxPlotData: any;
    public glucoseBoxPlotLayout: any;

    public sedentaryBoxPlotData: any;
    public sedentaryBoxPlotLayout: any;

    public mvpaBoxPlotData: any;
    public mvpaBoxPlotLayout: any;

    public wearTimeBoxPlotData: any;
    public wearTimeBoxPlotLayout: any;

    public caloriesBoxPlotData: any;
    public caloriesBoxPlotLayout: any;

    constructor(private cdr: ChangeDetectorRef) {}

    ngOnInit(): void {
        // Initialize all box plots with dummy data
        this.initSleepBoxPlot();
        this.initGlucoseBoxPlot();
        this.initSedentaryBoxPlot();
        this.initMVPABoxPlot();
        this.initWearTimeBoxPlot();
        this.initCaloriesBoxPlot();
    }

    // Sleep Box Plot - Hours of sleep
    private initSleepBoxPlot(): void {
        // Generate dummy data - sleep hours normally distributed around 7.2 hours
        const sleepHours = this.generateNormalDistribution(7.2, 1.2, 100);

        const boxTrace = {
            y: sleepHours,
            type: 'box',
            name: 'Sleep Distribution',
            boxpoints: 'all',
            jitter: 0.5,
            pointpos: 0,
            marker: { color: 'rgba(72, 61, 139, 0.6)' }, // Dark slate blue
            line: { color: 'rgba(72, 61, 139, 1)' },
            text: this.generateParticipantIds(100),
            hovertemplate: 'PID: %{text}<br>Sleep: %{y:.2f} hours<extra></extra>',
        };

        this.sleepBoxPlotLayout = {
            title: 'Sleep Duration',
            yaxis: { title: 'Sleep (hours/day)', zeroline: false },
            xaxis: { showticklabels: false },
            dragmode: 'select',
            width: 600,
            height: 400,
            margin: { l: 50, r: 50, b: 50, t: 50, pad: 4 },
            showlegend: false,
        };

        this.sleepBoxPlotData = [boxTrace];
    }

    // Glucose Box Plot - Blood glucose levels
    private initGlucoseBoxPlot(): void {
        // Generate dummy data - glucose levels normally distributed around 110 mg/dL
        const glucoseLevels = this.generateNormalDistribution(110, 15, 100);

        const boxTrace = {
            y: glucoseLevels,
            type: 'box',
            name: 'Glucose Distribution',
            boxpoints: 'all',
            jitter: 0.5,
            pointpos: 0,
            marker: { color: 'rgba(255, 127, 80, 0.6)' }, // Coral
            line: { color: 'rgba(255, 127, 80, 1)' },
            text: this.generateParticipantIds(100),
            hovertemplate: 'PID: %{text}<br>Glucose: %{y:.1f} mg/dL<extra></extra>',
        };

        this.glucoseBoxPlotLayout = {
            title: 'Blood Glucose',
            yaxis: { title: 'Glucose (mg/dL)', zeroline: false },
            xaxis: { showticklabels: false },
            dragmode: 'select',
            width: 600,
            height: 400,
            margin: { l: 50, r: 50, b: 50, t: 50, pad: 4 },
            showlegend: false,
        };

        this.glucoseBoxPlotData = [boxTrace];
    }

    // Sedentary Activity Box Plot - Hours per day
    private initSedentaryBoxPlot(): void {
        // Generate dummy data - sedentary hours normally distributed around 9.5 hours
        const sedentaryHours = this.generateNormalDistribution(9.5, 2, 100);

        const boxTrace = {
            y: sedentaryHours,
            type: 'box',
            name: 'Sedentary Time Distribution',
            boxpoints: 'all',
            jitter: 0.5,
            pointpos: 0,
            marker: { color: 'rgba(70, 130, 180, 0.6)' }, // Steel blue
            line: { color: 'rgba(70, 130, 180, 1)' },
            text: this.generateParticipantIds(100),
            hovertemplate: 'PID: %{text}<br>Sedentary Time: %{y:.2f} hours/day<extra></extra>',
        };

        this.sedentaryBoxPlotLayout = {
            title: 'Sedentary Activity ',
            yaxis: { title: 'Sedentary Time (hours/day)', zeroline: false },
            xaxis: { showticklabels: false },
            dragmode: 'select',
            width: 600,
            height: 400,
            margin: { l: 50, r: 50, b: 50, t: 50, pad: 4 },
            showlegend: false,
        };

        this.sedentaryBoxPlotData = [boxTrace];
    }

    // MVPA (Moderate to Vigorous Physical Activity) Box Plot - Hours per day
    private initMVPABoxPlot(): void {
        // Generate dummy data - MVPA hours normally distributed around 0.8 hours
        const mvpaHours = this.generateNormalDistribution(0.8, 0.4, 100);

        const boxTrace = {
            y: mvpaHours,
            type: 'box',
            name: 'MVPA Distribution',
            boxpoints: 'all',
            jitter: 0.5,
            pointpos: 0,
            marker: { color: 'rgba(50, 205, 50, 0.6)' }, // Lime green
            line: { color: 'rgba(50, 205, 50, 1)' },
            text: this.generateParticipantIds(100),
            hovertemplate: 'PID: %{text}<br>MVPA: %{y:.2f} hours/day<extra></extra>',
        };

        this.mvpaBoxPlotLayout = {
            title: 'Most Vigorous Physical Activity',
            yaxis: { title: 'MVPA (hours/day)', zeroline: false },
            xaxis: { showticklabels: false },
            dragmode: 'select',
            width: 600,
            height: 400,
            margin: { l: 50, r: 50, b: 50, t: 50, pad: 4 },
            showlegend: false,
        };

        this.mvpaBoxPlotData = [boxTrace];
    }

    // Wear Time Box Plot - Hours per day
    private initWearTimeBoxPlot(): void {
        // Generate dummy data - wear time hours normally distributed around 22 hours
        const wearTimeHours = this.generateNormalDistribution(22, 3, 100);

        const boxTrace = {
            y: wearTimeHours,
            type: 'box',
            name: 'Wear Time Distribution',
            boxpoints: 'all',
            jitter: 0.5,
            pointpos: 0,
            marker: { color: 'rgba(106, 90, 205, 0.6)' }, // Slate blue
            line: { color: 'rgba(106, 90, 205, 1)' },
            text: this.generateParticipantIds(100),
            hovertemplate: 'PID: %{text}<br>Wear Time: %{y:.2f} hours/day<extra></extra>',
        };

        this.wearTimeBoxPlotLayout = {
            title: 'Wear Time',
            yaxis: { title: 'Wear Time (hours/day)', zeroline: false },
            xaxis: { showticklabels: false },
            dragmode: 'select',
            width: 600,
            height: 400,
            margin: { l: 50, r: 50, b: 50, t: 50, pad: 4 },
            showlegend: false,
        };

        this.wearTimeBoxPlotData = [boxTrace];
    }

    // Calories Box Plot (the 6th box plot you requested a suggestion for)
    private initCaloriesBoxPlot(): void {
        // Generate dummy data - calories burned normally distributed around 2200 calories
        const caloriesBurned = this.generateNormalDistribution(2200, 300, 100);

        const boxTrace = {
            y: caloriesBurned,
            type: 'box',
            name: 'Calories Burned Distribution',
            boxpoints: 'all',
            jitter: 0.5,
            pointpos: 0,
            marker: { color: 'rgba(255, 69, 0, 0.6)' }, // Red-orange
            line: { color: 'rgba(255, 69, 0, 1)' },
            text: this.generateParticipantIds(100),
            hovertemplate: 'PID: %{text}<br>Calories: %{y:.0f} cal/day<extra></extra>',
        };

        this.caloriesBoxPlotLayout = {
            title: 'Daily Calories Burned ',
            yaxis: { title: 'Calories (cal/day)', zeroline: false },
            xaxis: { showticklabels: false },
            dragmode: 'select',
            width: 600,
            height: 400,
            margin: { l: 50, r: 50, b: 50, t: 50, pad: 4 },
            showlegend: false,
        };

        this.caloriesBoxPlotData = [boxTrace];
    }

    // Helper function to generate dummy participant IDs
    private generateParticipantIds(count: number): string[] {
        const ids = [];
        for (let i = 1; i <= count; i++) {
            ids.push(`WW${String(i).padStart(3, '0')}`);
        }
        return ids;
    }

    // Helper function to generate normally distributed random numbers
    private generateNormalDistribution(mean: number, stdDev: number, count: number): number[] {
        const result = [];
        for (let i = 0; i < count; i++) {
            // Box-Muller transform for normal distribution
            const u1 = Math.random();
            const u2 = Math.random();
            const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
            const value = mean + stdDev * z0;

            // Ensure values make sense (e.g., no negative sleep hours)
            result.push(Math.max(0, value));
        }
        return result;
    }

    // Handler for box plot selection events
    onBoxPlotSelected(event: any, metricType: string): void {
        if (event && event.points) {
            const selectedPIDs = event.points.map(point => point.text);
            console.log(`Selected ${metricType} PIDs:`, selectedPIDs);
            // Here you could store these selected PIDs or use them for further visualization
        }
    }
}

import { Routes } from '@angular/router';
import { ParticipantDashboardComponent } from './participant-dashboard.component';

const routes: Routes = [
    {
        path: ':pid',
        component: ParticipantDashboardComponent,
    },
];

export default routes;

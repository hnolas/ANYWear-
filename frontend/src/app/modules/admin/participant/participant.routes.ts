import { Routes } from '@angular/router';
import { ParticipantComponent } from './participant.component';

const routes: Routes = [
    {
        path: ':pid',
        component: ParticipantComponent,
    },
];

export default routes;

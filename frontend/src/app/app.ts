import { Component, inject, signal } from '@angular/core';
import { Apollo } from '@apollo-orbit/angular';
import { GET_PATIENTS_QUERY, GET_PATIENT_QUERY } from './graphql';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly apollo = inject(Apollo);

  patientid = signal(0);

  patientsQuery = this.apollo.signal.query({
    query: GET_PATIENTS_QUERY,
    variables: () => ({}),
  });

  patientQuery = this.apollo.signal.query({
    query: GET_PATIENT_QUERY,
    variables: () => {
      const id = this.patientid();
      return id === 0 ? null : { id };
    },
  });

  protected onPatientClick(patient: { id: number }): void {
    this.patientid.set(patient.id);
  }
}
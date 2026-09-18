import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AppService } from './app.service.js';

@Resolver('patients')
export class GraphQlResolver {
    constructor(private service: AppService) { }

    @Query('getPatients')
    async getPatients() {
        console.log('GraphQlResolver.getPatients() called');
        const patients = this.service.readPatients();
        console.log(patients);
        return patients;
    }
    @Query()
    async getPatient(@Args('id') id: number) {   // <- @Args('id') obligatoire
        console.log('GraphQlResolver.getPatient() called with id:', id);
        const patient = this.service.getPatient(id);
        console.log(patient);
        return patient;
    }
}
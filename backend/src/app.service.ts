import { Injectable } from '@nestjs/common';
import path from 'path/win32';
import fs from 'fs';
import { Patient } from './graphql.js';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
  readPatients(): Patient[] {
    console.log('Reading patients from file...');
    try {
      const data = fs.readFileSync(
        path.join(process.cwd(), 'src/patients.json'),
      );
      return JSON.parse(data.toString());
    } catch (e: unknown) {
      console.log((e as Error).message);
      return []
    }
  }
  getPatient(id: number): Patient | undefined {
    const patients = this.readPatients();
    console.log('Searching for patient with id:', id);
    return patients.find((patient) => patient.id === id);
  }
}


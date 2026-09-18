
/*
 * -------------------------------------------------------
 * THIS FILE WAS AUTOMATICALLY GENERATED (DO NOT MODIFY)
 * -------------------------------------------------------
 */

/* tslint:disable */
/* eslint-disable */

export class Patient {
    id: number;
    nom: string;
    prenom?: Nullable<string>;
    age?: Nullable<number>;
    symtomes?: Nullable<Nullable<Symptome>[]>;
}

export class Symptome {
    name: string;
    description?: Nullable<string>;
    date?: Nullable<string>;
}

export abstract class IQuery {
    abstract getPatients(): Patient[] | Promise<Patient[]>;

    abstract getPatient(id: number): Nullable<Patient> | Promise<Nullable<Patient>>;
}

type Nullable<T> = T | null;

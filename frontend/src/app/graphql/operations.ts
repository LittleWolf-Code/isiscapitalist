/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { gql } from '@apollo-orbit/angular';
import { TypedDocumentNode as DocumentNode } from '@apollo-orbit/angular';
export type GetPatientsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetPatientsQueryData = { getPatients: Array<{ id: number, nom: string, prenom: string | null, age: number | null }> };

export type GetPatientQueryVariables = Exact<{
  id: number;
}>;


export type GetPatientQueryData = { getPatient: { id: number, nom: string, prenom: string | null, age: number | null, symtomes: Array<{ name: string, description: string | null, date: string | null } | null> | null } | null };


export const GET_PATIENTS_QUERY = gql`
    query GetPatients {
  getPatients {
    id
    nom
    prenom
    age
  }
}
    ` as DocumentNode<GetPatientsQueryData, GetPatientsQueryVariables>;

export function gqlGetPatientsQuery(): { query: typeof GET_PATIENTS_QUERY } {
  return {
    query: GET_PATIENTS_QUERY
  };
}

export const GET_PATIENT_QUERY = gql`
    query GetPatient($id: Int!) {
  getPatient(id: $id) {
    id
    nom
    prenom
    age
    symtomes {
      name
      description
      date
    }
  }
}
    ` as DocumentNode<GetPatientQueryData, GetPatientQueryVariables>;

export function gqlGetPatientQuery(variables: GetPatientQueryVariables): { query: typeof GET_PATIENT_QUERY, variables: typeof variables };
export function gqlGetPatientQuery(variables: () => GetPatientQueryVariables | null): { query: typeof GET_PATIENT_QUERY, variables: typeof variables };
export function gqlGetPatientQuery(variables: any): any {
  return {
    query: GET_PATIENT_QUERY,
    variables
  };
}

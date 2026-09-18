/* eslint-disable */
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type Patient = {
  __typename?: 'Patient';
  age: Maybe<Scalars['Int']['output']>;
  id: Scalars['Int']['output'];
  nom: Scalars['String']['output'];
  prenom: Maybe<Scalars['String']['output']>;
  symtomes: Maybe<Array<Maybe<Symptome>>>;
};

export type Query = {
  __typename?: 'Query';
  getPatient: Maybe<Patient>;
  getPatients: Array<Patient>;
};


export type QueryGetPatientArgs = {
  id: Scalars['Int']['input'];
};

export type Symptome = {
  __typename?: 'Symptome';
  date: Maybe<Scalars['String']['output']>;
  description: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
};

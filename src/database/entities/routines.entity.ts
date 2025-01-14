import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('routines')
export class Routine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  
  @Column()
  name: string; 

  @Column()
  routine: string; 
}

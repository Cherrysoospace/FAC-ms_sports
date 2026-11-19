import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { SkillCategory } from '../enums/skill-category.enum';

@Entity('skills')
@Unique('UQ_skills_name', ['name'])
export class Skill {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'name', type: 'varchar', length: 80 })
  name!: string;

  @Column({ name: 'category', type: 'enum', enum: SkillCategory })
  category!: SkillCategory;

  @Column({ name: 'description', type: 'varchar', length: 500 })
  description!: string;
}

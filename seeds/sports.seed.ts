/**
 * Datos de prueba: deportes válidos para crear torneos.
 *
 * Uso: npm run seed:sports
 *
 * Es idempotente: si un deporte ya existe (sin distinguir mayúsculas) no se
 * vuelve a crear, así que se puede ejecutar varias veces. Está fuera de src/
 * y de las migraciones para que no se cargue en producción.
 */
import dataSource from '../typeorm.config';

interface SportSeed {
  name: string;
  description: string;
  // Nombre del deporte padre (para subdeportes)
  parent?: string;
}

// Los padres van antes que sus subdeportes.
const SPORTS: SportSeed[] = [
  { name: 'Fútbol', description: 'Fútbol de once contra once' },
  { name: 'Baloncesto', description: 'Baloncesto de cinco contra cinco' },
  { name: 'Voleibol', description: 'Voleibol de seis contra seis' },
  { name: 'Tenis de mesa', description: 'Tenis de mesa individual y dobles' },
  { name: 'Natación', description: 'Pruebas de natación en piscina' },
  { name: 'Ajedrez', description: 'Ajedrez clásico y rápido' },
  {
    name: 'Fútbol de salón',
    description: 'Fútbol sala de cinco contra cinco',
    parent: 'Fútbol',
  },
];

async function findSportId(name: string): Promise<number | null> {
  const rows: { id: number }[] = await dataSource.query(
    'SELECT id FROM sports WHERE LOWER(name) = LOWER(?) LIMIT 1',
    [name],
  );
  return rows.length > 0 ? Number(rows[0].id) : null;
}

async function main(): Promise<void> {
  await dataSource.initialize();
  try {
    for (const sport of SPORTS) {
      if ((await findSportId(sport.name)) !== null) {
        console.log(`= ${sport.name} (ya existe)`);
        continue;
      }

      const parentId = sport.parent ? await findSportId(sport.parent) : null;
      await dataSource.query(
        'INSERT INTO sports (name, description, active, parent_id) VALUES (?, ?, 1, ?)',
        [sport.name, sport.description, parentId],
      );
      console.log(`+ ${sport.name}${sport.parent ? ` (subdeporte de ${sport.parent})` : ''}`);
    }
  } finally {
    await dataSource.destroy();
  }
}

void main().catch((error: unknown) => {
  console.error('No se pudieron crear los deportes:', error);
  process.exit(1);
});

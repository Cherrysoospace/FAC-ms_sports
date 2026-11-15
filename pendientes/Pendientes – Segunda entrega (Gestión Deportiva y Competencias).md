# Pendientes – Segunda entrega (Gestión Deportiva y Competencias)

Nov 14, 2026 · @Alexander

Ya funcionan en `ms-sports` Deportes, Pelotas, Torneos, Grupos, Fases finales, Inscripciones, Equipos, Equipo-Deporte, Escenarios y Localidades, y en el frontend el cliente de `ms-sports`, el menú y la vista de Torneos. Lo que sigue es lo único pendiente, con su responsable.

## Fechas límite

| Hito | Fecha |
| --- | --- |
| Backend de cada persona terminado y protegido por el `SecurityGuard` | Nov 18, 2026 |
| Todas las vistas conectadas al backend | Nov 19, 2026 |
| Integración de punta a punta y pruebas cruzadas | Nov 20, 2026 |
| README, colección Postman y ensayo de la demo | Nov 21, 2026 |

## Alejandra

- [x] **Backend** · Escenario-Torneo: commit y pull request (el código ya está probado).
- [ ] **Backend** · Partido (HU-GC-06), con `NotificationsModule` en modo simulado y `BallsService.getAvailableBallOrFail`.
- [ ] **Backend** · `SecurityGuard` global, `@Public()` en `/health` y `@CurrentUser()` con el usuario del JWT. Debe responder 401 solo por token inválido y 503 si `ms_security` falla.
- [ ] **Frontend** · Pestaña “Fases finales” en el detalle del torneo (vista de Final).
- [ ] **Backend y frontend** · Desarrollo del torneo (HU-GC-08): `GET /tournaments/:id/development` y la pantalla del mockup.
- [ ] **Calidad** · Auditoría SOLID del backend y correcciones prioritarias.

## Cristhian

- [ ] **Integración (urgente)** · Registrar en `ms_security` los permisos de las rutas que ya existen, con el módulo “Gestión deportiva”, y crear los roles Administrador deportivo y Aficionado. Sin esto el menú no muestra las vistas nuevas.
- [ ] **Backend** · Jugadores (HU-GD-04), Equipo-Jugador con fechas e historial de traspasos (HU-GD-05), Habilidades (HU-GD-06), Habilidad-Jugador (HU-GD-07) y Perfil del jugador (HU-GD-08).
- [ ] **Frontend** · Vistas de Equipos (con sus deportes), Jugadores, Plantilla del equipo, Habilidades del jugador y Perfil del jugador.
- [ ] **Frontend** · Vistas de Escenarios y Localidades (el backend ya está).
- [ ] **Frontend** · Pestaña “Escenarios” del torneo y vista de Partidos. Depende del backend de Partido de Alejandra.
- [ ] **Backend** · Envío real de correo en `NotificationsService` (nodemailer), sobre la versión simulada de Alejandra.
- [ ] **Backend** · Script simulador de posiciones para la pizarra (HU-GC-09). Depende de `/match-positions` de Fercho.
- [ ] **Integración** · Colección Postman de `ms-sports`.

## Fercho

Antes de programar Boleto y Apuesta, Fercho debe decidir (ojalá con el profesor) su restricción única. En el diagrama ambas son clases de asociación de Partido–Aficionado, y en lectura estricta eso permite un solo boleto y una sola apuesta por aficionado y partido. La guía está en `tutoriales/0_3_Verificacion_diagrama_clases.md` de `ms-sports`.

- [ ] **Backend** · Resultado y anotaciones (HU-GC-07): `PUT /matches/:id/result`, que es lo único que pone un partido en FINISHED, `/goals` y sus notificaciones. Depende del backend de Partido.
- [ ] **Backend** · Aficionado (`/fans`, `/me/fan`) y equipos favoritos (`/me/favorite-teams`). Las rutas `/me` dependen de `@CurrentUser()`.
- [ ] **Backend** · Métodos de pago (`/payment-methods`, `/me/payment-methods`, HU-GC-10).
- [ ] **Backend** · Boletos (`/tickets`, `/me/tickets`, `/tickets/availability`) sin superar la capacidad de la localidad.
- [ ] **Backend** · Apuestas y liquidación (HU-GC-11).
- [ ] **Backend** · Posiciones de jugadores y pelota (`/match-positions`) para la pizarra.
- [ ] **Backend** · Completar los `TODO (Fercho)` del código: destinatarios del correo al crear un partido, capacidad de localidades frente a boletos vendidos y bloqueo al eliminar partidos con anotaciones, boletos, apuestas o posiciones.
- [ ] **Frontend** · Vistas de Resultado y anotaciones, Aficionado, Equipos favoritos, Boletos, Métodos de pago, Apuestas y Pizarra (HU-GC-09).
- [ ] **Frontend** · Pestaña “Inscripciones” del torneo (el backend ya está).

## Todos

- [ ] Pruebas cruzadas: Alejandra prueba lo de Cristhian, Cristhian lo de Fercho y Fercho lo de Alejandra.
- [ ] Probar con un usuario Aficionado que las rutas de administración respondan 403.
- [ ] README del microservicio y ensayo de la demo.

Cada ruta nueva se agrega al catálogo de rutas en el mismo pull request. El catálogo, las reglas de rutas y los acuerdos anteriores están en el historial de versiones de este documento.

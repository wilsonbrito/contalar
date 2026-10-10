# Contalar

[English](README.md) · [Português](README.pt-BR.md) · **Español** · [日本語](README.ja.md)

> Las cuentas de la casa, sin hoja de cálculo. Funciona en tu propio ordenador: sin cuenta, sin nube, sin suscripción.

Contalar (_contas_ + _lar_, "cuentas" + "hogar" en portugués) es una pequeña aplicación web para llevar el control de lo que el hogar tiene que pagar cada mes y de lo que ya está pagado. Sustituye a la hoja de cálculo mensual: las cuentas que se repiten aparecen solas, escribes el importe real, pulsas **Enter** y la cuenta queda como pagada.

![Vista del mes](docs/images/month.png)

## Funciones

- **Vista del mes**: todas las cuentas del mes con su estado (pagada, pendiente, atrasada), tarjetas de resumen, filtro por estado y totales por categoría. Escribe el importe real y pulsa **Enter** para pagar.
- **Cuentas fijas**: alquiler, luz, internet… se crean solas cada mes con un importe estimado (el último que pagaste). Solo corriges el importe cuando llega la factura.
- **Pagos a plazos**: una compra en N cuotas genera N cuentas mensuales (`3/10`).
- **Resumen general**: panel del año con pagado frente a pendiente por mes, previsión hasta diciembre y un mapa de calor categoría × mes.
- **Local y privado**: tus datos se guardan en un archivo SQLite en tu equipo. El servidor solo escucha en `localhost` y la aplicación no hace peticiones externas.
- **Copias de seguridad**: copia diaria de la base de datos, con envío opcional a un repositorio git privado.

![Resumen general](docs/images/overview.png)

## Cómo funciona

La aplicación tiene tres pantallas. **La interfaz está actualmente en portugués de Brasil** (consulta [Limitaciones](#limitaciones)); esta tabla relaciona los nombres:

| Pantalla        | En la aplicación | Para qué sirve                                                             |
| --------------- | ---------------- | -------------------------------------------------------------------------- |
| Vista del mes   | _Contas do mês_  | Pagar cuentas, añadir cuentas sueltas o a plazos, ver el mes de un vistazo |
| Resumen general | _Visão geral_    | El panorama del año                                                        |
| Cuentas fijas   | _Contas fixas_   | Definir las cuentas que se repiten cada mes                                |

### Un mes típico

1. **Una sola vez:** registra tus cuentas fijas (_Contas fixas_): nombre, importe estimado, día de vencimiento y categoría.
2. **Abre el mes.** Cada cuenta fija aparece con su importe estimado. Abrir el mismo mes otra vez nunca duplica nada.
3. **Cuando llegue la cuenta o la pagues:** escribe el importe real y pulsa **Enter** (o haz clic en _Pagar_). La fecha de pago empieza en hoy y se puede cambiar. _Salvar_ (Guardar) guarda solo el importe sin marcar la cuenta como pagada.
4. **Compras sueltas o a plazos:** usa _Nova conta_ (Nueva cuenta). Si pones "parcelas" (cuotas) mayor que 1, se crea una cuenta por mes, identificada como `n/N`.
5. **Mira el resumen general** para ver adónde va el dinero y cómo se presentan los próximos meses.

![Cuentas fijas](docs/images/recurring.png)

### Detalles que conviene conocer

- El **estado** se calcula: _Pago_ (pagada) si tiene fecha de pago; _Atrasado_ si no está pagada y el vencimiento ya pasó; en otro caso, _Pendente_ (pendiente).
- **Borrar una cuenta que vino de una cuenta fija** elimina solo ese mes; la cuenta fija sigue funcionando en los demás. Borrar la propia cuenta fija conserva las cuentas ya generadas.
- **Editar una cuenta fija** también actualiza sus cuentas futuras aún sin pagar (importe, nombre y categoría), salvo las que ya ajustaste a mano. El día de vencimiento solo vale para los meses nuevos.
- **Previsión:** al abrir el Resumen general del año en curso se crean las cuentas fijas de los meses restantes, con importe estimado, para que veas el año por delante.
- Los importes se guardan como **céntimos** enteros (sin errores de redondeo) y las fechas como `AAAA-MM-DD`.

### Términos de la interfaz

| Portugués                  | Español                         |
| -------------------------- | ------------------------------- |
| Contas do mês              | Vista del mes                   |
| Visão geral                | Resumen general                 |
| Contas fixas               | Cuentas fijas                   |
| Nova conta                 | Nueva cuenta                    |
| Pagar / Salvar / Desfazer  | Pagar / Guardar / Deshacer      |
| Pago / Pendente / Atrasado | Pagada / Pendiente / Atrasada   |
| Total do mês / Falta pagar | Total del mes / Falta por pagar |
| Por categoria              | Por categoría                   |

## Inicio rápido

Requisitos: **Node.js 22.17 o superior**, además de `bash`, `curl` y `lsof` (macOS o Linux; en Windows, usa WSL).

```sh
git clone https://github.com/wilsonbrito/contalar.git
cd contalar
./iniciar.sh
```

El script instala las dependencias, crea la base de datos, compila la aplicación, la inicia en <http://localhost:3000> y abre el navegador. Para detenerla, `Ctrl+C`. Usa `PORT=4000 ./iniciar.sh` para otro puerto.

### Pruébalo con datos de demostración

¿Quieres echar un vistazo antes de registrar tus cuentas? Carga una familia ficticia:

```sh
npm install
npm run demo        # crea demo.db con un hogar inventado
npm run demo:dev    # abre la aplicación sobre demo.db
```

`demo.db` es independiente de tu base de datos real (`local.db`), y el script de demostración se niega a tocar `local.db`.

## Copias de seguridad

Cada vez que arranca, la aplicación hace una copia consistente de la base de datos en `backups/` (`local-AAAA-MM-DD.db`, una por día; se conservan las 30 más recientes). Para restaurar, detén la aplicación y copia una copia de seguridad sobre `local.db`.

Para tener una copia fuera del equipo, convierte `backups/` en un repositorio git **privado** con un remoto. Después de arrancar, `iniciar.sh` ejecuta `scripts/enviar-backup.sh`, que hace commit y push de las copias nuevas (y lo reintenta si un envío anterior falló):

```sh
cd backups
git init -b main && git add -A && git commit -m "primera copia"
gh repo create mis-copias-contalar --private --source=. --push   # o cualquier remoto privado
```

> **Mantén ese repositorio privado**: la base de datos contiene todas tus finanzas. Usa `SEM_ENVIO_BACKUP=1` para desactivar el envío automático.

## Privacidad

- Los datos están en `local.db` y `backups/`, ambos excluidos de git.
- El servidor escucha en `127.0.0.1`; nada es accesible desde tu red.
- Sin cuentas, sin telemetría, sin peticiones externas (sin CDN, sin fuentes externas, sin analítica).

## Limitaciones

- **La interfaz está en portugués de Brasil** y la moneda se muestra en reales (`R$`). Traducir la interfaz y admitir otras monedas es la contribución más bienvenida.
- Pensada para **un hogar en un ordenador**: no hay inicio de sesión ni varios usuarios.
- Solo controla cuentas por pagar, no ingresos, presupuestos ni inversiones.
- Probada en macOS; en Linux debería funcionar; en Windows no se ha probado (usa WSL).

## Desarrollo

```sh
npm install
cp .env.example .env     # DATABASE_URL=local.db
npm run db:push          # crea/actualiza las tablas
npm run dev              # http://localhost:5173
npm run check            # tipos
npm test                 # pruebas (fechas, cuotas, resúmenes, copias)
```

| Ruta                    | Qué contiene                                       |
| ----------------------- | -------------------------------------------------- |
| `src/lib/financeiro.ts` | Lógica pura: fechas, estado, cuotas, resúmenes     |
| `src/lib/server/db/`    | Esquema (Drizzle), consultas y copias de seguridad |
| `src/routes/`           | Pantallas: `/` (mes), `/fixas`, `/visao-geral`     |
| `scripts/`              | `demo.ts` (datos ficticios), `enviar-backup.sh`    |
| `iniciar.sh`            | Lanzador de un solo comando                        |

**Tecnologías:** SvelteKit 3 · TypeScript · Tailwind CSS 4 · Drizzle ORM + better-sqlite3 · Vitest.

Las contribuciones son bienvenidas, sobre todo traducciones de la interfaz. Abre un issue para hablar antes de cambios grandes.

## Licencia

[MIT](LICENSE) © Wilson Brito

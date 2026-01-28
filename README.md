# pos-front - workflow pro (Linear + GitHub skills)

Este README documenta **como pedir trabajo** y **como operamos** con las skills de Linear y GitHub para este repo.

## Objetivo

- Tener un proceso repetible (como equipos grandes): issue -> branch -> cambios -> PR/merge -> cierre.
- Evitar mezclar cambios y evitar subir secretos (.env).

## 1) Linear (skill `linear-tracker`)

### Crear issue (pro)

Pedirlo asi:

```
Con la skill de linear crea issue:
Title: <titulo>
Project: <opcional, ej. backlog_POS>
Status: Todo
Assignee: me
Labels: <opcional, separados por coma>
Priority: <opcional: low|medium|high|urgent>
Description: <opcional, si no lo das usa template>
```

Defaults usados:
- Status: **Todo**
- Assignee: **me**
- Project: **opcional** (solo si lo pides)
- Description: si no se envia, se agrega template:

```
Objetivo:

Contexto:

Criterios:
- [ ]
```

### Actualizar issue (pro)

```
Con la skill de linear cambia IMP-163 a In Progress
Nota: Inicio trabajo...
Next: siguiente paso...
```

Estados validos del team:
- Backlog, Todo, In Progress, In Review, Done, Canceled, Duplicate

## 2) GitHub (skill `github-repo-sync`)

### Formato minimo para pedir cambios

```
Repo: front | back | both
Ticket: IMP-xxx
Tema: <tema-corto>
Fecha: YYYYMMDD
Comparte archivos con otra tarea? si/no
Depende de otra tarea? IMP-yyy | no
```

### Naming de branch

- Front: `front/<tema>-<YYYYMMDD>`
- Back: `back/<tema>-<YYYYMMDD>`

Ejemplo:
- `front/crear-readme-prueba-20260128`

### Reglas pro (no negociables)

- `.env` nunca se sube. Usar `.env.example`.
- Si no cambias dependencias, no tocar `package-lock.json`.
- Cambios de seguridad/config en commit separado cuando aplique.

## 3) Flujo combinado (pro, recomendado)

1) Crear issue en Linear (Todo)
2) Mover issue a In Progress
3) Crear branch limpia desde main
4) Hacer cambios
5) Commit limpio con solo lo de la tarea
6) Actualizar Linear (In Review / Done) con nota y next

## 4) Como me pides una tarea (ejemplo completo)

```
Repo: front
Ticket: IMP-163
Tema: crear-readme-prueba
Fecha: 20260128
Comparte archivos con otra tarea? no
Depende de otra tarea? no
Objetivo: Crear README en carpeta principal de pos-front
Estado Linear: In Progress
```

Con eso se ejecuta el flujo completo sin fricciones.

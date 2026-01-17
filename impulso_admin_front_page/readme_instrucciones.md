# Readme instrucciones

Guia rapida para entender como esta organizado el proyecto y donde vive cada cosa.

## Stack y entrada
- Vite + React + TypeScript.
- Entrada de la app: `src/main.tsx` (ConfigProvider de Ant Design + Router).
- Rutas y layout principal: `src/App.tsx`.
- Alias: `@` apunta a `src` (ver `vite.config.ts`).

## Estructura principal
- `src/pages/admin`:
  - `Traspasos`: listado y editor.
  - `Blog`: listado y editor.
  - `Candidates`: listado, editor, fotos.
  - `Restaurantes`: listado, menus y modulo de inventarios.
- `src/pages/admin/Restaurantes/Inventarios`:
  - `Items`, `Presentations`, `Purchases`, `Warehouses`, `Suppliers`, `Counts`, `Diffs`, `BOM`.
- `src/pages/public`:
  - flujo de aplicacion (`ApplyWizard` + pasos en `steps/`),
  - examenes publicos (`exams/`),
  - `Psychometric`, `Offer`.
- `src/lib`:
  - APIs y helpers (por ejemplo `api.ts`, `blogApi.ts`, `rrhhApi.ts`, `money.ts`).
- `src/types.ts`:
  - tipos compartidos (ej. `Traspaso`, `Photo`).
- `src/assets` y `public/`:
  - assets estaticos.
- `src/index.css` y `src/App.css`:
  - estilos globales y de layout.

## Rutas principales
- Public:
  - `/apply/:step`
  - `/exam/:type/:token`
  - `/psychometric/:token`
  - `/offer/:token`
- Admin:
  - `/admin/traspasos`
  - `/admin/blog`
  - `/admin/candidates`
  - `/admin/restaurantes`
  - `/admin/restaurantes/:slug/menus`
  - `/admin/restaurantes/:slug/inventario` (con subrutas de inventarios)

## Scripts utiles
- `npm run dev`: entorno local con Vite.
- `npm run build`: build + TypeScript.
- `npm run lint`: lint.
- `npm run preview`: preview del build.

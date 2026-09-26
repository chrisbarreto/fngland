# Astro Starter Kit: Basics

```sh
npm create astro@latest -- --template basics
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
├── src
│   ├── assets
│   │   └── astro.svg
│   ├── components
│   │   └── Welcome.astro
│   ├── layouts
│   │   └── Layout.astro
│   └── pages
│       └── index.astro
└── package.json
```

To learn more about the folder structure of an Astro project, refer to [our guide on project structure](https://docs.astro.build/en/basics/project-structure/).

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## Planes públicos de membresía

La presentación comercial se edita manualmente en src/lib/public-plans.ts. La API solo permite contratar los IDs incluidos allí y vigentes en el backend. Antes de compilar para producción, configurar en el entorno de Astro (directorio padre, según astro.config.mjs) los IDs reales del ambiente:

- PUBLIC_ESSENTIAL_PLAN_ID
- PUBLIC_PLUS_PLAN_ID
- PUBLIC_BLACK_PLAN_ID
- PUBLIC_DOMICILIO_PLAN_ID
- PUBLIC_GOLD_PLAN_ID
- PUBLIC_LEGACY_FORMULA_PLAN_ID
- PUBLIC_LEGACY_PREMIUM_PLAN_ID
- PUBLIC_LEGACY_GOLD_PLAN_ID

Los UUID no se guardan en el código. En desarrollo se leen del `.env` del directorio padre; en Docker/Dokploy se deben proporcionar como **argumentos de build** y redesplegar después de cambiarlos. Variables configuradas solo para la ejecución del contenedor no actualizan `import.meta.env` ya compilado. Las tres variables `PUBLIC_LEGACY_*` solo conservan compatibilidad con contratos históricos y no publican esos planes. Gold nuevo usa `PUBLIC_GOLD_PLAN_ID` y se presenta con 15 cuotas de Gs. 400.000 para consulta; su contratación no pasa por el alta prepaga. Si falta un ID de membresía prepaga, la tarjeta correspondiente queda sin botón de contratación. Cada plan mensual también debe estar activo y vigente en el backend; el alta pública de Gold exige además sus banderas y versión legal aprobada. Los precios y beneficios de Astro deben revisarse contra la ficha publicada en el panel antes de cada despliegue; el cobro efectivo siempre se calcula en el backend.

Antes de publicar cambios en `/terminos-y-condiciones`, preparar y activar una versión legal nueva en `version_terminos` con documento archivado y hash verificable. El registro público guarda el ID de esa versión; conservar las anteriores para acreditar aceptaciones históricas. Para este lanzamiento, la permanencia es de 12 meses en Essential, Plus y Black, y de 1 mes en Domicilio.

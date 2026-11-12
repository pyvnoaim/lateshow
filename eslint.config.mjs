import fs from "node:fs";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Project structure rules from CLAUDE.md, enforced so they can't drift.
const features = fs
  .readdirSync("src/features", { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);
const DATA_SOURCES = ["@/lib/tmdb", "@/lib/justwatch", "@/lib/db", "@/lib/db/*"];
const NEXT_FILES = "{page,layout,loading,error,global-error,not-found,template,default,opengraph-image}";

const restrict = (...patterns) => ({ "no-restricted-imports": ["error", { patterns }] });
const noParentImports = { group: ["../*"], message: "Use an @/ import instead of ../" };

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),

  // Named exports everywhere. Next's own route files and config files need default exports.
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "import/no-default-export": "error",
      ...restrict(noParentImports),
      // Design values live as tokens in globals.css. No one-off text-[15px] or pt-[88px] in components.
      "no-restricted-syntax": [
        "error",
        ...["Literal", "TemplateElement"].map((node) => ({
          selector: `JSXAttribute[name.name='className'] ${node}[value=/\\S-\\[/], JSXAttribute[name.name='className'] ${node}[value.raw=/\\S-\\[/]`,
          message: "Use a design token from src/app/globals.css instead of an arbitrary [value].",
        })),
      ],
    },
  },
  {
    files: [`src/app/**/${NEXT_FILES}.tsx`, "src/app/**/route.ts", "src/app/manifest.ts"],
    rules: { "import/no-default-export": "off" },
  },

  // Pages stay thin: they call features, never data sources (types are fine).
  {
    files: ["src/app/**"],
    rules: restrict(noParentImports, {
      group: DATA_SOURCES,
      allowTypeImports: true,
      message: "Pages call features, not data sources. Move the fetch into src/features/<name>/.",
    }),
  },

  // A feature never reaches into another feature.
  ...features.map((f) => ({
    files: [`src/features/${f}/**`],
    rules: restrict(noParentImports, {
      group: ["@/features/*", `!@/features/${f}`, `!@/features/${f}/**`],
      message: "Features can't import each other. Move shared code to src/components or src/lib.",
    }),
  })),

  // Shared code never depends on a feature.
  {
    files: ["src/components/**", "src/lib/**"],
    rules: restrict(noParentImports, { group: ["@/features/*"], message: "Shared code can't depend on a feature." }),
  },
]);

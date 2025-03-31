import tseslint from '@typescript-eslint/eslint-plugin';
import stylisticTs from '@stylistic/eslint-plugin-ts';
import parser from '@typescript-eslint/parser';
import importX from 'eslint-plugin-import-x';

export default [ 
    {
        name: "eslint-config",
        files: ["src/**/*.{ts,tsx,js,jsx}", "test/**/*.{ts,tsx,js,jsx}"],
        ignores: ["dist/*", "build/*", "coverage/*", "public/*", ".github/*", "node_modules/*", ".vscode/*"],
        languageOptions: {
            parser: parser
        },
        plugins: {
            "import-x": importX,
            '@stylistic/ts': stylisticTs,
            '@typescript-eslint': tseslint
        },
        rules: {
        }
    },
    {
        name: "eslint-tests",
        files: ["test/**/**.test.ts"],
        languageOptions: {
            parser: parser,
            parserOptions: {
                "project": ["./tsconfig.json"]
            }
        },
        plugins: {
            "@typescript-eslint": tseslint
        },
        rules: {
            "@typescript-eslint/no-floating-promises": "error", // Require Promise-like statements to be handled appropriately. - https://typescript-eslint.io/rules/no-floating-promises/
            "@typescript-eslint/no-misused-promises": "error", // Disallow Promises in places not designed to handle them. - https://typescript-eslint.io/rules/no-misused-promises/
        }
    }
]

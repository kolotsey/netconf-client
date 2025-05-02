import globals from "globals";
import decoratorPosition from "eslint-plugin-decorator-position";
import unicorn from "eslint-plugin-unicorn";
import _import from "eslint-plugin-import";
import sonarjs from "eslint-plugin-sonarjs";
import stylistic from "@stylistic/eslint-plugin";
import { fixupPluginRules } from "@eslint/compat";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [{
    ignores: ["dist"],
}, {
    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.node,
        },
    },
}, ...compat.extends(
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
).map(config => ({
    ...config,
    files: ["**/*.ts"],
})), {
    files: ["**/*.ts"],

    plugins: {
        "decorator-position": decoratorPosition,
        unicorn,
        import: fixupPluginRules(_import),
        sonarjs,
        "@stylistic": stylistic,
    },

    languageOptions: {
        ecmaVersion: 5,
        sourceType: "script",

        parserOptions: {
            project: ["lint.tsconfig.json"],
            createDefaultProgram: true,
        },
    },

    rules: {
        "decorator-position/decorator-position": ["error", {
            properties: "prefer-inline",
            methods: "above",

            overrides: {
                "prefer-inline": ["@Input", "@Output"],
                above: ["@Injectable", "@Component", "@Directive", "@Pipe"],
            },
        }],

        "@typescript-eslint/adjacent-overload-signatures": "off",

        "@typescript-eslint/array-type": ["error", {
            default: "array",
        }],

        "@typescript-eslint/await-thenable": "error",
        "@typescript-eslint/no-empty-object-type": "error",
        "@typescript-eslint/no-wrapper-object-types": "error",

        "@typescript-eslint/no-restricted-types": ["error", {
            types: {
                Object: {
                    message: "Avoid using the `Object` type. Did you mean `object`?",
                    fixWith: "object",
                },

                Function: {
                    message: "Avoid using the `Function` type. Prefer a specific function type, like `() => void`.",
                },

                Boolean: {
                    message: "Use boolean instead",
                    fixWith: "boolean",
                },

                Number: {
                    message: "Use number instead",
                    fixWith: "number",
                },

                String: {
                    message: "Use string instead",
                    fixWith: "string",
                },

                Symbol: {
                    message: "Avoid using the `Symbol` type. Did you mean `symbol`?",
                },
            },
        }],

        "@typescript-eslint/consistent-type-assertions": "error",
        "@typescript-eslint/dot-notation": "error",

        "@typescript-eslint/explicit-function-return-type": ["error", {
            allowExpressions: true,
            allowHigherOrderFunctions: true,
            allowTypedFunctionExpressions: true,
            allowFunctionsWithoutTypeParameters: false,
        }],

        "@typescript-eslint/explicit-member-accessibility": "error",
        "@typescript-eslint/explicit-module-boundary-types": "off",

        "@typescript-eslint/member-ordering": ["error", {
            default: [
                "public-static-field",
                "public-static-method",
                "protected-static-field",
                "protected-static-method",
                "private-static-field",
                "private-static-method",
                "public-decorated-set",
                "public-decorated-field",
                "protected-decorated-set",
                "protected-decorated-field",
                "private-decorated-field",
                "public-instance-field",
                ["public-instance-get", "public-instance-set"],
                "protected-instance-field",
                ["protected-instance-get", "protected-instance-set"],
                "private-instance-field",
                ["private-instance-get", "private-instance-set"],
                "public-constructor",
                "protected-constructor",
                "private-constructor",
                "public-method",
                "protected-method",
                "private-method",
            ],
        }],

        "@typescript-eslint/naming-convention": ["error", {
            selector: "variable",
            format: ["PascalCase", "camelCase", "UPPER_CASE"],
            leadingUnderscore: "allowSingleOrDouble",
        }, {
            selector: "function",
            format: ["PascalCase", "camelCase"],
        }, {
            selector: ["parameter", "classProperty", "classMethod"],
            format: ["camelCase"],
            leadingUnderscore: "allowSingleOrDouble",
        }, {
            selector: "enumMember",
            format: ["camelCase", "UPPER_CASE", "PascalCase"],
        }, {
            selector: ["class", "enum"],
            format: ["PascalCase"],
        }],

        "@typescript-eslint/no-empty-interface": "off",

        "@typescript-eslint/no-empty-function": ["error", {
            allow: ["arrowFunctions", "constructors", "methods"],
        }],

        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/no-for-in-array": "error",

        "@typescript-eslint/no-inferrable-types": ["error", {
            ignoreParameters: true,
        }],

        "@typescript-eslint/no-invalid-void-type": "error",
        "no-magic-numbers": "off",

        "@typescript-eslint/no-magic-numbers": ["warn", {
            ignoreEnums: true,
            ignoreNumericLiteralTypes: true,
            ignoreReadonlyClassProperties: true,
            ignore: [-1, 0, 1, 2, 3, 4, 5, 10, 100, 1000],
        }],

        "@typescript-eslint/no-misused-new": "error",
        "@typescript-eslint/no-misused-promises": "off",
        "@typescript-eslint/no-namespace": "error",
        "@typescript-eslint/no-non-null-assertion": "error",
        "@typescript-eslint/no-parameter-properties": "off",

        "@typescript-eslint/no-shadow": ["error", {
            hoist: "never",
        }],

        "@typescript-eslint/no-unnecessary-type-assertion": "error",
        "@typescript-eslint/no-unsafe-argument": "off",
        "@typescript-eslint/no-unsafe-assignment": "off",
        "@typescript-eslint/no-unsafe-call": "off",
        "@typescript-eslint/no-unsafe-member-access": "off",
        "@typescript-eslint/no-unsafe-return": "off",

        "@typescript-eslint/no-unused-expressions": ["error", {
            allowTaggedTemplates: true,
            allowTernary: true,
            allowShortCircuit: true,
        }],

        "@typescript-eslint/no-unused-vars": ["warn", {
            vars: "all",
            args: "after-used",
            ignoreRestSiblings: true,
            argsIgnorePattern: "^_",
            destructuredArrayIgnorePattern: "^_",
        }],

        "@typescript-eslint/no-use-before-define": "off",
        "@typescript-eslint/no-var-requires": "off",
        "@typescript-eslint/prefer-for-of": "error",
        "@typescript-eslint/prefer-function-type": "error",
        "@typescript-eslint/prefer-namespace-keyword": "error",
        "@typescript-eslint/prefer-regexp-exec": "off",
        "@typescript-eslint/restrict-template-expressions": "warn",

        "@stylistic/no-extra-parens": ["error", "all", {
            nestedBinaryExpressions: false,
            ignoreJSX: "all",
            enforceForSequenceExpressions: false,
            returnAssign: false,
        }],

        "@typescript-eslint/no-floating-promises": ["warn", {
            ignoreVoid: true,
        }],

        "@stylistic/quotes": ["error", "single"],
        "@typescript-eslint/restrict-plus-operands": "off",

        "@typescript-eslint/require-array-sort-compare": ["error", {
            ignoreStringArrays: true,
        }],

        "@stylistic/semi": ["error", "always"],

        "@typescript-eslint/triple-slash-reference": ["error", {
            path: "always",
            types: "prefer-import",
            lib: "always",
        }],

        "@typescript-eslint/unbound-method": ["off", {
            ignoreStatic: true,
        }],

        "@typescript-eslint/unified-signatures": "error",
        "class-methods-use-this": "off",
        "arrow-body-style": ["error", "as-needed"],
        "arrow-parens": ["error", "as-needed"],
        "comma-dangle": ["error", "always-multiline"],
        complexity: "off",
        "constructor-super": "error",
        curly: ["error", "multi-line"],
        "default-case-last": "error",
        "dot-notation": "error",
        eqeqeq: ["error", "smart"],
        "guard-for-in": "error",

        "id-denylist": [
            "error",
            "any",
            "Number",
            "String",
            "string",
            "Boolean",
            "boolean",
            "Undefined",
            "undefined",
        ],

        "id-match": "error",
        "import/no-deprecated": "warn",
        "import/order": "off",
        indent: ["error", 2],

        "@stylistic/member-delimiter-style": ["error", {
            multiline: {
                delimiter: "semi",
                requireLast: true,
            },

            singleline: {
                delimiter: "comma",
                requireLast: false,
            },
        }],

        "lines-between-class-members": ["error", "always"],
        "max-classes-per-file": ["error", 1],

        "max-len": ["error", {
            code: 120,
            ignoreComments: true,
            ignorePattern: "^import .*",
            ignoreRegExpLiterals: true,
            ignoreStrings: true,
            ignoreTemplateLiterals: true,
            ignoreUrls: true,
            tabWidth: 4,
        }],

        "max-lines-per-function": ["warn", {
            max: 200,
        }],

        "max-params": "off",
        "new-parens": "error",
        "no-bitwise": "off",
        "no-caller": "error",
        "no-cond-assign": "error",

        "no-console": ["warn", {
            allow: [
                "warn",
                "dir",
                "timeLog",
                "assert",
                "clear",
                "count",
                "countReset",
                "group",
                "groupEnd",
                "table",
                "info",
                "dirxml",
                "error",
                "groupCollapsed",
                "Console",
                "profile",
                "profileEnd",
                "timeStamp",
                "context",
            ],
        }],

        "no-debugger": "error",
        "no-duplicate-imports": "error",

        "no-empty": ["error", {
            allowEmptyCatch: true,
        }],

        "no-empty-pattern": "error",
        "no-eval": "error",
        "@stylistic/no-extra-semi": "error",
        "no-fallthrough": "error",
        "no-invalid-this": "off",
        "no-irregular-whitespace": "error",
        "no-multi-str": "error",
        "no-multiple-empty-lines": "error",
        "no-new-wrappers": "error",
        "no-restricted-imports": ["error", "rxjs/Rx"],
        "no-self-assign": "error",
        "no-sequences": "off",
        "no-shadow": "off",
        "no-throw-literal": "error",
        "no-trailing-spaces": "error",
        "no-undef-init": "error",

        "no-underscore-dangle": ["off", {
            enforceInMethodNames: false,
            allowFunctionParams: true,
        }],

        "no-unsafe-finally": "error",
        "no-unused-expressions": "off",
        "no-unused-labels": "error",
        "no-use-before-define": "off",
        "no-var": "error",
        "object-shorthand": "error",
        "one-var": ["error", "never"],
        "padded-blocks": ["error", "never"],

        "padding-line-between-statements": ["error", {
            blankLine: "any",
            prev: "*",
            next: "return",
        }],

        "prefer-const": "error",
        "prefer-spread": "warn",
        "prefer-template": "error",
        "quote-props": ["error", "as-needed"],
        radix: "error",
        "sonarjs/cognitive-complexity": "warn",
        "sonarjs/max-switch-cases": "error",
        "sonarjs/no-all-duplicated-branches": "error",
        "sonarjs/no-collapsible-if": "error",
        "sonarjs/no-collection-size-mischeck": "error",
        "sonarjs/no-duplicated-branches": "error",
        "sonarjs/no-element-overwrite": "error",
        "sonarjs/no-empty-collection": "error",
        "sonarjs/no-identical-conditions": "error",
        "sonarjs/no-identical-expressions": "error",
        "sonarjs/no-identical-functions": "error",
        "sonarjs/no-ignored-return": "error",
        "sonarjs/no-inverted-boolean-check": "error",
        "sonarjs/no-gratuitous-expressions": "error",
        "sonarjs/no-one-iteration-loop": "error",
        "sonarjs/no-nested-switch": "error",
        "sonarjs/no-nested-template-literals": "error",
        "sonarjs/no-redundant-boolean": "error",
        "sonarjs/no-redundant-jump": "error",
        "sonarjs/no-same-line-conditional": "error",
        "sonarjs/no-small-switch": "error",
        "sonarjs/no-unused-collection": "error",
        "sonarjs/no-use-of-empty-return-value": "error",
        "sonarjs/no-useless-catch": "error",
        "sonarjs/non-existent-operator": "error",
        "sonarjs/prefer-immediate-return": "error",
        "sonarjs/prefer-object-literal": "error",
        "sonarjs/prefer-single-boolean-return": "error",

        "space-before-function-paren": ["error", {
            anonymous: "always",
            named: "never",
            asyncArrow: "always",
        }],

        "space-in-parens": ["error", "never"],

        "spaced-comment": ["error", "always", {
            markers: ["/"],
        }],

        "unicorn/better-regex": "warn",
        "unicorn/consistent-destructuring": "error",
        "unicorn/empty-brace-spaces": "error",
        "unicorn/prefer-switch": "error",

        "unicorn/filename-case": ["error", {
            case: "kebabCase",
        }],

        "unicorn/no-lonely-if": "error",
        "unicorn/no-useless-spread": "error",
        "unicorn/prefer-array-find": "error",
        "unicorn/prefer-array-flat": "error",
        "unicorn/prefer-array-some": "error",
        "unicorn/prefer-date-now": "error",
        "unicorn/prefer-default-parameters": "error",
        "unicorn/prefer-includes": "error",
        "unicorn/prefer-negative-index": "error",
        "unicorn/prefer-regexp-test": "error",
        "unicorn/prefer-string-trim-start-end": "error",
        "unicorn/throw-new-error": "error",
        "use-isnan": "error",
        "valid-typeof": "off",
        yoda: "error",
    },
}];
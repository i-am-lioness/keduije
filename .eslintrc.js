module.exports = {
    "extends": "airbnb",
    "plugins": [
        "react",
        "jsx-a11y",
        "import"
    ],
    "rules": {
        "object-shorthand": 0,
        "no-underscore-dangle": 0,
        "prefer-template": 1,
        "comma-dangle": [1, {
            "functions": "ignore",
            "objects": "always-multiline"
        }],
        "no-unused-vars": [2, { "args": "none" }],
        "dot-notation": 1,
        "no-param-reassign": [2, { "props": false }],
        "no-unused-expressions": 1,
        "class-methods-use-this": 1,
        "react/sort-comp": 0,
        "import/no-extraneous-dependencies": [0, {"devDependencies": ["**/*.test.js", "**/*.spec.js", "test/*"]}]
    }
};
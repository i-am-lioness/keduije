module.exports = {
    "extends": "airbnb",
    "plugins": [
        "react",
        "jsx-a11y",
        "import"
    ],
    "rules": {
        "prefer-arrow-callback": 0,
        "func-names": 0,
        "no-console": 0,
        "global-require": 0,
        "no-unused-expressions": 0,
        "no-debugger": 0,
        "react/jsx-filename-extension": 0, // to do: revist
        "no-underscore-dangle": [1, { "allow": ["__Rewire__", "_id", "__ResetDependency__"] }],
        "no-global-assign": 0,
    }
};
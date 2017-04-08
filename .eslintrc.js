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
        "comma-dangle": [2, {
            "functions": "ignore",
            "objects": "always-multiline"
        }]
        //"comma-dangle": [2, {"functions": "ignore"}]
       /* "comma-dangle": [2, {"functions": "never"}]*/
    }
};
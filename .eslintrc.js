module.exports = {
  "env": {
    "browser": true,
    "node" : true
  },
  "extends": "eslint:recommended",
  "parserOptions": {
    "sourceType": "module"
  },
  "rules": {
    "indent": [
      "error",
      2,
      { "SwitchCase": 1 }
    ],
    "linebreak-style": [
      "error",
      "unix"
    ],
    "quotes": [
      "error",
      "single"
    ],
    "no-case-declarations": "off",
    "no-console": "off",
    "no-trailing-spaces": "error",
  }
};

const multirelease = require("multi-semantic-release");

// prettier-ignore
multirelease([
    `${__dirname}/../../website/package.json`,
    `${__dirname}/../../contracts/package.json`,
    `${__dirname}/../../dev-utils/package.json`
]);

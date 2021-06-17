const semverDiff = require('semver-diff');
const boxen = require('boxen');
const semver = require('semver');
const pkgJson = require('package-json');
const chalk = require('chalk');

const { name, version } = require('./package.json');

const capitalizeFirstLetter = (currentString) => {
    return currentString[0].toUpperCase() + currentString.substring(1);
}

const checkUpdate = async () => {
    const { version: latestVersion } = await pkgJson(name);

    // check if local package version is less than the remote version
    const updateAvailable = semver.lt(version, latestVersion);

    if (updateAvailable) {
        let updateType = '';

        // check the type of version difference which is usually patch, minor, major etc.
        let verDiff = semverDiff(version, latestVersion);

        if (verDiff) {
            updateType = capitalizeFirstLetter(verDiff);
        }

        const msg = {
            updateAvailable: `${updateType} update available ${chalk.dim(version)} → ${chalk.green(latestVersion)}`,
            runUpdate: `Run ${chalk.cyan(`npm i -g ${name}`)} to update`,
        };

        // notify the user about the available udpate
        console.log(boxen(`${msg.updateAvailable}\n${msg.runUpdate}`, {
            margin: 1,
            padding: 1,
            align: 'center',
        }));
    }
};

const Helpers = {
    checkUpdate,
}

module.exports = Helpers;
#!/usr/bin/env node

const clear = require('clear');
const chalk = require('chalk');
const figlet = require('figlet');
const prompt = require('prompt');
const colors = require("colors/safe");
const simpleGit = require('simple-git');
const git = simpleGit();
const CLI = require('clui');
const Spinner = CLI.Spinner;
const fs = require("fs");
// const prompt = require('prompt-sync')();

clear();

console.log(
    chalk.yellow(
        figlet.textSync('AMELA', { horizontalLayout: 'full' })
    )
);

const listQuestions = ['Project name', 'Project remote URL']

prompt.message = colors.white("");
prompt.delimiter = colors.white(":");
prompt.start();

prompt.get(listQuestions, function (err, result) {
    if (err) { return onPromptErr(err); }
    console.log('Project name: ' + result[listQuestions[0]]);
    console.log('Project remote URL: ' + result[listQuestions[1]]);

    const currPath = "./react-native-templet-v1";
    const newPath = `./${result[listQuestions[0]]}`;

    if (!fs.existsSync(currPath)) {
        try {
            git.clone('https://github.com/amela-technology/react-native-templet-v1.git')
            .then(() => {
                try {
                    fs.renameSync(currPath, newPath);
                    console.log("Successfully renamed the directory.");
                } catch (err) {
                    console.log('Rename err: ', err);
                }
            })
            .catch(cloneErr => {
                console.log('Clone err: ', cloneErr)
            });
        } catch (err) {
            console.log('Clone err: ', err);
        }
    } else {
        console.log('Folder has already existed!')
        try {
            fs.renameSync(currPath, newPath);
            console.log("Successfully renamed the directory.");
        } catch (err) {
            console.log('Rename err: ', err);
        }
    }
});

function onPromptErr(err) {
    console.log(err);
    return 1;
}

// const projectName = prompt('Project name: ');
// const projectRemoteURL = prompt('Project remote URL: ');

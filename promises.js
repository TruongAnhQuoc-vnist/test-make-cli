const simpleGit = require('simple-git');
const git = simpleGit();
const prompt = require('prompt');
const colors = require("colors/safe");
const { Spinner } = require('clui');
const { exec } = require('child_process');
const fs = require("fs");

// import simpleGit from 'simple-git';
// const git = simpleGit();
// import prompt from 'prompt';
// import colors from 'colors/safe';
// import { Spinner } from 'clui';
// import { exec } from 'child_process';
// import fs from 'fs';

const gitClonePromise = async (localPath = undefined) => {
    const gitCloneStatus = new Spinner('Cloning @amela/react-native-templet-v1...');
    return new Promise((resolve, reject) => {
        gitCloneStatus.start();
        git.clone('https://github.com/amela-technology/react-native-templet-v1.git', localPath)
            .then(() => {
                console.log('\nCloning successfully!')
                resolve(null);
                gitCloneStatus.stop();
            })
            .catch(err => {
                console.log('Git clone err: ', err);
                reject(err);
                gitCloneStatus.stop();
            })
    })
}

const promptGetListQuestionPromise = async (listQuestions) => {
    return new Promise((resolve, reject) => {
        prompt.message = colors.white("");
        prompt.delimiter = colors.white(":");
        prompt.start();
        prompt.get(listQuestions, function (err, result) {
            if (err) {
                console.log('Prompt questions list err: ', err);
                reject(err);
            }
            else {
                resolve(result);
            }
        });
    })
}

const execCommandLinePromise = async (execString, cmdMessage = 'Execting command line...') => {
    const execCMDStatus = new Spinner(cmdMessage);
    execCMDStatus.start();
    return new Promise((resolve, reject) => {
        exec(execString, (err, stdout, stderr) => {
            stdout && console.log('\nstdout: ', stdout);
            stderr && console.log('stderr: ', stderr);
            if (err) {
                execCMDStatus.stop();
                reject(err);
            }
            else {
                execCMDStatus.stop();
                resolve(null);
            }
        });
    })
}

const replaceStringFilePromise = async (filePath, oldString, newString) => {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, (err, data) => {
            if (err) {
                console.log('Replace name string err: ', err);
                reject(err);
            }
            else {
                data = data.toString();
                data = data.replace(oldString, newString);
                fs.writeFile(filePath, data, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        // console.log(`Data of file ${filePath} has been changed! \n`);
                        resolve(null);
                    }
                });
            }
        });
    })
}

const CustomPromise = {
    gitClonePromise,
    promptGetListQuestionPromise,
    execCommandLinePromise,
    replaceStringFilePromise,
}

module.exports = CustomPromise;
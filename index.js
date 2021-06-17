#!/usr/bin/env node

// import clear from 'clear';
// import chalk from 'chalk';
// import figlet from 'figlet';
// import fs from 'fs';
// import CustomPromise from './promises';
// import Helpers from './helpers';

const clear = require('clear');
const chalk = require('chalk');
const figlet = require('figlet');
const fs = require("fs");
const CustomPromise = require('./promises');
// const Helpers = require('./helpers');

const listQuestions = ['Project name', 'Project display name'];

const isWinOS = process.platform === "win32";

const IDEWorkspaceString = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">\n<plist version=\"1.0\">\n<dict>\n<key>IDEDidComputeMac32BitWarning</key>\n<true/>\n</dict>\n</plist>";

const execFunction = async () => {
    // clear();
    // Helpers.checkUpdate();

    console.log(
        chalk.yellow(
            figlet.textSync('AMELA', { horizontalLayout: 'full' })
        )
    );
    try {
        const currPath = "./react-native-templet-v1";

        if (fs.existsSync(currPath)) {
            const listQuestionsConfirmRemove = ['react-native-templet-v1 already existed! Do you want to remove and reinstall it? (y/n)'];
            const resultConfirmRemove = await CustomPromise.promptGetListQuestionPromise(listQuestionsConfirmRemove);
            if (resultConfirmRemove[listQuestionsConfirmRemove[0]].toString().trim().toLowerCase() === 'y') {
                await CustomPromise.execCommandLinePromise(`rmdir /s /q ${currPath.replace('./', '')}`, `Removing folder ${currPath}...`);
            }
            else {
                return;
            }
        }

        const resultQuestions = await CustomPromise.promptGetListQuestionPromise(listQuestions);
        const appName = resultQuestions[listQuestions[0]];
        const newPath = `./${appName}`;

        const normalFlowInstall = async () => {
            // Change app name and display name
            await CustomPromise.replaceStringFilePromise(`${newPath}/app.json`, "\"name\": \"DemoApp\"", `\"name\": \"${appName}\"`);
            await CustomPromise.replaceStringFilePromise(`${newPath}/app.json`, "\"displayName\": \"Demo App\"", `\"displayName\": \"${resultQuestions[listQuestions[1]]}\"`);
            await CustomPromise.replaceStringFilePromise(`${newPath}/package.json`, "\"name\": \"DemoApp\"", `\"name\": \"${appName}\"`);
            await CustomPromise.replaceStringFilePromise(`${newPath}/.gitignore`, "android", "");
            await CustomPromise.replaceStringFilePromise(`${newPath}/.gitignore`, "ios", "");
            // Handle script postinstall
            await CustomPromise.replaceStringFilePromise(`${newPath}/package.json`,
                "\"postinstall\": \"cd scripts && sh ./fix-lib.sh && cd .. && cd ios && pod install && cd .. && npx jetifier\",", "");
            await CustomPromise.execCommandLinePromise(`cd ./${appName} && yarn && npx react-native eject`,
                `Installing libraries to ${newPath}...`);
            await CustomPromise.execCommandLinePromise(`cd ./${appName} && npx jetifier`, `Jetifier installing for Android to ${newPath}...`);
            await CustomPromise.replaceStringFilePromise(`${newPath}/package.json`, "\"pod-install\": \"cd ios && pod install\",",
                `\"pod-install\": \"cd ios && pod install\",\n\"postinstall\": \"cd scripts && sh ./fix-lib.sh ${isWinOS ? "" : "&& cd .. && cd ios && pod install && cd .."} && npx jetifier\",`);
            // Apply fix script sh
            await CustomPromise.execCommandLinePromise(`cd ./${appName} && cd scripts && sh ./fix-lib.sh`, `Applying script to ${newPath}...`);
            
            if (!isWinOS) {
                // Pod repo update
                await CustomPromise.execCommandLinePromise(`pod repo update`, `Pod repo updating...`);
                await CustomPromise.execCommandLinePromise(`cd ./${appName} && cd ios && pod install`, `Pod installing for iOS to ${newPath}...`);
                
                // Fix bug useFlipper
                await CustomPromise.replaceStringFilePromise(`${newPath}/ios/Podfile`, "use_flipper!()", "use_flipper!({ 'Flipper-Folly' => '2.5.3', 'Flipper' => '0.87.0', 'Flipper-RSocket' => '1.3.1' })");
                await CustomPromise.execCommandLinePromise(`cd ./${appName} && cd ios && pod install`, `Update flipper iOS to ${newPath}...`);

                // Add workspace check plist
                await CustomPromise.execCommandLinePromise(`cd ./${appName}/ios/${appName}.xcworkspace && mkdir xcshareddata`, 
                    `Making folder xcshareddata...`);
                await CustomPromise.createNewFilePromise(`./${appName}/ios/${appName}.xcworkspace/xcshareddata/IDEWorkspaceChecks.plist`, IDEWorkspaceString);

                // Running on device
                await CustomPromise.execCommandLinePromise(`cd ./${appName} && npx react-native run-ios`, `Running iOS...`);
            } else {
                console.log(
                    chalk.red('Sorry! WindowsOS has not been fully supported yet. Please change to MacOS!')
                );
            }
        }

        if (!fs.existsSync(newPath)) {
            await CustomPromise.gitClonePromise();
            fs.renameSync(currPath, newPath);
            await normalFlowInstall();
            return;
        }
        if (fs.existsSync(newPath)) {
            const listQuestionsOverrideRepo = ['Folder with same name already existed. Do you want to override it? (y/n)'];
            const resultOverrideRepo = await CustomPromise.promptGetListQuestionPromise(listQuestionsOverrideRepo);
            if (resultOverrideRepo[listQuestionsOverrideRepo[0]].toString().trim().toLowerCase() === 'y') {
                await CustomPromise.gitClonePromise();
                await CustomPromise.execCommandLinePromise(`cd ${currPath} && rm -rf .git`);
                await CustomPromise.execCommandLinePromise(`cp -a ${currPath}/. ${newPath}/`, `Copying folder ${currPath} to ${newPath}...`);
                await CustomPromise.execCommandLinePromise(`rmdir /s /q ${currPath.replace('./', '')}`, `Removing folder ${currPath}...`);
                await normalFlowInstall();
                return;
            }
            return;
        }
    } catch (err) {
        console.log('err: ', err);
    }
}

execFunction();

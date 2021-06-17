#!/usr/bin/env node

const clear = require('clear');
const chalk = require('chalk');
const figlet = require('figlet');
const fs = require("fs");
const CustomPromise = require('./promises');

const listQuestions = ['Project name', 'Project display name'];

const isWinOS = process.platform === "win32";

const execFunction = async () => {
    // clear();
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
        const newPath = `./${resultQuestions[listQuestions[0]]}`;

        const normalFlowInstall = async () => {
            await CustomPromise.replaceStringFilePromise(`${newPath}/app.json`, "\"name\": \"DemoApp\"", `\"name\": \"${resultQuestions[listQuestions[0]]}\"`);
            await CustomPromise.replaceStringFilePromise(`${newPath}/app.json`, "\"displayName\": \"Demo App\"", `\"displayName\": \"${resultQuestions[listQuestions[1]]}\"`);
            await CustomPromise.replaceStringFilePromise(`${newPath}/package.json`, "\"name\": \"DemoApp\"", `\"name\": \"${resultQuestions[listQuestions[0]]}\"`);
            await CustomPromise.replaceStringFilePromise(`${newPath}/.gitignore`, "android", "");
            await CustomPromise.replaceStringFilePromise(`${newPath}/.gitignore`, "ios", "");
            await CustomPromise.replaceStringFilePromise(`${newPath}/package.json`,
                "\"postinstall\": \"cd scripts && sh ./fix-lib.sh && cd .. && cd ios && pod install && cd .. && npx jetifier\",", "");
            await CustomPromise.execCommandLinePromise(`cd ./${resultQuestions[listQuestions[0]]} && yarn && npx react-native eject ${isWinOS ? '' : '&& cd ios && pod install'}`,
                `Installing libraries to ${newPath}...`);

            // await CustomPromise.replaceStringFilePromise(`${newPath}/package.json`, "\"pod-install\": \"cd ios && pod install\",",
            //     "\"pod-install\": \"cd ios && pod install\",\n\"postinstall\": \"cd scripts && sh ./fix-lib.sh && cd .. && cd ios && pod install && cd .. && npx jetifier\",");
            // await CustomPromise.execCommandLinePromise(`cd ./${resultQuestions[listQuestions[0]]} && yarn`, `Post installing to ${newPath}...`);
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

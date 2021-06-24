#!/usr/bin/env node

const clear = require('clear');
const chalk = require('chalk');
const figlet = require('figlet');
const fs = require("fs");
const CustomPromise = require('./promises');
const Helpers = require('./helpers');
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv;
const { version } = require('./package.json');

const listQuestions = ['Project name', 'Project display name'];
const isWinOS = process.platform === "win32";
const IDEWorkspaceString = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">\n<plist version=\"1.0\">\n<dict>\n<key>IDEDidComputeMac32BitWarning</key>\n<true/>\n</dict>\n</plist>";
const locationWhenInUseString = "config = use_native_modules!\npermissions_path = '../node_modules/react-native-permissions/ios'\npod 'Permission-LocationWhenInUse', :path => \"#{permissions_path}/LocationWhenInUse\"";

const execFunction = async () => {
    // clear();

    // Check for update
    const checkUpdateResult = await Helpers.checkUpdate();
    const {notifyType, boxenObj} = checkUpdateResult;
    if (notifyType) {
        console.log(boxenObj);
        return;
    }

    // Check if flag is suitable
    if (Object.keys(argv).length > 2) {
        if (Object.keys(argv).length === 3 && argv.v) {
            console.log(version);
            return;
        }
        console.log(
            chalk.red('Your syntax is not correct! Please try again! \nCorrect flags are:')
        );
        console.log('--version');
        return;
    }

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
                await CustomPromise.execCommandLinePromise(`rm -r ${currPath.replace('./', '')}`, `Removing folder ${currPath}...`);
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

                // Fix react-native-permissions error handler
                await CustomPromise.replaceStringFilePromise(`${newPath}/ios/Podfile`,"config = use_native_modules!", locationWhenInUseString)
                await CustomPromise.execCommandLinePromise(`cd ./${appName} && cd ios && pod install`, `Update react-native-permissions iOS to ${newPath}...`);

                // Add workspace check plist
                await CustomPromise.execCommandLinePromise(`cd ./${appName}/ios/${appName}.xcworkspace && mkdir xcshareddata`, 
                    `Making folder xcshareddata...`);
                await CustomPromise.createNewFilePromise(`./${appName}/ios/${appName}.xcworkspace/xcshareddata/IDEWorkspaceChecks.plist`, IDEWorkspaceString);

                // Ask user what to do next
                console.log('Installation completed!');
                const postInstallQuestion = 'What do you want to do next?'
                const postInstallAnswerObj = await CustomPromise.getRadioButtonAnswerPromise(postInstallQuestion, ['Run on iOS simulator', 'Nothing']);
                const postInstallAnswer = postInstallAnswerObj[postInstallQuestion];
                // Running on device iOS
                if (postInstallAnswer === 'Run on iOS simulator') {
                    await CustomPromise.execCommandLinePromise(`cd ./${appName} && npx react-native run-ios`, `Running iOS...`);
                }
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
                await CustomPromise.execCommandLinePromise(`rm -r ${currPath.replace('./', '')}`, `Removing folder ${currPath}...`);
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

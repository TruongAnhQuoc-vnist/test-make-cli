#!/usr/bin/env node

const clear = require("clear");
const chalk = require("chalk");
const figlet = require("figlet");
const fs = require("fs");
const CustomPromise = require("./promises");
const Helpers = require("./helpers");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const argv = yargs(hideBin(process.argv)).argv;
const { version } = require("./package.json");
const Constants = require("./constants");
const xcode = require("./xcode-utils/pbxProject");

const listQuestions = ["Project name", "Project display name"];
const isWinOS = process.platform === "win32";
let appName, appDisplayName, appCode;

const setUpIosConfigWithEnv = async (
    envTypeFull = "development",
    appName,
    appDisplayName,
    appCode
) => {
    // Setup env file
    const envFilePath = `./${appName}/.env.${envTypeFull}`;
    const envTypeShorten =
        envTypeFull === "development"
            ? "dev"
            : envTypeFull === "staging"
            ? "stg"
            : "prod";
    await CustomPromise.replaceStringFilePromise(
        `${envFilePath}`,
        `APP_NAME=Demo Development`,
        `APP_NAME=${appDisplayName} ${
            envTypeFull[0].toUpperCase() + envTypeFull.slice(1)
        }`
    );
    await CustomPromise.replaceStringFilePromise(
        `${envFilePath}`,
        `ANDROID_APP_ID=jp.demo.app`,
        `ANDROID_APP_ID=com.apps.${appCode}.${envTypeShorten}`
    );
    await CustomPromise.replaceStringFilePromise(
        `${envFilePath}`,
        `IOS_APP_ID=jp.demo.app`,
        `IOS_APP_ID=com.apps.${appCode}.${envTypeShorten}`
    );

    // Creating XCScheme file
    const xcschemePath = `./${appName}/ios/${appName}.xcodeproj/xcshareddata/xcschemes/`;
    const constantXCScheme =
        envTypeFull === "development"
            ? Constants.XCSchemeStringDEV.replace(/demo-app/g, appName)
            : envTypeFull === "staging"
            ? Constants.XCSchemeStringSTG.replace(/demo-app/g, appName)
            : Constants.XCSchemeStringPROD.replace(/demo-app/g, appName);
    if (!fs.existsSync(xcschemePath)) {
        await CustomPromise.execCommandLinePromise(
            `cd ./${appName}/ios/${appName}.xcodeproj/xcshareddata/ && mkdir xcschemes`,
            `Making folder xcschemes...`
        );
    }
    await CustomPromise.createNewFilePromise(
        `./${xcschemePath}/${appName} ${envTypeShorten.toUpperCase()}.xcscheme`,
        constantXCScheme
    );

    const infoPlistPath = `./${appName}/ios/${appName}/Info.plist`;
    if (envTypeFull === "development") {
        // Creating XCConfig file
        await CustomPromise.createNewFilePromise(
            `./${appName}/ios/Config.xcconfig`,
            Constants.XCConfigString
        );
        // Setting up info plist
        await CustomPromise.replaceStringFilePromise(
            `${infoPlistPath}`,
            `<string>${appDisplayName}</string>`,
            `<string>RNC_APP_NAME</string>`
        );
        await CustomPromise.replaceStringFilePromise(
            `${infoPlistPath}`,
            `<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>`,
            `<string>RNC_IOS_APP_ID</string>`
        );
        await CustomPromise.replaceStringFilePromise(
            `${infoPlistPath}`,
            `<string>1.0</string>`,
            `<string>RNC_IOS_APP_VERSION_CODE</string>`
        );
        await CustomPromise.replaceStringFilePromise(
            `${infoPlistPath}`,
            `<string>1</string>`,
            `<string>RNC_IOS_APP_BUILD_CODE</string>`
        );
    }

    // Setting pbxProject
    const pbxProjectPath = `./${appName}/ios/${appName}.xcodeproj/project.pbxproj`;
    const configFilePath = `./${appName}/ios/Config.xcconfig`;
    let uuid, fileRef, buildPhaseUUID;
    if (envTypeFull === "development") {
        const myProj = xcode(pbxProjectPath);
        await CustomPromise.parseXCodeProjectPromise(myProj);
        const resourceFile = await myProj.addResourceFile(
            configFilePath,
            {},
            "Resources"
        );
        const resourceFileProcessed = await JSON.parse(
            JSON.stringify(resourceFile)
        );
        const buildPhaseFile = myProj.addBuildPhase(
            [],
            "PBXShellScriptBuildPhase",
            "",
            undefined,
            {
                name: "",
                shellPath: "/bin/sh",
                shellScript:
                    '"${SRCROOT}/../node_modules/react-native-config/ios/ReactNativeConfig/BuildXCConfig.rb" "${SRCROOT}/.." "${SRCROOT}/tmp.xcconfig"\n',
            }
        );
        buildPhaseUUID = JSON.parse(JSON.stringify(buildPhaseFile)).uuid;
        uuid = resourceFileProcessed.uuid;
        fileRef = resourceFileProcessed.fileRef;
        fs.writeFileSync(pbxProjectPath, myProj.writeSync());

        // PBX File Config.xcconfig
        await CustomPromise.replaceStringFilePromise(
            `${pbxProjectPath}`,
            `path = "./${appName}/ios/Config.xcconfig"`,
            `path = Config.xcconfig`
        );
        await CustomPromise.replaceStringFilePromise(
            `${pbxProjectPath}`,
            `83CBB9F61A601CBA00E9B192 = {\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = (`,
            `83CBB9F61A601CBA00E9B192 = {\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = (\n\t\t\t\t${fileRef} /* Config.xcconfig */,`
        );
        await CustomPromise.replaceStringFilePromise(
            `${pbxProjectPath}`,
            `name = Pods;`,
            ``
        );
        await CustomPromise.replaceStringFilePromise(
            `${pbxProjectPath}`,
            `13B07F8E1A680F5B00A75B9A /* Resources */ = {\n\t\t\tisa = PBXResourcesBuildPhase;\n\t\t\tbuildActionMask = 2147483647;\n\t\t\tfiles = (\n\t\t\t\t81AB9BB82411601600AC10FF /* LaunchScreen.storyboard in Resources */,`,
            `13B07F8E1A680F5B00A75B9A /* Resources */ = {\n\t\t\tisa = PBXResourcesBuildPhase;\n\t\t\tbuildActionMask = 2147483647;\n\t\t\tfiles = (\n\t\t\t\t81AB9BB82411601600AC10FF /* LaunchScreen.storyboard in Resources */,\n\t\t\t\t${uuid} /* Config.xcconfig in Resources */,`
        );
        await CustomPromise.replaceStringFilePromise(
            `${pbxProjectPath}`,
            /GCC_WARN_UNUSED_VARIABLE = YES;/g,
            'GCC_WARN_UNUSED_VARIABLE = YES;\n\t\t\t\tDEVELOPMENT_TEAM = "";\n\t\t\t\tINFOPLIST_OTHER_PREPROCESSOR_FLAGS = "-traditional";\n\t\t\t\tINFOPLIST_PREFIX_HEADER = "${BUILD_DIR}/GeneratedInfoPlistDotEnv.h";\n\t\t\t\tINFOPLIST_PREPROCESS = YES;'
        );
        await CustomPromise.replaceStringFilePromise(
            `${pbxProjectPath}`,
            /isa = XCBuildConfiguration;/g,
            `isa = XCBuildConfiguration;\n\t\t\tbaseConfigurationReference = ${fileRef} /* Config.xcconfig */;`
        );

        // PBX file script
        await CustomPromise.replaceStringFilePromise(
            `${pbxProjectPath}`,
            `{\n\t\t\t\t\tvalue = ${buildPhaseUUID};\n\t\t\t\t\tcomment = ;\n\t\t\t\t},`,
            `${buildPhaseUUID} /* ShellScript */,`
        );
    }
};

const setUpAndroidConfigAllEnvs = async (appName, appDisplayName, appCode) => {
    // Generate keystore files
    const keyStgName = `${appCode}-staging-key.keystore`;
    const aliasStg = `${appCode}-staging-alias`;
    const keyProdName = `${appCode}-production-key.keystore`;
    const aliasProd = `${appCode}-production-alias`;
    await CustomPromise.replaceStringFilePromise(
        `./${appName}/.gitignore`,
        `*.keystore`,
        ``
    );
    await CustomPromise.createKeyStorePromise(appCode, "staging");
    await CustomPromise.createKeyStorePromise(appCode, "production");
    await CustomPromise.execCommandLinePromise(
        `mv ./${keyStgName} ./${appName}/android/app`,
        `Moving staging keystore...`
    );
    await CustomPromise.execCommandLinePromise(
        `mv ./${keyProdName} ./${appName}/android/app`,
        `Moving production keystore...`
    );
    await CustomPromise.appendFilePromise(
        `./${appName}/android/gradle.properties`,
        `\n# Infomation dev keystore\nDEBUG_STORE_FILE=debug.keystore\nDEBUG_KEY_ALIAS=androiddebugkey\nDEBUG_STORE_PASSWORD=android\nDEBUG_KEY_PASSWORD=android\n# Infomation staging keystore\nSTAGING_STORE_FILE=${keyStgName}\nSTAGING_KEY_ALIAS=${aliasStg}\nSTAGING_STORE_PASSWORD=${Constants.KeyStorePassword}\nSTAGING_KEY_PASSWORD=${Constants.KeyStorePassword}\n# Infomation product keystore\nPRODUCT_STORE_FILE=${keyProdName}\nPRODUCT_KEY_ALIAS=${aliasProd}\nPRODUCT_STORE_PASSWORD=${Constants.KeyStorePassword}\nPRODUCT_KEY_PASSWORD=${Constants.KeyStorePassword}\n`
    );

    // Fixing app/build.gradle
    const appBuildGradlePath = `./${appName}/android/app/build.gradle`;
    await CustomPromise.replaceStringFilePromise(
        appBuildGradlePath,
        `apply plugin: \"com.android.application\"\n`,
        `apply plugin: \"com.android.application\"\nproject.ext.envConfigFiles = [\n    dev: \".env.development\",\n    staging: \".env.staging\",\n    product: \".env.production\",\n    anothercustombuild: \".env\",\n]\n`
    );
    await CustomPromise.replaceStringFilePromise(
        appBuildGradlePath,
        `project.ext.react = [\n    enableHermes: false,  // clean and rebuild if changing\n]\n\napply from: \"../../node_modules/react-native/react.gradle\"`,
        `project.ext.react = [\n    enableHermes: false,  // clean and rebuild if changing\n]\n\napply from: \"../../node_modules/react-native/react.gradle\"\napply from: project(':react-native-config').projectDir.getPath() + \"/dotenv.gradle\"`
    );
    await CustomPromise.replaceStringFilePromise(
        appBuildGradlePath,
        `defaultConfig {\n        applicationId \"com.${appName}\"\n        minSdkVersion rootProject.ext.minSdkVersion\n        targetSdkVersion rootProject.ext.targetSdkVersion\n        versionCode 1\n        versionName \"1.0\"\n    }`,
        `defaultConfig {\n        applicationId env.get(\"ANDROID_APP_ID\")\n        minSdkVersion rootProject.ext.minSdkVersion\n        targetSdkVersion rootProject.ext.targetSdkVersion\n        versionCode Integer.valueOf(env.get(\"ANDROID_APP_VERSION_CODE\"))\n        versionName env.get(\"ANDROID_APP_VERSION_NAME\")\n        multiDexEnabled true\n        resValue \"string\", \"build_config_package\", \"com.${appName}\"\n    }`
    );
    await CustomPromise.replaceStringFilePromise(
        appBuildGradlePath,
        `signingConfigs {\n        debug {\n            storeFile file('debug.keystore')\n            storePassword 'android'\n            keyAlias 'androiddebugkey'\n            keyPassword 'android'\n        }\n    }`,
        `signingConfigs {\n        debug {\n            storeFile file(DEBUG_STORE_FILE)\n            storePassword DEBUG_STORE_PASSWORD\n            keyAlias DEBUG_KEY_ALIAS\n            keyPassword DEBUG_KEY_PASSWORD\n        }\n        development {\n            storeFile file(DEBUG_STORE_FILE)\n            storePassword DEBUG_STORE_PASSWORD\n            keyAlias DEBUG_KEY_ALIAS\n            keyPassword DEBUG_KEY_PASSWORD\n        }\n        staging {\n            storeFile file(STAGING_STORE_FILE)\n            storePassword STAGING_STORE_PASSWORD\n            keyAlias STAGING_KEY_ALIAS\n            keyPassword STAGING_KEY_PASSWORD\n        }\n        product {\n            storeFile file(PRODUCT_STORE_FILE)\n            storePassword PRODUCT_STORE_PASSWORD\n            keyAlias PRODUCT_KEY_ALIAS\n            keyPassword PRODUCT_KEY_PASSWORD\n        }\n    }`
    );
    await CustomPromise.replaceStringFilePromise(
        appBuildGradlePath,
        `// applicationVariants are e.g. debug, release`,
        `flavorDimensions \"enviroment\"\n    productFlavors {\n        dev {\n            dimension \"enviroment\"\n            resValue \"string\", \"app_name\", project.env.get(\"APP_NAME\")\n            resValue \"string\", \"CodePushDeploymentKey\", project.env.get(\"CODEPUSH_ANDROID_DEVELOPMENT_KEY\")\n            signingConfig signingConfigs.staging\n        }\n        staging {\n            dimension \"enviroment\"\n            resValue \"string\", \"app_name\", project.env.get(\"APP_NAME\")\n            resValue \"string\", \"CodePushDeploymentKey\", project.env.get(\"CODEPUSH_ANDROID_DEVELOPMENT_KEY\")\n            signingConfig signingConfigs.staging\n        }\n        product {\n            dimension \"enviroment\"\n            resValue \"string\", \"app_name\", project.env.get(\"APP_NAME\")\n            resValue \"string\", \"CodePushDeploymentKey\", project.env.get(\"CODEPUSH_ANDROID_DEVELOPMENT_KEY\")\n            signingConfig signingConfigs.product\n        }\n    }\n\n\n    // applicationVariants are e.g. debug, release\n`
    );
    await CustomPromise.replaceStringFilePromise(
        appBuildGradlePath,
        `apply from: file(\"../../node_modules/@react-native-community/cli-platform-android/native_modules.gradle\"); applyNativeModulesAppBuildGradle(project)\n`,
        `apply from: file(\"../../node_modules/@react-native-community/cli-platform-android/native_modules.gradle\"); applyNativeModulesAppBuildGradle(project)\napply from: \"../../node_modules/react-native-code-push/android/codepush.gradle\"\n`
    );

    // Fixing settings.gradle
    const settingsGradlePath = `./${appName}/android/settings.gradle`;
    await CustomPromise.replaceStringFilePromise(
        settingsGradlePath,
        `apply from: file(\"../node_modules/@react-native-community/cli-platform-android/native_modules.gradle\"); applyNativeModulesSettingsGradle(settings)\ninclude ':app'`,
        `apply from: file(\"../node_modules/@react-native-community/cli-platform-android/native_modules.gradle\"); applyNativeModulesSettingsGradle(settings)\ninclude ':app', ':react-native-code-push'\nproject(':react-native-code-push').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-code-push/android/app')\n`
    );

    // Fix res value string xml
    const resStringPath = `./${appName}/android/app/src/main/res/values/strings.xml`;
    await CustomPromise.replaceStringFilePromise(
        resStringPath,
        `<resources>\n    <string name=\"app_name\">${appDisplayName}</string>\n</resources>`,
        `<resources/>`
    );
};

const handlePreProcessParams = async () => {
    // Check for update
    const checkUpdateResult = await Helpers.checkUpdate();
    const { notifyType, boxenObj } = checkUpdateResult;
    if (notifyType) {
        console.log(boxenObj);
        return false;
    }

    // Check if flag is suitable
    if (Object.keys(argv).length > 2) {
        if (Object.keys(argv).length === 3 && argv.v) {
            console.log(version);
            return;
        }
        console.log(
            chalk.red(
                "Your syntax is not correct! Please try again! \nCorrect flags are:"
            )
        );
        console.log("--version");
        return false;
    }
    return true;
};

const handleDecorateFirstInit = async () => {
    // clear();
    console.log(
        chalk.yellow(figlet.textSync("AMELA", { horizontalLayout: "full" }))
    );
};

const handleInstallPackages = async () => {
    const currPath = "./react-native-templet-v1";

    if (fs.existsSync(currPath)) {
        const listQuestionsConfirmRemove = [
            "react-native-templet-v1 already existed! Do you want to remove and reinstall it? (y/n)",
        ];
        const resultConfirmRemove = await CustomPromise.promptGetListQuestionPromise(
            listQuestionsConfirmRemove
        );
        if (
            resultConfirmRemove[listQuestionsConfirmRemove[0]]
                .toString()
                .trim()
                .toLowerCase() === "y"
        ) {
            await CustomPromise.execCommandLinePromise(
                `rm -r ${currPath.replace("./", "")}`,
                `Removing folder ${currPath}...`
            );
        } else {
            return false;
        }
    }

    const resultQuestions = await CustomPromise.promptGetListQuestionPromise(
        listQuestions
    );
    const listQuestionsAppCode = ["App code (3 characters - example: app, skn, tag,...): "];
    const resultAppCode = await CustomPromise.promptGetListQuestionPromise(
        listQuestionsAppCode
    );
    appCode = resultAppCode[listQuestionsAppCode[0]].trim();
    appName = resultQuestions[listQuestions[0]].trim().replace(/-/g, "");
    appDisplayName = resultQuestions[listQuestions[1]];
    console.log(`AppName: ${appName}`);
    console.log(`AppDisplayName: ${appDisplayName}`);
    console.log(`AppCode: ${appCode}`);
    const newPath = `./${appName}`;

    const normalFlowInstall = async () => {
        // Change app name and display name
        await CustomPromise.replaceStringFilePromise(
            `${newPath}/app.json`,
            '"name": "DemoApp"',
            `\"name\": \"${appName}\"`
        );
        await CustomPromise.replaceStringFilePromise(
            `${newPath}/app.json`,
            '"displayName": "Demo App"',
            `\"displayName\": \"${resultQuestions[listQuestions[1]]}\"`
        );
        await CustomPromise.replaceStringFilePromise(
            `${newPath}/package.json`,
            '"name": "DemoApp"',
            `\"name\": \"${appName}\"`
        );
        await CustomPromise.replaceStringFilePromise(
            `${newPath}/.gitignore`,
            "android",
            ""
        );
        await CustomPromise.replaceStringFilePromise(
            `${newPath}/.gitignore`,
            "ios",
            ""
        );
        // Handle script postinstall
        await CustomPromise.replaceStringFilePromise(
            `${newPath}/package.json`,
            '"postinstall": "cd scripts && sh ./fix-lib.sh && cd .. && cd ios && pod install && cd .. && npx jetifier",',
            ""
        );
        await CustomPromise.execCommandLinePromise(
            `cd ./${appName} && yarn && npx react-native eject`,
            `Installing libraries to ${newPath}...`
        );
        await CustomPromise.execCommandLinePromise(
            `cd ./${appName} && npx jetifier`,
            `Jetifier installing for Android to ${newPath}...`
        );
        await CustomPromise.replaceStringFilePromise(
            `${newPath}/package.json`,
            '"pod-install": "cd ios && pod install",',
            `\"pod-install\": \"cd ios && pod install\",\n\"postinstall\": \"cd scripts && sh ./fix-lib.sh ${
                isWinOS ? "" : "&& cd .. && cd ios && pod install && cd .."
            } && npx jetifier\",`
        );
        // Apply fix script sh
        await CustomPromise.execCommandLinePromise(
            `cd ./${appName} && cd scripts && sh ./fix-lib.sh`,
            `Applying script to ${newPath}...`
        );

        if (!isWinOS) {
            // Pod repo update
            await CustomPromise.execCommandLinePromise(
                `pod repo update`,
                `Pod repo updating...`
            );
            await CustomPromise.execCommandLinePromise(
                `cd ./${appName} && cd ios && pod install`,
                `Pod installing for iOS to ${newPath}...`
            );

            // Fix bug useFlipper
            await CustomPromise.replaceStringFilePromise(
                `${newPath}/ios/Podfile`,
                "use_flipper!()",
                "use_flipper!({ 'Flipper-Folly' => '2.5.3', 'Flipper' => '0.87.0', 'Flipper-RSocket' => '1.3.1' })"
            );
            await CustomPromise.execCommandLinePromise(
                `cd ./${appName} && cd ios && pod install`,
                `Update flipper iOS to ${newPath}...`
            );

            // Fix react-native-permissions error handler
            await CustomPromise.replaceStringFilePromise(
                `${newPath}/ios/Podfile`,
                "config = use_native_modules!",
                Constants.locationWhenInUseString
            );
            await CustomPromise.execCommandLinePromise(
                `cd ./${appName} && cd ios && pod install`,
                `Update react-native-permissions iOS to ${newPath}...`
            );

            // Add workspace check plist
            await CustomPromise.execCommandLinePromise(
                `cd ./${appName}/ios/${appName}.xcworkspace && mkdir xcshareddata`,
                `Making folder xcshareddata...`
            );
            await CustomPromise.createNewFilePromise(
                `./${appName}/ios/${appName}.xcworkspace/xcshareddata/IDEWorkspaceChecks.plist`,
                Constants.IDEWorkspaceString
            );
        } else {
            console.log(
                chalk.red(
                    "Sorry! WindowsOS has not been fully supported yet. Please change to MacOS!"
                )
            );
        }
    };

    if (!fs.existsSync(newPath)) {
        await CustomPromise.gitClonePromise();
        fs.renameSync(currPath, newPath);
        await normalFlowInstall();
        return true;
    }
    if (fs.existsSync(newPath)) {
        const listQuestionsOverrideRepo = [
            "Folder with same name already existed. Do you want to override it? (y/n)",
        ];
        const resultOverrideRepo = await CustomPromise.promptGetListQuestionPromise(
            listQuestionsOverrideRepo
        );
        if (
            resultOverrideRepo[listQuestionsOverrideRepo[0]]
                .toString()
                .trim()
                .toLowerCase() === "y"
        ) {
            await CustomPromise.gitClonePromise();
            await CustomPromise.execCommandLinePromise(
                `cd ${currPath} && rm -rf .git`
            );
            await CustomPromise.execCommandLinePromise(
                `cp -a ${currPath}/. ${newPath}/`,
                `Copying folder ${currPath} to ${newPath}...`
            );
            await CustomPromise.execCommandLinePromise(
                `rm -r ${currPath.replace("./", "")}`,
                `Removing folder ${currPath}...`
            );
            await normalFlowInstall();
            return true;
        }
        return false;
    }
    return true;
};

const handleSetUpRNConfig = async () => {
    // Setup iOS
    await setUpIosConfigWithEnv(
        `development`,
        appName,
        appDisplayName,
        appCode
    );
    await setUpIosConfigWithEnv(`staging`, appName, appDisplayName, appCode);
    await setUpIosConfigWithEnv(`production`, appName, appDisplayName, appCode);
    console.log("Done setting up react-native-config iOS!");

    // Setup Android
    await setUpAndroidConfigAllEnvs(appName, appDisplayName, appCode);
    console.log("Done setting up react-native-config Android!");
};

const handleRunSimulatorIOS = async () => {
    await CustomPromise.execCommandLinePromise(
        `cd ./${appName} && npx react-native run-ios`,
        `Running iOS...`
    );
};

const main = async () => {
    try {
        // Check pre-conditions
        const preProcessBoolean = await handlePreProcessParams();
        if (!preProcessBoolean) return;
        // Decorate first cmd line
        await handleDecorateFirstInit();
        // Install NPM packages
        const installPackageBoolean = await handleInstallPackages();
        if (!installPackageBoolean) return;
        
        if (!isWinOS) {
            // Setup React Native config iOS
            await handleSetUpRNConfig();

            // Ask user what to do next
            console.log("Installation completed!");
            const postInstallQuestion = "What do you want to do next?";
            const postInstallAnswerObj = await CustomPromise.getRadioButtonAnswerPromise(
                postInstallQuestion,
                ["Run on iOS simulator", "Nothing"]
            );
            const postInstallAnswer = postInstallAnswerObj[postInstallQuestion];
            // Running on device iOS
            if (postInstallAnswer === "Run on iOS simulator") {
                await handleRunSimulatorIOS();
            }
        }
    } catch (err) {
        console.log("err: ", err);
    }
};

main();

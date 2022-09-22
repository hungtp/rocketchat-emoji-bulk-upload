import * as dotenv from "dotenv";
import axios from "axios";
import fs from "fs";
import path from "path";
import inquirer from "inquirer";
import winston from "winston";

dotenv.config();
const allowFileTypes = process.env.FILE_EXTENSION.split(",");
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
    winston.format.printf((info) => {
      return `${info.timestamp} ${info.level.toUpperCase()} ${info.message}`;
    })
  ),
  transports: [
    new winston.transports.File({
      filename: "logs/combined.log",
      level: process.env.DEBUG == "false" ? "info" : "debug",
      handleExceptions: true,
      maxsize: 5242880, //bytes
    }),
  ],
});
const mydebug = {
  error: (...errors) => {
    for (let error of errors) {
      logger.error(JSON.stringify(error, null, 4));
    }

    console.error("There is an error. Please check log for more details.");
  },
  debug: (...infos) => {
    for (let info of infos) {
      logger.debug(JSON.stringify(info, null, 4));
    }
  },
  console: (...infos) => {
    for (let info of infos) {
      logger.info(JSON.stringify(info, null, 4));
      console.log(info);
    }
  },
};

/**
 * Check if file extension is valid or not.
 *
 * @param {String} fileName
 * @returns
 */
function isAllowedFileType(fileName) {
  const fileExt = path.extname(fileName);
  return allowFileTypes.indexOf(fileExt.substring(1).toLowerCase()) >= 0;
}

/**
 * Process name of uploaded emoji.
 *
 * @param {String} str
 * @returns
 */
function processEmojiName(str) {
  return str.toLowerCase().replace(/[^\w\d]/gi, "_");
}

/**
 * Prompt the questions to get user's input.
 *
 * @returns
 */
async function retrieveUserInput() {
  return await inquirer
    .prompt([
      {
        type: "confirm",
        name: "isNamePrefix",
        message: "Use number-based name?",
        default: false,
      },
      {
        type: "input",
        name: "namePrefix",
        message: "Prefix for name:",
        default: "emoji_",
        filter(val) {
          return processEmojiName(val);
        },
        when(answers) {
          return answers.isNamePrefix;
        },
      },
      {
        type: "confirm",
        name: "isAliasPrefix",
        message: "Use number-based alias?",
        default: false,
      },
      {
        type: "input",
        name: "aliasPrefix",
        message: "Prefix for alias?",
        default: "emj_",
        filter(val) {
          return processEmojiName(val);
        },
        when(answers) {
          return answers.isAliasPrefix;
        },
      },
      {
        type: "input",
        name: "startNum",
        message: "Start number for number-based name:",
        default: "1",
        validate(value) {
          const valid = !isNaN(parseInt(value));
          return valid || "Please enter a number";
        },
        filter(val) {
          return isNaN(parseInt(val)) ? "" : parseInt(val);
        },
        when(answers) {
          return answers.isNamePrefix;
        },
      },
      {
        type: "input",
        name: "dir",
        message: "Path to emoji pack:",
        default: "emoji",
      },
    ])
    .catch((error) => {
      // if (error.isTtyError) {
      //   // Prompt couldn't be rendered in the current environment
      // } else {
      //   // Something else went wrong
      // }
      mydebug.error(error);
      throw new Error("There is error in executing the prompt for script.");
    });
}

/**
 * Upload emoji to server.
 *
 * @param {*} userConfig
 */
async function uploadEmoji(userConfig) {
  const emojiDir = userConfig.dir;
  const emojiFiles = fs.readdirSync(emojiDir, { withFileTypes: true });

  var idx = userConfig.startNum;
  for (const emojiFile of emojiFiles) {
    //if there is nested folder, uploaded all of the nested folder's images as new emoji pack
    if (emojiFile.isDirectory()) {
      const newUserConfig = userConfig;
      newUserConfig.dir = `${emojiDir}/${emojiFile.name}`;
      if (newUserConfig.isNamePrefix) {
        newUserConfig.namePrefix = processEmojiName(emojiFile.name);
        newUserConfig.startNum = 1;
      }
      newUserConfig.isAliasPrefix = false;
      await uploadEmoji(newUserConfig);
      continue;
    }

    const emjFileName = emojiFile.name;

    if (!isAllowedFileType(emjFileName)) {
      continue;
    }

    mydebug.console(`uploading...`, `${emojiDir}/${emjFileName}`);

    const formData = { emoji: "", name: "", aliases: "" };

    formData.emoji = fs.createReadStream(`${emojiDir}/${emjFileName}`);
    if (userConfig.isNamePrefix) {
      formData.name = `${userConfig.namePrefix}${idx}`;
    } else {
      formData.name = processEmojiName(
        path.basename(emjFileName, path.extname(emjFileName))
      );
    }
    if (userConfig.isAliasPrefix) {
      formData.aliases = `${userConfig.aliasPrefix}${idx}`;
    }

    await axios
      .postForm(`${process.env.HOST}/api/v1/emoji-custom.create`, formData, {
        headers: {
          "X-Auth-Token": process.env.USER_TOKEN,
          "X-User-Id": process.env.USER_ID,
        },
      })
      .then((response) => {
        mydebug.console(`Response: ${response.status} ${response.statusText}`);
      })
      .catch((error) => {
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          mydebug.console(`Error Status: ${error.response.status}`);
        } else if (error.request) {
          // The request was made but no response was received
          // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
          // http.ClientRequest in node.js
          mydebug.console("Error when sending request.");
        } else {
          // Something happened in setting up the request that triggered an Error
          mydebug.console("Error", error.message);
        }
        mydebug.error(error);
      });

    mydebug.console("... done");
    mydebug.console("------------------------------");
    idx++;
  }
}
/**
 * Entry function for file.
 *
 */
async function main() {
  const userConfig = await retrieveUserInput();

  mydebug.console("!!---------START---------!!");
  await uploadEmoji(userConfig);
  mydebug.console("!!----------END----------!!");

  // process.exit();
}

//-------------------------------------------------------------
//-------------------------EXCECUTE SCRIPT---------------------
//-------------------------------------------------------------
main().catch((err) => {
  mydebug.console("There is an error when uploading image, please try again.");
  mydebug.error(err);
});

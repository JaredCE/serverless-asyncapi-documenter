"use strict";

const fs = require("fs");
const yaml = require("js-yaml");
const chalk = require("chalk");

const DefinitionGenerator = require("./DefinitionGenerator");

class AsyncAPIGenerator {
  constructor(serverless, options, { log = {} } = {}) {
    this.logOutput = log;
    this.serverless = serverless;
    this.options = options;

    this.logTypes = {
      NOTICE: "notice",
      DEBUG: "debug",
      ERROR: "error",
      WARNING: "warning",
      INFO: "info",
      VERBOSE: "verbose",
      SUCCESS: "success",
    };

    this.defaultLog = this.logTypes.NOTICE;

    this.commands = {
      asyncapi: {
        commands: {
          generate: {
            lifecycleEvents: ["serverless"],
            usage: "Generate AsyncAPI Documentation",
            options: {
              output: {
                usage: "Output file location [default: asyncapi.json|yml]",
                shortcut: "o",
                type: "string",
              },
              format: {
                usage: "AsyncAPI file format (yml|json) [default: json]",
                shortcut: "f",
                type: "string",
              },
              indent: {
                usage: "File indentation in spaces [default: 2]",
                shortcut: "i",
                type: "string",
              },
              asyncApiVersion: {
                usage: "AsyncAPI version number [default 2.6.0]",
                shortcut: "a",
                type: "string",
              },
            },
          },
        },
      },
    };

    this.hooks = {
      "asyncapi:generate:serverless": this.generate.bind(this),
    };

    this.serverless.configSchemaHandler.defineCustomProperties({
      type: "object",
      properties: {
        asyncDocumentation: {
          type: "object",
        },
      },
      required: ["asyncDocumentation"],
    });
  }

  log(str, type = this.defaultLog) {
    switch (this.serverless.version[0]) {
      case "2":
        let colouredString = str;
        if (type === "error") {
          colouredString = chalk.bold.red(`✖ ${str}`);
        } else if (type === "success") {
          colouredString = chalk.bold.green(`✓ ${str}`);
        }

        this.serverless.cli.log(colouredString);
        break;

      case "3":
        this.logOutput[type](str);
        break;

      default:
        process.stdout.write(str.join(" "));
        break;
    }
  }

  async generate() {
    this.log(chalk.bold.underline("AsyncAPI Document Generation"));
    this.processCliInput();

    const validAsyncAPI = await this.generationAndValidation().catch((err) => {
      throw new this.serverless.classes.Error(err);
    });

    let output;
    switch (this.config.format.toLowerCase()) {
      case "json":
        output = JSON.stringify(validAsyncAPI, null, this.config.indent);
        break;
      case "yaml":
      default:
        output = yaml.dump(validAsyncAPI, { indent: this.config.indent });
        break;
    }
    try {
      fs.writeFileSync(this.config.file, output);
      this.log(
        "AsyncAPI Documentation Successfully Written",
        this.logTypes.SUCCESS
      );
    } catch (err) {
      this.log(
        `ERROR: An error was thrown whilst writing the AsyncAPI Documentation`,
        this.logTypes.ERROR
      );
      throw new this.serverless.classes.Error(err);
    }
  }

  async generationAndValidation() {
    const generator = new DefinitionGenerator(this.serverless);

    await generator.parse().catch((err) => {
      this.log(
        `ERROR: An error was thrown generating the AsyncAPI documentation`,
        this.logTypes.ERROR
      );
      throw new this.serverless.classes.Error(err);
    });

    this.log(
      "AsyncAPI Documentation Successfully Generated",
      this.logTypes.SUCCESS
    );
    this.openAPI = generator.openAPI;
    return generator.openAPI;
  }

  processCliInput() {
    const config = {
      format: "json",
      file: "asyncapi.json",
      indent: 2,
      asyncApiVersion: "2.6.0",
    };

    config.indent = this.serverless.processedInput.options.indent || 2;
    config.format = this.serverless.processedInput.options.format || "json";
    config.asyncApiVersion =
      this.serverless.processedInput.options.asyncApiVersion || "2.6.0";

    if (["yaml", "json"].indexOf(config.format.toLowerCase()) < 0) {
      throw new this.serverless.classes.Error(
        'Invalid Output Format Specified - must be one of "yaml" or "json"'
      );
    }

    config.file =
      this.serverless.processedInput.options.output ||
      (config.format === "yaml" ? "asyncapi.yml" : "asyncapi.json");

    this.log(
      `${chalk.bold.green("[OPTIONS]")}
asyncApiVersion: "${chalk.bold.green(String(config.asyncApiVersion))}"
format: "${chalk.bold.green(config.format)}"
output file: "${chalk.bold.green(config.file)}"
indentation: "${chalk.bold.green(String(config.indent))}"
`
    );

    this.config = config;
  }
}

module.exports = AsyncAPIGenerator;

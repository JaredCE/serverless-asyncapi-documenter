"use strict";

const { Parser } = require("@asyncapi/parser");
const { v4: uuid } = require("uuid");

class DefinitionGenerator {
  constructor(serverless, options = {}) {
    this.version =
      serverless?.processedInput?.options?.asyncApiVersion || "2.6.0";

    this.serverless = serverless;
    this.asyncKeys = ["websocket", "sqs", "sns", "http", "httpApi"];

    this.componentsSchemas = {
      requestBody: "requestBodies",
      responses: "responses",
    };

    this.asyncAPI = {
      asyncapi: this.version,
      components: {
        schemas: {},
      },
    };

    // this.schemaHandler = new SchemaHandler(serverless, this.asyncAPI);

    this.operationIds = [];
    this.schemaIDs = [];

    this.componentTypes = {
      schemas: "schemas",
      securitySchemes: "securitySchemes",
    };

    this.parser = new Parser();

    try {
      this.refParserOptions = require(path.resolve("options", "ref-parser.js"));
    } catch (err) {
      this.refParserOptions = {};
    }
  }

  async parse() {
    this.createInfo();

    if (this.serverless.service.custom.asyncDocumentation.servers) {
      const servers = this.createServers(
        this.serverless.service.custom.asyncDocumentation.servers
      );

      if (Object.keys(servers).length)
        Object.assign(this.asyncAPI, { servers: servers });
    }

    if (this.serverless.service.custom.asyncDocumentation.tags) {
      const tags = this.createTags(
        this.serverless.service.custom.asyncDocumentation.tags
      );

      if (tags.length) {
        if (this.version.at(0) === "2")
          Object.assign(this.asyncAPI, { tags: tags });
        else Object.assign(this.asyncAPI.info, { tags: tags });
      }
    }

    if (this.serverless.service.custom.asyncDocumentation.externalDocs) {
      const extDoc = this.createExternalDocumentation(
        this.serverless.service.custom.asyncDocumentation.externalDocs
      );

      if (Object.keys(extDoc).length) {
        if (this.version.at(0) === "2")
          Object.assign(this.asyncAPI, { externalDocs: extDoc });
        else Object.assign(this.asyncAPI.info, { externalDocs: extDoc });
      }
    }

    // await this.createChannels().catch((err) => {
    //   throw err;
    // });
  }

  createInfo() {
    const service = this.serverless.service;
    const documentation = this.serverless.service.custom.asyncDocumentation;

    const info = {
      title: documentation?.title || service.service,
      description: documentation?.description || "",
      version: documentation?.version || uuid(),
    };

    if (documentation.termsOfService)
      info.termsOfService = documentation.termsOfService;

    if (documentation.contact) {
      const contactObj = {};
      contactObj.name = documentation.contact.name || "";

      if (documentation.contact.url) contactObj.url = documentation.contact.url;

      contactObj.email = documentation.contact.email || "";

      const extendedSpec = this.extendSpecification(documentation.contact);

      if (Object.keys(extendedSpec).length) {
        Object.assign(contactObj, extendedSpec);
      }
      Object.assign(info, { contact: contactObj });
    }

    if (documentation.license && documentation.license.name) {
      const licenseObj = {};
      licenseObj.name = documentation.license.name || "";

      if (documentation.license.url)
        licenseObj.url = documentation.license.url || "";

      const extendedSpec = this.extendSpecification(documentation.license);

      if (Object.keys(extendedSpec).length) {
        Object.assign(licenseObj, extendedSpec);
      }

      Object.assign(info, { license: licenseObj });
    }

    const extendedSpec = this.extendSpecification(documentation);

    if (Object.keys(extendedSpec).length) {
      Object.assign(info, extendedSpec);
    }

    Object.assign(this.asyncAPI, { info: info });
  }

  createExternalDocumentation(externalDocs) {
    let externalDocsObj = {};
    if (externalDocs.url) {
      externalDocsObj = {
        url: externalDocs.url,
        ...(externalDocs?.description && {
          description: externalDocs.description,
        }),
      };

      const extendedExternalDocs = this.extendSpecification(externalDocs);

      Object.assign(externalDocsObj, extendedExternalDocs);
    }
    return externalDocsObj;
  }

  createServers(servers) {
    const serversObj = {};
    for (const [key, value] of Object.entries(servers)) {
      if (/^[A-Za-z0-9_\-]+$/.test(key) && value.url && value.protocol) {
        const obj = {
          url: value.url,
          protocol: value.protocol,
          ...(value?.protocolVersion && {
            protocolVersion: value.protocolVersion,
          }),
          ...(value?.description && { description: value.description }),
        };

        if (value.tags) {
          const tags = this.createTags(value.tags);
          if (tags.length) obj.tags = tags;
        }

        if (value.variables) {
          const variables = this.createServerVariables(value.variables);
          if (Object.keys(variables).length) obj.variables = variables;
        }

        const extendedSpec = this.extendSpecification(value);

        if (Object.keys(extendedSpec).length) {
          Object.assign(obj, extendedSpec);
        }

        Object.assign(serversObj, { [key]: obj });
      }
    }

    return serversObj;
  }

  createServerVariables(variables) {
    const variablesObj = {};
    for (const [key, value] of Object.entries(variables)) {
      const obj = {
        ...(value?.enum && {
          enum: value.enum,
        }),
        ...(value?.default && {
          default: value.default,
        }),
        ...(value?.description && {
          description: value.description,
        }),
        ...(value?.examples && {
          examples: value.examples,
        }),
      };

      const extendedSpec = this.extendSpecification(value);

      if (Object.keys(extendedSpec).length) {
        Object.assign(obj, extendedSpec);
      }

      variablesObj[key] = obj;
    }

    return variablesObj;
  }

  createTags(tags) {
    const tagsArr = [];
    for (const tag of tags) {
      if (tag.name) {
        const tagsObj = {
          name: tag.name,
          ...(tag?.description && { description: tag.description }),
        };

        if (tag.externalDocs) {
          const externalDocumentation = this.createExternalDocumentation(
            tag.externalDocs
          );

          tagsObj.externalDocs = externalDocumentation;
        }

        const extendedTag = this.extendSpecification(tag);

        Object.assign(tagsObj, extendedTag);
        tagsArr.push(tagsObj);
      }
    }
    return tagsArr;
  }

  async createChannels() {}

  async createOperations() {}

  getAsyncFunctions() {
    const isAsyncFunction = (funcType) => {
      const keys = Object.keys(funcType);
      if (keys.some((key) => this.asyncKeys.includes(key))) return true;
    };

    const functionNames = this.serverless.service.getAllFunctions();

    return functionNames
      .map((functionName) => {
        return this.serverless.service.getFunction(functionName);
      })
      .filter((functionType) => {
        if (functionType?.events.some(isAsyncFunction)) return functionType;
      })
      .map((functionType) => {
        const event = functionType.events.filter(isAsyncFunction);
        return {
          functionInfo: functionType,
          handler: functionType.handler,
          name: functionType.name,
          event,
        };
      });
  }

  extendSpecification(spec) {
    const obj = {};
    for (const key of Object.keys(spec)) {
      if (/^[x\-]/i.test(key)) {
        Object.assign(obj, { [key]: spec[key] });
      }
    }

    return obj;
  }

  async validate() {
    return await this.parser.validate(this.asyncAPI).catch((err) => {
      throw err;
    });
  }
}

module.exports = DefinitionGenerator;

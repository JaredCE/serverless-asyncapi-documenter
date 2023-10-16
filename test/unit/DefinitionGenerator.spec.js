"use strict";

const decache = require("decache");

const fs = require("fs").promises;
const path = require("path");
const expect = require("chai").expect;

const serverlessMock = require("../mocks/serverless");
// const modelsDocument = require('../models/models/models.json')
const DefinitionGenerator = require("../../src/DefinitionGenerator");

describe("DefinitionGenerator", () => {
  // let serverlessMock;

  const v4 = new RegExp(
    /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i
  );

  beforeEach(function () {
    // serverlessMock = JSON.parse(JSON.stringify(serverlessMock));
    // Object.assign(serverlessMock.service.custom.documentation, modelsDocument);
    // delete require.cache[require.resolve("../mocks/serverless")];
  });

  afterEach(function () {
    //   delete require.cache[require.resolve("../mocks/serverless")];
    decache("../mocks/serverless");
  });

  describe("constructor", () => {
    it("should return a definitionGenerator", function () {
      const expected = new DefinitionGenerator(serverlessMock, {});
      expect(expected).to.be.an.instanceOf(DefinitionGenerator);
    });

    it("should default to version 2.6.0 of AsyncAPI when AsyncAPI version is not passed in", function () {
      const serverlessWithoutAsyncAPIVersion = JSON.parse(
        JSON.stringify(serverlessMock)
      );

      delete serverlessWithoutAsyncAPIVersion.processedInput;
      let expected = new DefinitionGenerator(
        serverlessWithoutAsyncAPIVersion,
        {}
      );

      expect(expected.version).to.be.equal("2.6.0");

      Object.assign(serverlessWithoutAsyncAPIVersion, { processedInput: {} });
      expected = new DefinitionGenerator(serverlessWithoutAsyncAPIVersion, {});
      expect(expected.version).to.be.equal("2.6.0");

      serverlessWithoutAsyncAPIVersion.processedInput = {
        options: {},
      };
      expected = new DefinitionGenerator(serverlessWithoutAsyncAPIVersion, {});
      expect(expected.version).to.be.equal("2.6.0");

      serverlessWithoutAsyncAPIVersion.processedInput.options = {
        test: "abc",
      };

      expected = new DefinitionGenerator(serverlessWithoutAsyncAPIVersion, {});
      expect(expected.version).to.be.equal("2.6.0");

      serverlessWithoutAsyncAPIVersion.processedInput.options = {
        asyncApiVersion: null,
      };

      expected = new DefinitionGenerator(serverlessWithoutAsyncAPIVersion, {});
      expect(expected.version).to.be.equal("2.6.0");

      serverlessWithoutAsyncAPIVersion.processedInput.options = {
        asyncApiVersion: undefined,
      };

      expected = new DefinitionGenerator(serverlessWithoutAsyncAPIVersion, {});
      expect(expected.version).to.be.equal("2.6.0");

      serverlessWithoutAsyncAPIVersion.processedInput.options = {
        asyncapiVersion: undefined,
      };

      expected = new DefinitionGenerator(serverlessWithoutAsyncAPIVersion, {});
      expect(expected.version).to.be.equal("2.6.0");
    });

    it("should respect the version of AsyncAPI when passed in", function () {
      const serverlessWithAsyncAPIVersion = JSON.parse(
        JSON.stringify(serverlessMock)
      );
      serverlessWithAsyncAPIVersion.processedInput.options.asyncApiVersion =
        "3.0.2";
      let expected = new DefinitionGenerator(serverlessWithAsyncAPIVersion, {});
      expect(expected.version).to.be.equal("3.0.2");

      serverlessWithAsyncAPIVersion.processedInput.options.asyncApiVersion =
        "3.0.1";
      expected = new DefinitionGenerator(serverlessWithAsyncAPIVersion, {});
      expect(expected.version).to.be.equal("3.0.1");
    });
  });

  describe(`createInfo`, function () {
    it(`creates an info object with the values set from serverless asyncDocumentation property`, function () {
      const mockedServerless = require("../mocks/serverless");
      const definitionGenerator = new DefinitionGenerator(mockedServerless, {});

      definitionGenerator.createInfo();
      const expected = definitionGenerator.asyncAPI;

      expect(expected).to.have.property("info");
      expect(expected.info).to.have.property("title", "My new API");
      expect(expected.info).to.have.property(
        "description",
        "This API does things"
      );
      expect(expected.info).to.have.property("version", "0.0.1");
    });

    it(`creates an info object deriving values from the serverless file when asyncDocumentation properties are missing`, function () {
      const mockedServerless = require("../mocks/serverless");
      delete mockedServerless.service.custom.asyncDocumentation.title;
      delete mockedServerless.service.custom.asyncDocumentation.version;
      const definitionGenerator = new DefinitionGenerator(mockedServerless, {});

      definitionGenerator.createInfo();
      const expected = definitionGenerator.asyncAPI;

      expect(expected).to.have.property("info");
      expect(expected.info).to.have.property(
        "title",
        serverlessMock.service.service
      );
      expect(expected.info).to.have.property(
        "description",
        "This API does things"
      );
      expect(expected.info).to.have.property("version");
      expect(v4.test(expected.info.version)).to.be.true;
    });

    it(`creates an info object with a termsOfService property`, function () {
      const mockedServerless = require("../mocks/serverless");
      mockedServerless.service.custom.asyncDocumentation.termsOfService =
        "https://example.com";
      const definitionGenerator = new DefinitionGenerator(mockedServerless, {});

      definitionGenerator.createInfo();
      const expected = definitionGenerator.asyncAPI;

      expect(expected).to.have.property("info");
      expect(expected.info).to.have.property("title", "My new API");
      expect(expected.info).to.have.property(
        "description",
        "This API does things"
      );
      expect(expected.info).to.have.property("version", "0.0.1");
      expect(expected.info).to.have.property(
        "termsOfService",
        "https://example.com"
      );
    });

    describe(`contact property`, function () {
      it(`creates a contact property on info`, function () {
        const mockedServerless = require("../mocks/serverless");
        mockedServerless.service.custom.asyncDocumentation.contact = {
          name: "Jared",
          url: "https://example.com",
          email: "jared@example.com",
        };

        const definitionGenerator = new DefinitionGenerator(
          mockedServerless,
          {}
        );

        definitionGenerator.createInfo();
        const expected = definitionGenerator.asyncAPI;

        expect(expected).to.have.property("info");
        expect(expected.info).to.have.property("contact");
        expect(expected.info.contact).to.have.property("name", "Jared");
      });

      it(`extends the contact property when properly extended`, function () {
        const mockedServerless = require("../mocks/serverless");
        mockedServerless.service.custom.asyncDocumentation.contact = {
          name: "Jared",
          url: "https://example.com",
          email: "jared@example.com",
          "x-extended-field": "More",
        };
        const definitionGenerator = new DefinitionGenerator(
          mockedServerless,
          {}
        );

        definitionGenerator.createInfo();
        const expected = definitionGenerator.asyncAPI;

        expect(expected).to.have.property("info");
        expect(expected.info).to.have.property("contact");
        expect(expected.info.contact).to.have.property(
          "x-extended-field",
          "More"
        );
      });

      it(`ignores invalid extension fields`, function () {
        const mockedServerless = require("../mocks/serverless");
        mockedServerless.service.custom.asyncDocumentation.contact = {
          name: "Jared",
          url: "https://example.com",
          email: "jared@example.com",
          "extended-field": "More",
        };
        const definitionGenerator = new DefinitionGenerator(
          mockedServerless,
          {}
        );

        definitionGenerator.createInfo();
        const expected = definitionGenerator.asyncAPI;

        expect(expected).to.have.property("info");
        expect(expected.info).to.have.property("contact");
        expect(expected.info.contact).to.not.have.property("extended-field");
      });
    });

    describe(`license property`, function () {
      it(`creates a license property on info`, function () {
        const mockedServerless = require("../mocks/serverless");
        mockedServerless.service.custom.asyncDocumentation.license = {
          name: "Apache 2.0",
          url: "https://example.com",
        };
        const definitionGenerator = new DefinitionGenerator(
          mockedServerless,
          {}
        );

        definitionGenerator.createInfo();
        const expected = definitionGenerator.asyncAPI;

        expect(expected).to.have.property("info");
        expect(expected.info).to.have.property("license");
        expect(expected.info.license).to.have.property("name", "Apache 2.0");
      });

      it(`does not create a license property on info when name is missing`, function () {
        const mockedServerless = require("../mocks/serverless");
        mockedServerless.service.custom.asyncDocumentation.license = {
          url: "https://example.com",
        };
        const definitionGenerator = new DefinitionGenerator(
          mockedServerless,
          {}
        );

        definitionGenerator.createInfo();
        const expected = definitionGenerator.asyncAPI;

        expect(expected).to.have.property("info");
        expect(expected.info).to.not.have.property("license");
      });

      it(`extends the license property when properly extended`, function () {
        const mockedServerless = require("../mocks/serverless");
        mockedServerless.service.custom.asyncDocumentation.license = {
          name: "Apache 2.0",
          url: "https://example.com",
          "x-extended-field": "More",
        };
        const definitionGenerator = new DefinitionGenerator(
          mockedServerless,
          {}
        );

        definitionGenerator.createInfo();
        const expected = definitionGenerator.asyncAPI;

        expect(expected).to.have.property("info");
        expect(expected.info).to.have.property("license");
        expect(expected.info.license).to.have.property(
          "x-extended-field",
          "More"
        );
      });

      it(`ignores invalid extension fields`, function () {
        const mockedServerless = require("../mocks/serverless");
        mockedServerless.service.custom.asyncDocumentation.license = {
          name: "Apache 2.0",
          url: "https://example.com",
          "extended-field": "More",
        };
        const definitionGenerator = new DefinitionGenerator(
          mockedServerless,
          {}
        );

        definitionGenerator.createInfo();
        const expected = definitionGenerator.asyncAPI;

        expect(expected).to.have.property("info");
        expect(expected.info).to.have.property("license");
        expect(expected.info.license).to.not.have.property("extended-field");
      });
    });

    it(`creates an info object with extended fields when provided`, function () {
      const mockedServerless = require("../mocks/serverless");
      mockedServerless.service.custom.asyncDocumentation["x-extended-info"] =
        "my name is jared";
      const definitionGenerator = new DefinitionGenerator(mockedServerless, {});

      definitionGenerator.createInfo();
      const expected = definitionGenerator.asyncAPI;
      expect(expected).to.have.property("info");
      expect(expected.info).to.have.property(
        "x-extended-info",
        "my name is jared"
      );
    });

    it(`creates an info object and ignores fields that are not properly extended`, function () {
      const mockedServerless = require("../mocks/serverless");
      mockedServerless.service.custom.asyncDocumentation["extended-info"] =
        "my name is jared";
      const definitionGenerator = new DefinitionGenerator(mockedServerless, {});

      definitionGenerator.createInfo();
      const expected = definitionGenerator.asyncAPI;
      expect(expected).to.have.property("info");
      expect(expected.info).to.not.have.property("extended-info");
    });

    it(`throws an error when the asyncDocumentation property is missing`, function () {
      const mockedServerless = require("../mocks/serverless");
      delete mockedServerless.service.custom.asyncDocumentation;
      const definitionGenerator = new DefinitionGenerator(mockedServerless, {});

      expect(() => {
        definitionGenerator.createInfo();
      }).to.throw();
    });
  });

  describe(`parse`, function () {
    describe(`servers`, function () {
      it(`creates a servers object when valid server objects are set`, async function () {
        const mockedServerless = require("../mocks/serverless");
        const definitionGenerator = new DefinitionGenerator(
          mockedServerless,
          {}
        );

        await definitionGenerator.parse();
        const expected = definitionGenerator.asyncAPI;

        expect(expected).to.have.property("servers");
        expect(expected.servers).to.have.property("production");
      });

      it(`adds protocolVersion to a server object when set`, async function () {
        const mockedServerless = require("../mocks/serverless");
        mockedServerless.service.custom.asyncDocumentation.servers.production.protocolVersion =
          "2.0";
        const definitionGenerator = new DefinitionGenerator(
          mockedServerless,
          {}
        );

        await definitionGenerator.parse();
        const expected = definitionGenerator.asyncAPI;

        expect(expected).to.have.property("servers");
        expect(expected.servers).to.have.property("production");
        expect(expected.servers.production).to.have.property(
          "protocolVersion",
          "2.0"
        );
      });

      it(`adds description to a server object when set`, async function () {
        const mockedServerless = require("../mocks/serverless");
        mockedServerless.service.custom.asyncDocumentation.servers.production.description =
          "The production server";
        const definitionGenerator = new DefinitionGenerator(
          mockedServerless,
          {}
        );

        await definitionGenerator.parse();
        const expected = definitionGenerator.asyncAPI;

        expect(expected).to.have.property("servers");
        expect(expected.servers).to.have.property("production");
        expect(expected.servers.production).to.have.property(
          "description",
          "The production server"
        );
      });

      it(`adds tags to a server object when set`, async function () {
        const mockedServerless = require("../mocks/serverless");
        mockedServerless.service.custom.asyncDocumentation.servers.production.tags =
          [
            {
              name: "env:production",
              description: "the production environment",
            },
          ];
        const definitionGenerator = new DefinitionGenerator(
          mockedServerless,
          {}
        );

        await definitionGenerator.parse();
        const expected = definitionGenerator.asyncAPI;

        expect(expected).to.have.property("servers");
        expect(expected.servers).to.have.property("production");
        expect(expected.servers.production).to.have.property("tags");
        expect(expected.servers.production.tags).to.be.an("array");
        expect(expected.servers.production.tags).to.have.lengthOf(1);
      });

      it(`adds variables to a server object when variables are set`, async function () {
        const mockedServerless = require("../mocks/serverless");
        mockedServerless.service.custom.asyncDocumentation.servers.production.variables =
          {
            username: {
              default: "demo",
            },
          };
        const definitionGenerator = new DefinitionGenerator(
          mockedServerless,
          {}
        );

        await definitionGenerator.parse();
        const expected = definitionGenerator.asyncAPI;

        expect(expected).to.have.property("servers");
        expect(expected.servers).to.have.property("production");
        expect(expected.servers.production).to.have.property("variables");
        expect(expected.servers.production.variables).to.have.property(
          "username"
        );
        expect(expected.servers.production.variables.username).to.have.property(
          "default",
          "demo"
        );
      });

      it(`creates a server object with extended fields`, async function () {
        const mockedServerless = require("../mocks/serverless");
        mockedServerless.service.custom.asyncDocumentation.servers.production[
          "x-extended-field"
        ] = "more";
        const definitionGenerator = new DefinitionGenerator(
          mockedServerless,
          {}
        );

        await definitionGenerator.parse();
        const expected = definitionGenerator.asyncAPI;

        expect(expected).to.have.property("servers");
        expect(expected.servers).to.have.property("production");
        expect(expected.servers.production).to.have.property(
          "x-extended-field",
          "more"
        );
      });

      it(`creates a server object without properly extended fields`, async function () {
        const mockedServerless = require("../mocks/serverless");
        mockedServerless.service.custom.asyncDocumentation.servers.production[
          "extended-field"
        ] = "more";
        const definitionGenerator = new DefinitionGenerator(
          mockedServerless,
          {}
        );

        await definitionGenerator.parse();
        const expected = definitionGenerator.asyncAPI;

        expect(expected).to.have.property("servers");
        expect(expected.servers).to.have.property("production");
        expect(expected.servers.production).to.not.have.property(
          "extended-field"
        );
      });

      it(`does not create a servers object when a server object does not meet the required name regexp`, async function () {
        const mockedServerless = require("../mocks/serverless");
        delete mockedServerless.service.custom.asyncDocumentation.servers
          .production;
        mockedServerless.service.custom.asyncDocumentation.servers["😍"] = {
          url: "example.com",
          protocol: "http",
        };
        const definitionGenerator = new DefinitionGenerator(
          mockedServerless,
          {}
        );

        await definitionGenerator.parse();
        const expected = definitionGenerator.asyncAPI;

        expect(expected).to.not.have.property("servers");
      });

      it(`does not create a servers object when a server object does not contain a url`, async function () {
        const mockedServerless = require("../mocks/serverless");
        delete mockedServerless.service.custom.asyncDocumentation.servers
          .production.url;

        const definitionGenerator = new DefinitionGenerator(
          mockedServerless,
          {}
        );

        await definitionGenerator.parse();
        const expected = definitionGenerator.asyncAPI;

        expect(expected).to.not.have.property("servers");
      });

      it(`does not create a servers object when a server object does not contain a protocol`, async function () {
        const mockedServerless = require("../mocks/serverless");
        delete mockedServerless.service.custom.asyncDocumentation.servers
          .production.protocol;

        const definitionGenerator = new DefinitionGenerator(
          mockedServerless,
          {}
        );

        await definitionGenerator.parse();
        const expected = definitionGenerator.asyncAPI;

        expect(expected).to.not.have.property("servers");
      });
    });

    describe(`tags`, function () {
      it(`creates a tags object when valid tags array is set`, async function () {
        const mockedServerless = require("../mocks/serverless");
        mockedServerless.service.custom.asyncDocumentation.tags = [
          { name: "tag1" },
        ];
        const definitionGenerator = new DefinitionGenerator(
          mockedServerless,
          {}
        );

        await definitionGenerator.parse();
        const expected = definitionGenerator.asyncAPI;

        expect(expected).to.have.property("tags");
        expect(expected.tags).to.be.an("array");
      });

      it(`creates a tag object with extended fields`, async function () {
        const mockedServerless = require("../mocks/serverless");
        mockedServerless.service.custom.asyncDocumentation.tags = [
          { name: "tag1", "x-extended-field": "more" },
        ];
        const definitionGenerator = new DefinitionGenerator(
          mockedServerless,
          {}
        );

        await definitionGenerator.parse();
        const expected = definitionGenerator.asyncAPI;

        expect(expected).to.have.property("tags");
        expect(expected.tags).to.be.an("array");
        expect(expected.tags).to.have.lengthOf(1);
        expect(expected.tags.at(0)).to.have.property(
          "x-extended-field",
          "more"
        );
      });

      it(`creates a tag object without properly extended fields`, async function () {
        const mockedServerless = require("../mocks/serverless");
        mockedServerless.service.custom.asyncDocumentation.tags = [
          { name: "tag1", "extended-field": "more" },
        ];
        const definitionGenerator = new DefinitionGenerator(
          mockedServerless,
          {}
        );

        await definitionGenerator.parse();
        const expected = definitionGenerator.asyncAPI;

        expect(expected).to.have.property("tags");
        expect(expected.tags).to.be.an("array");
        expect(expected.tags).to.have.lengthOf(1);
        expect(expected.tags.at(0)).to.not.have.property("extended-field");
      });

      it(`does not set a tag object when there are no tags`, async function () {
        const mockedServerless = require("../mocks/serverless");
        const definitionGenerator = new DefinitionGenerator(
          mockedServerless,
          {}
        );

        await definitionGenerator.parse();
        const expected = definitionGenerator.asyncAPI;

        expect(expected).to.not.have.property("tags");
      });

      it(`assigns tags to the info object when asyncAPI version is 3`, async function () {
        const mockedServerless = require("../mocks/serverless");
        mockedServerless.processedInput.options.asyncApiVersion = "3.0.0";
        mockedServerless.service.custom.asyncDocumentation.tags = [
          { name: "tag1" },
        ];
        const definitionGenerator = new DefinitionGenerator(
          mockedServerless,
          {}
        );

        await definitionGenerator.parse();
        const expected = definitionGenerator.asyncAPI.info;

        expect(expected).to.have.property("tags");
        expect(expected.tags).to.be.an("array");
      });
    });

    describe(`externalDocs`, function () {
      it(`creates an externalDocs object when valid set`, async function () {
        const mockedServerless = require("../mocks/serverless");
        mockedServerless.service.custom.asyncDocumentation.externalDocs = {
          url: "https://example.com",
        };
        const definitionGenerator = new DefinitionGenerator(
          mockedServerless,
          {}
        );

        await definitionGenerator.parse();
        const expected = definitionGenerator.asyncAPI;

        expect(expected).to.have.property("externalDocs");
      });

      it(`creates an externalDocs object with extended fields`, async function () {
        const mockedServerless = require("../mocks/serverless");
        mockedServerless.service.custom.asyncDocumentation.externalDocs = {
          url: "https://example.com",
          "x-extended-field": "more",
        };
        const definitionGenerator = new DefinitionGenerator(
          mockedServerless,
          {}
        );

        await definitionGenerator.parse();
        const expected = definitionGenerator.asyncAPI;

        expect(expected).to.have.property("externalDocs");
        expect(expected.externalDocs).to.have.property(
          "x-extended-field",
          "more"
        );
      });

      it(`creates an externalDocs object without properly extended fields`, async function () {
        const mockedServerless = require("../mocks/serverless");
        mockedServerless.service.custom.asyncDocumentation.externalDocs = {
          url: "https://example.com",
          "extended-field": "more",
        };
        const definitionGenerator = new DefinitionGenerator(
          mockedServerless,
          {}
        );

        await definitionGenerator.parse();
        const expected = definitionGenerator.asyncAPI;

        expect(expected).to.have.property("externalDocs");
        expect(expected.externalDocs).to.not.have.property("extended-field");
      });

      it(`does not create an externalDocs object without a url`, async function () {
        const mockedServerless = require("../mocks/serverless");
        mockedServerless.service.custom.asyncDocumentation.externalDocs = {
          description: "https://example.com",
        };
        const definitionGenerator = new DefinitionGenerator(
          mockedServerless,
          {}
        );

        await definitionGenerator.parse();
        const expected = definitionGenerator.asyncAPI;

        expect(expected).to.not.have.property("externalDocs");
      });

      it(`assigns externalDocs to the info object when asyncAPI version is 3`, async function () {
        const mockedServerless = require("../mocks/serverless");
        mockedServerless.processedInput.options.asyncApiVersion = "3.0.0";
        mockedServerless.service.custom.asyncDocumentation.externalDocs = {
          url: "https://example.com",
        };
        const definitionGenerator = new DefinitionGenerator(
          mockedServerless,
          {}
        );

        await definitionGenerator.parse();
        const expected = definitionGenerator.asyncAPI.info;

        expect(expected).to.have.property("externalDocs");
      });
    });
  });
});

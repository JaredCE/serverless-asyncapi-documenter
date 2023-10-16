"use strict";

module.exports = {
  processedInput: {
    options: {
      asyncApiVersion: "2.6.0",
    },
  },
  service: {
    service: "myAPI",
    custom: {
      asyncDocumentation: {
        title: "My new API",
        description: "This API does things",
        version: "0.0.1",
        servers: {
          production: {
            url: "example.com",
            protocol: "http",
          },
        },
      },
    },
    getAllFunctions: () => {},
    getFunction: () => {},
  },
};

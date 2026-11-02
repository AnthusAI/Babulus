Feature: DSL AST validation

  Scenario: Accept a default export module
    Given a TypeScript module:
      """
      export default {
        id: "intro",
        storyboard: { scenes: [] }
      };
      """
    When I validate the module source
    Then the module validation should succeed

  Scenario: Reject an import
    Given a TypeScript module:
      """
      import fs from "node:fs";
      export default { id: "intro", storyboard: { scenes: [] } };
      """
    When I validate the module source
    Then the module validation should fail
    And the first module error message should be "Imports are not allowed."

  Scenario: Reject require calls
    Given a TypeScript module:
      """
      const fs = require("fs");
      export default { id: "intro", storyboard: { scenes: [] } };
      """
    When I validate the module source
    Then the module validation should fail
    And the first module error message should be "require() is not allowed."

  Scenario: Reject eval calls
    Given a TypeScript module:
      """
      const value = eval("1 + 1");
      export default { id: "intro", storyboard: { scenes: [] } };
      """
    When I validate the module source
    Then the module validation should fail
    And the first module error message should be "eval() is not allowed."

  Scenario: Reject dynamic import
    Given a TypeScript module:
      """
      const mod = import("fs");
      export default { id: "intro", storyboard: { scenes: [] } };
      """
    When I validate the module source
    Then the module validation should fail
    And the first module error message should be "Dynamic import() is not allowed."

  Scenario: Reject new Function
    Given a TypeScript module:
      """
      const build = new Function("return 1");
      export default { id: "intro", storyboard: { scenes: [] } };
      """
    When I validate the module source
    Then the module validation should fail
    And the first module error message should be "new Function() is not allowed."

  Scenario: Reject banned identifiers
    Given a TypeScript module:
      """
      export default { id: process.env.VIDEO_ID, storyboard: { scenes: [] } };
      """
    When I validate the module source
    Then the module validation should fail
    And the first module error message should be "Identifier \"process\" is not allowed."

  Scenario: Require default export
    Given a TypeScript module:
      """
      export const foo = 1;
      """
    When I validate the module source
    Then the module validation should fail
    And the first module error message should be "Module must have a default export."
    And the first module error location should be line 1 column 1

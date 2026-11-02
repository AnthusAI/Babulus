Feature: Slugify helper

  Scenario: Slugify basic phrase
    When I slugify "Hello World"
    Then the slug should be "hello-world"

  Scenario: Slugify trims and collapses spaces
    When I slugify "  Hello   World  "
    Then the slug should be "hello-world"

  Scenario: Slugify removes punctuation
    When I slugify "Babulus: DSL!"
    Then the slug should be "babulus-dsl"

  Scenario: Slugify empty input
    When I slugify "!!!"
    Then the slug should be "item"

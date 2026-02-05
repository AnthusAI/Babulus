Feature: Designers documentation

  Scenario: Designers category is ordered before developer docs
    When I list docs categories
    Then the docs categories should place "Designers" before "Developer Reference"

  Scenario: Components docs exist with preview mounts
    When I load the components docs entry
    Then the components docs category should be "Designers"
    Then the components docs should include preview mounts:
      | id |
      | components-reel |
      | components-title |
      | components-background |
      | components-progress |
      | components-lower-third |
      | components-bullets |
      | components-callout |
      | components-chyron |
      | components-code |
      | components-quote |

  Scenario: Title and subtitle text effects render markers
    When I render a title and subtitle with text effects to HTML
    Then the HTML should include text effects markers

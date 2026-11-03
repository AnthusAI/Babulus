Feature: Every Studio row and file belongs to one Account, and the server enforces it

  Studio data is scoped by Prospectus Account. The Account ID is the `orgId` on every row and the
  `org/<Account ID>/` prefix on every stored file. A person may use an Account only when the Account's ID is
  one of the Cognito groups in their verified ID token; the sign-in service sets those groups and gives one
  to each Account where the person is an active owner, admin or member and the Account holds the `babulus`
  entitlement. Nothing the browser sends is trusted to name an Account.

  Background:
    Given Account A and Account B exist
    And Ada is a member of Account A
    And Bo is a member of Account B
    And Cy signed in but has no Account that holds the babulus entitlement

  Scenario: The data schema has no model for organizations, members or profiles
    When I read the generated data schema
    Then the schema has no model named "Org"
    And the schema has no model named "OrgMember"
    And the schema has no model named "UserProfile"

  Scenario: Every model is limited to the Account named by the row and nothing else
    When I read the generated data schema
    Then every model has exactly one rule: Account members by the "orgId" field
    And no model allows every signed-in user, guests or an API key

  Scenario Outline: A member of one Account cannot reach another Account's rows
    When I read the generated data schema
    Then Ada may <operation> a <model> row of Account A
    And Ada may not <operation> a <model> row of Account B
    And Bo may not <operation> a <model> row of Account A

    Examples:
      | model          | operation |
      | Project        | read      |
      | Project        | create    |
      | Project        | update    |
      | Project        | delete    |
      | Video          | read      |
      | Video          | update    |
      | Video          | delete    |
      | Job            | read      |
      | Job            | create    |
      | Job            | delete    |
      | ProjectFile    | read      |
      | ProjectFile    | create    |
      | ProjectFile    | delete    |
      | PublishedVideo | read      |
      | UsageEvent     | read      |
      | BillingAccount | update    |

  Scenario: A person with no Account holding the babulus entitlement is refused everywhere
    When I read the generated data schema
    Then Cy may not read a Project row of Account A
    And Cy may not create a Project row of Account A
    And Cy may not read a Job row of Account B

  Scenario Outline: A job's state and retry counters are written only by the server
    When I read the generated data schema
    Then the Job field "<field>" is readable by Account members
    And no Account member may write the Job field "<field>"

    Examples:
      | field           |
      | status          |
      | retryCount      |
      | maxRetries      |
      | claimedByAgentId |

  Scenario: A video's status is written only by the server
    When I read the generated data schema
    Then the Video field "status" is readable by Account members
    And no Account member may write the Video field "status"

  Scenario: A new job starts queued without the browser choosing its state
    When I read the generated data schema
    Then the Job field "status" defaults to "queued"
    And the Job field "retryCount" defaults to "0"

  Scenario: The server accepts an Account only when the verified token names it
    When Ada's token is verified for Account A
    Then access to Account A is allowed
    And the verified Accounts are exactly Account A

  Scenario: A member of Account A is refused Account B
    When Ada's token is verified for Account B
    Then access is refused with status 403

  Scenario: A person with no Account is refused for every Account
    When Cy's token is verified for Account A
    Then access is refused with status 403
    When Cy's token is verified for Account B
    Then access is refused with status 403

  Scenario Outline: A token that cannot be verified is refused as unauthenticated
    When a <kind> token is verified for Account A
    Then access is refused with status 401

    Examples:
      | kind               |
      | forged             |
      | unsigned           |
      | expired            |
      | wrong-audience     |
      | missing            |

  Scenario: Groups that are not Account IDs never grant an Account
    When a token whose groups are "admin" and "A" is verified for Account A
    Then access is refused with status 403

  Scenario: An Account ID in the request that is not an Account ID is refused
    When Ada's token is verified for the Account ID "../account-b"
    Then access is refused with status 403

  Scenario Outline: Babulus permissions are capped by the Prospectus role
    Then the Prospectus role "<role>" maps to the Babulus role "<babulus>"

    Examples:
      | role   | babulus |
      | owner  | owner   |
      | admin  | admin   |
      | member | editor  |
      | viewer | none    |

  Scenario: Object keys are built under the verified Account
    When I build the object key for Account A and path "projects/p1/video.babulus.xml"
    Then the key is "org/<Account A>/projects/p1/video.babulus.xml"

  Scenario Outline: A path cannot leave the Account's prefix
    When I build the object key for Account A and path "<path>"
    Then the key is refused

    Examples:
      | path                             |
      | ../<Account B>/projects/p1/x     |
      | projects/../../<Account B>/x     |
      | /org/<Account B>/x               |
      | org/<Account B>/x/..             |
      | projects//x                      |
      | projects\\x                      |
      | https://example.test/x           |

  Scenario: A stored key under another Account's prefix is refused
    When I check the stored key "org/<Account B>/projects/p1/render.mp4" against Account A
    Then the key is refused

  Scenario: Ada receives a short-lived link to her own Account's file
    When Ada asks the media route for "org/<Account A>/videos/v1/runs/r1/render.mp4" in Account A
    Then the media route answers 200 with a signed link
    And exactly one link was signed, for "org/<Account A>/videos/v1/runs/r1/render.mp4"

  Scenario: Ada cannot get a link to Account B's file by naming Account B
    When Ada asks the media route for "org/<Account B>/videos/v1/runs/r1/render.mp4" in Account B
    Then the media route answers 403
    And no link was signed

  Scenario: Ada cannot get a link to Account B's file by naming her own Account
    When Ada asks the media route for "org/<Account B>/videos/v1/runs/r1/render.mp4" in Account A
    Then the media route answers 403
    And no link was signed

  Scenario: Ada cannot reach Account B's file with a traversal key
    When Ada asks the media route for "org/<Account A>/../<Account B>/videos/v1/render.mp4" in Account A
    Then the media route answers 403
    And no link was signed

  Scenario: Cy, with no Account, gets no link
    When Cy asks the media route for "org/<Account A>/videos/v1/runs/r1/render.mp4" in Account A
    Then the media route answers 403
    And no link was signed

  Scenario: An unsigned request gets no link
    When an unsigned caller asks the media route for "org/<Account A>/videos/v1/runs/r1/render.mp4" in Account A
    Then the media route answers 401
    And no link was signed

  Scenario: The media route needs an Account and a key
    When Ada asks the media route for "" in Account A
    Then the media route answers 400

  Scenario: Signed-in browsers have no direct access to Account files
    When I read the storage access rules
    Then no rule names the "org" prefix
    And no signed-in user may write under "published"
    And guests may read under "published"

  Scenario: Publishing keeps each Account's published files apart
    Then a video published by Account A as "launch-video" is stored under "published/<Account A>/launch-video.mp4"

  Scenario Outline: A slug cannot redirect a published file
    Then publishing as "<slug>" is refused

    Examples:
      | slug          |
      | ../other      |
      | a/b           |
      | UPPER         |
      | x             |

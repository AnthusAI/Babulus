Feature: The babul.us front door
  As the operator of Babulus
  I want babul.us served through our own CloudFront distribution
  So that the Studio can use the domain even though its DNS lives in another AWS account

  Amplify refuses to attach a domain across AWS accounts without a manual approval,
  so CloudFront passes requests to the Studio's default Amplify address.

  Scenario: The front door passes visitors to the Studio without caching
    Given the babul.us front door template
    Then it serves babul.us over https only
    And it sends every request to the Studio's Amplify branch address
    And it caches nothing

  Scenario: The front door can't start compute or change permissions
    Given the babul.us front door template
    Then it creates only a CloudFront function and a distribution

  Scenario: The old address sends visitors to babul.us
    Given the Studio's Next.js configuration
    Then a request for babulus.anth.us redirects to the same path on babul.us
    And the redirect is temporary, so it can be changed later

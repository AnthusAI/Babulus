Feature: Embed markup accepts both data-babulus and data-auritus attributes
  Pages written for Auritus use data-auritus-* attributes. The embed now
  reads data-babulus-* as the current spelling and keeps data-auritus-* as an
  alias, so no existing page has to change. Both spellings must produce the
  same narration text and therefore the same content hash, so audio that was
  already generated stays valid. If an element carries both spellings, the
  data-babulus-* value wins. These scenarios run the built embed bundle in a
  simulated browser document.

  Scenario Outline: Either spelling of a narration rule has the same effect
    Given the page article:
      """
      <article id="story"><p>Kept.</p><aside <ignore>>Skipped.</aside><p <pronounce>>Wrong</p></article>
      """
    When the embed extracts the narration text from "#story"
    Then the narration text includes "Kept."
    And the narration text does not include "Skipped."
    And the narration text includes "Babulus"
    And the narration text does not include "Wrong"

    Examples:
      | ignore              | pronounce                             |
      | data-babulus-ignore | data-babulus-pronounce="Babulus"      |
      | data-auritus-ignore | data-auritus-pronounce="Babulus"      |

  Scenario: Break and pause markers work under both spellings
    Given the page article:
      """
      <article id="story"><p>One<span data-babulus-break></span>Two<span data-auritus-pause></span>Three</p></article>
      """
    When the embed extracts the narration text from "#story"
    Then the narration text includes the break marker
    And the narration text includes the pause marker

  Scenario: Old and new markup produce the same content hash
    Given the page article:
      """
      <article id="story"><p>Hello there.</p><aside data-auritus-ignore>Ad.</aside></article>
      """
    When the embed extracts the narration text from "#story"
    And I remember the content hash
    And the page article is replaced by:
      """
      <article id="story"><p>Hello there.</p><aside data-babulus-ignore>Ad.</aside></article>
      """
    And the embed extracts the narration text from "#story"
    Then the content hash is the one I remembered

  Scenario: The current spelling wins when both are present
    Given the page article:
      """
      <article id="story"><p data-babulus-pronounce="Current" data-auritus-pronounce="Legacy">x</p></article>
      """
    When the embed extracts the narration text from "#story"
    Then the narration text includes "Current"
    And the narration text does not include "Legacy"

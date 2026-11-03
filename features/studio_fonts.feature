Feature: Studio fonts
  As the operator of Babulus
  I want the Studio's fonts to ship with the Studio
  So that a deploy never fails because a font host was unreachable during the build

  The Studio build used to download its fonts from Google Fonts while it ran.
  When that download answered badly, the whole build failed and nothing deployed,
  even though the code had not changed. The fonts are now files in the repository,
  so the build needs nothing from outside. Most are committed with their licences;
  Russo One comes from its npm package, which carries its own licence.

  Scenario: No Studio source asks Google for fonts
    Given the Studio source files
    Then none of them imports the Google font loader

  Scenario: Every font file the layout names exists
    Given the Studio source files
    Then each font file the layout loads is in the repository or in an installed font package

  Scenario: Each font family brings its licence
    Given the Studio source files
    Then each font the layout loads comes with its licence file

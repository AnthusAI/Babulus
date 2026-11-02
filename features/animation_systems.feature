Feature: Animation systems

  Scenario: Animation docs include preview mounts
    When I load the animation docs entry
    Then the animation docs should include preview mounts:
      | id |
      | animation-reel |
      | animation-framer |
      | animation-d3 |
      | animation-processing |
      | animation-three |
      | animation-lottie |
      | animation-text-effects |
      | animation-anime |
      | animation-mix |

  Scenario: Engine demo components are registered
    When I list renderer components
    Then the component registry should include:
      | name |
      | FramerMotionDemo |
      | D3BarChart |
      | P5Particles |
      | ThreeOrbit |
      | LottieBadge |
      | MixAndMatchDemo |
      | AnimeHarnessDemo |
      | TextEffectsDemo |
      | TextEffects |

  Scenario: Render engine demos to HTML
    When I render an animation demo frame to HTML
    Then the HTML should include engine markers:
      | engine |
      | framer |
      | d3 |
      | p5 |
      | three |
      | lottie |
      | anime |
      | text-effects |

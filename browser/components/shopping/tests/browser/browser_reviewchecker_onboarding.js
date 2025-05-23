/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  ShoppingUtils: "resource:///modules/ShoppingUtils.sys.mjs",
});

const { SpecialMessageActions } = ChromeUtils.importESModule(
  "resource://messaging-system/lib/SpecialMessageActions.sys.mjs"
);

const PRODUCT_URI = Services.io.newURI(
  "https://example.com/product/B09TJGHL5F"
);
const CONTENT_PAGE_URI = Services.io.newURI("https://example.com");
const UNSUPPORTED_NON_PDP_URL = "about:about";
const UNSUPPORTED_NON_PDP_URI = Services.io.newURI(UNSUPPORTED_NON_PDP_URL);

const REVIEW_CHECKER_ACTOR = "ReviewChecker";

const EMPTY_STATE_CLASS_NAME = ".FS_OPT_IN_SIDEBAR_VARIANT";
const EMPTY_STATE_UNSUPPORTED_PDP_CLASS_NAME =
  ".FS_OPT_IN_SIDEBAR_VARIANT_UNSUPPORTED_NON_PDP";

/**
 * Toggle prefs involved in automatically activating the sidebar on PDPs if the
 * user has not opted in. Onboarding should only try to auto-activate the
 * sidebar for non-opted-in users once per session at most, no more than once
 * per day, and no more than two times total.
 *
 * @param {object} states An object containing pref states to set. Leave a
 *   property undefined to ignore it.
 * @param {boolean} [states.active] Global sidebar toggle
 * @param {number} [states.optedIn] 2: opted out, 1: opted in, 0: not opted in
 * @param {number} [states.lastAutoActivate] Last auto activate date in seconds
 * @param {number} [states.autoActivateCount] Number of auto-activations (max 2)
 * @param {boolean} [states.handledAutoActivate] True if the sidebar handled its
 *   auto-activation logic this session, preventing further auto-activations
 */
function setOnboardingPrefs(states = {}) {
  if (Object.hasOwn(states, "handledAutoActivate")) {
    ShoppingUtils.handledAutoActivate = !!states.handledAutoActivate;
  }

  if (Object.hasOwn(states, "lastAutoActivate")) {
    Services.prefs.setIntPref(
      "browser.shopping.experience2023.lastAutoActivate",
      states.lastAutoActivate
    );
  }

  if (Object.hasOwn(states, "autoActivateCount")) {
    Services.prefs.setIntPref(
      "browser.shopping.experience2023.autoActivateCount",
      states.autoActivateCount
    );
  }

  if (Object.hasOwn(states, "optedIn")) {
    Services.prefs.setIntPref(
      "browser.shopping.experience2023.optedIn",
      states.optedIn
    );
  }

  if (Object.hasOwn(states, "active")) {
    Services.prefs.setBoolPref(
      "browser.shopping.experience2023.active",
      states.active
    );
  }

  if (Object.hasOwn(states, "telemetryEnabled")) {
    Services.prefs.setBoolPref(
      "browser.newtabpage.activity-stream.telemetry",
      states.telemetryEnabled
    );
  }
}

/**
 * Checks that we're rendering the expected onboarding UI in about:shoppingsidebar.
 * Unlike assertEmptyStateTypeWithRC, this function is meant for tests that load
 * about:shoppingsidebar in a tab and don't utilize the sidebar.
 *
 * @param {Browser} browser the current browser
 * @param {string} messageName class name of the expected onboarding UI
 */
async function assertEmptyStateType(browser, messageName) {
  await SpecialPowers.spawn(browser, [messageName], async className => {
    let shoppingContainer = await ContentTaskUtils.waitForCondition(
      () => content.document.querySelector("shopping-container"),
      "shopping-container"
    );
    let containerElem =
      shoppingContainer.shadowRoot.getElementById("shopping-container");
    let messageSlot = containerElem.getElementsByTagName("slot");

    // Check multi-stage-message-slot used to show opt-In message is
    // rendered inside shopping container when user optedIn pref value is 0
    ok(messageSlot.length, `message slot element exists`);
    is(
      messageSlot[0].name,
      "multi-stage-message-slot",
      "multi-stage-message-slot showing opt-in message rendered"
    );

    ok(
      !content.document.getElementById("multi-stage-message-root").hidden,
      "message is shown"
    );
    ok(content.document.querySelector(className), "Rendered correct message");
  });
}

/**
 * Checks that we're rendering the expected onboarding UI in the
 * Review Checker sidebar panel. Works differently from assertEmptyStateType by
 * utilizing the helper function withReviewCheckerSidebar.
 *
 * @param {string} emptyStateClassName class name of the expected onboarding UI
 */
async function assertEmptyStateTypeWithRC(emptyStateClassName) {
  await withReviewCheckerSidebar(
    async className => {
      let shoppingContainer = await ContentTaskUtils.waitForCondition(
        () =>
          content.document.querySelector("shopping-container")?.wrappedJSObject,
        "Review Checker is loaded."
      );
      await shoppingContainer.updateComplete;
      let containerElem =
        shoppingContainer.shadowRoot.getElementById("shopping-container");
      let messageSlot = containerElem.getElementsByTagName("slot");

      // Check multi-stage-message-slot used to show opt-In message is
      // rendered inside shopping container when user optedIn pref value is 0
      ok(messageSlot.length, `message slot element exists`);
      is(
        messageSlot[0].name,
        "multi-stage-message-slot",
        "multi-stage-message-slot showing opt-in message rendered"
      );
      ok(
        !content.document.getElementById("multi-stage-message-root").hidden,
        "message is shown"
      );
      ok(
        content.document.querySelector(`${className}`),
        `Rendered correct message ${className}`
      );
    },
    [emptyStateClassName]
  );
}

add_setup(async function setup() {
  // Block on testFlushAllChildren to ensure Glean is initialized before
  // running tests.
  await Services.fog.testFlushAllChildren();
  Services.fog.testResetFOG();
  // Set all the prefs/states modified by this test to default values.
  registerCleanupFunction(() =>
    setOnboardingPrefs({
      active: true,
      optedIn: 1,
      lastAutoActivate: 0,
      autoActivateCount: 0,
      handledAutoActivate: false,
      telementryEnabled: false,
    })
  );
});

/**
 * Test to check onboarding message container is rendered
 * when user is not opted-in for the sidebar integrated version
 * of Review Checker.
 */
add_task(async function test_showOnboarding_notOptedIn() {
  // OptedIn pref Value is 0 when a user hasn't opted-in
  setOnboardingPrefs({ active: false, optedIn: 0, telemetryEnabled: true });

  Services.fog.testResetFOG();
  await Services.fog.testFlushAllChildren();

  await BrowserTestUtils.withNewTab(
    {
      url: "about:shoppingsidebar",
      gBrowser,
    },
    async browser => {
      // Get the actor to update the product URL, since no content will render without one
      let actor =
        gBrowser.selectedBrowser.browsingContext.currentWindowGlobal.getExistingActor(
          REVIEW_CHECKER_ACTOR
        );
      actor.updateCurrentURL(PRODUCT_URI);

      await assertEmptyStateType(browser, EMPTY_STATE_CLASS_NAME);
    }
  );

  if (!AppConstants.platform != "linux") {
    await Services.fog.testFlushAllChildren();
    const events = Glean.shopping.surfaceOnboardingDisplayed.testGetValue();

    if (events) {
      Assert.greater(events.length, 0);
      Assert.equal(events[0].category, "shopping");
      Assert.equal(events[0].name, "surface_onboarding_displayed");
    } else {
      info("Failed to get Glean value due to unknown bug. See bug 1862389.");
    }
  }
});

/**
 * Test to check onboarding message container is rendered
 * when user is not opted-in for the sidebar integrated version
 * of Review Checker, except this time after viewing a non PDP in a supported site.
 */
add_task(async function test_showOnboarding_notOptedIn_supported() {
  // OptedIn pref Value is 0 when a user hasn't opted-in
  setOnboardingPrefs({ active: false, optedIn: 0, telemetryEnabled: true });

  Services.fog.testResetFOG();
  await Services.fog.testFlushAllChildren();

  await BrowserTestUtils.withNewTab(
    {
      url: "about:shoppingsidebar",
      gBrowser,
    },
    async browser => {
      // Get the actor to update the product URL, since no content will render without one
      let actor =
        gBrowser.selectedBrowser.browsingContext.currentWindowGlobal.getExistingActor(
          REVIEW_CHECKER_ACTOR
        );
      actor.updateCurrentURL(CONTENT_PAGE_URI);

      await assertEmptyStateType(browser, EMPTY_STATE_CLASS_NAME);
    }
  );

  if (!AppConstants.platform != "linux") {
    await Services.fog.testFlushAllChildren();
    const events = Glean.shopping.surfaceOnboardingDisplayed.testGetValue();

    if (events) {
      Assert.greater(events.length, 0);
      Assert.equal(events[0].category, "shopping");
      Assert.equal(events[0].name, "surface_onboarding_displayed");
    } else {
      info("Failed to get Glean value due to unknown bug. See bug 1862389.");
    }
  }
  await SpecialPowers.popPrefEnv();
});

/**
 * Test to check onboarding message container is rendered
 * when user is not opted-in for the sidebar integrated version
 * of Review Checker, except this time showing a different variant
 * for unsupported sites.
 */
add_task(
  async function test_showOnboarding_notOptedIn_integrated_sidebar_unsupported() {
    // OptedIn pref Value is 0 when a user hasn't opted-in
    setOnboardingPrefs({ active: false, optedIn: 0, telemetryEnabled: true });

    Services.fog.testResetFOG();
    await Services.fog.testFlushAllChildren();

    await BrowserTestUtils.withNewTab(
      {
        url: "about:shoppingsidebar",
        gBrowser,
      },
      async browser => {
        // Get the actor to update the product URL, since no content will render without one
        let actor =
          gBrowser.selectedBrowser.browsingContext.currentWindowGlobal.getExistingActor(
            REVIEW_CHECKER_ACTOR
          );
        actor.updateCurrentURL(UNSUPPORTED_NON_PDP_URI);

        await assertEmptyStateType(
          browser,
          EMPTY_STATE_UNSUPPORTED_PDP_CLASS_NAME
        );
      }
    );

    if (!AppConstants.platform != "linux") {
      await Services.fog.testFlushAllChildren();
      const events = Glean.shopping.surfaceOnboardingDisplayed.testGetValue();

      if (events) {
        Assert.greater(events.length, 0);
        Assert.equal(events[0].category, "shopping");
        Assert.equal(events[0].name, "surface_onboarding_displayed");
      } else {
        info("Failed to get Glean value due to unknown bug. See bug 1862389.");
      }
    }
    await SpecialPowers.popPrefEnv();
  }
);

/**
 * Test to check onboarding message is not shown for opted-in users
 */
add_task(async function test_hideOnboarding_optedIn() {
  // OptedIn pref value is 1 for opted-in users
  setOnboardingPrefs({ active: false, optedIn: 1 });
  await BrowserTestUtils.withNewTab(
    {
      url: "about:shoppingsidebar",
      gBrowser,
    },
    async browser => {
      // Get the actor to update the product URL, since no content will render without one
      let actor =
        gBrowser.selectedBrowser.browsingContext.currentWindowGlobal.getExistingActor(
          REVIEW_CHECKER_ACTOR
        );
      actor.updateCurrentURL(PRODUCT_URI);

      await SpecialPowers.spawn(browser, [], async () => {
        await ContentTaskUtils.waitForCondition(
          () => content.document.querySelector("shopping-container"),
          "shopping-container"
        );

        ok(
          content.document.getElementById("multi-stage-message-root").hidden,
          "message is hidden"
        );
      });
    }
  );
});

/**
 * Test to check onboarding message is not shown for user
 * after a user opt-out and opt back in after seeing survey
 */

add_task(async function test_hideOnboarding_OptIn_AfterSurveySeen() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.shopping.experience2023.optedIn", 0],
      ["browser.shopping.experience2023.survey.enabled", true],
      ["browser.shopping.experience2023.survey.hasSeen", true],
      ["browser.shopping.experience2023.survey.pdpVisits", 5],
    ],
  });

  await BrowserTestUtils.withNewTab(
    {
      url: "about:shoppingsidebar",
      gBrowser,
    },
    async browser => {
      let actor =
        gBrowser.selectedBrowser.browsingContext.currentWindowGlobal.getExistingActor(
          REVIEW_CHECKER_ACTOR
        );
      actor.updateCurrentURL(PRODUCT_URI);

      await SpecialPowers.spawn(browser, [], async () => {
        let shoppingContainer = await ContentTaskUtils.waitForCondition(
          () => content.document.querySelector("shopping-container"),
          "shopping-container"
        );

        ok(
          !content.document.getElementById("multi-stage-message-root").hidden,
          "opt-in message is shown"
        );

        const { TestUtils } = ChromeUtils.importESModule(
          "resource://testing-common/TestUtils.sys.mjs"
        );

        let optedInPrefChanged = TestUtils.waitForPrefChange(
          "browser.shopping.experience2023.optedIn",
          value => value === 1
        );
        await SpecialPowers.pushPrefEnv({
          set: [["browser.shopping.experience2023.optedIn", 1]],
        });
        await optedInPrefChanged;
        await shoppingContainer.wrappedJSObject.updateComplete;

        ok(
          content.document.getElementById("multi-stage-message-root").hidden,
          "opt-in message is hidden"
        );
        await SpecialPowers.popPrefEnv();
      });
    }
  );
  await SpecialPowers.popPrefEnv();
});

/**
 * Tests that the onboarding UI type is consistent between PDPs and unsupported sites after
 * reload, open/close, and tab switch.
 */
add_task(
  async function test_showOnboarding_integrated_sidebar_correct_ui_on_rerender() {
    // OptedIn pref Value is 0 when a user hasn't opted-in
    setOnboardingPrefs({ optedIn: 0, telemetryEnabled: true });
    await SpecialPowers.pushPrefEnv({
      set: [
        ["browser.shopping.experience2023.autoClose.userEnabled", false],
        ["browser.shopping.experience2023.autoOpen.userEnabled", true],
        ["toolkit.shopping.ohttpRelayURL", ""],
        ["toolkit.shopping.ohttpConfigURL", ""],
      ],
    });

    await BrowserTestUtils.withNewTab(PRODUCT_TEST_URL, async browser => {
      await SidebarController.show("viewReviewCheckerSidebar");
      await assertEmptyStateTypeWithRC(EMPTY_STATE_CLASS_NAME);

      // Verify UI after tab reload.
      let loadedPromise = BrowserTestUtils.browserLoaded(browser);
      await BrowserTestUtils.reloadTab(gBrowser.selectedTab);
      await loadedPromise;
      Assert.ok(true, "Promise resolved after reloading tab");

      info("Verifying UI for PDP after reload");
      await assertEmptyStateTypeWithRC(EMPTY_STATE_CLASS_NAME);

      // Verify UI after closing and reopening the RC panel.
      SidebarController.hide();
      await SidebarController.show("viewReviewCheckerSidebar");

      info("Verifying UI for PDP after closing then reopening the RC panel");
      await assertEmptyStateTypeWithRC(EMPTY_STATE_CLASS_NAME);

      // Verify UI after navigating to an unsupported site tab.
      let unsupportedSiteTab = BrowserTestUtils.addTab(
        gBrowser,
        UNSUPPORTED_NON_PDP_URL
      );
      let nonPDPBrowser = unsupportedSiteTab.linkedBrowser;
      await BrowserTestUtils.browserLoaded(
        nonPDPBrowser,
        false,
        UNSUPPORTED_NON_PDP_URL
      );

      await BrowserTestUtils.switchTab(gBrowser, unsupportedSiteTab);
      Assert.ok(true, "Browser is loaded after switching tabs");
      Assert.ok(SidebarController.isOpen, "Sidebar is open now");

      info(
        "Verifying UI for unsupported sites after switching to an unsupported site tab"
      );
      await assertEmptyStateTypeWithRC(EMPTY_STATE_UNSUPPORTED_PDP_CLASS_NAME);

      // Verify UI after closing and reopening the RC panel.
      SidebarController.hide();
      await SidebarController.show("viewReviewCheckerSidebar");

      info(
        "Verifying UI for unsupported sites after closing then reopening the RC panel"
      );
      await assertEmptyStateTypeWithRC(EMPTY_STATE_UNSUPPORTED_PDP_CLASS_NAME);

      await BrowserTestUtils.removeTab(unsupportedSiteTab);
    });

    SidebarController.hide();

    await SpecialPowers.popPrefEnv();
    await SpecialPowers.popPrefEnv();
  }
);

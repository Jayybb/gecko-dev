"use strict";

const { ExperimentAPI } = ChromeUtils.importESModule(
  "resource://nimbus/ExperimentAPI.sys.mjs"
);
const { ExperimentFakes } = ChromeUtils.importESModule(
  "resource://testing-common/NimbusTestUtils.sys.mjs"
);
const { NimbusTelemetry } = ChromeUtils.importESModule(
  "resource://nimbus/lib/Telemetry.sys.mjs"
);
const { TestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/TestUtils.sys.mjs"
);
const COLLECTION_ID_PREF = "messaging-system.rsexperimentloader.collection_id";

/**
 * #getExperiment
 */
add_task(async function test_getExperiment_fromParent_slug() {
  const sandbox = sinon.createSandbox();
  const manager = ExperimentFakes.manager();
  const expected = ExperimentFakes.experiment("foo");

  sandbox.stub(ExperimentAPI, "_manager").get(() => manager);

  await manager.onStartup();
  await ExperimentAPI.ready();

  await manager.store.addEnrollment(expected);

  Assert.equal(
    ExperimentAPI.getExperiment({ slug: "foo" }).slug,
    expected.slug,
    "should return an experiment by slug"
  );

  sandbox.restore();
});

add_task(async function test_getExperimentMetaData() {
  const sandbox = sinon.createSandbox();
  const manager = ExperimentFakes.manager();
  const expected = ExperimentFakes.experiment("foo");
  let exposureStub = sandbox.stub(NimbusTelemetry, "recordExposure");

  sandbox.stub(ExperimentAPI, "_manager").get(() => manager);

  await manager.onStartup();
  await ExperimentAPI.ready();

  await manager.store.addEnrollment(expected);

  let metadata = ExperimentAPI.getExperimentMetaData({ slug: expected.slug });

  Assert.equal(
    Object.keys(metadata.branch).length,
    1,
    "Should only expose one property"
  );
  Assert.equal(
    metadata.branch.slug,
    expected.branch.slug,
    "Should have the slug prop"
  );

  Assert.ok(exposureStub.notCalled, "Not called for this method");

  manager.unenroll(expected.slug);
  assertEmptyStore(manager.store);

  sandbox.restore();
});

add_task(async function test_getRolloutMetaData() {
  const sandbox = sinon.createSandbox();
  const manager = ExperimentFakes.manager();
  const expected = ExperimentFakes.rollout("foo");
  let exposureStub = sandbox.stub(NimbusTelemetry, "recordExposure");

  sandbox.stub(ExperimentAPI, "_manager").get(() => manager);

  await manager.onStartup();
  await ExperimentAPI.ready();

  await manager.store.addEnrollment(expected);

  let metadata = ExperimentAPI.getExperimentMetaData({ slug: expected.slug });

  Assert.equal(
    Object.keys(metadata.branch).length,
    1,
    "Should only expose one property"
  );
  Assert.equal(
    metadata.branch.slug,
    expected.branch.slug,
    "Should have the slug prop"
  );

  Assert.ok(exposureStub.notCalled, "Not called for this method");

  manager.unenroll(expected.slug);
  assertEmptyStore(manager.store);

  sandbox.restore();
});

add_task(function test_getExperimentMetaData_safe() {
  const sandbox = sinon.createSandbox();
  let exposureStub = sandbox.stub(NimbusTelemetry, "recordExposure");

  sandbox.stub(ExperimentAPI._manager.store, "get").throws();
  sandbox
    .stub(ExperimentAPI._manager.store, "getExperimentForFeature")
    .throws();

  try {
    let metadata = ExperimentAPI.getExperimentMetaData({ slug: "foo" });
    Assert.equal(metadata, null, "Should not throw");
  } catch (e) {
    Assert.ok(false, "Error should be caught in ExperimentAPI");
  }

  Assert.ok(ExperimentAPI._manager.store.get.calledOnce, "Sanity check");

  try {
    let metadata = ExperimentAPI.getExperimentMetaData({ featureId: "foo" });
    Assert.equal(metadata, null, "Should not throw");
  } catch (e) {
    Assert.ok(false, "Error should be caught in ExperimentAPI");
  }

  Assert.ok(
    ExperimentAPI._manager.store.getExperimentForFeature.calledOnce,
    "Sanity check"
  );

  Assert.ok(exposureStub.notCalled, "Not called for this feature");

  sandbox.restore();
});

add_task(async function test_getExperiment_safe() {
  const sandbox = sinon.createSandbox();
  sandbox
    .stub(ExperimentAPI._manager.store, "getExperimentForFeature")
    .throws();

  try {
    Assert.equal(
      ExperimentAPI.getExperiment({ featureId: "foo" }),
      null,
      "It should not fail even when it throws."
    );
  } catch (e) {
    Assert.ok(false, "Error should be caught by ExperimentAPI");
  }

  sandbox.restore();
});

add_task(async function test_getExperiment_featureAccess() {
  const sandbox = sinon.createSandbox();
  const expected = ExperimentFakes.experiment("foo", {
    branch: {
      slug: "treatment",
      value: { title: "hi" },
      features: [{ featureId: "cfr", value: { message: "content" } }],
    },
  });
  const stub = sandbox
    .stub(ExperimentAPI._manager.store, "getExperimentForFeature")
    .returns(expected);

  let { branch } = ExperimentAPI.getExperiment({ featureId: "cfr" });

  Assert.equal(branch.slug, "treatment");
  let feature = branch.cfr;
  Assert.ok(feature, "Should allow to access by featureId");
  Assert.equal(feature.value.message, "content");

  stub.restore();
});

add_task(async function test_getExperiment_featureAccess_backwardsCompat() {
  const sandbox = sinon.createSandbox();
  const expected = ExperimentFakes.experiment("foo", {
    branch: {
      slug: "treatment",
      feature: { featureId: "cfr", value: { message: "content" } },
    },
  });
  const stub = sandbox
    .stub(ExperimentAPI._manager.store, "getExperimentForFeature")
    .returns(expected);

  let { branch } = ExperimentAPI.getExperiment({ featureId: "cfr" });

  Assert.equal(branch.slug, "treatment");
  let feature = branch.cfr;
  Assert.ok(feature, "Should allow to access by featureId");
  Assert.equal(feature.value.message, "content");

  stub.restore();
});

/**
 * #getRecipe
 */
add_task(async function test_getRecipe() {
  const sandbox = sinon.createSandbox();
  const RECIPE = ExperimentFakes.recipe("foo");
  const collectionName = Services.prefs.getStringPref(COLLECTION_ID_PREF);
  sandbox.stub(ExperimentAPI._remoteSettingsClient, "get").resolves([RECIPE]);

  const recipe = await ExperimentAPI.getRecipe("foo");
  Assert.deepEqual(
    recipe,
    RECIPE,
    "should return an experiment recipe if found"
  );
  Assert.equal(
    ExperimentAPI._remoteSettingsClient.collectionName,
    collectionName,
    "Loaded the expected collection"
  );

  sandbox.restore();
});

add_task(async function test_getRecipe_Failure() {
  const sandbox = sinon.createSandbox();
  sandbox.stub(ExperimentAPI._remoteSettingsClient, "get").throws();

  const recipe = await ExperimentAPI.getRecipe("foo");
  Assert.equal(recipe, undefined, "should return undefined if RS throws");

  sandbox.restore();
});

/**
 * #getAllBranches
 */
add_task(async function test_getAllBranches() {
  const sandbox = sinon.createSandbox();
  const RECIPE = ExperimentFakes.recipe("foo");
  sandbox.stub(ExperimentAPI._remoteSettingsClient, "get").resolves([RECIPE]);

  const branches = await ExperimentAPI.getAllBranches("foo");
  Assert.deepEqual(
    branches,
    RECIPE.branches,
    "should return all branches if found a recipe"
  );

  sandbox.restore();
});

// API used by Messaging System
add_task(async function test_getAllBranches_featureIdAccessor() {
  const sandbox = sinon.createSandbox();
  const RECIPE = ExperimentFakes.recipe("foo");
  sandbox.stub(ExperimentAPI._remoteSettingsClient, "get").resolves([RECIPE]);

  const branches = await ExperimentAPI.getAllBranches("foo");
  Assert.deepEqual(
    branches,
    RECIPE.branches,
    "should return all branches if found a recipe"
  );
  branches.forEach(branch => {
    Assert.equal(
      branch.testFeature.featureId,
      "testFeature",
      "Should use the experimentBranchAccessor proxy getter"
    );
  });

  sandbox.restore();
});

// For schema version before 1.6.2 branch.feature was accessed
// instead of branch.features
add_task(async function test_getAllBranches_backwardsCompat() {
  const sandbox = sinon.createSandbox();
  const RECIPE = ExperimentFakes.recipe("foo");
  delete RECIPE.branches[0].features;
  delete RECIPE.branches[1].features;
  let feature = {
    featureId: "backwardsCompat",
    value: {
      enabled: true,
    },
  };
  RECIPE.branches[0].feature = feature;
  RECIPE.branches[1].feature = feature;
  sandbox.stub(ExperimentAPI._remoteSettingsClient, "get").resolves([RECIPE]);

  const branches = await ExperimentAPI.getAllBranches("foo");
  Assert.deepEqual(
    branches,
    RECIPE.branches,
    "should return all branches if found a recipe"
  );
  branches.forEach(branch => {
    Assert.equal(
      branch.backwardsCompat.featureId,
      "backwardsCompat",
      "Should use the experimentBranchAccessor proxy getter"
    );
  });

  sandbox.restore();
});

add_task(async function test_getAllBranches_Failure() {
  const sandbox = sinon.createSandbox();
  sandbox.stub(ExperimentAPI._remoteSettingsClient, "get").throws();

  const branches = await ExperimentAPI.getAllBranches("foo");
  Assert.equal(branches, undefined, "should return undefined if RS throws");

  sandbox.restore();
});

/**
 * Store events
 */
add_task(async function test_addEnrollment_eventEmit_add() {
  const sandbox = sinon.createSandbox();
  const featureStub = sandbox.stub();
  const experiment = ExperimentFakes.experiment("foo", {
    branch: {
      slug: "variant",
      ratio: 1,
      features: [{ featureId: "purple", value: {} }],
    },
  });
  const manager = ExperimentFakes.manager();
  const store = manager.store;
  sandbox.stub(ExperimentAPI, "_manager").get(() => manager);

  await store.init();
  await ExperimentAPI.ready();

  store.on("featureUpdate:purple", featureStub);

  await store.addEnrollment(experiment);

  Assert.equal(
    featureStub.callCount,
    1,
    "should call 'featureUpdate' callback for featureId when an experiment is added"
  );
  Assert.equal(featureStub.firstCall.args[0], "featureUpdate:purple");
  Assert.equal(featureStub.firstCall.args[1], "experiment-updated");

  store.off("featureUpdate:purple", featureStub);

  manager.unenroll(experiment.slug);
  assertEmptyStore(store);

  sandbox.restore();
});

add_task(async function test_updateExperiment_eventEmit_add_and_update() {
  const sandbox = sinon.createSandbox();
  const featureStub = sandbox.stub();
  const experiment = ExperimentFakes.experiment("foo", {
    branch: {
      slug: "variant",
      ratio: 1,
      features: [{ featureId: "purple", value: {} }],
    },
  });
  const manager = ExperimentFakes.manager();
  const store = manager.store;
  sandbox.stub(ExperimentAPI, "_manager").get(() => manager);

  await store.init();
  await ExperimentAPI.ready();

  await store.addEnrollment(experiment);

  store._onFeatureUpdate("purple", featureStub);

  store.updateExperiment(experiment.slug, experiment);

  await TestUtils.waitForCondition(
    () => featureStub.callCount == 2,
    "Wait for `on` method to notify callback about the `add` event."
  );
  // Called twice, once when attaching the event listener (because there is an
  // existing experiment with that name) and 2nd time for the update event
  Assert.equal(featureStub.callCount, 2, "Called twice for feature");
  Assert.equal(featureStub.firstCall.args[0], "featureUpdate:purple");
  Assert.equal(featureStub.firstCall.args[1], "experiment-updated");

  store._offFeatureUpdate("featureUpdate:purple", featureStub);

  manager.unenroll(experiment.slug);
  assertEmptyStore(store);
});

add_task(async function test_updateExperiment_eventEmit_off() {
  const sandbox = sinon.createSandbox();
  const featureStub = sandbox.stub();
  const experiment = ExperimentFakes.experiment("foo", {
    branch: {
      slug: "variant",
      ratio: 1,
      features: [{ featureId: "purple", value: {} }],
    },
  });
  const manager = ExperimentFakes.manager();
  const store = manager.store;
  sandbox.stub(ExperimentAPI, "_manager").get(() => manager);

  await store.init();
  await ExperimentAPI.ready();

  store.on("featureUpdate:purple", featureStub);

  await store.addEnrollment(experiment);

  store.off("featureUpdate:purple", featureStub);

  store.updateExperiment(experiment.slug, experiment);

  Assert.equal(featureStub.callCount, 1, "Called only once before `off`");

  manager.unenroll(experiment.slug);
  assertEmptyStore(store);

  sandbox.restore();
});

add_task(async function test_getActiveBranch() {
  const sandbox = sinon.createSandbox();
  const manager = ExperimentFakes.manager();
  const store = manager.store;

  sandbox.stub(ExperimentAPI, "_manager").get(() => manager);
  const experiment = ExperimentFakes.experiment("foo", {
    branch: {
      slug: "variant",
      ratio: 1,
      features: [{ featureId: "green", value: {} }],
    },
  });

  await store.init();
  await store.addEnrollment(experiment);

  Assert.deepEqual(
    ExperimentAPI.getActiveBranch({ featureId: "green" }),
    experiment.branch,
    "Should return feature of active experiment"
  );

  manager.unenroll(experiment.slug);
  assertEmptyStore(store);

  sandbox.restore();
});

add_task(async function test_getActiveBranch_safe() {
  const sandbox = sinon.createSandbox();
  sandbox
    .stub(ExperimentAPI._manager.store, "getAllActiveExperiments")
    .throws();

  try {
    Assert.equal(
      ExperimentAPI.getActiveBranch({ featureId: "green" }),
      null,
      "Should not throw"
    );
  } catch (e) {
    Assert.ok(false, "Should catch error in ExperimentAPI");
  }

  sandbox.restore();
});

add_task(async function test_getActiveBranch_storeFailure() {
  const sandbox = sinon.createSandbox();
  const manager = ExperimentFakes.manager();
  const store = manager.store;
  sandbox.stub(ExperimentAPI, "_manager").get(() => manager);
  const experiment = ExperimentFakes.experiment("foo", {
    branch: {
      slug: "variant",
      ratio: 1,
      features: [{ featureId: "green", value: {} }],
    },
  });

  await store.init();
  await store.addEnrollment(experiment);
  // Adding stub later because `addEnrollment` emits update events
  const stub = sandbox.stub(store, "emit");
  // Call getActiveBranch to trigger an activation event
  sandbox.stub(store, "getAllActiveExperiments").throws();
  try {
    ExperimentAPI.getActiveBranch({ featureId: "green" });
  } catch (e) {
    /* This is expected */
  }

  Assert.equal(stub.callCount, 0, "Not called if store somehow fails");

  manager.unenroll(experiment.slug);
  assertEmptyStore(store);

  sandbox.restore();
});

add_task(async function test_getActiveBranch_noActivationEvent() {
  const manager = ExperimentFakes.manager();
  const store = manager.store;
  const sandbox = sinon.createSandbox();
  sandbox.stub(ExperimentAPI, "_manager").get(() => manager);
  const experiment = ExperimentFakes.experiment("foo", {
    branch: {
      slug: "variant",
      ratio: 1,
      features: [{ featureId: "green", value: {} }],
    },
  });

  await store.init();
  await store.addEnrollment(experiment);
  // Adding stub later because `addEnrollment` emits update events
  const stub = sandbox.stub(store, "emit");
  // Call getActiveBranch to trigger an activation event
  ExperimentAPI.getActiveBranch({ featureId: "green" });

  Assert.equal(stub.callCount, 0, "Not called: sendExposureEvent is false");

  manager.unenroll(experiment.slug);
  assertEmptyStore(store);

  sandbox.restore();
});

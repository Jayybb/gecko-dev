/**
* AUTO-GENERATED - DO NOT EDIT. Source: https://github.com/gpuweb/cts
**/import { kUnitCaseParamsBuilder } from '../../../../../common/framework/params_builder.js';import { makeTestGroup } from '../../../../../common/framework/test_group.js';import { getGPU } from '../../../../../common/util/navigator_gpu.js';
import { assert, range, reorder } from '../../../../../common/util/util.js';
import { getDefaultLimitsForCTS } from '../../../../capability_info.js';
import { GPUConst } from '../../../../constants.js';
import { GPUTestBase } from '../../../../gpu_test.js';



export const kCreatePipelineTypes = [
'createRenderPipeline',
'createRenderPipelineWithFragmentStage',
'createComputePipeline'];



export const kRenderEncoderTypes = ['render', 'renderBundle'];


export const kEncoderTypes = ['compute', 'render', 'renderBundle'];


export const kBindGroupTests = ['sameGroup', 'differentGroups'];


export const kBindingCombinations = [
'vertex',
'fragment',
'vertexAndFragmentWithPossibleVertexStageOverflow',
'vertexAndFragmentWithPossibleFragmentStageOverflow',
'compute'];



export function getPipelineTypeForBindingCombination(bindingCombination) {
  switch (bindingCombination) {
    case 'vertex':
      return 'createRenderPipeline';
    case 'fragment':
    case 'vertexAndFragmentWithPossibleVertexStageOverflow':
    case 'vertexAndFragmentWithPossibleFragmentStageOverflow':
      return 'createRenderPipelineWithFragmentStage';
    case 'compute':
      return 'createComputePipeline';
  }
}

export function getStageVisibilityForBinidngCombination(bindingCombination) {
  switch (bindingCombination) {
    case 'vertex':
      return GPUConst.ShaderStage.VERTEX;
    case 'fragment':
      return GPUConst.ShaderStage.FRAGMENT;
    case 'vertexAndFragmentWithPossibleVertexStageOverflow':
    case 'vertexAndFragmentWithPossibleFragmentStageOverflow':
      return GPUConst.ShaderStage.FRAGMENT | GPUConst.ShaderStage.VERTEX;
    case 'compute':
      return GPUConst.ShaderStage.COMPUTE;
  }
}

function getBindGroupIndex(bindGroupTest, numBindGroups, i) {
  switch (bindGroupTest) {
    case 'sameGroup':
      return 0;
    case 'differentGroups':
      return i % numBindGroups;
  }
}

function getBindingIndex(bindGroupTest, numBindGroups, i) {
  switch (bindGroupTest) {
    case 'sameGroup':
      return i;
    case 'differentGroups':
      return i / numBindGroups | 0;
  }
}

function getWGSLBindings(
{
  order,
  bindGroupTest,
  storageDefinitionWGSLSnippetFn,
  numBindGroups





},
numBindings,
id)
{
  return reorder(
    order,
    range(numBindings, (i) => {
      const groupNdx = getBindGroupIndex(bindGroupTest, numBindGroups, i);
      const bindingNdx = getBindingIndex(bindGroupTest, numBindGroups, i);
      const storageWGSL = storageDefinitionWGSLSnippetFn(i, id);
      return `@group(${groupNdx}) @binding(${bindingNdx}) ${storageWGSL};`;
    })
  ).join('\n        ');
}

export function getPerStageWGSLForBindingCombinationImpl(
bindingCombination,
order,
bindGroupTest,
storageDefinitionWGSLSnippetFn,
bodyFn,
numBindGroups,
numBindings,
extraWGSL = '')
{
  const bindingParams = {
    order,
    bindGroupTest,
    storageDefinitionWGSLSnippetFn,
    numBindGroups
  };
  switch (bindingCombination) {
    case 'vertex':
      return `
        ${extraWGSL}

        ${getWGSLBindings(bindingParams, numBindings, 0)}

        @vertex fn mainVS() -> @builtin(position) vec4f {
          ${bodyFn(numBindings, 0)}
          return vec4f(0);
        }
      `;
    case 'fragment':
      return `
        ${extraWGSL}

        ${getWGSLBindings(bindingParams, numBindings, 0)}

        @vertex fn mainVS() -> @builtin(position) vec4f {
          return vec4f(0);
        }

        @fragment fn mainFS() {
          ${bodyFn(numBindings, 0)}
        }
      `;
    case 'vertexAndFragmentWithPossibleVertexStageOverflow':{
        return `
        ${extraWGSL}

        ${getWGSLBindings(bindingParams, numBindings, 0)}

        ${getWGSLBindings(bindingParams, numBindings - 1, 1)}

        @vertex fn mainVS() -> @builtin(position) vec4f {
          ${bodyFn(numBindings, 0)}
          return vec4f(0);
        }

        @fragment fn mainFS() {
          ${bodyFn(numBindings - 1, 1)}
        }
      `;
      }
    case 'vertexAndFragmentWithPossibleFragmentStageOverflow':{
        return `
        ${extraWGSL}

        ${getWGSLBindings(bindingParams, numBindings - 1, 0)}

        ${getWGSLBindings(bindingParams, numBindings, 1)}

        @vertex fn mainVS() -> @builtin(position) vec4f {
          ${bodyFn(numBindings - 1, 0)}
          return vec4f(0);
        }

        @fragment fn mainFS() {
          ${bodyFn(numBindings, 1)}
        }
      `;
      }
    case 'compute':
      return `
        ${extraWGSL}
        ${getWGSLBindings(bindingParams, numBindings, 0)}
        @compute @workgroup_size(1) fn main() {
          ${bodyFn(numBindings, 0)}
        }
      `;
      break;
  }
}

export function getPerStageWGSLForBindingCombination(
bindingCombination,
order,
bindGroupTest,
storageDefinitionWGSLSnippetFn,
usageWGSLSnippetFn,
maxBindGroups,
numBindings,
extraWGSL = '')
{
  return getPerStageWGSLForBindingCombinationImpl(
    bindingCombination,
    order,
    bindGroupTest,
    storageDefinitionWGSLSnippetFn,
    (numBindings, set) =>
    `${range(numBindings, (i) => usageWGSLSnippetFn(i, set)).join('\n          ')}`,
    maxBindGroups,
    numBindings,
    extraWGSL
  );
}

export function getPerStageWGSLForBindingCombinationStorageTextures(
bindingCombination,
order,
bindGroupTest,
storageDefinitionWGSLSnippetFn,
usageWGSLSnippetFn,
numBindGroups,
numBindings,
extraWGSL = '')
{
  return getPerStageWGSLForBindingCombinationImpl(
    bindingCombination,
    order,
    bindGroupTest,
    storageDefinitionWGSLSnippetFn,
    (numBindings, set) =>
    `${range(numBindings, (i) => usageWGSLSnippetFn(i, set)).join('\n          ')}`,
    numBindGroups,
    numBindings,
    extraWGSL
  );
}

export const kLimitModes = ['defaultLimit', 'adapterLimit'];



export const kMaximumTestValues = ['atLimit', 'overLimit'];


export function getMaximumTestValue(limit, testValue) {
  switch (testValue) {
    case 'atLimit':
      return limit;
    case 'overLimit':
      return limit + 1;
  }
}

export const kMinimumTestValues = ['atLimit', 'underLimit'];


export const kMaximumLimitValueTests = [
'atDefault',
'underDefault',
'betweenDefaultAndMaximum',
'atMaximum',
'overMaximum'];



export function getLimitValue(
defaultLimit,
maximumLimit,
limitValueTest)
{
  switch (limitValueTest) {
    case 'atDefault':
      return defaultLimit;
    case 'underDefault':
      return defaultLimit - 1;
    case 'betweenDefaultAndMaximum':
      // The result can be larger than maximum i32.
      return Math.floor((defaultLimit + maximumLimit) / 2);
    case 'atMaximum':
      return maximumLimit;
    case 'overMaximum':
      return maximumLimit + 1;
  }
}

export const kMinimumLimitValueTests = [
'atDefault',
'overDefault',
'betweenDefaultAndMinimum',
'atMinimum',
'underMinimum'];



export function getDefaultLimitForAdapter(adapter, limit) {
  const limitInfo = getDefaultLimitsForCTS();
  return limitInfo[limit].default;
}


















const kMinimumLimits = new Set([
'minUniformBufferOffsetAlignment',
'minStorageBufferOffsetAlignment']
);

/**
 * Adds the default parameters to a limit test
 */
export const kMaximumLimitBaseParams = kUnitCaseParamsBuilder.
combine('limitTest', kMaximumLimitValueTests).
combine('testValueName', kMaximumTestValues);

export const kMinimumLimitBaseParams = kUnitCaseParamsBuilder.
combine('limitTest', kMinimumLimitValueTests).
combine('testValueName', kMinimumTestValues);

/**
 * Adds a maximum limit upto a dependent limit.
 *
 * Example:
 *   You want to test `maxStorageBuffersPerShaderStage` in fragment stage
 *   so you need `maxStorageBuffersInFragmentStage` set as well. But, you
 *   don't know exactly what value will be used for `maxStorageBuffersPerShaderStage`
 *   since that is defined by an enum like `underDefault`.
 *
 *   So, you want `maxStorageBuffersInFragmentStage` to be set as high as possible.
 *   You can't just set it to it's maximum value (adapter.limits.maxStorageBuffersInFragmentStage)
 *   because if it's greater than `maxStorageBuffersPerShaderStage` you'll get an error.
 *
 *   So, use this function
 *
 *   const limits: LimitsRequest = {};
 *   addMaximumLimitUpToDependentLimit(
 *     adapter,
 *     limits,
 *     limit: 'maxStorageBuffersInFragmentStage', // the limit we want to add
 *     dependentLimitName: 'maxStorageBuffersPerShaderStage', // what the previous limit is dependent on
 *     dependentLimitTest: 'underDefault', // the enum used to decide the dependent limit
 *   )
 */
export function addMaximumLimitUpToDependentLimit(
adapter,
limits,
limit,
dependentLimitName,
dependentLimitTest)
{
  if (!(limit in adapter.limits)) {
    return;
  }

  const limitMaximum = adapter.limits[limit];
  const dependentLimitMaximum = adapter.limits[dependentLimitName];
  const testValue = getLimitValue(
    getDefaultLimitForAdapter(adapter, dependentLimitName),
    dependentLimitMaximum,
    dependentLimitTest
  );

  const value = Math.min(testValue, dependentLimitMaximum, limitMaximum);
  limits[limit] = value;
}









export class LimitTestsImpl extends GPUTestBase {
  _adapter = null;
  _device = undefined;
  limit = '';
  limitTestParams = {};
  defaultLimit = 0;
  adapterLimit = 0;

  async init() {
    await super.init();
    const gpu = getGPU(this.rec);
    this._adapter = await gpu.requestAdapter();
    const limit = this.limit;
    // MAINTENANCE_TODO: consider removing this skip if the spec has no optional limits.
    this.skipIf(
      this._adapter?.limits[limit] === undefined && !!this.limitTestParams.limitOptional,
      `${limit} is missing but optional for now`
    );
    this.defaultLimit = getDefaultLimitForAdapter(this.adapter, limit);
    this.adapterLimit = this.adapter.limits[limit];
    assert(!Number.isNaN(this.defaultLimit));
    assert(!Number.isNaN(this.adapterLimit));
  }

  get adapter() {
    assert(this._adapter !== undefined);
    return this._adapter;
  }

  get device() {
    assert(this._device !== undefined, 'device is only valid in _testThenDestroyDevice callback');
    return this._device;
  }

  getDefaultLimits() {
    return getDefaultLimitsForCTS();
  }

  getDefaultLimit(limit) {
    return this.getDefaultLimits()[limit].default;
  }

  async requestDeviceWithLimits(
  adapter,
  requiredLimits,
  shouldReject,
  requiredFeatures)
  {
    if (shouldReject) {
      this.shouldReject('OperationError', this.requestDeviceTracked(adapter, { requiredLimits }), {
        allowMissingStack: true
      });
      return undefined;
    } else {
      return this.requestDeviceTracked(adapter, { requiredLimits, requiredFeatures });
    }
  }

  getDefaultOrAdapterLimit(limit, limitMode) {
    switch (limitMode) {
      case 'defaultLimit':
        return getDefaultLimitForAdapter(this.adapter, limit);
      case 'adapterLimit':
        return this.adapter.limits[limit];
    }
  }

  /**
   * Gets a device with the adapter a requested limit and checks that that limit
   * is correct or that the device failed to create if the requested limit is
   * beyond the maximum supported by the device.
   */
  async _getDeviceWithSpecificLimit(
  requestedLimit,
  extraLimits,
  features)
  {
    const { adapter, limit, adapterLimit, defaultLimit } = this;

    const requiredLimits = {};
    requiredLimits[limit] = requestedLimit;

    if (extraLimits) {
      for (const [extraLimitStr, limitModeOrNumber] of Object.entries(extraLimits)) {
        const extraLimit = extraLimitStr;
        if (adapter.limits[extraLimit] !== undefined) {
          requiredLimits[extraLimit] =
          typeof limitModeOrNumber === 'number' ?
          limitModeOrNumber :
          limitModeOrNumber === 'defaultLimit' ?
          getDefaultLimitForAdapter(adapter, extraLimit) :
          adapter.limits[extraLimit];
        }
      }
    }

    const shouldReject = kMinimumLimits.has(limit) ?
    requestedLimit < adapterLimit :
    requestedLimit > adapterLimit;

    const device = await this.requestDeviceWithLimits(
      adapter,
      requiredLimits,
      shouldReject,
      features
    );
    const actualLimit = device ? device.limits[limit] : 0;

    if (shouldReject) {
      this.expect(!device, 'expected no device');
    } else {
      if (kMinimumLimits.has(limit)) {
        if (requestedLimit <= defaultLimit) {
          this.expect(
            actualLimit === requestedLimit,
            `expected actual actualLimit: ${actualLimit} to equal defaultLimit: ${requestedLimit}`
          );
        } else {
          this.expect(
            actualLimit === defaultLimit,
            `expected actual actualLimit: ${actualLimit} to equal defaultLimit: ${defaultLimit}`
          );
        }
      } else {
        const checked = this.limitTestParams.limitCheckFn ?
        this.limitTestParams.limitCheckFn(this, device, { limit, actualLimit, defaultLimit }) :
        false;
        if (!checked) {
          if (requestedLimit <= defaultLimit) {
            this.expect(
              actualLimit === defaultLimit,
              `expected actual actualLimit: ${actualLimit} to equal defaultLimit: ${defaultLimit}`
            );
          } else {
            this.expect(
              actualLimit === requestedLimit,
              `expected actual actualLimit: ${actualLimit} to equal requestedLimit: ${requestedLimit}`
            );
          }
        }
      }
    }

    return device ? { device, defaultLimit, adapterLimit, requestedLimit, actualLimit } : undefined;
  }

  /**
   * Gets a device with the adapter a requested limit and checks that that limit
   * is correct or that the device failed to create if the requested limit is
   * beyond the maximum supported by the device.
   */
  async _getDeviceWithRequestedMaximumLimit(
  limitValueTest,
  extraLimits,
  features)
  {
    const { defaultLimit, adapterLimit: maximumLimit } = this;

    const requestedLimit = getLimitValue(defaultLimit, maximumLimit, limitValueTest);
    this.skipIf(
      requestedLimit < 0 && limitValueTest === 'underDefault',
      `requestedLimit(${requestedLimit}) for ${this.limit} is < 0`
    );
    return this._getDeviceWithSpecificLimit(requestedLimit, extraLimits, features);
  }

  /**
   * Call the given function and check no WebGPU errors are leaked.
   */
  async _testThenDestroyDevice(
  deviceAndLimits,
  testValue,
  fn)
  {
    assert(!this._device);

    const { device, actualLimit } = deviceAndLimits;
    this._device = device;

    const shouldError = kMinimumLimits.has(this.limit) ?
    testValue < actualLimit :
    testValue > actualLimit;

    device.pushErrorScope('internal');
    device.pushErrorScope('out-of-memory');
    device.pushErrorScope('validation');

    await fn({ ...deviceAndLimits, testValue, shouldError });

    const validationError = await device.popErrorScope();
    const outOfMemoryError = await device.popErrorScope();
    const internalError = await device.popErrorScope();

    this.expect(!validationError, `unexpected validation error: ${validationError?.message || ''}`);
    this.expect(
      !outOfMemoryError,
      `unexpected out-of-memory error: ${outOfMemoryError?.message || ''}`
    );
    this.expect(!internalError, `unexpected internal error: ${internalError?.message || ''}`);

    device.destroy();
    this._device = undefined;
  }

  /**
   * Creates a device with a specific limit.
   * If the limit of over the maximum we expect an exception
   * If the device is created then we call a test function, checking
   * that the function does not leak any GPU errors.
   */
  async testDeviceWithSpecificLimits(
  deviceLimitValue,
  testValue,
  fn,
  extraLimits,
  features)
  {
    assert(!this._device);

    const deviceAndLimits = await this._getDeviceWithSpecificLimit(
      deviceLimitValue,
      extraLimits,
      features
    );
    // If we request over the limit requestDevice will throw
    if (!deviceAndLimits) {
      return;
    }

    await this._testThenDestroyDevice(deviceAndLimits, testValue, fn);
  }

  /**
   * Creates a device with the limit defined by LimitValueTest.
   * If the limit of over the maximum we expect an exception
   * If the device is created then we call a test function, checking
   * that the function does not leak any GPU errors.
   */
  async testDeviceWithRequestedMaximumLimits(
  limitTest,
  testValueName,
  fn,
  extraLimits,
  extraFeatures = [])
  {
    assert(!this._device);

    const deviceAndLimits = await this._getDeviceWithRequestedMaximumLimit(
      limitTest,
      extraLimits,
      extraFeatures
    );
    // If we request over the limit requestDevice will throw
    if (!deviceAndLimits) {
      return;
    }

    const { actualLimit } = deviceAndLimits;
    const testValue = getMaximumTestValue(actualLimit, testValueName);

    await this._testThenDestroyDevice(
      deviceAndLimits,
      testValue,
      async (inputs) => {
        await fn({ ...inputs, testValueName });
      }
    );
  }

  /**
   * Calls a function that expects a GPU error if shouldError is true
   */
  // MAINTENANCE_TODO: Remove this duplicated code with GPUTest if possible
  async expectGPUErrorAsync(
  filter,
  fn,
  shouldError = true,
  msg = '')
  {
    const { device } = this;

    device.pushErrorScope(filter);
    const returnValue = fn();
    if (returnValue instanceof Promise) {
      await returnValue;
    }

    const error = await device.popErrorScope();
    this.expect(
      !!error === shouldError,
      `${error?.message || 'no error when one was expected'}: ${msg}`
    );

    return returnValue;
  }

  /** Expect that the provided promise rejects, with the provided exception name. */
  async shouldRejectConditionally(
  expectedName,
  p,
  shouldReject,
  message)
  {
    if (shouldReject) {
      this.shouldReject(expectedName, p, { message });
    } else {
      this.shouldResolve(p, message);
    }

    // We need to explicitly wait for the promise because the device may be
    // destroyed immediately after returning from this function.
    try {
      await p;
    } catch (e) {

      //
    }}

  /**
   * Calls a function that expects a validation error if shouldError is true
   */
  async expectValidationError(
  fn,
  shouldError = true,
  msg = '')
  {
    return this.expectGPUErrorAsync('validation', fn, shouldError, msg);
  }

  /**
   * Calls a function that expects to not generate a validation error
   */
  async expectNoValidationError(fn, msg = '') {
    return this.expectGPUErrorAsync('validation', fn, false, msg);
  }

  /**
   * Calls a function that might expect a validation error.
   * if shouldError is true then expect a validation error,
   * if shouldError is false then ignore out-of-memory errors.
   */
  async testForValidationErrorWithPossibleOutOfMemoryError(
  fn,
  shouldError = true,
  msg = '')
  {
    const { device } = this;

    if (!shouldError) {
      device.pushErrorScope('out-of-memory');
      const result = fn();
      await device.popErrorScope();
      return result;
    }

    // Validation should fail before out-of-memory so there is no need to check
    // for out-of-memory here.
    device.pushErrorScope('validation');
    const returnValue = fn();
    const validationError = await device.popErrorScope();

    this.expect(
      !!validationError,
      `${validationError?.message || 'no error when one was expected'}: ${msg}`
    );

    return returnValue;
  }

  getGroupIndexWGSLForPipelineType(pipelineType, groupIndex) {
    switch (pipelineType) {
      case 'createRenderPipeline':
        return `
          @group(${groupIndex}) @binding(0) var<uniform> v: f32;
          @vertex fn mainVS() -> @builtin(position) vec4f {
            return vec4f(v);
          }
        `;
      case 'createRenderPipelineWithFragmentStage':
        return `
          @group(${groupIndex}) @binding(0) var<uniform> v: f32;
          @vertex fn mainVS() -> @builtin(position) vec4f {
            return vec4f(v);
          }
          @fragment fn mainFS() -> @location(0) vec4f {
            return vec4f(1);
          }
        `;
      case 'createComputePipeline':
        return `
          @group(${groupIndex}) @binding(0) var<uniform> v: f32;
          @compute @workgroup_size(1) fn main() {
            _ = v;
          }
        `;
        break;
    }
  }

  getBindingIndexWGSLForPipelineType(pipelineType, bindingIndex) {
    switch (pipelineType) {
      case 'createRenderPipeline':
        return `
          @group(0) @binding(${bindingIndex}) var<uniform> v: f32;
          @vertex fn mainVS() -> @builtin(position) vec4f {
            return vec4f(v);
          }
        `;
      case 'createRenderPipelineWithFragmentStage':
        return `
          @group(0) @binding(${bindingIndex}) var<uniform> v: f32;
          @vertex fn mainVS() -> @builtin(position) vec4f {
            return vec4f(v);
          }
          @fragment fn mainFS() -> @location(0) vec4f {
            return vec4f(1);
          }
        `;
      case 'createComputePipeline':
        return `
          @group(0) @binding(${bindingIndex}) var<uniform> v: f32;
          @compute @workgroup_size(1) fn main() {
            _ = v;
          }
        `;
        break;
    }
  }

  _createRenderPipelineDescriptor(module) {
    const { device } = this;
    return {
      layout: 'auto',
      vertex: {
        module,
        entryPoint: 'mainVS'
      },
      // Specify a color attachment so we have at least one render target.
      fragment: {
        targets: [{ format: 'rgba8unorm' }],
        module: device.createShaderModule({
          code: `@fragment fn main() -> @location(0) vec4f { return vec4f(0); }`
        })
      }
    };
  }

  _createRenderPipelineDescriptorWithFragmentShader(
  module)
  {
    return {
      layout: 'auto',
      vertex: {
        module,
        entryPoint: 'mainVS'
      },
      fragment: {
        module,
        entryPoint: 'mainFS',
        targets: []
      },
      depthStencil: {
        format: 'depth24plus-stencil8',
        depthWriteEnabled: true,
        depthCompare: 'always'
      }
    };
  }

  _createComputePipelineDescriptor(module) {
    return {
      layout: 'auto',
      compute: {
        module,
        entryPoint: 'main'
      }
    };
  }

  createPipeline(createPipelineType, module) {
    const { device } = this;

    switch (createPipelineType) {
      case 'createRenderPipeline':
        return device.createRenderPipeline(this._createRenderPipelineDescriptor(module));
        break;
      case 'createRenderPipelineWithFragmentStage':
        return device.createRenderPipeline(
          this._createRenderPipelineDescriptorWithFragmentShader(module)
        );
        break;
      case 'createComputePipeline':
        return device.createComputePipeline(this._createComputePipelineDescriptor(module));
        break;
    }
  }

  createPipelineAsync(createPipelineType, module) {
    const { device } = this;

    switch (createPipelineType) {
      case 'createRenderPipeline':
        return device.createRenderPipelineAsync(this._createRenderPipelineDescriptor(module));
      case 'createRenderPipelineWithFragmentStage':
        return device.createRenderPipelineAsync(
          this._createRenderPipelineDescriptorWithFragmentShader(module)
        );
      case 'createComputePipeline':
        return device.createComputePipelineAsync(this._createComputePipelineDescriptor(module));
    }
  }

  async testCreatePipeline(
  createPipelineType,
  async,
  module,
  shouldError,
  msg = '')
  {
    if (async) {
      await this.shouldRejectConditionally(
        'GPUPipelineError',
        this.createPipelineAsync(createPipelineType, module),
        shouldError,
        msg
      );
    } else {
      await this.expectValidationError(
        () => {
          this.createPipeline(createPipelineType, module);
        },
        shouldError,
        msg
      );
    }
  }

  async testCreateRenderPipeline(
  pipelineDescriptor,
  async,
  shouldError,
  msg = '')
  {
    const { device } = this;
    if (async) {
      await this.shouldRejectConditionally(
        'GPUPipelineError',
        device.createRenderPipelineAsync(pipelineDescriptor),
        shouldError,
        msg
      );
    } else {
      await this.expectValidationError(
        () => {
          device.createRenderPipeline(pipelineDescriptor);
        },
        shouldError,
        msg
      );
    }
  }

  async testMaxComputeWorkgroupSize(
  limitTest,
  testValueName,
  async,
  axis)
  {
    const kExtraLimits = {
      maxComputeInvocationsPerWorkgroup: 'adapterLimit'
    };

    await this.testDeviceWithRequestedMaximumLimits(
      limitTest,
      testValueName,
      async ({ device, testValue, actualLimit, shouldError }) => {
        if (testValue > device.limits.maxComputeInvocationsPerWorkgroup) {
          return;
        }

        const size = [1, 1, 1];
        size[axis.codePointAt(0) - 'X'.codePointAt(0)] = testValue;
        const { module, code } = this.getModuleForWorkgroupSize(size);

        await this.testCreatePipeline(
          'createComputePipeline',
          async,
          module,
          shouldError,
          `size: ${testValue}, limit: ${actualLimit}\n${code}`
        );
      },
      kExtraLimits
    );
  }

  /**
   * Creates an GPURenderCommandsMixin setup with some initial state.
   */
  #getGPURenderCommandsMixin(encoderType) {
    const { device } = this;

    switch (encoderType) {
      case 'render':{
          const buffer = this.createBufferTracked({
            size: 16,
            usage: GPUBufferUsage.UNIFORM
          });

          const texture = this.createTextureTracked({
            size: [1, 1],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.RENDER_ATTACHMENT
          });

          const layout = device.createBindGroupLayout({
            entries: [
            {
              binding: 0,
              visibility: GPUShaderStage.VERTEX,
              buffer: {}
            }]

          });

          const bindGroup = device.createBindGroup({
            layout,
            entries: [
            {
              binding: 0,
              resource: { buffer }
            }]

          });

          const encoder = device.createCommandEncoder();
          const passEncoder = encoder.beginRenderPass({
            colorAttachments: [
            {
              view: texture.createView(),
              loadOp: 'clear',
              storeOp: 'store'
            }]

          });

          return {
            passEncoder,
            bindGroup,
            prep() {
              passEncoder.end();
            },
            test() {
              encoder.finish();
            }
          };
          break;
        }

      case 'renderBundle':{
          const buffer = this.createBufferTracked({
            size: 16,
            usage: GPUBufferUsage.UNIFORM
          });

          const layout = device.createBindGroupLayout({
            entries: [
            {
              binding: 0,
              visibility: GPUShaderStage.VERTEX,
              buffer: {}
            }]

          });

          const bindGroup = device.createBindGroup({
            layout,
            entries: [
            {
              binding: 0,
              resource: { buffer }
            }]

          });

          const passEncoder = device.createRenderBundleEncoder({
            colorFormats: ['rgba8unorm']
          });

          return {
            passEncoder,
            bindGroup,
            prep() {},
            test() {
              passEncoder.finish();
            }
          };
          break;
        }
    }
  }

  /**
   * Test a method on GPURenderCommandsMixin or GPUBindingCommandsMixin
   * The function will be called with the passEncoder.
   */
  async testGPURenderAndBindingCommandsMixin(
  encoderType,
  fn,






  shouldError,
  msg = '')
  {
    const { passEncoder, prep, test, bindGroup } = this.#getGPURenderCommandsMixin(encoderType);
    fn({ passEncoder, bindGroup });
    prep();

    await this.expectValidationError(test, shouldError, msg);
  }

  /**
   * Creates GPUBindingCommandsMixin setup with some initial state.
   */
  #getGPUBindingCommandsMixin(encoderType) {
    const { device } = this;

    switch (encoderType) {
      case 'compute':{
          const buffer = this.createBufferTracked({
            size: 16,
            usage: GPUBufferUsage.UNIFORM
          });

          const layout = device.createBindGroupLayout({
            entries: [
            {
              binding: 0,
              visibility: GPUShaderStage.COMPUTE,
              buffer: {}
            }]

          });

          const bindGroup = device.createBindGroup({
            layout,
            entries: [
            {
              binding: 0,
              resource: { buffer }
            }]

          });

          const encoder = device.createCommandEncoder();
          const passEncoder = encoder.beginComputePass();
          return {
            passEncoder,
            bindGroup,
            prep() {
              passEncoder.end();
            },
            test() {
              encoder.finish();
            }
          };
          break;
        }
      case 'render':
        return this.#getGPURenderCommandsMixin('render');
      case 'renderBundle':
        return this.#getGPURenderCommandsMixin('renderBundle');
    }
  }

  /**
   * Tests a method on GPUBindingCommandsMixin
   * The function pass will be called with the passEncoder and a bindGroup
   */
  async testGPUBindingCommandsMixin(
  encoderType,
  fn,
  shouldError,
  msg = '')
  {
    const { passEncoder, bindGroup, prep, test } = this.#getGPUBindingCommandsMixin(encoderType);
    fn({ passEncoder, bindGroup });
    prep();

    await this.expectValidationError(test, shouldError, msg);
  }

  getModuleForWorkgroupSize(size) {
    const { device } = this;
    const code = `
      @group(0) @binding(0) var<storage, read_write> d: f32;
      @compute @workgroup_size(${size.join(',')}) fn main() {
        d = 0;
      }
    `;
    const module = device.createShaderModule({ code });
    return { module, code };
  }

  skipIfNotEnoughStorageBuffersInStage(visibility, numRequired) {
    const { device } = this;

    this.skipIf(
      numRequired > device.limits.maxStorageBuffersPerShaderStage,
      `maxStorageBuffersPerShaderStage = ${device.limits.maxSamplersPerShaderStage} which is less than ${numRequired}`
    );

    this.skipIf(
      this.isCompatibility &&
      // If we're using the fragment stage
      (visibility & GPUShaderStage.FRAGMENT) !== 0 &&
      // If perShaderStage and inFragment stage are equal we want to
      // allow the test to run as otherwise we can't test overMaximum and overLimit
      device.limits.maxStorageBuffersPerShaderStage >
      device.limits.maxStorageBuffersInFragmentStage &&
      // They aren't equal so if there aren't enough supported in the fragment then skip
      !(device.limits.maxStorageBuffersInFragmentStage >= numRequired),
      `maxStorageBuffersInFragmentShader = ${device.limits.maxStorageBuffersInFragmentStage} which is less than ${numRequired}`
    );

    this.skipIf(
      this.isCompatibility &&
      // If we're using the vertex stage
      (visibility & GPUShaderStage.VERTEX) !== 0 &&
      // If perShaderStage and inVertex stage are equal we want to
      // allow the test to run as otherwise we can't test overMaximum and overLimit
      device.limits.maxStorageBuffersPerShaderStage >
      device.limits.maxStorageBuffersInVertexStage &&
      // They aren't equal so if there aren't enough supported in the vertex then skip
      !(device.limits.maxStorageBuffersInVertexStage >= numRequired),
      `maxStorageBuffersInVertexShader = ${device.limits.maxStorageBuffersInVertexStage} which is less than ${numRequired}`
    );
  }
}






/**
 * Makes a new LimitTest class so that the tests have access to `limit`
 */
function makeLimitTestFixture(
limit,
params)
{
  class LimitTests extends LimitTestsImpl {
    limit = limit;
    limitTestParams = params ?? {};
  }

  return LimitTests;
}

/**
 * This is to avoid repeating yourself (D.R.Y.) as I ran into that issue multiple times
 * writing these tests where I'd copy a test, need to rename a limit in 3-4 places,
 * forget one place, and then spend 20-30 minutes wondering why the test was failing.
 */
export function makeLimitTestGroup(limit, params) {
  const description = `API Validation Tests for ${limit}.`;
  const g = makeTestGroup(makeLimitTestFixture(limit, params));
  return { g, description, limit };
}

/**
 * Test that limit must be less than dependentLimitName when requesting a device.
 */
export function testMaxStorageXXXInYYYStageDeviceCreationWithDependentLimit(
g,
limit,




dependentLimitName)
{
  g.test(`auto_upgrades_per_stage,${dependentLimitName}`).
  desc(
    `Test that
       * adapter.limit.${limit} < adapter.limit.${dependentLimitName}
       * requiredLimits.${limit} auto-upgrades device.limits.${dependentLimitName}
       `
  ).
  fn(async (t) => {
    const { adapterLimit: maximumLimit, adapter } = t;

    {
      const dependentLimit = adapter.limits[dependentLimitName];
      t.expect(
        maximumLimit <= dependentLimit,
        `maximumLimit(${maximumLimit}) is <= adapter.limits.${dependentLimitName}(${dependentLimit})`
      );
    }

    const shouldReject = false;
    const device = await t.requestDeviceWithLimits(
      adapter,
      {
        [limit]: maximumLimit
      },
      shouldReject
    );

    {
      const dependentLimit = device.limits[dependentLimitName];
      const actualLimit = device.limits[limit];
      t.expect(
        dependentLimit >= actualLimit,
        `device.limits.${dependentLimitName}(${dependentLimit}) is >= adapter.limits.${limit}(${actualLimit})`
      );
    }

    device?.destroy();
  });

  g.test(`auto_upgraded_from_per_stage,${dependentLimitName}`).
  desc(
    `Test that adapter.limit.${limit} is automatically upgraded to ${dependentLimitName} except in compat.`
  ).
  fn(async (t) => {
    const { adapter, defaultLimit } = t;
    const dependentAdapterLimit = adapter.limits[dependentLimitName];
    const shouldReject = false;
    const device = await t.requestDeviceWithLimits(
      adapter,
      {
        [dependentLimitName]: dependentAdapterLimit
      },
      shouldReject
    );

    const expectedLimit = t.isCompatibility ? defaultLimit : dependentAdapterLimit;
    t.expect(
      device.limits[limit] === expectedLimit,
      `${limit}(${device.limits[limit]}) === ${expectedLimit}`
    );
  });
}
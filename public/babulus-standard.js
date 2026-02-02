"use strict";
var BabulusStandard = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // globals:react-dom/client
  var require_client = __commonJS({
    "globals:react-dom/client"(exports, module) {
      module.exports = window.ReactDOM;
    }
  });

  // globals:react
  var require_react = __commonJS({
    "globals:react"(exports, module) {
      module.exports = window.React;
    }
  });

  // node_modules/react/cjs/react-jsx-runtime.development.js
  var require_react_jsx_runtime_development = __commonJS({
    "node_modules/react/cjs/react-jsx-runtime.development.js"(exports) {
      "use strict";
      if (true) {
        (function() {
          "use strict";
          var React3 = require_react();
          var REACT_ELEMENT_TYPE = /* @__PURE__ */ Symbol.for("react.element");
          var REACT_PORTAL_TYPE = /* @__PURE__ */ Symbol.for("react.portal");
          var REACT_FRAGMENT_TYPE = /* @__PURE__ */ Symbol.for("react.fragment");
          var REACT_STRICT_MODE_TYPE = /* @__PURE__ */ Symbol.for("react.strict_mode");
          var REACT_PROFILER_TYPE = /* @__PURE__ */ Symbol.for("react.profiler");
          var REACT_PROVIDER_TYPE = /* @__PURE__ */ Symbol.for("react.provider");
          var REACT_CONTEXT_TYPE = /* @__PURE__ */ Symbol.for("react.context");
          var REACT_FORWARD_REF_TYPE = /* @__PURE__ */ Symbol.for("react.forward_ref");
          var REACT_SUSPENSE_TYPE = /* @__PURE__ */ Symbol.for("react.suspense");
          var REACT_SUSPENSE_LIST_TYPE = /* @__PURE__ */ Symbol.for("react.suspense_list");
          var REACT_MEMO_TYPE = /* @__PURE__ */ Symbol.for("react.memo");
          var REACT_LAZY_TYPE = /* @__PURE__ */ Symbol.for("react.lazy");
          var REACT_OFFSCREEN_TYPE = /* @__PURE__ */ Symbol.for("react.offscreen");
          var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
          var FAUX_ITERATOR_SYMBOL = "@@iterator";
          function getIteratorFn(maybeIterable) {
            if (maybeIterable === null || typeof maybeIterable !== "object") {
              return null;
            }
            var maybeIterator = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable[FAUX_ITERATOR_SYMBOL];
            if (typeof maybeIterator === "function") {
              return maybeIterator;
            }
            return null;
          }
          var ReactSharedInternals = React3.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
          function error(format) {
            {
              {
                for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
                  args[_key2 - 1] = arguments[_key2];
                }
                printWarning("error", format, args);
              }
            }
          }
          function printWarning(level, format, args) {
            {
              var ReactDebugCurrentFrame2 = ReactSharedInternals.ReactDebugCurrentFrame;
              var stack = ReactDebugCurrentFrame2.getStackAddendum();
              if (stack !== "") {
                format += "%s";
                args = args.concat([stack]);
              }
              var argsWithFormat = args.map(function(item) {
                return String(item);
              });
              argsWithFormat.unshift("Warning: " + format);
              Function.prototype.apply.call(console[level], console, argsWithFormat);
            }
          }
          var enableScopeAPI = false;
          var enableCacheElement = false;
          var enableTransitionTracing = false;
          var enableLegacyHidden = false;
          var enableDebugTracing = false;
          var REACT_MODULE_REFERENCE;
          {
            REACT_MODULE_REFERENCE = /* @__PURE__ */ Symbol.for("react.module.reference");
          }
          function isValidElementType(type) {
            if (typeof type === "string" || typeof type === "function") {
              return true;
            }
            if (type === REACT_FRAGMENT_TYPE || type === REACT_PROFILER_TYPE || enableDebugTracing || type === REACT_STRICT_MODE_TYPE || type === REACT_SUSPENSE_TYPE || type === REACT_SUSPENSE_LIST_TYPE || enableLegacyHidden || type === REACT_OFFSCREEN_TYPE || enableScopeAPI || enableCacheElement || enableTransitionTracing) {
              return true;
            }
            if (typeof type === "object" && type !== null) {
              if (type.$$typeof === REACT_LAZY_TYPE || type.$$typeof === REACT_MEMO_TYPE || type.$$typeof === REACT_PROVIDER_TYPE || type.$$typeof === REACT_CONTEXT_TYPE || type.$$typeof === REACT_FORWARD_REF_TYPE || // This needs to include all possible module reference object
              // types supported by any Flight configuration anywhere since
              // we don't know which Flight build this will end up being used
              // with.
              type.$$typeof === REACT_MODULE_REFERENCE || type.getModuleId !== void 0) {
                return true;
              }
            }
            return false;
          }
          function getWrappedName(outerType, innerType, wrapperName) {
            var displayName = outerType.displayName;
            if (displayName) {
              return displayName;
            }
            var functionName = innerType.displayName || innerType.name || "";
            return functionName !== "" ? wrapperName + "(" + functionName + ")" : wrapperName;
          }
          function getContextName(type) {
            return type.displayName || "Context";
          }
          function getComponentNameFromType(type) {
            if (type == null) {
              return null;
            }
            {
              if (typeof type.tag === "number") {
                error("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue.");
              }
            }
            if (typeof type === "function") {
              return type.displayName || type.name || null;
            }
            if (typeof type === "string") {
              return type;
            }
            switch (type) {
              case REACT_FRAGMENT_TYPE:
                return "Fragment";
              case REACT_PORTAL_TYPE:
                return "Portal";
              case REACT_PROFILER_TYPE:
                return "Profiler";
              case REACT_STRICT_MODE_TYPE:
                return "StrictMode";
              case REACT_SUSPENSE_TYPE:
                return "Suspense";
              case REACT_SUSPENSE_LIST_TYPE:
                return "SuspenseList";
            }
            if (typeof type === "object") {
              switch (type.$$typeof) {
                case REACT_CONTEXT_TYPE:
                  var context = type;
                  return getContextName(context) + ".Consumer";
                case REACT_PROVIDER_TYPE:
                  var provider = type;
                  return getContextName(provider._context) + ".Provider";
                case REACT_FORWARD_REF_TYPE:
                  return getWrappedName(type, type.render, "ForwardRef");
                case REACT_MEMO_TYPE:
                  var outerName = type.displayName || null;
                  if (outerName !== null) {
                    return outerName;
                  }
                  return getComponentNameFromType(type.type) || "Memo";
                case REACT_LAZY_TYPE: {
                  var lazyComponent = type;
                  var payload = lazyComponent._payload;
                  var init = lazyComponent._init;
                  try {
                    return getComponentNameFromType(init(payload));
                  } catch (x) {
                    return null;
                  }
                }
              }
            }
            return null;
          }
          var assign = Object.assign;
          var disabledDepth = 0;
          var prevLog;
          var prevInfo;
          var prevWarn;
          var prevError;
          var prevGroup;
          var prevGroupCollapsed;
          var prevGroupEnd;
          function disabledLog() {
          }
          disabledLog.__reactDisabledLog = true;
          function disableLogs() {
            {
              if (disabledDepth === 0) {
                prevLog = console.log;
                prevInfo = console.info;
                prevWarn = console.warn;
                prevError = console.error;
                prevGroup = console.group;
                prevGroupCollapsed = console.groupCollapsed;
                prevGroupEnd = console.groupEnd;
                var props = {
                  configurable: true,
                  enumerable: true,
                  value: disabledLog,
                  writable: true
                };
                Object.defineProperties(console, {
                  info: props,
                  log: props,
                  warn: props,
                  error: props,
                  group: props,
                  groupCollapsed: props,
                  groupEnd: props
                });
              }
              disabledDepth++;
            }
          }
          function reenableLogs() {
            {
              disabledDepth--;
              if (disabledDepth === 0) {
                var props = {
                  configurable: true,
                  enumerable: true,
                  writable: true
                };
                Object.defineProperties(console, {
                  log: assign({}, props, {
                    value: prevLog
                  }),
                  info: assign({}, props, {
                    value: prevInfo
                  }),
                  warn: assign({}, props, {
                    value: prevWarn
                  }),
                  error: assign({}, props, {
                    value: prevError
                  }),
                  group: assign({}, props, {
                    value: prevGroup
                  }),
                  groupCollapsed: assign({}, props, {
                    value: prevGroupCollapsed
                  }),
                  groupEnd: assign({}, props, {
                    value: prevGroupEnd
                  })
                });
              }
              if (disabledDepth < 0) {
                error("disabledDepth fell below zero. This is a bug in React. Please file an issue.");
              }
            }
          }
          var ReactCurrentDispatcher = ReactSharedInternals.ReactCurrentDispatcher;
          var prefix;
          function describeBuiltInComponentFrame(name, source, ownerFn) {
            {
              if (prefix === void 0) {
                try {
                  throw Error();
                } catch (x) {
                  var match = x.stack.trim().match(/\n( *(at )?)/);
                  prefix = match && match[1] || "";
                }
              }
              return "\n" + prefix + name;
            }
          }
          var reentry = false;
          var componentFrameCache;
          {
            var PossiblyWeakMap = typeof WeakMap === "function" ? WeakMap : Map;
            componentFrameCache = new PossiblyWeakMap();
          }
          function describeNativeComponentFrame(fn, construct) {
            if (!fn || reentry) {
              return "";
            }
            {
              var frame = componentFrameCache.get(fn);
              if (frame !== void 0) {
                return frame;
              }
            }
            var control;
            reentry = true;
            var previousPrepareStackTrace = Error.prepareStackTrace;
            Error.prepareStackTrace = void 0;
            var previousDispatcher;
            {
              previousDispatcher = ReactCurrentDispatcher.current;
              ReactCurrentDispatcher.current = null;
              disableLogs();
            }
            try {
              if (construct) {
                var Fake = function() {
                  throw Error();
                };
                Object.defineProperty(Fake.prototype, "props", {
                  set: function() {
                    throw Error();
                  }
                });
                if (typeof Reflect === "object" && Reflect.construct) {
                  try {
                    Reflect.construct(Fake, []);
                  } catch (x) {
                    control = x;
                  }
                  Reflect.construct(fn, [], Fake);
                } else {
                  try {
                    Fake.call();
                  } catch (x) {
                    control = x;
                  }
                  fn.call(Fake.prototype);
                }
              } else {
                try {
                  throw Error();
                } catch (x) {
                  control = x;
                }
                fn();
              }
            } catch (sample) {
              if (sample && control && typeof sample.stack === "string") {
                var sampleLines = sample.stack.split("\n");
                var controlLines = control.stack.split("\n");
                var s = sampleLines.length - 1;
                var c = controlLines.length - 1;
                while (s >= 1 && c >= 0 && sampleLines[s] !== controlLines[c]) {
                  c--;
                }
                for (; s >= 1 && c >= 0; s--, c--) {
                  if (sampleLines[s] !== controlLines[c]) {
                    if (s !== 1 || c !== 1) {
                      do {
                        s--;
                        c--;
                        if (c < 0 || sampleLines[s] !== controlLines[c]) {
                          var _frame = "\n" + sampleLines[s].replace(" at new ", " at ");
                          if (fn.displayName && _frame.includes("<anonymous>")) {
                            _frame = _frame.replace("<anonymous>", fn.displayName);
                          }
                          {
                            if (typeof fn === "function") {
                              componentFrameCache.set(fn, _frame);
                            }
                          }
                          return _frame;
                        }
                      } while (s >= 1 && c >= 0);
                    }
                    break;
                  }
                }
              }
            } finally {
              reentry = false;
              {
                ReactCurrentDispatcher.current = previousDispatcher;
                reenableLogs();
              }
              Error.prepareStackTrace = previousPrepareStackTrace;
            }
            var name = fn ? fn.displayName || fn.name : "";
            var syntheticFrame = name ? describeBuiltInComponentFrame(name) : "";
            {
              if (typeof fn === "function") {
                componentFrameCache.set(fn, syntheticFrame);
              }
            }
            return syntheticFrame;
          }
          function describeFunctionComponentFrame(fn, source, ownerFn) {
            {
              return describeNativeComponentFrame(fn, false);
            }
          }
          function shouldConstruct(Component2) {
            var prototype = Component2.prototype;
            return !!(prototype && prototype.isReactComponent);
          }
          function describeUnknownElementTypeFrameInDEV(type, source, ownerFn) {
            if (type == null) {
              return "";
            }
            if (typeof type === "function") {
              {
                return describeNativeComponentFrame(type, shouldConstruct(type));
              }
            }
            if (typeof type === "string") {
              return describeBuiltInComponentFrame(type);
            }
            switch (type) {
              case REACT_SUSPENSE_TYPE:
                return describeBuiltInComponentFrame("Suspense");
              case REACT_SUSPENSE_LIST_TYPE:
                return describeBuiltInComponentFrame("SuspenseList");
            }
            if (typeof type === "object") {
              switch (type.$$typeof) {
                case REACT_FORWARD_REF_TYPE:
                  return describeFunctionComponentFrame(type.render);
                case REACT_MEMO_TYPE:
                  return describeUnknownElementTypeFrameInDEV(type.type, source, ownerFn);
                case REACT_LAZY_TYPE: {
                  var lazyComponent = type;
                  var payload = lazyComponent._payload;
                  var init = lazyComponent._init;
                  try {
                    return describeUnknownElementTypeFrameInDEV(init(payload), source, ownerFn);
                  } catch (x) {
                  }
                }
              }
            }
            return "";
          }
          var hasOwnProperty = Object.prototype.hasOwnProperty;
          var loggedTypeFailures = {};
          var ReactDebugCurrentFrame = ReactSharedInternals.ReactDebugCurrentFrame;
          function setCurrentlyValidatingElement(element) {
            {
              if (element) {
                var owner = element._owner;
                var stack = describeUnknownElementTypeFrameInDEV(element.type, element._source, owner ? owner.type : null);
                ReactDebugCurrentFrame.setExtraStackFrame(stack);
              } else {
                ReactDebugCurrentFrame.setExtraStackFrame(null);
              }
            }
          }
          function checkPropTypes(typeSpecs, values, location, componentName, element) {
            {
              var has = Function.call.bind(hasOwnProperty);
              for (var typeSpecName in typeSpecs) {
                if (has(typeSpecs, typeSpecName)) {
                  var error$1 = void 0;
                  try {
                    if (typeof typeSpecs[typeSpecName] !== "function") {
                      var err = Error((componentName || "React class") + ": " + location + " type `" + typeSpecName + "` is invalid; it must be a function, usually from the `prop-types` package, but received `" + typeof typeSpecs[typeSpecName] + "`.This often happens because of typos such as `PropTypes.function` instead of `PropTypes.func`.");
                      err.name = "Invariant Violation";
                      throw err;
                    }
                    error$1 = typeSpecs[typeSpecName](values, typeSpecName, componentName, location, null, "SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED");
                  } catch (ex) {
                    error$1 = ex;
                  }
                  if (error$1 && !(error$1 instanceof Error)) {
                    setCurrentlyValidatingElement(element);
                    error("%s: type specification of %s `%s` is invalid; the type checker function must return `null` or an `Error` but returned a %s. You may have forgotten to pass an argument to the type checker creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and shape all require an argument).", componentName || "React class", location, typeSpecName, typeof error$1);
                    setCurrentlyValidatingElement(null);
                  }
                  if (error$1 instanceof Error && !(error$1.message in loggedTypeFailures)) {
                    loggedTypeFailures[error$1.message] = true;
                    setCurrentlyValidatingElement(element);
                    error("Failed %s type: %s", location, error$1.message);
                    setCurrentlyValidatingElement(null);
                  }
                }
              }
            }
          }
          var isArrayImpl = Array.isArray;
          function isArray(a) {
            return isArrayImpl(a);
          }
          function typeName(value) {
            {
              var hasToStringTag = typeof Symbol === "function" && Symbol.toStringTag;
              var type = hasToStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
              return type;
            }
          }
          function willCoercionThrow(value) {
            {
              try {
                testStringCoercion(value);
                return false;
              } catch (e) {
                return true;
              }
            }
          }
          function testStringCoercion(value) {
            return "" + value;
          }
          function checkKeyStringCoercion(value) {
            {
              if (willCoercionThrow(value)) {
                error("The provided key is an unsupported type %s. This value must be coerced to a string before before using it here.", typeName(value));
                return testStringCoercion(value);
              }
            }
          }
          var ReactCurrentOwner = ReactSharedInternals.ReactCurrentOwner;
          var RESERVED_PROPS = {
            key: true,
            ref: true,
            __self: true,
            __source: true
          };
          var specialPropKeyWarningShown;
          var specialPropRefWarningShown;
          var didWarnAboutStringRefs;
          {
            didWarnAboutStringRefs = {};
          }
          function hasValidRef(config) {
            {
              if (hasOwnProperty.call(config, "ref")) {
                var getter = Object.getOwnPropertyDescriptor(config, "ref").get;
                if (getter && getter.isReactWarning) {
                  return false;
                }
              }
            }
            return config.ref !== void 0;
          }
          function hasValidKey(config) {
            {
              if (hasOwnProperty.call(config, "key")) {
                var getter = Object.getOwnPropertyDescriptor(config, "key").get;
                if (getter && getter.isReactWarning) {
                  return false;
                }
              }
            }
            return config.key !== void 0;
          }
          function warnIfStringRefCannotBeAutoConverted(config, self) {
            {
              if (typeof config.ref === "string" && ReactCurrentOwner.current && self && ReactCurrentOwner.current.stateNode !== self) {
                var componentName = getComponentNameFromType(ReactCurrentOwner.current.type);
                if (!didWarnAboutStringRefs[componentName]) {
                  error('Component "%s" contains the string ref "%s". Support for string refs will be removed in a future major release. This case cannot be automatically converted to an arrow function. We ask you to manually fix this case by using useRef() or createRef() instead. Learn more about using refs safely here: https://reactjs.org/link/strict-mode-string-ref', getComponentNameFromType(ReactCurrentOwner.current.type), config.ref);
                  didWarnAboutStringRefs[componentName] = true;
                }
              }
            }
          }
          function defineKeyPropWarningGetter(props, displayName) {
            {
              var warnAboutAccessingKey = function() {
                if (!specialPropKeyWarningShown) {
                  specialPropKeyWarningShown = true;
                  error("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", displayName);
                }
              };
              warnAboutAccessingKey.isReactWarning = true;
              Object.defineProperty(props, "key", {
                get: warnAboutAccessingKey,
                configurable: true
              });
            }
          }
          function defineRefPropWarningGetter(props, displayName) {
            {
              var warnAboutAccessingRef = function() {
                if (!specialPropRefWarningShown) {
                  specialPropRefWarningShown = true;
                  error("%s: `ref` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", displayName);
                }
              };
              warnAboutAccessingRef.isReactWarning = true;
              Object.defineProperty(props, "ref", {
                get: warnAboutAccessingRef,
                configurable: true
              });
            }
          }
          var ReactElement = function(type, key, ref, self, source, owner, props) {
            var element = {
              // This tag allows us to uniquely identify this as a React Element
              $$typeof: REACT_ELEMENT_TYPE,
              // Built-in properties that belong on the element
              type,
              key,
              ref,
              props,
              // Record the component responsible for creating this element.
              _owner: owner
            };
            {
              element._store = {};
              Object.defineProperty(element._store, "validated", {
                configurable: false,
                enumerable: false,
                writable: true,
                value: false
              });
              Object.defineProperty(element, "_self", {
                configurable: false,
                enumerable: false,
                writable: false,
                value: self
              });
              Object.defineProperty(element, "_source", {
                configurable: false,
                enumerable: false,
                writable: false,
                value: source
              });
              if (Object.freeze) {
                Object.freeze(element.props);
                Object.freeze(element);
              }
            }
            return element;
          };
          function jsxDEV(type, config, maybeKey, source, self) {
            {
              var propName;
              var props = {};
              var key = null;
              var ref = null;
              if (maybeKey !== void 0) {
                {
                  checkKeyStringCoercion(maybeKey);
                }
                key = "" + maybeKey;
              }
              if (hasValidKey(config)) {
                {
                  checkKeyStringCoercion(config.key);
                }
                key = "" + config.key;
              }
              if (hasValidRef(config)) {
                ref = config.ref;
                warnIfStringRefCannotBeAutoConverted(config, self);
              }
              for (propName in config) {
                if (hasOwnProperty.call(config, propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
                  props[propName] = config[propName];
                }
              }
              if (type && type.defaultProps) {
                var defaultProps = type.defaultProps;
                for (propName in defaultProps) {
                  if (props[propName] === void 0) {
                    props[propName] = defaultProps[propName];
                  }
                }
              }
              if (key || ref) {
                var displayName = typeof type === "function" ? type.displayName || type.name || "Unknown" : type;
                if (key) {
                  defineKeyPropWarningGetter(props, displayName);
                }
                if (ref) {
                  defineRefPropWarningGetter(props, displayName);
                }
              }
              return ReactElement(type, key, ref, self, source, ReactCurrentOwner.current, props);
            }
          }
          var ReactCurrentOwner$1 = ReactSharedInternals.ReactCurrentOwner;
          var ReactDebugCurrentFrame$1 = ReactSharedInternals.ReactDebugCurrentFrame;
          function setCurrentlyValidatingElement$1(element) {
            {
              if (element) {
                var owner = element._owner;
                var stack = describeUnknownElementTypeFrameInDEV(element.type, element._source, owner ? owner.type : null);
                ReactDebugCurrentFrame$1.setExtraStackFrame(stack);
              } else {
                ReactDebugCurrentFrame$1.setExtraStackFrame(null);
              }
            }
          }
          var propTypesMisspellWarningShown;
          {
            propTypesMisspellWarningShown = false;
          }
          function isValidElement(object) {
            {
              return typeof object === "object" && object !== null && object.$$typeof === REACT_ELEMENT_TYPE;
            }
          }
          function getDeclarationErrorAddendum() {
            {
              if (ReactCurrentOwner$1.current) {
                var name = getComponentNameFromType(ReactCurrentOwner$1.current.type);
                if (name) {
                  return "\n\nCheck the render method of `" + name + "`.";
                }
              }
              return "";
            }
          }
          function getSourceInfoErrorAddendum(source) {
            {
              if (source !== void 0) {
                var fileName = source.fileName.replace(/^.*[\\\/]/, "");
                var lineNumber = source.lineNumber;
                return "\n\nCheck your code at " + fileName + ":" + lineNumber + ".";
              }
              return "";
            }
          }
          var ownerHasKeyUseWarning = {};
          function getCurrentComponentErrorInfo(parentType) {
            {
              var info = getDeclarationErrorAddendum();
              if (!info) {
                var parentName = typeof parentType === "string" ? parentType : parentType.displayName || parentType.name;
                if (parentName) {
                  info = "\n\nCheck the top-level render call using <" + parentName + ">.";
                }
              }
              return info;
            }
          }
          function validateExplicitKey(element, parentType) {
            {
              if (!element._store || element._store.validated || element.key != null) {
                return;
              }
              element._store.validated = true;
              var currentComponentErrorInfo = getCurrentComponentErrorInfo(parentType);
              if (ownerHasKeyUseWarning[currentComponentErrorInfo]) {
                return;
              }
              ownerHasKeyUseWarning[currentComponentErrorInfo] = true;
              var childOwner = "";
              if (element && element._owner && element._owner !== ReactCurrentOwner$1.current) {
                childOwner = " It was passed a child from " + getComponentNameFromType(element._owner.type) + ".";
              }
              setCurrentlyValidatingElement$1(element);
              error('Each child in a list should have a unique "key" prop.%s%s See https://reactjs.org/link/warning-keys for more information.', currentComponentErrorInfo, childOwner);
              setCurrentlyValidatingElement$1(null);
            }
          }
          function validateChildKeys(node, parentType) {
            {
              if (typeof node !== "object") {
                return;
              }
              if (isArray(node)) {
                for (var i = 0; i < node.length; i++) {
                  var child = node[i];
                  if (isValidElement(child)) {
                    validateExplicitKey(child, parentType);
                  }
                }
              } else if (isValidElement(node)) {
                if (node._store) {
                  node._store.validated = true;
                }
              } else if (node) {
                var iteratorFn = getIteratorFn(node);
                if (typeof iteratorFn === "function") {
                  if (iteratorFn !== node.entries) {
                    var iterator = iteratorFn.call(node);
                    var step;
                    while (!(step = iterator.next()).done) {
                      if (isValidElement(step.value)) {
                        validateExplicitKey(step.value, parentType);
                      }
                    }
                  }
                }
              }
            }
          }
          function validatePropTypes(element) {
            {
              var type = element.type;
              if (type === null || type === void 0 || typeof type === "string") {
                return;
              }
              var propTypes;
              if (typeof type === "function") {
                propTypes = type.propTypes;
              } else if (typeof type === "object" && (type.$$typeof === REACT_FORWARD_REF_TYPE || // Note: Memo only checks outer props here.
              // Inner props are checked in the reconciler.
              type.$$typeof === REACT_MEMO_TYPE)) {
                propTypes = type.propTypes;
              } else {
                return;
              }
              if (propTypes) {
                var name = getComponentNameFromType(type);
                checkPropTypes(propTypes, element.props, "prop", name, element);
              } else if (type.PropTypes !== void 0 && !propTypesMisspellWarningShown) {
                propTypesMisspellWarningShown = true;
                var _name = getComponentNameFromType(type);
                error("Component %s declared `PropTypes` instead of `propTypes`. Did you misspell the property assignment?", _name || "Unknown");
              }
              if (typeof type.getDefaultProps === "function" && !type.getDefaultProps.isReactClassApproved) {
                error("getDefaultProps is only used on classic React.createClass definitions. Use a static property named `defaultProps` instead.");
              }
            }
          }
          function validateFragmentProps(fragment) {
            {
              var keys = Object.keys(fragment.props);
              for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                if (key !== "children" && key !== "key") {
                  setCurrentlyValidatingElement$1(fragment);
                  error("Invalid prop `%s` supplied to `React.Fragment`. React.Fragment can only have `key` and `children` props.", key);
                  setCurrentlyValidatingElement$1(null);
                  break;
                }
              }
              if (fragment.ref !== null) {
                setCurrentlyValidatingElement$1(fragment);
                error("Invalid attribute `ref` supplied to `React.Fragment`.");
                setCurrentlyValidatingElement$1(null);
              }
            }
          }
          var didWarnAboutKeySpread = {};
          function jsxWithValidation(type, props, key, isStaticChildren, source, self) {
            {
              var validType = isValidElementType(type);
              if (!validType) {
                var info = "";
                if (type === void 0 || typeof type === "object" && type !== null && Object.keys(type).length === 0) {
                  info += " You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.";
                }
                var sourceInfo = getSourceInfoErrorAddendum(source);
                if (sourceInfo) {
                  info += sourceInfo;
                } else {
                  info += getDeclarationErrorAddendum();
                }
                var typeString;
                if (type === null) {
                  typeString = "null";
                } else if (isArray(type)) {
                  typeString = "array";
                } else if (type !== void 0 && type.$$typeof === REACT_ELEMENT_TYPE) {
                  typeString = "<" + (getComponentNameFromType(type.type) || "Unknown") + " />";
                  info = " Did you accidentally export a JSX literal instead of a component?";
                } else {
                  typeString = typeof type;
                }
                error("React.jsx: type is invalid -- expected a string (for built-in components) or a class/function (for composite components) but got: %s.%s", typeString, info);
              }
              var element = jsxDEV(type, props, key, source, self);
              if (element == null) {
                return element;
              }
              if (validType) {
                var children = props.children;
                if (children !== void 0) {
                  if (isStaticChildren) {
                    if (isArray(children)) {
                      for (var i = 0; i < children.length; i++) {
                        validateChildKeys(children[i], type);
                      }
                      if (Object.freeze) {
                        Object.freeze(children);
                      }
                    } else {
                      error("React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead.");
                    }
                  } else {
                    validateChildKeys(children, type);
                  }
                }
              }
              {
                if (hasOwnProperty.call(props, "key")) {
                  var componentName = getComponentNameFromType(type);
                  var keys = Object.keys(props).filter(function(k) {
                    return k !== "key";
                  });
                  var beforeExample = keys.length > 0 ? "{key: someKey, " + keys.join(": ..., ") + ": ...}" : "{key: someKey}";
                  if (!didWarnAboutKeySpread[componentName + beforeExample]) {
                    var afterExample = keys.length > 0 ? "{" + keys.join(": ..., ") + ": ...}" : "{}";
                    error('A props object containing a "key" prop is being spread into JSX:\n  let props = %s;\n  <%s {...props} />\nReact keys must be passed directly to JSX without using spread:\n  let props = %s;\n  <%s key={someKey} {...props} />', beforeExample, componentName, afterExample, componentName);
                    didWarnAboutKeySpread[componentName + beforeExample] = true;
                  }
                }
              }
              if (type === REACT_FRAGMENT_TYPE) {
                validateFragmentProps(element);
              } else {
                validatePropTypes(element);
              }
              return element;
            }
          }
          function jsxWithValidationStatic(type, props, key) {
            {
              return jsxWithValidation(type, props, key, true);
            }
          }
          function jsxWithValidationDynamic(type, props, key) {
            {
              return jsxWithValidation(type, props, key, false);
            }
          }
          var jsx8 = jsxWithValidationDynamic;
          var jsxs2 = jsxWithValidationStatic;
          exports.Fragment = REACT_FRAGMENT_TYPE;
          exports.jsx = jsx8;
          exports.jsxs = jsxs2;
        })();
      }
    }
  });

  // node_modules/react/jsx-runtime.js
  var require_jsx_runtime = __commonJS({
    "node_modules/react/jsx-runtime.js"(exports, module) {
      "use strict";
      if (false) {
        module.exports = null;
      } else {
        module.exports = require_react_jsx_runtime_development();
      }
    }
  });

  // scripts/browser-bundle.tsx
  var import_client = __toESM(require_client(), 1);

  // packages/renderer/src/ComposableRenderer.tsx
  var import_react2 = __toESM(require_react(), 1);

  // packages/shared/src/video.ts
  var isActiveRange = (timeSec, startSec, endSec) => {
    if (!Number.isFinite(timeSec)) {
      return false;
    }
    const start = startSec ?? 0;
    const end = endSec ?? start;
    return timeSec >= start && timeSec < end;
  };
  var getActiveScene = (script, timeSec = 0) => {
    const scenes = script?.scenes ?? [];
    for (const scene of scenes) {
      if (isActiveRange(timeSec, scene.startSec, scene.endSec)) {
        console.log(`[getActiveScene] timeSec=${timeSec}, found scene=${scene.id} (${scene.startSec}-${scene.endSec}), markup=`, JSON.stringify(scene.markup));
        return scene;
      }
    }
    console.log(`[getActiveScene] timeSec=${timeSec}, NO SCENE FOUND`);
    return null;
  };
  var getActiveCue = (script, timeSec = 0) => {
    const scene = getActiveScene(script, timeSec);
    if (!scene) {
      return null;
    }
    for (const cue of scene.cues ?? []) {
      if (isActiveRange(timeSec, cue.startSec, cue.endSec)) {
        return cue;
      }
    }
    return null;
  };

  // packages/shared/src/rbac.ts
  var VIEWER_PERMISSIONS = [
    "org:read",
    "project:read",
    "video:read",
    "storyboard:read",
    "asset:read",
    "run:read",
    "usage:view:redacted"
  ];
  var EDITOR_PERMISSIONS = [
    ...VIEWER_PERMISSIONS,
    "project:create",
    "project:edit",
    "video:create",
    "video:edit",
    "video:render",
    "storyboard:edit",
    "asset:upload",
    "asset:delete",
    "run:cancel"
  ];
  var ADMIN_PERMISSIONS = [
    ...EDITOR_PERMISSIONS,
    "org:invite",
    "org:roles",
    "usage:view:full"
  ];
  var OWNER_PERMISSIONS = [
    ...ADMIN_PERMISSIONS,
    "org:manage",
    "billing:manage"
  ];

  // packages/renderer/src/context.tsx
  var import_react = __toESM(require_react(), 1);

  // packages/renderer/src/math.ts
  var frameToTimeMs = (frame, fps) => frame / fps * 1e3;
  var clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  var interpolate = (value, inputRange, outputRange, options) => {
    const [inMin, inMax] = inputRange;
    const [outMin, outMax] = outputRange;
    if (inMax === inMin) {
      return outMin;
    }
    let t = (value - inMin) / (inMax - inMin);
    if (options?.clamp) {
      t = clamp(t, 0, 1);
    }
    const eased = options?.easing ? options.easing(t) : t;
    const mapped = outMin + (outMax - outMin) * eased;
    if (options?.clamp) {
      const [minOut, maxOut] = outputRange[0] < outputRange[1] ? outputRange : [outputRange[1], outputRange[0]];
      return clamp(mapped, minOut, maxOut);
    }
    return mapped;
  };
  var spring = ({ frame, fps, config }) => {
    const from = config?.from ?? 0;
    const to = config?.to ?? 1;
    if (from === to) {
      return to;
    }
    const mass = Math.max(1e-4, config?.mass ?? 1);
    const stiffness = Math.max(1e-4, config?.stiffness ?? 100);
    const damping = Math.max(0, config?.damping ?? 10);
    const t = Math.max(0, frame) / Math.max(1e-6, fps);
    const w0 = Math.sqrt(stiffness / mass);
    const zeta = damping / (2 * Math.sqrt(stiffness * mass));
    const delta = to - from;
    if (zeta < 1) {
      const wd2 = w0 * Math.sqrt(1 - zeta * zeta);
      const cos = Math.cos(wd2 * t);
      const sin = Math.sin(wd2 * t);
      const envelope = Math.exp(-zeta * w0 * t);
      const coeff = zeta / Math.sqrt(1 - zeta * zeta);
      const displacement2 = envelope * (cos + coeff * sin);
      return to - delta * displacement2;
    }
    if (zeta === 1) {
      const displacement2 = Math.exp(-w0 * t) * (1 + w0 * t);
      return to - delta * displacement2;
    }
    const wd = w0 * Math.sqrt(zeta * zeta - 1);
    const r1 = -w0 * (zeta - Math.sqrt(zeta * zeta - 1));
    const r2 = -w0 * (zeta + Math.sqrt(zeta * zeta - 1));
    const displacement = (r1 * Math.exp(r2 * t) - r2 * Math.exp(r1 * t)) / (r1 - r2);
    return to - delta * displacement;
  };

  // packages/renderer/src/context.tsx
  var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
  var RendererContext = (0, import_react.createContext)(null);
  var RendererProvider = ({ frame, config, children }) => {
    const value = (0, import_react.useMemo)(
      () => ({
        frame,
        fps: config.fps,
        timeMs: frameToTimeMs(frame, config.fps),
        config
      }),
      [frame, config]
    );
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RendererContext.Provider, { value, children });
  };
  var useRenderContext = () => {
    const ctx = (0, import_react.useContext)(RendererContext);
    if (!ctx) {
      throw new Error("useRenderContext must be used within a RendererProvider.");
    }
    return ctx;
  };
  var useCurrentFrame = () => useRenderContext().frame;
  var useVideoConfig = () => useRenderContext().config;

  // packages/renderer/src/components/TitleComponent.tsx
  var import_jsx_runtime2 = __toESM(require_jsx_runtime(), 1);
  function TitleComponent(props) {
    const {
      text,
      binding,
      fontSize,
      fontWeight,
      color,
      textAlign,
      position = { x: 48, y: 48 },
      scene,
      styles = {}
    } = props;
    const displayText = binding && scene ? resolveBinding(binding, { scene }) : text;
    if (!displayText) return null;
    const resolvedTextAlign = textAlign ?? styles.textAlign ?? "left";
    const containerStyle = {
      position: "absolute",
      top: position.y,
      fontSize: fontSize ?? styles.fontSize ?? 48,
      fontWeight: fontWeight ?? styles.fontWeight ?? 700,
      fontFamily: styles.fontFamily ?? "ui-sans-serif, system-ui, sans-serif",
      opacity: styles._computedOpacity ?? 1
    };
    if (resolvedTextAlign === "center") {
      containerStyle.left = "50%";
      containerStyle.display = "inline-block";
    } else {
      containerStyle.left = position.x;
      containerStyle.textAlign = resolvedTextAlign;
    }
    const spanStyle = {
      display: "inline-block",
      padding: "0.18em 0.22em",
      backgroundColor: color ?? styles.color ?? "#c7007e",
      color: "#ffffff",
      lineHeight: 1
    };
    if (resolvedTextAlign === "center") {
      spanStyle.transform = "translateX(-50%)";
    }
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: containerStyle, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: spanStyle, children: displayText }) });
  }
  function resolveBinding(binding, context) {
    if (binding === "scene.title") return context.scene?.title || "";
    if (binding === "scene.id") return context.scene?.id || "";
    return "";
  }

  // packages/renderer/src/components/SubtitleComponent.tsx
  var import_jsx_runtime3 = __toESM(require_jsx_runtime(), 1);
  function SubtitleComponent(props) {
    const {
      text,
      binding,
      fontSize,
      fontWeight,
      color,
      textAlign,
      position = { x: 48, y: 120 },
      cue,
      styles = {}
    } = props;
    const displayText = text || (binding && cue ? resolveBinding2(binding, { cue }) : cue ? resolveBinding2("cue.text", { cue }) : void 0);
    if (!displayText) return null;
    const resolvedTextAlign = textAlign ?? styles.textAlign ?? "left";
    const transform = resolvedTextAlign === "center" ? "translateX(-50%)" : void 0;
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      "div",
      {
        style: {
          position: "absolute",
          left: position.x,
          top: position.y,
          fontSize: fontSize ?? styles.fontSize ?? 20,
          fontWeight: fontWeight ?? styles.fontWeight ?? 400,
          color: color ?? styles.color ?? "#cbd5f5",
          textAlign: resolvedTextAlign,
          fontFamily: styles.fontFamily ?? "ui-sans-serif, system-ui, sans-serif",
          opacity: styles._computedOpacity ?? 1,
          whiteSpace: "nowrap",
          transform
        },
        children: displayText
      }
    );
  }
  function resolveBinding2(binding, context) {
    if (binding === "cue.text") return context.cue?.text || "";
    if (binding === "cue.label") return context.cue?.label || "";
    if (binding === "cue.id") return context.cue?.id || "";
    return "";
  }

  // packages/renderer/src/components/ProgressBarComponent.tsx
  var import_jsx_runtime4 = __toESM(require_jsx_runtime(), 1);
  function ProgressBarComponent(props) {
    const {
      position = "bottom",
      height = 8,
      color = "linear-gradient(90deg, #38bdf8, #818cf8)",
      backgroundColor = "rgba(148,163,184,0.25)",
      progress = 0,
      styles = {}
    } = props;
    const style = {
      position: "absolute",
      [position]: 0,
      left: 0,
      width: "100%",
      height: `${height}px`,
      maxHeight: `${height}px`,
      minHeight: `${height}px`,
      overflow: "hidden",
      background: backgroundColor,
      opacity: styles._computedOpacity ?? 1
    };
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      "div",
      {
        style: {
          position: "absolute",
          top: 0,
          left: 0,
          height: "100%",
          width: `${Math.min(100, Math.max(0, progress))}%`,
          background: color,
          transition: "width 0.1s linear"
        }
      }
    ) });
  }

  // packages/renderer/src/components/RectangleComponent.tsx
  var import_jsx_runtime5 = __toESM(require_jsx_runtime(), 1);
  function RectangleComponent(props) {
    const {
      color,
      gradient,
      image,
      x = 0,
      y = 0,
      width = "100%",
      height = "100%",
      borderRadius,
      border,
      styles = {}
    } = props;
    const background = gradient || image || color || styles.background || "transparent";
    const useInsetPositioning = (width === "100%" || width === "100vw") && (height === "100%" || height === "100vh") && x === 0 && y === 0;
    return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
      "div",
      {
        style: useInsetPositioning ? {
          position: "absolute",
          inset: 0,
          background,
          opacity: styles._computedOpacity ?? 1,
          borderRadius,
          border
        } : {
          position: "absolute",
          left: x,
          top: y,
          width,
          height,
          background,
          opacity: styles._computedOpacity ?? 1,
          borderRadius,
          border
        }
      }
    );
  }

  // packages/renderer/src/components/registry.ts
  var registry = /* @__PURE__ */ new Map();
  registry.set("Title", TitleComponent);
  registry.set("Subtitle", SubtitleComponent);
  registry.set("ProgressBar", ProgressBarComponent);
  registry.set("Rectangle", RectangleComponent);
  registry.set("Background", RectangleComponent);
  function registerComponent(name, component) {
    registry.set(name, component);
  }
  function getComponent(name) {
    if (typeof name === "function") {
      return name;
    }
    const result = registry.get(name);
    if (!result) {
      const keys = Array.from(registry.keys());
      console.error(`[Registry] Component "${name}" not found. Available:`, keys);
    }
    return result || null;
  }
  function listComponents() {
    return Array.from(registry.keys());
  }

  // packages/renderer/src/styles/cascade.ts
  function cascadeStyles(sceneStyles = {}, layerStyles = {}, componentStyles = {}) {
    const sceneOpacity = sceneStyles.opacity ?? 1;
    const layerOpacity = layerStyles.opacity ?? 1;
    const componentOpacity = componentStyles.opacity ?? 1;
    const computedOpacity = sceneOpacity * layerOpacity * componentOpacity;
    return {
      // Scene defaults (lowest priority)
      ...sceneStyles,
      // Layer overrides scene
      ...layerStyles,
      // Component overrides all
      ...componentStyles,
      // Computed opacity for rendering
      _computedOpacity: computedOpacity,
      // Keep original component opacity for reference
      opacity: componentOpacity
    };
  }

  // packages/renderer/src/markup/cascade.ts
  function cascadeMarkup(sceneMarkup = {}, layerMarkup = {}, componentMarkup = {}) {
    const merged = {};
    const mergeValue = (target, source) => {
      for (const key in source) {
        const sourceValue = source[key];
        const targetValue = target[key];
        if (typeof sourceValue === "object" && sourceValue !== null && !Array.isArray(sourceValue) && typeof targetValue === "object" && targetValue !== null && !Array.isArray(targetValue)) {
          target[key] = { ...targetValue, ...sourceValue };
        } else {
          target[key] = sourceValue;
        }
      }
    };
    mergeValue(merged, sceneMarkup);
    mergeValue(merged, layerMarkup);
    mergeValue(merged, componentMarkup);
    return merged;
  }

  // packages/renderer/src/ComposableRenderer.tsx
  var import_jsx_runtime6 = __toESM(require_jsx_runtime(), 1);
  function getScriptDuration(script) {
    const metaDuration = script.meta?.durationSeconds ?? 0;
    const sceneEnds = (script.scenes ?? []).map((scene) => scene.endSec ?? 0);
    const sceneMax = sceneEnds.length ? Math.max(...sceneEnds) : 0;
    return Math.max(metaDuration, sceneMax);
  }
  var ComposableRenderer = ({ script }) => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const timeSec = frame / fps;
    const scene = (0, import_react2.useMemo)(() => getActiveScene(script, timeSec), [script, timeSec]);
    const cue = (0, import_react2.useMemo)(() => getActiveCue(script, timeSec), [script, timeSec]);
    const durationSec = (0, import_react2.useMemo)(() => getScriptDuration(script), [script]);
    const progressPct = durationSec > 0 ? Math.min(100, Math.max(0, timeSec / durationSec * 100)) : 0;
    const sceneStyles = scene?.styles || {};
    const sceneMarkup = scene?.markup || {};
    const layers = scene?.layers || [];
    const components = scene?.components || [];
    const sceneBackground = sceneMarkup.background || sceneStyles.background || "#fdfdfd";
    console.log("[ComposableRenderer] scene:", scene);
    console.log("[ComposableRenderer] sceneMarkup.background:", sceneMarkup.background);
    console.log("[ComposableRenderer] sceneBackground:", sceneBackground, "sceneStyles:", sceneStyles, "sceneMarkup:", sceneMarkup);
    return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          position: "relative",
          background: sceneBackground,
          fontFamily: sceneStyles.fontFamily || "ui-sans-serif, system-ui, sans-serif",
          opacity: sceneStyles.opacity
        },
        children: [
          layers.map((layer) => /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
            Layer,
            {
              layer,
              sceneStyles,
              sceneMarkup,
              scene,
              cue,
              frame,
              timeSec,
              fps,
              width,
              height,
              progressPct
            },
            layer.id
          )),
          components.map((spec) => /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
            Component,
            {
              spec,
              sceneStyles,
              sceneMarkup,
              layerStyles: {},
              layerMarkup: {},
              scene,
              cue,
              frame,
              timeSec,
              fps,
              width,
              height,
              progressPct
            },
            spec.id
          ))
        ]
      }
    );
  };
  function Layer({
    layer,
    sceneStyles,
    sceneMarkup,
    scene,
    cue,
    frame,
    timeSec,
    fps,
    width,
    height,
    progressPct
  }) {
    if (layer.visible === false) return null;
    if (layer.timing) {
      const { startSec, endSec } = layer.timing;
      if (startSec !== void 0 && timeSec < startSec) return null;
      if (endSec !== void 0 && timeSec > endSec) return null;
    }
    const layerStyles = layer.styles || {};
    const layerMarkup = layer.markup || {};
    const sortedComponents = (0, import_react2.useMemo)(() => {
      return [...layer.components].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    }, [layer.components]);
    return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
      "div",
      {
        style: {
          position: "absolute",
          inset: 0,
          opacity: layerStyles.opacity,
          zIndex: layer.zIndex
        },
        children: sortedComponents.map((spec) => /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
          Component,
          {
            spec,
            sceneStyles,
            sceneMarkup,
            layerStyles,
            layerMarkup,
            scene,
            cue,
            frame,
            timeSec,
            fps,
            width,
            height,
            progressPct
          },
          spec.id
        ))
      }
    );
  }
  function Component({
    spec,
    sceneStyles,
    sceneMarkup,
    layerStyles,
    layerMarkup,
    scene,
    cue,
    frame,
    timeSec,
    fps,
    width,
    height,
    progressPct
  }) {
    if (spec.visible === false) return null;
    if (spec.timing) {
      const { startSec, endSec } = spec.timing;
      if (startSec !== void 0 && timeSec < startSec) return null;
      if (endSec !== void 0 && timeSec > endSec) return null;
    }
    const ComponentImpl = getComponent(spec.type);
    if (!ComponentImpl) {
      console.warn(`Component not found: ${spec.type}`);
      return null;
    }
    const cascadedStyles = cascadeStyles(
      sceneStyles,
      layerStyles,
      spec.styles || {}
    );
    const cascadedMarkup = cascadeMarkup(
      sceneMarkup,
      layerMarkup,
      spec.markup || {}
    );
    const props = {
      ...spec.props,
      styles: cascadedStyles,
      // Pass cascaded styles to component
      markup: cascadedMarkup,
      // Pass cascaded markup to component
      scene,
      cue,
      frame,
      timeSec,
      fps,
      videoWidth: width,
      videoHeight: height,
      progress: progressPct
      // For ProgressBar
    };
    if (spec.bindings) {
      for (const [propName, dataRef] of Object.entries(spec.bindings)) {
        props[propName] = resolveDataReference(dataRef, { scene, cue, frame, timeSec });
      }
    }
    return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(ComponentImpl, { ...props }, spec.id);
  }
  function resolveDataReference(ref, context) {
    if (ref.startsWith("scene.")) {
      const key = ref.substring(6);
      return context.scene?.[key];
    }
    if (ref.startsWith("cue.")) {
      const key = ref.substring(4);
      return context.cue?.[key];
    }
    if (ref.startsWith("frame.")) {
      const key = ref.substring(6);
      return key === "number" ? context.frame : context.timeSec;
    }
    return ref;
  }

  // scripts/browser-bundle.tsx
  var import_jsx_runtime7 = __toESM(require_jsx_runtime(), 1);
  window.Babulus = {
    // Component registry
    registerComponent,
    getComponent,
    listComponents,
    // Core renderer
    ComposableRenderer,
    RendererProvider,
    // Context hooks (for custom components)
    useCurrentFrame,
    useVideoConfig,
    // Math utilities (for animations)
    interpolate,
    spring
  };
  var reactRoot = null;
  window.renderFrame = (renderData) => {
    const { script, frame, config, inputProps } = renderData;
    const root = document.getElementById("root");
    if (!root) {
      throw new Error("Root element not found");
    }
    if (!reactRoot) {
      reactRoot = (0, import_client.createRoot)(root);
    }
    reactRoot.render(
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(RendererProvider, { frame, config, children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(ComposableRenderer, { script, ...inputProps }) })
    );
    return new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
  };
})();
/*! Bundled license information:

react/cjs/react-jsx-runtime.development.js:
  (**
   * @license React
   * react-jsx-runtime.development.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)
*/
//# sourceMappingURL=babulus-standard.js.map

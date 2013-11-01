/**
 * @var {Object} a namespace to store internal utils for use by Firebase.Util methods
 */
var fb = {};
var Firebase;

if( typeof(window) === 'undefined' ) {
   Firebase = require('firebase');
}
else {
   Firebase = window.Firebase;
   if( !Firebase ) { throw new Error('Must include Firebase (http://cdn.firebase.com/v0/firebase.js) before firebase-utils.js'); }
}

(function(exports, fb) {
   var undefined;

   /**
    * Creates a namespace for packages inside the fb object
    * @param {String} name
    */
   fb.pkg = function(name) { fb[name] || (fb[name] = {}); return fb[name]; };

   var util = fb.pkg('util');

   util.isDefined = function(v) {
      return v !== undefined;
   };

   util.isObject = function(v) {
      return v !== null && typeof(v) === 'object';
   };

   util.isArray = function(v) {
      return (Array.isArray || isArray).call(null, v);
   };

   util.toArray = function(vals, startFrom) {
      var newVals = util.map(vals, function(v, k) { return v; });
      return startFrom > 0? newVals.slice(startFrom) : newVals;
   };

   util.extend = function(){
      var args = util.toArray(arguments);
      var recurse = args[0] === true && args.shift();
      var out = args.shift();
      util.each(args, function(o) {
         util.isObject(o) && util.each(o, function(v,k) {
            out[k] = recurse && util.isObject(out[k])? util.extend(true, out[k], v) : v;
         });
      });
      return out;
   };

   util.bind = function(fn, scope) {
      var args = Array.prototype.slice.call(arguments, 1);
      return (fn.bind || bind).apply(fn, args);
   };

   /**
    * @param {Object|Array} vals
    * @returns {boolean}
    */
   util.isEmpty = function(vals) {
      return vals === undefined || vals === null ||
         (util.isArray(vals) && vals.length === 0) ||
         (util.isObject(vals) && !util.contains(vals, function(v) { return true; }));
   };

   /**
    * @param {Object|Array} vals
    * @returns {Array} of keys
    */
   util.keys = function(vals) {
      var keys = [];
      util.each(vals, function(v, k) { keys.push(k); });
      return keys;
   };

   /**
    * Create an array using values returned by an iterator
    * @param vals
    * @param iterator
    * @param scope
    * @returns {*}
    */
   util.map = function(vals, iterator, scope) {
      var out = [];
      util.each(vals, function(v, k) {
         out.push(iterator.call(scope||null, v, k));
      });
      return out;
   };

   /**
    * Returns the first match
    * @param {Object|Array} vals
    * @param {Function} iterator
    * @param {Object} [scope] set `this` in the callback
    */
   util.find = function(vals, iterator, scope) {
      if( isArguments(vals) ) { vals = Array.prototype.slice.call(vals, 0); }
      if( util.isArray(vals) ) {
         for(var i = 0, len = vals.length; i < len; i++) {
            if( iterator.call(scope||null, vals[i], i) === true ) { return vals[i]; }
         }
      }
      else if( util.isObject(vals) ) {
         var key;
         for (key in vals) {
            if (vals.hasOwnProperty(key) && iterator.call(scope||null, vals[key], key) === true) {
               return vals[key];
            }
         }
      }
      return undefined;
   };

   util.has = function(vals, key) {
      return (util.isArray(vals) && vals[key] !== undefined)
         || (util.isObject(vals) && vals.hasOwnProperty(key))
         || false;
   };

   util.contains = function(vals, iterator, scope) {
      if( typeof(iterator) !== 'function' ) {
         if( util.isArray(vals) ) {
            return util.indexOf(vals, iterator) > -1;
         }
         iterator = (function(testVal) {
            return function(v) { return v === testVal; }
         })(iterator);
      }
      return util.find(vals, iterator, scope) !== undefined;
   };

   util.each = function(vals, cb, scope) {
      if( isArguments(vals) ) { vals = Array.prototype.slice.call(vals, 0); }
      if( util.isArray(vals) ) {
         (vals.forEach || forEach).call(vals, cb, scope);
      }
      else if( util.isObject(vals) ) {
         var key;
         for (key in vals) {
            if (vals.hasOwnProperty(key)) {
               cb.call(scope||null, vals[key], key);
            }
         }
      }
   };

   util.indexOf = function(list, item) {
      return (list.indexOf || indexOf).call(list, item);
   };

   /**
    * Invoke a function after a setTimeout(..., 0), to help convert synch callbacks to async ones.
    * Additional args after `scope` will be passed to the fn when it is invoked
    *
    * @param {Function} fn
    * @param {Object} scope the `this` scope inside `fn`
    */
   util.defer = function(fn, scope) {
      var args = util.toArray(arguments);
      setTimeout(util.bind.apply(null, args), 0);
   };

   /**
    * Inherit prototype of another JS class. Adds an _super() method for the constructor to call.
    * It takes any number of arguments (whatever the inherited classes constructor methods are),
    * the first of which must be the `this` instance.
    *
    * Limitations:
    *    1. Inherited constructor must be callable with no arguments (to make instanceof work), but can be called
    *       properly during instantiation with arguments by using _super(this, args...)
    *    2. Can only inherit one super class, no exceptions
    *    3. Cannot call prototype = {} after using this method
    *
    * @param {Function} InheritingClass
    * @param {Function} InheritedClass a class which can be constructed without passing any arguments
    * @returns {Function}
    */
   util.inherit = function(InheritingClass, InheritedClass) {
      // make sure we don't blow away any existing prototype methods on the object
      // and also accept additional arguments to inherit() and extend the prototype accordingly
      var moreFns = [InheritingClass.prototype || {}].concat(util.toArray(arguments, 2));

      InheritingClass.prototype = new InheritedClass;
      util.each(moreFns, function(fns) {
         util.extend(InheritingClass.prototype, fns);
      });

      InheritingClass.prototype._super = function(self) {
         InheritedClass.apply(self, util.toArray(arguments,1));
      };

      return InheritingClass;
   };

   /**
    * Call a method on each instance contained in the list. Any additional args are passed into the method.
    *
    * @param {Object|Array} list contains instantiated objects
    * @param {String} methodName
    * @return {Array}
    */
   util.call = function(list, methodName) {
      var args = util.toArray(arguments, 2);
      var res = [];
      util.each(list, function(o) {
         if( typeof(o) === 'function' && !methodName ) {
            return res.push(o.apply(null, args));
         }
         return util.isObject(o) && typeof(o[methodName]) === 'function' && res.push(o[methodName].apply(o, args));
      });
      return res;
   };

   /**
    * Determine if two variables are equal. They must be:
    *  - of the same type
    *  - arrays must be same length and all values pass isEqual()
    *  - objects must contain the same keys and their values pass isEqual()
    *  - primitives must pass ===
    *
    * @param a
    * @param b
    * @returns {boolean}
    */
   util.isEqual = function(a, b) {
      if( a === b ) { return true; }
      else if( typeof(a) !== typeof(b) ) {
         return false;
      }
      else if( util.isObject(a) && util.isObject(b) ) {
         var isA = util.isArray(a);
         var isB = util.isArray(b);
         if( isA || isB ) {
            return isA && isB && a.length === b.length && !util.contains(a, function(v, i) {
               return !util.isEqual(v, b[i]);
            });
         }
         else {
            return util.isEqual(util.keys(a).sort(), util.keys(b).sort())
               && !util.contains(a, function(v, k) { return !util.isEqual(v, b[k]) });
         }
      }
      else {
         return false;
      }
   };

   util.bindAll = function(context, methods) {
      util.each(methods, function(m,k) {
         methods[k] = util.bind(m, context);
      });
      return methods;
   };

   // a polyfill for Function.prototype.bind (invoke using call or apply!)
   // credits: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind
   function bind(oThis) {
      if (typeof this !== "function") {
         // closest thing possible to the ECMAScript 5 internal IsCallable function
         throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
      }

      var aArgs = Array.prototype.slice.call(arguments, 1),
         fToBind = this,
         fNOP = function () {},
         fBound = function () {
            return fToBind.apply(this instanceof fNOP && oThis
               ? this
               : oThis,
               aArgs.concat(Array.prototype.slice.call(arguments)));
         };

      fNOP.prototype = this.prototype;
      fBound.prototype = new fNOP();

      return fBound;
   }

   // a polyfill for Array.prototype.forEach (invoke using call or apply!)
   // credits: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach
   function forEach(fn, scope) {
      'use strict';
      var i, len;
      for (i = 0, len = this.length; i < len; ++i) {
         if (i in this) {
            fn.call(scope, this[i], i, this);
         }
      }
   }

   // a polyfill for Array.isArray
   // credits: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray
   function isArray(vArg) {
      return Object.prototype.toString.call(vArg) === "[object Array]";
   }

   // a polyfill for Array.indexOf
   // credits: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf
   function indexOf(searchElement /*, fromIndex */ ) {
      'use strict';
      if (this == null) {
         throw new TypeError();
      }
      var n, k, t = Object(this),
         len = t.length >>> 0;

      if (len === 0) {
         return -1;
      }
      n = 0;
      if (arguments.length > 1) {
         n = Number(arguments[1]);
         if (n != n) { // shortcut for verifying if it's NaN
            n = 0;
         } else if (n != 0 && n != Infinity && n != -Infinity) {
            n = (n > 0 || -1) * Math.floor(Math.abs(n));
         }
      }
      if (n >= len) {
         return -1;
      }
      for (k = n >= 0 ? n : Math.max(len - Math.abs(n), 0); k < len; k++) {
         if (k in t && t[k] === searchElement) {
            return k;
         }
      }
      return -1;
   }

   // determine if an object is actually an arguments object passed into a function
   function isArguments(args) {
      // typeof null is also 'object', but null throws
      // a TypeError if you access a property.
      // We check for it as a special case so we can
      // safely use properties below.
      if ( args === null ) return false;

      if ( typeof args !== 'object' ) return false;

      // make sure it has the required properties
      if ( typeof args.callee !== 'function' ) return false;
      if ( typeof args.length !== 'number' ) return false;
      if ( args.constructor !== Object ) return false;

      // it passes all the tests
      return true;
   }

   function NotSupportedError(message) {
      this.name = 'NotSupportedError';
      this.message = message;
      this.stack = (new Error()).stack;
   }
   NotSupportedError.prototype = new Error;
   exports.NotSupportedError = NotSupportedError;

   // for running test units and debugging only
   exports._ForTestingOnly = fb;

})(exports, fb);
/* eslint-disable max-classes-per-file */
/**
 * The purpose of Util is to store utility functions for code quality, validations and more
 */
import cx from "classnames";

class Helper {
  /**
   * The purpose of this functionality is to extend the styling received from the
   * default CSS module with a dynamic styling. Due to the dynamic generation of
   * class names, we wouldn't have been able to do this with pure css.
   * This way, when we now expect dynamic styling, we test it and merge it using
   * cx() from the classnames package
   *
   *
   * @param {Object} primary - the primary style module
   * @param {Object} dynamic - the dynamic style module, the overrider
   * @param {string} className - the primary className
   * @param {string} dynamicClassName - the dynamic className, the overrider
   * @return {*}
   */

  static dynamicClass(primary, dynamic, className, dynamicClassName = className) {
    const style = primary[className];
    if (Helper.isEmpty(dynamic) || Helper.isEmpty(dynamic[dynamicClassName])) return style;
    return cx(style, dynamic[dynamicClassName]);
  }

  /**
   *
   *
   *
   *
   *  DATA INTEGRITY
   *
   *
   */

  static isEmpty = (value) => {
    try {
      if (value === undefined || typeof value === "undefined" || value === null) return true; // first isValid if value is defined and !null

      // case : object
      if (typeof value === "object") {
        if (value !== "" && value !== {} && value !== "{}") return false;
      }
      // case : array
      else if (value.constructor === Array) {
        if (value.length !== 0) return false; // isValid if the array has positive length
      }
      // case : string/number
      else {
        if (value === "0" || value === 0 || value === false || value === true) return false;
        return !value || /^\s*$/.test(String(value));
      }
    } catch (err) {
      console.error(err);
    }

    return true;
  };

  static isFunction = (value) => {
    if (Helper.isEmpty(value)) return false;
    return typeof value === "function";
  };

  /**
   *
   * @param {Object} object
   * @param {String|int}key
   * @returns {*|String|int}
   */
  static getValue(key, object) {
    if (Helper.isDataSetInObject(key, object)) {
      return object[key];
    }
    return null;
  }

  /**
   *
   * @param {Object} object
   * @param {String|int}key
   * @returns {*|Object}
   */

  static getObject(key, object) {
    if (Helper.isObjectSetInObject(key, object)) {
      return object[key];
    }
    return null;
  }

  /**
   *
   * @param {Object} object
   * @param {String|int}key
   * @returns {*|Array}
   */
  static getArray(key, object) {
    if (this.isArraySetInObject(key, object)) {
      return object[key];
    }
    return null;
  }

  /**
   *
   * @param array
   * @param {Function} creator - will be a function that will create an object from the variables
   * @returns {Array}
   */

  static parseArrayElementWithClass(
    array,
    creator = function(element) {
      return element;
    },
  ) {
    if (array === null || array.length === 0) return [];
    // eslint-disable-next-line prefer-const
    let result = [];
    for (let i = 0; i < array.length; i++) {
      result.push(creator(array[i], i));
    }
    return result;
  }

  static isDataSetInObject(key, object) {
    if (object === null || object === undefined || object.length === 0) return false;
    if (!Object.prototype.hasOwnProperty.call(object, key)) return false;
    return !Helper.isEmpty(object[key]);
  }

  static isObjectSetInObject(key, object) {
    if (object === null || object === undefined || object.length === 0) return false;
    if (!Object.prototype.hasOwnProperty.call(object, key)) return false;
    return object[key] !== null;
  }

  static isArraySetInObject(key, object) {
    if (object === null || object === undefined || object.length === 0) return false;
    if (!Object.prototype.hasOwnProperty.call(object, key)) return false;
    return object[key] !== null && object[key].length > 0;
  }

  static sanitize(value, fallback = "") {
    return Helper.isEmpty(value) ? fallback : value;
  }

  /**
   *
   * @param {Number} amount
   * @param {Number} digitsAfterComma
   * @param {Number} digitsBeforeComma
   *
   *
   * Important: use toLocale conversion to make sure the decimal separator is consistent ( "." )
   * @returns {String}
   */
  static standardizeNumber(amount, digitsAfterComma = 2, digitsBeforeComma = 0) {
    const subject = String(Number(amount).toLocaleString("en"));
    const parts = subject.split(".");

    if (Helper.isEmpty(parts[0]) || parts[0] === "0") parts[0] = "0";
    if (parts.length < 2) parts[1] = Array(digitsAfterComma).join("0");

    parts[0] = (() => {
      let result = "";
      const source = String(parts[0])
        .split("")
        .reverse()
        .join("");

      for (let i = 0; i < Math.max(source.length, digitsBeforeComma); i++)
        result += source.length >= i + 1 ? source[i] : "0";
      return result
        .split("")
        .reverse()
        .join("");
    })();

    parts[1] = (() => {
      let result = "";
      const source = String(parts[1]);
      for (let i = 0; i < Math.max(source.length, digitsAfterComma); i++)
        result += source.length >= i + 1 ? source[i] : "0";
      return result;
    })();

    const result = parts.join(".");

    return result;
  }
}

class Streamer {
  static parse(source) {
    const stream = {};
    stream.id = Helper.getValue("id", source);

    return stream;
  }
}

export { Helper, Streamer };

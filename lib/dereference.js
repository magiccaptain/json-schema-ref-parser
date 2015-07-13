'use strict';

var Url       = require('./url'),
    $Ref      = require('./ref'),
    util      = require('./util'),
    _forEach  = require('lodash/collection/forEach'),
    _isArray  = require('lodash/lang/isArray'),
    _isObject = require('lodash/lang/isObject');

module.exports = dereference;

/**
 * @param {$RefParser} parser
 * @param {Options} options
 * @returns {Promise}
 */
function dereference(parser, options) {
  util.debug('Dereferencing $ref pointers in %s', parser._url);

  var internal = options.$refs.internal;

  if (options.$refs.external) {
    // Dereference all external $refs first.
    // This is important, because internal $refs can point to dereferenced values
    options.$refs.internal = false;
    crawl(parser.schema, parser._url, [], parser.$refs, options);
  }

  if (internal) {
    // Now dereference the internal $refs.
    options.$refs.internal = true;
    crawl(parser.schema, parser._url, [], parser.$refs, options);
  }
}

/**
 * @param {object} obj
 * @param {Url} url
 * @param {object[]} parents
 * @param {$Refs} $refs
 * @param {Options} options
 */
function crawl(obj, url, parents, $refs, options) {
  if (_isObject(obj) || _isArray(obj)) {
    parents.push(obj);

    _forEach(obj, function(value, key) {
      var keyUrl = new Url(url);
      keyUrl.hash = (keyUrl.hash || '#') + '/' + key;

      if ($Ref.isAllowed(value, options)) {
        // We found a $ref pointer.
        util.debug('Dereferencing $ref pointer "%s" at %s', value, keyUrl);
        var $refUrl = url.resolve(value.$ref);

        // Dereference the $ref pointer
        obj[key] = value = $refs.get($refUrl);

        // Crawl the dereferenced value (unless it's circular)
        if (parents.indexOf(value) === -1) {
          crawl(value, $refUrl, parents, $refs, options);
        }
      }
      else if (parents.indexOf(value) === -1) {
        crawl(value, keyUrl, parents, $refs, options);
      }
    });

    parents.pop();
  }
}
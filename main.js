var Instrument = require('./instrument.js');
var Uglify = require('uglify-js');
var setup = "!function(e){if(!e.__setup__){e.__setup__=!0;var _=Object.defineProperties;e.__apply__=function(e,_,t){return e.apply(_,t)},e.__apply__=\"undefined\"==typeof Reflect?e.__apply__:Reflect.apply,e.__enumerate__=function(e){var _=[];for(var t in e)_[_.length]=t;return _},e.__enumerate__=\"undefined\"==typeof Reflect?e.__enumerate__:Reflect.enumerate,e.__eval__=eval,e.__object__=function(e){for(var t={},n=0;n<e.length;n++){t[e[n][0]]||(t[e[n][0]]={enumerate:!0,configurable:!0});var r=t[e[n][0]];\"init\"===e[n][1]?(delete r.get,delete r.set,r.writable=!0,r.value=e[n][2]):(delete r.writable,delete r.value,r[e[n][1]]=e[n][2])}return _({},t)},e.__search__=function(_,t){if(_&&\"object\"==typeof _){if(_.index===t)return _;if(_.index<t&&_.maxIndex>t)for(var n in _){var r=e.search(_[n],t);if(r)return r}}}}}(ARAN);";
module.exports = function (options, code) { return (options.nosetup ? '' : setup.replace('ARAN', function () { return options.global || 'aran'})) + Instrument(options, code) };
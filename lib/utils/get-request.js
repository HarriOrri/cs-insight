require('es6-promise').polyfill();

var axios = require('axios');

var delay = require('./delay');

function request(url, retry) {
  return axios.get(url)
    .catch(function(err) {
      if (err.code === 'ECONNRESET' && --retry > 0) {
        return delay(1000)
          .then(function() {
            return request(url, retry);
          });
      }
      return Promise.reject(err);
    });
}

/**
 * async request data by GET and return Promise
 *
 * @param url
 * @param options
 * @returns {Promise}
 */
module.exports = function(url, options) {
  options = options || {};
  return request(url, options.retry || 100)
    .then(function(res) {
      return res.data;
    });
};

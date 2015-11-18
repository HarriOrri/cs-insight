var async = require('async')
var utils = require('./utils')
var bitcoinjs = require('bitcoinjs-lib')

function Addresses(url, txEndpoint) {
  this.url = url
  this.txEndpoint = txEndpoint
}

Addresses.prototype.summary = function(addresses, callback) {
  var uri = this.url

  validateAddresses(addresses, function(err) {
    if(err) return callback(err)

    utils.batchRequest(uri, addresses, function(err, data) {
      if(err) return callback(err);

      var results = data.map(function(address) {
        return {
          address: address.addrStr,
          balance: address.balance,
          totalReceived: address.totalreceived,
          txCount: address.transactions.length
        }
      })

      callback(null, Array.isArray(addresses) ? results : results[0])
    })
  })
}

Addresses.prototype.transactions = function(addresses, blockHeight, done) {
  // optional blockHeight
  if ('function' === typeof blockHeight) {
    done = blockHeight
    blockHeight = 0
  }

  if (blockHeight > 0) {
    console.warn('Blockr API does not support blockHeight filter for addresses.transactions')
  }

  var url = this.url
  url = url.substring(0, url.length - 1) + 's/'
  var txIds = {}

  var self = this
  validateAddresses(addresses, function(err) {
    if(err) return done(err)
    async.parallel([
      // confirmed transactions
      function(callback) {
        utils.batchRequest(url, addresses, {params: ["from=0&to=30"], url: "/txs"}, function(err, data) {
          if (err) return callback(err)

          data[0].items.forEach(function(tx) {
            txIds[tx.txid] = true
          })

          callback()
        })
      }
    ], function(err) {
      if (err) return done(err)

      self.txEndpoint.get(Object.keys(txIds), done)
    })
  })
}

Addresses.prototype.unspents = function(addresses, callback) {
  var uri = this.url
  uri = uri.substring(0, uri.length - 1) + 's/'

  validateAddresses(addresses, function(err) {
    if(err) return callback(err)

    utils.batchRequest(uri, addresses, '/utxo', function(err, data) {
      if (err) return callback(err)

      var unspents = data

      var results = unspents.map(function(unspent) {
        return {
          address: unspent.address,
          confirmations: unspent.confirmations,
          vout: unspent.vout,
          txId: unspent.txid,
          value: unspent.amount
        }
      })

      callback(null, results)
    })
  })
}

function validateAddresses(addresses, callback) {
  addresses = [].concat(addresses)
  var invalidAddresses = addresses.filter(function(address) {
    try {
      bitcoinjs.Address.fromBase58Check(address)
    } catch(e) {
      return true
    }
  })

  if(invalidAddresses.length > 0) {
    return callback(new Error("There are " + invalidAddresses.length + " invalid addresses: " + invalidAddresses.join(', ')))
  }

  callback(null)
}

module.exports = Addresses

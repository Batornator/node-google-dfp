var
  DEFAULT_VERSION = 'v201502',
  BASE_API_URL = 'https://ads.google.com/apis/ads/publisher';

var google = require('googleapis');

var DfpUser = function (netCode, appName, version) {

  this.networkCode = netCode;
  this.applicationName = appName;
  this.version = version || DEFAULT_VERSION;

  return this;
};

DfpUser.prototype.setClient = function (client) {
  this.authClient = client;

  return this;
}


DfpUser.prototype.setSettings = function (settings) {
  this.settings = settings;

  return this;
};


DfpUser.prototype.getSOAPHeader = function () {

  return {
    RequestHeader: {
      attributes: {
        'soapenv:actor':            "http://schemas.xmlsoap.org/soap/actor/next",
        'soapenv:mustUnderstand':   0,
        'xsi:type':                 "ns1:SoapRequestHeader",
        'xmlns:ns1':                "https://www.google.com/apis/ads/publisher/" + this.version,
        'xmlns:xsi':                "http://www.w3.org/2001/XMLSchema-instance",
        'xmlns:soapenv':            "http://schemas.xmlsoap.org/soap/envelope/"
      },
      'ns1:networkCode'     : this.networkCode,
      'ns1:applicationName' : this.applicationName
    }
  };

};


DfpUser.prototype.getService = function (service, callback, version) {

  var soap = require('soap');
  var soap_wsdl;
  var dfpUser = this;

  version = version || this.version;

  soap_wsdl = BASE_API_URL + '/' + version + '/' + service + '?wsdl';

  var options = {
    ignoredNamespaces: {
      namespaces: ['tns']
    }
  };

  this.getTokens(function (err, tokens) {

    soap.createClient(soap_wsdl, options, function (err, client) {
      if (err) {
        console.log('Create Client Error ' + err);
        throw new Error('Unable to get token');
      }

      client.addSoapHeader(dfpUser.getSOAPHeader(), '', 'ns1', '');

      var serviceInstance = {};
      var interfacePort = client[service][service + 'InterfacePort'];
      var method, object;

      for (method in interfacePort) {
        if (interfacePort.hasOwnProperty(method)) {
          object = interfacePort[method];
          if (object && typeof object === "function") {
            serviceInstance[method] = (function (method) {
              console.log(tokens);
              return function () {
                var authhdr = { 'Authorization' : tokens.token_type + ' ' + tokens.access_token };
                client[method](arguments[0], arguments[1], arguments[2], authhdr, arguments[3], arguments[4], arguments[5], arguments[6], arguments[7]);
              };
            })(method);
          }
        }
      }

      return callback(serviceInstance);

    });
  });

  return this;
};

DfpUser.prototype.getTokens = function (callback) {
  if (this.authClient) {
    return this.authClient.authorize(callback);
  }

  var oathClient = new google.auth.OAuth2(this.settings.client_id, this.settings.client_secret, this.settings.redirect_url);
  oathClient.credentials = { refresh_token: this.settings.refresh_token };

  oathClient.refreshAccessToken(callback);
};


module.exports = DfpUser;

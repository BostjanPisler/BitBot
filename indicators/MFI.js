var _ = require('underscore');
var tools = require('../util/tools.js');

var indicator = function(options) {

  this.options = options;
  this.position = {};
  this.indicator = {};
  this.previousIndicator = {};
  this.advice = 'hold';
  this.csArray = [];

  _.bindAll(this, 'calculate', 'setPosition');

  if(!'neededPeriods' in options || !'periods' in options
  || !'buyThreshold' in options || !'sellThreshold' in options) {
    var err = new Error('Invalid options for indicator, exiting.');
    this.logger.error(err.stack);
    process.exit();
  }

  // indicatorOptions
  // options: { neededPeriods: number, periods: number, buyThreshold: number, sellThreshold: number }

};

//-------------------------------------------------------------------------------HelperFunctions
var calculateRawMoneyFlow = function(cs, typicalPrice) {
  return tools.round(typicalPrice * tools.round(cs.volume, 8), 8);
}

var calculateTypicalPrice = function(cs) {
  return tools.round((tools.round(cs.high, 8)
    + tools.round(cs.low, 8) + tools.round(cs.close, 8)) / 3, 8);
}
//-------------------------------------------------------------------------------HelperFunctions

indicator.prototype.calculate = function(cs) {

  this.previousIndicator = this.indicator;

  var positiveMoneyFlow = 0;
  var negativeMoneyFlow = 0;

  this.csArray.push(cs);
  if (this.csArray.length > this.options.periods) {
    this.csArray.shift();
  }

  this.csArray.forEach((pcs, i) => {
    var tp = calculateTypicalPrice(pcs);

    if (i) {
      var ptp = calculateTypicalPrice(this.csArray[i - 1]);

      if (tp > ptp) {
        positiveMoneyFlow = tools.round(positiveMoneyFlow
          + calculateRawMoneyFlow(pcs, tp), 8);
      } else {
        negativeMoneyFlow = tools.round(positiveMoneyFlow
          + calculateRawMoneyFlow(pcs, tp), 8);
      }
    } else {
      positiveMoneyFlow = tools.round(positiveMoneyFlow
        + calculateRawMoneyFlow(pcs, tp), 8);
    }
  });

  var moneyFlowRatio = tools.round(positiveMoneyFlow / negativeMoneyFlow, 8);

  var MFI = tools.round(100 - 100 / (1 + moneyFlowRatio), 2);

  this.indicator = { result: MFI };

  if (this.csArray.length >= this.options.neededPeriods) {
    var advice = 'hold';

    if (this.previousIndicator.result < this.options.sellThreshold
    && this.indicator.result > this.options.sellThreshold) {
      advice = 'sell';
    } else if (this.previousIndicator.result > this.options.buyThreshold
    && this.indicator.result < this.options.buyThreshold) {
      advice = 'buy';
    }

    return { advice: advice, indicatorValue: MFI };
  }

  return { advice: 'hold', indicatorValue: null };
};

indicator.prototype.setPosition = function(pos) {

  this.position = pos;

};

module.exports = indicator;

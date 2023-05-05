// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../interfaces/chainlink/IAggregatorV3.sol";
import "../auth/AdminAuth.sol";

contract PriceFeedRegistryL2 is AdminAuth{

  mapping(address => mapping(address => address)) public aggregators;

  function getFeed(
    address base,
    address quote
  )
    public
    view
    returns (
      address aggregator
    )
  {
    aggregator = aggregators[base][quote];
    require(address(aggregator) != address(0), "Feed not found");
  }

  function latestRoundData(
    address base,
    address quote
  )
    public
    view
    returns (
      uint80 roundId,
      int256 answer,
      uint256 startedAt,
      uint256 updatedAt,
      uint80 answeredInRound
    )
  {
    address aggregator = getFeed(base, quote);
    return IAggregatorV3(aggregator).latestRoundData();
  }

  function setFeed(
    address base,
    address quote,
    address aggregator
  )
    public
    onlyOwner
  {
    aggregators[base][quote] = aggregator;
  }
}
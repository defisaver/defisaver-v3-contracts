// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;


contract MockChainlinkFeedRegistry {

    struct PriceData {
        uint80 roundId;
        int256 answer;
        uint256 startedAt;
        uint256 updatedAt;
        uint80 answeredInRound;
    }

    mapping (address => mapping (address => mapping (uint80 => PriceData))) prices;

    uint80 latestRoundId;

    function setRoundData(address _base, address _quote, uint80 _roundId, int256 _answer) public {
        prices[_base][_quote][_roundId] = PriceData({
            roundId: _roundId,
            answer: _answer,
            startedAt: block.timestamp,
            updatedAt: block.timestamp,
            answeredInRound: _roundId
        });

        latestRoundId = _roundId;
    }

    function latestRoundData(
        address base,
        address quote
    )
        external
        view
        returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
        ) {
            PriceData memory p = prices[base][quote][latestRoundId];
            return (p.roundId, p.answer, p.startedAt, p.updatedAt, p.answeredInRound);
        }

    function getRoundData(
        address base,
        address quote,
        uint80 _roundId
    )
        external
        view
        returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
        ) {
            PriceData memory p = prices[base][quote][_roundId];
            return (p.roundId, p.answer, p.startedAt, p.updatedAt, p.answeredInRound);
        }
}
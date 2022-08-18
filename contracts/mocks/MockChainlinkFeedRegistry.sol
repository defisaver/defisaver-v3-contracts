// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;


contract MockChainlinkFeedRegistry {

    struct PriceData {
        uint80 roundId;
        int256 answer;
        uint256 startedAt;
        uint256 updatedAt;
        uint80 answeredInRound;
        uint256 index;
    }

    mapping (address => mapping (address => mapping (uint80 => PriceData))) prices;

    uint80[] public roundIds;

    uint80 latestRoundId;

    function setRoundData(address _base, address _quote, uint80 _roundId, int256 _answer) public {
        roundIds.push(_roundId);

        prices[_base][_quote][_roundId] = PriceData({
            roundId: _roundId,
            answer: _answer,
            startedAt: block.timestamp,
            updatedAt: block.timestamp,
            answeredInRound: _roundId,
            index: roundIds.length - 1
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

    function getNextRoundId(
        address base,
        address quote,
        uint80 roundId
    ) external
        view
        returns (
        uint80 nextRoundId
        ) {
            PriceData memory p = prices[base][quote][roundId];

            if (p.index + 1 >= roundIds.length) return 0;

            return roundIds[p.index + 1];
        }
}
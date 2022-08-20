// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../interfaces/chainlink/IFeedRegistry.sol";

contract MockChainlinkFeedRegistry {

    IFeedRegistry public constant feedRegistry = IFeedRegistry(0x47Fb2585D2C56Fe188D0E6ec628a38b74fCeeeDf);

    struct PriceData {
        uint80 roundId;
        int256 answer;
        uint256 startedAt;
        uint256 updatedAt;
        uint80 answeredInRound;
    }

    mapping (address => mapping (address => mapping (uint80 => PriceData))) prices;

    mapping (address => uint80) latestRoundId;
    mapping (address => uint80) firstRoundId;

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
        ) {
            if (latestRoundId[base] == 0) {
                return feedRegistry.latestRoundData(base, quote);
            } else {
                PriceData memory p = prices[base][quote][latestRoundId[base]];
                return (p.roundId, p.answer, p.startedAt, p.updatedAt, p.answeredInRound);
            }
        }

    function setRoundData(address _base, address _quote, int256 _answer) public {
        (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
        ) = latestRoundData(_base, _quote);
        PriceData memory latestRound = PriceData(roundId, answer, startedAt, updatedAt, answeredInRound);

        uint80 newRoundId = latestRound.roundId + 1;

        prices[_base][_quote][newRoundId] = PriceData({
            roundId: newRoundId,
            answer: _answer,
            startedAt: block.timestamp,
            updatedAt: block.timestamp,
            answeredInRound: newRoundId
        });

        latestRoundId[_base] = newRoundId;
        if (firstRoundId[_base] == 0) {
            firstRoundId[_base] = newRoundId;
        }
        // set first round here
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
            // this means we doesn't have a block
            if (p.roundId == 0) {
                return feedRegistry.getRoundData(base, quote, _roundId);
            }

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
            // we don't have the block asked for
            if (p.roundId == 0) {
                // try to fetch from feedRegistry
                uint80 nextRound = feedRegistry.getNextRoundId(base, quote, roundId);
                // if nextRound is 0 it can be the latest round on their feed
                if (nextRound == 0) {
                    // if we have it return our first round
                    if (latestRoundId[base] > 0) {
                        return firstRoundId[base];
                    } else {
                        return nextRound;
                    }
                }
            }


            if (p.roundId + 1 > latestRoundId[base]) return 0;

            return p.roundId + 1;
        }
}
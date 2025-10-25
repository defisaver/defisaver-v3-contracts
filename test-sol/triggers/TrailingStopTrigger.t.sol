// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IWStEth } from "../../contracts/interfaces/protocols/lido/IWStEth.sol";
import { MainnetUtilAddresses } from "../../contracts/utils/helpers/MainnetUtilAddresses.sol";
import { MockChainlinkFeedRegistry } from "../../contracts/mocks/MockChainlinkFeedRegistry.sol";
import { MockChainlinkAggregator } from "../../contracts/mocks/MockChainlinkAggregator.sol";
import { TrailingStopTrigger } from "../../contracts/triggers/TrailingStopTrigger.sol";
import { DSMath } from "../../contracts/DS/DSMath.sol";
import { BaseTest } from "../utils/BaseTest.sol";

contract TestTrailingStopTrigger is BaseTest, DSMath, MainnetUtilAddresses {
    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    TrailingStopTrigger cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    MockChainlinkAggregator mockAggregator;

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnet("TrailingStopTrigger");
        cut = new TrailingStopTrigger();

        // set mock price feed
        MockChainlinkFeedRegistry mockPriceFeed = new MockChainlinkFeedRegistry();
        vm.etch(CHAINLINK_FEED_REGISTRY, address(mockPriceFeed).code);
        mockPriceFeed = MockChainlinkFeedRegistry(CHAINLINK_FEED_REGISTRY);

        // set mock aggregator
        mockAggregator = new MockChainlinkAggregator();
        address realAggregatorAddress = mockPriceFeed.getFeed(address(0), address(0));
        vm.etch(realAggregatorAddress, address(mockAggregator).code);
        mockAggregator = MockChainlinkAggregator(realAggregatorAddress);
    }

    function testPercentageDiffWithFixedEthPrices() public view {
        uint256 currPrice = 1000 * 10 ** 8;
        uint256 maxPrice = 1112 * 10 ** 8;
        uint256 percentage = 10 * 10 ** 8;

        bool isDiff = cut.checkPercentageDiff(currPrice, maxPrice, percentage);

        assert(isDiff);
    }

    function testPercentageDiffWithFixedWbtcPrices() public view {
        uint256 currPrice = 22_000 * 10 ** 8;
        uint256 maxPrice = 25_000 * 10 ** 8;
        uint256 percentage = 10 * 10 ** 8;

        bool isDiff = cut.checkPercentageDiff(currPrice, maxPrice, percentage);

        assert(isDiff);
    }

    function testSmallPercentageDiffWithFixedWbtcPrices() public view {
        uint256 currPrice = 22_000 * 10 ** 8;
        uint256 maxPrice = 22_023 * 10 ** 8;
        uint256 percentage = 1 * 10 ** 7; // 0.1%

        bool isDiff = cut.checkPercentageDiff(currPrice, maxPrice, percentage);

        assert(isDiff);
    }

    function testExactPercentageDiffWithFixedWbtcPrices() public view {
        uint256 currPrice = 21_999_978 * 10 ** 5; // 21,999.978
        uint256 maxPrice = 22_022 * 10 ** 8; // 21,999.978
        uint256 percentage = 1 * 10 ** 7; // 0.1%

        bool isDiff = cut.checkPercentageDiff(currPrice, maxPrice, percentage);

        assert(isDiff);
    }

    function testPercentageDiffWithFixedEthPricesReturnsFalse() public view {
        uint256 currPrice = 1000 * 10 ** 8;
        uint256 maxPrice = 1109 * 10 ** 8;
        uint256 percentage = 10 * 10 ** 8;

        bool isDiff = cut.checkPercentageDiff(currPrice, maxPrice, percentage);

        assert(!isDiff);
    }

    // Test with fetching roundId
    function testGetRoundInfoForEth() public {
        uint256 chainLinkPrice = 10_000;
        uint80 roundId = 1;
        setRound(roundId, int256(chainLinkPrice), block.timestamp);

        (uint256 price, uint256 timestamp) = cut.getRoundInfo(ETH_ADDR, roundId);

        assert(price == uint256(chainLinkPrice));
        assert(timestamp == block.timestamp);
    }

    function _testGetRoundInfoForWStEth() public {
        uint256 chainLinkPrice = 10_000;
        uint80 roundId = 1;
        setRound(roundId, int256(chainLinkPrice), block.timestamp);

        (uint256 price, uint256 timestamp) = cut.getRoundInfo(WSTETH_ADDR, roundId);

        assert(price == wmul(uint256(chainLinkPrice), IWStEth(WSTETH_ADDR).stEthPerToken()));
        assert(timestamp == block.timestamp);
    }

    function testIsTriggeredToPass() public {
        uint80 startRoundId = 1;
        uint80 maxRoundId = 2;
        uint256 percentage = 10 * 10 ** 8;
        bytes memory callData = abi.encode(maxRoundId);
        bytes memory subData = abi.encode(ETH_ADDR, percentage, startRoundId);

        MockChainlinkAggregator.MockRoundData[] memory mockRounds = new MockChainlinkAggregator.MockRoundData[](3);
        mockRounds[0] = MockChainlinkAggregator.MockRoundData({
            roundId: startRoundId, answer: 10_000, updatedAt: block.timestamp
        });
        mockRounds[1] = MockChainlinkAggregator.MockRoundData({
            roundId: maxRoundId, answer: 15_000, updatedAt: block.timestamp + 60 * 60
        });
        mockRounds[2] = MockChainlinkAggregator.MockRoundData({
            roundId: maxRoundId + 1, answer: 12_000, updatedAt: block.timestamp + 60 * 60 * 2
        });
        mockAggregator.setMockRounds(mockRounds);

        bool isTriggered = cut.isTriggered(callData, subData);

        assert(isTriggered);
    }

    function testIsTriggeredTimestampInPast() public {
        uint80 startRoundId = 1;
        uint80 maxRoundId = 2;
        uint256 percentage = 10 * 10 ** 8;
        bytes memory callData = abi.encode(maxRoundId);

        MockChainlinkAggregator.MockRoundData[] memory mockRounds = new MockChainlinkAggregator.MockRoundData[](3);
        mockRounds[0] = MockChainlinkAggregator.MockRoundData({
            roundId: startRoundId, answer: 10_000, updatedAt: block.timestamp
        });
        mockRounds[1] = MockChainlinkAggregator.MockRoundData({
            roundId: maxRoundId, answer: 15_000, updatedAt: block.timestamp + 60 * 60
        });
        mockRounds[2] = MockChainlinkAggregator.MockRoundData({
            roundId: maxRoundId + 1, answer: 12_000, updatedAt: block.timestamp + 60 * 60 * 2
        });
        mockAggregator.setMockRounds(mockRounds);

        bytes memory subData = abi.encode(ETH_ADDR, percentage, maxRoundId + 1);

        bool isTriggered = cut.isTriggered(callData, subData);

        assert(!isTriggered);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                       HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function setRound(uint80 _roundId, int256 _answer, uint256 _updatedAt) public {
        MockChainlinkAggregator.MockRoundData[] memory mockRounds = new MockChainlinkAggregator.MockRoundData[](1);
        mockRounds[0] =
            MockChainlinkAggregator.MockRoundData({ roundId: _roundId, answer: _answer, updatedAt: _updatedAt });
        mockAggregator.setMockRounds(mockRounds);
    }
}

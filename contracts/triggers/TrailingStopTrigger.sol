// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../auth/AdminAuth.sol";
import "../DS/DSMath.sol";
import "../interfaces/ITrigger.sol";
import "../interfaces/chainlink/IFeedRegistry.sol";
import "../interfaces/lido/IWStEth.sol";
import "../utils/Denominations.sol";
import "../utils/TokenUtils.sol";
import "./helpers/TriggerHelper.sol";

contract TrailingStopTrigger is ITrigger, AdminAuth, TriggerHelper, DSMath {
    using TokenUtils for address;

    struct SubParams {
        address tokenAddr;
        uint256 percentage;
        uint256 startTimeStamp;
    }

    struct CallParams {
        uint80 maxRoundId;
    }

    IFeedRegistry public constant feedRegistry = IFeedRegistry(CHAINLINK_FEED_REGISTRY);

    function isTriggered(bytes memory _callData, bytes memory _subData)
        public
        view
        override
        returns (bool)
    {
        SubParams memory triggerSubData = parseSubInputs(_subData);
        CallParams memory triggerCallData = parseCallInputs(_callData);

        (uint256 currPrice, ) = getRoundInfo(triggerSubData.tokenAddr, 0);
        (uint256 maxPrice, uint256 maxPriceTimeStamp) = getRoundInfo(triggerSubData.tokenAddr, triggerCallData.maxRoundId);

        // we can't send a roundId that happened before the users sub
        if (maxPriceTimeStamp < triggerSubData.startTimeStamp) {
            return false;
        }

        return checkPercentageDiff(currPrice, maxPrice, triggerSubData.percentage);
    }

    function checkPercentageDiff(
        uint256 _currPrice,
        uint256 _maxPrice,
        uint256 _percentage
    ) public view returns (bool) {
        uint256 amountDiff = (_maxPrice * _percentage) / 10**10;

        return _currPrice < (_maxPrice - amountDiff);
    }

    /// @dev helper function that returns latest token price in USD
    function getRoundInfo(address _inputTokenAddr, uint80 _roundId) public view returns (
        uint256 price, uint256 updateTimestamp
        ) {
        address tokenAddr = _inputTokenAddr;

        if (_inputTokenAddr == TokenUtils.WETH_ADDR) {
            tokenAddr = TokenUtils.ETH_ADDR;
        }

        if (_inputTokenAddr == WSTETH_ADDR) {
            tokenAddr = STETH_ADDR;
        }

        int256 chainlinkPrice;

        if (_roundId == 0) {
            (, chainlinkPrice, , updateTimestamp, ) = feedRegistry.latestRoundData(tokenAddr, Denominations.USD);
        } else {
            (, chainlinkPrice, , updateTimestamp, ) = feedRegistry.getRoundData(tokenAddr, Denominations.USD, _roundId);
        }

        if (_inputTokenAddr == WSTETH_ADDR) {
            return (wmul(uint256(price), IWStEth(WSTETH_ADDR).stEthPerToken()), updateTimestamp);
        }

        return (uint256(chainlinkPrice), updateTimestamp);
    }

    function changedSubData(bytes memory _subData) public pure override returns (bytes memory) {}

    function isChangeable() public pure override returns (bool) {
        return false;
    }

    function parseSubInputs(bytes memory _callData)
        internal
        pure
        returns (SubParams memory params)
    {
        params = abi.decode(_callData, (SubParams));
    }

    function parseCallInputs(bytes memory _callData)
        internal
        pure
        returns (CallParams memory params)
    {
        params = abi.decode(_callData, (CallParams));
    }
}

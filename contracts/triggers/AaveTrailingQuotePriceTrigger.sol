// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../interfaces/ITrigger.sol";
import "../interfaces/aaveV3/IAaveV3Oracle.sol";
import "../interfaces/chainlink/IAggregatorV3.sol";
import "../interfaces/lido/IWStEth.sol";
import "../auth/AdminAuth.sol";
import "../DS/DSMath.sol";
import "../utils/TokenUtils.sol";
import "../actions/aaveV3/helpers/AaveV3RatioHelper.sol";

/// @title Validates trailing stop for quoted asset price
contract AaveTrailingQuotePriceTrigger is ITrigger, AdminAuth, DSMath, AaveV3RatioHelper {
    using TokenUtils for address;

    IAaveV3Oracle public constant aaveOracleV3 =
        IAaveV3Oracle(AAVE_ORACLE_V3);

    /// @param baseTokenAddr address of the token which is quoted
    /// @param baseStartRoundId roundId of the base token feed at time of subscription
    /// @param quoteTokenAddr address of the quote token
    /// @param quoteTokenAddr roundId of the quote token feed at time of subscription
    /// @param percentage price percentage difference on which to trigger
    struct SubParams {
        address baseTokenAddr;
        uint80 baseStartRoundId;
        address quoteTokenAddr;
        uint80 quoteStartRoundId;
        uint256 percentage;
    }

    /// @param baseMaxRoundId roundId of the base token feed at time of local maximum
    /// @param baseMaxRoundIdNext immediate future neighbour of baseMaxRoundId
    /// @param quoteMaxRoundId roundId of the quote token feed at time of local maximum
    /// @param quoteMaxRoundIdNext immediate future neighbour of quoteMaxRoundId
    /// @dev exactly one *maxRoundIdNext should be 0, signifying the encompassed feed roundId
    struct CallParams {
        uint80 baseMaxRoundId;
        uint80 baseMaxRoundIdNext;
        uint80 quoteMaxRoundId;
        uint80 quoteMaxRoundIdNext;
    }

    /// @dev checks chainlink oracle for current and local-maximum prices and triggers if it satisfies the percentage difference
    function isTriggered(bytes memory _callData, bytes memory _subData) public view override returns (bool) {
        CallParams memory triggerCallData = parseCallInputs(_callData);
        SubParams memory triggerSubData = parseSubInputs(_subData);

        // valid chainlink id should never be 0
        if (
            triggerCallData.baseMaxRoundId == 0 || triggerSubData.baseStartRoundId == 0
            || triggerCallData.quoteMaxRoundId == 0 || triggerSubData.quoteStartRoundId == 0
        ) return false;

        // exactly one roundIdNext should be 0, signifying the encompassed feed
        if (
            triggerCallData.baseMaxRoundIdNext == 0
            && triggerCallData.quoteMaxRoundIdNext == 0
            || triggerCallData.baseMaxRoundIdNext != 0
            && triggerCallData.quoteMaxRoundIdNext != 0
        ) {
            return false;
        }

        (uint256 baseMaxPrice, uint256 baseMaxPriceTimeStamp) = getRoundInfo(
            triggerSubData.baseTokenAddr,
            triggerCallData.baseMaxRoundId
        );
        (uint256 quoteMaxPrice, uint256 quoteMaxPriceTimeStamp) = getRoundInfo(
            triggerSubData.quoteTokenAddr,
            triggerCallData.quoteMaxRoundId
        );

        // we can't send a roundId that happened before the users sub
        {
            (, uint256 baseStartTimeStamp) = getRoundInfo(
                triggerSubData.baseTokenAddr,
                triggerSubData.baseStartRoundId
            );
            (, uint256 quoteStartTimeStamp) = getRoundInfo(
                triggerSubData.quoteTokenAddr,
                triggerSubData.quoteStartRoundId
            );

            if (
                baseMaxPriceTimeStamp < baseStartTimeStamp
                || quoteMaxPriceTimeStamp < quoteStartTimeStamp
            ) {
                return false;
            }
        }

        // compare if the max round ids of both assets are around the same time
        /// @dev The caller chooses which asset (base or quote) is the anchor around we are comparing
        if (triggerCallData.quoteMaxRoundIdNext != 0) {
            (, uint256 baseMaxRoundIdNextTimestamp) = getRoundInfo(
                triggerSubData.baseTokenAddr,
                triggerCallData.baseMaxRoundIdNext
            );

            if (!roundEncompassed(
                triggerCallData.baseMaxRoundId,
                triggerCallData.baseMaxRoundIdNext,
                baseMaxPriceTimeStamp,
                baseMaxRoundIdNextTimestamp,
                quoteMaxPriceTimeStamp
            )) return false;
        } else {
            (, uint256 quoteMaxRoundIdNextTimestamp) = getRoundInfo(
                triggerSubData.quoteTokenAddr,
                triggerCallData.quoteMaxRoundIdNext
            );

            if (!roundEncompassed(
                triggerCallData.quoteMaxRoundId,
                triggerCallData.quoteMaxRoundIdNext,
                quoteMaxPriceTimeStamp,
                quoteMaxRoundIdNextTimestamp,
                baseMaxPriceTimeStamp
            )) return false;
        }

        address[] memory assets = new address[](2);
        assets[0] = triggerSubData.baseTokenAddr;
        assets[1] = triggerSubData.quoteTokenAddr;
        uint256[] memory currAssetPrices = aaveOracleV3.getAssetsPrices(
            assets
        );

        uint256 baseCurrPrice = currAssetPrices[0];
        uint256 quoteCurrPrice = currAssetPrices[1];

        uint256 currPrice = baseCurrPrice * 1e8 / quoteCurrPrice;
        uint256 maxPrice = baseMaxPrice * 1e8 / quoteMaxPrice;

        return checkPercentageDiff(currPrice, maxPrice, triggerSubData.percentage);
    }

    /// @dev checking if both maxRoundIds were 'latest' at the same time
    function roundEncompassed(
        uint80 _roundId,
        uint80 _roundIdNext,
        uint256 _roundIdTimestamp,
        uint256 _roundIdNextTimestamp,
        uint256 _timestampToCompare
    ) internal pure returns (bool) {
        // check if the next roundId sent is actually the next roundId not something else
        if (!checkIfNextRoundId(_roundId, _roundIdNext)) return false;

        // encompassed feed round has to be in between the encompassing feed rounds
        if ((_roundIdTimestamp > _timestampToCompare) || 
            (_roundIdNextTimestamp < _timestampToCompare)) {
            return false;
        } 

        return true;
    }

    function checkIfNextRoundId(uint80 _roundId, uint80 _nextRoundId) internal pure returns (bool) {
        uint256 nextRoundId = _roundId + 1;
        uint16 phaseId = uint16(_roundId >> 64);
        uint256 nextPhaseRoundId = ((phaseId + 1) << 64) + 1;

        // encompassingFeedRoundId1 not valid next roundId
        if (_nextRoundId != nextRoundId
            && _nextRoundId != nextPhaseRoundId) return false;

        return true;
    }

    /// @notice Given the currentPrice and the maxPrice see if there diff. > than percentage
    function checkPercentageDiff(
        uint256 _currPrice,
        uint256 _maxPrice,
        uint256 _percentage
    ) public pure returns (bool) {
        uint256 amountDiff = (_maxPrice * _percentage) / 10**10;

        return _currPrice <= (_maxPrice - amountDiff);
    }

    /// @dev Helper function that returns chainlink price data
    /// @param _inputTokenAddr Token address we are looking the usd price for
    /// @param _roundId Chainlink roundId, if 0 uses the latest
    function getRoundInfo(address _inputTokenAddr, uint80 _roundId)
        public
        view
        returns (uint256, uint256 updateTimestamp)
    {
        address tokenAddr = _inputTokenAddr;

        if (_inputTokenAddr == TokenUtils.WETH_ADDR) {
            tokenAddr = TokenUtils.ETH_ADDR;
        }

        if (_inputTokenAddr == TokenUtils.WSTETH_ADDR) {
            tokenAddr = TokenUtils.STETH_ADDR;
        }

        address aggregatorAddr = aaveOracleV3.getSourceOfAsset(tokenAddr);
        int256 chainlinkPrice;
        
        if (_roundId == 0) {
            (, chainlinkPrice, , updateTimestamp, ) = IAggregatorV3(aggregatorAddr).latestRoundData();
        } else {

            (, chainlinkPrice, , updateTimestamp, ) = IAggregatorV3(aggregatorAddr).getRoundData(_roundId);
        }

        // no price for wsteth, can calculate from steth
        if (_inputTokenAddr == TokenUtils.WSTETH_ADDR) {
            return (
                wmul(uint256(chainlinkPrice), IWStEth(TokenUtils.WSTETH_ADDR).stEthPerToken()),
                updateTimestamp
            );
        }

        return (uint256(chainlinkPrice), updateTimestamp);
    }
    
    function changedSubData(bytes memory _subData) public pure override returns (bytes memory) {
    }
    
    function isChangeable() public pure override returns (bool){
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

// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../interfaces/aaveV3/IAaveV3Oracle.sol";
import "../interfaces/chainlink/IAggregatorV3.sol";
import "../interfaces/chainlink/IPhaseAggregator.sol";
import "../actions/aaveV3/helpers/AaveV3RatioHelper.sol";

contract AaveV3OracleView is AaveV3RatioHelper {
    IAaveV3Oracle public constant aaveOracleV3 = IAaveV3Oracle(AAVE_ORACLE_V3);

    function latestRoundData(address _asset)
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) {
        address aggregatorAddr = aaveOracleV3.getSourceOfAsset(_asset);
        return IAggregatorV3(aggregatorAddr).latestRoundData();
    }

    function getRoundData(
        address _asset,
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
        address aggregatorAddr = aaveOracleV3.getSourceOfAsset(_asset);
        return IAggregatorV3(aggregatorAddr).getRoundData(_roundId);
    }

    function getTimestamp(
        address _asset,
        uint256 _roundId
    ) external view returns (uint256 timestamp) {
        address aggregatorAddr = aaveOracleV3.getSourceOfAsset(_asset);
        return IAggregatorV3(aggregatorAddr).getTimestamp(_roundId);
    }

    /// @dev will return 0 for invalid or latest roundId
    function getNextRoundId(
        address _asset,
        uint80 _roundId
    ) external view returns (uint80 nextRoundId) {
        uint16 phaseId = uint16(_roundId >> 64);
        uint64 aggregatorRoundId = uint64(_roundId);

        IAggregatorV3 aggregatorProxy = IAggregatorV3(aaveOracleV3.getSourceOfAsset(_asset));
        (, , , uint256 timestamp, ) = aggregatorProxy.getRoundData(_roundId);
        // check if _roundId is a legit round
        if (timestamp == 0) return 0;

        (uint80 latestRoundId, , , ,) = aggregatorProxy.latestRoundData();
        if (_roundId == latestRoundId) return 0;

        uint16 currentPhase = uint16(latestRoundId >> 64);
        if (currentPhase == phaseId) return _roundId + 1;
        
        IPhaseAggregator phaseAggregator = IPhaseAggregator(aggregatorProxy.phaseAggregators(phaseId));
        (uint80 phaseLastRoundId, , , ,) = phaseAggregator.latestRoundData();
        if (phaseLastRoundId == aggregatorRoundId) return (phaseId + 1) << 64 + 1;
        
        return _roundId + 1;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;


contract MockChainlinkAggregator {

    struct MockRoundData {
        uint80 roundId;
        int256 answer;
        uint256 updatedAt;
    }

    mapping(uint80 => MockRoundData) mockRounds;
    uint80 latestRoundId;

    function setMockRounds(MockRoundData[] memory _mockRounds) external {
        for (uint256 i = 0; i < _mockRounds.length; i++) {
            uint80 roundId = _mockRounds[i].roundId;
            mockRounds[roundId] = _mockRounds[i];
            if (roundId > latestRoundId) latestRoundId = roundId; 
        }
    }

    function getRoundData(uint80 _roundId)
    external
    view
    returns (
        uint80 roundId,
        int256 answer,
        uint256,
        uint256 updatedAt,
        uint80
    ) {
        MockRoundData memory roundData = mockRounds[_roundId];
        if (roundData.updatedAt == 0) revert();
        roundId = _roundId;
        answer = roundData.answer;
        updatedAt = roundData.updatedAt;
    }

    function latestRoundData()
    external
    view
    returns (
        uint80 roundId,
        int256 answer,
        uint256,
        uint256 updatedAt,
        uint80
    ) {
        MockRoundData memory latestRound = mockRounds[latestRoundId];
        roundId = latestRound.roundId;
        answer = latestRound.answer;
        updatedAt = latestRound.updatedAt;
    }
}
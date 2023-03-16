// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity =0.8.10;

interface IMorphoAaveV3View {
    function getMorphoAddress(uint256 _emodeId) external view returns (address);
}
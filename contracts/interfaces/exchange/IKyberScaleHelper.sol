// SPDX-License-Identifier: MIT

pragma solidity =0.8.27;

interface IKyberScaleHelper {
    function getScaledInputData(bytes calldata inputData, uint256 newAmount) external view returns (bool isSuccess, bytes memory data);
}

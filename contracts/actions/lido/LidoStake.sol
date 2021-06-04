// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../ActionBase.sol";
import "../../utils/TokenUtils.sol";
import "../../DS/DSMath.sol";
import "hardhat/console.sol";

/// @title Supplies ETH to Lido for ETH2 Staking. Receives stETH in return
contract LidoStake is ActionBase, DSMath {
    using TokenUtils for address;

    address public constant lidoStakingContractAddress = 0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84;

    /// @param amount - amount of ETH to supply to Lido
    /// @param to - address where received stETH will be sent to
    struct Params {
        uint256 ethAmount;
        address to;
    }
    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.ethAmount = _parseParamUint(inputData.ethAmount, _paramMapping[0], _subData, _returnValues);
        inputData.to = _parseParamAddr(inputData.to, _paramMapping[1], _subData, _returnValues);

        uint256 stEthReceivedAmount = _lidoStake(inputData);
        return bytes32(stEthReceivedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);
        _lidoStake(inputData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @dev takes eth sent with the calling transaction, stakes it to lido, and sends received stEth to target address
    function _lidoStake(Params memory _inputData) internal returns (uint256 stEthReceivedAmount) {

        uint256 stEthBalanceBefore = lidoStakingContractAddress.getBalance(address(this));
        (bool sent, ) = payable(lidoStakingContractAddress).call{value: _inputData.ethAmount}("");
        require(sent, "Failed to send Ether");
        uint256 stEthBalanceAfter = lidoStakingContractAddress.getBalance(address(this));

        stEthReceivedAmount = sub(stEthBalanceAfter, stEthBalanceBefore);

        console.log(msg.value);
        console.log(lidoStakingContractAddress.getBalance(address(this)));
        console.log(stEthReceivedAmount);

        lidoStakingContractAddress.withdrawTokens(_inputData.to, stEthReceivedAmount);

        logger.Log(address(this), msg.sender, "LidoStake", abi.encode(_inputData.to, stEthReceivedAmount));
    }

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (Params memory inputData)
    {
        inputData = abi.decode(_callData[0], (Params));
    }
}

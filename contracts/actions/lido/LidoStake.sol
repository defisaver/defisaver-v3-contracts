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

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        (uint256 ethAmount, address to) = parseInputs(_callData);

        ethAmount = _parseParamUint(ethAmount, _paramMapping[0], _subData, _returnValues);
        to = _parseParamAddr(to, _paramMapping[1], _subData, _returnValues);

        uint256 amount = _lidoStake(ethAmount, to);
        return bytes32(amount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable override {
        (uint256 ethAmount, address to) = parseInputs(_callData);
        _lidoStake(ethAmount, to);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @dev takes eth sent with the calling transaction, stakes it to lido, and sends received stEth to target address
    function _lidoStake(uint256 _ethAmount, address _to) internal returns (uint256 amount) {

        uint256 stEthBalanceBefore = lidoStakingContractAddress.getBalance(address(this));
        (bool sent, ) = payable(lidoStakingContractAddress).call{value: _ethAmount}("");
        require(sent, "Failed to send Ether");
        uint256 stEthBalanceAfter = lidoStakingContractAddress.getBalance(address(this));

        amount = sub(stEthBalanceAfter, stEthBalanceBefore);

        console.log(msg.value);
        console.log(lidoStakingContractAddress.getBalance(address(this)));
        console.log(amount);
        
        lidoStakingContractAddress.withdrawTokens(_to, amount);

        logger.Log(address(this), msg.sender, "LidoStake", abi.encode(_to, amount));
    }

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (uint256 ethAmount, address to)
    {
        ethAmount = abi.decode(_callData[0], (uint256));
        to = abi.decode(_callData[1], (address));
    }
}

// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../ActionBase.sol";
import "../../utils/TokenUtils.sol";
import "../../DS/DSMath.sol";
import "../../interfaces/lido/ILido.sol";
import "hardhat/console.sol";


/// @title Supplies ETH to Lido for ETH2 Staking. Receives stETH in return
contract LidoStake is ActionBase, DSMath {
    using TokenUtils for address;

    ILido public constant lidoStakingContract = ILido(0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84);

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        address to = parseInputs(_callData);

        to = _parseParamAddr(to, _paramMapping[0], _subData, _returnValues);

        uint256 amount = _lidoStake(to);
        return bytes32(amount);
        
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable override {
        address to = parseInputs(_callData);
        _lidoStake(to);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _lidoStake(address to) internal returns (uint256 amount) {
        uint256 stEthBalanceBefore = address(lidoStakingContract).getBalance(address(this));
        (bool sent, ) = payable(address(lidoStakingContract)).call{value: msg.value}("");
        require(sent, "Failed to send Ether");
        uint256 stEthBalanceAfter = address(lidoStakingContract).getBalance(address(this));

        amount = sub(stEthBalanceAfter, stEthBalanceBefore);
        console.log(msg.value);
        console.log(address(lidoStakingContract).getBalance(address(this)));
        console.log(amount);
        address(lidoStakingContract).withdrawTokens(to, amount);

        logger.Log(address(this), msg.sender, "LidoStake", abi.encode(to, amount));
    }

    function parseInputs(bytes[] memory _callData) internal pure returns (address to) {
        to = abi.decode(_callData[0], (address));
    }
}

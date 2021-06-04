// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../ActionBase.sol";
import "../../utils/TokenUtils.sol";
import "../../DS/DSMath.sol";
import "../../interfaces/lido/ILido.sol";
import "hardhat/console.sol";

/// @title Supplies ETH (action recevies WETH) to Lido for ETH2 Staking. Receives stETH in return
contract LidoWETHStake is ActionBase, DSMath {
    using TokenUtils for address;

    ILido public constant lidoStakingContract = ILido(0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84);

    /// @param amount - amount of WETH to pull
    /// @param from - address from which to pull WETH from
    /// @param to - address where received stETH will be sent to
    struct Params {
        uint256 amount;
        address from;
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

        inputData.amount = _parseParamUint(
            inputData.amount,
            _paramMapping[0],
            _subData,
            _returnValues
        );
        inputData.from = _parseParamAddr(inputData.from, _paramMapping[1], _subData, _returnValues);
        inputData.to = _parseParamAddr(inputData.to, _paramMapping[2], _subData, _returnValues);

        uint256 amount = _lidoStake(inputData);
        return bytes32(amount);
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

    function _lidoStake(Params memory _inputData) internal returns (uint256 amount) {
        uint256 amountPulled =
            TokenUtils.WETH_ADDR.pullTokensIfNeeded(_inputData.from, _inputData.amount);
        _inputData.amount = amountPulled;
        TokenUtils.withdrawWeth(_inputData.amount);

        uint256 stEthBalanceBefore = address(lidoStakingContract).getBalance(address(this));
        (bool sent, ) = payable(address(lidoStakingContract)).call{value: _inputData.amount}("");
        require(sent, "Failed to send Ether");
        uint256 stEthBalanceAfter = address(lidoStakingContract).getBalance(address(this));

        amount = sub(stEthBalanceAfter, stEthBalanceBefore);
        console.log(_inputData.amount);
        console.log(address(lidoStakingContract).getBalance(address(this)));
        console.log(amount);
        address(lidoStakingContract).withdrawTokens(_inputData.to, amount);

        logger.Log(address(this), msg.sender, "LidoWETHStake", abi.encode(_inputData, amount));
    }

    function parseInputs(bytes[] memory _callData) internal pure returns (Params memory inputData) {
        inputData = abi.decode(_callData[0], (Params));
    }
}
